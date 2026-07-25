import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { UserRole } from '@slm/shared';
import { useAuth } from '../lib/auth';

export const Layout: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isOwner = user?.role === UserRole.owner;
  const isDriver = user?.role === UserRole.driver;
  const isCustomer = user?.role === UserRole.customer;
  const isAdmin = user?.role === UserRole.admin;

  const links = [
    { to: '/', label: 'Overview', show: true },
    // Customer specific links
    { to: '/search', label: 'Hire Lorry', show: isCustomer },
    { to: '/post-load', label: 'Post Cargo Load', show: isCustomer },
    // Owner specific links
    { to: '/vehicles', label: 'My Vehicles', show: isOwner },
    { to: '/drivers', label: 'My Drivers', show: isOwner },
    { to: '/owner/earnings', label: 'Return Trip Earnings', show: isOwner },
    // Driver specific links
    { to: '/driver/queue', label: 'Trips Queue', show: isDriver },
    { to: `/drivers/${user?.id}/profile`, label: 'My Profile', show: isDriver },
    // Admin specific links
    { to: '/admin', label: 'Admin Dashboard', show: isAdmin },
    { to: '/admin/kyc', label: 'KYC Queue', show: isAdmin },
    { to: '/admin/disputes', label: 'Disputes Queue', show: isAdmin },
  ];

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground">
      {/* Sidebar */}
      <aside className="hidden w-64 flex-col border-r border-border bg-slate-950/40 backdrop-blur-md md:flex">
        {/* Brand */}
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link to="/" className="flex items-center gap-2 font-bold text-xl text-white">
            <span className="h-6 w-6 rounded-md bg-brand flex items-center justify-center text-xs text-brand-foreground">🚚</span>
            SLM Portal
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 p-4">
          {links
            .filter((l) => l.show)
            .map((link) => {
              const active = location.pathname === link.to;
              return (
                <Link
                  key={link.to}
                  to={link.to}
                  className={`flex items-center rounded-lg px-4 py-2.5 text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-brand text-brand-foreground shadow-md shadow-brand/20'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
        </nav>

        {/* User Info / Logout Footer */}
        <div className="border-t border-border p-4 bg-slate-950/60">
          <div className="flex items-center gap-3 px-2 py-1.5 mb-3">
            <div className="h-9 w-9 rounded-full bg-brand/10 border border-brand/20 flex items-center justify-center font-semibold text-brand">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="truncate text-sm font-semibold text-white">{user?.name}</p>
              <p className="truncate text-xs text-muted-foreground capitalize">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex w-full items-center justify-center rounded-lg border border-border px-4 py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 hover:border-destructive/20 transition-all duration-200"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header (Mobile nav indicator + Title) */}
        <header className="flex h-16 items-center justify-between border-b border-border bg-slate-950/20 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="font-semibold text-lg text-white">
              {location.pathname === '/' ? 'Dashboard Overview' : links.find(l => l.to === location.pathname)?.label || 'Detail View'}
            </span>
          </div>

          {/* User profile dropdown trigger/avatar for desktop */}
          <div className="flex items-center gap-4">
            <div className="text-right text-xs hidden md:block">
              <span className="block text-muted-foreground">Logined as</span>
              <span className="font-semibold text-white">{user?.email}</span>
            </div>
            <div className="h-8 w-8 rounded-full bg-brand flex items-center justify-center text-xs font-bold text-brand-foreground md:hidden" onClick={handleLogout} title="Click to Sign Out">
              {user?.name.charAt(0).toUpperCase()}
            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-6 bg-slate-950/10">
          <div className="mx-auto max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
