import Link from "next/link";
import { SITE_CONFIG } from "@/lib/config";

export default function Header() {
  return (
    <header className="bg-slate-900 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center font-bold text-sm">
              VC
            </div>
            <div>
              <h1 className="text-lg font-semibold leading-tight">
                {SITE_CONFIG.name}
              </h1>
              <p className="text-xs text-slate-400">
                {SITE_CONFIG.county}, {SITE_CONFIG.state}
              </p>
            </div>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link href="/" className="hover:text-blue-400 transition-colors">
              Listings
            </Link>
            <Link href="/#about" className="hover:text-blue-400 transition-colors">
              About
            </Link>
          </nav>
        </div>
      </div>
    </header>
  );
}
