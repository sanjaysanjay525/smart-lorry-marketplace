import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { RegisterRequest, LoginRequest, AuthTokens, UserProfile, UserRole } from '@slm/shared';
import { prisma } from '../lib/prisma';
import { config } from '../config';
import { AppError } from '../middleware/errorHandler';

const BCRYPT_SALT_ROUNDS = 10;

function formatUserProfile(user: any): UserProfile {
  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role as UserRole,
    name: user.name,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt.toISOString(),
  };
}

function generateTokens(userId: string, role: UserRole, email: string): AuthTokens {
  const accessToken = jwt.sign(
    { sub: userId, role, email },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiry as any }
  );

  const refreshToken = jwt.sign(
    { sub: userId, role, email },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry as any }
  );

  return { accessToken, refreshToken };
}

export async function register(data: RegisterRequest): Promise<{ user: UserProfile; tokens: AuthTokens }> {
  // Check if email or phone already exists
  const existingUser = await prisma.user.findFirst({
    where: {
      OR: [
        { email: data.email },
        { phone: data.phone },
      ],
    },
  });

  if (existingUser) {
    if (existingUser.email === data.email) {
      throw new AppError('Email is already registered', 409, 'CONFLICT_ERROR');
    }
    if (existingUser.phone === data.phone) {
      throw new AppError('Phone number is already registered', 409, 'CONFLICT_ERROR');
    }
  }

  // Hash password
  const passwordHash = await bcrypt.hash(data.password, BCRYPT_SALT_ROUNDS);

  // Create user
  const user = await prisma.user.create({
    data: {
      email: data.email,
      phone: data.phone,
      passwordHash,
      role: data.role,
      name: data.name,
    },
  });

  const tokens = generateTokens(user.id, user.role as UserRole, user.email);

  return {
    user: formatUserProfile(user),
    tokens,
  };
}

export async function login(data: LoginRequest): Promise<{ user: UserProfile; tokens: AuthTokens }> {
  // Find user by email
  const user = await prisma.user.findUnique({
    where: { email: data.email },
  });

  if (!user) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  // Compare password hash
  const isPasswordValid = await bcrypt.compare(data.password, user.passwordHash);
  if (!isPasswordValid) {
    throw new AppError('Invalid email or password', 401, 'UNAUTHORIZED');
  }

  const tokens = generateTokens(user.id, user.role as UserRole, user.email);

  return {
    user: formatUserProfile(user),
    tokens,
  };
}

export async function refreshTokens(token: string): Promise<AuthTokens> {
  try {
    const decoded = jwt.verify(token, config.jwt.refreshSecret) as {
      sub: string;
      role: UserRole;
      email: string;
    };

    // Verify user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.sub },
    });

    if (!user) {
      throw new AppError('User no longer exists', 401, 'UNAUTHORIZED');
    }

    return generateTokens(user.id, user.role as UserRole, user.email);
  } catch (error: any) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AppError('Refresh token has expired', 401, 'TOKEN_EXPIRED');
    }
    throw new AppError('Invalid refresh token', 401, 'UNAUTHORIZED');
  }
}

export async function getUserProfile(userId: string): Promise<UserProfile> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    throw new AppError('User not found', 404, 'NOT_FOUND');
  }

  return formatUserProfile(user);
}

export async function updateUserProfile(userId: string, data: { name?: string; avatarUrl?: string }): Promise<UserProfile> {
  const user = await prisma.user.update({
    where: { id: userId },
    data,
  });

  return formatUserProfile(user);
}
