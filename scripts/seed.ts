import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

const listings = [
  {
    id: "sample1",
    slug: "123-main-st-ventura",
    address: "123 Main St",
    city: "Ventura",
    state: "CA",
    zip: "93001",
    county: "Ventura",
    price: 875000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1850,
    lot_size: "0.18 acres",
    year_built: 1972,
    property_type: "Single Family",
    status: "active",
    description:
      "Charming single-family home in the heart of Ventura. This 3-bedroom, 2-bathroom residence features an open floor plan, updated kitchen with granite countertops, and a spacious backyard perfect for entertaining. Walking distance to downtown shops and restaurants.",
    images: [],
    features: ["Central A/C", "Hardwood Floors", "Updated Kitchen", "Backyard", "Garage"],
    listing_date: "2026-03-15T00:00:00.000Z",
    source: "zillow",
    source_url: "",
  },
  {
    id: "sample2",
    slug: "456-ocean-ave-oxnard",
    address: "456 Ocean Ave",
    city: "Oxnard",
    state: "CA",
    zip: "93035",
    county: "Ventura",
    price: 1250000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2400,
    lot_size: "0.25 acres",
    year_built: 2005,
    property_type: "Single Family",
    status: "active",
    description:
      "Beautiful ocean-view property in Oxnard Shores. This modern 4-bed, 3-bath home boasts panoramic Pacific views, a gourmet kitchen, primary suite with balcony, and a private pool. Located steps from the beach.",
    images: [],
    features: ["Ocean View", "Pool", "Gourmet Kitchen", "Primary Suite", "Smart Home"],
    listing_date: "2026-03-10T00:00:00.000Z",
    source: "realtor",
    source_url: "",
  },
  {
    id: "sample3",
    slug: "789-hillcrest-dr-thousand-oaks",
    address: "789 Hillcrest Dr",
    city: "Thousand Oaks",
    state: "CA",
    zip: "91360",
    county: "Ventura",
    price: 1650000,
    bedrooms: 5,
    bathrooms: 4,
    sqft: 3200,
    lot_size: "0.45 acres",
    year_built: 1998,
    property_type: "Single Family",
    status: "pending",
    description:
      "Stunning estate in the Thousand Oaks hills. This 5-bedroom masterpiece features soaring ceilings, a chef's kitchen, home theater, wine cellar, and resort-style backyard with pool and spa. Top-rated Conejo Valley schools.",
    images: [],
    features: ["Home Theater", "Wine Cellar", "Pool & Spa", "3-Car Garage", "Mountain Views"],
    listing_date: "2026-03-01T00:00:00.000Z",
    source: "zillow",
    source_url: "",
  },
  {
    id: "sample4",
    slug: "321-camarillo-springs-rd-camarillo",
    address: "321 Camarillo Springs Rd",
    city: "Camarillo",
    state: "CA",
    zip: "93012",
    county: "Ventura",
    price: 725000,
    bedrooms: 3,
    bathrooms: 2,
    sqft: 1600,
    lot_size: "0.15 acres",
    year_built: 1985,
    property_type: "Single Family",
    status: "active",
    description:
      "Well-maintained home in desirable Camarillo Springs. Features include an updated kitchen, new flooring throughout, energy-efficient windows, and a beautifully landscaped yard. Close to shopping, dining, and the 101 freeway.",
    images: [],
    features: ["Updated Kitchen", "New Flooring", "Energy Efficient", "Landscaped Yard"],
    listing_date: "2026-03-20T00:00:00.000Z",
    source: "realtor",
    source_url: "",
  },
  {
    id: "sample5",
    slug: "555-simi-valley-blvd-simi-valley",
    address: "555 Simi Valley Blvd",
    city: "Simi Valley",
    state: "CA",
    zip: "93065",
    county: "Ventura",
    price: 950000,
    bedrooms: 4,
    bathrooms: 3,
    sqft: 2100,
    lot_size: "0.20 acres",
    year_built: 2010,
    property_type: "Single Family",
    status: "active",
    description:
      "Modern home in Simi Valley with mountain views. Open concept living with high ceilings, quartz countertops, and stainless steel appliances. Large master suite, covered patio, and low-maintenance yard. Near parks and trails.",
    images: [],
    features: ["Mountain Views", "Open Concept", "Covered Patio", "Low Maintenance"],
    listing_date: "2026-03-18T00:00:00.000Z",
    source: "zillow",
    source_url: "",
  },
];

async function seed() {
  const { error } = await supabase.from("listings").upsert(listings, { onConflict: "id" });
  if (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
  console.log(`Seeded ${listings.length} listings into Supabase.`);
}

seed();
