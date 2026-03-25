import type { Listing, ScrapeResult } from "@/types/listing";
import { getBrowser, createPage, generateSlug, generateId, delay } from "./browser";

export async function scrapeRealtor(
  county: string,
  state: string,
  maxPages: number = 3
): Promise<ScrapeResult> {
  const listings: Listing[] = [];
  const errors: string[] = [];

  const stateSlug = state.toLowerCase().replace(/\s+/g, "-");
  const countySlug = `${county.toLowerCase().replace(/\s+/g, "-")}-county`;

  const browser = await getBrowser();

  for (let page = 1; page <= maxPages; page++) {
    const pageObj = await createPage(browser);

    try {
      const url =
        page === 1
          ? `https://www.realtor.com/realestateandhomes-search/${countySlug}_${stateSlug}`
          : `https://www.realtor.com/realestateandhomes-search/${countySlug}_${stateSlug}/pg-${page}`;

      console.log(`[Realtor] Scraping page ${page}: ${url}`);
      await pageObj.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

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
          lotSize: string;
          propertyType: string;
          images: string[];
          detailUrl: string;
          lat?: number;
          lng?: number;
        }> = [];

        // Method 1: Parse __NEXT_DATA__
        const nextDataEl = document.querySelector("#__NEXT_DATA__");
        if (nextDataEl) {
          try {
            const data = JSON.parse(nextDataEl.textContent || "");
            const homes =
              data?.props?.pageProps?.properties ||
              data?.props?.pageProps?.searchResults?.home_search?.results ||
              [];

            for (const home of homes) {
              const loc = home.location || {};
              const addr = loc.address || {};
              results.push({
                address: addr.line || home.address?.line || "",
                city: addr.city || home.address?.city || "",
                state: addr.state_code || home.address?.state_code || "",
                zip: addr.postal_code || home.address?.postal_code || "",
                price: home.list_price || home.price || 0,
                bedrooms: home.description?.beds || home.beds || 0,
                bathrooms: home.description?.baths || home.baths || 0,
                sqft: home.description?.sqft || home.sqft || 0,
                lotSize: home.description?.lot_sqft
                  ? `${(home.description.lot_sqft / 43560).toFixed(2)} acres`
                  : "N/A",
                propertyType: home.description?.type || home.prop_type || "Unknown",
                images: home.photos?.map((p: { href: string }) => p.href).filter(Boolean) || [],
                detailUrl: home.permalink
                  ? `https://www.realtor.com/realestateandhomes-detail/${home.permalink}`
                  : home.href
                    ? `https://www.realtor.com${home.href}`
                    : "",
                lat: loc.address?.coordinate?.lat,
                lng: loc.address?.coordinate?.lon,
              });
            }
          } catch {
            // JSON parsing failed
          }
        }

        // Method 2: DOM fallback
        if (results.length === 0) {
          const cards = document.querySelectorAll(
            '[data-testid="property-card"], .BasePropertyCard_propertyCardWrap__J0xUj, .property-card'
          );

          for (const card of cards) {
            const priceEl = card.querySelector(
              '[data-testid="card-price"], .card-price, .PropertyCardPrice'
            );
            const addressEl = card.querySelector(
              '[data-testid="card-address"], .card-address'
            );
            const linkEl = card.querySelector("a[href*='realestateandhomes-detail']");
            const imgEl = card.querySelector("img");

            const priceText = priceEl?.textContent?.trim() || "";
            const price = parseInt(priceText.replace(/[^0-9]/g, ""), 10) || 0;
            const addressText = addressEl?.textContent?.trim() || "";

            if (!addressText || price === 0) continue;

            const cardText = card.textContent || "";
            const bedsMatch = cardText.match(/(\d+)\s*(?:bed|bd)/i);
            const bathsMatch = cardText.match(/(\d+(?:\.\d+)?)\s*(?:bath|ba)/i);
            const sqftMatch = cardText.match(/([\d,]+)\s*(?:sqft|sq\s*ft)/i);

            const parts = addressText.split(",").map((s: string) => s.trim());

            results.push({
              address: parts[0] || addressText,
              city: parts[1] || "",
              state: parts[2]?.replace(/\d+/g, "").trim() || "",
              zip: addressText.match(/\d{5}/)?.[0] || "",
              price,
              bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : 0,
              bathrooms: bathsMatch ? parseFloat(bathsMatch[1]) : 0,
              sqft: sqftMatch ? parseInt(sqftMatch[1].replace(/,/g, "")) : 0,
              lotSize: "N/A",
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
          id: generateId(item.address, "realtor"),
          slug: generateSlug(item.address, city),
          address: item.address,
          city,
          state: item.state || state,
          zip: item.zip,
          county,
          price: item.price,
          bedrooms: item.bedrooms,
          bathrooms: item.bathrooms,
          sqft: item.sqft,
          lotSize: item.lotSize,
          yearBuilt: 0,
          propertyType: item.propertyType,
          status: "active",
          description: "",
          images: item.images,
          features: [],
          listingDate: new Date().toISOString(),
          source: "realtor",
          sourceUrl: item.detailUrl,
          coordinates:
            item.lat && item.lng ? { lat: item.lat, lng: item.lng } : undefined,
        });
      }

      console.log(`[Realtor] Page ${page}: found ${pageListings.length} listings`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Realtor page ${page}: ${msg}`);
      console.error(`[Realtor] Page ${page} error:`, msg);
    } finally {
      await pageObj.close();
    }

    await delay(3000 + Math.random() * 2000);
  }

  return {
    listings,
    totalFound: listings.length,
    source: "realtor",
    scrapedAt: new Date().toISOString(),
    errors,
  };
}
