import type { Listing, ScrapeResult } from "@/types/listing";
import { getBrowser, createPage, generateSlug, generateId, delay } from "./browser";

/**
 * MLSListings.com requires a form submission from the homepage to establish
 * a valid search session. Direct URL access with a criteria param gets
 * redirected back to the homepage.
 *
 * Strategy: visit homepage -> fill search form -> submit -> scrape results -> paginate.
 */
async function initSearch(
  browser: Awaited<ReturnType<typeof getBrowser>>,
  county: string
): Promise<{ criteriaUrl: string } | null> {
  const page = await createPage(browser);

  try {
    console.log("[MLSListings] Loading homepage for search session...");
    await page.goto("https://www.mlslistings.com/", {
      waitUntil: "networkidle2",
      timeout: 60000,
    });
    await delay(3000);

    // Fill search form with county
    await page.evaluate((countyName: string) => {
      const searchText = document.querySelector("#searchText") as HTMLInputElement;
      const searchTextType = document.querySelector("#searchTextType") as HTMLInputElement;
      if (searchText) searchText.value = `${countyName} County`;
      if (searchTextType) searchTextType.value = "CountyOrParish";
    }, county);

    // Submit the form and wait for navigation
    await Promise.all([
      page.waitForNavigation({ waitUntil: "networkidle2", timeout: 60000 }),
      page.evaluate(() => {
        const form = document.querySelector("#searchText")?.closest("form");
        if (form) form.submit();
      }),
    ]);
    await delay(3000);

    const finalUrl = page.url();
    console.log(`[MLSListings] Search session established: ${finalUrl.slice(0, 80)}...`);

    // Verify we got results
    const count = await page.evaluate(
      () => document.querySelectorAll(".listing-card").length
    );
    console.log(`[MLSListings] Initial page has ${count} listing cards`);

    if (count === 0) {
      console.log("[MLSListings] No listings on initial search. Site may be blocking.");
      return null;
    }

    return { criteriaUrl: finalUrl };
  } finally {
    await page.close();
  }
}

export async function scrapeMlsListings(
  county: string,
  state: string,
  maxPages: number = 3
): Promise<ScrapeResult> {
  const listings: Listing[] = [];
  const errors: string[] = [];

  const browser = await getBrowser();

  // Step 1: Initialize search session via form submission
  const session = await initSearch(browser, county);
  if (!session) {
    return {
      listings: [],
      totalFound: 0,
      source: "mlslistings",
      scrapedAt: new Date().toISOString(),
      errors: ["Failed to establish search session"],
    };
  }

  // Extract the base URL pattern for pagination
  // URL looks like: .../Search/Result/ventura-county/1?criteria=...
  const criteriaMatch = session.criteriaUrl.match(/criteria=([^&]+)/);
  const criteria = criteriaMatch ? criteriaMatch[1] : "";
  const countySlug = `${county.toLowerCase()}-county`;

  for (let page = 1; page <= maxPages; page++) {
    const pageObj = await createPage(browser);

    try {
      const url = `https://www.mlslistings.com/Search/Result/${countySlug}/${page}?criteria=${criteria}`;
      console.log(`[MLSListings] Scraping page ${page}...`);
      await pageObj.goto(url, { waitUntil: "networkidle2", timeout: 60000 });
      await delay(5000);

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
          images: string[];
          detailUrl: string;
        }> = [];

        const cards = document.querySelectorAll(".listing-card");

        for (const card of cards) {
          // Address + detail URL from the non-prerender link
          const linkEl = card.querySelector(
            "a.search-nav-link:not(.prerender)"
          ) as HTMLAnchorElement | null;
          const fullAddress = linkEl?.textContent?.trim() || "";
          const detailUrl = linkEl?.href || "";

          if (!fullAddress) continue;

          // Parse "1220 W Robert Ave, Oxnard, CA 93030"
          const parts = fullAddress.split(",").map((s: string) => s.trim());
          const address = parts[0] || "";
          const city = parts[1] || "";
          const stateZip = parts[2] || "";
          const stateCode = stateZip.replace(/\d/g, "").trim();
          const zip = stateZip.match(/\d{5}/)?.[0] || "";

          // Price from first text node in .listing-price
          const priceEl = card.querySelector(".listing-price");
          let price = 0;
          if (priceEl) {
            for (const node of priceEl.childNodes) {
              if (node.nodeType === Node.TEXT_NODE) {
                price =
                  parseInt(
                    (node.textContent || "").replace(/[^0-9]/g, ""),
                    10
                  ) || 0;
                if (price > 0) break;
              }
            }
          }

          if (!address || price === 0) continue;

          // Parse info items with regex
          const infoItems = [...card.querySelectorAll(".listing-info-item")]
            .map((el) => (el.textContent || "").replace(/\s+/g, " ").trim());
          const allText = infoItems.join(" | ");

          const bedsMatch = allText.match(/(\d+)\s*Bd/);
          const bathsMatch = allText.match(/(\d+\.?\d*)\s*Ba/);
          const sqftMatch = allText.match(/([\d,]+)\s*Sq Ft(?!\s*Lot)/);
          const lotMatch = allText.match(/([\d,.]+)\s*(Sq Ft|Acres)\s*Lot/);
          const yearMatch = allText.match(/(\d{4})\s*Year Built/);

          const typeEl = card.querySelector(".listing-type");
          const imgEl = card.querySelector(
            "img.listing-image"
          ) as HTMLImageElement | null;
          // b-lazy uses data-src for the real URL; src is a placeholder GIF
          const imgSrc =
            imgEl?.getAttribute("data-src") ||
            imgEl?.getAttribute("data-original") ||
            imgEl?.src ||
            "";
          const isPlaceholder =
            !imgSrc || imgSrc.startsWith("data:");

          results.push({
            address,
            city,
            state: stateCode,
            zip,
            price,
            bedrooms: bedsMatch ? parseInt(bedsMatch[1]) : 0,
            bathrooms: bathsMatch ? parseFloat(bathsMatch[1]) : 0,
            sqft: sqftMatch
              ? parseInt(sqftMatch[1].replace(/,/g, ""))
              : 0,
            lotSize: lotMatch
              ? `${lotMatch[1]} ${lotMatch[2]} Lot`
              : "N/A",
            yearBuilt: yearMatch ? parseInt(yearMatch[1]) : 0,
            propertyType: typeEl?.textContent?.trim() || "Unknown",
            images: isPlaceholder ? [] : [imgSrc],
            detailUrl,
          });
        }

        return results;
      });

      for (const item of pageListings) {
        listings.push({
          id: generateId(item.address, "mlslistings"),
          slug: generateSlug(item.address, item.city || county),
          address: item.address,
          city: item.city || county,
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
          status: "active",
          description: "",
          images: item.images,
          features: [],
          listingDate: new Date().toISOString(),
          source: "mlslistings",
          sourceUrl: item.detailUrl,
        });
      }

      console.log(
        `[MLSListings] Page ${page}: found ${pageListings.length} listings`
      );

      if (pageListings.length === 0) {
        console.log("[MLSListings] No listings on this page, stopping.");
        break;
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Unknown error";
      errors.push(`MLSListings page ${page}: ${msg}`);
      console.error(`[MLSListings] Page ${page} error:`, msg);
    } finally {
      await pageObj.close();
    }

    await delay(3000 + Math.random() * 2000);
  }

  return {
    listings,
    totalFound: listings.length,
    source: "mlslistings",
    scrapedAt: new Date().toISOString(),
    errors,
  };
}
