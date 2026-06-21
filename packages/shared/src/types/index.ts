import type { UserRole, VehicleType, VehicleStatus, KycStatus } from "../enums";

export interface ApiError {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
}

export interface Paginated<T> {
  data: T[];
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // seconds
}

export interface UserDTO {
  id: string;
  email: string;
  phone: string;
  name: string;
  role: UserRole;
  avatarUrl: string | null;
  createdAt: string;
}

export interface VehicleDTO {
  id: string;
  ownerId: string;
  type: VehicleType;
  capacityKg: number;
  registration: string;
  status: VehicleStatus;
  baseRatePerKm: number;
  baseRatePerHour: number;
  currentLocation: { lat: number; lng: number } | null;
  driver?: DriverPublicDTO | null;
  createdAt: string;
}

export interface DriverPublicDTO {
  id: string;
  name: string;
  avatarUrl: string | null;
  ratingAvg: number;
  yearsExperience: number;
  kycStatus: KycStatus;
}

export interface DriverDTO extends DriverPublicDTO {
  userId: string;
  ownerId: string;
  vehicleId: string | null;
  licenseNumber: string;
  licenseExpiry: string;
}

// Minimal shape returned by GET /users/lookup — intentionally excludes
// email/phone/avatar so it can't be used as a general PII lookup.
export interface DriverLookupDTO {
  id: string;
  name: string;
}
