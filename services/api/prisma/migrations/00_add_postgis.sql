-- Enable PostGIS extension if not already enabled
CREATE EXTENSION IF NOT EXISTS postgis;

-- Add current_location geography column to vehicles table
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS current_location GEOGRAPHY(POINT, 4326);

-- Create a GIST index on current_location for fast spatial queries
CREATE INDEX IF NOT EXISTS idx_vehicles_location ON vehicles USING GIST (current_location);
