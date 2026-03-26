import type { Listing, ScrapeResult } from "@/types/listing";
import { scrapeMlsListings } from "./mlslistings";
import { closeBrowser } from "./browser";

const scraperMap: Record<string, (county: string, state: string, maxPages: number) => Promise<ScrapeResult>> = {
  mlslistings: scrapeMlsListings,
};

export async function scrapeAll(config: {
  county: string;
  state: string;
  maxPages: number;
  sources: string[];
}): Promise<{
  listings: Listing[];
  results: ScrapeResult[];
}> {
  const allResults: ScrapeResult[] = [];
  const allListings: Listing[] = [];

  for (const source of config.sources) {
    const scraper = scraperMap[source];
    if (!scraper) {
      allResults.push({
        listings: [],
        totalFound: 0,
        source,
        scrapedAt: new Date().toISOString(),
        errors: [`Unknown source: ${source}`],
      });
      continue;
    }

    try {
      console.log(`Starting ${source} scraper...`);
      const result = await scraper(config.county, config.state, config.maxPages);
      allResults.push(result);
      allListings.push(...result.listings);
      console.log(`${source}: found ${result.totalFound} listings, ${result.errors.length} errors`);
    } catch (err) {
      allResults.push({
        listings: [],
        totalFound: 0,
        source,
        scrapedAt: new Date().toISOString(),
        errors: [err instanceof Error ? err.message : "Scraper crashed"],
      });
    }
  }

  await closeBrowser();

  // Deduplicate by normalized address
  const seen = new Set<string>();
  const deduplicated = allListings.filter((listing) => {
    const key = listing.address.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  console.log(`Total: ${deduplicated.length} unique listings from ${config.sources.length} sources`);

  return { listings: deduplicated, results: allResults };
}

export { scrapeMlsListings } from "./mlslistings";
