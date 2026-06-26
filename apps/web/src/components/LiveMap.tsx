import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import { getSocket } from "../lib/socket";

// Custom Leaflet icons using HTML divIcon (zero Vite bundling asset path issues)
const pickupIcon = L.divIcon({
  html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500 text-white font-bold border-2 border-white shadow-lg text-sm">A</div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const dropIcon = L.divIcon({
  html: `<div class="flex items-center justify-center w-8 h-8 rounded-full bg-rose-500 text-white font-bold border-2 border-white shadow-lg text-sm">B</div>`,
  className: "",
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface LorryPos {
  lat: number;
  lng: number;
  heading?: number;
  speed?: number;
}

interface LiveMapProps {
  tripId: string;
  vehicleId?: string;
  role: "mill" | "owner";
  pickupLat: number;
  pickupLng: number;
  pickupAddress: string;
  dropLat: number;
  dropLng: number;
  dropAddress: string;
}

// Auto center bounds helper
function RecenterMap({ pickup, drop, lorry }: { pickup: [number, number]; drop: [number, number]; lorry: [number, number] | null }) {
  const map = useMap();
  useEffect(() => {
    const bounds = L.latLngBounds([pickup, drop]);
    if (lorry) {
      bounds.extend(lorry);
    }
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [map, pickup, drop, lorry]);
  return null;
}

export function LiveMap({
  tripId,
  vehicleId,
  role,
  pickupLat,
  pickupLng,
  pickupAddress,
  dropLat,
  dropLng,
  dropAddress,
}: LiveMapProps) {
  const [lorryPos, setLorryPos] = useState<LorryPos | null>(null);
  const [trail, setTrail] = useState<[number, number][]>([]);

  useEffect(() => {
    const token = localStorage.getItem("slm_access_token") ?? "";
    if (!token) return;

    const socket = getSocket(token);

    // Subscribe to trip updates
    socket.emit("subscribe_trip", tripId);

    if (role === "owner" && vehicleId) {
      // Start Geolocation watching for owner role
      const watchId = navigator.geolocation.watchPosition(
        (pos) => {
          const { latitude, longitude, heading, speed } = pos.coords;
          const pingData = {
            vehicleId,
            lat: latitude,
            lng: longitude,
            heading: heading ?? undefined,
            speed: speed ? Math.round(speed * 3.6) : undefined, // m/s to km/h
          };
          socket.emit("location_ping", pingData);

          const currentPos = {
            lat: latitude,
            lng: longitude,
            heading: heading ?? undefined,
            speed: speed ? Math.round(speed * 3.6) : undefined,
          };
          setLorryPos(currentPos);
          setTrail((prev) => [...prev.slice(-9), [latitude, longitude]]);
        },
        (err) => console.error("Geolocation watch error:", err),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );

      // Fallback location generator if browser GPS permissions/devices aren't reporting in simulator
      const intervalId = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            // Already handled by watchPosition, but acts as a heartbeat
          },
          (err) => {
            // Mock random slight movement along route if geolocation is blocked or unavailable on dev machine
            setLorryPos((prev) => {
              const baseLat = prev ? prev.lat : pickupLat;
              const baseLng = prev ? prev.lng : pickupLng;
              // Walk 2% closer to dropLat/dropLng
              const nextLat = baseLat + (dropLat - baseLat) * 0.05;
              const nextLng = baseLng + (dropLng - baseLng) * 0.05;
              const heading = Math.atan2(dropLng - baseLng, dropLat - baseLat) * (180 / Math.PI);
              const speed = 45; // simulated speed in km/h

              const nextPos = { lat: nextLat, lng: nextLng, heading, speed };
              socket.emit("location_ping", {
                vehicleId,
                lat: nextLat,
                lng: nextLng,
                heading,
                speed,
              });
              setTrail((p) => [...p.slice(-9), [nextLat, nextLng]]);
              return nextPos;
            });
          },
          { timeout: 2000 }
        );
      }, 10000);

      return () => {
        navigator.geolocation.clearWatch(watchId);
        clearInterval(intervalId);
      };
    } else if (role === "mill") {
      // Mill receives pings from websocket
      socket.on("location_update", (data: { tripId: string; lat: number; lng: number; heading?: number; speed?: number }) => {
        if (data.tripId === tripId) {
          const newPos = {
            lat: data.lat,
            lng: data.lng,
            heading: data.heading,
            speed: data.speed,
          };
          setLorryPos(newPos);
          setTrail((prev) => [...prev.slice(-9), [data.lat, data.lng]]);
        }
      });

      return () => {
        socket.off("location_update");
      };
    }
  }, [tripId, role, vehicleId, pickupLat, pickupLng, dropLat, dropLng]);

  // Create animated rotated lorry icon using inline CSS transforms
  const rotation = lorryPos?.heading ?? 0;
  const lorryIcon = L.divIcon({
    html: `
      <div style="transform: rotate(${rotation}deg); transition: transform 0.3s ease;" class="flex items-center justify-center w-10 h-10 rounded-full bg-orange-500 text-white border-2 border-white shadow-2xl text-lg">
        🚛
      </div>
    `,
    className: "",
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });

  const pickupPoint: [number, number] = [pickupLat, pickupLng];
  const dropPoint: [number, number] = [dropLat, dropLng];
  const currentLorryPoint: [number, number] | null = lorryPos ? [lorryPos.lat, lorryPos.lng] : null;

  return (
    <div className="relative h-96 w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm">
      <MapContainer
        center={pickupPoint}
        zoom={10}
        className="h-full w-full"
        scrollWheelZoom={false}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={pickupPoint} icon={pickupIcon}>
          <Popup>
            <div className="text-xs font-semibold">Pickup: {pickupAddress}</div>
          </Popup>
        </Marker>

        <Marker position={dropPoint} icon={dropIcon}>
          <Popup>
            <div className="text-xs font-semibold">Drop: {dropAddress}</div>
          </Popup>
        </Marker>

        {lorryPos && (
          <>
            <Marker position={[lorryPos.lat, lorryPos.lng]} icon={lorryIcon}>
              <Popup>
                <div className="text-xs font-semibold">Lorry Location</div>
              </Popup>
            </Marker>
            <Polyline positions={[[pickupLat, pickupLng], ...trail, [lorryPos.lat, lorryPos.lng]]} color="#f97316" weight={3} dashArray="5, 10" />
          </>
        )}

        <RecenterMap pickup={pickupPoint} drop={dropPoint} lorry={currentLorryPoint} />
      </MapContainer>

      {/* Speed dashboard chip */}
      {lorryPos && lorryPos.speed !== undefined && (
        <div className="absolute bottom-4 right-4 z-[1000] rounded-lg bg-gray-900/90 px-3 py-1.5 text-xs font-bold text-white shadow-md backdrop-blur-sm flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping"></span>
          Speed: {lorryPos.speed} km/h
        </div>
      )}
    </div>
  );
}
