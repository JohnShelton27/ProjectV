/**
 * Standalone scraping script for production use.
 * Runs Puppeteer scrapers and writes results to Supabase.
 *
 * Usage:
 *   npx tsx scripts/scrape.ts
 *   npx tsx scripts/scrape.ts --sources zillow,redfin
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { createClient } from "@supabase/supabase-js";
import type { Browser, Page } from "puppeteer";

puppeteer.use(StealthPlugin());

// ─── Config ───────────────────────────────────────────────
const COUNTY = "Ventura";
const STATE = "CA";
const MAX_PAGES = 3;
const DEFAULT_SOURCES = ["zillow", "trulia", "realtor", "redfin"];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// ─── Types ────────────────────────────────────────────────
interface RawListing {
  address: string;
  city: string;
  state: string;
  zip: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSize: string;
  propertyType: string;
  images: string[];
  detailUrl: string;
  lat?: number;
  lng?: number;
}

// ─── Helpers ──────────────────────────────────────────────
function slug(address: string, city: string): string {
  return `${address}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function hashId(address: string, source: string): string {
  const raw = `${source}-${address}`;
  let h = 0;
  for (let i = 0; i < raw.length; i++) {
    h = (h << 5) - h + raw.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const t = req.resourceType();
    if (t === "image" || t === "font" || t === "media") req.abort();
    else req.continue();
  });
  return page;
}

// ─── Zillow Scraper ───────────────────────────────────────
async function scrapeZillow(browser: Browser): Promise<RawListing[]> {
  const all: RawListing[] = [];
  const q = `${COUNTY.toLowerCase()}-county-${STATE.toLowerCase()}`;

  for (let p = 1; p <= MAX_PAGES; p++) {
    const page = await newPage(browser);
    try {
      const url = p === 1
        ? `https://www.zillow.com/${q}/`
        : `https://www.zillow.com/${q}/${p}_p/`;
      console.log(`  [Zillow] page ${p}: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await delay(5000); // Wait for JS rendering

      // Debug: log page title and HTML size
      const title = await page.title();
      const htmlLen = await page.evaluate(() => document.documentElement.innerHTML.length);
      console.log(`  [Zillow] page ${p} loaded: "${title}" (${htmlLen} chars)`);

      const items = await page.evaluate(() => {
        const out: RawListing[] = [];
        for (const s of document.querySelectorAll('script[type="application/json"]')) {
          try {
            const d = JSON.parse(s.textContent || "");
            const list =
              d?.props?.pageProps?.searchPageState?.cat1?.searchResults?.listResults ||
              d?.cat1?.searchResults?.listResults || [];
            for (const i of list) {
              if (!i.address && !i.streetAddress) continue;
              out.push({
                address: i.address || i.streetAddress || "",
                city: i.addressCity || "",
                state: i.addressState || "",
                zip: i.addressZipcode || "",
                price: i.unformattedPrice || i.price || 0,
                bedrooms: i.beds || 0,
                bathrooms: i.baths || 0,
                sqft: i.area || 0,
                lotSize: i.lotAreaString || "N/A",
                propertyType: i.homeType || "Unknown",
                images: i.imgSrc ? [i.imgSrc] : i.carouselPhotos?.map((x: { url: string }) => x.url) || i.carouselPhotosComposable?.map((x: { url: string }) => x.url) || [],
                detailUrl: i.detailUrl ? `https://www.zillow.com${i.detailUrl}` : "",
                lat: i.latLong?.latitude,
                lng: i.latLong?.longitude,
              });
            }
          } catch { /* skip */ }
        }
        // DOM fallback
        if (out.length === 0) {
          for (const card of document.querySelectorAll('[data-test="property-card"], .list-card, .property-card')) {
            const addr = card.querySelector('[data-test="property-card-addr"], address')?.textContent?.trim() || "";
            const priceText = card.querySelector('[data-test="property-card-price"]')?.textContent?.trim() || "";
            const price = parseInt(priceText.replace(/\D/g, ""), 10) || 0;
            if (!addr || !price) continue;
            const t = card.textContent || "";
            const parts = addr.split(",").map((s: string) => s.trim());
            out.push({
              address: parts[0], city: parts[1] || "", state: parts[2]?.replace(/\d/g, "").trim() || "",
              zip: parts[2]?.match(/\d{5}/)?.[0] || "", price,
              bedrooms: parseInt(t.match(/(\d+)\s*bd/i)?.[1] || "0"),
              bathrooms: parseFloat(t.match(/(\d+\.?\d*)\s*ba/i)?.[1] || "0"),
              sqft: parseInt((t.match(/([\d,]+)\s*sqft/i)?.[1] || "0").replace(/,/g, "")),
              lotSize: "N/A", propertyType: "Unknown", images: [], detailUrl: "",
            });
          }
        }
        return out;
      });
      all.push(...items);
      console.log(`  [Zillow] page ${p}: ${items.length} listings`);
    } catch (e) {
      console.error(`  [Zillow] page ${p} error:`, (e as Error).message);
    } finally {
      await page.close();
    }
    await delay(3000 + Math.random() * 2000);
  }
  return all;
}

