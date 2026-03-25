import { NextRequest, NextResponse } from "next/server";
import { saveListings } from "@/lib/listings-store";
import { SCRAPER_CONFIG } from "@/lib/config";

// Puppeteer scraping can take a while — increase timeout
export const maxDuration = 300; // 5 minutes

export async function POST(request: NextRequest) {
  try {
    // Dynamic import to avoid bundling puppeteer at build time
    const { scrapeAll } = await import("@/lib/scrapers");

    // Allow overriding sources via request body
    let sources = SCRAPER_CONFIG.sources;
    try {
      const body = await request.json();
      if (body.sources && Array.isArray(body.sources)) {
        sources = body.sources;
      }
    } catch {
      // No body or invalid JSON, use defaults
    }

    const config = { ...SCRAPER_CONFIG, sources };

    console.log(`Starting scrape for ${config.county}, ${config.state} from: ${sources.join(", ")}`);
    const { listings, results } = await scrapeAll(config);

    if (listings.length > 0) {
      await saveListings(listings);
      console.log(`Saved ${listings.length} listings to database`);
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
    console.error("Scrape failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Scrape failed",
      },
      { status: 500 }
    );
  }
}
