import React from 'react';
import { type LocationGeo } from '@slm/shared';

interface MapViewProps {
  origin: LocationGeo | null;
  destination: LocationGeo | null;
  currentLocation?: LocationGeo | null;
  className?: string;
}

export const MapView: React.FC<MapViewProps> = ({
  origin,
  destination,
  currentLocation,
  className = 'h-96 w-full rounded-xl',
}) => {
  // If either coordinate is missing, show a placeholder loading map state
  if (!origin || !destination) {
    return (
      <div className={`${className} bg-slate-900 flex flex-col items-center justify-center border border-border text-slate-500`}>
        <div className="text-4xl animate-pulse">🗺️</div>
        <p className="text-xs mt-3 font-medium">Entering coordinate endpoints...</p>
      </div>
    );
  }

  // Calculate coordinates mapping for relative SVG positioning
  // We want to scale coordinates to fit inside an SVG viewport (e.g. 400x300)
  const minLat = Math.min(origin.latitude, destination.latitude, currentLocation?.latitude ?? origin.latitude);
  const maxLat = Math.max(origin.latitude, destination.latitude, currentLocation?.latitude ?? origin.latitude);
  const minLng = Math.min(origin.longitude, destination.longitude, currentLocation?.longitude ?? origin.longitude);
  const maxLng = Math.max(origin.longitude, destination.longitude, currentLocation?.longitude ?? origin.longitude);

  const latRange = maxLat - minLat || 0.01;
  const lngRange = maxLng - minLng || 0.01;

  // Add 10% padding around the bounding box
  const paddingLat = latRange * 0.15;
  const paddingLng = lngRange * 0.15;

  const paddedMinLat = minLat - paddingLat;
  const paddedMaxLat = maxLat + paddingLat;
  const paddedMinLng = minLng - paddingLng;
  const paddedMaxLng = maxLng + paddingLng;

  const finalLatRange = paddedMaxLat - paddedMinLat;
  const finalLngRange = paddedMaxLng - paddedMinLng;

  // Map lat/lng coordinates to SVG 500x350 box coordinates
  const getSvgCoords = (coords: LocationGeo) => {
    // x maps to longitude (left-to-right)
    const x = ((coords.longitude - paddedMinLng) / finalLngRange) * 500;
    // y maps to latitude (top-to-bottom, so invert it)
    const y = 350 - ((coords.latitude - paddedMinLat) / finalLatRange) * 350;
    return { x: Math.round(x), y: Math.round(y) };
  };

  const originSvg = getSvgCoords(origin);
  const destSvg = getSvgCoords(destination);
  const currentSvg = currentLocation ? getSvgCoords(currentLocation) : null;

  return (
    <div className={`${className} bg-slate-950 border border-border rounded-xl overflow-hidden relative flex flex-col`}>
      {/* SVG Canvas Map Fallback */}
      <svg className="w-full h-full flex-1" viewBox="0 0 500 350">
        {/* Grid lines to represent streets */}
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />

        {/* Abstract roads */}
        <line x1="20" y1="120" x2="480" y2="120" stroke="rgba(255,255,255,0.04)" strokeWidth="6" strokeLinecap="round" />
        <line x1="80" y1="40" x2="80" y2="310" stroke="rgba(255,255,255,0.04)" strokeWidth="6" strokeLinecap="round" />
        <line x1="420" y1="40" x2="420" y2="310" stroke="rgba(255,255,255,0.04)" strokeWidth="6" strokeLinecap="round" />
        <line x1="20" y1="230" x2="480" y2="230" stroke="rgba(255,255,255,0.04)" strokeWidth="6" strokeLinecap="round" />

        {/* Route Line */}
        <line
          x1={originSvg.x}
          y1={originSvg.y}
          x2={destSvg.x}
          y2={destSvg.y}
          stroke="var(--color-brand)"
          strokeWidth="3"
          strokeDasharray="5,5"
          className="animate-[dash_20s_linear_infinite]"
        />

        {/* Origin Marker */}
        <circle cx={originSvg.x} cy={originSvg.y} r="8" fill="#10B981" filter="drop-shadow(0px 0px 6px #10B981)" />
        <text x={originSvg.x + 12} y={originSvg.y + 4} fill="#10B981" className="text-[10px] font-bold">A (Pickup)</text>

        {/* Destination Marker */}
        <circle cx={destSvg.x} cy={destSvg.y} r="8" fill="#EF4444" filter="drop-shadow(0px 0px 6px #EF4444)" />
        <text x={destSvg.x + 12} y={destSvg.y + 4} fill="#EF4444" className="text-[10px] font-bold">B (Dropoff)</text>

        {/* Live Tracking Truck Marker */}
        {currentSvg ? (
          <g transform={`translate(${currentSvg.x - 12}, ${currentSvg.y - 12})`}>
            {/* Pulsing radar circle */}
            <circle cx="12" cy="12" r="14" fill="none" stroke="var(--color-brand)" strokeWidth="1" className="animate-ping origin-center" />
            <circle cx="12" cy="12" r="10" fill="var(--color-brand)" opacity="0.15" />
            {/* Truck symbol */}
            <text x="3" y="18" className="text-lg">🚚</text>
          </g>
        ) : (
          /* If no active location update has run yet, place lorry stub at origin */
          <g transform={`translate(${originSvg.x - 12}, ${originSvg.y - 12})`}>
            <circle cx="12" cy="12" r="10" fill="var(--color-brand)" opacity="0.15" />
            <text x="3" y="18" className="text-lg opacity-60">🚚</text>
          </g>
        )}
      </svg>
      <div className="absolute bottom-2 left-2 bg-slate-900/95 border border-border px-2 py-1 rounded text-[9px] font-bold text-muted-foreground uppercase tracking-wider">
        🖥️ Dev Mock Canvas Map
      </div>
    </div>
  );
};
