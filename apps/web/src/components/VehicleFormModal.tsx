import { useState, type FormEvent } from "react";
import { Modal } from "./Modal";
import { TextField, SelectField } from "./FormField";
import { Button } from "./Button";
import { VEHICLE_TYPE_LABELS } from "../lib/labels";
import type { VehicleDTO, VehicleType, CreateVehicleInput } from "@smart-lorry/shared";

interface VehicleFormModalProps {
  initial?: VehicleDTO;
  onClose: () => void;
  onSubmit: (input: CreateVehicleInput) => Promise<void>;
}

export function VehicleFormModal({ initial, onClose, onSubmit }: VehicleFormModalProps) {
  const [type, setType] = useState<VehicleType>(initial?.type ?? "mini_truck");
  const [capacityKg, setCapacityKg] = useState(initial ? String(initial.capacityKg) : "");
  const [registration, setRegistration] = useState(initial?.registration ?? "");
  const [baseRatePerKm, setBaseRatePerKm] = useState(initial ? String(initial.baseRatePerKm) : "");
  const [baseRatePerHour, setBaseRatePerHour] = useState(initial ? String(initial.baseRatePerHour) : "");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        type,
        capacityKg: Number(capacityKg),
        registration: registration.toUpperCase(),
        baseRatePerKm: Number(baseRatePerKm),
        baseRatePerHour: Number(baseRatePerHour),
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the vehicle. Check the details and try again.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title={initial ? "Edit vehicle" : "Add a vehicle"} onClose={onClose}>
      <form className="space-y-4" onSubmit={handleSubmit}>
        <SelectField
          label="Vehicle type"
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value as VehicleType)}
        >
          {Object.entries(VEHICLE_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </SelectField>

        <TextField
          label="Registration number"
          name="registration"
          mono
          placeholder="TN-37-AB-1234"
          required
          value={registration}
          onChange={(e) => setRegistration(e.target.value)}
        />

        <TextField
          label="Capacity (kg)"
          name="capacityKg"
          type="number"
          min={1}
          step="1"
          required
          value={capacityKg}
          onChange={(e) => setCapacityKg(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Rate per km (₹)"
            name="baseRatePerKm"
            type="number"
            min={0}
            step="0.5"
            required
            value={baseRatePerKm}
            onChange={(e) => setBaseRatePerKm(e.target.value)}
          />
          <TextField
            label="Rate per hour (₹)"
            name="baseRatePerHour"
            type="number"
            min={0}
            step="0.5"
            required
            value={baseRatePerHour}
            onChange={(e) => setBaseRatePerHour(e.target.value)}
          />
        </div>

        {error && (
          <p role="alert" className="rounded-md bg-vermilion/10 px-3 py-2 text-sm text-vermilion">
            {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : initial ? "Save changes" : "Add vehicle"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
