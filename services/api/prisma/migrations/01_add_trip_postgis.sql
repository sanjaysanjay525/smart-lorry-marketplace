-- Add origin_location and destination_location geography columns to trips table
ALTER TABLE trips ADD COLUMN IF NOT EXISTS origin_location GEOGRAPHY(POINT, 4326);
ALTER TABLE trips ADD COLUMN IF NOT EXISTS destination_location GEOGRAPHY(POINT, 4326);

-- Add location geography column to trip_location_updates table
ALTER TABLE trip_location_updates ADD COLUMN IF NOT EXISTS location GEOGRAPHY(POINT, 4326);

-- Create GIST spatial indexes for fast search calculations
CREATE INDEX IF NOT EXISTS idx_trips_origin ON trips USING GIST (origin_location);
CREATE INDEX IF NOT EXISTS idx_trips_destination ON trips USING GIST (destination_location);
CREATE INDEX IF NOT EXISTS idx_trip_updates_location ON trip_location_updates USING GIST (location);
