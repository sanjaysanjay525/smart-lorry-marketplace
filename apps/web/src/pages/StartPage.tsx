import { ArrowRight, LogIn, MapPinned, Package, ShieldCheck, Truck } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import heroImage from "../assets/start-hero-lorry.png";
import { useAuth } from "../hooks/useAuth";

function dashboardPathFor(role: string) {
  if (role === "mill") return "/dashboard/mill";
  if (role === "admin") return "/admin";
  return "/dashboard/owner";
}

export function StartPage() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Navigate to={dashboardPathFor(user.role)} replace />;
  }

  return (
    <main className="min-h-screen bg-paper text-ink">
      <section
        className="relative flex min-h-[78svh] overflow-hidden bg-night text-paper"
        style={{ backgroundImage: `url(${heroImage})`, backgroundPosition: "center", backgroundSize: "cover" }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-night via-night/82 to-night/24" aria-hidden="true" />

        <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col px-6 py-5 sm:px-8 lg:px-12">
          <header className="flex items-center justify-between gap-4">
            <Link to="/" className="inline-flex items-center gap-3 text-paper">
              <span className="flex h-10 w-10 items-center justify-center rounded-md bg-marigold text-lg font-display font-bold text-ink">
                SLM
              </span>
              <span className="hidden text-sm font-semibold sm:inline">Smart Lorry Marketplace</span>
            </Link>

            <nav className="flex items-center gap-2">
              <Link
                to="/login"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-paper/25 px-3 py-2 text-sm font-semibold text-paper transition-colors hover:bg-paper/10"
              >
                <LogIn className="h-4 w-4" />
                Log in
              </Link>
              <Link
                to="/register"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-marigold px-3 py-2 text-sm font-semibold text-ink transition-colors hover:bg-marigold-dark"
              >
                Start
                <ArrowRight className="h-4 w-4" />
              </Link>
            </nav>
          </header>

          <div className="flex flex-1 items-center py-12">
            <div className="max-w-2xl">
              <p className="mb-3 inline-flex items-center gap-2 rounded-md border border-paper/20 bg-paper/10 px-3 py-1 text-xs font-semibold uppercase text-marigold">
                <MapPinned className="h-4 w-4" />
                Tamil Nadu routes
              </p>
              <h1 className="font-display text-5xl font-semibold leading-[1.02] text-paper sm:text-6xl">
                Smart Lorry Marketplace
              </h1>
              <p className="mt-5 max-w-xl text-base leading-7 text-paper/78">
                Book lorries, post mill loads, and keep return trips moving from one work-ready dashboard.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 rounded-md bg-marigold px-5 py-3 text-sm font-semibold text-ink transition-colors hover:bg-marigold-dark"
                >
                  Create account
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  to="/login"
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-paper/30 px-5 py-3 text-sm font-semibold text-paper transition-colors hover:bg-paper/10"
                >
                  <LogIn className="h-4 w-4" />
                  Log in
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-line bg-paper">
        <div className="mx-auto grid max-w-7xl gap-4 px-6 py-8 sm:px-8 md:grid-cols-3 lg:px-12">
          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-night text-paper">
              <Package className="h-5 w-5 text-marigold" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Mill Loads</h2>
              <p className="text-sm text-slate">Post cargo and choose matching lorries.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-night text-paper">
              <Truck className="h-5 w-5 text-marigold" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Lorry Owners</h2>
              <p className="text-sm text-slate">Manage fleet, rates, and accepted trips.</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span className="flex h-11 w-11 items-center justify-center rounded-md bg-night text-paper">
              <ShieldCheck className="h-5 w-5 text-marigold" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-ink">Trip Records</h2>
              <p className="text-sm text-slate">Track status, payments, ratings, and proof.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
