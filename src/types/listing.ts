export interface Listing {
  id: string;
  slug: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  county: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  sqft: number;
  lotSize: string;
  yearBuilt: number;
  propertyType: string;
  status: "active" | "pending" | "sold";
  description: string;
  images: string[];
  features: string[];
  listingDate: string;
  source: "zillow" | "realtor" | "mls";
  sourceUrl: string;
  agent?: {
    name: string;
    phone?: string;
    email?: string;
    company?: string;
  };
  taxInfo?: {
    annualTax: number;
    assessedValue: number;
  };
  coordinates?: {
    lat: number;
    lng: number;
  };
}

export interface ScraperConfig {
  county: string;
  state: string;
  maxPages: number;
  sources: ("zillow" | "realtor" | "mls")[];
}

export interface ScrapeResult {
  listings: Listing[];
  totalFound: number;
  source: string;
  scrapedAt: string;
  errors: string[];
}
