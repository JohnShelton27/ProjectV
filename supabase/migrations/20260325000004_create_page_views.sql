CREATE TABLE IF NOT EXISTS page_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  path text NOT NULL,
  listing_slug text,
  referrer text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_page_views_created_at ON page_views (created_at);
CREATE INDEX idx_page_views_listing_slug ON page_views (listing_slug);
CREATE INDEX idx_page_views_path ON page_views (path);

ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage page_views"
  ON page_views
  FOR ALL
  USING (auth.role() = 'service_role');

-- Allow anon inserts for tracking
CREATE POLICY "Anon can insert page_views"
  ON page_views
  FOR INSERT
  WITH CHECK (true);
