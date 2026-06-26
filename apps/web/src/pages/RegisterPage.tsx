import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Package, Truck } from "lucide-react";
import { AuthLayout } from "../components/AuthLayout";
import { TextField } from "../components/FormField";
import { Button } from "../components/Button";
import { useAuth } from "../hooks/useAuth";
import { extractErrorMessage } from "../lib/api";
import type { UserRole } from "@smart-lorry/shared";

type RegisterableRole = Exclude<UserRole, "admin">;

const ROLE_OPTIONS: { value: RegisterableRole; label: string; description: string; icon: typeof Truck }[] = [
  { value: "mill",  label: "Mill Owner",  description: "Post loads & book lorries", icon: Package },
  { value: "owner", label: "Lorry Owner", description: "Register lorries & accept loads", icon: Truck },
];

export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [role, setRole] = useState<RegisterableRole>("owner");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      await register({ role, name, email, phone, password });
      navigate(role === "mill" ? "/dashboard/mill" : "/dashboard/owner");
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <AuthLayout title="Create your account" subtitle="Choose your role — this shapes your dashboard.">
      <form className="space-y-5" onSubmit={handleSubmit}>
        <div role="radiogroup" aria-label="Account type" className="grid grid-cols-2 gap-3">
          {ROLE_OPTIONS.map(({ value, label, description, icon: Icon }) => {
            const isSelected = role === value;
            return (
              <button
                key={value}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setRole(value)}
                className={`flex flex-col items-center gap-1.5 rounded-md border px-3 py-4 text-center transition-colors ${
                  isSelected
                    ? "border-night bg-night text-paper"
                    : "border-line bg-white text-ink hover:border-night/40"
                }`}
              >
                <Icon className={`h-6 w-6 ${isSelected ? "text-marigold" : "text-slate"}`} />
                <span className="text-sm font-semibold">{label}</span>
                <span className={`text-[11px] leading-tight ${isSelected ? "text-paper/70" : "text-slate"}`}>
                  {description}
                </span>
              </button>
            );
          })}
        </div>

        <TextField label="Full name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
        <TextField
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <TextField
          label="Phone"
          name="phone"
          type="tel"
          placeholder="+91XXXXXXXXXX"
          required
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
        />
        <TextField
          label="Password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && (
          <p role="alert" className="rounded-md bg-vermilion/10 px-3 py-2 text-sm text-vermilion">
            {error}
          </p>
        )}

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? "Creating account…" : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-sm text-slate">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-night underline underline-offset-4">
          Log in
        </Link>
      </p>
    </AuthLayout>
  );
}
