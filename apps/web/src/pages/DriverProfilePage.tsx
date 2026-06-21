import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Star, ShieldCheck, UserRound } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { KycStatusChip } from "../components/StatusChip";
import { getDriverPublicProfile } from "../lib/drivers";

export function DriverProfilePage() {
  const { driverId } = useParams<{ driverId: string }>();

  const { data: driver, isLoading } = useQuery({
    queryKey: ["driver-profile", driverId],
    queryFn: () => getDriverPublicProfile(driverId!),
    enabled: Boolean(driverId),
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-lg px-8 py-10">
        {isLoading && <p className="text-sm text-slate">Loading driver profile…</p>}

        {driver && (
          <div className="overflow-hidden rounded-lg border border-line bg-white">
            <div className="flex items-center gap-4 bg-night px-6 py-6 text-paper">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-marigold/20">
                <UserRound className="h-7 w-7 text-marigold" />
              </div>
              <div>
                <h1 className="text-2xl font-semibold">{driver.name}</h1>
                <div className="mt-1 flex items-center gap-1.5 text-sm text-paper/70">
                  <Star className="h-4 w-4 fill-marigold text-marigold" />
                  {driver.ratingAvg.toFixed(1)} rating
                </div>
              </div>
            </div>

            <div className="space-y-4 px-6 py-6">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate">Experience</span>
                <span className="text-sm font-medium text-ink">{driver.yearsExperience} years</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate">Verification</span>
                <KycStatusChip status={driver.kycStatus} />
              </div>

              {driver.kycStatus === "approved" && (
                <p className="flex items-center gap-2 rounded-md bg-highway-green/10 px-3 py-2.5 text-sm text-highway-green">
                  <ShieldCheck className="h-4 w-4 flex-shrink-0" />
                  Identity and license verified by Smart Lorry Marketplace.
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
