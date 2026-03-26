import { Suspense } from "react";
import Link from "next/link";
import {
  loadListings,
  getListingsByFilter,
  getDistinctCities,
} from "@/lib/listings-store";
import { getSettings } from "@/lib/settings";
import { supabase } from "@/lib/supabase";
import { formatPrice } from "@/lib/format";
import ListingCard from "@/components/ListingCard";
import ListingFilters from "@/components/ListingFilters";
import HeroSearch from "@/components/HeroSearch";
import Pagination from "@/components/Pagination";

export const dynamic = "force-dynamic";

async function getFeaturedListings() {
  // First try admin-curated featured listings
  const { data: curated } = await supabase
    .from("listings")
    .select("*")
    .eq("featured", true)
    .order("price", { ascending: false })
    .limit(6);

  if (curated && curated.length > 0) return curated;

  // Fallback: top 3 by price if no featured set
  const { data } = await supabase
    .from("listings")
    .select("*")
    .eq("status", "active")
    .not("images", "eq", "{}")
    .order("price", { ascending: false })
    .limit(3);
  return data || [];
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const params = await searchParams;
  const page = params.page ? Number(params.page) : 1;
  const showAll = params.showAll === "true";
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

  const [allCities, settings, featured] = await Promise.all([
    getDistinctCities(),
    getSettings(),
    page === 1 && !hasFilters ? getFeaturedListings() : Promise.resolve([]),
  ]);
  const totalPages = Math.ceil(total / 100);
  const showFeatured = page === 1 && !hasFilters && featured.length > 0;

  return (
    <>
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white overflow-hidden">
        {/* Animated gradient orbs */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-[float_8s_ease-in-out_infinite]" />
          <div className="absolute top-20 -right-20 w-60 h-60 bg-indigo-500/15 rounded-full blur-3xl animate-[float_6s_ease-in-out_infinite_reverse]" />
          <div className="absolute -bottom-20 left-1/3 w-72 h-72 bg-cyan-500/10 rounded-full blur-3xl animate-[float_10s_ease-in-out_infinite_2s]" />
        </div>
        {/* Subtle grid pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-20">
          <div className="max-w-3xl animate-[fadeUp_0.8s_ease-out]">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4">
              Find Your Dream Home in
              <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent"> Ventura County</span>
            </h2>
            <p className="text-lg sm:text-xl text-slate-300 mb-2">
              {total > 0
                ? `${total.toLocaleString()} properties available in Ventura County`
                : settings.siteDescription}
            </p>
            <p className="text-sm text-slate-400">
              {settings.agentName} &middot; {settings.agentBrokerage} &middot; {settings.agentLicense}
            </p>
          </div>

          {/* Search Box */}
          <div className="mt-8">
            <HeroSearch />
          </div>

          {/* CTA buttons */}
          <div className="flex flex-wrap items-center gap-4 mt-6 animate-[fadeUp_0.8s_ease-out_0.3s_both]">
            <a
              href={`tel:${settings.agentPhone.replace(/[^0-9+]/g, "")}`}
              className="bg-blue-500 hover:bg-blue-400 text-white font-semibold px-6 py-3 rounded-lg transition-colors"
            >
              Call {settings.agentPhone}
            </a>
            <a
              href={`mailto:${settings.agentEmail}`}
              className="border border-white/30 text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors"
            >
              Email {settings.agentName}
            </a>
          </div>

          {/* City links */}
          {allCities.length > 0 && (
            <div className="mt-8 animate-[fadeUp_0.8s_ease-out_0.5s_both]">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Browse by City</p>
              <div className="flex flex-wrap gap-2">
                {allCities.map((city) => (
                  <Link
                    key={city}
                    href={`/homes-for-sale/${city.toLowerCase().replace(/\s+/g, "-")}`}
                    className="text-xs px-3 py-1.5 rounded-full bg-white/10 text-slate-300 hover:bg-white/20 hover:text-white transition-colors"
                  >
                    {city}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Featured Listings */}
      {showFeatured && (
        <section className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Featured Properties</h3>
                <p className="text-sm text-slate-500">Premium listings in Ventura County</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {featured.map((row) => (
                <Link
                  key={row.id}
                  href={`/listing/${row.slug}`}
                  className="group relative rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
                >
                  <div className="aspect-[4/3] overflow-hidden">
                    <img
                      src={row.images?.[0] || ""}
                      alt={row.address}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-0 left-0 right-0 p-5">
                    <p className="text-2xl font-bold text-white mb-1">
                      {formatPrice(row.price)}
                    </p>
                    <p className="text-sm text-white/90 truncate">
                      {row.address}, {row.city}
                    </p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-white/75">
                      {row.bedrooms > 0 && <span>{row.bedrooms} bd</span>}
                      {row.bathrooms > 0 && <span>{row.bathrooms} ba</span>}
                      {row.sqft > 0 && <span>{row.sqft.toLocaleString()} sqft</span>}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Main Listings Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Section Header + Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-2xl font-bold text-slate-900">
              {hasFilters ? "Search Results" : "All Listings"}
            </h3>
            <p className="text-sm text-slate-500">
              {total > 0 ? `${total.toLocaleString()} properties found` : "No properties match your criteria"}
              {page > 1 ? ` — Page ${page}` : ""}
            </p>
          </div>
        </div>

        <Suspense fallback={null}>
          <ListingFilters cities={allCities} />
        </Suspense>

        {/* Listing Grid */}
        {listings.length > 0 ? (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {(page === 1 && !hasFilters && !showAll ? listings.slice(0, 12) : listings).map((listing) => (
                <ListingCard key={listing.id} listing={listing} />
              ))}
            </div>
            {page === 1 && !hasFilters && !showAll && listings.length > 12 ? (
              <div className="text-center mt-8">
                <Link
                  href="/?showAll=true"
                  className="inline-block bg-blue-600 text-white font-semibold px-8 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  View All {total.toLocaleString()} Listings
                </Link>
              </div>
            ) : totalPages > 1 ? (
              <Suspense fallback={null}>
                <Pagination currentPage={page} totalPages={totalPages} />
              </Suspense>
            ) : null}
          </>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">&#127968;</div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No listings available
            </h3>
            <p className="text-slate-500 mb-6">
              Check back soon for the latest properties.
            </p>
          </div>
        )}
      </div>

      {/* CTA Section */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-bold text-white mb-2">
                Ready to find your perfect home?
              </h3>
              <p className="text-blue-100">
                Contact {settings.agentName} for personalized assistance with your home search.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <a
                href={`tel:${settings.agentPhone.replace(/[^0-9+]/g, "")}`}
                className="bg-white text-blue-600 font-semibold px-6 py-3 rounded-lg hover:bg-blue-50 transition-colors whitespace-nowrap"
              >
                Call {settings.agentPhone}
              </a>
              <a
                href={`mailto:${settings.agentEmail}`}
                className="border-2 border-white text-white font-semibold px-6 py-3 rounded-lg hover:bg-white/10 transition-colors whitespace-nowrap"
              >
                Send Email
              </a>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
