const express = require('express');
const router = express.Router();
const weatherController = require('../controllers/weatherController');
const { validateCity, validateCoordinates } = require('../middleware/validation');

// Get weather by city name
router.get('/city/:city', validateCity, weatherController.getWeatherByCity);

// Get weather by coordinates
router.get('/coordinates', validateCoordinates, weatherController.getWeatherByCoordinates);

// Get current location weather (requires geolocation from frontend)
router.get('/current', weatherController.getWeatherByCurrent);

// Get forecast for a city
router.get('/forecast/:city', validateCity, weatherController.getForecast);

module.exports = router;
