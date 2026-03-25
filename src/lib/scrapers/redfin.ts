import type { Listing, ScrapeResult } from "@/types/listing";
import { getBrowser, createPage, generateSlug, generateId, delay } from "./browser";

export async function scrapeRedfin(
  county: string,
  state: string,
  maxPages: number = 3
): Promise<ScrapeResult> {
  const listings: Listing[] = [];
  const errors: string[] = [];

  const browser = await getBrowser();

  for (let page = 1; page <= maxPages; page++) {
    const pageObj = await createPage(browser);

    try {
      // Redfin uses a different URL structure — search by county
      const stateSlug = state.toLowerCase().replace(/\s+/g, "-");
      const countySlug = county.toLowerCase().replace(/\s+/g, "-");
      const url =
        page === 1
          ? `https://www.redfin.com/county/${countySlug}/${stateSlug}/filter/sort=lo-days`
          : `https://www.redfin.com/county/${countySlug}/${stateSlug}/filter/sort=lo-days/page-${page}`;

      console.log(`[Redfin] Scraping page ${page}: ${url}`);
      await pageObj.goto(url, { waitUntil: "networkidle2", timeout: 30000 });

      // Redfin often redirects to a specific region ID URL — wait for content
      await delay(3000);

      // Try to close any popups
      await pageObj.evaluate(() => {
        const closeButtons = document.querySelectorAll(
          '[data-rf-test-id="closeButton"], .Modal__close, button[aria-label="Close"]'
        );
        closeButtons.forEach((btn) => (btn as HTMLElement).click());
      });

      await delay(1000);

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

        // Method 1: Redfin embeds data in window.__reactServerState or similar
        try {
          const bodyText = document.body.innerHTML;
          // Look for JSON data in script tags
          const scriptMatch = bodyText.match(
            new RegExp("window\\.__reactServerState\\s*=\\s*({.*?});", "s")
          );
          if (scriptMatch) {
            const data = JSON.parse(scriptMatch[1]);
            const homes =
              data?.ReactServerAgent?.dataByUrl?.[Object.keys(data?.ReactServerAgent?.dataByUrl || {})[0]]?.data?.homes || [];
            for (const home of homes) {
              results.push({
                address: home.streetLine?.value || "",
                city: home.city || "",
                state: home.state || "",
                zip: home.zip || "",
                price: home.price?.value || 0,
                bedrooms: home.beds || 0,
                bathrooms: home.baths || 0,
                sqft: home.sqFt?.value || 0,
                lotSize: home.lotSize?.value ? `${home.lotSize.value} sqft lot` : "N/A",
                propertyType: home.propertyType || "Unknown",
                images: home.photos?.map((p: { photoUrls: { nonFullScreenPhotoUrl: string } }) => p.photoUrls?.nonFullScreenPhotoUrl).filter(Boolean) || [],
                detailUrl: home.url ? `https://www.redfin.com${home.url}` : "",
                lat: home.latLong?.latitude,
                lng: home.latLong?.longitude,
              });
            }
          }
        } catch {
          // JSON parsing failed
        }

        // Method 2: DOM scraping
        if (results.length === 0) {
          const cards = document.querySelectorAll(
            '.HomeCardContainer, .HomeCard, [data-rf-test-id="mapHomeCard"], .MapHomeCardReact'
          );

          for (const card of cards) {
            const priceEl = card.querySelector(
              '.homecardV2Price, [data-rf-test-id="abp-price"], .bp-Homecard__Price--value, .HomeCardContainer__price'
            );
            const addressEl = card.querySelector(
              '.homeAddressV2, [data-rf-test-id="abp-streetLine"], .bp-Homecard__Address--street, .HomeCardContainer__address'
            );
            const cityEl = card.querySelector(
              '.homeCardCityState, .bp-Homecard__Address--city, .HomeCardContainer__cityStateZip'
            );
            const linkEl = card.querySelector('a[href*="/home/"]');
            const imgEl = card.querySelector("img");

            const priceText = priceEl?.textContent?.trim() || "";
            const price = parseInt(priceText.replace(/[^0-9]/g, ""), 10) || 0;
            const addressText = addressEl?.textContent?.trim() || "";
            const cityText = cityEl?.textContent?.trim() || "";

            if (!addressText || price === 0) continue;

            const cardText = card.textContent || "";
            const bedsMatch = cardText.match(/(\d+)\s*(?:Bed|BD|bed)/i);
            const bathsMatch = cardText.match(/(\d+(?:\.\d+)?)\s*(?:Bath|BA|bath)/i);
            const sqftMatch = cardText.match(/([\d,]+)\s*(?:Sq\.?\s*Ft|sqft|SF)/i);

            const cityParts = cityText.split(",").map((s: string) => s.trim());

            results.push({
              address: addressText,
              city: cityParts[0] || "",
              state: cityParts[1]?.replace(/\d+/g, "").trim() || "",
              zip: cityText.match(/\d{5}/)?.[0] || "",
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
          id: generateId(item.address, "redfin"),
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
          source: "zillow", // Map to existing source type for now
          sourceUrl: item.detailUrl,
          coordinates:
            item.lat && item.lng ? { lat: item.lat, lng: item.lng } : undefined,
        });
      }

      console.log(`[Redfin] Page ${page}: found ${pageListings.length} listings`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`Redfin page ${page}: ${msg}`);
      console.error(`[Redfin] Page ${page} error:`, msg);
    } finally {
      await pageObj.close();
    }

    await delay(3000 + Math.random() * 2000);
  }

  return {
    listings,
    totalFound: listings.length,
    source: "redfin",
    scrapedAt: new Date().toISOString(),
    errors,
  };
}
