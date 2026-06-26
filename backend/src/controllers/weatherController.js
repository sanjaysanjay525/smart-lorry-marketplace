const weatherService = require('../services/weatherService');

const weatherController = {
  getWeatherByCity: async (req, res) => {
    const { city } = req.params;
    const data = await weatherService.fetchWeatherByCity(city);
    res.json(data);
  },

  getWeatherByCoordinates: async (req, res) => {
    const { lat, lon } = req.query;
    const data = await weatherService.fetchWeatherByCoordinates(lat, lon);
    res.json(data);
  },

  getWeatherByCurrent: async (req, res) => {
    const { lat, lon } = req.query;
    if (!lat || !lon) {
      return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    const data = await weatherService.fetchWeatherByCoordinates(lat, lon);
    res.json(data);
  },

  getForecast: async (req, res) => {
    const { city } = req.params;
    const data = await weatherService.fetchForecast(city);
    res.json(data);
  }
};

module.exports = weatherController;
