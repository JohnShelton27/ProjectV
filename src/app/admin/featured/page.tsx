"use client";

import { useState, useEffect } from "react";

interface ListingRow {
  id: string;
  slug: string;
  address: string;
  city: string;
  price: number;
  status: string;
  images: string[];
  featured: boolean;
}

export default function AdminFeatured() {
  const [featured, setFeatured] = useState<ListingRow[]>([]);
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<ListingRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadFeatured();
  }, []);

  async function loadFeatured() {
    const res = await fetch("/api/admin/featured");
    const data = await res.json();
    setFeatured(data);
    setLoading(false);
  }

  async function handleSearch() {
    if (!search.trim()) return;
    setSearching(true);
    const res = await fetch(`/api/admin/featured/search?q=${encodeURIComponent(search.trim())}`);
    const data = await res.json();
    setResults(data);
    setSearching(false);
  }

  async function toggleFeatured(id: string, makeFeatured: boolean) {
    setSaving(id);
    await fetch("/api/admin/featured", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, featured: makeFeatured }),
    });
    await loadFeatured();
    setResults((prev) =>
      prev.map((r) => (r.id === id ? { ...r, featured: makeFeatured } : r))
    );
    setSaving(null);
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Featured Listings</h1>
        <p className="text-sm text-slate-500 mt-1">
          Choose up to 6 listings to feature on the homepage. Featured listings appear in the hero section.
        </p>
      </div>

      {/* Current Featured */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Currently Featured ({featured.length})
        </h2>
        {loading ? (
          <div className="text-slate-500">Loading...</div>
        ) : featured.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {featured.map((listing) => (
              <div
                key={listing.id}
                className="bg-white rounded-xl shadow-sm border-2 border-blue-500 overflow-hidden"
              >
                <div className="h-36 overflow-hidden bg-slate-100">
                  {listing.images?.[0] ? (
                    <img
                      src={listing.images[0]}
                      alt={listing.address}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-slate-400">
                      No Image
                    </div>
                  )}
                </div>
                <div className="p-4">
                  <p className="font-semibold text-slate-900 truncate">
                    {listing.address}
                  </p>
                  <p className="text-sm text-slate-500">
                    {listing.city} &middot; ${listing.price.toLocaleString()}
                  </p>
                  <button
                    onClick={() => toggleFeatured(listing.id, false)}
                    disabled={saving === listing.id}
                    className="mt-3 w-full text-sm text-red-600 hover:text-red-700 hover:bg-red-50 border border-red-200 rounded-lg px-3 py-2 transition-colors disabled:opacity-50"
                  >
                    {saving === listing.id ? "Removing..." : "Remove from Featured"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-500">
            No featured listings yet. Search below to add some.
          </div>
        )}
      </div>

      {/* Search to Add */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Add Featured Listings
        </h2>
        <div className="flex gap-3 mb-4">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            placeholder="Search by address or city..."
            className="flex-1 border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button
            onClick={handleSearch}
            disabled={searching || !search.trim()}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-medium px-6 py-2.5 rounded-lg transition-colors"
          >
            {searching ? "Searching..." : "Search"}
          </button>
        </div>

        {results.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium text-slate-600">Image</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Address</th>
                  <th className="px-4 py-3 font-medium text-slate-600">City</th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-right">Price</th>
                  <th className="px-4 py-3 font-medium text-slate-600">Status</th>
                  <th className="px-4 py-3 font-medium text-slate-600 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {results.map((listing) => {
                  const isFeatured = featured.some((f) => f.id === listing.id) || listing.featured;
                  return (
                    <tr key={listing.id}>
                      <td className="px-4 py-3">
                        <div className="w-16 h-12 rounded overflow-hidden bg-slate-100">
                          {listing.images?.[0] ? (
                            <img
                              src={listing.images[0]}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                              N/A
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {listing.address}
                      </td>
                      <td className="px-4 py-3 text-slate-600">{listing.city}</td>
                      <td className="px-4 py-3 text-right text-slate-700">
                        ${listing.price.toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          listing.status === "active"
                            ? "bg-green-100 text-green-700"
                            : listing.status === "pending"
                            ? "bg-yellow-100 text-yellow-700"
                            : "bg-red-100 text-red-700"
                        }`}>
                          {listing.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        {isFeatured ? (
                          <span className="text-xs text-blue-600 font-medium">Featured</span>
                        ) : (
                          <button
                            onClick={() => toggleFeatured(listing.id, true)}
                            disabled={saving === listing.id}
                            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
                          >
                            {saving === listing.id ? "Adding..." : "+ Feature"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
