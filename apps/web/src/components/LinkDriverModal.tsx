import { useState, type FormEvent } from "react";
import { Search, CircleCheck } from "lucide-react";
import { Modal } from "./Modal";
import { TextField, SelectField } from "./FormField";
import { Button } from "./Button";
import { lookupDriverUser } from "../lib/users";
import { extractErrorMessage } from "../lib/api";
import type { CreateDriverInput, DriverLookupDTO, VehicleDTO } from "@smart-lorry/shared";

interface LinkDriverModalProps {
  unassignedVehicles: VehicleDTO[];
  presetVehicle?: VehicleDTO;
  onClose: () => void;
  onSubmit: (input: CreateDriverInput) => Promise<void>;
}

export function LinkDriverModal({ unassignedVehicles, presetVehicle, onClose, onSubmit }: LinkDriverModalProps) {
  const [email, setEmail] = useState("");
  const [foundUser, setFoundUser] = useState<DriverLookupDTO | null>(null);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const [vehicleId, setVehicleId] = useState(presetVehicle?.id ?? "");
  const [licenseNumber, setLicenseNumber] = useState("");
  const [licenseExpiry, setLicenseExpiry] = useState("");
  const [yearsExperience, setYearsExperience] = useState("0");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLookup(e: FormEvent) {
    e.preventDefault();
    setLookupError(null);
    setFoundUser(null);
    setIsLookingUp(true);
    try {
      const user = await lookupDriverUser({ email });
      setFoundUser(user);
    } catch (err) {
      setLookupError(extractErrorMessage(err));
    } finally {
      setIsLookingUp(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!foundUser) return;
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await onSubmit({
        userId: foundUser.id,
        vehicleId: vehicleId || undefined,
        licenseNumber,
        licenseExpiry: new Date(licenseExpiry),
        yearsExperience: Number(yearsExperience),
      });
      onClose();
    } catch (err) {
      setSubmitError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Modal title="Link a driver" onClose={onClose}>
      {!foundUser ? (
        <form className="space-y-4" onSubmit={handleLookup}>
          <p className="text-sm text-slate">
            The driver needs a Smart Lorry Marketplace account (registered with the "Driver" role) before you can
            link them. Enter the email they signed up with.
          </p>
          <TextField
            label="Driver's email"
            name="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {lookupError && (
            <p role="alert" className="rounded-md bg-vermilion/10 px-3 py-2 text-sm text-vermilion">
              {lookupError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isLookingUp}>
              <Search className="h-4 w-4" />
              {isLookingUp ? "Searching…" : "Find driver"}
            </Button>
          </div>
        </form>
      ) : (
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 rounded-md bg-highway-green/10 px-3 py-2.5 text-sm text-highway-green">
            <CircleCheck className="h-4 w-4 flex-shrink-0" />
            Found <span className="font-semibold">{foundUser.name}</span>
          </div>

          <TextField
            label="License number"
            name="licenseNumber"
            mono
            required
            value={licenseNumber}
            onChange={(e) => setLicenseNumber(e.target.value)}
          />
          <TextField
            label="License expiry"
            name="licenseExpiry"
            type="date"
            required
            value={licenseExpiry}
            onChange={(e) => setLicenseExpiry(e.target.value)}
          />
          <TextField
            label="Years of experience"
            name="yearsExperience"
            type="number"
            min={0}
            max={60}
            required
            value={yearsExperience}
            onChange={(e) => setYearsExperience(e.target.value)}
          />

          {presetVehicle ? (
            <p className="text-sm text-slate">
              Will be assigned to <span className="font-mono font-semibold text-ink">{presetVehicle.registration}</span>
            </p>
          ) : (
            <SelectField
              label="Assign to a vehicle (optional)"
              name="vehicleId"
              value={vehicleId}
              onChange={(e) => setVehicleId(e.target.value)}
            >
              <option value="">Not assigned yet</option>
              {unassignedVehicles.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.registration}
                </option>
              ))}
            </SelectField>
          )}

          {submitError && (
            <p role="alert" className="rounded-md bg-vermilion/10 px-3 py-2 text-sm text-vermilion">
              {submitError}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={() => setFoundUser(null)}>
              Back
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Linking…" : "Link driver"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}
