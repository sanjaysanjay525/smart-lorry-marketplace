import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useNavigate, Link } from "react-router-dom";
import { FilePlus2, CheckCircle2 } from "lucide-react";
import { AppShell } from "../components/AppShell";
import { Button } from "../components/Button";
import { TextField, SelectField } from "../components/FormField";
import { createLoad } from "../lib/loads";
import { VEHICLE_TYPE_LABELS } from "../lib/labels";
import { extractErrorMessage } from "../lib/api";
import { TN_CITIES_GEO } from "@smart-lorry/shared";
import type { VehicleType } from "@smart-lorry/shared";

const MATERIAL_SUGGESTIONS = [
  "Rice Bags",
  "Cotton Bales",
  "Cement",
  "Fertilizer",
  "Granite",
  "Steel",
  "Sand",
];

export function PostLoadPage() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [successCity, setSuccessCity] = useState<string | null>(null);

  // Form state
  const [materialType, setMaterialType] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [vehicleTypeReq, setVehicleTypeReq] = useState<VehicleType>("truck_14ft");

  const [pickupCity, setPickupCity] = useState("");
  const [pickupAddress, setPickupAddress] = useState("");
  const [pickupLat, setPickupLat] = useState<number>(0);
  const [pickupLng, setPickupLng] = useState<number>(0);

  const [dropCity, setDropCity] = useState("");
  const [dropAddress, setDropAddress] = useState("");
  const [dropLat, setDropLat] = useState<number>(0);
  const [dropLng, setDropLng] = useState<number>(0);

  const [offeredRate, setOfferedRate] = useState("");
  const [availableFrom, setAvailableFrom] = useState("");
  const [availableUntil, setAvailableUntil] = useState("");
  const [notes, setNotes] = useState("");

  function handleCityChange(
    city: string,
    setCity: (v: string) => void,
    setLat: (v: number) => void,
    setLng: (v: number) => void,
  ) {
    setCity(city);
    const match = TN_CITIES_GEO.find((c) => c.name === city);
    if (match) {
      setLat(match.lat);
      setLng(match.lng);
    }
  }

  const postMutation = useMutation({
    mutationFn: createLoad,
    onSuccess: () => {
      setSuccessCity(pickupCity);
    },
    onError: (err) => {
      setError(extractErrorMessage(err));
    },
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!pickupCity || pickupLat === 0) {
      setError("Please select a valid pickup city.");
      return;
    }
    if (!dropCity || dropLat === 0) {
      setError("Please select a valid drop city.");
      return;
    }
    if (pickupCity === dropCity) {
      setError("Pickup and drop cities cannot be the same.");
      return;
    }
    if (!offeredRate || Number(offeredRate) <= 0) {
      setError("Please enter a valid offered rate.");
      return;
    }
    if (!availableFrom || !availableUntil) {
      setError("Please select both availability dates.");
      return;
    }
    if (new Date(availableUntil) <= new Date(availableFrom)) {
      setError("'Available Until' must be after 'Available From'.");
      return;
    }

    const fullPickupAddress = pickupAddress
      ? `${pickupAddress}, ${pickupCity}, Tamil Nadu`
      : `${pickupCity}, Tamil Nadu`;
    const fullDropAddress = dropAddress
      ? `${dropAddress}, ${dropCity}, Tamil Nadu`
      : `${dropCity}, Tamil Nadu`;

    postMutation.mutate({
      materialType,
      weightKg: Number(weightKg),
      vehicleTypeReq,
      pickupAddress: fullPickupAddress,
      pickupLat,
      pickupLng,
      dropAddress: fullDropAddress,
      dropLat,
      dropLng,
      offeredRate: Number(offeredRate),
      availableFrom: new Date(availableFrom).toISOString(),
      availableUntil: new Date(availableUntil).toISOString(),
      notes: notes.trim() || undefined,
    });
  }

  // Success state
  if (successCity) {
    return (
      <AppShell>
        <div className="mx-auto max-w-lg px-8 py-20 text-center">
          <div className="rounded-xl border border-neem/30 bg-neem/5 p-8">
            <CheckCircle2 className="mx-auto h-16 w-16 text-neem" />
            <h2 className="mt-4 text-2xl font-bold text-ink">
              Load Posted Successfully!
            </h2>
            <p className="mt-3 text-sm text-charcoal/70">
              Your load has been posted. Lorry owners near{" "}
              <span className="font-semibold text-ink">{successCity}</span> have
              been notified by SMS.
            </p>
            <Link
              to="/loads"
              className="mt-6 inline-flex items-center gap-2 rounded-md bg-night px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-night-deep"
            >
              View Load Board
            </Link>
          </div>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-semibold text-ink">Post a Load</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Fill in the details below to post your load. Nearby lorry owners will
            be notified by SMS.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-6 rounded-lg border border-charcoal/10 bg-white p-6 shadow-sm"
        >
          {error && (
            <div className="rounded-md bg-vermilion/10 px-4 py-3 text-sm font-medium text-vermilion">
              {error}
            </div>
          )}

          {/* Material & Weight */}
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Material Type
              </span>
              <input
                list="material-suggestions"
                value={materialType}
                onChange={(e) => setMaterialType(e.target.value)}
                placeholder="e.g. Rice Bags, Cotton Bales"
                required
                className="w-full rounded-md border border-charcoal/20 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-charcoal/40 focus:border-night focus:outline-none focus:ring-1 focus:ring-night"
              />
              <datalist id="material-suggestions">
                {MATERIAL_SUGGESTIONS.map((m) => (
                  <option key={m} value={m} />
                ))}
              </datalist>
            </div>

            <TextField
              label="Weight (kg)"
              type="number"
              value={weightKg}
              onChange={(e) => setWeightKg(e.target.value)}
              placeholder="e.g. 5000"
              min="1"
              required
            />
          </div>

          {/* Vehicle Type */}
          <SelectField
            label="Vehicle Type Required"
            value={vehicleTypeReq}
            onChange={(e) =>
              setVehicleTypeReq(e.target.value as VehicleType)
            }
            required
          >
            {Object.entries(VEHICLE_TYPE_LABELS).map(([val, label]) => (
              <option key={val} value={val}>
                {label}
              </option>
            ))}
          </SelectField>

          {/* Route Section */}
          <div className="border-t border-charcoal/10 pt-4">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-charcoal/60">
              Route
            </h3>

            {/* Pickup */}
            <div className="mb-4">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-neem">
                Pickup
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="City"
                  value={pickupCity}
                  onChange={(e) =>
                    handleCityChange(
                      e.target.value,
                      setPickupCity,
                      setPickupLat,
                      setPickupLng,
                    )
                  }
                  required
                >
                  <option value="">Select city</option>
                  {TN_CITIES_GEO.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </SelectField>

                <TextField
                  label="Full Address"
                  value={pickupAddress}
                  onChange={(e) => setPickupAddress(e.target.value)}
                  placeholder="e.g. 12, Industrial Estate"
                />
              </div>
            </div>

            {/* Drop */}
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-vermilion">
                Drop
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <SelectField
                  label="City"
                  value={dropCity}
                  onChange={(e) =>
                    handleCityChange(
                      e.target.value,
                      setDropCity,
                      setDropLat,
                      setDropLng,
                    )
                  }
                  required
                >
                  <option value="">Select city</option>
                  {TN_CITIES_GEO.map((c) => (
                    <option key={c.name} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </SelectField>

                <TextField
                  label="Full Address"
                  value={dropAddress}
                  onChange={(e) => setDropAddress(e.target.value)}
                  placeholder="e.g. Warehouse, NH Road"
                />
              </div>
            </div>
          </div>

          {/* Scheduling & Rate */}
          <div className="border-t border-charcoal/10 pt-4">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-charcoal/60">
              Scheduling & Rate
            </h3>
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <TextField
                label="Available From"
                type="datetime-local"
                value={availableFrom}
                onChange={(e) => setAvailableFrom(e.target.value)}
                required
              />

              <TextField
                label="Available Until"
                type="datetime-local"
                value={availableUntil}
                onChange={(e) => setAvailableUntil(e.target.value)}
                required
              />
            </div>

            <div className="mt-6">
              <TextField
                label="Offered Rate (₹)"
                type="number"
                value={offeredRate}
                onChange={(e) => setOfferedRate(e.target.value)}
                placeholder="e.g. 12000"
                min="1"
                mono
                required
              />
              <p className="mt-1.5 text-xs text-charcoal/50">
                Lorry owners will be notified by SMS
              </p>
            </div>
          </div>

          {/* Notes */}
          <div className="border-t border-charcoal/10 pt-4">
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-ink">
                Notes (optional)
              </span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                maxLength={500}
                placeholder="Any special instructions for the lorry owner…"
                className="w-full rounded-md border border-charcoal/20 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-charcoal/40 focus:border-night focus:outline-none focus:ring-1 focus:ring-night"
              />
            </label>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 border-t border-charcoal/10 pt-6">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate("/loads")}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={postMutation.isPending}>
              <FilePlus2 className="h-4 w-4" />
              {postMutation.isPending ? "Posting…" : "Post Load"}
            </Button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
