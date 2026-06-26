# Weather Dashboard API Documentation

## Base URL
```
http://localhost:5000/api
```

## Endpoints

### 1. Get Weather by City Name

**Endpoint:** `GET /weather/city/:city`

**Parameters:**
- `city` (string, required) - City name

**Example Request:**
```bash
curl http://localhost:5000/api/weather/city/London
```

**Example Response:**
```json
{
  "city": "London",
  "country": "GB",
  "coordinates": {
    "lat": 51.5085,
    "lon": -0.1257
  },
  "weather": {
    "main": "Clouds",
    "description": "overcast clouds",
    "icon": "04d"
  },
  "temperature": {
    "current": 15.2,
    "feels_like": 14.8,
    "min": 13.5,
    "max": 16.8
  },
  "humidity": 72,
  "pressure": 1013,
  "visibility": 10000,
  "wind": {
    "speed": 4.1,
    "deg": 240,
    "gust": 7.2
  },
  "clouds": 90,
  "sunrise": "2024-06-26T05:05:30.000Z",
  "sunset": "2024-06-26T21:15:45.000Z",
  "timestamp": "2024-06-26T12:30:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request (missing/invalid parameters)
- `404` - City not found
- `500` - Server error

---

### 2. Get Weather by Coordinates

**Endpoint:** `GET /weather/coordinates`

**Query Parameters:**
- `lat` (number, required) - Latitude (-90 to 90)
- `lon` (number, required) - Longitude (-180 to 180)

**Example Request:**
```bash
curl "http://localhost:5000/api/weather/coordinates?lat=51.5074&lon=-0.1278"
```

**Example Response:** (Same as city endpoint)

**Status Codes:**
- `200` - Success
- `400` - Bad request (invalid coordinates)
- `500` - Server error

---

### 3. Get Current Location Weather

**Endpoint:** `GET /weather/current`

**Query Parameters:**
- `lat` (number, required) - Latitude
- `lon` (number, required) - Longitude

**Note:** This endpoint uses geolocation from the browser. Pass coordinates obtained from `navigator.geolocation`.

**Example Request:**
```bash
curl "http://localhost:5000/api/weather/current?lat=51.5074&lon=-0.1278"
```

---

### 4. Get 5-Day Forecast

**Endpoint:** `GET /weather/forecast/:city`

**Parameters:**
- `city` (string, required) - City name

**Example Request:**
```bash
curl http://localhost:5000/api/weather/forecast/London
```

**Example Response:**
```json
{
  "city": "London",
  "country": "GB",
  "forecasts": [
    {
      "timestamp": "2024-06-26T15:00:00.000Z",
      "weather": {
        "main": "Clouds",
        "description": "overcast clouds",
        "icon": "04d"
      },
      "temperature": {
        "current": 16.5,
        "feels_like": 16.1,
        "min": 15.2,
        "max": 17.8
      },
      "humidity": 70,
      "wind_speed": 3.8,
      "rain": 0
    },
    {
      "timestamp": "2024-06-26T18:00:00.000Z",
      "weather": {
        "main": "Rain",
        "description": "light rain",
        "icon": "10d"
      },
      "temperature": {
        "current": 14.2,
        "feels_like": 13.8,
        "min": 13.5,
        "max": 15.2
      },
      "humidity": 82,
      "wind_speed": 5.1,
      "rain": 2.5
    }
  ]
}
```

**Status Codes:**
- `200` - Success
- `400` - Bad request
- `404` - City not found
- `500` - Server error

---

### 5. Health Check

**Endpoint:** `GET /health`

**Example Request:**
```bash
curl http://localhost:5000/api/health
```

**Example Response:**
```json
{
  "status": "OK",
  "message": "Weather Dashboard API is running"
}
```

---

## Error Responses

All errors follow this format:

```json
{
  "error": "Error message describing what went wrong"
}
```

**Common Errors:**
- `City "Paris" not found` - City name doesn't exist
- `Latitude and longitude are required` - Missing coordinates
- `Invalid coordinates` - Coordinates out of range
- `Internal server error` - Server-side error

---

## Weather Icons

The API returns weather icon codes. View the icon:

```
https://openweathermap.org/img/wn/{iconCode}@2x.png
```

Examples:
- `01d` - Clear sky day
- `01n` - Clear sky night
- `02d` - Few clouds day
- `04d` - Overcast clouds
- `10d` - Rain
- `13d` - Snow

---

## Rate Limiting

OpenWeatherMap free tier has rate limits:
- **Free**: 1000 calls/day
- **Professional**: Higher limits available

---

## Data Units

- **Temperature**: Celsius (°C)
- **Wind Speed**: Meters per second (m/s)
- **Pressure**: Hectopascals (hPa)
- **Visibility**: Meters (m)
- **Rainfall**: Millimeters (mm)