// ─── Realtor.com Scraper ──────────────────────────────────
async function scrapeRealtor(browser: Browser): Promise<RawListing[]> {
  const all: RawListing[] = [];
  const countySlug = `${COUNTY.toLowerCase()}-county`;
  const stateSlug = STATE.toLowerCase() === "ca" ? "california" : STATE.toLowerCase();

  for (let p = 1; p <= MAX_PAGES; p++) {
    const page = await newPage(browser);
    try {
      const url = p === 1
        ? `https://www.realtor.com/realestateandhomes-search/${countySlug}_${stateSlug}`
        : `https://www.realtor.com/realestateandhomes-search/${countySlug}_${stateSlug}/pg-${p}`;
      console.log(`  [Realtor] page ${p}: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await delay(5000);

      const items = await page.evaluate(() => {
        const out: RawListing[] = [];
        const nd = document.querySelector("#__NEXT_DATA__");
        if (nd) {
          try {
            const d = JSON.parse(nd.textContent || "");
            const homes = d?.props?.pageProps?.properties ||
              d?.props?.pageProps?.searchResults?.home_search?.results || [];
            for (const h of homes) {
              const a = h.location?.address || h.address || {};
              out.push({
                address: a.line || "", city: a.city || "", state: a.state_code || "",
                zip: a.postal_code || "",
                price: h.list_price || h.price || 0,
                bedrooms: h.description?.beds || h.beds || 0,
                bathrooms: h.description?.baths || h.baths || 0,
                sqft: h.description?.sqft || h.sqft || 0,
                lotSize: h.description?.lot_sqft ? `${(h.description.lot_sqft / 43560).toFixed(2)} acres` : "N/A",
                propertyType: h.description?.type || "Unknown",
                images: h.photos?.map((x: { href: string }) => x.href).filter(Boolean) || [],
                detailUrl: h.permalink ? `https://www.realtor.com/realestateandhomes-detail/${h.permalink}` : "",
                lat: h.location?.address?.coordinate?.lat,
                lng: h.location?.address?.coordinate?.lon,
              });
            }
          } catch { /* skip */ }
        }
        // DOM fallback
        if (out.length === 0) {
          for (const card of document.querySelectorAll('[data-testid="property-card"], .property-card')) {
            const addr = card.querySelector('[data-testid="card-address"]')?.textContent?.trim() || "";
            const priceText = card.querySelector('[data-testid="card-price"]')?.textContent?.trim() || "";
            const price = parseInt(priceText.replace(/\D/g, ""), 10) || 0;
            if (!addr || !price) continue;
            const t = card.textContent || "";
            const parts = addr.split(",").map((s: string) => s.trim());
            out.push({
              address: parts[0], city: parts[1] || "", state: parts[2]?.replace(/\d/g, "").trim() || "",
              zip: addr.match(/\d{5}/)?.[0] || "", price,
              bedrooms: parseInt(t.match(/(\d+)\s*bed/i)?.[1] || "0"),
              bathrooms: parseFloat(t.match(/(\d+\.?\d*)\s*bath/i)?.[1] || "0"),
              sqft: parseInt((t.match(/([\d,]+)\s*sqft/i)?.[1] || "0").replace(/,/g, "")),
              lotSize: "N/A", propertyType: "Unknown", images: [], detailUrl: "",
            });
          }
        }
        return out;
      });
      all.push(...items);
      console.log(`  [Realtor] page ${p}: ${items.length} listings`);
    } catch (e) {
      console.error(`  [Realtor] page ${p} error:`, (e as Error).message);
    } finally {
      await page.close();
    }
    await delay(3000 + Math.random() * 2000);
  }
  return all;
}

