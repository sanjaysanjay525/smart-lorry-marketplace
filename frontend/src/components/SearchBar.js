import React, { useState } from 'react';
import './SearchBar.css';

function SearchBar({ onSearch, onLocationClick, disabled }) {
  const [city, setCity] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (city.trim()) {
      onSearch(city);
      setCity('');
    }
  };

  return (
    <div className="search-bar">
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          placeholder="Search for a city..."
          value={city}
          onChange={(e) => setCity(e.target.value)}
          disabled={disabled}
          className="search-input"
        />
        <button type="submit" disabled={disabled} className="search-btn">
          🔍 Search
        </button>
        <button
          type="button"
          onClick={onLocationClick}
          disabled={disabled}
          className="location-btn"
        >
          📍 My Location
        </button>
      </form>
    </div>
  );
}

export default SearchBar;
