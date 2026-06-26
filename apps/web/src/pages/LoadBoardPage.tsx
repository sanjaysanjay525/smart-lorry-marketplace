import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { AlertCircle, PlusCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { SelectField, TextField } from "../components/FormField";
import { Modal } from "../components/Modal";
import { LoadCard } from "../components/LoadCard";
import { getLoads, acceptLoad } from "../lib/loads";
import { listVehicles } from "../lib/vehicles";
import { VEHICLE_TYPE_LABELS, LOAD_STATUS_LABELS, formatWeight } from "../lib/labels";
import { useAuth } from "../hooks/useAuth";
import { extractErrorMessage } from "../lib/api";
import { TN_CITIES } from "@smart-lorry/shared";
import type { VehicleType, LoadStatus, LoadDTO } from "@smart-lorry/shared";

export function LoadBoardPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  // Filter state
  const [vehicleType, setVehicleType] = useState<VehicleType | "">("");
  const [fromCity, setFromCity] = useState("");
  const [toCity, setToCity] = useState("");
  const [status, setStatus] = useState<LoadStatus | "">("open");
  const [page, setPage] = useState(1);
  const limit = 12;

  // Accept modal state
  const [acceptingLoad, setAcceptingLoad] = useState<LoadDTO | null>(null);
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [acceptError, setAcceptError] = useState<string | null>(null);

  // Fetch loads
  const { data: loadsData, isLoading } = useQuery({
    queryKey: ["loads", vehicleType, fromCity, toCity, status, page],
    queryFn: () =>
      getLoads({
        vehicleType: vehicleType || undefined,
        fromCity: fromCity || undefined,
        toCity: toCity || undefined,
        status: status || undefined,
        page,
        limit,
      }),
  });

  // Fetch owner's vehicles for accept modal
  const { data: vehiclesData } = useQuery({
    queryKey: ["my-vehicles"],
    queryFn: () => listVehicles(1, 100),
    enabled: user?.role === "owner",
  });

  const acceptMutation = useMutation({
    mutationFn: ({ loadId, vehicleId }: { loadId: string; vehicleId: string }) =>
      acceptLoad(loadId, { vehicleId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["loads"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
      setAcceptingLoad(null);
      setSelectedVehicleId("");
      setAcceptError(null);
    },
    onError: (err) => {
      setAcceptError(extractErrorMessage(err));
    },
  });

  const loads = loadsData?.data ?? [];
  const totalPages = loadsData?.totalPages ?? 1;
  const myVehicles = vehiclesData?.data ?? [];

  // Filter vehicles to only available ones
  const availableVehicles = myVehicles.filter((v) => v.status === "available");

  function handleAcceptClick(loadId: string) {
    const load = loads.find((l) => l.id === loadId);
    if (load) {
      setAcceptingLoad(load);
      setAcceptError(null);
      // Auto-select if only one eligible vehicle
      const eligible = availableVehicles.filter(
        (v) => v.type === load.vehicleTypeReq,
      );
      setSelectedVehicleId(eligible.length === 1 ? eligible[0].id : "");
    }
  }

  function handleConfirmAccept() {
    if (!acceptingLoad || !selectedVehicleId) return;
    acceptMutation.mutate({
      loadId: acceptingLoad.id,
      vehicleId: selectedVehicleId,
    });
  }

  const isOwner = user?.role === "owner";

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-8 py-10">
        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <h1 className="text-3xl font-semibold text-ink">Load Board</h1>
            <p className="mt-1 text-sm text-charcoal/60">
              Browse and accept open loads across Tamil Nadu
            </p>
          </div>
          {user?.role === "mill" && (
            <Button onClick={() => navigate("/loads/new")}>
              <PlusCircle className="h-4 w-4" /> Post a Load
            </Button>
          )}
        </div>

        {/* Filter Bar */}
        <div className="mb-6 rounded-lg border border-charcoal/10 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SelectField
              label="Vehicle Type"
              value={vehicleType}
              onChange={(e) => {
                setVehicleType(e.target.value as VehicleType | "");
                setPage(1);
              }}
            >
              <option value="">All Types</option>
              {Object.entries(VEHICLE_TYPE_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </SelectField>

            <div className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                From City
              </span>
              <input
                list="from-city-list"
                value={fromCity}
                onChange={(e) => {
                  setFromCity(e.target.value);
                  setPage(1);
                }}
                placeholder="Any city"
                className="w-full rounded-md border border-charcoal/20 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-charcoal/40 focus:border-night focus:outline-none focus:ring-1 focus:ring-night"
              />
              <datalist id="from-city-list">
                {TN_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                To City
              </span>
              <input
                list="to-city-list"
                value={toCity}
                onChange={(e) => {
                  setToCity(e.target.value);
                  setPage(1);
                }}
                placeholder="Any city"
                className="w-full rounded-md border border-charcoal/20 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-charcoal/40 focus:border-night focus:outline-none focus:ring-1 focus:ring-night"
              />
              <datalist id="to-city-list">
                {TN_CITIES.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <SelectField
              label="Status"
              value={status}
              onChange={(e) => {
                setStatus(e.target.value as LoadStatus | "");
                setPage(1);
              }}
            >
              <option value="">All Statuses</option>
              {Object.entries(LOAD_STATUS_LABELS).map(([val, label]) => (
                <option key={val} value={val}>
                  {label}
                </option>
              ))}
            </SelectField>
          </div>
        </div>

        {/* Load Grid */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-charcoal/50">
            Loading loads…
          </div>
        ) : loads.length === 0 ? (
          <div className="rounded-lg border border-dashed border-charcoal/20 bg-white p-12 text-center">
            <AlertCircle className="mx-auto h-12 w-12 text-charcoal/30" />
            <h3 className="mt-4 text-lg font-semibold text-ink">
              No loads found
            </h3>
            <p className="mt-1 text-sm text-charcoal/50">
              There are no loads matching your filters right now. Try adjusting
              the criteria.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-4 text-sm text-charcoal/50">
              Showing {loads.length} of {loadsData?.total ?? 0} load
              {(loadsData?.total ?? 0) === 1 ? "" : "s"}
            </p>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {loads.map((load) => (
                <LoadCard
                  key={load.id}
                  load={load}
                  showAcceptButton={isOwner && load.status === "open"}
                  onAccept={handleAcceptClick}
                  onClick={(id) => navigate(`/loads/${id}`)}
                />
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex items-center justify-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <ChevronLeft className="h-4 w-4" /> Previous
                </Button>
                <span className="text-sm text-charcoal/60">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Accept Load Modal */}
      {acceptingLoad && (
        <Modal
          title="Accept Load"
          onClose={() => {
            setAcceptingLoad(null);
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
              <p className="font-bold text-ink">{acceptingLoad.materialType}</p>
              <p className="mt-1 text-xs text-charcoal/60">
                {acceptingLoad.pickupAddress} → {acceptingLoad.dropAddress}
              </p>
              <div className="mt-3 flex justify-between border-t border-charcoal/10 pt-2 text-xs font-semibold">
                <span>
                  Required:{" "}
                  {VEHICLE_TYPE_LABELS[acceptingLoad.vehicleTypeReq]}
                </span>
                <span className="text-neem">
                  {formatWeight(acceptingLoad.weightKg)}
                </span>
              </div>
            </div>

            {availableVehicles.length === 0 ? (
              <div className="rounded-md border border-turmeric/30 bg-turmeric/5 p-4 text-xs text-turmeric">
                You have no available vehicles. Please ensure at least one
                vehicle has status &ldquo;available&rdquo;.
              </div>
            ) : (
              <div>
                <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-charcoal/60">
                  Select Vehicle
                </label>
                <select
                  value={selectedVehicleId}
                  onChange={(e) => setSelectedVehicleId(e.target.value)}
                  className="w-full rounded-md border border-charcoal/20 bg-white px-3 py-2.5 text-sm text-ink focus:border-night focus:outline-none focus:ring-1 focus:ring-night"
                >
                  <option value="">— Choose a vehicle —</option>
                  {availableVehicles.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.registration} · {VEHICLE_TYPE_LABELS[v.type]} ·{" "}
                      {formatWeight(v.capacityKg)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setAcceptingLoad(null);
                  setSelectedVehicleId("");
                  setAcceptError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                disabled={!selectedVehicleId || acceptMutation.isPending}
                onClick={handleConfirmAccept}
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
