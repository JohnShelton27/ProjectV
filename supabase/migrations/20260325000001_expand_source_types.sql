-- Drop the old source constraint and replace with a more flexible one
alter table listings drop constraint if exists listings_source_check;
alter table listings add constraint listings_source_check
  check (source in ('zillow', 'realtor', 'mls', 'redfin', 'trulia'));
