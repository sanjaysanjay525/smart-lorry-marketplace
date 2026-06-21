import type { ButtonHTMLAttributes } from "react";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
}

const VARIANT_STYLES: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary: "bg-night text-paper hover:bg-night-deep",
  secondary: "bg-marigold text-ink hover:bg-marigold-dark",
  ghost: "bg-transparent text-night border border-line hover:bg-line/40",
  danger: "bg-transparent text-vermilion border border-vermilion/40 hover:bg-vermilion/10",
};

const SIZE_STYLES: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "px-3 py-1.5 text-sm",
  md: "px-4 py-2.5 text-sm",
};

export function Button({ variant = "primary", size = "md", className = "", ...props }: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${VARIANT_STYLES[variant]} ${SIZE_STYLES[size]} ${className}`}
      {...props}
    />
  );
}
