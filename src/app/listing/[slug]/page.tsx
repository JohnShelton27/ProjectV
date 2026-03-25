import { notFound } from "next/navigation";
import Link from "next/link";
import { getListingBySlug, loadListings } from "@/lib/listings-store";
import { formatPrice, formatNumber, formatDate, getStatusColor } from "@/lib/format";

export const dynamic = "force-dynamic";

export async function generateStaticParams() {
  const listings = await loadListings();
  return listings.map((listing) => ({ slug: listing.slug }));
}

export default async function ListingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const listing = await getListingBySlug(slug);

  if (!listing) {
    notFound();
  }

  const placeholderImg =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='800' height='500' fill='%23e2e8f0'%3E%3Crect width='800' height='500'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='24' fill='%2394a3b8'%3ENo Image Available%3C/text%3E%3C/svg%3E";

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Back link */}
      <Link
        href="/"
        className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800 mb-6"
      >
        &larr; Back to listings
      </Link>

      {/* Image Gallery */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mb-8 rounded-xl overflow-hidden">
        <div className="md:row-span-2">
          <img
            src={listing.images[0] || placeholderImg}
            alt={listing.address}
            className="w-full h-full object-cover min-h-[300px]"
          />
        </div>
        {listing.images.slice(1, 3).map((img, i) => (
          <div key={i}>
            <img
              src={img}
              alt={`${listing.address} - ${i + 2}`}
              className="w-full h-[200px] object-cover"
            />
          </div>
        ))}
        {listing.images.length <= 1 && (
          <div className="bg-slate-200 flex items-center justify-center h-[200px]">
            <span className="text-slate-400">No additional photos</span>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main content */}
        <div className="lg:col-span-2 space-y-8">
          {/* Header */}
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span
                className={`px-3 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(listing.status)}`}
              >
                {listing.status}
              </span>
              <span className="text-xs text-slate-400 uppercase">
                via {listing.source}
              </span>
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

          {/* Description */}
          {listing.description && (
            <div>
              <h2 className="text-xl font-semibold mb-3">About this property</h2>
              <p className="text-slate-600 leading-relaxed whitespace-pre-line">
                {listing.description}
              </p>
            </div>
          )}

          {/* Features */}
          {listing.features.length > 0 && (
            <div>
              <h2 className="text-xl font-semibold mb-3">Features</h2>
              <div className="flex flex-wrap gap-2">
                {listing.features.map((feature, i) => (
                  <span
                    key={i}
                    className="bg-slate-100 text-slate-700 px-3 py-1 rounded-full text-sm"
                  >
                    {feature}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Property details card */}
          <div className="bg-white rounded-xl shadow-md p-6 space-y-4">
            <h3 className="font-semibold text-lg">Property Details</h3>
            <DetailRow label="Property Type" value={listing.propertyType} />
            <DetailRow label="Lot Size" value={listing.lotSize} />
            <DetailRow label="County" value={listing.county} />
            <DetailRow label="Listed" value={formatDate(listing.listingDate)} />
            {listing.taxInfo && (
              <>
                <DetailRow
                  label="Annual Tax"
                  value={formatPrice(listing.taxInfo.annualTax)}
                />
                <DetailRow
                  label="Assessed Value"
                  value={formatPrice(listing.taxInfo.assessedValue)}
                />
              </>
            )}
          </div>

          {/* Source link */}
          {listing.sourceUrl && (
            <a
              href={listing.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-center bg-slate-900 text-white py-3 rounded-lg hover:bg-slate-800 transition-colors"
            >
              View Original Listing
            </a>
          )}
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
