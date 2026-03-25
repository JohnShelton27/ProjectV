import { supabase } from "./supabase";

export interface SiteSettings {
  siteName: string;
  siteDescription: string;
  agentName: string;
  agentTitle: string;
  agentBrokerage: string;
  agentPhone: string;
  agentEmail: string;
  agentLicense: string;
}

const DEFAULTS: SiteSettings = {
  siteName: "Ventura County Real Estate",
  siteDescription: "Browse real estate listings in Ventura County, California",
  agentName: "Your Name",
  agentTitle: "Licensed Real Estate Agent",
  agentBrokerage: "Your Brokerage",
  agentPhone: "(805) 555-0100",
  agentEmail: "agent@example.com",
  agentLicense: "DRE# 0000000",
};

const KEY_MAP: Record<string, keyof SiteSettings> = {
  site_name: "siteName",
  site_description: "siteDescription",
  agent_name: "agentName",
  agent_title: "agentTitle",
  agent_brokerage: "agentBrokerage",
  agent_phone: "agentPhone",
  agent_email: "agentEmail",
  agent_license: "agentLicense",
};

export async function getSettings(): Promise<SiteSettings> {
  const { data } = await supabase.from("site_settings").select("key, value");

  const settings = { ...DEFAULTS };
  if (data) {
    for (const row of data) {
      const field = KEY_MAP[row.key];
      if (field) {
        settings[field] = row.value;
      }
    }
  }
  return settings;
}
