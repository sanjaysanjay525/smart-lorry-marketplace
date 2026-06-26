# Weather Dashboard - Setup Guide

## Prerequisites

- Node.js 18+ or Docker & Docker Compose
- OpenWeatherMap API key (free tier available at https://openweathermap.org/api)

## Quick Start

### Option 1: Local Development (No Docker)

1. **Get an API Key**
   - Sign up at https://openweathermap.org/api
   - Copy your API key

2. **Setup Environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your API key:
   ```
   WEATHER_API_KEY=your_api_key_here
   ```

3. **Backend Setup**
   ```bash
   cd backend
   npm install
   npm run dev
   ```
   Backend runs on http://localhost:5000

4. **Frontend Setup (new terminal)**
   ```bash
   cd frontend
   npm install
   npm start
   ```
   Frontend runs on http://localhost:3000

### Option 2: Docker Compose

1. **Setup Environment**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` and add your API key

2. **Start Services**
   ```bash
   docker-compose up --build
   ```

3. **Access the App**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000/api

## API Endpoints

### Get Weather by City
```bash
GET /api/weather/city/:city
Example: /api/weather/city/London
```

### Get Weather by Coordinates
```bash
GET /api/weather/coordinates?lat=51.5074&lon=-0.1278
```

### Get 5-Day Forecast
```bash
GET /api/weather/forecast/:city
Example: /api/weather/forecast/London
```

### Health Check
```bash
GET /api/health
```

## Features

✅ Real-time weather data
✅ 5-day forecast
✅ Geolocation support
✅ Search by city name
✅ Detailed weather metrics (humidity, wind, pressure, etc.)
✅ Responsive design
✅ Error handling

## Troubleshooting

### "Invalid API key" error
- Verify your API key at https://openweathermap.org/api
- Ensure it's added correctly to `.env`
- Wait a few minutes after creating the key (takes time to activate)

### CORS errors
- Ensure `CORS_ORIGIN` in backend matches your frontend URL
- Default is `http://localhost:3000`

### Port already in use
- Backend: Change `PORT` in `.env` (default: 5000)
- Frontend: Use `PORT=3001 npm start`

## Development

### Backend
- Framework: Express.js
- Language: JavaScript (Node.js)
- API: OpenWeatherMap REST API

### Frontend
- Framework: React 18
- Language: JavaScript
- Styling: CSS3

## License

MIT
