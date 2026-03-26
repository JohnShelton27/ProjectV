import type { Metadata } from "next";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { getSettings } from "@/lib/settings";
import { getDistinctCities } from "@/lib/listings-store";
import { formatPrice } from "@/lib/format";
import ListingCard from "@/components/ListingCard";

export const dynamic = "force-dynamic";

function slugToCity(slug: string): string {
  return slug
    .split("-")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function cityToSlug(city: string): string {
  return city.toLowerCase().replace(/\s+/g, "-");
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ city: string }>;
}): Promise<Metadata> {
  const { city: slug } = await params;
  const cityName = slugToCity(slug);
  const settings = await getSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

  const { count } = await supabase
    .from("listings")
    .select("*", { count: "exact", head: true })
    .ilike("city", cityName);

  const title = `Homes for Sale in ${cityName}, CA`;
  const description = `Browse ${count || 0} homes for sale in ${cityName}, California. Find houses, condos, and properties with ${settings.agentName} at ${settings.agentBrokerage}.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${siteUrl}/homes-for-sale/${slug}`,
      type: "website",
    },
    alternates: {
      canonical: `${siteUrl}/homes-for-sale/${slug}`,
    },
  };
}

export default async function CityPage({
  params,
  searchParams,
}: {
  params: Promise<{ city: string }>;
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { city: slug } = await params;
  const sp = await searchParams;
  const cityName = slugToCity(slug);
  const settings = await getSettings();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

  const sort = sp.sort || "price-desc";

  // Get listings for this city
  let query = supabase.from("listings").select("*").ilike("city", cityName);

  switch (sort) {
    case "price-asc":
      query = query.order("price", { ascending: true });
      break;
    case "price-desc":
      query = query.order("price", { ascending: false });
      break;
    case "newest":
      query = query.order("listing_date", { ascending: false });
      break;
    case "beds-desc":
      query = query.order("bedrooms", { ascending: false });
      break;
    case "sqft-desc":
      query = query.order("sqft", { ascending: false });
      break;
    default:
      query = query.order("price", { ascending: false });
  }

  const { data, error } = await query;
  const listings = data || [];

  // Stats for the city
  const activeCount = listings.filter((l) => l.status === "active").length;
  const avgPrice =
    activeCount > 0
      ? listings
          .filter((l) => l.status === "active")
          .reduce((sum, l) => sum + l.price, 0) / activeCount
      : 0;
  const minPrice =
    activeCount > 0
      ? Math.min(...listings.filter((l) => l.status === "active").map((l) => l.price))
      : 0;
  const maxPrice =
    activeCount > 0
      ? Math.max(...listings.filter((l) => l.status === "active").map((l) => l.price))
      : 0;

  // Get all cities for "Browse other cities" section
  const allCities = await getDistinctCities();
  const otherCities = allCities.filter(
    (c) => c.toLowerCase() !== cityName.toLowerCase()
  );

  // JSON-LD
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Homes for Sale in ${cityName}, CA`,
    description: `Browse ${listings.length} homes for sale in ${cityName}, California.`,
    url: `${siteUrl}/homes-for-sale/${slug}`,
    breadcrumb: {
      "@type": "BreadcrumbList",
      itemListElement: [
        {
          "@type": "ListItem",
          position: 1,
          name: "Home",
          item: siteUrl,
        },
        {
          "@type": "ListItem",
          position: 2,
          name: `${cityName} Homes`,
          item: `${siteUrl}/homes-for-sale/${slug}`,
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
          {/* Breadcrumb */}
          <nav className="text-sm text-slate-400 mb-4">
            <Link href="/" className="hover:text-white transition-colors">
              Home
            </Link>
            <span className="mx-2">/</span>
            <Link
              href="/homes-for-sale"
              className="hover:text-white transition-colors"
            >
              Cities
            </Link>
            <span className="mx-2">/</span>
            <span className="text-white">{cityName}</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3">
            Homes for Sale in{" "}
            <span className="bg-gradient-to-r from-blue-400 to-cyan-300 bg-clip-text text-transparent">
              {cityName}, CA
            </span>
          </h1>
          <p className="text-lg text-slate-300 mb-6 max-w-2xl">
            Browse {listings.length} properties available in {cityName},
            California. Contact {settings.agentName} for showings and more
            information.
          </p>

          {/* Quick stats */}
          {activeCount > 0 && (
            <div className="flex flex-wrap gap-6 text-sm">
              <div>
                <span className="text-slate-400">Active Listings</span>
                <p className="text-xl font-bold">{activeCount}</p>
              </div>
              <div>
                <span className="text-slate-400">Avg. Price</span>
                <p className="text-xl font-bold">{formatPrice(avgPrice)}</p>
              </div>
              <div>
                <span className="text-slate-400">Price Range</span>
                <p className="text-xl font-bold">
                  {formatPrice(minPrice)} – {formatPrice(maxPrice)}
                </p>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Listings */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Sort bar */}
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-slate-500">
            {listings.length} {listings.length === 1 ? "property" : "properties"} found
          </p>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-slate-400">Sort:</span>
            {[
              { value: "price-desc", label: "Price ↓" },
              { value: "price-asc", label: "Price ↑" },
              { value: "newest", label: "Newest" },
              { value: "beds-desc", label: "Beds" },
              { value: "sqft-desc", label: "Sq Ft" },
            ].map((opt) => (
              <Link
                key={opt.value}
                href={`/homes-for-sale/${slug}?sort=${opt.value}`}
                className={`px-3 py-1 rounded-full transition-colors ${
                  sort === opt.value
                    ? "bg-blue-100 text-blue-700 font-medium"
                    : "text-slate-500 hover:bg-slate-100"
                }`}
              >
                {opt.label}
              </Link>
            ))}
          </div>
        </div>

        {listings.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {listings.map((row) => (
              <ListingCard
                key={row.id}
                listing={{
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
                }}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="text-5xl mb-4">&#127968;</div>
            <h3 className="text-xl font-semibold text-slate-700 mb-2">
              No listings in {cityName}
            </h3>
            <p className="text-slate-500 mb-6">
              Check back soon or browse other cities below.
            </p>
          </div>
        )}
      </div>

      {/* Browse other cities */}
      {otherCities.length > 0 && (
        <section className="bg-slate-50 border-t border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Browse Other Cities in Ventura County
            </h2>
            <div className="flex flex-wrap gap-2">
              {otherCities.map((city) => (
                <Link
                  key={city}
                  href={`/homes-for-sale/${cityToSlug(city)}`}
                  className="px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 hover:border-blue-300 hover:text-blue-600 transition-colors"
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="bg-gradient-to-r from-blue-600 to-blue-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="text-center sm:text-left">
              <h3 className="text-2xl font-bold text-white mb-2">
                Looking for a home in {cityName}?
              </h3>
              <p className="text-blue-100">
                Contact {settings.agentName} for expert guidance on {cityName}{" "}
                real estate.
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
