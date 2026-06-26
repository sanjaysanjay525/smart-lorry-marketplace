-- Smart Lorry Marketplace — Full Rebuild Migration
-- Two-role model: mill (mill owner) + owner (lorry owner)
-- Drops all Phase 1 tables and recreates from scratch

-- Enable PostGIS
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ─────────────────────────────── Drop old tables ───────────────────────────────
DROP TABLE IF EXISTS "sms_send_log" CASCADE;
DROP TABLE IF EXISTS "disputes" CASCADE;
DROP TABLE IF EXISTS "kyc_documents" CASCADE;
DROP TABLE IF EXISTS "ratings" CASCADE;
DROP TABLE IF EXISTS "trips" CASCADE;
DROP TABLE IF EXISTS "loads" CASCADE;
DROP TABLE IF EXISTS "driver_availability" CASCADE;
DROP TABLE IF EXISTS "drivers" CASCADE;
DROP TABLE IF EXISTS "refresh_tokens" CASCADE;
DROP TABLE IF EXISTS "vehicles" CASCADE;
DROP TABLE IF EXISTS "users" CASCADE;

-- ─────────────────────────────── Drop old enums ───────────────────────────────
DROP TYPE IF EXISTS "user_role" CASCADE;
DROP TYPE IF EXISTS "vehicle_type" CASCADE;
DROP TYPE IF EXISTS "vehicle_status" CASCADE;
DROP TYPE IF EXISTS "kyc_status" CASCADE;
DROP TYPE IF EXISTS "trip_type" CASCADE;
DROP TYPE IF EXISTS "trip_status" CASCADE;
DROP TYPE IF EXISTS "pricing_mode" CASCADE;
DROP TYPE IF EXISTS "load_status" CASCADE;

-- ─────────────────────────────── Enums ───────────────────────────────

CREATE TYPE "user_role" AS ENUM ('mill', 'owner', 'admin');

CREATE TYPE "vehicle_type" AS ENUM (
  'mini_truck', 'pickup', 'lcv',
  'truck_14ft', 'truck_19ft',
  'trailer', 'container'
);

CREATE TYPE "vehicle_status" AS ENUM ('available', 'busy', 'offline');

CREATE TYPE "load_status" AS ENUM ('open', 'booked', 'in_transit', 'delivered', 'cancelled');

CREATE TYPE "trip_status" AS ENUM ('pending', 'picked_up', 'in_transit', 'delivered', 'cancelled');

CREATE TYPE "kyc_status" AS ENUM ('pending', 'approved', 'rejected');

-- ─────────────────────────────── Tables ───────────────────────────────

