ALTER TABLE listings ADD COLUMN IF NOT EXISTS featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_listings_featured ON listings (featured) WHERE featured = true;
