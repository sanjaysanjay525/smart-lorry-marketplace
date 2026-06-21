import jwt from "jsonwebtoken";
import crypto from "crypto";
import { env } from "../config/env";
import type { UserRole } from "@smart-lorry/shared";

export interface AccessTokenPayload {
  sub: string; // user id
  role: UserRole;
}

export interface RefreshTokenPayload {
  sub: string; // user id
  jti: string; // unique token id, used to look up / revoke in DB
}

// jsonwebtoken's `expiresIn` option types a string value as a branded
// template-literal pattern (e.g. "15m"), which a plain `string` env value
// can't satisfy at the type level even when valid at runtime. Working in
// plain seconds sidesteps that entirely and is just as readable.
export function accessTokenTtlSeconds(): number {
  return parseDurationToSeconds(env.JWT_ACCESS_TTL, 900); // fallback: 15m
}

function refreshTokenTtlSeconds(): number {
  return env.JWT_REFRESH_TTL_DAYS * 24 * 60 * 60;
}

function parseDurationToSeconds(duration: string, fallbackSeconds: number): number {
  const match = /^(\d+)([smhd])$/.exec(duration);
  if (!match) return fallbackSeconds;
  const value = Number(match[1]);
  const unit = match[2] as "s" | "m" | "h" | "d";
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
  return value * multiplier;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: accessTokenTtlSeconds() });
}

export function signRefreshToken(userId: string): { token: string; jti: string; expiresAt: Date } {
  const jti = crypto.randomUUID();
  const ttlSeconds = refreshTokenTtlSeconds();
  const expiresAt = new Date(Date.now() + ttlSeconds * 1000);
  const token = jwt.sign({ sub: userId, jti } satisfies RefreshTokenPayload, env.JWT_REFRESH_SECRET, {
    expiresIn: ttlSeconds,
  });
  return { token, jti, expiresAt };
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as RefreshTokenPayload;
}

// We never store raw refresh tokens — only a SHA-256 hash, so a leaked DB
// dump can't be replayed as live sessions.
export function hashToken(token: string): string {
  return crypto.createHash("sha256").update(token).digest("hex");
}
