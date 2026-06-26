import { Server as SocketServer } from "socket.io";
import { createAdapter } from "@socket.io/redis-adapter";
import Redis from "ioredis";
import { verifyAccessToken } from "../utils/jwt";
import { prisma } from "../config/prisma";
import { setVehicleLocation } from "../utils/geo";
import { reverseGeocode } from "../utils/reverseGeocode";
import { sendSms } from "../services/sms.service";

export function initTrackingGateway(httpServer: any) {
  const io = new SocketServer(httpServer, {
    cors: { origin: process.env.CORS_ORIGIN, credentials: true },
    path: "/ws",
  });

  // Redis adapter for multi-instance pub/sub
  const pubClient = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  const subClient = pubClient.duplicate();
  io.adapter(createAdapter(pubClient, subClient));

  // Auth middleware — require valid JWT on connection
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    try {
      const payload = verifyAccessToken(token);
      (socket as any).user = payload;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const user = (socket as any).user as { id: string; role: string };

    // Mill owner or lorry owner joins a trip room to receive updates
    socket.on("subscribe_trip", async (tripId: string) => {
      try {
        const trip = await prisma.trip.findUnique({ where: { id: tripId } });
        if (!trip) return socket.emit("error", "Trip not found");
        if (trip.ownerId !== user.id && trip.millId !== user.id) {
          return socket.emit("error", "Not authorised for this trip");
        }
        socket.join(`trip:${tripId}`);
        socket.emit("subscribed", { tripId });
      } catch (err) {
        socket.emit("error", "Failed to subscribe to trip");
      }
    });

    // Lorry owner sends GPS ping
    socket.on("location_ping", async (data: { vehicleId: string; lat: number; lng: number; heading?: number; speed?: number }) => {
      if (user.role !== "owner") return;

      try {
        // Validate vehicle belongs to this owner
        const vehicle = await prisma.vehicle.findFirst({
          where: { id: data.vehicleId, ownerId: user.id },
        });
        if (!vehicle) return;

        // Persist to PostGIS
        await setVehicleLocation(data.vehicleId, { lat: data.lat, lng: data.lng });

        // Find the active trip for this vehicle
        const trip = await prisma.trip.findFirst({
          where: {
            vehicleId: data.vehicleId,
            status: { in: ["picked_up", "in_transit"] },
          },
          include: { mill: true, load: true },
        });

        if (!trip) return;

        // Broadcast to everyone in the trip room
        io.to(`trip:${trip.id}`).emit("location_update", {
          tripId: trip.id,
          lat: data.lat,
          lng: data.lng,
          heading: data.heading ?? null,
          speed: data.speed ?? null,
          timestamp: new Date().toISOString(),
        });

        // SMS rate-limit: max 1 per 30 min
        const now = Date.now();
        const lastSms = trip.lastSmsSentAt?.getTime() ?? 0;
        if (now - lastSms > 30 * 60 * 1000) {
          const city = await reverseGeocode(data.lat, data.lng);
          const body = `Your load (${trip.load.materialType}) — Vehicle ${vehicle.registration} is near ${city}, heading to ${trip.load.dropAddress}. (${new Date().toLocaleTimeString("en-IN", { timeZone: "Asia/Kolkata" })})`;
          sendSms(trip.mill.phone, "in_transit", body, trip.id).catch(() => {});
          await prisma.trip.update({
            where: { id: trip.id },
            data: { lastSmsSentAt: new Date() },
          });
        }
      } catch (err) {
        console.error("Error processing location ping:", err);
      }
    });
  });

  return io;
}
