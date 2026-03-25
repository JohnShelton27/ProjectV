"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

export default function ListingFilters() {
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
      router.push(`/?${params.toString()}`);
    },
    [router, searchParams]
  );

  return (
    <div className="flex flex-wrap gap-3 mb-8">
      <select
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
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
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        value={searchParams.get("baths") || ""}
        onChange={(e) => updateFilter("baths", e.target.value)}
      >
        <option value="">Baths</option>
        <option value="1">1+</option>
        <option value="2">2+</option>
        <option value="3">3+</option>
      </select>
      <select
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
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
        className="border border-slate-300 rounded-lg px-3 py-2 text-sm bg-white"
        value={searchParams.get("status") || ""}
        onChange={(e) => updateFilter("status", e.target.value)}
      >
        <option value="">Status</option>
        <option value="active">Active</option>
        <option value="pending">Pending</option>
        <option value="sold">Sold</option>
      </select>
    </div>
  );
}