// ─── Redfin Scraper ───────────────────────────────────────
async function scrapeRedfin(browser: Browser): Promise<RawListing[]> {
  const all: RawListing[] = [];

  for (let p = 1; p <= MAX_PAGES; p++) {
    const page = await newPage(browser);
    try {
      // Redfin URL format for Ventura County
      const url = p === 1
        ? `https://www.redfin.com/county/339/CA/Ventura-County/filter/sort=lo-days`
        : `https://www.redfin.com/county/339/CA/Ventura-County/filter/sort=lo-days/page-${p}`;
      console.log(`  [Redfin] page ${p}: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await delay(6000);

      // Close popups
      await page.evaluate(() => {
        document.querySelectorAll('button[aria-label="Close"], .Modal__close').forEach(
          (b) => (b as HTMLElement).click()
        );
      });
      await delay(1000);

      const items = await page.evaluate(() => {
        const out: RawListing[] = [];
        for (const card of document.querySelectorAll('.HomeCardContainer, .HomeCard, [data-rf-test-id="mapHomeCard"]')) {
          const priceEl = card.querySelector('.homecardV2Price, [data-rf-test-id="abp-price"], .bp-Homecard__Price--value');
          const addrEl = card.querySelector('.homeAddressV2, [data-rf-test-id="abp-streetLine"], .bp-Homecard__Address--street');
          const cityEl = card.querySelector('.bp-Homecard__Address--city, .homeCardCityState');
          const link = card.querySelector('a[href*="/home/"]') as HTMLAnchorElement | null;
          const img = card.querySelector("img") as HTMLImageElement | null;

          const price = parseInt((priceEl?.textContent || "").replace(/\D/g, ""), 10) || 0;
          const addr = addrEl?.textContent?.trim() || "";
          if (!addr || !price) continue;

          const cityText = cityEl?.textContent?.trim() || "";
          const cityParts = cityText.split(",").map((s: string) => s.trim());
          const t = card.textContent || "";

          out.push({
            address: addr,
            city: cityParts[0] || "",
            state: cityParts[1]?.replace(/\d/g, "").trim() || "",
            zip: cityText.match(/\d{5}/)?.[0] || "",
            price,
            bedrooms: parseInt(t.match(/(\d+)\s*(?:Bed|BD)/i)?.[1] || "0"),
            bathrooms: parseFloat(t.match(/(\d+\.?\d*)\s*(?:Bath|BA)/i)?.[1] || "0"),
            sqft: parseInt((t.match(/([\d,]+)\s*(?:Sq\.?\s*Ft|sqft|SF)/i)?.[1] || "0").replace(/,/g, "")),
            lotSize: "N/A",
            propertyType: "Unknown",
            images: img?.src ? [img.src] : [],
            detailUrl: link?.href || "",
          });
        }
        return out;
      });
      all.push(...items);
      console.log(`  [Redfin] page ${p}: ${items.length} listings`);
    } catch (e) {
      console.error(`  [Redfin] page ${p} error:`, (e as Error).message);
    } finally {
      await page.close();
    }
    await delay(3000 + Math.random() * 2000);
  }
  return all;
}

// ─── Trulia Scraper ───────────────────────────────────────
async function scrapeTrulia(browser: Browser): Promise<RawListing[]> {
  const all: RawListing[] = [];

  for (let p = 1; p <= MAX_PAGES; p++) {
    const page = await newPage(browser);
    try {
      const url = p === 1
        ? `https://www.trulia.com/CA/Ventura_County/`
        : `https://www.trulia.com/CA/Ventura_County/${p}_p/`;
      console.log(`  [Trulia] page ${p}: ${url}`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
      await delay(5000);

      const items = await page.evaluate(() => {
        const out: RawListing[] = [];
        // Trulia uses similar JSON embedding as Zillow
        for (const s of document.querySelectorAll('script[type="application/json"]')) {
          try {
            const d = JSON.parse(s.textContent || "");
            const homes = d?.props?.pageProps?.searchData?.homes ||
              d?.props?.pageProps?.searchResult?.homes || [];
            for (const h of homes) {
              if (!h.location) continue;
              out.push({
                address: h.location.streetAddress || h.location.fullLocation || "",
                city: h.location.city || "", state: h.location.stateCode || "",
                zip: h.location.zipCode || "",
                price: h.price?.formattedPrice ? parseInt(h.price.formattedPrice.replace(/\D/g, "")) : 0,
                bedrooms: h.bedrooms || 0, bathrooms: h.bathrooms || 0,
                sqft: h.floorSpace?.value || 0,
                lotSize: "N/A", propertyType: h.propertyType || "Unknown",
                images: h.media?.photos?.map((x: { url: { mediumSrc: string } }) => x.url?.mediumSrc).filter(Boolean) || [],
                detailUrl: h.url ? `https://www.trulia.com${h.url}` : "",
              });
            }
          } catch { /* skip */ }
        }
        // DOM fallback
        if (out.length === 0) {
          for (const card of document.querySelectorAll('[data-testid="search-result-list-container"] li, [data-hero-element-id="srp-home-card"]')) {
            const priceEl = card.querySelector('[data-testid="property-price"]');
            const addrEl = card.querySelector('[data-testid="property-address"]');
            const link = card.querySelector("a[href*='/p/']") as HTMLAnchorElement | null;

            const price = parseInt((priceEl?.textContent || "").replace(/\D/g, ""), 10) || 0;
            const addr = addrEl?.textContent?.trim() || "";
            if (!addr || !price) continue;

            const t = card.textContent || "";
            const parts = addr.split(",").map((s: string) => s.trim());
            out.push({
              address: parts[0], city: parts[1] || "", state: parts[2]?.replace(/\d/g, "").trim() || "",
              zip: parts[2]?.match(/\d{5}/)?.[0] || "", price,
              bedrooms: parseInt(t.match(/(\d+)bd/i)?.[1] || "0"),
              bathrooms: parseFloat(t.match(/(\d+\.?\d*)ba/i)?.[1] || "0"),
              sqft: parseInt((t.match(/([\d,]+)\s*sqft/i)?.[1] || "0").replace(/,/g, "")),
              lotSize: "N/A", propertyType: "Unknown", images: [],
              detailUrl: link?.href || "",
            });
          }
        }
        return out;
      });
      all.push(...items);
      console.log(`  [Trulia] page ${p}: ${items.length} listings`);
    } catch (e) {
      console.error(`  [Trulia] page ${p} error:`, (e as Error).message);
    } finally {
      await page.close();
    }
    await delay(3000 + Math.random() * 2000);
  }
  return all;
}

// ─── Main ─────────────────────────────────────────────────
const scraperMap: Record<string, (b: Browser) => Promise<RawListing[]>> = {
  zillow: scrapeZillow,
  realtor: scrapeRealtor,
  redfin: scrapeRedfin,
  trulia: scrapeTrulia,
};

async function main() {
  // Parse --sources flag
  const args = process.argv.slice(2);
  const sourcesFlag = args.find((a) => a.startsWith("--sources="));
  const sources = sourcesFlag
    ? sourcesFlag.split("=")[1].split(",")
    : DEFAULT_SOURCES;

  console.log(`\n🏠 Scraping ${COUNTY} County, ${STATE}`);
  console.log(`   Sources: ${sources.join(", ")}`);
  console.log(`   Max pages per source: ${MAX_PAGES}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-gpu",
      "--window-size=1920,1080",
    ],
  });

  const allListings: RawListing[] = [];
  const summary: { source: string; count: number; errors: number }[] = [];

  for (const source of sources) {
    const scraper = scraperMap[source];
    if (!scraper) {
      console.warn(`Unknown source: ${source}`);
      continue;
    }

    console.log(`\n--- ${source.toUpperCase()} ---`);
    try {
      const items = await scraper(browser);
      allListings.push(
        ...items.map((i) => ({ ...i, source } as RawListing & { source: string }))
      );
      summary.push({ source, count: items.length, errors: 0 });
    } catch (e) {
      console.error(`${source} scraper crashed:`, (e as Error).message);
      summary.push({ source, count: 0, errors: 1 });
    }
  }

  await browser.close();

  // Deduplicate by normalized address
  const seen = new Set<string>();
  const unique = allListings.filter((l) => {
    const key = l.address.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n--- RESULTS ---`);
  for (const s of summary) {
    console.log(`  ${s.source}: ${s.count} listings${s.errors ? ` (${s.errors} errors)` : ""}`);
  }
  console.log(`  Total unique: ${unique.length}`);

  if (unique.length === 0) {
    console.log("\nNo listings found. Sites may be blocking or selectors may need updating.");
    process.exit(0);
  }

  // Write to Supabase
  console.log(`\nWriting ${unique.length} listings to Supabase...`);

  const rows = unique.map((l) => {
    const src = (l as RawListing & { source: string }).source || "zillow";
    return {
      id: hashId(l.address, src),
      slug: slug(l.address, l.city || COUNTY),
      address: l.address,
      city: l.city || COUNTY,
      state: l.state || STATE,
      zip: l.zip,
      county: COUNTY,
      price: l.price,
      bedrooms: l.bedrooms,
      bathrooms: l.bathrooms,
      sqft: l.sqft,
      lot_size: l.lotSize,
      year_built: 0,
      property_type: l.propertyType,
      status: "active",
      description: "",
      images: l.images,
      features: [],
      listing_date: new Date().toISOString(),
      source: src,
      source_url: l.detailUrl,
      lat: l.lat ?? null,
      lng: l.lng ?? null,
    };
  });

  // Upsert in batches of 50
  for (let i = 0; i < rows.length; i += 50) {
    const batch = rows.slice(i, i + 50);
    const { error } = await supabase.from("listings").upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`  Batch ${i / 50 + 1} error:`, error.message);
    } else {
      console.log(`  Batch ${i / 50 + 1}: ${batch.length} rows upserted`);
    }
  }

  console.log("\nDone! Listings are live on your site.\n");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
