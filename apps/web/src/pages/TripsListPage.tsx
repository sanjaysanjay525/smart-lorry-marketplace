import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ChevronLeft,
  ChevronRight,
  FileText,
  MapPin,
  ArrowRight,
} from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { TripStatusBadge } from "../components/TripStatusBadge";
import { getTrips } from "../lib/trips";
import { formatCurrency, formatDate } from "../lib/labels";

export function TripsListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["trips", page, limit],
    queryFn: () => getTrips(page, limit),
  });

  const trips = data?.data ?? [];
  const totalPages = data?.totalPages ?? 1;

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-8 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-ink">My Trips</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            View all your trips and track their progress
          </p>
        </div>

        {/* Loading */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center text-charcoal/50">
            Loading trips…
          </div>
        ) : trips.length === 0 ? (
          <div className="rounded-lg border border-dashed border-charcoal/20 bg-white p-12 text-center">
            <FileText className="mx-auto h-12 w-12 text-charcoal/30" />
            <h3 className="mt-4 text-lg font-semibold text-ink">
              No trips yet
            </h3>
            <p className="mt-1 text-sm text-charcoal/50">
              When you accept loads or have loads accepted, your trips will
              appear here.
            </p>
          </div>
        ) : (
          <>
            <div className="flex flex-col gap-4">
              {trips.map((trip) => (
                <button
                  key={trip.id}
                  type="button"
                  onClick={() => navigate(`/trips/${trip.id}`)}
                  className="w-full rounded-xl border border-charcoal/10 bg-white p-5 text-left shadow-sm transition hover:shadow-md hover:border-charcoal/20"
                >
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    {/* Left: Load info & route */}
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-semibold text-ink">
                          {trip.load.materialType}
                        </h3>
                        <TripStatusBadge status={trip.status} />
                      </div>

                      <div className="mt-2 flex items-center gap-2 text-sm text-charcoal/70">
                        <MapPin className="h-3.5 w-3.5 text-neem" />
                        <span className="truncate max-w-[150px]">
                          {trip.load.pickupAddress}
                        </span>
                        <ArrowRight className="h-3 w-3 text-charcoal/30" />
                        <MapPin className="h-3.5 w-3.5 text-vermilion" />
                        <span className="truncate max-w-[150px]">
                          {trip.load.dropAddress}
                        </span>
                      </div>
                    </div>

                    {/* Right: Rate & date */}
                    <div className="flex items-center gap-6 sm:flex-col sm:items-end sm:gap-1">
                      <span className="text-lg font-bold text-neem">
                        {formatCurrency(trip.agreedRate)}
                      </span>
                      <span className="text-xs text-charcoal/50">
                        {formatDate(trip.createdAt)}
                      </span>
                    </div>
                  </div>
                </button>
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
    </AppShell>
  );
}
