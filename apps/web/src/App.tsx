import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { UserRole } from '@slm/shared';
import { AuthProvider } from './lib/auth';
import { ProtectedRoute } from './components/ProtectedRoute';
import { Layout } from './components/Layout';

// Import Pages
import { Login } from './pages/Login';
import { Register } from './pages/Register';
import { Dashboard } from './pages/Dashboard';
import { VehicleList } from './pages/owner/VehicleList';
import { VehicleForm } from './pages/owner/VehicleForm';
import { DriverList } from './pages/owner/DriverList';
import { DriverForm } from './pages/owner/DriverForm';
import { DriverProfile } from './pages/driver/Profile';

// Import Phase 2 Pages
import { SearchLorry } from './pages/customer/SearchLorry';
import { Checkout } from './pages/customer/Checkout';
import { LiveTrack } from './pages/customer/LiveTrack';
import { Reviews } from './pages/customer/Reviews';
import { TripsQueue } from './pages/driver/TripsQueue';

// Import Phase 3 Pages
import { PostLoad } from './pages/customer/PostLoad';
import { EarningsAnalytics } from './pages/owner/EarningsAnalytics';
import { TripCompletion } from './pages/driver/TripCompletion';
import { NegotiateRate } from './pages/customer/NegotiateRate';

// Import Admin/Phase 6 Pages
import { AdminDashboard } from './pages/admin/AdminDashboard';
import { KycQueue } from './pages/admin/KycQueue';
import { Disputes } from './pages/admin/Disputes';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Protected Routes inside Layout */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              {/* Common dashboard landing */}
              <Route index element={<Dashboard />} />

              {/* Owner routes */}
              <Route
                path="vehicles"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.owner]}>
                    <VehicleList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="vehicles/new"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.owner]}>
                    <VehicleForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="vehicles/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.owner]}>
                    <VehicleForm />
                  </ProtectedRoute>
                }
              />

              <Route
                path="drivers"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.owner]}>
                    <DriverList />
                  </ProtectedRoute>
                }
              />
              <Route
                path="drivers/new"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.owner]}>
                    <DriverForm />
                  </ProtectedRoute>
                }
              />
              <Route
                path="drivers/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.owner]}>
                    <DriverForm />
                  </ProtectedRoute>
                }
              />

              {/* Driver profile/schedule */}
              <Route
                path="drivers/:id/profile"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.owner, UserRole.driver]}>
                    <DriverProfile />
                  </ProtectedRoute>
                }
              />

              {/* Phase 2: Lorry Rental Customer routes */}
              <Route
                path="search"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.customer]}>
                    <SearchLorry />
                  </ProtectedRoute>
                }
              />
              <Route
                path="checkout"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.customer]}>
                    <Checkout />
                  </ProtectedRoute>
                }
              />
              <Route
                path="trips/:id/track"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.customer, UserRole.owner]}>
                    <LiveTrack />
                  </ProtectedRoute>
                }
              />
              <Route
                path="trips/:id/reviews"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.customer]}>
                    <Reviews />
                  </ProtectedRoute>
                }
              />

              {/* Phase 2: Lorry Rental Driver routes */}
              <Route
                path="driver/queue"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.driver]}>
                    <TripsQueue />
                  </ProtectedRoute>
                }
              />

              {/* Phase 3: Return Trip Marketplace */}
              <Route
                path="owner/earnings"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.owner]}>
                    <EarningsAnalytics />
                  </ProtectedRoute>
                }
              />
              <Route
                path="post-load"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.customer]}>
                    <PostLoad />
                  </ProtectedRoute>
                }
              />
              <Route
                path="negotiate/:loadId"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.customer]}>
                    <NegotiateRate />
                  </ProtectedRoute>
                }
              />
              <Route
                path="trips/:id/complete"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.driver]}>
                    <TripCompletion />
                  </ProtectedRoute>
                }
              />

              {/* Admin Routes */}
              <Route
                path="admin"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.admin]}>
                    <AdminDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/kyc"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.admin]}>
                    <KycQueue />
                  </ProtectedRoute>
                }
              />
              <Route
                path="admin/disputes"
                element={
                  <ProtectedRoute allowedRoles={[UserRole.admin]}>
                    <Disputes />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Fallback redirect */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
};

export default App;
