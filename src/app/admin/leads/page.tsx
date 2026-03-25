import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function AdminLeads() {
  const { data: leads } = await supabaseAdmin
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">
          Leads ({leads?.length ?? 0})
        </h1>
      </div>

      {leads && leads.length > 0 ? (
        <div className="space-y-4">
          {leads.map((lead) => (
            <div
              key={lead.id}
              className="bg-white rounded-xl shadow-sm p-5 space-y-3"
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
                <span className="text-xs text-slate-400">
                  {new Date(lead.created_at).toLocaleString()}
                </span>
              </div>

              {lead.listing_address && (
                <p className="text-sm text-slate-500">
                  Property: <span className="text-slate-700">{lead.listing_address}</span>
                </p>
              )}

              <p className="text-sm text-slate-700 bg-slate-50 rounded-lg p-3">
                {lead.message}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-slate-500">
          No leads yet.
        </div>
      )}
    </div>
  );
}
