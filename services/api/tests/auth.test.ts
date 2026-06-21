import request from "supertest";
import { createApp } from "../src/app";

const app = createApp();

const ownerPayload = {
  name: "Asha Owner",
  email: "asha@fleetco.test",
  phone: "+919876500001",
  password: "correct-horse-battery-staple",
  role: "owner",
};

describe("Auth", () => {
  it("registers a new user and returns a token pair", async () => {
    const res = await request(app).post("/api/v1/auth/register").send(ownerPayload);

    expect(res.status).toBe(201);
    expect(res.body.user.email).toBe(ownerPayload.email);
    expect(res.body.user).not.toHaveProperty("passwordHash");
    expect(res.body.tokens.accessToken).toEqual(expect.any(String));
    expect(res.body.tokens.refreshToken).toEqual(expect.any(String));
  });

  it("rejects duplicate registration (same email)", async () => {
    await request(app).post("/api/v1/auth/register").send(ownerPayload);
    const res = await request(app).post("/api/v1/auth/register").send(ownerPayload);

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe("CONFLICT");
  });

  it("rejects registration with an invalid payload", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ ...ownerPayload, email: "not-an-email" });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("BAD_REQUEST");
  });

  it("logs in with correct credentials and rejects incorrect ones", async () => {
    await request(app).post("/api/v1/auth/register").send(ownerPayload);

    const good = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: ownerPayload.email, password: ownerPayload.password });
    expect(good.status).toBe(200);
    expect(good.body.tokens.accessToken).toEqual(expect.any(String));

    const bad = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: ownerPayload.email, password: "wrong-password" });
    expect(bad.status).toBe(401);
  });

  it("rotates refresh tokens and rejects reuse of a consumed token", async () => {
    const registerRes = await request(app).post("/api/v1/auth/register").send(ownerPayload);
    const firstRefreshToken = registerRes.body.tokens.refreshToken;

    const refreshRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: firstRefreshToken });
    expect(refreshRes.status).toBe(200);
    expect(refreshRes.body.tokens.refreshToken).not.toBe(firstRefreshToken);

    // Reusing the now-rotated-out token must fail.
    const reuseRes = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken: firstRefreshToken });
    expect(reuseRes.status).toBe(401);
  });

  it("protects /users/me behind a valid access token", async () => {
    const unauth = await request(app).get("/api/v1/users/me");
    expect(unauth.status).toBe(401);

    const registerRes = await request(app).post("/api/v1/auth/register").send(ownerPayload);
    const accessToken = registerRes.body.tokens.accessToken;

    const me = await request(app)
      .get("/api/v1/users/me")
      .set("Authorization", `Bearer ${accessToken}`);
    expect(me.status).toBe(200);
    expect(me.body.email).toBe(ownerPayload.email);
  });
});
