import type { ScraperConfig } from "@/types/listing";

export const SCRAPER_CONFIG: ScraperConfig = {
  county: "Ventura",
  state: "California",
  maxPages: 35,
  sources: ["zillow", "realtor", "redfin", "trulia", "mlslistings"],
};

export const SITE_CONFIG = {
  name: "Ventura County Real Estate",
  description: "Browse real estate listings in Ventura County, California",
  county: "Ventura County",
  state: "CA",
};

export const AGENT_CONFIG = {
  name: "Your Name",
  title: "Licensed Real Estate Agent",
  brokerage: "Your Brokerage",
  phone: "(805) 555-0100",
  email: "agent@example.com",
  licenseNumber: "DRE# 0000000",
};
