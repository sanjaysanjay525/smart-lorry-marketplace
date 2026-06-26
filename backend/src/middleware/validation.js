const validateCity = (req, res, next) => {
  const { city } = req.params;
  if (!city || city.trim().length === 0) {
    return res.status(400).json({ error: 'City name is required' });
  }
  next();
};

const validateCoordinates = (req, res, next) => {
  const { lat, lon } = req.query;
  
  if (!lat || !lon) {
    return res.status(400).json({ error: 'Latitude and longitude are required' });
  }
  
  const latNum = parseFloat(lat);
  const lonNum = parseFloat(lon);
  
  if (isNaN(latNum) || isNaN(lonNum)) {
    return res.status(400).json({ error: 'Latitude and longitude must be valid numbers' });
  }
  
  if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    return res.status(400).json({ error: 'Invalid coordinates' });
  }
  
  next();
};

module.exports = { validateCity, validateCoordinates };
