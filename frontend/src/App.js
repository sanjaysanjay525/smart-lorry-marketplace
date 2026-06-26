import React, { useState, useEffect } from 'react';
import SearchBar from './components/SearchBar';
import CurrentWeather from './components/CurrentWeather';
import Forecast from './components/Forecast';
import './App.css';

function App() {
  const [weather, setWeather] = useState(null);
  const [forecast, setForecast] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [lastSearchedCity, setLastSearchedCity] = useState('London');

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  const fetchWeather = async (city) => {
    setLoading(true);
    setError(null);
    try {
      const [weatherRes, forecastRes] = await Promise.all([
        fetch(`${API_URL}/weather/city/${city}`),
        fetch(`${API_URL}/weather/forecast/${city}`)
      ]);

      if (!weatherRes.ok || !forecastRes.ok) {
        throw new Error('Failed to fetch weather data');
      }

      const weatherData = await weatherRes.json();
      const forecastData = await forecastRes.json();

      setWeather(weatherData);
      setForecast(forecastData);
      setLastSearchedCity(city);
    } catch (err) {
      setError(err.message || 'Failed to fetch weather data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch geolocation weather
  const fetchLocationWeather = async () => {
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const response = await fetch(
            `${API_URL}/weather/coordinates?lat=${latitude}&lon=${longitude}`
          );
          if (!response.ok) throw new Error('Failed to fetch weather');
          const data = await response.json();
          setWeather(data);
        } catch (err) {
          setError('Failed to fetch weather for your location');
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError('Unable to access your location');
        setLoading(false);
      }
    );
  };

  useEffect(() => {
    fetchWeather(lastSearchedCity);
  }, []);

  return (
    <div className="app">
      <header className="app-header">
        <h1>🌤️ Weather Dashboard</h1>
        <p>Get real-time weather information for any location</p>
      </header>

      <main className="app-main">
        <SearchBar
          onSearch={fetchWeather}
          onLocationClick={fetchLocationWeather}
          disabled={loading}
        />

        {error && <div className="error-message">{error}</div>}
        {loading && <div className="loading">Loading weather data...</div>}

        {weather && !loading && (
          <>
            <CurrentWeather data={weather} />
            {forecast && <Forecast data={forecast} />}
          </>
        )}
      </main>

      <footer className="app-footer">
        <p>Powered by OpenWeatherMap API</p>
      </footer>
    </div>
  );
}

export default App;
