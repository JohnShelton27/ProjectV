import { getSettings } from "@/lib/settings";
import Header from "./Header";

export default async function HeaderWrapper() {
  const settings = await getSettings();
  return (
    <Header
      siteName={settings.siteName}
      agentName={settings.agentName}
      agentPhone={settings.agentPhone}
      agentLicense={settings.agentLicense}
    />
  );
}
