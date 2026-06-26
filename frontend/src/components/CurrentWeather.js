import React from 'react';
import './CurrentWeather.css';

function CurrentWeather({ data }) {
  const getWeatherIcon = (iconCode) => {
    const iconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    return iconUrl;
  };

  const getWindDirection = (degrees) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    return directions[Math.round(degrees / 45) % 8];
  };

  return (
    <div className="current-weather">
      <div className="weather-header">
        <h2>
          {data.city}, {data.country}
        </h2>
        <p className="timestamp">
          {new Date(data.timestamp).toLocaleString()}
        </p>
      </div>

      <div className="weather-content">
        <div className="weather-main">
          <img
            src={getWeatherIcon(data.weather.icon)}
            alt={data.weather.description}
            className="weather-icon"
          />
          <div className="temperature-section">
            <div className="current-temp">{Math.round(data.temperature.current)}°C</div>
            <p className="weather-description">{data.weather.description}</p>
            <p className="feels-like">
              Feels like {Math.round(data.temperature.feels_like)}°C
            </p>
          </div>
        </div>

        <div className="weather-grid">
          <div className="weather-card">
            <span className="label">Min Temp</span>
            <span className="value">{Math.round(data.temperature.min)}°C</span>
          </div>
          <div className="weather-card">
            <span className="label">Max Temp</span>
            <span className="value">{Math.round(data.temperature.max)}°C</span>
          </div>
          <div className="weather-card">
            <span className="label">Humidity</span>
            <span className="value">{data.humidity}%</span>
          </div>
          <div className="weather-card">
            <span className="label">Pressure</span>
            <span className="value">{data.pressure} hPa</span>
          </div>
          <div className="weather-card">
            <span className="label">Wind Speed</span>
            <span className="value">{data.wind.speed} m/s</span>
          </div>
          <div className="weather-card">
            <span className="label">Wind Direction</span>
            <span className="value">{getWindDirection(data.wind.deg)}</span>
          </div>
          <div className="weather-card">
            <span className="label">Visibility</span>
            <span className="value">{(data.visibility / 1000).toFixed(1)} km</span>
          </div>
          <div className="weather-card">
            <span className="label">Cloud Coverage</span>
            <span className="value">{data.clouds}%</span>
          </div>
        </div>

        <div className="sun-times">
          <div className="sun-info">
            <span className="sun-label">🌅 Sunrise</span>
            <span className="sun-time">
              {new Date(data.sunrise).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
          <div className="sun-info">
            <span className="sun-label">🌆 Sunset</span>
            <span className="sun-time">
              {new Date(data.sunset).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CurrentWeather;
