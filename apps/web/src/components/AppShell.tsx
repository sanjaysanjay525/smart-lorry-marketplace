import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import { Truck, Users, LogOut } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const NAV_ITEMS = [
  { to: "/dashboard/vehicles", label: "Fleet", icon: Truck },
  { to: "/dashboard/drivers", label: "Drivers", icon: Users },
];

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <div className="flex min-h-screen bg-paper">
      <aside className="flex w-60 flex-shrink-0 flex-col bg-night text-paper">
        <div className="flex items-center gap-2 px-5 py-6">
          <span className="text-2xl font-display font-bold tracking-wide text-marigold">SLM</span>
          <span className="font-display text-sm leading-tight text-paper/80">
            Smart Lorry
            <br />
            Marketplace
          </span>
        </div>

        <nav className="flex-1 px-3 py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `mb-1 flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors ${
                  isActive ? "bg-night-light text-paper" : "text-paper/70 hover:bg-night-light/60 hover:text-paper"
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-paper/10 px-3 py-4">
          <div className="mb-3 px-3">
            <p className="truncate text-sm font-medium text-paper">{user?.name}</p>
            <p className="truncate text-xs capitalize text-paper/60">{user?.role}</p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-paper/70 hover:bg-night-light/60 hover:text-paper"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}
