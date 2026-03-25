import type { Listing, ScraperConfig, ScrapeResult } from "@/types/listing";
import { scrapeZillow } from "./zillow";
import { scrapeRealtor } from "./realtor";
import { scrapeMLS } from "./mls";

export async function scrapeAll(config: ScraperConfig): Promise<{
  listings: Listing[];
  results: ScrapeResult[];
}> {
  const scraperMap = {
    zillow: scrapeZillow,
    realtor: scrapeRealtor,
    mls: scrapeMLS,
  };

  const promises = config.sources.map((source) =>
    scraperMap[source](config.county, config.state, config.maxPages)
  );

  const results = await Promise.allSettled(promises);
  const allListings: Listing[] = [];
  const allResults: ScrapeResult[] = [];

  for (const result of results) {
    if (result.status === "fulfilled") {
      allResults.push(result.value);
      allListings.push(...result.value.listings);
    } else {
      allResults.push({
        listings: [],
        totalFound: 0,
        source: "unknown",
        scrapedAt: new Date().toISOString(),
        errors: [result.reason?.message || "Scraper failed"],
      });
    }
  }

  // Deduplicate by address
  const seen = new Set<string>();
  const deduplicated = allListings.filter((listing) => {
    const key = listing.address.toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return { listings: deduplicated, results: allResults };
}

export { scrapeZillow } from "./zillow";
export { scrapeRealtor } from "./realtor";
export { scrapeMLS } from "./mls";
