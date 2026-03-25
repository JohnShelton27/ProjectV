import axios from "axios";
import * as cheerio from "cheerio";
import type { Listing, ScrapeResult } from "@/types/listing";

function generateSlug(address: string, city: string): string {
  return `${address}-${city}`
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function generateId(address: string, source: string): string {
  const raw = `${source}-${address}`;
  let hash = 0;
  for (let i = 0; i < raw.length; i++) {
    const char = raw.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

export async function scrapeZillow(
  county: string,
  state: string,
  maxPages: number = 5
): Promise<ScrapeResult> {
  const listings: Listing[] = [];
  const errors: string[] = [];
  const searchQuery = `${county}-county-${state}`.toLowerCase().replace(/\s+/g, "-");

  for (let page = 1; page <= maxPages; page++) {
    try {
      const url = `https://www.zillow.com/${searchQuery}/rentals/${page}_p/`;

      const response = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.5",
        },
        timeout: 15000,
      });

      const $ = cheerio.load(response.data);

      // Zillow embeds listing data in a script tag as JSON
      const scriptTags = $('script[type="application/json"]');
      scriptTags.each((_, el) => {
        try {
          const jsonText = $(el).html();
          if (!jsonText) return;

          const data = JSON.parse(jsonText);
          const results =
            data?.props?.pageProps?.searchPageState?.cat1?.searchResults
              ?.listResults || [];

          for (const item of results) {
            const address = item.address || item.streetAddress || "";
            const city = item.addressCity || county;

            const listing: Listing = {
              id: generateId(address, "zillow"),
              slug: generateSlug(address, city),
              address,
              city,
              state: item.addressState || state,
              zip: item.addressZipcode || "",
              county,
              price: item.unformattedPrice || item.price || 0,
              bedrooms: item.beds || 0,
              bathrooms: item.baths || 0,
              sqft: item.area || 0,
              lotSize: item.lotAreaString || "N/A",
              yearBuilt: item.yearBuilt || 0,
              propertyType: item.homeType || "Unknown",
              status: item.homeStatus === "FOR_SALE" ? "active" : "pending",
              description: item.description || "",
              images: item.carouselPhotos?.map((p: { url: string }) => p.url) || [],
              features: [],
              listingDate: new Date().toISOString(),
              source: "zillow",
              sourceUrl: item.detailUrl
                ? `https://www.zillow.com${item.detailUrl}`
                : "",
              coordinates: item.latLong
                ? { lat: item.latLong.latitude, lng: item.latLong.longitude }
                : undefined,
            };

            listings.push(listing);
          }
        } catch {
          // Not the right script tag, skip
        }
      });

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err) {
      errors.push(`Zillow page ${page}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }

  return {
    listings,
    totalFound: listings.length,
    source: "zillow",
    scrapedAt: new Date().toISOString(),
    errors,
  };
}
