import Link from "next/link";
import type { Listing } from "@/types/listing";
import { formatPrice, getStatusColor } from "@/lib/format";

export default function ListingCard({ listing }: { listing: Listing }) {
  const placeholderImg =
    "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='300' fill='%23e2e8f0'%3E%3Crect width='400' height='300'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='sans-serif' font-size='18' fill='%2394a3b8'%3ENo Image%3C/text%3E%3C/svg%3E";

  return (
    <Link href={`/listing/${listing.slug}`} className="group">
      <div className="bg-white rounded-xl shadow-md overflow-hidden hover:shadow-xl transition-shadow duration-300">
        <div className="relative h-52 overflow-hidden">
          <img
            src={listing.images[0] || placeholderImg}
            alt={listing.address}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
          <div className="absolute top-3 left-3">
            <span
              className={`px-2.5 py-1 rounded-full text-xs font-semibold uppercase ${getStatusColor(listing.status)}`}
            >
              {listing.status}
            </span>
          </div>
        </div>
        <div className="p-4">
          <div className="flex items-center justify-between mb-1">
            <p className="text-2xl font-bold text-slate-900">
              {formatPrice(listing.price)}
            </p>
          </div>
          <p className="text-sm text-slate-600 mb-3 truncate">
            {listing.address}, {listing.city}, {listing.state} {listing.zip}
          </p>
          <div className="flex items-center gap-4 text-sm text-slate-500">
            {listing.bedrooms > 0 && (
              <span>
                <strong className="text-slate-700">{listing.bedrooms}</strong> bd
              </span>
            )}
            {listing.bathrooms > 0 && (
              <span>
                <strong className="text-slate-700">{listing.bathrooms}</strong> ba
              </span>
            )}
            {listing.sqft > 0 && (
              <span>
                <strong className="text-slate-700">
                  {listing.sqft.toLocaleString()}
                </strong>{" "}
                sqft
              </span>
            )}
            {listing.propertyType !== "Unknown" && (
              <span className="ml-auto text-xs bg-slate-100 px-2 py-0.5 rounded">
                {listing.propertyType}
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
