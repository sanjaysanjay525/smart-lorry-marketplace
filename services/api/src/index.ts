import express from 'express';
import http from 'http';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { Server as SocketServer } from 'socket.io';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import { config } from './config';
import { errorHandler } from './middleware/errorHandler';

// Import Route modules
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import vehicleRoutes from './routes/vehicle.routes';
import driverRoutes from './routes/driver.routes';
import tripRoutes from './routes/trip.routes';
import loadRoutes from './routes/load.routes';
import adminRoutes from './routes/admin.routes';
import { negotiationRoutes } from './routes/negotiation.routes';
import { fastagRoutes } from './routes/fastag.routes';
import * as tripService from './services/trip.service';
import { Client as MapsClient } from '@googlemaps/google-maps-services-js';

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new SocketServer(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE'],
  },
});

// Setup middleware
app.use(helmet({
  contentSecurityPolicy: false, // Turn off for easier swagger dev access
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (config.nodeEnv !== 'test') {
  app.use(morgan('dev'));
}

// Swagger UI Configuration
const swaggerOptions: swaggerJsdoc.Options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Smart Lorry Marketplace API',
      version: '1.0.0',
      description: 'API documentation for the Smart Lorry Marketplace application',
    },
    servers: [
      {
        url: `http://localhost:${config.port}/api/v1`,
        description: 'Development Server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  },
  apis: [
    './src/routes/*.ts',
    './src/routes/*.js',
    './dist/routes/*.js',
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);

// Swagger Documentation route
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// API v1 routes mapping
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/vehicles', vehicleRoutes);
app.use('/api/v1/drivers', driverRoutes);
app.use('/api/v1/admin', adminRoutes);
app.use('/api/trips', tripRoutes);
app.use('/api/loads', loadRoutes);

app.use('/api/negotiations', negotiationRoutes);
app.use('/api/webhooks/fastag', fastagRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      env: config.nodeEnv,
    },
  });
});

const mapsClient = new MapsClient({});
const lastDirectionsCall = new Map<string, { timestamp: number; durationS: number; distanceM: number }>();

function approximateDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371e3;
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;
  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Socket.io connection logic
io.on('connection', (socket) => {
  if (config.nodeEnv !== 'test') {
    console.log(`[Socket] Client connected: ${socket.id}`);
  }

  socket.on('join_trip', (tripId: string) => {
    socket.join(`trip_${tripId}`);
    if (config.nodeEnv !== 'test') {
      console.log(`[Socket] Socket ${socket.id} joined trip_${tripId}`);
    }
  });

  socket.on('trip:location_ping', async (data: { tripId: string; latitude: number; longitude: number }) => {
    try {
      const { tripId, latitude, longitude } = data;
      
      // Save coordinate ping in DB
      await tripService.addLocationUpdate(tripId, latitude, longitude);

      const trip = await tripService.getTripDetails(tripId);
      if (!trip) return;

      // Calculate ETA metrics
      let durationS = 1800; // 30 mins default
      let distanceM = 15000; // 15 km default

      const now = Date.now();
      const cached = lastDirectionsCall.get(tripId);

      if (config.googleMapsApiKey && (!cached || now - cached.timestamp > 30000)) {
        try {
          const res = await mapsClient.directions({
            params: {
              origin: `${latitude},${longitude}`,
              destination: `${trip.destinationCoords.latitude},${trip.destinationCoords.longitude}`,
              key: config.googleMapsApiKey,
            }
          });
          const route = res.data.routes[0]?.legs[0];
          if (route) {
            durationS = route.duration.value;
            distanceM = route.distance.value;
            lastDirectionsCall.set(tripId, { timestamp: now, durationS, distanceM });
          }
        } catch (error) {
          console.warn('⚠️ Google Maps Directions failed inside socket handler', error);
        }
      } else if (cached) {
        const elapsedS = (now - cached.timestamp) / 1000;
        durationS = Math.max(0, cached.durationS - elapsedS);
        distanceM = cached.distanceM;
      } else {
        // Mock using approximation
        if (trip.destinationCoords) {
          const rawDistM = approximateDistance(
            latitude,
            longitude,
            trip.destinationCoords.latitude,
            trip.destinationCoords.longitude
          );
          distanceM = rawDistM * 1.3;
          durationS = distanceM / 11.11; // 40 km/h average
        }
      }

      // Broadcast location ping and ETA metrics to the trip room
      io.to(`trip_${tripId}`).emit('trip:location_update', {
        tripId,
        latitude,
        longitude,
        durationS: Math.round(durationS),
        distanceM: Math.round(distanceM),
      });
    } catch (err) {
      console.error('[Socket Error] trip:location_ping error:', err);
    }
  });

  socket.on('disconnect', () => {
    if (config.nodeEnv !== 'test') {
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    }
  });
});

// Handle unknown routes
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl}`,
    },
  });
});

// Global Error Handler
app.use(errorHandler);

// Start server
if (config.nodeEnv !== 'test') {
  server.listen(config.port, () => {
    console.log(`🚀 API Server running in ${config.nodeEnv} mode on port ${config.port}`);
    console.log(`📖 API Documentation available at http://localhost:${config.port}/api/docs`);
  });
}

export { app, server, io };
