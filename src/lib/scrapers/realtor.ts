import axios from "axios";
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

export async function scrapeRealtor(
  county: string,
  state: string,
  maxPages: number = 5
): Promise<ScrapeResult> {
  const listings: Listing[] = [];
  const errors: string[] = [];

  for (let page = 1; page <= maxPages; page++) {
    try {
      // Realtor.com has a public-facing API used by their frontend
      const stateAbbr = state.length === 2 ? state : getStateAbbreviation(state);
      const url = `https://www.realtor.com/api/v1/hulk_main_srp`;

      const params = {
        client_id: "rdc-x",
        schema: "vesta",
        query: JSON.stringify({
          status: ["for_sale"],
          county: county,
          state_code: stateAbbr,
          offset: (page - 1) * 42,
          limit: 42,
          sort: { direction: "desc", field: "list_date" },
        }),
      };

      const response = await axios.get(url, {
        params,
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json",
        },
        timeout: 15000,
      });

      const results = response.data?.data?.home_search?.results || [];

      for (const item of results) {
        const address = item.location?.address?.line || "";
        const city = item.location?.address?.city || county;

        const listing: Listing = {
          id: generateId(address, "realtor"),
          slug: generateSlug(address, city),
          address,
          city,
          state: item.location?.address?.state_code || stateAbbr,
          zip: item.location?.address?.postal_code || "",
          county,
          price: item.list_price || 0,
          bedrooms: item.description?.beds || 0,
          bathrooms: item.description?.baths_consolidated || item.description?.baths || 0,
          sqft: item.description?.sqft || 0,
          lotSize: item.description?.lot_sqft
            ? `${(item.description.lot_sqft / 43560).toFixed(2)} acres`
            : "N/A",
          yearBuilt: item.description?.year_built || 0,
          propertyType: item.description?.type || "Unknown",
          status: "active",
          description: item.description?.text || "",
          images: item.photos?.map((p: { href: string }) => p.href) || [],
          features: item.tags || [],
          listingDate: item.list_date || new Date().toISOString(),
          source: "realtor",
          sourceUrl: item.href
            ? `https://www.realtor.com${item.href}`
            : "",
          agent: item.advertisers?.[0]
            ? {
                name: item.advertisers[0].name || "",
                phone: item.advertisers[0].phone || undefined,
                company: item.advertisers[0].office?.name || undefined,
              }
            : undefined,
          coordinates: item.location?.address?.coordinate
            ? {
                lat: item.location.address.coordinate.lat,
                lng: item.location.address.coordinate.lon,
              }
            : undefined,
        };

        listings.push(listing);
      }

      await new Promise((resolve) => setTimeout(resolve, 2000));
    } catch (err) {
      errors.push(
        `Realtor page ${page}: ${err instanceof Error ? err.message : "Unknown error"}`
      );
    }
  }

  return {
    listings,
    totalFound: listings.length,
    source: "realtor",
    scrapedAt: new Date().toISOString(),
    errors,
  };
}

function getStateAbbreviation(state: string): string {
  const states: Record<string, string> = {
    alabama: "AL", alaska: "AK", arizona: "AZ", arkansas: "AR",
    california: "CA", colorado: "CO", connecticut: "CT", delaware: "DE",
    florida: "FL", georgia: "GA", hawaii: "HI", idaho: "ID",
    illinois: "IL", indiana: "IN", iowa: "IA", kansas: "KS",
    kentucky: "KY", louisiana: "LA", maine: "ME", maryland: "MD",
    massachusetts: "MA", michigan: "MI", minnesota: "MN", mississippi: "MS",
    missouri: "MO", montana: "MT", nebraska: "NE", nevada: "NV",
    "new hampshire": "NH", "new jersey": "NJ", "new mexico": "NM",
    "new york": "NY", "north carolina": "NC", "north dakota": "ND",
    ohio: "OH", oklahoma: "OK", oregon: "OR", pennsylvania: "PA",
    "rhode island": "RI", "south carolina": "SC", "south dakota": "SD",
    tennessee: "TN", texas: "TX", utah: "UT", vermont: "VT",
    virginia: "VA", washington: "WA", "west virginia": "WV",
    wisconsin: "WI", wyoming: "WY",
  };
  return states[state.toLowerCase()] || state;
}
