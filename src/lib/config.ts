import type { ScraperConfig } from "@/types/listing";

export const SCRAPER_CONFIG: ScraperConfig = {
  county: "Ventura",
  state: "California",
  maxPages: 3,
  sources: ["zillow", "realtor", "redfin", "trulia"],
};

export const SITE_CONFIG = {
  name: "Ventura County Real Estate",
  description: "Browse real estate listings in Ventura County, California",
  county: "Ventura County",
  state: "CA",
};
