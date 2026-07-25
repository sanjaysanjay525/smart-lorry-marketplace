-- Add origin_location and destination_location geography columns to load_postings table
ALTER TABLE load_postings ADD COLUMN IF NOT EXISTS origin_location GEOGRAPHY(POINT, 4326);
ALTER TABLE load_postings ADD COLUMN IF NOT EXISTS destination_location GEOGRAPHY(POINT, 4326);

-- Create GIST spatial indexes for fast search calculations
CREATE INDEX IF NOT EXISTS idx_loads_origin ON load_postings USING GIST (origin_location);
CREATE INDEX IF NOT EXISTS idx_loads_destination ON load_postings USING GIST (destination_location);
