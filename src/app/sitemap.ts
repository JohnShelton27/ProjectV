import type { MetadataRoute } from "next";
import { supabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://example.com";

  const { data } = await supabase
    .from("listings")
    .select("slug, listing_date, status")
    .order("listing_date", { ascending: false });

  const listingUrls: MetadataRoute.Sitemap = (data || []).map((row) => ({
    url: `${siteUrl}/listing/${row.slug}`,
    lastModified: row.listing_date ? new Date(row.listing_date) : new Date(),
    changeFrequency: row.status === "active" ? "daily" : "weekly",
    priority: row.status === "active" ? 0.8 : 0.5,
  }));

  return [
    {
      url: siteUrl,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 1.0,
    },
    ...listingUrls,
  ];
}
