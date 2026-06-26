import request from "supertest";
import { createApp } from "../src/app";
import { registerUser } from "./helpers";
import { prisma } from "../src/config/prisma";

const app = createApp();

describe("Loads & Acceptance (Phase 3)", () => {
  let mill: any;
  let owner: any;
  let vehicleId: string;

  beforeEach(async () => {
    mill = await registerUser(app, "mill");
    owner = await registerUser(app, "owner");

    // 1. Create a vehicle
    const vehicleRes = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
      .send({
        type: "truck_14ft",
        capacityKg: 6000,
        registration: "TN-37-XX-1111",
        ratePerTrip: 5000,
        baseRatePerKm: 25,
        currentLocation: { lat: 11.0168, lng: 76.9558 }, // Coimbatore
      });
    expect(vehicleRes.status).toBe(201);
    vehicleId = vehicleRes.body.id;

    // Approve the vehicle's KYC so it can accept loads
    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { kycApproved: true, status: "available" },
    });
  });

  describe("CRUD operations", () => {
    it("should allow mill owner to post a load", async () => {
      const res = await request(app)
        .post("/api/v1/loads")
        .set("Authorization", `Bearer ${mill.tokens.accessToken}`)
        .send({
          vehicleTypeReq: "truck_14ft",
          weightKg: 5500,
          materialType: "Rice Bags",
          pickupLat: 11.0168,
          pickupLng: 76.9558,
          pickupAddress: "Coimbatore, TN",
          dropLat: 13.0827,
          dropLng: 80.2707,
          dropAddress: "Chennai, TN",
          offeredRate: 15000,
          availableFrom: new Date(Date.now() + 86400000).toISOString(),
          availableUntil: new Date(Date.now() + 86400000 * 2).toISOString(),
        });

      expect(res.status).toBe(201);
      expect(res.body.status).toBe("open");
      expect(res.body.materialType).toBe("Rice Bags");
      expect(res.body.offeredRate).toBe(15000);
    });

    it("should reject posting a load for owner role", async () => {
      const res = await request(app)
        .post("/api/v1/loads")
        .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
        .send({
          vehicleTypeReq: "truck_14ft",
          weightKg: 5500,
          materialType: "Rice Bags",
          pickupLat: 11.0168,
          pickupLng: 76.9558,
          pickupAddress: "Coimbatore, TN",
          dropLat: 13.0827,
          dropLng: 80.2707,
          dropAddress: "Chennai, TN",
          offeredRate: 15000,
          availableFrom: new Date().toISOString(),
          availableUntil: new Date().toISOString(),
        });

      expect(res.status).toBe(403);
    });

    it("should allow updating an open load by poster", async () => {
      const createRes = await request(app)
        .post("/api/v1/loads")
        .set("Authorization", `Bearer ${mill.tokens.accessToken}`)
        .send({
          vehicleTypeReq: "truck_14ft",
          weightKg: 5500,
          materialType: "Rice Bags",
          pickupLat: 11.0168,
          pickupLng: 76.9558,
          pickupAddress: "Coimbatore, TN",
          dropLat: 13.0827,
          dropLng: 80.2707,
          dropAddress: "Chennai, TN",
          offeredRate: 15000,
          availableFrom: new Date(Date.now() + 86400000).toISOString(),
          availableUntil: new Date(Date.now() + 86400000 * 2).toISOString(),
        });

      const loadId = createRes.body.id;

      const updateRes = await request(app)
        .patch(`/api/v1/loads/${loadId}`)
        .set("Authorization", `Bearer ${mill.tokens.accessToken}`)
        .send({
          materialType: "Premium Rice Bags",
          offeredRate: 16000,
        });

      expect(updateRes.status).toBe(200);
      expect(updateRes.body.materialType).toBe("Premium Rice Bags");
      expect(updateRes.body.offeredRate).toBe(16000);
    });

    it("should allow canceling an open load by poster", async () => {
      const createRes = await request(app)
        .post("/api/v1/loads")
        .set("Authorization", `Bearer ${mill.tokens.accessToken}`)
        .send({
          vehicleTypeReq: "truck_14ft",
          weightKg: 5500,
          materialType: "Rice Bags",
          pickupLat: 11.0168,
          pickupLng: 76.9558,
          pickupAddress: "Coimbatore, TN",
          dropLat: 13.0827,
          dropLng: 80.2707,
          dropAddress: "Chennai, TN",
          offeredRate: 15000,
          availableFrom: new Date(Date.now() + 86400000).toISOString(),
          availableUntil: new Date(Date.now() + 86400000 * 2).toISOString(),
        });

      const loadId = createRes.body.id;

      const cancelRes = await request(app)
        .delete(`/api/v1/loads/${loadId}`)
        .set("Authorization", `Bearer ${mill.tokens.accessToken}`);

      expect(cancelRes.status).toBe(200);
      expect(cancelRes.body.status).toBe("cancelled");
    });
  });

  describe("Load Acceptance", () => {
    let loadId: string;

    beforeEach(async () => {
      const loadRes = await request(app)
        .post("/api/v1/loads")
        .set("Authorization", `Bearer ${mill.tokens.accessToken}`)
        .send({
          vehicleTypeReq: "truck_14ft",
          weightKg: 5500,
          materialType: "Rice Bags",
          pickupLat: 11.0168,
          pickupLng: 76.9558,
          pickupAddress: "Coimbatore, TN",
          dropLat: 13.0827,
          dropLng: 80.2707,
          dropAddress: "Chennai, TN",
          offeredRate: 15000,
          availableFrom: new Date(Date.now() + 86400000).toISOString(),
          availableUntil: new Date(Date.now() + 86400000 * 2).toISOString(),
        });
      loadId = loadRes.body.id;
    });

    it("should allow owner to accept a matching open load", async () => {
      const acceptRes = await request(app)
        .post(`/api/v1/loads/${loadId}/accept`)
        .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
        .send({ vehicleId });

      expect(acceptRes.status).toBe(201);
      expect(acceptRes.body.status).toBe("pending");
      expect(acceptRes.body.agreedRate).toBe(15000);

      // Verify DB updates
      const loadCheck = await prisma.load.findUniqueOrThrow({ where: { id: loadId } });
      expect(loadCheck.status).toBe("booked");

      const vehicleCheck = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
      expect(vehicleCheck.status).toBe("busy");
    });

    it("should block acceptance if vehicle KYC is not approved", async () => {
      const unapprovedVehicleRes = await request(app)
        .post("/api/v1/vehicles")
        .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
        .send({
          type: "truck_14ft",
          capacityKg: 6000,
          registration: "TN-37-XX-2222",
          ratePerTrip: 5000,
          baseRatePerKm: 25,
        });

      await prisma.vehicle.update({
        where: { id: unapprovedVehicleRes.body.id },
        data: { status: "available" },
      });

      const acceptRes = await request(app)
        .post(`/api/v1/loads/${loadId}/accept`)
        .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
        .send({ vehicleId: unapprovedVehicleRes.body.id });

      expect(acceptRes.status).toBe(400);
      expect(acceptRes.body.error.message).toContain("KYC");
    });

    it("should block acceptance if vehicle type does not match load requirement", async () => {
      const differentVehicleRes = await request(app)
        .post("/api/v1/vehicles")
        .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
        .send({
          type: "container", // load requires truck_14ft
          capacityKg: 15000,
          registration: "TN-37-XX-3333",
          ratePerTrip: 12000,
          baseRatePerKm: 35,
        });
      const differentVehicleId = differentVehicleRes.body.id;
      await prisma.vehicle.update({
        where: { id: differentVehicleId },
        data: { kycApproved: true, status: "available" },
      });

      const acceptRes = await request(app)
        .post(`/api/v1/loads/${loadId}/accept`)
        .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
        .send({ vehicleId: differentVehicleId });

      expect(acceptRes.status).toBe(400);
      expect(acceptRes.body.error.message).toContain("requires");
    });
  });
});
