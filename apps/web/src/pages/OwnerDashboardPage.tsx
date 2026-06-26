import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useNavigate } from "react-router-dom";
import {
  Truck, Package, FileText, Plus, MapPin, Calendar,
  ArrowRight, CheckCircle, Loader2,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { VehicleTicket, STATUS_CYCLE } from "../components/VehicleTicket";
import { VehicleFormModal } from "../components/VehicleFormModal";
import { LoadCard } from "../components/LoadCard";
import { TripStatusBadge } from "../components/TripStatusBadge";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { useAuth } from "../hooks/useAuth";
import {
  listVehicles,
  createVehicle,
  updateVehicle,
  updateVehicleStatus,
  deleteVehicle,
} from "../lib/vehicles";
import { getLoads, acceptLoad } from "../lib/loads";
import {
  getTrips,
  markPickedUp,
  markInTransit,
  markDelivered,
} from "../lib/trips";
import {
  VEHICLE_TYPE_LABELS,
  TRIP_STATUS_LABELS,
  formatCurrency,
  formatWeight,
  formatDate,
} from "../lib/labels";
import type {
  VehicleDTO,
  TripDTO,
  CreateVehicleInput,
  TripStatus,
} from "@smart-lorry/shared";

type Tab = "fleet" | "loads" | "trips";

const TABS: { key: Tab; label: string; icon: typeof Truck }[] = [
  { key: "fleet", label: "My Fleet", icon: Truck },
  { key: "loads", label: "Load Board", icon: Package },
  { key: "trips", label: "My Trips", icon: FileText },
];

// ─── Accept-load modal ─────────────────────────────────────────────
function AcceptLoadModal({
  loadId,
  vehicles,
  isLoading,
  onClose,
  onAccept,
  isPending,
}: {
  loadId: string;
  vehicles: VehicleDTO[];
  isLoading: boolean;
  onClose: () => void;
  onAccept: (loadId: string, vehicleId: string) => void;
  isPending: boolean;
}) {
  const availableVehicles = vehicles.filter((v) => v.status === "available");
  const [selectedId, setSelectedId] = useState<string>("");

  return (
    <Modal title="Select a vehicle" onClose={onClose}>
      <div className="flex flex-col gap-4">
        <p className="text-sm text-charcoal/60">
          Choose which vehicle from your fleet to assign to this load.
        </p>

        {isLoading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="h-5 w-5 animate-spin text-charcoal/40" />
            <span className="ml-2 text-sm text-charcoal/50">Loading fleet…</span>
          </div>
        ) : availableVehicles.length === 0 ? (
          <div className="rounded-lg border border-dashed border-charcoal/20 px-4 py-8 text-center">
            <Truck className="mx-auto h-6 w-6 text-charcoal/30" />
            <p className="mt-2 text-sm text-charcoal/50">
              No available vehicles. Change a vehicle status to "Available" first.
            </p>
          </div>
        ) : (
          <div className="max-h-64 space-y-2 overflow-y-auto">
            {availableVehicles.map((v) => (
              <label
                key={v.id}
                className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition ${
                  selectedId === v.id
                    ? "border-neem bg-neem/5"
                    : "border-charcoal/10 bg-white hover:border-charcoal/20"
                }`}
              >
                <input
                  type="radio"
                  name="vehicle"
                  value={v.id}
                  checked={selectedId === v.id}
                  onChange={() => setSelectedId(v.id)}
                  className="h-4 w-4 accent-neem"
                />
                <div className="flex-1">
                  <p className="font-mono text-sm font-semibold text-charcoal">
                    {v.registration}
                  </p>
                  <p className="text-xs text-charcoal/50">
                    {VEHICLE_TYPE_LABELS[v.type]} · {formatWeight(Number(v.capacityKg))} ·{" "}
                    {formatCurrency(v.ratePerTrip)}/trip
                  </p>
                </div>
                {selectedId === v.id && (
                  <CheckCircle className="h-5 w-5 text-neem" />
                )}
              </label>
            ))}
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={!selectedId || isPending}
            onClick={() => onAccept(loadId, selectedId)}
          >
            {isPending ? "Accepting…" : "Accept Load"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ─── Next-action helper for trips ──────────────────────────────────
function getNextAction(status: TripStatus): {
  label: string;
  pendingLabel: string;
  action: "pickup" | "transit" | "deliver";
} | null {
  switch (status) {
    case "pending":
      return { label: "Mark Picked Up", pendingLabel: "Updating…", action: "pickup" };
    case "picked_up":
      return { label: "Mark In Transit", pendingLabel: "Updating…", action: "transit" };
    case "in_transit":
      return { label: "Mark Delivered", pendingLabel: "Updating…", action: "deliver" };
    default:
      return null;
  }
}

// ═══════════════════════════════════════════════════════════════════
// OwnerDashboardPage
// ═══════════════════════════════════════════════════════════════════
export function OwnerDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<Tab>("fleet");

  // Fleet modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<VehicleDTO | null>(null);

  // Accept load modal
  const [acceptingLoadId, setAcceptingLoadId] = useState<string | null>(null);

  // Pending trip action to show spinner per-trip
  const [pendingTripAction, setPendingTripAction] = useState<string | null>(null);

  // ─── Data queries ──────────────────────────────────────────────
  const fleetQuery = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => listVehicles(1, 50),
    enabled: activeTab === "fleet" || acceptingLoadId !== null,
  });

  const loadsQuery = useQuery({
    queryKey: ["open-loads"],
    queryFn: () => getLoads({ status: "open" }),
    enabled: activeTab === "loads",
  });

  const tripsQuery = useQuery({
    queryKey: ["my-trips"],
    queryFn: () => getTrips(1, 50),
    enabled: activeTab === "trips",
  });

  // ─── Fleet mutations ──────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (input: CreateVehicleInput) => createVehicle(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: CreateVehicleInput }) =>
      updateVehicle(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: VehicleDTO["status"] }) =>
      updateVehicleStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });

  // ─── Load accept mutation ─────────────────────────────────────
  const acceptMutation = useMutation({
    mutationFn: ({ loadId, vehicleId }: { loadId: string; vehicleId: string }) =>
      acceptLoad(loadId, { vehicleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["open-loads"] });
      queryClient.invalidateQueries({ queryKey: ["my-trips"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setAcceptingLoadId(null);
    },
  });

  // ─── Trip action mutations ────────────────────────────────────
  const pickupMutation = useMutation({
    mutationFn: (id: string) => markPickedUp(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-trips"] });
      setPendingTripAction(null);
    },
    onError: () => setPendingTripAction(null),
  });

  const transitMutation = useMutation({
    mutationFn: (id: string) => markInTransit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-trips"] });
      setPendingTripAction(null);
    },
    onError: () => setPendingTripAction(null),
  });

  const deliverMutation = useMutation({
    mutationFn: (id: string) => markDelivered(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-trips"] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setPendingTripAction(null);
    },
    onError: () => setPendingTripAction(null),
  });

  function handleTripAction(tripId: string, action: "pickup" | "transit" | "deliver") {
    setPendingTripAction(tripId);
    switch (action) {
      case "pickup":
        pickupMutation.mutate(tripId);
        break;
      case "transit":
        transitMutation.mutate(tripId);
        break;
      case "deliver":
        deliverMutation.mutate(tripId);
        break;
    }
  }

  // ─── Derived ──────────────────────────────────────────────────
  const vehicles = fleetQuery.data?.data ?? [];
  const loads = loadsQuery.data?.data ?? [];
  const trips = tripsQuery.data?.data ?? [];

  // ─── Render helpers ───────────────────────────────────────────
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

  function renderEmpty(
    icon: React.ReactNode,
    title: string,
    subtitle: string,
    action?: React.ReactNode,
  ) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed border-charcoal/20 py-16 text-center">
        {icon}
        <h3 className="text-lg font-semibold text-charcoal">{title}</h3>
        <p className="text-sm text-charcoal/60">{subtitle}</p>
        {action}
      </div>
    );
  }

  // ─── Fleet tab ────────────────────────────────────────────────
  function renderFleetTab() {
    if (fleetQuery.isLoading) return renderLoading();
    if (fleetQuery.isError)
      return renderError("Couldn't load your fleet. Try refreshing the page.");

    return (
      <>
        <div className="mb-6 flex items-center justify-between">
          <p className="text-sm text-charcoal/60">
            {fleetQuery.data
              ? `${fleetQuery.data.total} vehicle${fleetQuery.data.total === 1 ? "" : "s"} on the books`
              : ""}
          </p>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4" /> Add Vehicle
          </Button>
        </div>

        {vehicles.length === 0
          ? renderEmpty(
              <Truck className="h-8 w-8 text-charcoal/40" />,
              "No vehicles yet",
              "Add your first vehicle to start taking loads.",
              <Button size="sm" onClick={() => setIsAddOpen(true)}>
                <Plus className="h-4 w-4" /> Add Vehicle
              </Button>,
            )
          : (
            <div className="grid gap-4 sm:grid-cols-2">
              {vehicles.map((vehicle) => (
                <div key={vehicle.id} className="relative">
                  <VehicleTicket
                    vehicle={vehicle}
                    onEdit={() => setEditingVehicle(vehicle)}
                    onToggleStatus={() =>
                      statusMutation.mutate({
                        id: vehicle.id,
                        status: STATUS_CYCLE[vehicle.status],
                      })
                    }
                  />
                  {/* Rate per trip overlay */}
                  <div className="absolute right-3 bottom-14 rounded bg-neem/10 px-2 py-1 text-xs font-bold text-neem">
                    {formatCurrency(vehicle.ratePerTrip)}/trip
                  </div>
                </div>
              ))}
            </div>
          )}
      </>
    );
  }

  // ─── Load Board tab ───────────────────────────────────────────
  function renderLoadsTab() {
    if (loadsQuery.isLoading) return renderLoading();
    if (loadsQuery.isError)
      return renderError("Couldn't load the load board. Try refreshing the page.");

    return (
      <>
        <p className="mb-6 text-sm text-charcoal/60">
          {loadsQuery.data
            ? `${loadsQuery.data.total} open load${loadsQuery.data.total === 1 ? "" : "s"} available`
            : ""}
        </p>

        {loads.length === 0
          ? renderEmpty(
              <Package className="h-8 w-8 text-charcoal/40" />,
              "No open loads right now",
              "Check back soon — mill owners post new loads regularly.",
            )
          : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loads.map((load) => (
                <LoadCard
                  key={load.id}
                  load={load}
                  showAcceptButton
                  onAccept={(id) => setAcceptingLoadId(id)}
                  onClick={(id) => navigate(`/loads/${id}`)}
                />
              ))}
            </div>
          )}
      </>
    );
  }

  // ─── My Trips tab ─────────────────────────────────────────────
  function renderTripsTab() {
    if (tripsQuery.isLoading) return renderLoading();
    if (tripsQuery.isError)
      return renderError("Couldn't load your trips. Try refreshing the page.");

    return (
      <>
        <p className="mb-6 text-sm text-charcoal/60">
          {tripsQuery.data
            ? `${tripsQuery.data.total} trip${tripsQuery.data.total === 1 ? "" : "s"}`
            : ""}
        </p>

        {trips.length === 0
          ? renderEmpty(
              <FileText className="h-8 w-8 text-charcoal/40" />,
              "No trips yet",
              "Accept a load to create your first trip.",
            )
          : (
            <div className="flex flex-col gap-4">
              {trips.map((trip) => {
                const nextAction = getNextAction(trip.status as TripStatus);
                const isThisTripPending = pendingTripAction === trip.id;

                return (
                  <div
                    key={trip.id}
                    className="flex flex-col justify-between rounded-xl border border-charcoal/10 bg-white p-5 shadow-sm transition hover:shadow-md md:flex-row md:items-center"
                  >
                    {/* Left: trip info */}
                    <Link
                      to={`/trips/${trip.id}`}
                      className="flex flex-1 flex-col gap-3"
                    >
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

                      {/* Meta */}
                      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-charcoal/50">
                        <span>
                          {trip.load.materialType} · {formatWeight(trip.load.weightKg)}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(trip.createdAt)}
                        </span>
                      </div>
                    </Link>

                    {/* Right: rate + actions */}
                    <div className="mt-4 flex flex-col items-end gap-3 border-t border-charcoal/10 pt-4 md:mt-0 md:border-t-0 md:pt-0 md:pl-6">
                      <div className="text-right">
                        <span className="text-xs text-charcoal/50">Agreed Rate</span>
                        <p className="text-xl font-bold font-mono text-charcoal">
                          {formatCurrency(trip.agreedRate)}
                        </p>
                      </div>

                      {nextAction && (
                        <Button
                          size="sm"
                          disabled={isThisTripPending}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleTripAction(trip.id, nextAction.action);
                          }}
                        >
                          {isThisTripPending ? (
                            <>
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              {nextAction.pendingLabel}
                            </>
                          ) : (
                            nextAction.label
                          )}
                        </Button>
                      )}

                      {trip.status === "delivered" && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-neem">
                          <CheckCircle className="h-3.5 w-3.5" />
                          Completed
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
      </>
    );
  }

  // ─── Main render ──────────────────────────────────────────────
  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-charcoal">
            Welcome back, {user?.name?.split(" ")[0] ?? "Owner"}
          </h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Manage your fleet, browse open loads, and track your trips.
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
        {activeTab === "fleet" && renderFleetTab()}
        {activeTab === "loads" && renderLoadsTab()}
        {activeTab === "trips" && renderTripsTab()}
      </div>

      {/* ── Fleet modals ─────────────────────────────────────── */}
      {isAddOpen && (
        <VehicleFormModal
          onClose={() => setIsAddOpen(false)}
          onSubmit={async (input) => {
            await createMutation.mutateAsync(input);
          }}
        />
      )}

      {editingVehicle && (
        <VehicleFormModal
          initial={editingVehicle}
          onClose={() => setEditingVehicle(null)}
          onSubmit={async (input) => {
            await updateMutation.mutateAsync({ id: editingVehicle.id, input });
          }}
        />
      )}

      {/* ── Accept load modal ────────────────────────────────── */}
      {acceptingLoadId && (
        <AcceptLoadModal
          loadId={acceptingLoadId}
          vehicles={vehicles}
          isLoading={fleetQuery.isLoading}
          onClose={() => setAcceptingLoadId(null)}
          onAccept={(loadId, vehicleId) =>
            acceptMutation.mutate({ loadId, vehicleId })
          }
          isPending={acceptMutation.isPending}
        />
      )}
    </AppShell>
  );
}
