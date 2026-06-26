const axios = require('axios');

const OPENWEATHER_API = 'https://api.openweathermap.org/data/2.5';
const API_KEY = process.env.WEATHER_API_KEY;

if (!API_KEY) {
  console.warn('⚠️  Warning: WEATHER_API_KEY not set in environment variables');
}

const weatherService = {
  fetchWeatherByCity: async (city) => {
    try {
      const response = await axios.get(`${OPENWEATHER_API}/weather`, {
        params: {
          q: city,
          appid: API_KEY,
          units: 'metric'
        }
      });
      return formatWeatherData(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`City "${city}" not found`);
      }
      throw error;
    }
  },

  fetchWeatherByCoordinates: async (lat, lon) => {
    try {
      const response = await axios.get(`${OPENWEATHER_API}/weather`, {
        params: {
          lat,
          lon,
          appid: API_KEY,
          units: 'metric'
        }
      });
      return formatWeatherData(response.data);
    } catch (error) {
      throw new Error(`Failed to fetch weather data: ${error.message}`);
    }
  },

  fetchForecast: async (city) => {
    try {
      const response = await axios.get(`${OPENWEATHER_API}/forecast`, {
        params: {
          q: city,
          appid: API_KEY,
          units: 'metric',
          cnt: 40 // 5 days with 3-hour intervals
        }
      });
      return formatForecastData(response.data);
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error(`City "${city}" not found`);
      }
      throw error;
    }
  }
};

function formatWeatherData(data) {
  return {
    city: data.name,
    country: data.sys.country,
    coordinates: {
      lat: data.coord.lat,
      lon: data.coord.lon
    },
    weather: {
      main: data.weather[0].main,
      description: data.weather[0].description,
      icon: data.weather[0].icon
    },
    temperature: {
      current: data.main.temp,
      feels_like: data.main.feels_like,
      min: data.main.temp_min,
      max: data.main.temp_max
    },
    humidity: data.main.humidity,
    pressure: data.main.pressure,
    visibility: data.visibility,
    wind: {
      speed: data.wind.speed,
      deg: data.wind.deg,
      gust: data.wind.gust || null
    },
    clouds: data.clouds.all,
    sunrise: new Date(data.sys.sunrise * 1000).toISOString(),
    sunset: new Date(data.sys.sunset * 1000).toISOString(),
    timestamp: new Date(data.dt * 1000).toISOString()
  };
}

function formatForecastData(data) {
  const forecasts = data.list.map(item => ({
    timestamp: new Date(item.dt * 1000).toISOString(),
    weather: {
      main: item.weather[0].main,
      description: item.weather[0].description,
      icon: item.weather[0].icon
    },
    temperature: {
      current: item.main.temp,
      feels_like: item.main.feels_like,
      min: item.main.temp_min,
      max: item.main.temp_max
    },
    humidity: item.main.humidity,
    wind_speed: item.wind.speed,
    rain: item.rain ? item.rain['3h'] : 0
  }));

  return {
    city: data.city.name,
    country: data.city.country,
    forecasts
  };
}

module.exports = weatherService;
