import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminDashboard() {
  // --- Stats ---
  const { count: totalListings } = await supabaseAdmin
    .from("listings")
    .select("*", { count: "exact", head: true });

  const { count: activeListings } = await supabaseAdmin
    .from("listings")
    .select("*", { count: "exact", head: true })
    .eq("status", "active");

  const { count: totalLeads } = await supabaseAdmin
    .from("leads")
    .select("*", { count: "exact", head: true });

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const { count: recentLeads } = await supabaseAdmin
    .from("leads")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);

  // --- Page views ---
  const { count: totalViews } = await supabaseAdmin
    .from("page_views")
    .select("*", { count: "exact", head: true });

  const { count: todayViews } = await supabaseAdmin
    .from("page_views")
    .select("*", { count: "exact", head: true })
    .gte("created_at", twentyFourHoursAgo);

  const { count: weekViews } = await supabaseAdmin
    .from("page_views")
    .select("*", { count: "exact", head: true })
    .gte("created_at", sevenDaysAgo);

  const { count: monthViews } = await supabaseAdmin
    .from("page_views")
    .select("*", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo);

  // --- Views per day (last 14 days) ---
  const { data: recentViews } = await supabaseAdmin
    .from("page_views")
    .select("created_at")
    .gte("created_at", new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000).toISOString())
    .order("created_at", { ascending: true });

  const viewsByDay: Record<string, number> = {};
  for (let i = 13; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    viewsByDay[d.toISOString().slice(0, 10)] = 0;
  }
  (recentViews || []).forEach((v) => {
    const day = new Date(v.created_at).toISOString().slice(0, 10);
    if (viewsByDay[day] !== undefined) viewsByDay[day]++;
  });
  const maxDayViews = Math.max(...Object.values(viewsByDay), 1);

  // --- Top referrers (last 30 days) ---
  const { data: referrerData } = await supabaseAdmin
    .from("page_views")
    .select("referrer")
    .gte("created_at", thirtyDaysAgo)
    .not("referrer", "is", null)
    .not("referrer", "eq", "");

  const referrerCounts: Record<string, number> = {};
  (referrerData || []).forEach((r) => {
    let domain = "Direct";
    try {
      domain = new URL(r.referrer).hostname;
    } catch {
      if (r.referrer) domain = r.referrer;
    }
    referrerCounts[domain] = (referrerCounts[domain] || 0) + 1;
  });
  const topReferrers = Object.entries(referrerCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  // Direct visits (no referrer)
  const { count: directCount } = await supabaseAdmin
    .from("page_views")
    .select("*", { count: "exact", head: true })
    .gte("created_at", thirtyDaysAgo)
    .or("referrer.is.null,referrer.eq.");

  // --- Top 25 listings by view count ---
  const { data: listingViews } = await supabaseAdmin
    .from("page_views")
    .select("listing_slug")
    .not("listing_slug", "is", null);

  const slugCounts: Record<string, number> = {};
  (listingViews || []).forEach((v) => {
    if (v.listing_slug) {
      slugCounts[v.listing_slug] = (slugCounts[v.listing_slug] || 0) + 1;
    }
  });
  const topSlugs = Object.entries(slugCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 25);

  // Fetch listing details for top slugs
  let topListings: { slug: string; address: string; city: string; price: number; views: number }[] = [];
  if (topSlugs.length > 0) {
    const { data: listings } = await supabaseAdmin
      .from("listings")
      .select("slug, address, city, price")
      .in("slug", topSlugs.map(([s]) => s));

    const listingMap = new Map((listings || []).map((l) => [l.slug, l]));
    topListings = topSlugs.map(([slug, views]) => {
      const l = listingMap.get(slug);
      return {
        slug,
        address: l?.address || slug,
        city: l?.city || "",
        price: l?.price || 0,
        views,
      };
    });
  }

  // --- All leads ---
  const { data: allLeads } = await supabaseAdmin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-10">
      <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>

      {/* New Leads — top priority */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          New Leads ({allLeads?.length ?? 0})
        </h2>
        {allLeads && allLeads.length > 0 ? (
          <div className="space-y-4">
            {allLeads.map((lead) => (
              <div
                key={lead.id}
                className="bg-white rounded-xl shadow-sm p-5 space-y-3 border-l-4 border-blue-500"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-slate-900">{lead.name}</h3>
                    <div className="flex items-center gap-3 text-sm text-slate-500 mt-0.5">
                      <a
                        href={`mailto:${lead.email}`}
                        className="text-blue-600 hover:underline"
                      >
                        {lead.email}
                      </a>
                      {lead.phone && (
                        <>
                          <span>&middot;</span>
                          <a
                            href={`tel:${lead.phone}`}
                            className="text-blue-600 hover:underline"
                          >
                            {lead.phone}
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <span className="text-xs text-slate-400 whitespace-nowrap">
                    {new Date(lead.created_at).toLocaleString()}
                  </span>
                </div>

                {lead.listing_address && (
                  <p className="text-sm text-slate-500">
                    Property:{" "}
                    <span className="text-slate-700 font-medium">
                      {lead.listing_address}
                    </span>
                  </p>
                )}

                <div className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3 whitespace-pre-line">
                  {lead.message}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-500">
            No leads yet. They&apos;ll appear here when visitors submit the contact form.
          </div>
        )}
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Listings" value={totalListings ?? 0} />
        <StatCard label="Active Listings" value={activeListings ?? 0} />
        <StatCard label="Total Leads" value={totalLeads ?? 0} />
        <StatCard label="Leads (7 days)" value={recentLeads ?? 0} />
      </div>

      {/* Traffic stats */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Traffic</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard label="Today" value={todayViews ?? 0} />
          <StatCard label="This Week" value={weekViews ?? 0} />
          <StatCard label="This Month" value={monthViews ?? 0} />
          <StatCard label="All Time" value={totalViews ?? 0} />
        </div>

        {/* Bar chart */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="text-sm font-medium text-slate-600 mb-4">Page Views (Last 14 Days)</h3>
          <div className="flex items-end gap-1 h-32">
            {Object.entries(viewsByDay).map(([day, count]) => (
              <div key={day} className="flex-1 flex flex-col items-center gap-1">
                <span className="text-[10px] text-slate-400">
                  {count > 0 ? count : ""}
                </span>
                <div
                  className="w-full bg-blue-500 rounded-t min-h-[2px]"
                  style={{ height: `${(count / maxDayViews) * 100}%` }}
                />
                <span className="text-[9px] text-slate-400 -rotate-45 origin-top-left mt-1 whitespace-nowrap">
                  {day.slice(5)}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Referrers */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Top Referrers (30 days)
        </h2>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600">Source</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Visits</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {(directCount ?? 0) > 0 && (
                <tr>
                  <td className="px-4 py-3 text-slate-700">Direct / None</td>
                  <td className="px-4 py-3 text-right font-medium">{directCount}</td>
                </tr>
              )}
              {topReferrers.map(([domain, count]) => (
                <tr key={domain}>
                  <td className="px-4 py-3 text-slate-700">{domain}</td>
                  <td className="px-4 py-3 text-right font-medium">{count}</td>
                </tr>
              ))}
              {topReferrers.length === 0 && !directCount && (
                <tr>
                  <td colSpan={2} className="px-4 py-6 text-center text-slate-400">
                    No traffic data yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Top 25 listings */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 mb-4">
          Top 25 Listings by Views
        </h2>
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="px-4 py-3 font-medium text-slate-600 w-8">#</th>
                <th className="px-4 py-3 font-medium text-slate-600">Address</th>
                <th className="px-4 py-3 font-medium text-slate-600">City</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Price</th>
                <th className="px-4 py-3 font-medium text-slate-600 text-right">Views</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {topListings.length > 0 ? (
                topListings.map((listing, i) => (
                  <tr key={listing.slug}>
                    <td className="px-4 py-3 text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3">
                      <a
                        href={`/listing/${listing.slug}`}
                        className="text-blue-600 hover:underline font-medium"
                      >
                        {listing.address}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{listing.city}</td>
                    <td className="px-4 py-3 text-right text-slate-700">
                      {listing.price > 0 ? `$${listing.price.toLocaleString()}` : "—"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold">{listing.views}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No listing views yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5">
      <p className="text-3xl font-bold text-slate-900">{value.toLocaleString()}</p>
      <p className="text-sm text-slate-500 mt-1">{label}</p>
    </div>
  );
}
