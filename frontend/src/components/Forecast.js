import React from 'react';
import './Forecast.css';

function Forecast({ data }) {
  const getWeatherIcon = (iconCode) => {
    return `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
  };

  // Group forecasts by day
  const groupedForecasts = data.forecasts.reduce((acc, forecast) => {
    const date = new Date(forecast.timestamp).toLocaleDateString();
    if (!acc[date]) {
      acc[date] = [];
    }
    acc[date].push(forecast);
    return acc;
  }, {});

  return (
    <div className="forecast">
      <h2>5-Day Forecast</h2>
      <div className="forecast-container">
        {Object.entries(groupedForecasts).map(([date, forecasts]) => {
          const avgTemp = Math.round(
            forecasts.reduce((sum, f) => sum + f.temperature.current, 0) /
              forecasts.length
          );
          const mainWeather = forecasts[0].weather.main;
          const mainIcon = forecasts[0].weather.icon;
          const totalRain = forecasts.reduce((sum, f) => sum + (f.rain || 0), 0);

          return (
            <div key={date} className="forecast-day">
              <h3>{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</h3>
              <img
                src={getWeatherIcon(mainIcon)}
                alt={mainWeather}
                className="forecast-icon"
              />
              <p className="forecast-weather">{mainWeather}</p>
              <div className="forecast-details">
                <span className="temp">{avgTemp}°C</span>
                {totalRain > 0 && <span className="rain">🌧️ {totalRain.toFixed(1)}mm</span>}
              </div>
              <div className="hourly-forecast">
                {forecasts.slice(0, 4).map((f, idx) => (
                  <div key={idx} className="hourly-item">
                    <span className="time">
                      {new Date(f.timestamp).getHours()}:00
                    </span>
                    <img
                      src={getWeatherIcon(f.weather.icon)}
                      alt={f.weather.description}
                      className="hourly-icon"
                    />
                    <span className="hourly-temp">{Math.round(f.temperature.current)}°C</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Forecast;
