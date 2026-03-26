import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { getDistinctCities } from "@/lib/listings-store";

export const dynamic = "force-dynamic";

function cityToSlug(city: string): string {
  return city.toLowerCase().replace(/\s+/g, "-");
}

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const title = "Browse Homes by City | Ventura County Real Estate";
  const description = `Explore homes for sale across Ventura County cities. Find your perfect property with ${settings.agentName} at ${settings.agentBrokerage}.`;

  return {
    title,
    description,
    openGraph: { title, description, url: `${siteUrl}/homes-for-sale`, type: "website" },
    alternates: { canonical: `${siteUrl}/homes-for-sale` },
  };
}

interface CityStats {
  city: string;
  count: number;
  avgPrice: number;
  minPrice: number;
  maxPrice: number;
}

export default async function CitiesIndexPage() {
  const settings = await getSettings();
  const cities = await getDistinctCities();

  // Get stats per city
  const { data: allListings } = await supabase
    .from("listings")
    .select("city, price, status")
    .eq("status", "active");

  const cityStatsMap = new Map<string, CityStats>();
  for (const row of allListings || []) {
    const normalized = row.city?.replace(/_\d+$/, "").trim();
    if (!normalized || !/^[A-Za-z]/.test(normalized)) continue;
    const key = normalized.toLowerCase();
    if (!cityStatsMap.has(key)) {
      cityStatsMap.set(key, {
        city: normalized,
        count: 0,
        avgPrice: 0,
        minPrice: Infinity,
        maxPrice: 0,
      });
    }
    const stats = cityStatsMap.get(key)!;
    stats.count++;
    stats.avgPrice += row.price;
    if (row.price < stats.minPrice) stats.minPrice = row.price;
    if (row.price > stats.maxPrice) stats.maxPrice = row.price;
  }

  const cityStats: CityStats[] = cities
    .map((city) => {
      const stats = cityStatsMap.get(city.toLowerCase());
      if (!stats || stats.count === 0) return null;
      return { ...stats, avgPrice: Math.round(stats.avgPrice / stats.count) };
    })
    .filter(Boolean) as CityStats[];

  cityStats.sort((a, b) => b.count - a.count);

  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(n);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "Ventura County Cities - Homes for Sale",
    url: `${siteUrl}/homes-for-sale`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: siteUrl },
        {
          "@type": "ListItem",
          position: 2,
          name: "Cities",
          item: `${siteUrl}/homes-for-sale`,
        },
      ],
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section className="bg-gradient-to-br from-slate-900 via-slate-800 to-blue-900 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
          <nav className="text-sm text-slate-400 mb-4">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <span className="text-white">Cities</span>
          </nav>
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Homes for Sale by City in{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              Ventura County
            </span>
          </h1>
          <p className="text-lg text-slate-300 max-w-2xl">
            Browse real estate listings across {cityStats.length} cities in
            Ventura County, California.
          </p>
        </div>
      </section>

      {/* City Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {cityStats.map((stats) => (
            <Link
              key={stats.city}
              href={`/homes-for-sale/${cityToSlug(stats.city)}`}
              className="group block bg-white border border-slate-200 rounded-xl p-5 hover:shadow-lg hover:border-blue-300 transition-all"
            >
              <h2 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors mb-1">
                {stats.city}, CA
              </h2>
              <p className="text-sm text-slate-500 mb-3">
                {stats.count} active {stats.count === 1 ? "listing" : "listings"}
              </p>
              <div className="flex items-center gap-4 text-xs text-slate-500">
                <div>
                  <span className="block text-slate-400">Avg. Price</span>
                  <span className="font-semibold text-slate-700">
                    {fmt(stats.avgPrice)}
                  </span>
                </div>
                <div>
                  <span className="block text-slate-400">Range</span>
                  <span className="font-semibold text-slate-700">
                    {fmt(stats.minPrice)} – {fmt(stats.maxPrice)}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {cityStats.length === 0 && (
          <div className="text-center py-20">
            <p className="text-slate-500">No active listings in any city right now.</p>
          </div>
        )}
      </div>

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-bold text-white mb-2">
                Need help finding a home?
              </h3>
              <p className="text-blue-100">
                Contact {settings.agentName} for expert guidance across Ventura County.
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
