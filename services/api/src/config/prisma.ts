import { PrismaClient } from "@prisma/client";
import { env } from "../config/env";

// Avoid exhausting Postgres connections from hot-reload in dev (tsx watch
// re-executes the module on every save, which would otherwise create a
// fresh PrismaClient — and a fresh connection pool — each time).
declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}

export const prisma =
  global.__prisma ??
  new PrismaClient({
    log: env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (env.NODE_ENV !== "production") {
  global.__prisma = prisma;
}
