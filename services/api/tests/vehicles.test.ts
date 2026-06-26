import request from "supertest";
import { createApp } from "../src/app";
import { registerUser } from "./helpers";

const app = createApp();

describe("Vehicles", () => {
  it("lets an owner create a vehicle but blocks other roles", async () => {
    const owner = await registerUser(app, "owner");
    const mill = await registerUser(app, "mill");

    const vehiclePayload = {
      type: "truck_14ft",
      capacityKg: 6000,
      registration: "TN-37-AB-1234",
      ratePerTrip: 5000,
      baseRatePerKm: 25,
      currentLocation: { lat: 11.0168, lng: 76.9558 },
    };

    const forbidden = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${mill.tokens.accessToken}`)
      .send(vehiclePayload);
    expect(forbidden.status).toBe(403);

    const created = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
      .send(vehiclePayload);

    expect(created.status).toBe(201);
    expect(created.body.registration).toBe(vehiclePayload.registration);
    expect(created.body.status).toBe("offline");
    expect(created.body.currentLocation).toEqual({ lat: 11.0168, lng: 76.9558 });
  });

  it("lets the owner toggle vehicle status and rejects a stranger owner", async () => {
    const owner = await registerUser(app, "owner");
    const otherOwner = await registerUser(app, "owner");

    const created = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
      .send({
        type: "mini_truck",
        capacityKg: 1000,
        registration: "TN-37-CD-5678",
        ratePerTrip: 3000,
        baseRatePerKm: 15,
      });

    const vehicleId = created.body.id;

    const toggled = await request(app)
      .patch(`/api/v1/vehicles/${vehicleId}/status`)
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
      .send({ status: "available" });
    expect(toggled.status).toBe(200);
    expect(toggled.body.status).toBe("available");

    const blocked = await request(app)
      .patch(`/api/v1/vehicles/${vehicleId}/status`)
      .set("Authorization", `Bearer ${otherOwner.tokens.accessToken}`)
      .send({ status: "offline" });
    expect(blocked.status).toBe(403);
  });

  it("lets the owner update rate and location", async () => {
    const owner = await registerUser(app, "owner");

    const created = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
      .send({
        type: "container",
        capacityKg: 15000,
        registration: "TN-37-XY-9999",
        ratePerTrip: 10000,
        baseRatePerKm: 30,
      });

    const vehicleId = created.body.id;

    const rateRes = await request(app)
      .patch(`/api/v1/vehicles/${vehicleId}/rate`)
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
      .send({
        ratePerTrip: 12000,
        baseRatePerKm: 32,
      });
    expect(rateRes.status).toBe(200);
    expect(rateRes.body.ratePerTrip).toBe(12000);
    expect(rateRes.body.baseRatePerKm).toBe(32);

    const locRes = await request(app)
      .patch(`/api/v1/vehicles/${vehicleId}/location`)
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
      .send({
        location: { lat: 13.0827, lng: 80.2707 },
      });
    expect(locRes.status).toBe(200);
    expect(locRes.body.currentLocation).toEqual({ lat: 13.0827, lng: 80.2707 });
  });

  it("paginates an owner's vehicle list", async () => {
    const owner = await registerUser(app, "owner");

    for (let i = 0; i < 3; i++) {
      await request(app)
        .post("/api/v1/vehicles")
        .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
        .send({
          type: "pickup",
          capacityKg: 800,
          registration: `TN-37-EF-000${i}`,
          ratePerTrip: 2000,
          baseRatePerKm: 12,
        });
    }

    const res = await request(app)
      .get("/api/v1/vehicles?page=1&limit=2")
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
    expect(res.body.total).toBe(3);
    expect(res.body.totalPages).toBe(2);
  });
});
