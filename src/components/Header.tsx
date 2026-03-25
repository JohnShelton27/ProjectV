import Link from "next/link";
import { getSettings } from "@/lib/settings";

export default async function Header() {
  const settings = await getSettings();

  return (
    <header className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">
              {settings.siteName.split(" ").map((w) => w[0]).join("").slice(0, 2)}
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                {settings.siteName}
              </h1>
              <p className="text-xs text-slate-400">
                {settings.agentName} &middot; {settings.agentLicense}
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="hover:text-blue-400 transition-colors">
              Listings
            </Link>
            <a
              href={`tel:${settings.agentPhone.replace(/[^0-9+]/g, "")}`}
              className="hover:text-blue-400 transition-colors"
            >
              {settings.agentPhone}
            </a>
          </nav>
        </div>
      </div>
    </header>
  );
}
