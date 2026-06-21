// Sensible test defaults so `npm test` works with zero .env setup beyond
// DATABASE_URL pointing at a disposable test database. Override via a real
// .env.test if you want different values.
process.env.NODE_ENV = "test";
process.env.JWT_ACCESS_SECRET ??= "test-access-secret-please-change-1234567890";
process.env.JWT_REFRESH_SECRET ??= "test-refresh-secret-please-change-0987654321";
process.env.JWT_ACCESS_TTL ??= "15m";
process.env.JWT_REFRESH_TTL_DAYS ??= "30";
process.env.DATABASE_URL ??=
  "postgresql://slm:slm_dev_password@localhost:5432/smart_lorry_marketplace_test?schema=public";

import { prisma } from "../src/config/prisma";

// Truncate every app table between tests so each test starts from a clean
// slate without paying for a full migrate reset each time.
export async function resetDatabase() {
  await prisma.$transaction([
    prisma.refreshToken.deleteMany(),
    prisma.driverAvailability.deleteMany(),
    prisma.driver.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

beforeEach(async () => {
  await resetDatabase();
});

afterAll(async () => {
  await prisma.$disconnect();
});
