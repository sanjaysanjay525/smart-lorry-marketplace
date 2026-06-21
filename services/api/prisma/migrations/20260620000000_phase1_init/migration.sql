-- Phase 1: auth, roles, vehicle/driver CRUD
-- Hand-authored to match `prisma migrate dev` output for schema.prisma as of Phase 1.
-- If you have full internet access (so `prisma migrate dev` can fetch its engine
-- binaries), you can instead delete this folder and run `npx prisma migrate dev
-- --name phase1_init` to have Prisma generate (and verify) this file itself.

-- Required for GEOGRAPHY(POINT, 4326) columns and ST_* functions.
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "user_role" AS ENUM ('customer', 'owner', 'driver', 'admin');

-- CreateEnum
CREATE TYPE "vehicle_type" AS ENUM ('mini_truck', 'pickup', 'lcv', 'truck_14ft', 'truck_19ft', 'trailer', 'container');

-- CreateEnum
CREATE TYPE "vehicle_status" AS ENUM ('available', 'busy', 'offline');

-- CreateEnum
CREATE TYPE "kyc_status" AS ENUM ('pending', 'approved', 'rejected');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "user_role" NOT NULL,
    "name" TEXT NOT NULL,
    "avatar_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vehicles" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "type" "vehicle_type" NOT NULL,
    "capacity_kg" DECIMAL(10,2) NOT NULL,
    "registration" TEXT NOT NULL,
    "status" "vehicle_status" NOT NULL DEFAULT 'offline',
    "base_rate_per_km" DECIMAL(10,2) NOT NULL,
    "base_rate_per_hour" DECIMAL(10,2) NOT NULL,
    "current_location" geography(Point,4326),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drivers" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "vehicle_id" UUID,
    "license_number" TEXT NOT NULL,
    "license_expiry" DATE NOT NULL,
    "years_experience" INTEGER NOT NULL DEFAULT 0,
    "kyc_status" "kyc_status" NOT NULL DEFAULT 'pending',
    "rating_avg" DECIMAL(3,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "driver_availability" (
    "id" UUID NOT NULL,
    "driver_id" UUID NOT NULL,
    "day_of_week" INTEGER NOT NULL,
    "start_time" TEXT NOT NULL,
    "end_time" TEXT NOT NULL,

    CONSTRAINT "driver_availability_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_role_idx" ON "users"("role");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "vehicles_registration_key" ON "vehicles"("registration");

-- CreateIndex
CREATE INDEX "vehicles_owner_id_idx" ON "vehicles"("owner_id");

-- CreateIndex
CREATE INDEX "vehicles_status_idx" ON "vehicles"("status");

-- CreateIndex (GIST index for fast ST_DWithin / radius search)
CREATE INDEX "vehicles_current_location_idx" ON "vehicles" USING GIST ("current_location");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_user_id_key" ON "drivers"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "drivers_vehicle_id_key" ON "drivers"("vehicle_id");

-- CreateIndex
CREATE INDEX "drivers_owner_id_idx" ON "drivers"("owner_id");

-- CreateIndex
CREATE INDEX "drivers_kyc_status_idx" ON "drivers"("kyc_status");

-- CreateIndex
CREATE UNIQUE INDEX "driver_availability_driver_id_day_of_week_start_time_key" ON "driver_availability"("driver_id", "day_of_week", "start_time");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "vehicles" ADD CONSTRAINT "vehicles_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "drivers" ADD CONSTRAINT "drivers_vehicle_id_fkey" FOREIGN KEY ("vehicle_id") REFERENCES "vehicles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "driver_availability" ADD CONSTRAINT "driver_availability_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "drivers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
