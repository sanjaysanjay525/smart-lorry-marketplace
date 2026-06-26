import { createServer } from "http";
import { createApp } from "./app";
import { env } from "./config/env";
import { prisma } from "./config/prisma";
import { initTrackingGateway } from "./ws/trackingGateway";

const app = createApp();
const httpServer = createServer(app);
const io = initTrackingGateway(httpServer);

// Store io instance in app so express routers can access it
app.set("io", io);

const server = httpServer.listen(env.PORT, () => {
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
