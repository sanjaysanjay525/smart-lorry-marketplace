import { prisma } from "../config/prisma";
import { hashPassword, verifyPassword } from "../utils/password";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  hashToken,
  accessTokenTtlSeconds,
} from "../utils/jwt";
import { AppError } from "../utils/AppError";
import type { RegisterInput, LoginInput } from "@smart-lorry/shared";
import type { AuthTokens, UserDTO } from "@smart-lorry/shared";
import { serializeUser } from "../utils/serializers";
import type { User } from "@prisma/client";

async function issueTokens(user: User): Promise<AuthTokens> {
  const accessToken = signAccessToken({ sub: user.id, role: user.role });
  const { token: refreshToken, jti, expiresAt } = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: { id: jti, userId: user.id, tokenHash: hashToken(refreshToken), expiresAt },
  });

  return { accessToken, refreshToken, expiresIn: accessTokenTtlSeconds() };
}

export async function register(input: RegisterInput): Promise<{ user: UserDTO; tokens: AuthTokens }> {
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email: input.email }, { phone: input.phone }] },
  });
  if (existing) {
    throw AppError.conflict("An account with this email or phone already exists");
  }

  const passwordHash = await hashPassword(input.password);
  const user = await prisma.user.create({
    data: {
      email: input.email,
      phone: input.phone,
      passwordHash,
      role: input.role,
      name: input.name,
    },
  });

  const tokens = await issueTokens(user);
  return { user: serializeUser(user), tokens };
}

export async function login(input: LoginInput): Promise<{ user: UserDTO; tokens: AuthTokens }> {
  const user = await prisma.user.findUnique({ where: { email: input.email } });
  if (!user) throw AppError.unauthorized("Invalid email or password");

  const valid = await verifyPassword(input.password, user.passwordHash);
  if (!valid) throw AppError.unauthorized("Invalid email or password");

  const tokens = await issueTokens(user);
  return { user: serializeUser(user), tokens };
}

// Rotation: the presented refresh token is revoked and a brand new pair is
// issued, so a stolen-but-unused token becomes useless the moment the
// legitimate client refreshes, and reuse of a revoked token is detectable.
export async function refresh(refreshTokenRaw: string): Promise<AuthTokens> {
  let payload;
  try {
    payload = verifyRefreshToken(refreshTokenRaw);
  } catch {
    throw AppError.unauthorized("Invalid or expired refresh token");
  }

  const stored = await prisma.refreshToken.findUnique({ where: { id: payload.jti } });
  if (!stored || stored.revokedAt || stored.expiresAt < new Date()) {
    throw AppError.unauthorized("Refresh token has been revoked or expired");
  }
  if (stored.tokenHash !== hashToken(refreshTokenRaw)) {
    throw AppError.unauthorized("Invalid refresh token");
  }

  const user = await prisma.user.findUnique({ where: { id: stored.userId } });
  if (!user) throw AppError.unauthorized("User no longer exists");

  await prisma.refreshToken.update({
    where: { id: stored.id },
    data: { revokedAt: new Date() },
  });

  return issueTokens(user);
}

export async function logout(refreshTokenRaw: string): Promise<void> {
  try {
    const payload = verifyRefreshToken(refreshTokenRaw);
    await prisma.refreshToken.updateMany({
      where: { id: payload.jti, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  } catch {
    // Already invalid/expired — logout is idempotent, nothing to do.
  }
}
