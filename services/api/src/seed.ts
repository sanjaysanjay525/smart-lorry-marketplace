import { prisma } from "./config/prisma";
import { hashPassword } from "./utils/password";

async function main() {
  console.log("Seeding database with test accounts...");

  // 1. Clean up existing seed data (idempotent)
  await prisma.$transaction([
    prisma.dispute.deleteMany(),
    prisma.kycDocument.deleteMany(),
    prisma.smsSendLog.deleteMany(),
    prisma.rating.deleteMany(),
    prisma.trip.deleteMany(),
    prisma.load.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.user.deleteMany({
      where: {
        email: {
          in: ["mill@slm.dev", "owner@slm.dev", "admin@slm.dev"],
        },
      },
    }),
  ]);

  const passwordHash = await hashPassword("password123");

  // 2. Create users (two roles + admin)
  const mill = await prisma.user.create({
    data: {
      email: "mill@slm.dev",
      phone: "+919999999991",
      passwordHash,
      role: "mill",
      name: "Coimbatore Textiles (Mill)",
    },
  });

  const owner = await prisma.user.create({
    data: {
      email: "owner@slm.dev",
      phone: "+919999999992",
      passwordHash,
      role: "owner",
      name: "TN Logistics (Lorry Owner)",
    },
  });

  const admin = await prisma.user.create({
    data: {
      email: "admin@slm.dev",
      phone: "+919999999990",
      passwordHash,
      role: "admin",
      name: "Admin",
    },
  });

  console.log("Created users:", {
    mill: mill.email,
    owner: owner.email,
    admin: admin.email,
  });

  // 3. Create vehicles for the owner
  const vehicle1 = await prisma.vehicle.create({
    data: {
      ownerId: owner.id,
      type: "truck_14ft",
      capacityKg: 6000,
      registration: "TN-37-AB-1234",
      status: "available",
      ratePerTrip: 5000,
      baseRatePerKm: 25,
      kycApproved: true,
    },
  });

  const vehicle2 = await prisma.vehicle.create({
    data: {
      ownerId: owner.id,
      type: "container",
      capacityKg: 20000,
      registration: "TN-11-CD-5678",
      status: "available",
      ratePerTrip: 15000,
      baseRatePerKm: 35,
      kycApproved: true,
    },
  });

  // Set PostGIS locations (Coimbatore)
  await prisma.$executeRaw`
    UPDATE vehicles
    SET current_location = ST_SetSRID(ST_MakePoint(76.9558, 11.0168), 4326)::geography
    WHERE id = ${vehicle1.id}::uuid
  `;
  await prisma.$executeRaw`
    UPDATE vehicles
    SET current_location = ST_SetSRID(ST_MakePoint(76.9558, 11.0168), 4326)::geography
    WHERE id = ${vehicle2.id}::uuid
  `;

  console.log("Created vehicles:", vehicle1.registration, vehicle2.registration);

  // 4. Post sample loads from the mill owner
  await prisma.load.create({
    data: {
      millId: mill.id,
      vehicleTypeReq: "truck_14ft",
      weightKg: 5500,
      materialType: "Cotton Bales",
      pickupAddress: "Salem, Tamil Nadu",
      pickupLat: 11.6643,
      pickupLng: 78.1460,
      dropAddress: "Erode, Tamil Nadu",
      dropLat: 11.3410,
      dropLng: 77.7172,
      offeredRate: 6000,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 86400000 * 3),
      status: "open",
    },
  });

  await prisma.load.create({
    data: {
      millId: mill.id,
      vehicleTypeReq: "container",
      weightKg: 18000,
      materialType: "Rice Bags",
      pickupAddress: "Coimbatore, Tamil Nadu",
      pickupLat: 11.0168,
      pickupLng: 76.9558,
      dropAddress: "Chennai, Tamil Nadu",
      dropLat: 13.0827,
      dropLng: 80.2707,
      offeredRate: 15000,
      availableFrom: new Date(),
      availableUntil: new Date(Date.now() + 86400000 * 5),
      status: "open",
    },
  });

  console.log("Posted sample open loads.");
  console.log("\n=== Seeding complete ===\n");
  console.log("Login credentials:");
  console.log("-----------------------------------------");
  console.log("Role: Mill Owner");
  console.log("Email: mill@slm.dev");
  console.log("Password: password123");
  console.log("-----------------------------------------");
  console.log("Role: Lorry Owner");
  console.log("Email: owner@slm.dev");
  console.log("Password: password123");
  console.log("-----------------------------------------");
  console.log("Role: Admin");
  console.log("Email: admin@slm.dev");
  console.log("Password: password123");
  console.log("-----------------------------------------");
}

main()
  .catch((e) => {
    console.error("Error during database seed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
