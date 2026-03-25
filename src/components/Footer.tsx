import { getSettings } from "@/lib/settings";

export default async function Footer() {
  const settings = await getSettings();

  return (
    <footer className="bg-slate-900 text-slate-400 py-8 mt-16">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
