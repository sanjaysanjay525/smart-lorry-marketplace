import request from "supertest";
import { createApp } from "../src/app";
import { registerUser } from "./helpers";

const app = createApp();

describe("Vehicles", () => {
  it("lets an owner create a vehicle but blocks other roles", async () => {
    const owner = await registerUser(app, "owner");
    const customer = await registerUser(app, "customer");

    const vehiclePayload = {
      type: "truck_14ft",
      capacityKg: 4500,
      registration: "TN-37-AB-1234",
      baseRatePerKm: 25,
      baseRatePerHour: 350,
      currentLocation: { lat: 11.0168, lng: 76.9558 }, // Coimbatore
    };

    const forbidden = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${customer.tokens.accessToken}`)
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
        baseRatePerKm: 15,
        baseRatePerHour: 200,
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
          baseRatePerKm: 10,
          baseRatePerHour: 150,
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

describe("Drivers — full Phase 1 deliverable gate", () => {
  it("registers an owner, adds a vehicle, links a driver, and toggles availability end to end", async () => {
    const owner = await registerUser(app, "owner");
    const driverUser = await registerUser(app, "driver");

    const vehicle = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
      .send({
        type: "lcv",
        capacityKg: 2000,
        registration: "TN-37-GH-9012",
        baseRatePerKm: 18,
        baseRatePerHour: 250,
      });
    expect(vehicle.status).toBe(201);

    const driver = await request(app)
      .post("/api/v1/drivers")
      .set("Authorization", `Bearer ${owner.tokens.accessToken}`)
      .send({
        userId: driverUser.user.id,
        vehicleId: vehicle.body.id,
        licenseNumber: "TN0120230012345",
        licenseExpiry: "2028-01-01",
        yearsExperience: 6,
      });

    expect(driver.status).toBe(201);
    expect(driver.body.vehicleId).toBe(vehicle.body.id);
    expect(driver.body.kycStatus).toBe("pending");

    // Driver (now linked to the vehicle) can flip its status themselves.
    const toggledByDriver = await request(app)
      .patch(`/api/v1/vehicles/${vehicle.body.id}/status`)
      .set("Authorization", `Bearer ${driverUser.tokens.accessToken}`)
      .send({ status: "available" });
    expect(toggledByDriver.status).toBe(200);
    expect(toggledByDriver.body.status).toBe("available");

    // A customer can view the driver's public profile (rating, experience).
    const customer = await registerUser(app, "customer");
    const publicProfile = await request(app)
      .get(`/api/v1/drivers/${driver.body.id}`)
      .set("Authorization", `Bearer ${customer.tokens.accessToken}`);
    expect(publicProfile.status).toBe(200);
    expect(publicProfile.body.yearsExperience).toBe(6);
    expect(publicProfile.body).not.toHaveProperty("licenseNumber");
  });

  it("rejects linking a driver to a vehicle the owner doesn't own", async () => {
    const ownerA = await registerUser(app, "owner");
    const ownerB = await registerUser(app, "owner");
    const driverUser = await registerUser(app, "driver");

    const vehicle = await request(app)
      .post("/api/v1/vehicles")
      .set("Authorization", `Bearer ${ownerA.tokens.accessToken}`)
      .send({
        type: "truck_19ft",
        capacityKg: 8000,
        registration: "TN-37-IJ-3456",
        baseRatePerKm: 30,
        baseRatePerHour: 400,
      });

    const driver = await request(app)
      .post("/api/v1/drivers")
      .set("Authorization", `Bearer ${ownerB.tokens.accessToken}`)
      .send({
        userId: driverUser.user.id,
        vehicleId: vehicle.body.id,
        licenseNumber: "TN0120230099999",
        licenseExpiry: "2027-06-01",
        yearsExperience: 2,
      });

    expect(driver.status).toBe(403);
  });
});
