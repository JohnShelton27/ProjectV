import { SITE_CONFIG } from "@/lib/config";

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-400 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            &copy; {new Date().getFullYear()} {SITE_CONFIG.name}. All rights
            reserved.
          </p>
          <p className="text-xs">
            Information deemed reliable but not guaranteed.
          </p>
        </div>
      </div>
    </footer>
  );
}
