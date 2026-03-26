/**
 * Enrich MLSListings entries with full photo galleries.
 * Visits each listing's detail page and extracts all photos from JSON-LD.
 *
 * Usage:
 *   npx tsx scripts/enrich-photos.ts
 *   npx tsx scripts/enrich-photos.ts --limit=50
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
  // Don't block images on detail pages — we need them for data-src
  return page;
}

async function fetchPhotos(
  browser: Browser,
  detailUrl: string
): Promise<string[]> {
  const page = await newPage(browser);
  try {
    await page.goto(detailUrl, {
      waitUntil: "domcontentloaded",
      timeout: 30000,
    });
    await delay(3000);

    const photos = await page.evaluate(() => {
      // Method 1: JSON-LD (most reliable)
      for (const script of document.querySelectorAll(
        'script[type="application/ld+json"]'
      )) {
        try {
          const data = JSON.parse(script.textContent || "");
          if (data.image && Array.isArray(data.image) && data.image.length > 0) {
            return data.image as string[];
          }
        } catch {
          /* skip */
        }
      }

      // Method 2: Carousel images
      const imgs = document.querySelectorAll(
        "#listing-details-photos-carousel .carousel-item.listing-photo img"
      );
      if (imgs.length > 0) {
        return [...imgs].map(
          (img) =>
            (img as HTMLImageElement).getAttribute("data-src") ||
            (img as HTMLImageElement).getAttribute("data-thumb-url") ||
            (img as HTMLImageElement).src
        ).filter((src) => src && !src.startsWith("data:"));
      }

      return [];
    });

    return photos;
  } catch {
    return [];
  } finally {
    await page.close();
  }
}

async function main() {
  const args = process.argv.slice(2);
  const limitFlag = args.find((a) => a.startsWith("--limit="));
  const limit = limitFlag ? parseInt(limitFlag.split("=")[1]) : 0;

  // Fetch MLSListings entries that have only 1 image (thumbnail only)
  let query = supabase
    .from("listings")
    .select("id, address, source_url, images")
    .eq("source", "mlslistings")
    .not("source_url", "eq", "")
    .order("listing_date", { ascending: false });

  if (limit > 0) query = query.limit(limit);

  const { data: listings, error } = await query;

  if (error) {
    console.error("Failed to fetch listings:", error.message);
    process.exit(1);
  }

  // Filter to only those with 0-1 images
  const needsPhotos = (listings || []).filter(
    (l) => !l.images || l.images.length <= 1
  );

  console.log(
    `\n📸 Enriching photos for ${needsPhotos.length} MLSListings entries\n`
  );

  if (needsPhotos.length === 0) {
    console.log("All listings already have photos. Nothing to do.");
    process.exit(0);
  }

  const RESTART_EVERY = 50; // restart browser every N listings to prevent memory leaks

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

  for (let i = 0; i < needsPhotos.length; i++) {
    // Restart browser periodically to avoid memory/protocol issues
    if (i > 0 && i % RESTART_EVERY === 0) {
      console.log(`  [Restarting browser at ${i}/${needsPhotos.length}]`);
      try { await browser.close(); } catch { /* ignore */ }
      await delay(2000);
      browser = await launchBrowser();
    }

    const listing = needsPhotos[i];
    const pct = ((i + 1) / needsPhotos.length * 100).toFixed(0);
    process.stdout.write(
      `  [${i + 1}/${needsPhotos.length}] (${pct}%) ${listing.address}... `
    );

    try {
      const photos = await fetchPhotos(browser, listing.source_url);

      if (photos.length > 1) {
        const { error: updateError } = await supabase
          .from("listings")
          .update({ images: photos })
          .eq("id", listing.id);

        if (updateError) {
          console.log(`ERROR: ${updateError.message}`);
          failed++;
        } else {
          console.log(`${photos.length} photos`);
          updated++;
        }
      } else {
        console.log("no additional photos found");
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
    await delay(1500 + Math.random() * 1500);
  }

  try { await browser.close(); } catch { /* ignore */ }

  console.log(`\n--- DONE ---`);
  console.log(`  Updated: ${updated}`);
  console.log(`  Skipped/Failed: ${failed}`);
  console.log(`  Total: ${needsPhotos.length}\n`);
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
