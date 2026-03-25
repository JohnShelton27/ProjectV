import fs from "fs/promises";
import path from "path";
import type { Listing } from "@/types/listing";

const DATA_DIR = path.join(process.cwd(), "data");
const LISTINGS_FILE = path.join(DATA_DIR, "listings.json");

async function ensureDataDir() {
  try {
    await fs.mkdir(DATA_DIR, { recursive: true });
  } catch {
    // Directory already exists
  }
}

export async function saveListings(listings: Listing[]): Promise<void> {
  await ensureDataDir();
  const existing = await loadListings();

  // Merge: update existing by address, add new ones
  const map = new Map(existing.map((l) => [l.address.toLowerCase(), l]));
  for (const listing of listings) {
    map.set(listing.address.toLowerCase(), listing);
  }

  const merged = Array.from(map.values());
  await fs.writeFile(LISTINGS_FILE, JSON.stringify(merged, null, 2), "utf-8");
}

export async function loadListings(): Promise<Listing[]> {
  await ensureDataDir();
  try {
    const data = await fs.readFile(LISTINGS_FILE, "utf-8");
    return JSON.parse(data) as Listing[];
  } catch {
    return [];
  }
}

export async function getListingBySlug(slug: string): Promise<Listing | null> {
  const listings = await loadListings();
  return listings.find((l) => l.slug === slug) || null;
}

export async function getListingsByFilter(filter: {
  minPrice?: number;
  maxPrice?: number;
  bedrooms?: number;
  bathrooms?: number;
  propertyType?: string;
  status?: string;
  city?: string;
}): Promise<Listing[]> {
  let listings = await loadListings();

  if (filter.minPrice) listings = listings.filter((l) => l.price >= filter.minPrice!);
  if (filter.maxPrice) listings = listings.filter((l) => l.price <= filter.maxPrice!);
  if (filter.bedrooms) listings = listings.filter((l) => l.bedrooms >= filter.bedrooms!);
  if (filter.bathrooms) listings = listings.filter((l) => l.bathrooms >= filter.bathrooms!);
  if (filter.propertyType)
    listings = listings.filter(
      (l) => l.propertyType.toLowerCase() === filter.propertyType!.toLowerCase()
    );
  if (filter.status) listings = listings.filter((l) => l.status === filter.status);
  if (filter.city)
    listings = listings.filter(
      (l) => l.city.toLowerCase() === filter.city!.toLowerCase()
    );

  return listings;
}
