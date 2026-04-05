import { Navigate, Route, Routes } from 'react-router-dom';
import { GardenProvider } from './garden/GardenContext';
import { AppShell } from './layout/AppShell';
import { CalendarPage } from './pages/CalendarPage';
import { HomeDashboard } from './pages/HomeDashboard';
import { GardenMapPage } from './pages/GardenMapPage';
import { LoginPage } from './pages/LoginPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { PlantingPlanPage } from './pages/PlantingPlanPage';
import { PlantProfilesPage } from './pages/PlantProfilesPage';
import { RegisterPage } from './pages/RegisterPage';
import { ProtectedRoute } from './routes/ProtectedRoute';
import { PublicOnlyRoute } from './routes/PublicOnlyRoute';

export function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      <Route element={<ProtectedRoute />}>
        <Route
          element={
            <GardenProvider>
              <AppShell />
            </GardenProvider>
          }
        >
          <Route path="/" element={<HomeDashboard />} />
          <Route path="/garden" element={<GardenMapPage />} />
          <Route path="/plan" element={<PlantingPlanPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/plants" element={<PlantProfilesPage />} />
          <Route path="/notes" element={<PlaceholderPage titleKey="nav.notes" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