CREATE TABLE "users" (
  "id"            UUID        NOT NULL DEFAULT gen_random_uuid(),
  "email"         TEXT        NOT NULL,
  "phone"         TEXT        NOT NULL,
  "password_hash" TEXT        NOT NULL,
  "role"          "user_role" NOT NULL,
  "name"          TEXT        NOT NULL,
  "avatar_url"    TEXT,
  "banned"        BOOLEAN     NOT NULL DEFAULT false,
  "created_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),
  "updated_at"    TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");
CREATE INDEX "users_role_idx" ON "users"("role");

CREATE TABLE "refresh_tokens" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"    UUID        NOT NULL,
  "token_hash" TEXT        NOT NULL,
  "expires_at" TIMESTAMPTZ NOT NULL,
  "revoked_at" TIMESTAMPTZ,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

CREATE TABLE "vehicles" (
  "id"               UUID             NOT NULL DEFAULT gen_random_uuid(),
  "owner_id"         UUID             NOT NULL,
  "type"             "vehicle_type"   NOT NULL,
  "capacity_kg"      NUMERIC(10,2)    NOT NULL,
  "registration"     TEXT             NOT NULL,
  "status"           "vehicle_status" NOT NULL DEFAULT 'offline',
  "rate_per_trip"    NUMERIC(12,2)    NOT NULL,
  "base_rate_per_km" NUMERIC(10,2)    NOT NULL,
  "kyc_approved"     BOOLEAN          NOT NULL DEFAULT false,
  "current_location" geography(Point,4326),
  "created_at"       TIMESTAMPTZ      NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ      NOT NULL DEFAULT now(),

  CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vehicles_owner_id_fkey" FOREIGN KEY ("owner_id")
    REFERENCES "users"("id") ON DELETE CASCADE
);
CREATE UNIQUE INDEX "vehicles_registration_key" ON "vehicles"("registration");
CREATE INDEX "vehicles_owner_id_idx" ON "vehicles"("owner_id");
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");
CREATE INDEX "vehicles_location_gist" ON "vehicles" USING GIST ("current_location");

CREATE TABLE "loads" (
  "id"              UUID          NOT NULL DEFAULT gen_random_uuid(),
  "mill_id"         UUID          NOT NULL,
  "material_type"   TEXT          NOT NULL,
  "weight_kg"       NUMERIC(10,2) NOT NULL,
  "vehicle_type_req" "vehicle_type" NOT NULL,
  "pickup_address"  TEXT          NOT NULL,
  "pickup_lat"      NUMERIC(10,7) NOT NULL,
  "pickup_lng"      NUMERIC(10,7) NOT NULL,
  "drop_address"    TEXT          NOT NULL,
  "drop_lat"        NUMERIC(10,7) NOT NULL,
  "drop_lng"        NUMERIC(10,7) NOT NULL,
  "offered_rate"    NUMERIC(12,2) NOT NULL,
  "available_from"  TIMESTAMPTZ   NOT NULL,
  "available_until" TIMESTAMPTZ   NOT NULL,
  "status"          "load_status" NOT NULL DEFAULT 'open',
  "notes"           TEXT,
  "created_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  "updated_at"      TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT "loads_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "loads_mill_id_fkey" FOREIGN KEY ("mill_id")
    REFERENCES "users"("id")
);
CREATE INDEX "loads_status_idx" ON "loads"("status");
CREATE INDEX "loads_mill_id_idx" ON "loads"("mill_id");

CREATE TABLE "trips" (
  "id"               UUID          NOT NULL DEFAULT gen_random_uuid(),
  "load_id"          UUID          NOT NULL,
  "vehicle_id"       UUID          NOT NULL,
  "owner_id"         UUID          NOT NULL,
  "mill_id"          UUID          NOT NULL,
  "agreed_rate"      NUMERIC(12,2) NOT NULL,
  "status"           "trip_status" NOT NULL DEFAULT 'pending',
  "picked_up_at"     TIMESTAMPTZ,
  "delivered_at"     TIMESTAMPTZ,
  "cancelled_at"     TIMESTAMPTZ,
  "cancel_reason"    TEXT,
  "last_sms_sent_at" TIMESTAMPTZ,
  "created_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),
  "updated_at"       TIMESTAMPTZ   NOT NULL DEFAULT now(),

  CONSTRAINT "trips_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "trips_load_id_key" UNIQUE ("load_id"),
  CONSTRAINT "trips_load_id_fkey" FOREIGN KEY ("load_id")
    REFERENCES "loads"("id"),
  CONSTRAINT "trips_vehicle_id_fkey" FOREIGN KEY ("vehicle_id")
    REFERENCES "vehicles"("id"),
  CONSTRAINT "trips_owner_id_fkey" FOREIGN KEY ("owner_id")
    REFERENCES "users"("id"),
  CONSTRAINT "trips_mill_id_fkey" FOREIGN KEY ("mill_id")
    REFERENCES "users"("id")
);
CREATE INDEX "trips_owner_id_idx" ON "trips"("owner_id");
CREATE INDEX "trips_mill_id_idx" ON "trips"("mill_id");
CREATE INDEX "trips_status_idx" ON "trips"("status");

CREATE TABLE "ratings" (
  "id"         UUID        NOT NULL DEFAULT gen_random_uuid(),
  "trip_id"    UUID        NOT NULL,
  "rater_id"   UUID        NOT NULL,
  "ratee_id"   UUID        NOT NULL,
  "score"      INTEGER     NOT NULL,
  "comment"    TEXT,
  "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "ratings_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ratings_trip_id_rater_id_key" UNIQUE ("trip_id", "rater_id"),
  CONSTRAINT "ratings_trip_id_fkey" FOREIGN KEY ("trip_id")
    REFERENCES "trips"("id"),
  CONSTRAINT "ratings_rater_id_fkey" FOREIGN KEY ("rater_id")
    REFERENCES "users"("id"),
  CONSTRAINT "ratings_ratee_id_fkey" FOREIGN KEY ("ratee_id")
    REFERENCES "users"("id")
);

CREATE TABLE "sms_send_log" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "trip_id"      UUID        NOT NULL,
  "to_phone"     TEXT        NOT NULL,
  "message_type" TEXT        NOT NULL,
  "message_body" TEXT        NOT NULL,
  "sent_at"      TIMESTAMPTZ NOT NULL DEFAULT now(),
  "success"      BOOLEAN     NOT NULL,
  "provider_ref" TEXT,

  CONSTRAINT "sms_send_log_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sms_send_log_trip_id_fkey" FOREIGN KEY ("trip_id")
    REFERENCES "trips"("id")
);

CREATE TABLE "kyc_documents" (
  "id"          UUID        NOT NULL DEFAULT gen_random_uuid(),
  "user_id"     UUID        NOT NULL,
  "doc_type"    TEXT        NOT NULL,
  "doc_url"     TEXT        NOT NULL,
  "status"      "kyc_status" NOT NULL DEFAULT 'pending',
  "review_note" TEXT,
  "reviewed_by" UUID,
  "reviewed_at" TIMESTAMPTZ,
  "created_at"  TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "kyc_documents_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "kyc_documents_user_id_fkey" FOREIGN KEY ("user_id")
    REFERENCES "users"("id"),
  CONSTRAINT "kyc_documents_reviewed_by_fkey" FOREIGN KEY ("reviewed_by")
    REFERENCES "users"("id")
);

CREATE TABLE "disputes" (
  "id"           UUID        NOT NULL DEFAULT gen_random_uuid(),
  "trip_id"      UUID        NOT NULL,
  "raised_by_id" UUID        NOT NULL,
  "reason"       TEXT        NOT NULL,
  "status"       TEXT        NOT NULL DEFAULT 'open',
  "resolution"   TEXT,
  "resolved_by"  UUID,
  "resolved_at"  TIMESTAMPTZ,
  "created_at"   TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT "disputes_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "disputes_trip_id_fkey" FOREIGN KEY ("trip_id")
    REFERENCES "trips"("id"),
  CONSTRAINT "disputes_raised_by_id_fkey" FOREIGN KEY ("raised_by_id")
    REFERENCES "users"("id"),
  CONSTRAINT "disputes_resolved_by_fkey" FOREIGN KEY ("resolved_by")
    REFERENCES "users"("id")
);
