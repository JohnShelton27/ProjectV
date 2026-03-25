import type { Listing, ScrapeResult } from "@/types/listing";
import { getBrowser, createPage, generateSlug, generateId, delay } from "./browser";

export async function scrapeZillow(
  county: string,
  state: string,
  maxPages: number = 3
): Promise<ScrapeResult> {
  const listings: Listing[] = [];
  const errors: string[] = [];
  const searchQuery = `${county}-county-${state.toLowerCase().replace(/\s+/g, "-")}`;

  const browser = await getBrowser();

  for (let page = 1; page <= maxPages; page++) {
    const pageObj = await createPage(browser);

    try {
      const url =
        page === 1
          ? `https://www.zillow.com/${searchQuery}/`
          : `https://www.zillow.com/${searchQuery}/${page}_p/`;

      console.log(`[Zillow] Scraping page ${page}: ${url}`);
      await pageObj.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      // Wait for listings to load
      await pageObj.waitForSelector(
        'article[data-test="property-card"], [data-test="property-card-link"], .property-card-data',
        { timeout: 10000 }
      ).catch(() => {
        // Try alternate selector
      });

      // Extract listing data from the page's embedded JSON or DOM
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
          yearBuilt: number;
          propertyType: string;
          status: string;
          description: string;
          images: string[];
          detailUrl: string;
          lat?: number;
          lng?: number;
        }> = [];

        // Method 1: Parse __NEXT_DATA__ or embedded JSON
        const scripts = document.querySelectorAll('script[type="application/json"]');
        for (const script of scripts) {
          try {
            const data = JSON.parse(script.textContent || "");
            // Zillow stores search results in various nested paths
            const searchResults =
              data?.props?.pageProps?.searchPageState?.cat1?.searchResults?.listResults ||
              data?.cat1?.searchResults?.listResults ||
              [];

            for (const item of searchResults) {
              if (!item.address && !item.streetAddress) continue;
              results.push({
                address: item.address || item.streetAddress || "",
                city: item.addressCity || "",
                state: item.addressState || "",
                zip: item.addressZipcode || "",
                price: item.unformattedPrice || item.price || 0,
                bedrooms: item.beds || 0,
                bathrooms: item.baths || 0,
                sqft: item.area || 0,
                lotSize: item.lotAreaString || "N/A",
                yearBuilt: 0,
                propertyType: item.homeType || "Unknown",
                status: item.homeStatus === "FOR_SALE" ? "active" : "pending",
                description: "",
                images: item.carouselPhotos?.map((p: { url: string }) => p.url) || [],
                detailUrl: item.detailUrl ? `https://www.zillow.com${item.detailUrl}` : "",
                lat: item.latLong?.latitude,
                lng: item.latLong?.longitude,
              });
            }
          } catch {
            // Not the right script tag
          }
        }

        // Method 2: Parse from DOM if JSON parsing failed
        if (results.length === 0) {
          const cards = document.querySelectorAll(
            '[data-test="property-card"], .list-card, .property-card'
          );
          for (const card of cards) {
            const addressEl = card.querySelector(
              '[data-test="property-card-addr"], .list-card-addr, address'
            );
            const priceEl = card.querySelector(
              '[data-test="property-card-price"], .list-card-price, span[data-test="property-card-price"]'
            );
            const linkEl = card.querySelector("a[href]");
            const imgEl = card.querySelector("img");

            const addressText = addressEl?.textContent?.trim() || "";
            const priceText = priceEl?.textContent?.trim() || "";
            const price = parseInt(priceText.replace(/[^0-9]/g, ""), 10) || 0;

            // Parse beds/baths/sqft from card details
            const detailText = card.textContent || "";
            const bedsMatch = detailText.match(/(\d+)\s*(?:bd|bed|bds)/i);
            const bathsMatch = detailText.match(/(\d+(?:\.\d+)?)\s*(?:ba|bath)/i);
            const sqftMatch = detailText.match(/([\d,]+)\s*(?:sqft|sq\s*ft)/i);

            if (addressText && price > 0) {
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
                lotSize: "N/A",
                yearBuilt: 0,
                propertyType: "Unknown",
                status: "active",
                description: "",
                images: imgEl?.src ? [imgEl.src] : [],
                detailUrl: (linkEl as HTMLAnchorElement)?.href || "",
              });
            }
          }
        }

        return results;
      });

      for (const item of pageListings) {
        const city = item.city || county;
        listings.push({
          id: generateId(item.address, "zillow"),
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
          yearBuilt: item.yearBuilt,
          propertyType: item.propertyType,
          status: item.status as "active" | "pending" | "sold",
          description: item.description,
          images: item.images,
          features: [],
          listingDate: new Date().toISOString(),
          source: "zillow",
          sourceUrl: item.detailUrl,
          coordinates:
            item.lat && item.lng ? { lat: item.lat, lng: item.lng } : undefined,
        });
      }

      console.log(`[Zillow] Page ${page}: found ${pageListings.length} listings`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Zillow page ${page}: ${msg}`);
      console.error(`[Zillow] Page ${page} error:`, msg);
    } finally {
      await pageObj.close();
    }

    await delay(3000 + Math.random() * 2000);
  }

  return {
    listings,
    totalFound: listings.length,
    source: "zillow",
    scrapedAt: new Date().toISOString(),
    errors,
  };
}
