create table listings (
  id text primary key,
  slug text unique not null,
  address text not null,
  city text not null,
  state text not null,
  zip text not null,
  county text not null,
  price integer not null default 0,
  bedrooms integer not null default 0,
  bathrooms numeric not null default 0,
  sqft integer not null default 0,
  lot_size text default 'N/A',
  year_built integer default 0,
  property_type text default 'Unknown',
  status text not null default 'active' check (status in ('active', 'pending', 'sold')),
  description text default '',
  images text[] default '{}',
  features text[] default '{}',
  listing_date timestamptz default now(),
  source text not null check (source in ('zillow', 'realtor', 'mls')),
  source_url text default '',
  tax_annual numeric,
  tax_assessed_value numeric,
  lat double precision,
  lng double precision,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Index for common queries
create index idx_listings_county on listings (county);
create index idx_listings_city on listings (city);
create index idx_listings_status on listings (status);
create index idx_listings_price on listings (price);
create index idx_listings_slug on listings (slug);

-- Auto-update updated_at
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger listings_updated_at
  before update on listings
  for each row execute function update_updated_at();

-- Enable Row Level Security
alter table listings enable row level security;

-- Allow public read access
create policy "Public read access" on listings
  for select using (true);
