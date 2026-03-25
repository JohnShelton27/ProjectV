import { NextResponse } from "next/server";
import { scrapeAll } from "@/lib/scrapers";
import { saveListings } from "@/lib/listings-store";
import { SCRAPER_CONFIG } from "@/lib/config";

export async function POST() {
  try {
    const { listings, results } = await scrapeAll(SCRAPER_CONFIG);

    if (listings.length > 0) {
      await saveListings(listings);
    }

    return NextResponse.json({
      success: true,
      totalListings: listings.length,
      results: results.map((r) => ({
        source: r.source,
        found: r.totalFound,
        errors: r.errors,
      })),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Scrape failed",
      },
      { status: 500 }
    );
  }
}
