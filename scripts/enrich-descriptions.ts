/**
 * Enrich listings with property descriptions from their source detail pages.
 * Visits each listing's source_url and extracts the description text.
 *
 * Usage:
 *   npx tsx scripts/enrich-descriptions.ts
 *   npx tsx scripts/enrich-descriptions.ts --limit=50
 *   npx tsx scripts/enrich-descriptions.ts --source=realtor
 */
import { config } from "dotenv";
config({ path: ".env.local" });

import puppeteer from "puppeteer-extra";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { createClient } from "@supabase/supabase-js";
import type { Browser, Page } from "puppeteer";

puppeteer.use(StealthPlugin());

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function newPage(browser: Browser): Promise<Page> {
  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });
  await page.setUserAgent(
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
  );
  // Block images/fonts/stylesheets to speed up loading
  await page.setRequestInterception(true);
  page.on("request", (req) => {
    const type = req.resourceType();
    if (["image", "font", "stylesheet", "media"].includes(type)) {
      req.abort();
    } else {
      req.continue();
    }
  });
  return page;
}

async function fetchDescription(
  browser: Browser,
  sourceUrl: string
): Promise<string> {
  const page = await newPage(browser);
  try {
    await page.goto(sourceUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await delay(3000);

    const description = await page.evaluate(() => {
      // Method 1: JSON-LD structured data
      for (const script of document.querySelectorAll(
        'script[type="application/ld+json"]'
      )) {
        try {
          const data = JSON.parse(script.textContent || "");
          if (data.description && typeof data.description === "string" && data.description.length > 30) {
            return data.description.trim();
          }
          // Sometimes nested in @graph
          if (Array.isArray(data["@graph"])) {
            for (const item of data["@graph"]) {
              if (item.description && typeof item.description === "string" && item.description.length > 30) {
                return item.description.trim();
              }
            }
          }
        } catch {
          /* skip */
        }
      }

      // Method 2: __NEXT_DATA__ (Realtor.com)
      const nextData = document.querySelector("#__NEXT_DATA__");
      if (nextData) {
        try {
          const json = JSON.parse(nextData.textContent || "");
          const home = json?.props?.pageProps?.property?.description?.text
            || json?.props?.pageProps?.initialReduxState?.propertyDetails?.listingDetail?.description?.text;
          if (home && home.length > 30) return home.trim();
        } catch {
          /* skip */
        }
      }

      // Method 3: Realtor.com description selectors
      const realtorDesc =
        document.querySelector('[data-testid="listing-description-text"]')
        || document.querySelector(".listing-description-text")
        || document.querySelector("#ldp-detail-overview .ldp-description-text");
      if (realtorDesc?.textContent && realtorDesc.textContent.trim().length > 30) {
        return realtorDesc.textContent.trim();
      }

      // Method 4: Zillow/Trulia description
      const zillowDesc =
        document.querySelector('[data-testid="description-text"]')
        || document.querySelector(".ds-overview-section .Text-c11n-8-99-3__sc-aiai24-0");
      if (zillowDesc?.textContent && zillowDesc.textContent.trim().length > 30) {
        return zillowDesc.textContent.trim();
      }

      // Method 5: Redfin description
      const redfinDesc =
        document.querySelector(".remarks-container .text-base")
        || document.querySelector("#marketing-remarks-scroll")
        || document.querySelector(".ListingRemarks--text");
      if (redfinDesc?.textContent && redfinDesc.textContent.trim().length > 30) {
        return redfinDesc.textContent.trim();
      }

      // Method 6: MLSListings description
      const mlsDesc =
        document.querySelector("#publicRemarks")
        || document.querySelector(".listing-detail-description")
        || document.querySelector(".remarks");
      if (mlsDesc?.textContent && mlsDesc.textContent.trim().length > 30) {
        return mlsDesc.textContent.trim();
      }

      // Method 7: Generic meta description fallback
      const metaDesc = document.querySelector('meta[name="description"]');
      if (metaDesc) {
        const content = metaDesc.getAttribute("content") || "";
        if (content.length > 50) return content.trim();
      }

      // Method 8: Broad search — look for common description containers
      const candidates = document.querySelectorAll(
        '[class*="description"], [class*="Description"], [id*="description"], [id*="Description"], [class*="remarks"], [class*="Remarks"]'
      );
      for (const el of candidates) {
        const text = el.textContent?.trim() || "";
        if (text.length > 80 && text.length < 5000) {
          return text;
        }
      }

      return "";
    });

    return description;
  } catch {
    return "";
  } finally {
    await page.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitFlag = args.find((a) => a.startsWith("--limit="));
  const sourceFlag = args.find((a) => a.startsWith("--source="));
  const limit = limitFlag ? parseInt(limitFlag.split("=")[1]) : 0;
  const sourceFilter = sourceFlag ? sourceFlag.split("=")[1] : null;

  // Fetch listings that have no description but have a source URL
  let query = supabase
    .from("listings")
    .select("id, address, source, source_url, description")
    .not("source_url", "eq", "")
    .not("source_url", "is", null)
    .or("description.is.null,description.eq.")
    .order("listing_date", { ascending: false });

  if (sourceFilter) {
    query = query.eq("source", sourceFilter);
  }

  if (limit > 0) query = query.limit(limit);

  const { data: listings, error } = await query;

  if (error) {
    console.error("Failed to fetch listings:", error.message);
    process.exit(1);
  }

  const needsDesc = listings || [];

  console.log(
    `\n📝 Enriching descriptions for ${needsDesc.length} listings${sourceFilter ? ` (source: ${sourceFilter})` : ""}\n`
  );

  if (needsDesc.length === 0) {
    console.log("All listings already have descriptions. Nothing to do.");
    process.exit(0);
  }

  const RESTART_EVERY = 50;

  async function launchBrowser() {
    return puppeteer.launch({
      headless: true,
      protocolTimeout: 60000,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
        "--single-process",
        "--no-zygote",
        "--window-size=1920,1080",
      ],
    });
  }

  let browser = await launchBrowser();
  let updated = 0;
  let failed = 0;

  for (let i = 0; i < needsDesc.length; i++) {
    // Restart browser periodically to avoid memory/protocol issues
    if (i > 0 && i % RESTART_EVERY === 0) {
      console.log(`  [Restarting browser at ${i}/${needsDesc.length}]`);
      try { await browser.close(); } catch { /* ignore */ }
      await delay(2000);
      browser = await launchBrowser();
    }

    const listing = needsDesc[i];
    const pct = ((i + 1) / needsDesc.length * 100).toFixed(0);
    process.stdout.write(
      `  [${i + 1}/${needsDesc.length}] (${pct}%) ${listing.address} (${listing.source})... `
    );

    try {
      const description = await fetchDescription(browser, listing.source_url);

      if (description.length > 30) {
        const { error: updateError } = await supabase
          .from("listings")
          .update({ description })
          .eq("id", listing.id);

        if (updateError) {
          console.log(`ERROR: ${updateError.message}`);
          failed++;
        } else {
          console.log(`${description.length} chars`);
          updated++;
        }
      } else {
        console.log("no description found");
        failed++;
      }
    } catch (err) {
      console.log(`CRASH: ${err instanceof Error ? err.message : err}`);
      failed++;
      // Try to recover browser
      try { await browser.close(); } catch { /* ignore */ }
      await delay(2000);
      browser = await launchBrowser();
    }

    // Random delay between requests
    await delay(1500 + Math.random() * 2000);
  }

  try { await browser.close(); } catch { /* ignore */ }

  console.log(`\n--- DONE ---`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped/Failed: ${failed}`);
  console.log(`  Total: ${needsDesc.length}\n`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
