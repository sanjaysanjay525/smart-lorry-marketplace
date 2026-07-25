import { z } from 'zod';
import {
  registerSchema,
  loginSchema,
  vehicleCreateSchema,
  vehicleUpdateSchema,
  vehicleLocationSchema,
  driverCreateSchema,
  driverUpdateSchema,
  driverAvailabilitySchema,
  loadPostingCreateSchema,
  kycUploadSchema,
  disputeCreateSchema,
  disputeResolveSchema
} from './schemas';
import { UserRole, VehicleType, VehicleStatus, KycStatus, KycDocumentType, KycDocumentStatus } from './enums';

// Infer types from schemas
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type VehicleCreateRequest = z.infer<typeof vehicleCreateSchema>;
export type VehicleUpdateRequest = z.infer<typeof vehicleUpdateSchema>;
export type VehicleLocationRequest = z.infer<typeof vehicleLocationSchema>;
export type DriverCreateRequest = z.infer<typeof driverCreateSchema>;
export type DriverUpdateRequest = z.infer<typeof driverUpdateSchema>;
export type DriverAvailabilityRequest = z.infer<typeof driverAvailabilitySchema>;
export type LoadPostingCreateRequest = z.infer<typeof loadPostingCreateSchema>;

// Custom structures
export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  pagination?: PaginationMeta;
}

export interface UserProfile {
  id: string;
  email: string;
  phone: string;
  role: UserRole;
  name: string;
  avatarUrl: string | null;
  createdAt: string;
}

export interface LocationGeo {
  latitude: number;
  longitude: number;
}

export interface VehicleResponse {
  id: string;
  ownerId: string;
  type: VehicleType;
  capacityKg: number;
  registration: string;
  status: VehicleStatus;
  currentLocation: LocationGeo | null;
  baseRatePerKm: number;
  baseRatePerHour: number;
  createdAt: string;
  updatedAt: string;
}

export interface DriverResponse {
  id: string;
  userId: string;
  ownerId: string;
  vehicleId: string | null;
  licenseNumber: string;
  licenseExpiry: string;
  yearsExperience: number;
  kycStatus: KycStatus;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  updatedAt: string;
  user?: UserProfile;
  kycDocuments?: KycDocumentResponse[];
}

export interface DriverAvailabilityResponse {
  id: string;
  driverId: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface LoginResponse {
  user: UserProfile;
  tokens: AuthTokens;
}

export interface LoadPostingResponse {
  id: string;
  customerId: string;
  weightKg: number;
  preferredDate: string;
  status: string;
  originAddress: string;
  destinationAddress: string;
  directionBearing: number | null;
  originCoords?: LocationGeo;
  destinationCoords?: LocationGeo;
  createdAt: string;
  updatedAt: string;
}

export interface ReturnLoadMatchResponse {
  id: string;
  completedTripId: string;
  loadPostingId: string;
  matchScore: number;
  fuelSavingsEstimate: number;
  extraEarnings: number;
  status: string;
  createdAt: string;
  loadPosting?: LoadPostingResponse;
}

export interface OwnerEarningsWidgetResponse {
  totalReturnTrips: number;
  totalReturnEarnings: number;
  totalFuelSavings: number;
  efficiencyGainPercent: number;
  monthlyEarningsTrend: { month: string; amount: number }[];
}

export type KycUploadRequest = z.infer<typeof kycUploadSchema>;
export type DisputeCreateRequest = z.infer<typeof disputeCreateSchema>;
export type DisputeResolveRequest = z.infer<typeof disputeResolveSchema>;

export interface KycDocumentResponse {
  id: string;
  driverId: string;
  docType: KycDocumentType;
  storageKey: string;
  status: KycDocumentStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
  driver?: {
    id: string;
    licenseNumber: string;
    user?: {
      name: string;
      email: string;
    };
  };
}

export interface DisputeResponse {
  id: string;
  tripId: string;
  raisedBy: string;
  reason: string;
  status: string;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
  trip?: {
    id: string;
    type: string;
    priceTotal: number;
  };
  raiser?: {
    name: string;
    email: string;
  };
}

export interface AdminAnalyticsResponse {
  totalTrips: number;
  totalGmv: number;
  fillRatePercent: number;
  returnLoadAdoptionPercent: number;
  tripsByMonth: { month: string; count: number; gmv: number }[];
}

