import { z } from 'zod';
import { UserRole, VehicleType, VehicleStatus, KycStatus, KycDocumentType } from './enums';

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/, 'Invalid phone number format (E.164)'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
  name: z.string().min(2, 'Name must be at least 2 characters long'),
  role: z.nativeEnum(UserRole, { required_error: 'Role is required' }),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const vehicleCreateSchema = z.object({
  type: z.nativeEnum(VehicleType, { required_error: 'Vehicle type is required' }),
  capacityKg: z.number().positive('Capacity must be a positive number'),
  registration: z.string().min(3, 'Registration number must be at least 3 characters long'),
  baseRatePerKm: z.number().nonnegative('Base rate per km must be a non-negative number'),
  baseRatePerHour: z.number().nonnegative('Base rate per hour must be a non-negative number'),
});

export const vehicleUpdateSchema = vehicleCreateSchema.partial().extend({
  status: z.nativeEnum(VehicleStatus).optional(),
});

export const vehicleLocationSchema = z.object({
  latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
  longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
});

export const driverCreateSchema = z.object({
  licenseNumber: z.string().min(5, 'License number must be at least 5 characters long'),
  licenseExpiry: z.string().datetime('Invalid license expiry date format'),
  yearsExperience: z.number().int().nonnegative('Years of experience must be non-negative'),
});

export const driverUpdateSchema = driverCreateSchema.partial().extend({
  kycStatus: z.nativeEnum(KycStatus).optional(),
});

export const driverAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6, 'Day of week must be between 0 (Sunday) and 6 (Saturday)'),
  startTime: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, 'Start time must be in HH:mm format'),
  endTime: z.string().regex(/^([0-1]\d|2[0-3]):([0-5]\d)$/, 'End time must be in HH:mm format'),
}).refine((data: any) => {
  const [startH, startM] = data.startTime.split(':').map(Number);
  const [endH, endM] = data.endTime.split(':').map(Number);
  return (endH > startH) || (endH === startH && endM > startM);
}, {
  message: 'End time must be after start time',
  path: ['endTime'],
});

export const loadPostingCreateSchema = z.object({
  weightKg: z.number().positive('Weight must be positive'),
  preferredDate: z.string().datetime('Preferred date must be a valid ISO datetime string'),
  originAddress: z.string().min(3, 'Origin address must be at least 3 characters'),
  originCoords: z.object({
    latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
    longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  }),
  destinationAddress: z.string().min(3, 'Destination address must be at least 3 characters'),
  destinationCoords: z.object({
    latitude: z.number().min(-90).max(90, 'Latitude must be between -90 and 90'),
    longitude: z.number().min(-180).max(180, 'Longitude must be between -180 and 180'),
  }),
});

export const kycUploadSchema = z.object({
  docType: z.nativeEnum(KycDocumentType, { required_error: 'Document type is required' }),
  documentData: z.string().min(1, 'Document data/URL is required'),
});

export const disputeCreateSchema = z.object({
  tripId: z.string().uuid('Invalid trip ID'),
  reason: z.string().min(10, 'Reason must be at least 10 characters long'),
});

export const disputeResolveSchema = z.object({
  resolution: z.string().min(5, 'Resolution details must be at least 5 characters long'),
});
