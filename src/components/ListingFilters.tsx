"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function ListingFilters({ cities = [] }: { cities?: string[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

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

  function clearFilters() {
    const sort = searchParams.get("sort");
    router.push(sort ? `/?sort=${sort}` : "/");
  }

  const selectClass =
    "border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white text-slate-700 shadow-sm hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors cursor-pointer";

  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 mb-8">
      <div className="flex flex-wrap items-center gap-3">
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
          className={selectClass}
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
            className="text-sm text-blue-600 hover:text-blue-800 font-medium px-3 py-2.5 hover:bg-blue-50 rounded-lg transition-colors"
          >
            Clear Filters
          </button>
        )}
      </div>
    </div>
  );
}
