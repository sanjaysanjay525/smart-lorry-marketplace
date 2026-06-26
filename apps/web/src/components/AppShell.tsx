import { type ReactNode } from "react";
import { NavLink } from "react-router-dom";
import {
  Truck, LogOut, Compass, PlusCircle, FileText,
  LayoutDashboard, Shield, Search,
} from "lucide-react";
import { useAuth } from "../hooks/useAuth";
import { useTranslation } from "react-i18next";
import { api } from "../lib/api";

export function AppShell({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  const navItems: { to: string; label: string; icon: typeof Truck }[] = [];

  if (user?.role === "mill") {
    navItems.push(
      { to: "/dashboard/mill",  label: t("nav.dashboard"),     icon: LayoutDashboard },
      { to: "/loads/new",       label: t("load.post"),     icon: PlusCircle },
      { to: "/loads",           label: t("nav.loads"),    icon: Compass },
      { to: "/browse-lorries",  label: t("nav.browse_lorries", "Browse Lorries"), icon: Search },
    );
  } else if (user?.role === "owner") {
    navItems.push(
      { to: "/dashboard/owner", label: t("nav.dashboard"),  icon: LayoutDashboard },
      { to: "/loads",           label: t("nav.loads"),  icon: Compass },
      { to: "/fleet",           label: t("nav.fleet"),    icon: Truck },
    );
  } else if (user?.role === "admin") {
    navItems.push(
      { to: "/admin", label: t("nav.admin", "Admin Panel"), icon: Shield },
    );
  }

  // All authenticated users can access trips
  if (user) {
    navItems.push({ to: "/trips", label: t("nav.trips"), icon: FileText });
  }

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
          {navItems.map(({ to, label, icon: Icon }) => (
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
            <p className="truncate text-xs capitalize text-paper/60">
              {user?.role === "mill" ? t("auth.role_mill") : user?.role === "owner" ? t("auth.role_owner") : user?.role}
            </p>
          </div>
          <button
            type="button"
            onClick={() => logout()}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-paper/70 hover:bg-night-light/60 hover:text-paper"
          >
            <LogOut className="h-4 w-4" />
            {t("nav.logout")}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto relative">
        <div className="absolute top-4 right-6 z-50">
          <button
            type="button"
            onClick={async () => {
              const nextLang = i18n.language === "en" ? "ta" : "en";
              i18n.changeLanguage(nextLang);
              localStorage.setItem("lang", nextLang);
              if (user) {
                try {
                  await api.patch("/users/me", { preferredLang: nextLang });
                } catch (err) {
                  console.error("Failed to persist language preference", err);
                }
              }
            }}
            className="flex items-center gap-1.5 rounded-full border border-gray-200 bg-white/95 px-3 py-1.5 text-xs font-semibold text-gray-700 shadow-sm transition-all hover:bg-gray-50 active:scale-95"
          >
            🌐 {i18n.language === "en" ? "தமிழ்" : "English"}
          </button>
        </div>
        {children}
      </main>
    </div>
  );
}
