import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ShieldAlert, MapPin, Clock, Pencil, XCircle } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { SelectField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { getLoadById, cancelLoad } from "../lib/loads";
import { acceptLoad } from "../lib/loads";
import { listVehicles } from "../lib/vehicles";
import {
  VEHICLE_TYPE_LABELS,
  LOAD_STATUS_LABELS,
  LOAD_STATUS_COLORS,
  formatCurrency,
  formatWeight,
  formatDate,
  formatDateTime,
} from "../lib/labels";
import { useAuth } from "../hooks/useAuth";
import { extractErrorMessage } from "../lib/api";
import type { VehicleType } from "@smart-lorry/shared";

export function LoadDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [showAcceptModal, setShowAcceptModal] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [acceptError, setAcceptError] = useState<string | null>(null);

  const { data: load, isLoading, error } = useQuery({
    queryKey: ["load", id],
    queryFn: () => getLoadById(id),
    enabled: !!id,
  });

  // Fetch vehicles for accept modal
  const { data: vehiclesData } = useQuery({
    queryKey: ["my-vehicles"],
    queryFn: () => listVehicles(1, 100),
    enabled: user?.role === "owner",
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelLoad(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["load", id] });
      queryClient.invalidateQueries({ queryKey: ["loads"] });
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (vehicleId: string) =>
      acceptLoad(id, { vehicleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["load", id] });
      queryClient.invalidateQueries({ queryKey: ["loads"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setShowAcceptModal(false);
      setSelectedVehicleId("");
      setAcceptError(null);
    },
    onError: (err) => {
      setAcceptError(extractErrorMessage(err));
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center text-charcoal/50">
          Loading load details…
        </div>
      </AppShell>
    );
  }

  if (error || !load) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-8 py-20 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-vermilion" />
          <h2 className="mt-4 text-xl font-bold text-ink">
            Error loading details
          </h2>
          <p className="mt-2 text-sm text-charcoal/60">
            The requested load could not be found.
          </p>
          <Button onClick={() => navigate("/loads")} className="mt-6">
            Back to Load Board
          </Button>
        </div>
      </AppShell>
    );
  }

  const isMillOwner = user?.role === "mill" && user.id === load.millId;
  const isOwner = user?.role === "owner";
  const availableVehicles = (vehiclesData?.data ?? []).filter(
    (v) => v.status === "available",
  );

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-8 py-10">
        {/* Back button */}
        <button
          onClick={() => navigate("/loads")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal/60 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Load Board
        </button>

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-ink">
                {load.materialType}
              </h1>
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${LOAD_STATUS_COLORS[load.status]}`}
              >
                {LOAD_STATUS_LABELS[load.status]}
              </span>
            </div>
            <p className="mt-1 text-xs font-mono text-charcoal/50">
              ID: {load.id}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2">
            {isMillOwner && load.status === "open" && (
              <>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(`/loads/${id}/edit`)}
                >
                  <Pencil className="h-4 w-4" /> Edit
                </Button>
                <Button
                  variant="danger"
                  size="sm"
                  disabled={cancelMutation.isPending}
                  onClick={() => cancelMutation.mutate()}
                >
                  <XCircle className="h-4 w-4" />
                  {cancelMutation.isPending ? "Cancelling…" : "Cancel Load"}
                </Button>
              </>
            )}

            {isOwner && load.status === "open" && (
              <Button
                size="sm"
                onClick={() => {
                  setShowAcceptModal(true);
                  setAcceptError(null);
                  const eligible = availableVehicles.filter(
                    (v) => v.type === load.vehicleTypeReq,
                  );
                  setSelectedVehicleId(
                    eligible.length === 1 ? eligible[0].id : "",
                  );
                }}
              >
                Accept This Load
              </Button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Main Details */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Load Info Card */}
            <div className="rounded-lg border border-charcoal/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-ink">
                Load Details
              </h2>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                    Material
                  </p>
                  <p className="mt-0.5 font-medium text-ink">
                    {load.materialType}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                    Weight
                  </p>
                  <p className="mt-0.5 font-medium text-ink">
                    {formatWeight(load.weightKg)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                    Vehicle Type Required
                  </p>
                  <p className="mt-0.5 font-medium text-ink">
                    {VEHICLE_TYPE_LABELS[load.vehicleTypeReq]}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                    Offered Rate
                  </p>
                  <p className="mt-0.5 text-lg font-bold text-neem">
                    {formatCurrency(load.offeredRate)}
                  </p>
                </div>
              </div>

              {load.notes && (
                <div className="mt-4 border-t border-charcoal/10 pt-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                    Notes
                  </p>
                  <p className="mt-1 text-sm text-ink">{load.notes}</p>
                </div>
              )}
            </div>

            {/* Route Card */}
            <div className="rounded-lg border border-charcoal/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-ink">Route</h2>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neem text-white">
                    <MapPin className="h-3 w-3" />
                  </span>
                  <span className="h-10 w-px bg-charcoal/20" />
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-vermilion text-white">
                    <MapPin className="h-3 w-3" />
                  </span>
                </div>
                <div className="flex flex-col gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase text-neem">
                      Pickup
                    </p>
                    <p className="text-sm font-medium text-ink">
                      {load.pickupAddress}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase text-vermilion">
                      Drop
                    </p>
                    <p className="text-sm font-medium text-ink">
                      {load.dropAddress}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Time Window */}
            <div className="rounded-lg border border-charcoal/10 bg-white p-6 shadow-sm">
              <h2 className="mb-4 text-lg font-semibold text-ink">
                Availability Window
              </h2>
              <div className="flex items-center gap-4">
                <Clock className="h-5 w-5 text-charcoal/40" />
                <div className="text-sm text-ink">
                  <span className="font-medium">
                    {formatDateTime(load.availableFrom)}
                  </span>
                  <span className="mx-2 text-charcoal/40">→</span>
                  <span className="font-medium">
                    {formatDateTime(load.availableUntil)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            {/* Posted By */}
            <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-sm">
              <h3 className="mb-2 font-semibold text-ink">Posted By</h3>
              <p className="text-sm font-medium text-ink">{load.millName}</p>
              <p className="mt-1 text-xs text-charcoal/50">
                Posted on {formatDate(load.createdAt)}
              </p>
            </div>

            {/* Trip Summary */}
            {load.trip && (
              <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-sm">
                <h3 className="mb-2 font-semibold text-ink">
                  Linked Trip
                </h3>
                <div className="text-sm">
                  <p className="text-charcoal/60">
                    Status:{" "}
                    <span className="font-semibold text-ink">
                      {load.trip.status}
                    </span>
                  </p>
                  <p className="mt-1 text-charcoal/60">
                    Owner: {load.trip.ownerName}
                  </p>
                  <p className="mt-1 text-charcoal/60">
                    Vehicle: {load.trip.vehicleRegistration}
                  </p>
                  <p className="mt-1 text-charcoal/60">
                    Rate:{" "}
                    <span className="font-bold text-neem">
                      {formatCurrency(load.trip.agreedRate)}
                    </span>
                  </p>
                  <Link
                    to={`/trips/${load.trip.id}`}
                    className="mt-3 inline-block text-sm font-semibold text-sky underline hover:text-sky/80"
                  >
                    View Trip Details →
                  </Link>
                </div>
              </div>
            )}

            {/* Status */}
            <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-sm">
              <h3 className="mb-2 font-semibold text-ink">Status</h3>
              <span
                className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${LOAD_STATUS_COLORS[load.status]}`}
              >
                {LOAD_STATUS_LABELS[load.status]}
              </span>
              <p className="mt-2 text-xs text-charcoal/50">
                Last updated {formatDateTime(load.updatedAt)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Accept Modal */}
      {showAcceptModal && (
        <Modal
          title="Accept This Load"
          onClose={() => {
            setShowAcceptModal(false);
            setSelectedVehicleId("");
            setAcceptError(null);
          }}
        >
          <div className="flex flex-col gap-4">
            {acceptError && (
              <div className="rounded-md bg-vermilion/10 px-4 py-3 text-sm font-medium text-vermilion">
                {acceptError}
              </div>
            )}

            <div className="rounded-md bg-charcoal/5 p-4 text-sm">
              <p className="font-bold text-ink">{load.materialType}</p>
              <p className="mt-1 text-xs text-charcoal/60">
                {load.pickupAddress} → {load.dropAddress}
              </p>
              <p className="mt-2 text-xs font-semibold">
                Requires:{" "}
                {VEHICLE_TYPE_LABELS[load.vehicleTypeReq]} ·{" "}
                {formatWeight(load.weightKg)} ·{" "}
                {formatCurrency(load.offeredRate)}
              </p>
            </div>

            {availableVehicles.length === 0 ? (
              <div className="rounded-md border border-turmeric/30 bg-turmeric/5 p-4 text-xs text-turmeric">
                You have no available vehicles. Ensure at least one vehicle has
                &ldquo;available&rdquo; status.
              </div>
            ) : (
              <SelectField
                label="Select Your Vehicle"
                value={selectedVehicleId}
                onChange={(e) => setSelectedVehicleId(e.target.value)}
              >
                <option value="">— Choose a vehicle —</option>
                {availableVehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.registration} · {VEHICLE_TYPE_LABELS[v.type]} ·{" "}
                    {formatWeight(v.capacityKg)}
                  </option>
                ))}
              </SelectField>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowAcceptModal(false);
                  setSelectedVehicleId("");
                  setAcceptError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!selectedVehicleId || acceptMutation.isPending}
                onClick={() => acceptMutation.mutate(selectedVehicleId)}
              >
                {acceptMutation.isPending ? "Accepting…" : "Confirm & Accept"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </AppShell>
  );
}
