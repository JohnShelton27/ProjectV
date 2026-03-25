import { supabase, supabaseAdmin } from "./supabase";
import type { Listing } from "@/types/listing";

const PAGE_SIZE = 100;

// Convert app Listing to DB row format
function toRow(listing: Listing) {
  return {
    id: listing.id,
    slug: listing.slug,
    address: listing.address,
    city: listing.city,
    state: listing.state,
    zip: listing.zip,
    county: listing.county,
    price: listing.price,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    sqft: listing.sqft,
    lot_size: listing.lotSize,
    year_built: listing.yearBuilt,
    property_type: listing.propertyType,
    status: listing.status,
    description: listing.description,
    images: listing.images,
    features: listing.features,
    listing_date: listing.listingDate,
    source: listing.source,
    source_url: listing.sourceUrl,
    tax_annual: listing.taxInfo?.annualTax ?? null,
    tax_assessed_value: listing.taxInfo?.assessedValue ?? null,
    lat: listing.coordinates?.lat ?? null,
    lng: listing.coordinates?.lng ?? null,
  };
}

// Convert DB row to app Listing format
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function fromRow(row: any): Listing {
  return {
    id: row.id,
    slug: row.slug,
    address: row.address,
    city: row.city,
    state: row.state,
    zip: row.zip,
    county: row.county,
    price: row.price,
    bedrooms: row.bedrooms,
    bathrooms: row.bathrooms,
    sqft: row.sqft,
    lotSize: row.lot_size,
    yearBuilt: row.year_built,
    propertyType: row.property_type,
    status: row.status,
    description: row.description,
    images: row.images || [],
    features: row.features || [],
    listingDate: row.listing_date,
    source: row.source,
    sourceUrl: row.source_url,
    taxInfo:
      row.tax_annual != null
        ? { annualTax: row.tax_annual, assessedValue: row.tax_assessed_value }
        : undefined,
    coordinates:
      row.lat != null ? { lat: row.lat, lng: row.lng } : undefined,
  };
}

// Apply sort to a query
function applySort(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  query: any,
  sort?: string
) {
  switch (sort) {
    case "price-asc":
      return query.order("price", { ascending: true });
    case "price-desc":
      return query.order("price", { ascending: false });
    case "newest":
      return query.order("listing_date", { ascending: false });
    case "beds-desc":
      return query.order("bedrooms", { ascending: false });
    case "sqft-desc":
      return query.order("sqft", { ascending: false });
    default:
      return query.order("listing_date", { ascending: false });
  }
}

export async function saveListings(listings: Listing[]): Promise<void> {
  const rows = listings.map(toRow);

  const { error } = await supabaseAdmin
    .from("listings")
    .upsert(rows, { onConflict: "id" });

  if (error) {
    console.error("Failed to save listings:", error.message);
    throw new Error(error.message);
  }
}

export async function loadListings(
  sort?: string,
  page: number = 1
): Promise<{ listings: Listing[]; total: number }> {
  // Get total count
  const { count } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true });

  let query = supabase.from("listings").select("*");
  query = applySort(query, sort);

  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, error } = await query;

  if (error) {
    console.error("Failed to load listings:", error.message);
    return { listings: [], total: 0 };
  }

  return {
    listings: (data || []).map(fromRow),
    total: count || 0,
  };
}

export async function getListingBySlug(
  slug: string
): Promise<Listing | null> {
  const { data, error } = await supabase
    .from("listings")
    .select("*")
    .eq("slug", slug)
    .single();

  if (error || !data) return null;
  return fromRow(data);
}

export async function getListingsByFilter(filter: {
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  status?: string;
  city?: string;
  sort?: string;
  page?: number;
}): Promise<{ listings: Listing[]; total: number }> {
  // Build base filter for count
  let countQuery = supabase
    .from("listings")
    .select("*", { count: "exact", head: true });

  if (filter.minPrice) countQuery = countQuery.gte("price", filter.minPrice);
  if (filter.maxPrice) countQuery = countQuery.lte("price", filter.maxPrice);
  if (filter.bedrooms) countQuery = countQuery.gte("bedrooms", filter.bedrooms);
  if (filter.bathrooms) countQuery = countQuery.gte("bathrooms", filter.bathrooms);
  if (filter.propertyType)
    countQuery = countQuery.ilike("property_type", filter.propertyType);
  if (filter.status) countQuery = countQuery.eq("status", filter.status);
  if (filter.city) countQuery = countQuery.ilike("city", filter.city);

  const { count } = await countQuery;

  // Build data query
  let query = supabase.from("listings").select("*");
  query = applySort(query, filter.sort);

  if (filter.minPrice) query = query.gte("price", filter.minPrice);
  if (filter.maxPrice) query = query.lte("price", filter.maxPrice);
  if (filter.bedrooms) query = query.gte("bedrooms", filter.bedrooms);
  if (filter.bathrooms) query = query.gte("bathrooms", filter.bathrooms);
  if (filter.propertyType)
    query = query.ilike("property_type", filter.propertyType);
  if (filter.status) query = query.eq("status", filter.status);
  if (filter.city) query = query.ilike("city", filter.city);

  const page = filter.page || 1;
  const from = (page - 1) * PAGE_SIZE;
  query = query.range(from, from + PAGE_SIZE - 1);

  const { data, error } = await query;

  if (error) {
    console.error("Failed to filter listings:", error.message);
    return { listings: [], total: 0 };
  }

  return {
    listings: (data || []).map(fromRow),
    total: count || 0,
  };
}

export async function getDistinctCities(): Promise<string[]> {
  const { data, error } = await supabase
    .from("listings")
    .select("city")
    .order("city");

  if (error || !data) return [];

  return [...new Set(
    data
      .map((r) => r.city)
      .filter(Boolean)
      .map((c: string) => c.replace(/_\d+$/, "").trim()) // strip trailing _2 etc.
      .filter((c: string) => /^[A-Za-z]/.test(c)) // must start with a letter
  )].sort();
}
