CREATE TABLE IF NOT EXISTS site_settings (
  key text PRIMARY KEY,
  value text NOT NULL
);

ALTER TABLE site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read settings"
  ON site_settings FOR SELECT
  USING (true);

CREATE POLICY "Service role can manage settings"
  ON site_settings FOR ALL
  USING (auth.role() = 'service_role');

-- Seed defaults
INSERT INTO site_settings (key, value) VALUES
  ('site_name', 'Ventura County Real Estate'),
  ('site_description', 'Browse real estate listings in Ventura County, California'),
  ('agent_name', 'Your Name'),
  ('agent_title', 'Licensed Real Estate Agent'),
  ('agent_brokerage', 'Your Brokerage'),
  ('agent_phone', '(805) 555-0100'),
  ('agent_email', 'agent@example.com'),
  ('agent_license', 'DRE# 0000000')
ON CONFLICT (key) DO NOTHING;
