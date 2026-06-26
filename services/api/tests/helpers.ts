import request from "supertest";
import type { Express } from "express";

let counter = 0;

export async function registerUser(
  app: Express,
  role: "mill" | "owner",
  overrides: Partial<{ name: string; email: string; phone: string; password: string }> = {}
) {
  counter += 1;
  const payload = {
    name: overrides.name ?? `Test ${role} ${counter}`,
    email: overrides.email ?? `${role}${counter}@test.dev`,
    phone: overrides.phone ?? `+9198765${String(10000 + counter).slice(-5)}`,
    password: overrides.password ?? "correct-horse-battery-staple",
    role,
  };

  const res = await request(app).post("/api/v1/auth/register").send(payload);
  if (res.status !== 201) {
    throw new Error(`Failed to register test ${role}: ${JSON.stringify(res.body)}`);
  }
  return { user: res.body.user, tokens: res.body.tokens };
}
