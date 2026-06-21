/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        paper: "#F6F2E7", // manifest paper background
        ink: "#211C16", // warm near-black text
        night: {
          DEFAULT: "#1B2A4A", // highway-night navy — sidebar/header chrome
          deep: "#121D35",
          light: "#2A3F68",
        },
        marigold: {
          DEFAULT: "#F2A93B", // primary accent — truck-art saffron
          dark: "#D4901F",
        },
        vermilion: {
          DEFAULT: "#C7402B", // secondary accent — truck-art red
          dark: "#A6331F",
        },
        highway: {
          green: "#2F8F6E", // road-sign green — success/available
        },
        slate: {
          DEFAULT: "#6B6457", // muted warm grey text
        },
        line: "#DDD6C4", // hairline dividers on paper
      },
      fontFamily: {
        display: ["Khand", "sans-serif"],
        body: ["Inter", "sans-serif"],
        mono: ["IBM Plex Mono", "monospace"],
      },
      backgroundImage: {
        "dash-line":
          "repeating-linear-gradient(to bottom, transparent, transparent 6px, #DDD6C4 6px, #DDD6C4 12px)",
      },
    },
  },
  plugins: [],
};
