import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";

const app = createApp();

const server = app.listen(env.PORT, () => {
  console.log(`🚛 Smart Lorry Marketplace API listening on :${env.PORT} (${env.NODE_ENV})`);
  console.log(`   Docs: http://localhost:${env.PORT}/api/docs`);
});

async function shutdown(signal: string) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  server.close(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
  // Force-exit if something hangs the connections for too long.
  setTimeout(() => process.exit(1), 10_000).unref();
}

process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
