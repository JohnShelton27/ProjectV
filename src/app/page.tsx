import { Suspense } from "react";
import {
  loadListings,
  getListingsByFilter,
  getDistinctCities,
} from "@/lib/listings-store";
import { SITE_CONFIG } from "@/lib/config";
import ListingCard from "@/components/ListingCard";
import ListingFilters from "@/components/ListingFilters";

import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const hasFilters =
    params.beds || params.baths || params.maxPrice || params.status || params.city;

  const { listings, total } = hasFilters
    ? await getListingsByFilter({
        bedrooms: params.beds ? Number(params.beds) : undefined,
        bathrooms: params.baths ? Number(params.baths) : undefined,
        maxPrice: params.maxPrice ? Number(params.maxPrice) : undefined,
        status: params.status,
        city: params.city,
        sort: params.sort,
        page,
      })
    : await loadListings(params.sort, page);

  const allCities = await getDistinctCities();
  const totalPages = Math.ceil(total / 100);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Hero */}
      <div className="mb-10">
        <h2 className="text-3xl font-bold text-slate-900 mb-2">
          {SITE_CONFIG.county} Real Estate
        </h2>
        <p className="text-slate-600 mb-6">
          Browse {total > 0 ? total : ""} properties for sale in{" "}
          {SITE_CONFIG.county}, {SITE_CONFIG.state}
        </p>
      </div>

      {/* Filters */}
      <Suspense fallback={null}>
        <ListingFilters cities={allCities} />
      </Suspense>

      {/* Listing Grid */}
      {listings.length > 0 ? (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((listing) => (
              <ListingCard key={listing.id} listing={listing} />
            ))}
          </div>
          {totalPages > 1 && (
            <Suspense fallback={null}>
              <Pagination currentPage={page} totalPages={totalPages} />
            </Suspense>
          )}
        </>
      ) : (
        <div className="text-center py-20">
          <div className="text-5xl mb-4">&#127968;</div>
          <h3 className="text-xl font-semibold text-slate-700 mb-2">
            No listings available
          </h3>
          <p className="text-slate-500 mb-6">
            Check back soon for the latest properties in {SITE_CONFIG.county}.
          </p>
        </div>
      )}
    </div>
  );
}
