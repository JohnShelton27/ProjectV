"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function ListingFilters({ cities = [] }: { cities?: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const updateFilter = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.delete("page");
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  const hasActiveFilters =
    searchParams.get("city") ||
    searchParams.get("beds") ||
    searchParams.get("baths") ||
    searchParams.get("maxPrice") ||
    searchParams.get("status");

  const activeCount = [
    searchParams.get("city"),
    searchParams.get("beds"),
    searchParams.get("baths"),
    searchParams.get("maxPrice"),
    searchParams.get("status"),
  ].filter(Boolean).length;

  function clearFilters() {
    const sort = searchParams.get("sort");
    router.push(sort ? `/?sort=${sort}` : "/");
  }

  const selectClass =
    "w-full sm:w-auto border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors cursor-pointer";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 mb-8">
      {/* Mobile toggle */}
      <button
        onClick={() => setFiltersOpen(!filtersOpen)}
        className="sm:hidden w-full flex items-center justify-between px-4 py-3"
      >
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-slate-500" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h9.75M10.5 6a1.5 1.5 0 11-3 0m3 0a1.5 1.5 0 10-3 0M3.75 6H7.5m3 12h9.75m-9.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-3.75 0H7.5m9-6h3.75m-3.75 0a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m-9.75 0h9.75" />
          </svg>
          <span className="text-sm font-medium text-slate-700">
            Filters{activeCount > 0 ? ` (${activeCount})` : ""}
          </span>
        </div>
        <svg
          className={`w-5 h-5 text-slate-400 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>

      {/* Filter controls — always visible on sm+, toggled on mobile */}
      <div className={`${filtersOpen ? "block" : "hidden"} sm:block p-4 sm:pt-4 pt-0`}>
        <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-3">
          <select
            className={selectClass}
            value={searchParams.get("city") || ""}
            onChange={(e) => updateFilter("city", e.target.value)}
          >
            <option value="">All Cities</option>
            {cities.map((city) => (
              <option key={city} value={city}>
                {city}
              </option>
            ))}
          </select>
          <select
            className={selectClass}
            value={searchParams.get("beds") || ""}
            onChange={(e) => updateFilter("beds", e.target.value)}
          >
            <option value="">Beds</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
            <option value="4">4+</option>
          </select>
          <select
            className={selectClass}
            value={searchParams.get("baths") || ""}
            onChange={(e) => updateFilter("baths", e.target.value)}
          >
            <option value="">Baths</option>
            <option value="1">1+</option>
            <option value="2">2+</option>
            <option value="3">3+</option>
          </select>
          <select
            className={selectClass}
            value={searchParams.get("maxPrice") || ""}
            onChange={(e) => updateFilter("maxPrice", e.target.value)}
          >
            <option value="">Max Price</option>
            <option value="500000">$500K</option>
            <option value="750000">$750K</option>
            <option value="1000000">$1M</option>
            <option value="1500000">$1.5M</option>
            <option value="2000000">$2M</option>
          </select>
          <select
            className={selectClass}
            value={searchParams.get("status") || ""}
            onChange={(e) => updateFilter("status", e.target.value)}
          >
            <option value="">Status</option>
            <option value="active">Active</option>
            <option value="pending">Pending</option>
            <option value="sold">Sold</option>
          </select>

          <div className="border-l border-slate-200 h-8 mx-1 hidden sm:block" />

          <select
            className={`${selectClass} col-span-2 sm:col-span-1`}
            value={searchParams.get("sort") || ""}
            onChange={(e) => updateFilter("sort", e.target.value)}
          >
            <option value="">Sort By</option>
            <option value="price-asc">Price: Low to High</option>
            <option value="price-desc">Price: High to Low</option>
            <option value="newest">Newest</option>
            <option value="beds-desc">Most Beds</option>
            <option value="sqft-desc">Largest</option>
          </select>

          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="col-span-2 sm:col-span-1 text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-colors"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
