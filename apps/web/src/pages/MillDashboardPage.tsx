import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Package, Truck, FileText, Plus, Search, Filter, ArrowRight,
  MapPin, Calendar,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { LoadCard } from "../components/LoadCard";
import { TripStatusBadge } from "../components/TripStatusBadge";
import { Button } from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import { getMyLoads } from "../lib/loads";
import { getAvailableVehicles } from "../lib/vehicles";
import { getTrips } from "../lib/trips";
import {
  VEHICLE_TYPE_LABELS,
  TRIP_STATUS_LABELS,
  formatCurrency,
  formatWeight,
  formatDate,
} from "../lib/labels";
import type { VehicleType, TripStatus } from "@smart-lorry/shared";

type Tab = "loads" | "lorries" | "trips";

const TABS: { key: Tab; label: string; icon: typeof Package }[] = [
  { key: "loads", label: "My Loads", icon: Package },
  { key: "lorries", label: "Browse Lorries", icon: Truck },
  { key: "trips", label: "My Trips", icon: FileText },
];

const CAPACITY_RANGES = [
  { label: "Any capacity", min: 0, max: Infinity },
  { label: "Up to 1 t", min: 0, max: 1000 },
  { label: "1–5 t", min: 1000, max: 5000 },
  { label: "5–10 t", min: 5000, max: 10000 },
  { label: "10 t+", min: 10000, max: Infinity },
] as const;

