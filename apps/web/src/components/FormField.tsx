import type { InputHTMLAttributes, SelectHTMLAttributes, ReactNode } from "react";

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  mono?: boolean;
}

export function TextField({ label, error, mono, id, className = "", ...props }: TextFieldProps) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <input
        id={fieldId}
        className={`w-full rounded-md border bg-paper px-3 py-2.5 text-sm text-ink placeholder:text-slate/60 ${
          mono ? "font-mono" : "font-body"
        } ${
          error ? "border-vermilion" : "border-line"
        } focus:border-night focus:outline-none focus:ring-1 focus:ring-night ${className}`}
        {...props}
      />
      {error && <span className="mt-1 block text-xs font-medium text-vermilion">{error}</span>}
    </label>
  );
}

interface SelectFieldProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  children: ReactNode;
}

export function SelectField({ label, error, id, className = "", children, ...props }: SelectFieldProps) {
  const fieldId = id ?? props.name;
  return (
    <label htmlFor={fieldId} className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      <select
        id={fieldId}
        className={`w-full rounded-md border bg-paper px-3 py-2.5 text-sm text-ink ${
          error ? "border-vermilion" : "border-line"
        } focus:border-night focus:outline-none focus:ring-1 focus:ring-night ${className}`}
        {...props}
      >
        {children}
      </select>
      {error && <span className="mt-1 block text-xs font-medium text-vermilion">{error}</span>}
    </label>
  );
}
