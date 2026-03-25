import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { getListingBySlug, loadListings } from "@/lib/listings-store";
import { formatPrice, formatNumber, formatDate, getStatusColor } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import ImageGallery from "@/components/ImageGallery";
import ContactForm from "@/components/ContactForm";
import MortgageCalculator from "@/components/MortgageCalculator";
import ShareButtons from "@/components/ShareButtons";
import PageTracker from "@/components/PageTracker";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const { listings } = await loadListings();
  return listings.map((listing) => ({ slug: listing.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const [listing, settings] = await Promise.all([
    getListingBySlug(slug),
    getSettings(),
  ]);

  if (!listing) return { title: "Listing Not Found" };

  const title = `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip} - ${formatPrice(listing.price)}`;
  const description = `${listing.bedrooms} bed, ${listing.bathrooms} bath, ${listing.sqft > 0 ? `${formatNumber(listing.sqft)} sqft` : ""} ${listing.propertyType} for sale in ${listing.city}, ${listing.state}. Listed at ${formatPrice(listing.price)}. Contact ${settings.agentName} for details.`.replace(/  +/g, " ");
  const image = listing.images?.[0];

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      ...(image ? { images: [{ url: image, width: 1200, height: 630, alt: listing.address }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const [listing, settings] = await Promise.all([
    getListingBySlug(slug),
    getSettings(),
  ]);

  if (!listing) {
    notFound();
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: `${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`,
    description: listing.description || `${listing.propertyType} for sale in ${listing.city}`,
    url: `/listing/${slug}`,
    ...(listing.images?.[0] ? { image: listing.images[0] } : {}),
    offers: {
      "@type": "Offer",
      price: listing.price,
      priceCurrency: "USD",
      availability: listing.status === "active" ? "https://schema.org/InStock" : "https://schema.org/SoldOut",
    },
    address: {
      "@type": "PostalAddress",
      streetAddress: listing.address,
      addressLocality: listing.city,
      addressRegion: listing.state,
      postalCode: listing.zip,
      addressCountry: "US",
    },
    floorSize: listing.sqft > 0 ? {
      "@type": "QuantitativeValue",
      value: listing.sqft,
      unitCode: "FTK",
    } : undefined,
    numberOfRooms: listing.bedrooms,
    numberOfBathroomsTotal: listing.bathrooms,
    datePosted: listing.listingDate,
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <PageTracker listingSlug={slug} />
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-6"
      >
        &larr; Back to listings
      </Link>

      {/* Image Gallery */}
      <ImageGallery images={listing.images} alt={listing.address} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <span
                  className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(listing.status)}`}
                >
                  {listing.status}
                </span>
                <span className="text-sm text-slate-400">
                  Added {formatDate(listing.listingDate)}
                </span>
              </div>
              <ShareButtons
                slug={slug}
                address={`${listing.address}, ${listing.city}`}
                price={formatPrice(listing.price)}
              />
            </div>
            <h1 className="text-3xl font-bold text-slate-900 mb-1">
              {formatPrice(listing.price)}
            </h1>
            <p className="text-lg text-slate-600">
              {listing.address}
            </p>
            <p className="text-slate-500">
              {listing.city}, {listing.state} {listing.zip}
            </p>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatBox label="Bedrooms" value={listing.bedrooms.toString()} />
            <StatBox label="Bathrooms" value={listing.bathrooms.toString()} />
            <StatBox
              label="Sq Ft"
              value={listing.sqft > 0 ? formatNumber(listing.sqft) : "N/A"}
            />
            <StatBox
              label="Year Built"
              value={listing.yearBuilt > 0 ? listing.yearBuilt.toString() : "N/A"}
            />
          </div>

          {/* Price highlights */}
          {listing.sqft > 0 && (
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex flex-wrap gap-6">
              <div>
                <p className="text-xs text-blue-600 font-medium">Price per Sq Ft</p>
                <p className="text-lg font-bold text-blue-900">
                  {formatPrice(Math.round(listing.price / listing.sqft))}
                </p>
              </div>
              {listing.lotSize && listing.lotSize !== "N/A" && (
                <div>
                  <p className="text-xs text-blue-600 font-medium">Lot Size</p>
                  <p className="text-lg font-bold text-blue-900">{listing.lotSize}</p>
                </div>
              )}
              {listing.propertyType && listing.propertyType !== "Unknown" && (
                <div>
                  <p className="text-xs text-blue-600 font-medium">Property Type</p>
                  <p className="text-lg font-bold text-blue-900">{listing.propertyType}</p>
                </div>
              )}
            </div>
          )}

          {/* Description */}
          {listing.description && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">About this property</h2>
              <div className="text-slate-600 leading-relaxed whitespace-pre-line">
                {listing.description}
              </div>
            </div>
          )}

          {/* Property Details Table */}
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-4">Property Details</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
              <DetailRow label="Property Type" value={listing.propertyType} />
              <DetailRow label="Bedrooms" value={listing.bedrooms.toString()} />
              <DetailRow label="Bathrooms" value={listing.bathrooms.toString()} />
              <DetailRow label="Sq Ft" value={listing.sqft > 0 ? formatNumber(listing.sqft) : "N/A"} />
              <DetailRow label="Lot Size" value={listing.lotSize} />
              <DetailRow label="Year Built" value={listing.yearBuilt > 0 ? listing.yearBuilt.toString() : "N/A"} />
              <DetailRow label="County" value={listing.county} />
              <DetailRow label="Added" value={formatDate(listing.listingDate)} />
              {listing.taxInfo && (
                <>
                  <DetailRow label="Annual Tax" value={formatPrice(listing.taxInfo.annualTax)} />
                  <DetailRow label="Assessed Value" value={formatPrice(listing.taxInfo.assessedValue)} />
                </>
              )}
            </div>
          </div>

          {/* Features */}
          {listing.features.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm p-6">
              <h2 className="text-xl font-semibold mb-4">Features & Amenities</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {listing.features.map((feature, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-slate-700">
                    <span className="text-blue-500 flex-shrink-0">&#10003;</span>
                    {feature}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Contact form */}
          <ContactForm
            listingAddress={`${listing.address}, ${listing.city}, ${listing.state} ${listing.zip}`}
            agentName={settings.agentName}
            agentPhone={settings.agentPhone}
            agentLicense={settings.agentLicense}
          />

          {/* Mortgage Calculator */}
          <MortgageCalculator price={listing.price} />
        </div>
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-4 text-center">
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="text-xs text-slate-500 mt-1">{label}</p>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium text-slate-700">{value}</span>
    </div>
  );
}
