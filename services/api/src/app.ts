import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";
import swaggerUi from "swagger-ui-express";
import swaggerJsdoc from "swagger-jsdoc";

import { env } from "./config/env";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { vehiclesRouter } from "./routes/vehicles.routes";
import { loadRouter } from "./routes/load.routes";
import { tripRouter } from "./routes/trip.routes";
import { adminRouter } from "./routes/admin.routes";
import { notFoundHandler, errorHandler } from "./middleware/errorHandler";

export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(compression());
  app.use(express.json({ limit: "1mb" }));
  app.use(express.urlencoded({ extended: true }));
  if (env.NODE_ENV !== "test") {
    app.use(morgan(env.NODE_ENV === "development" ? "dev" : "combined"));
  }

  // Generous global ceiling; auth endpoints get a tighter limit below to
  // slow down credential-stuffing / registration-spam attempts.
  app.use(
    rateLimit({
      windowMs: 15 * 60 * 1000,
      limit: 600,
      standardHeaders: true,
      legacyHeaders: false,
    })
  );
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 30,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: { code: "RATE_LIMITED", message: "Too many attempts, try again later" } },
  });

  app.get("/health", (_req, res) => {
    res.json({ status: "ok", env: env.NODE_ENV, time: new Date().toISOString() });
  });

  const swaggerSpec = swaggerJsdoc({
    definition: {
      openapi: "3.0.0",
      info: { title: "Smart Lorry Marketplace API", version: "2.0.0" },
      servers: [{ url: "/api/v1" }],
    },
    apis: ["./src/routes/*.ts"],
  });
  app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

  app.use("/api/v1/auth", authLimiter, authRouter);
  app.use("/api/v1/users", usersRouter);
  app.use("/api/v1/vehicles", vehiclesRouter);
  app.use("/api/v1/loads", loadRouter);
  app.use("/api/v1/trips", tripRouter);
  app.use("/api/v1/admin", adminRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
