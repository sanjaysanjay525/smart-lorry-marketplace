import { Routes, Route, Navigate } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { RegisterPage } from "./pages/RegisterPage";
import { FleetPage } from "./pages/FleetPage";
import { DriversPage } from "./pages/DriversPage";
import { DriverProfilePage } from "./pages/DriverProfilePage";
import { RequireAuth } from "./components/RequireAuth";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />

      <Route
        path="/dashboard/vehicles"
        element={
          <RequireAuth>
            <FleetPage />
          </RequireAuth>
        }
      />
      <Route
        path="/dashboard/drivers"
        element={
          <RequireAuth>
            <DriversPage />
          </RequireAuth>
        }
      />
      <Route
        path="/drivers/:driverId"
        element={
          <RequireAuth>
            <DriverProfilePage />
          </RequireAuth>
        }
      />

      <Route path="/" element={<Navigate to="/dashboard/vehicles" replace />} />
      <Route path="*" element={<Navigate to="/dashboard/vehicles" replace />} />
    </Routes>
  );
}
