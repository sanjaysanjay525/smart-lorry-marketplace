export enum UserRole {
  customer = 'customer',
  owner = 'owner',
  driver = 'driver',
  admin = 'admin',
}

export enum VehicleType {
  mini_truck = 'mini_truck',
  lcv = 'lcv', // Light Commercial Vehicle
  hcv = 'hcv', // Heavy Commercial Vehicle
  trailer = 'trailer',
  tanker = 'tanker',
  flatbed = 'flatbed',
  refrigerated = 'refrigerated',
  open_body = 'open_body',
}

export enum VehicleStatus {
  available = 'available',
  busy = 'busy',
  offline = 'offline',
}

export enum KycStatus {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
}

export enum TripStatus {
  requested = 'requested',
  accepted = 'accepted',
  en_route = 'en_route',
  in_progress = 'in_progress',
  delivered = 'delivered',
  cancelled = 'cancelled',
}

export enum TripType {
  rental = 'rental',
  return_leg = 'return_leg',
  shared = 'shared',
}

export enum PricingMode {
  hourly = 'hourly',
  trip = 'trip',
}

export enum KycDocumentType {
  aadhaar = 'aadhaar',
  license = 'license',
  background_check = 'background_check',
}

export enum KycDocumentStatus {
  pending = 'pending',
  approved = 'approved',
  rejected = 'rejected',
}

