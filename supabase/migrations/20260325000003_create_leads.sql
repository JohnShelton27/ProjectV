CREATE TABLE IF NOT EXISTS leads (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  message text NOT NULL,
  listing_address text,
  created_at timestamptz DEFAULT now()
);

-- Allow service role full access
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage leads"
  ON leads
  FOR ALL
  USING (auth.role() = 'service_role');
