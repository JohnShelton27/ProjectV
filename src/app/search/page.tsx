import Link from "next/link";
import { supabase } from "@/lib/supabase";
import ListingCard from "@/components/ListingCard";
import type { Listing } from "@/types/listing";

export const dynamic = "force-dynamic";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const q = (params.q || "").trim();

  let listings: Listing[] = [];

  if (q.length >= 2) {
    const { data } = await supabase
      .from("listings")
      .select("*")
      .or(`address.ilike.%${q}%,city.ilike.%${q}%,zip.ilike.%${q}%`)
      .order("price", { ascending: false })
      .limit(50);
    listings = (data || []) as Listing[];
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        href="/"
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-6"
      >
        &larr; Back to all listings
      </Link>

      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">
          {q ? `Search results for "${q}"` : "Search"}
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          {listings.length > 0
            ? `${listings.length} ${listings.length === 1 ? "property" : "properties"} found`
            : q
            ? "No properties match your search"
            : "Enter a search term to find properties"}
        </p>
      </div>

      {listings.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {listings.map((listing) => (
            <ListingCard key={listing.id} listing={listing} />
          ))}
        </div>
      ) : q ? (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">&#128269;</div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            No results found
          </h3>
          <p className="text-slate-500 mb-6">
            Try searching for a different address, city, or ZIP code.
          </p>
          <Link
            href="/"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Browse All Listings
          </Link>
        </div>
      ) : null}
    </div>
  );
}
