/**
 * Standalone scraping script for production use.
 * Scrapes MLSListings and writes results to Supabase.
 *
 * Usage:
 *   npx tsx scripts/scrape.ts
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
const MAX_PAGES = 35;

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
  yearBuilt?: number;
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

// ─── MLSListings Scraper ─────────────────────────────────
async function scrapeMlsListings(browser: Browser): Promise<RawListing[]> {
  const all: RawListing[] = [];
  const countySlug = `${COUNTY.toLowerCase()}-county`;

  // Step 1: Visit homepage and submit search form to get session + criteria
  const initPage = await newPage(browser);
  let criteriaParam = "";

  try {
    console.log("  [MLSListings] Loading homepage for search session...");
    await initPage.goto("https://www.mlslistings.com/", { waitUntil: "networkidle2", timeout: 60000 });
    await delay(3000);

    await initPage.evaluate((county: string) => {
      const searchText = document.querySelector("#searchText") as HTMLInputElement;
      const searchTextType = document.querySelector("#searchTextType") as HTMLInputElement;
      if (searchText) searchText.value = `${county} County`;
      if (searchTextType) searchTextType.value = "CountyOrParish";
    }, COUNTY);

    await Promise.all([
      initPage.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
      initPage.evaluate(() => {
        const form = document.querySelector("#searchText")?.closest("form");
        if (form) form.submit();
      }),
    ]);
    await delay(3000);

    const finalUrl = initPage.url();
    const match = finalUrl.match(/criteria=([^&]+)/);
    criteriaParam = match ? match[1] : "";

    const count = await initPage.evaluate(() => document.querySelectorAll(".listing-card").length);
    console.log(`  [MLSListings] Search session established (${count} cards on page 1)`);

    if (!criteriaParam || count === 0) {
      console.log("  [MLSListings] Failed to establish search session.");
      return all;
    }
  } finally {
    await initPage.close();
  }

  // Step 2: Scrape pages using the established session
  for (let p = 1; p <= MAX_PAGES; p++) {
    const page = await newPage(browser);
    try {
      const url = `https://www.mlslistings.com/Search/Result/${countySlug}/${p}?criteria=${criteriaParam}`;
      console.log(`  [MLSListings] page ${p}...`);
      await page.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await delay(5000);

      const items = await page.evaluate(() => {
        const out: Array<{
          address: string; city: string; state: string; zip: string;
          price: number; bedrooms: number; bathrooms: number; sqft: number;
          lotSize: string; yearBuilt: number; propertyType: string;
          images: string[]; detailUrl: string;
        }> = [];

        const cards = document.querySelectorAll(".listing-card");
        for (const card of cards) {
          const linkEl = card.querySelector('a.search-nav-link:not(.prerender)') as HTMLAnchorElement | null;
          const fullAddress = linkEl?.textContent?.trim() || "";
          const detailUrl = linkEl?.href || "";
          if (!fullAddress) continue;

          const parts = fullAddress.split(",").map((s: string) => s.trim());
          const address = parts[0] || "";
          const city = parts[1] || "";
          const stateZip = parts[2] || "";
          const stateCode = stateZip.replace(/\d/g, "").trim();
          const zip = stateZip.match(/\d{5}/)?.[0] || "";

          const priceEl = card.querySelector(".listing-price");
          let price = 0;
          if (priceEl) {
            for (const node of priceEl.childNodes) {
              if (node.nodeType === Node.TEXT_NODE) {
                price = parseInt((node.textContent || "").replace(/[^0-9]/g, ""), 10) || 0;
                if (price > 0) break;
              }
            }
          }
          if (!address || price === 0) continue;

          const infoItems = [...card.querySelectorAll(".listing-info-item")]
            .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim());
          const allText = infoItems.join(" | ");

          const bedsMatch = allText.match(/(\d+)\s*Bd/);
          const bathsMatch = allText.match(/(\d+\.?\d*)\s*Ba/);
          const sqftMatch = allText.match(/([\d,]+)\s*Sq Ft(?!\s*Lot)/);
          const lotMatch = allText.match(/([\d,.]+)\s*(Sq Ft|Acres)\s*Lot/);
          const yearMatch = allText.match(/(\d{4})\s*Year Built/);

          const typeEl = card.querySelector(".listing-type");
          const imgEl = card.querySelector("img.listing-image") as HTMLImageElement | null;
          const imgSrc = imgEl?.getAttribute("data-src") || imgEl?.getAttribute("data-original") || imgEl?.src || "";
          const isPlaceholder = !imgSrc || imgSrc.startsWith("data:");

          out.push({
            address, city, state: stateCode, zip, price,
            bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : 0,
            bathrooms: bathsMatch ? parseFloat(bathsMatch[1]) : 0,
            sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, "")) : 0,
            lotSize: lotMatch ? `${lotMatch[1]} ${lotMatch[2]} Lot` : "N/A",
            yearBuilt: yearMatch ? parseInt(yearMatch[1]) : 0,
            propertyType: typeEl?.textContent?.trim() || "Unknown",
            images: isPlaceholder ? [] : [imgSrc],
            detailUrl,
          });
        }
        return out;
      });

      all.push(...items);
      console.log(`  [MLSListings] page ${p}: ${items.length} listings`);
      if (items.length === 0) {
        console.log("  [MLSListings] No listings on this page, stopping.");
        break;
      }
    } catch (e) {
      console.error(`  [MLSListings] page ${p} error:`, (e as Error).message);
    } finally {
      await page.close();
    }
    await delay(3000 + Math.random() * 2000);
  }
  return all;
}

// ─── Main ─────────────────────────────────────────────────
async function main() {
  console.log(`\n🏠 Scraping ${COUNTY} County, ${STATE}`);
  console.log(`   Source: MLSListings`);
  console.log(`   Max pages: ${MAX_PAGES}\n`);

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

  console.log("\n--- MLSLISTINGS ---");
  let listings: RawListing[] = [];
  try {
    listings = await scrapeMlsListings(browser);
  } catch (e) {
    console.error("MLSListings scraper crashed:", (e as Error).message);
  }

  await browser.close();

  // Deduplicate by normalized address
  const seen = new Set<string>();
  const unique = listings.filter((l) => {
    const key = l.address.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`\n--- RESULTS ---`);
  console.log(`  MLSListings: ${listings.length} listings`);
  console.log(`  Total unique: ${unique.length}`);

  if (unique.length === 0) {
    console.log("\nNo listings found. Site may be blocking or selectors may need updating.");
    process.exit(0);
  }

  // Write to Supabase
  console.log(`\nWriting ${unique.length} listings to Supabase...`);

  const rows = unique.map((l) => ({
    id: hashId(l.address, "mlslistings"),
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
    year_built: l.yearBuilt || 0,
    property_type: l.propertyType,
    status: "active",
    description: "",
    images: l.images,
    features: [],
    listing_date: new Date().toISOString(),
    source: "mlslistings",
    source_url: l.detailUrl,
    lat: l.lat ?? null,
    lng: l.lng ?? null,
  }));

  // Fetch existing listing IDs so we can separate inserts from updates
  const existingIds = new Set<string>();
  const allIds = rows.map((r) => r.id);
  for (let i = 0; i < allIds.length; i += 200) {
    const batch = allIds.slice(i, i + 200);
    const { data: existingRows } = await supabase
      .from("listings")
      .select("id")
      .in("id", batch);
    if (existingRows) {
      for (const r of existingRows) existingIds.add(r.id);
    }
  }

  const newRows = rows.filter((r) => !existingIds.has(r.id));
  const existingToUpdate = rows.filter((r) => existingIds.has(r.id));

  console.log(`  New listings: ${newRows.length}, Existing to update: ${existingToUpdate.length}`);

  // Insert new listings with all fields
  for (let i = 0; i < newRows.length; i += 50) {
    const batch = newRows.slice(i, i + 50);
    const { error } = await supabase.from("listings").upsert(batch, { onConflict: "id" });
    if (error) {
      console.error(`  Insert batch ${i / 50 + 1} error:`, error.message);
    } else {
      console.log(`  Inserted batch ${i / 50 + 1}: ${batch.length} new listings`);
    }
  }

  // Update existing listings — only price, status, and basic info (preserve images, description, listing_date)
  for (let i = 0; i < existingToUpdate.length; i += 50) {
    const batch = existingToUpdate.slice(i, i + 50);
    for (const row of batch) {
      const { error } = await supabase
        .from("listings")
        .update({
          price: row.price,
          status: row.status,
          bedrooms: row.bedrooms,
          bathrooms: row.bathrooms,
          sqft: row.sqft,
          lot_size: row.lot_size,
          property_type: row.property_type,
        })
        .eq("id", row.id);
      if (error) {
        console.error(`  Update error for ${row.address}:`, error.message);
      }
    }
    console.log(`  Updated batch ${i / 50 + 1}: ${batch.length} existing listings`);
  }

  console.log("\nDone! Listings are live on your site.\n");
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
