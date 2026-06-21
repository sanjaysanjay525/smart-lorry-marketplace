import type { ReactNode } from "react";

export function AuthLayout({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden bg-night px-12 py-12 text-paper lg:flex">
        <div className="absolute inset-0 opacity-20" aria-hidden="true">
          <RouteLineArt />
        </div>

        <div className="relative z-10">
          <span className="text-3xl font-display font-bold tracking-wide text-marigold">SLM</span>
        </div>

        <div className="relative z-10 max-w-sm">
          <h1 className="font-display text-5xl font-semibold leading-[1.05] text-paper">
            Every empty mile
            <br />
            is a missed fare.
          </h1>
          <p className="mt-4 text-sm leading-relaxed text-paper/70">
            Rent a lorry, fill the return leg, or split a route with another shipper —
            one marketplace for owners, drivers, and customers.
          </p>
        </div>

        <p className="relative z-10 text-xs text-paper/40">© {new Date().getFullYear()} Smart Lorry Marketplace</p>
      </div>

      <div className="flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-sm">
          <h2 className="font-display text-3xl font-semibold text-ink">{title}</h2>
          <p className="mt-1 text-sm text-slate">{subtitle}</p>
          <div className="mt-8">{children}</div>
        </div>
      </div>
    </div>
  );
}

function RouteLineArt() {
  return (
    <svg viewBox="0 0 480 800" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-full w-full">
      <path
        d="M -20 100 C 120 100, 80 260, 220 280 S 420 380, 380 520 S 180 600, 240 740 S 480 820, 480 820"
        stroke="#F2A93B"
        strokeWidth="2"
        strokeDasharray="2 14"
        strokeLinecap="round"
      />
      <circle cx="-20" cy="100" r="5" fill="#F2A93B" />
      <circle cx="220" cy="280" r="5" fill="#C7402B" />
      <circle cx="380" cy="520" r="5" fill="#2F8F6E" />
      <circle cx="240" cy="740" r="5" fill="#F2A93B" />
    </svg>
  );
}
