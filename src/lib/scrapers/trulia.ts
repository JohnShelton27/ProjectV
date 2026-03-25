import type { Listing, ScrapeResult } from "@/types/listing";
import { getBrowser, createPage, generateSlug, generateId, delay } from "./browser";

export async function scrapeTrulia(
  county: string,
  state: string,
  maxPages: number = 3
): Promise<ScrapeResult> {
  const listings: Listing[] = [];
  const errors: string[] = [];

  // Trulia uses state abbreviation and county in the URL
  const stateAbbr = getStateAbbr(state);
  const countySlug = county.toLowerCase().replace(/\s+/g, "_");

  const browser = await getBrowser();

  for (let page = 1; page <= maxPages; page++) {
    const pageObj = await createPage(browser);

    try {
      const url =
        page === 1
          ? `https://www.trulia.com/${stateAbbr}/${countySlug}/`
          : `https://www.trulia.com/${stateAbbr}/${countySlug}/${page}_p/`;

      console.log(`[Trulia] Scraping page ${page}: ${url}`);
      await pageObj.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      // Trulia is owned by Zillow and shares a similar data structure
      // Wait for content to render
      await delay(3000);

      const pageListings = await pageObj.evaluate(() => {
        const results: Array<{
          address: string;
          city: string;
          state: string;
          zip: string;
          price: number;
          bedrooms: number;
          bathrooms: number;
          sqft: number;
          propertyType: string;
          images: string[];
          detailUrl: string;
        }> = [];

        // Method 1: Look for embedded JSON data
        const scripts = document.querySelectorAll('script[type="application/json"]');
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent || "");
            // Trulia embeds search results in Apollo cache or props
            const searchData =
              data?.props?.pageProps?.searchData?.homes ||
              data?.props?.pageProps?.searchResult?.homes ||
              [];

            for (const home of searchData) {
              if (!home.location?.fullLocation) continue;
              results.push({
                address: home.location.streetAddress || home.location.fullLocation,
                city: home.location.city || "",
                state: home.location.stateCode || "",
                zip: home.location.zipCode || "",
                price: home.price?.formattedPrice
                  ? parseInt(home.price.formattedPrice.replace(/[^0-9]/g, ""))
                  : 0,
                bedrooms: home.bedrooms || 0,
                bathrooms: home.bathrooms || 0,
                sqft: home.floorSpace?.value || 0,
                propertyType: home.propertyType || "Unknown",
                images: home.media?.photos?.map((p: { url: { mediumSrc: string } }) => p.url?.mediumSrc).filter(Boolean) || [],
                detailUrl: home.url ? `https://www.trulia.com${home.url}` : "",
              });
            }
          } catch {
            // Not the right script
          }
        }

        // Method 2: DOM scraping fallback
        if (results.length === 0) {
          const cards = document.querySelectorAll(
            '[data-testid="search-result-list-container"] li, .resultCardWrapper, [data-hero-element-id="srp-home-card"]'
          );

          for (const card of cards) {
            const priceEl = card.querySelector(
              '[data-testid="property-price"], .cardPrice'
            );
            const addressEl = card.querySelector(
              '[data-testid="property-address"], .cardAddress'
            );
            const linkEl = card.querySelector("a[href*='/p/']");
            const imgEl = card.querySelector("img[src*='trulia']");

            const priceText = priceEl?.textContent?.trim() || "";
            const price = parseInt(priceText.replace(/[^0-9]/g, ""), 10) || 0;
            const addressText = addressEl?.textContent?.trim() || "";

            if (!addressText || price === 0) continue;

            const cardText = card.textContent || "";
            const bedsMatch = cardText.match(/(\d+)bd/i);
            const bathsMatch = cardText.match(/(\d+(?:\.\d+)?)ba/i);
            const sqftMatch = cardText.match(/([\d,]+)\s*sqft/i);

            const parts = addressText.split(",").map((s: string) => s.trim());

            results.push({
              address: parts[0] || addressText,
              city: parts[1] || "",
              state: parts[2]?.replace(/\d+/g, "").trim() || "",
              zip: parts[2]?.match(/\d{5}/)?.[0] || "",
              price,
              bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : 0,
              bathrooms: bathsMatch ? parseFloat(bathsMatch[1]) : 0,
              sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, "")) : 0,
              propertyType: "Unknown",
              images: imgEl ? [(imgEl as HTMLImageElement).src] : [],
              detailUrl: (linkEl as HTMLAnchorElement)?.href || "",
            });
          }
        }

        return results;
      });

      for (const item of pageListings) {
        const city = item.city || county;
        listings.push({
          id: generateId(item.address, "trulia"),
          slug: generateSlug(item.address, city),
          address: item.address,
          city,
          state: item.state || stateAbbr,
          zip: item.zip,
          county,
          price: item.price,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          sqft: item.sqft,
          lotSize: "N/A",
          yearBuilt: 0,
          propertyType: item.propertyType,
          status: "active",
          description: "",
          images: item.images,
          features: [],
          listingDate: new Date().toISOString(),
          source: "zillow", // Trulia data maps to zillow source
          sourceUrl: item.detailUrl,
        });
      }

      console.log(`[Trulia] Page ${page}: found ${pageListings.length} listings`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Trulia page ${page}: ${msg}`);
      console.error(`[Trulia] Page ${page} error:`, msg);
    } finally {
      await pageObj.close();
    }

    await delay(3000 + Math.random() * 2000);
  }

  return {
    listings,
    totalFound: listings.length,
    source: "trulia",
    scrapedAt: new Date().toISOString(),
    errors,
  };
}

function getStateAbbr(state: string): string {
  const map: Record<string, string> = {
    california: "CA", texas: "TX", florida: "FL", "new york": "NY",
    pennsylvania: "PA", illinois: "IL", ohio: "OH", georgia: "GA",
    "north carolina": "NC", michigan: "MI", "new jersey": "NJ",
    virginia: "VA", washington: "WA", arizona: "AZ", massachusetts: "MA",
    tennessee: "TN", indiana: "IN", missouri: "MO", maryland: "MD",
    wisconsin: "WI", colorado: "CO", minnesota: "MN", "south carolina": "SC",
    alabama: "AL", louisiana: "LA", kentucky: "KY", oregon: "OR",
    oklahoma: "OK", connecticut: "CT", utah: "UT", iowa: "IA",
    nevada: "NV", arkansas: "AR", mississippi: "MS", kansas: "KS",
    "new mexico": "NM", nebraska: "NE", idaho: "ID", "west virginia": "WV",
    hawaii: "HI", "new hampshire": "NH", maine: "ME", montana: "MT",
    "rhode island": "RI", delaware: "DE", "south dakota": "SD",
    "north dakota": "ND", alaska: "AK", vermont: "VT", wyoming: "WY",
  };
  if (state.length === 2) return state.toUpperCase();
  return map[state.toLowerCase()] || state;
}