export function MillDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>("loads");

  // --- Filters for Browse Lorries ---
  const [typeFilter, setTypeFilter] = useState<VehicleType | "">("");
  const [capacityIdx, setCapacityIdx] = useState(0);

  // ─── Data queries ────────────────────────────────────────────────
  const loadsQuery = useQuery({
    queryKey: ["my-loads"],
    queryFn: () => getMyLoads(1, 50),
    enabled: activeTab === "loads",
  });

  const vehiclesQuery = useQuery({
    queryKey: ["available-vehicles", typeFilter],
    queryFn: () =>
      getAvailableVehicles(typeFilter ? { type: typeFilter } : {}),
    enabled: activeTab === "lorries",
  });

  const tripsQuery = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => getTrips(1, 50),
    enabled: activeTab === "trips",
  });

  // ─── Derived data ────────────────────────────────────────────────
  const loads = loadsQuery.data?.data ?? [];
  const vehicles = vehiclesQuery.data?.data ?? [];
  const trips = tripsQuery.data?.data ?? [];

  const range = CAPACITY_RANGES[capacityIdx];
  const filteredVehicles = vehicles.filter((v) => {
    const cap = Number(v.capacityKg);
    return cap >= range.min && cap < range.max;
  });

  // ─── Render helpers ──────────────────────────────────────────────
  function renderLoading() {
    return (
      <div className="flex h-48 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-charcoal/20 border-t-neem" />
        <span className="ml-3 text-sm text-charcoal/60">Loading…</span>
      </div>
    );
  }

  function renderError(message: string) {
    return (
      <div className="rounded-lg bg-vermilion/10 px-4 py-3 text-sm text-vermilion">
        {message}
      </div>
    );
  }

  function renderEmpty(icon: React.ReactNode, title: string, subtitle: string, action?: React.ReactNode) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-charcoal/20 py-16 text-center">
        {icon}
        <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
        <p className="text-sm text-charcoal/60">{subtitle}</p>
        {action}
      </div>
    );
  }

  // ─── Tab content ─────────────────────────────────────────────────

  function renderLoadsTab() {
    if (loadsQuery.isLoading) return renderLoading();
    if (loadsQuery.isError)
      return renderError("Couldn't load your loads. Try refreshing the page.");

    return (
      <>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-charcoal/60">
            {loadsQuery.data ? `${loadsQuery.data.total} load${loadsQuery.data.total === 1 ? "" : "s"}` : ""}
          </p>
          <Link to="/loads/new">
            <Button>
              <Plus className="h-4 w-4" /> Post New Load
            </Button>
          </Link>
        </div>

        {loads.length === 0
          ? renderEmpty(
              <Package className="h-8 w-8 text-charcoal/40" />,
              "No loads posted yet",
              "Post your first load to start finding lorries.",
              <Link to="/loads/new">
                <Button size="sm">
                  <Plus className="h-4 w-4" /> Post New Load
                </Button>
              </Link>,
            )
          : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loads.map((load) => (
                <LoadCard
                  key={load.id}
                  load={load}
                  onClick={(id) => navigate(`/loads/${id}`)}
                />
              ))}
            </div>
          )}
      </>
    );
  }

  function renderLorriesTab() {
    if (vehiclesQuery.isLoading) return renderLoading();
    if (vehiclesQuery.isError)
      return renderError("Couldn't load available lorries. Try refreshing the page.");

    return (
      <>
        {/* Filters */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-charcoal/50" />
            <span className="text-sm font-medium text-charcoal/70">Filters</span>
          </div>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as VehicleType | "")}
            className="rounded-lg border border-charcoal/10 bg-white px-3 py-2 text-sm text-charcoal focus:border-neem focus:outline-none focus:ring-1 focus:ring-neem"
          >
            <option value="">All vehicle types</option>
            {Object.entries(VEHICLE_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </select>

          <select
            value={capacityIdx}
            onChange={(e) => setCapacityIdx(Number(e.target.value))}
            className="rounded-lg border border-charcoal/10 bg-white px-3 py-2 text-sm text-charcoal focus:border-neem focus:outline-none focus:ring-1 focus:ring-neem"
          >
            {CAPACITY_RANGES.map((r, i) => (
              <option key={i} value={i}>
                {r.label}
              </option>
            ))}
          </select>

          <span className="ml-auto text-sm text-charcoal/50">
            {filteredVehicles.length} lorr{filteredVehicles.length === 1 ? "y" : "ies"} found
          </span>
        </div>

        {filteredVehicles.length === 0
          ? renderEmpty(
              <Search className="h-8 w-8 text-charcoal/40" />,
              "No lorries available",
              "Try adjusting your filters or check back later.",
            )
          : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredVehicles.map((vehicle) => (
                <div
                  key={vehicle.id}
                  className="rounded-xl border border-charcoal/10 bg-white p-4 shadow-sm transition hover:shadow-md"
                >
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium uppercase tracking-wide text-charcoal/50">
                        {VEHICLE_TYPE_LABELS[vehicle.type]}
                      </p>
                      <p className="font-mono text-lg font-semibold tracking-wide text-charcoal">
                        {vehicle.registration}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-neem/40 bg-neem/10 px-2.5 py-1 text-xs font-semibold text-neem">
                      <span className="h-1.5 w-1.5 rounded-full bg-neem" />
                      Available
                    </span>
                  </div>

                  {/* Rate */}
                  <div className="mt-3 rounded-lg bg-neem/5 px-3 py-2">
                    <span className="text-xs text-charcoal/50">Rate per trip</span>
                    <p className="text-xl font-bold text-neem">
                      {formatCurrency(vehicle.ratePerTrip)}
                    </p>
                  </div>

                  {/* Details */}
                  <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-charcoal/70">
                    <span className="inline-flex items-center gap-1">
                      <Truck className="h-3.5 w-3.5 text-charcoal/40" />
                      {formatWeight(Number(vehicle.capacityKg))} capacity
                    </span>
                    {vehicle.baseRatePerKm > 0 && (
                      <span className="font-mono text-xs">
                        {formatCurrency(vehicle.baseRatePerKm)}/km
                      </span>
                    )}
                  </div>

                  {/* Owner */}
                  <p className="mt-3 border-t border-charcoal/10 pt-3 text-xs text-charcoal/50">
                    Owner: {vehicle.ownerName}
                  </p>
                </div>
              ))}
            </div>
          )}
      </>
    );
  }

  function renderTripsTab() {
    if (tripsQuery.isLoading) return renderLoading();
    if (tripsQuery.isError)
      return renderError("Couldn't load your trips. Try refreshing the page.");

    return (
      <>
        <p className="mb-6 text-sm text-charcoal/60">
          {tripsQuery.data ? `${tripsQuery.data.total} trip${tripsQuery.data.total === 1 ? "" : "s"}` : ""}
        </p>

        {trips.length === 0
          ? renderEmpty(
              <FileText className="h-8 w-8 text-charcoal/40" />,
              "No trips yet",
              "Trips will appear here once a lorry owner accepts your load.",
            )
          : (
            <div className="flex flex-col gap-4">
              {trips.map((trip) => (
                <Link
                  key={trip.id}
                  to={`/trips/${trip.id}`}
                  className="group flex flex-col justify-between rounded-xl border border-charcoal/10 bg-white p-5 shadow-sm transition hover:shadow-md md:flex-row md:items-center"
                >
                  <div className="flex flex-col gap-3">
                    {/* Status + vehicle */}
                    <div className="flex items-center gap-3">
                      <TripStatusBadge status={trip.status as TripStatus} />
                      <span className="font-mono text-sm text-charcoal/70">
                        {trip.vehicleRegistration}
                      </span>
                    </div>

                    {/* Route */}
                    <div className="flex flex-col gap-1 text-sm text-charcoal/70">
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-neem" />
                        {trip.load.pickupAddress}
                      </span>
                      <span className="ml-2 h-4 border-l border-dashed border-charcoal/20" />
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-vermilion" />
                        {trip.load.dropAddress}
                      </span>
                    </div>

                    {/* Material + date */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal/50">
                      <span>{trip.load.materialType} · {formatWeight(trip.load.weightKg)}</span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDate(trip.createdAt)}
                      </span>
                    </div>
                  </div>

                  {/* Right: Rate + arrow */}
                  <div className="mt-4 flex items-center gap-4 border-t border-charcoal/10 pt-4 md:mt-0 md:border-t-0 md:pt-0">
                    <div className="text-right">
                      <span className="text-xs text-charcoal/50">Agreed Rate</span>
                      <p className="text-xl font-bold font-mono text-charcoal">
                        {formatCurrency(trip.agreedRate)}
                      </p>
                    </div>
                    <ArrowRight className="h-5 w-5 text-charcoal/30 transition group-hover:text-neem" />
                  </div>
                </Link>
              ))}
            </div>
          )}
      </>
    );
  }

  // ─── Main render ─────────────────────────────────────────────────
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-charcoal">
            Welcome back, {user?.name?.split(" ")[0] ?? "Mill Owner"}
          </h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Manage your loads, browse available lorries, and track trips.
          </p>
        </div>

        {/* Tabs */}
        <div className="mb-8 flex border-b border-charcoal/10">
          {TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 border-b-2 px-5 py-3 text-sm font-semibold transition-colors ${
                activeTab === key
                  ? "border-neem text-neem"
                  : "border-transparent text-charcoal/50 hover:text-charcoal"
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "loads" && renderLoadsTab()}
        {activeTab === "lorries" && renderLorriesTab()}
        {activeTab === "trips" && renderTripsTab()}
      </div>
    </AppShell>
  );
}
