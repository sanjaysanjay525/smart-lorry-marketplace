import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ShieldAlert,
  MapPin,
  Truck,
  Star,
  CheckCircle2,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { Modal } from "../components/Modal";
import { TripStatusBadge } from "../components/TripStatusBadge";
import { SmsLogTable } from "../components/SmsLogTable";
import { RateModal } from "../components/RateModal";
import {
  getTripById,
  markPickedUp,
  markInTransit,
  markDelivered,
  cancelTrip,
  rateTrip,
} from "../lib/trips";
import {
  VEHICLE_TYPE_LABELS,
  formatCurrency,
  formatWeight,
  formatDate,
  formatDateTime,
} from "../lib/labels";
import { useAuth } from "../hooks/useAuth";
import { extractErrorMessage } from "../lib/api";
import type { TripStatus } from "@smart-lorry/shared";

const TIMELINE_STEPS: { key: TripStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "picked_up", label: "Picked Up" },
  { key: "in_transit", label: "In Transit" },
  { key: "delivered", label: "Delivered" },
];

function getStepIndex(status: TripStatus): number {
  const idx = TIMELINE_STEPS.findIndex((s) => s.key === status);
  return idx === -1 ? -1 : idx;
}

export function TripDetailPage() {
  const { id = "" } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [showRateModal, setShowRateModal] = useState(false);

  const {
    data: trip,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["trip", id],
    queryFn: () => getTripById(id),
    enabled: !!id,
  });

  const pickupMutation = useMutation({
    mutationFn: () => markPickedUp(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", id] }),
  });

  const transitMutation = useMutation({
    mutationFn: () => markInTransit(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", id] }),
  });

  const deliverMutation = useMutation({
    mutationFn: () => markDelivered(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["trip", id] }),
  });

  const cancelMutation = useMutation({
    mutationFn: (reason: string) => cancelTrip(id, { cancelReason: reason }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
      setShowCancelModal(false);
      setCancelReason("");
      setCancelError(null);
    },
    onError: (err) => {
      setCancelError(extractErrorMessage(err));
    },
  });

  const rateMutation = useMutation({
    mutationFn: ({ score, comment }: { score: number; comment: string }) =>
      rateTrip(id, { score, comment: comment || undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["trip", id] });
    },
  });

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex h-96 items-center justify-center text-charcoal/50">
          Loading trip details…
        </div>
      </AppShell>
    );
  }

  if (error || !trip) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-8 py-20 text-center">
          <ShieldAlert className="mx-auto h-12 w-12 text-vermilion" />
          <h2 className="mt-4 text-xl font-bold text-ink">
            Error loading trip
          </h2>
          <p className="mt-2 text-sm text-charcoal/60">
            The requested trip could not be found.
          </p>
          <Button onClick={() => navigate("/trips")} className="mt-6">
            Back to Trips
          </Button>
        </div>
      </AppShell>
    );
  }

  const isOwnerUser = user?.role === "owner" && user.id === trip.ownerId;
  const isMillUser = user?.role === "mill" && user.id === trip.millId;
  const currentStepIndex = getStepIndex(trip.status);
  const existingRating = trip.ratings?.find((r) => r.raterId === user?.id);
  const canCancel =
    (isOwnerUser || isMillUser) &&
    (trip.status === "pending" || trip.status === "picked_up");
  const canRate = trip.status === "delivered" && !existingRating;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-8 py-10">
        {/* Back button */}
        <button
          onClick={() => navigate("/trips")}
          className="mb-6 inline-flex items-center gap-1.5 text-sm font-semibold text-charcoal/60 hover:text-ink"
        >
          <ArrowLeft className="h-4 w-4" /> Back to Trips
        </button>

        {/* Header */}
        <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-semibold text-ink">Trip Details</h1>
              <TripStatusBadge status={trip.status} />
            </div>
            <p className="mt-1 text-xs font-mono text-charcoal/50">
              ID: {trip.id}
            </p>
          </div>

          <div className="flex gap-2">
            {/* Owner action buttons */}
            {isOwnerUser && trip.status === "pending" && (
              <Button
                size="sm"
                disabled={pickupMutation.isPending}
                onClick={() => pickupMutation.mutate()}
              >
                {pickupMutation.isPending ? "Updating…" : "Mark Picked Up"}
              </Button>
            )}
            {isOwnerUser && trip.status === "picked_up" && (
              <Button
                size="sm"
                disabled={transitMutation.isPending}
                onClick={() => transitMutation.mutate()}
              >
                {transitMutation.isPending ? "Updating…" : "Mark In Transit"}
              </Button>
            )}
            {isOwnerUser && trip.status === "in_transit" && (
              <Button
                size="sm"
                disabled={deliverMutation.isPending}
                onClick={() => deliverMutation.mutate()}
              >
                {deliverMutation.isPending ? "Updating…" : "Mark Delivered"}
              </Button>
            )}

            {canCancel && (
              <Button
                variant="danger"
                size="sm"
                onClick={() => setShowCancelModal(true)}
              >
                Cancel Trip
              </Button>
            )}

            {canRate && (
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setShowRateModal(true)}
              >
                <Star className="h-4 w-4" /> Rate This Trip
              </Button>
            )}
          </div>
        </div>

        {/* Status Timeline (Horizontal Stepper) */}
        {trip.status !== "cancelled" ? (
          <div className="mb-8 rounded-lg border border-charcoal/10 bg-white p-6 shadow-sm">
            <h2 className="mb-5 text-lg font-semibold text-ink">Progress</h2>
            <div className="flex items-center">
              {TIMELINE_STEPS.map((step, idx) => {
                const isCompleted = idx < currentStepIndex;
                const isCurrent = idx === currentStepIndex;
                const isUpcoming = idx > currentStepIndex;

                return (
                  <div key={step.key} className="flex flex-1 items-center">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full border-2 text-sm font-bold transition-all ${
                          isCompleted
                            ? "border-neem bg-neem text-white"
                            : isCurrent
                              ? "border-turmeric bg-turmeric/10 text-turmeric"
                              : "border-charcoal/20 bg-charcoal/5 text-charcoal/40"
                        }`}
                      >
                        {isCompleted ? (
                          <CheckCircle2 className="h-5 w-5" />
                        ) : (
                          idx + 1
                        )}
                      </div>
                      <span
                        className={`mt-2 text-xs font-semibold ${
                          isCompleted || isCurrent
                            ? "text-ink"
                            : "text-charcoal/40"
                        }`}
                      >
                        {step.label}
                      </span>
                    </div>
                    {idx < TIMELINE_STEPS.length - 1 && (
                      <div
                        className={`mx-2 h-0.5 flex-1 ${
                          idx < currentStepIndex
                            ? "bg-neem"
                            : "bg-charcoal/15"
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="mb-8 rounded-lg border border-vermilion/20 bg-vermilion/5 p-6">
            <h2 className="text-lg font-semibold text-vermilion">
              Trip Cancelled
            </h2>
            <p className="mt-1 text-sm text-vermilion/80">
              This trip was cancelled
              {trip.cancelledAt && ` on ${formatDate(trip.cancelledAt)}`}.
            </p>
            {trip.cancelReason && (
              <p className="mt-3 rounded-md border border-vermilion/10 bg-white p-3 text-sm font-medium text-ink">
                Reason: {trip.cancelReason}
              </p>
            )}
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Main Content */}
          <div className="md:col-span-2 flex flex-col gap-6">
            {/* Load Details Card */}
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
                    {trip.load.materialType}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                    Weight
                  </p>
                  <p className="mt-0.5 font-medium text-ink">
                    {formatWeight(trip.load.weightKg)}
                  </p>
                </div>
              </div>

              {/* Route */}
              <div className="mt-4 border-t border-charcoal/10 pt-4">
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neem text-white">
                      <MapPin className="h-3 w-3" />
                    </span>
                    <span className="h-8 w-px bg-charcoal/20" />
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
                        {trip.load.pickupAddress}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase text-vermilion">
                        Drop
                      </p>
                      <p className="text-sm font-medium text-ink">
                        {trip.load.dropAddress}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Agreed Rate */}
              <div className="mt-4 border-t border-charcoal/10 pt-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                  Agreed Rate
                </p>
                <p className="mt-0.5 text-2xl font-bold text-neem">
                  {formatCurrency(trip.agreedRate)}
                </p>
              </div>
            </div>

            {/* Existing Ratings */}
            {trip.ratings && trip.ratings.length > 0 && (
              <div className="rounded-lg border border-charcoal/10 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-ink">
                  Ratings
                </h2>
                <div className="flex flex-col gap-4">
                  {trip.ratings.map((rating) => (
                    <div
                      key={rating.id}
                      className="rounded-md border border-charcoal/10 bg-charcoal/5 p-4"
                    >
                      <div className="flex items-center gap-1">
                        {Array.from({ length: 5 }).map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < rating.score
                                ? "fill-turmeric text-turmeric"
                                : "text-charcoal/20"
                            }`}
                          />
                        ))}
                        <span className="ml-2 text-xs font-bold text-ink">
                          {rating.score}/5
                        </span>
                      </div>
                      {rating.comment && (
                        <p className="mt-2 text-sm italic text-charcoal/70">
                          &ldquo;{rating.comment}&rdquo;
                        </p>
                      )}
                      <p className="mt-1 text-xs text-charcoal/40">
                        {formatDate(rating.createdAt)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* SMS History */}
            {trip.smsLogs && (
              <div className="rounded-lg border border-charcoal/10 bg-white p-6 shadow-sm">
                <h2 className="mb-4 text-lg font-semibold text-ink">
                  SMS History
                </h2>
                <SmsLogTable logs={trip.smsLogs} />
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="flex flex-col gap-6">
            {/* Vehicle Details */}
            <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-ink">Vehicle</h3>
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-charcoal/5">
                  <Truck className="h-5 w-5 text-charcoal/60" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                    {VEHICLE_TYPE_LABELS[trip.vehicleType]}
                  </p>
                  <p className="font-mono text-base font-bold text-ink">
                    {trip.vehicleRegistration}
                  </p>
                </div>
              </div>
            </div>

            {/* Parties */}
            <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-ink">Parties</h3>
              <div className="flex flex-col gap-3 text-sm">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                    Mill Owner
                  </p>
                  <p className="mt-0.5 font-medium text-ink">
                    {trip.millName}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-charcoal/50">
                    Lorry Owner
                  </p>
                  <p className="mt-0.5 font-medium text-ink">
                    {trip.ownerName}
                  </p>
                </div>
              </div>
            </div>

            {/* Timestamps */}
            <div className="rounded-lg border border-charcoal/10 bg-white p-5 shadow-sm">
              <h3 className="mb-3 font-semibold text-ink">Timeline</h3>
              <div className="flex flex-col gap-2 text-xs text-charcoal/60">
                <div className="flex justify-between">
                  <span>Created</span>
                  <span className="font-medium text-ink">
                    {formatDateTime(trip.createdAt)}
                  </span>
                </div>
                {trip.pickedUpAt && (
                  <div className="flex justify-between">
                    <span>Picked Up</span>
                    <span className="font-medium text-ink">
                      {formatDateTime(trip.pickedUpAt)}
                    </span>
                  </div>
                )}
                {trip.deliveredAt && (
                  <div className="flex justify-between">
                    <span>Delivered</span>
                    <span className="font-medium text-ink">
                      {formatDateTime(trip.deliveredAt)}
                    </span>
                  </div>
                )}
                {trip.cancelledAt && (
                  <div className="flex justify-between">
                    <span>Cancelled</span>
                    <span className="font-medium text-vermilion">
                      {formatDateTime(trip.cancelledAt)}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <Modal
          title="Cancel Trip"
          onClose={() => {
            setShowCancelModal(false);
            setCancelReason("");
            setCancelError(null);
          }}
        >
          <div className="flex flex-col gap-4">
            {cancelError && (
              <div className="rounded-md bg-vermilion/10 px-4 py-3 text-sm font-medium text-vermilion">
                {cancelError}
              </div>
            )}
            <p className="text-sm text-charcoal/60">
              Please provide a reason for cancelling this trip. This action
              cannot be undone.
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              placeholder="Reason for cancellation…"
              className="w-full rounded-md border border-charcoal/20 px-3 py-2.5 text-sm text-ink placeholder:text-charcoal/40 focus:border-night focus:outline-none focus:ring-1 focus:ring-night"
            />
            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                  setCancelError(null);
                }}
              >
                Keep Trip
              </Button>
              <Button
                variant="danger"
                disabled={
                  cancelReason.trim().length < 5 || cancelMutation.isPending
                }
                onClick={() => cancelMutation.mutate(cancelReason.trim())}
              >
                {cancelMutation.isPending
                  ? "Cancelling…"
                  : "Confirm Cancellation"}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Rate Modal */}
      {showRateModal && (
        <RateModal
          label={
            isMillUser ? "Rate the lorry owner" : "Rate the mill owner"
          }
          onClose={() => setShowRateModal(false)}
          onSubmit={async (score, comment) => {
            await rateMutation.mutateAsync({ score, comment });
          }}
        />
      )}
    </AppShell>
  );
}
