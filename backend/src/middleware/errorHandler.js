const errorHandler = (err, req, res, next) => {
  console.error('❌ Error:', err.message);

  if (err.message.includes('not found')) {
    return res.status(404).json({ error: err.message });
  }

  if (err.message.includes('required')) {
    return res.status(400).json({ error: err.message });
  }

  if (err.response?.status === 401) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  res.status(500).json({ error: 'Internal server error' });
};

module.exports = errorHandler;
