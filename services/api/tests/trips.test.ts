import request from "supertest";
import { createApp } from "../src/app";
import { registerUser } from "./helpers";
import { prisma } from "../src/config/prisma";

const app = createApp();

describe("Trips Lifecycle (Phase 3)", () => {
  let mill: any;
  let owner: any;
  let vehicleId: string;
  let loadId: string;
  let tripId: string;

  beforeEach(async () => {
    mill = await registerUser(app, "mill");
    owner = await registerUser(app, "owner");

    // 1. Create and KYC-approve vehicle
    const vehicleRes = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
      .send({
        type: "truck_14ft",
        capacityKg: 6000,
        registration: "TN-37-AB-9999",
        ratePerTrip: 5000,
        baseRatePerKm: 25,
        currentLocation: { lat: 11.0168, lng: 76.9558 },
      });
    expect(vehicleRes.status).toBe(201);
    vehicleId = vehicleRes.body.id;

    await prisma.vehicle.update({
      where: { id: vehicleId },
      data: { kycApproved: true, status: "available" },
    });

    // 2. Post a load
    const loadRes = await request(app)
      .post("/api/v1/loads")
      .set("Authorization", `Bearer ${mill.tokens.accessToken}`)
      .send({
        vehicleTypeReq: "truck_14ft",
        weightKg: 5500,
        materialType: "Cotton Bales",
        pickupLat: 11.0168,
        pickupLng: 76.9558,
        pickupAddress: "Coimbatore, TN",
        dropLat: 11.6643,
        dropLng: 78.1460,
        dropAddress: "Salem, TN",
        offeredRate: 8000,
        availableFrom: new Date(Date.now() + 86400000).toISOString(),
        availableUntil: new Date(Date.now() + 86400000 * 2).toISOString(),
      });
    expect(loadRes.status).toBe(201);
    loadId = loadRes.body.id;

    // 3. Accept load to create a trip
    const acceptRes = await request(app)
      .post(`/api/v1/loads/${loadId}/accept`)
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
      .send({ vehicleId });
    expect(acceptRes.status).toBe(201);
    tripId = acceptRes.body.id;
  });

  it("should block strangers from viewing trip details", async () => {
    const stranger = await registerUser(app, "owner");

    const res = await request(app)
      .get(`/api/v1/trips/${tripId}`)
      .set("Authorization", `Bearer ${stranger.tokens.accessToken}`);

    expect(res.status).toBe(403);
  });

  it("should allow involved parties to view trip details", async () => {
    const millRes = await request(app)
      .get(`/api/v1/trips/${tripId}`)
      .set("Authorization", `Bearer ${mill.tokens.accessToken}`);
    expect(millRes.status).toBe(200);
    expect(millRes.body.id).toBe(tripId);

    const ownerRes = await request(app)
      .get(`/api/v1/trips/${tripId}`)
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`);
    expect(ownerRes.status).toBe(200);
  });

  it("should transition trip status: pending -> picked_up -> in_transit -> delivered", async () => {
    // 1. Mark picked up
    const pickupRes = await request(app)
      .patch(`/api/v1/trips/${tripId}/pickup`)
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`);
    expect(pickupRes.status).toBe(200);
    expect(pickupRes.body.status).toBe("picked_up");

    // 2. Mark in transit
    const transitRes = await request(app)
      .patch(`/api/v1/trips/${tripId}/transit`)
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`);
    expect(transitRes.status).toBe(200);
    expect(transitRes.body.status).toBe("in_transit");

    // 3. Mark delivered
    const deliverRes = await request(app)
      .patch(`/api/v1/trips/${tripId}/deliver`)
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`);
    expect(deliverRes.status).toBe(200);
    expect(deliverRes.body.status).toBe("delivered");

    // Verify database statuses
    const vehicleCheck = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    expect(vehicleCheck.status).toBe("available");

    const loadCheck = await prisma.load.findUniqueOrThrow({ where: { id: loadId } });
    expect(loadCheck.status).toBe("delivered");
  });

  it("should support trip cancellation and restore load/vehicle statuses", async () => {
    const cancelRes = await request(app)
      .patch(`/api/v1/trips/${tripId}/cancel`)
      .set("Authorization", `Bearer ${mill.tokens.accessToken}`)
      .send({ cancelReason: "Order cancellation" });

    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe("cancelled");
    expect(cancelRes.body.cancelReason).toBe("Order cancellation");

    // Verify load is open again and vehicle is available again
    const loadCheck = await prisma.load.findUniqueOrThrow({ where: { id: loadId } });
    expect(loadCheck.status).toBe("open");

    const vehicleCheck = await prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } });
    expect(vehicleCheck.status).toBe("available");
  });

  it("should support rating a delivered trip", async () => {
    // Deliver the trip first
    await request(app)
      .patch(`/api/v1/trips/${tripId}/pickup`)
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`);
    await request(app)
      .patch(`/api/v1/trips/${tripId}/transit`)
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`);
    await request(app)
      .patch(`/api/v1/trips/${tripId}/deliver`)
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`);

    // Mill rates the owner
    const rateRes = await request(app)
      .post(`/api/v1/trips/${tripId}/rate`)
      .set("Authorization", `Bearer ${mill.tokens.accessToken}`)
      .send({
        score: 5,
        comment: "Very prompt and professional service!",
      });

    expect(rateRes.status).toBe(200);
    expect(rateRes.body.ratings).toHaveLength(1);
    expect(rateRes.body.ratings[0].score).toBe(5);
  });
});
