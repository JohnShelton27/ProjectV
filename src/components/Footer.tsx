import Link from "next/link";
import { getSettings } from "@/lib/settings";
import { getDistinctCities } from "@/lib/listings-store";

function cityToSlug(city: string): string {
  return city.toLowerCase().replace(/\s+/g, "-");
}

export default async function Footer() {
  const [settings, cities] = await Promise.all([
    getSettings(),
    getDistinctCities(),
  ]);

  return (
    <footer className="bg-slate-900 text-slate-400 py-10 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* City links for SEO */}
        {cities.length > 0 && (
          <div className="mb-8 pb-8 border-b border-slate-800">
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Homes for Sale by City
            </h4>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
              {cities.map((city) => (
                <Link
                  key={city}
                  href={`/homes-for-sale/${cityToSlug(city)}`}
                  className="hover:text-white transition-colors"
                >
                  {city}
                </Link>
              ))}
            </div>
          </div>
        )}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <div className="text-center sm:text-left">
            <p className="text-sm">
              &copy; {new Date().getFullYear()} {settings.siteName}. All rights reserved.
            </p>
            <p className="text-xs mt-1">
              {settings.agentName} &middot; {settings.agentBrokerage} &middot; {settings.agentLicense}
            </p>
          </div>
          <div className="text-center sm:text-right">
            <p className="text-xs">
              Information deemed reliable but not guaranteed.
            </p>
            <p className="text-xs mt-1">
              <a href={`mailto:${settings.agentEmail}`} className="hover:text-white">
                {settings.agentEmail}
              </a>
              {" "}&middot;{" "}
              <a href={`tel:${settings.agentPhone.replace(/[^0-9+]/g, "")}`} className="hover:text-white">
                {settings.agentPhone}
              </a>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
