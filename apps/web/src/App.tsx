import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { MillDashboardPage } from "./pages/MillDashboardPage";
import { OwnerDashboardPage } from "./pages/OwnerDashboardPage";
import { PostLoadPage } from "./pages/PostLoadPage";
import { LoadBoardPage } from "./pages/LoadBoardPage";
import { LoadDetailPage } from "./pages/LoadDetailPage";
import { TripDetailPage } from "./pages/TripDetailPage";
import { TripsListPage } from "./pages/TripsListPage";
import { AdminDashboardPage } from "./pages/AdminDashboardPage";
import { BrowseLorriesPage } from "./pages/BrowseLorriesPage";
import { FleetPage } from "./pages/FleetPage";
import { StartPage } from "./pages/StartPage";
import { RequireAuth } from "./components/RequireAuth";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/" element={<StartPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      {/* Mill owner */}
      <Route path="/dashboard/mill" element={<RequireAuth><MillDashboardPage /></RequireAuth>} />
      <Route path="/loads/new" element={<RequireAuth><PostLoadPage /></RequireAuth>} />
      <Route path="/browse-lorries" element={<RequireAuth><BrowseLorriesPage /></RequireAuth>} />

      {/* Lorry owner */}
      <Route path="/dashboard/owner" element={<RequireAuth><OwnerDashboardPage /></RequireAuth>} />
      <Route path="/fleet" element={<RequireAuth><FleetPage /></RequireAuth>} />

      {/* Both roles */}
      <Route path="/loads" element={<RequireAuth><LoadBoardPage /></RequireAuth>} />
      <Route path="/loads/:id" element={<RequireAuth><LoadDetailPage /></RequireAuth>} />
      <Route path="/trips" element={<RequireAuth><TripsListPage /></RequireAuth>} />
      <Route path="/trips/:id" element={<RequireAuth><TripDetailPage /></RequireAuth>} />

      {/* Admin */}
      <Route path="/admin" element={<RequireAuth><AdminDashboardPage /></RequireAuth>} />

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
