-- Add mlslistings to allowed source types
alter table listings drop constraint if exists listings_source_check;
alter table listings add constraint listings_source_check
  check (source in ('zillow', 'realtor', 'mls', 'redfin', 'trulia', 'mlslistings'));
