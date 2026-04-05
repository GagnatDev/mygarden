import { Navigate, Route, Routes } from 'react-router-dom';
import { GardenProvider } from './garden/GardenContext';
import { AppShell } from './layout/AppShell';
import { HomeDashboard } from './pages/HomeDashboard';
import { GardenMapPage } from './pages/GardenMapPage';
import { LoginPage } from './pages/LoginPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
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
          <Route path="/plan" element={<PlaceholderPage titleKey="nav.plantingPlan" />} />
          <Route path="/calendar" element={<PlaceholderPage titleKey="nav.calendar" />} />
          <Route path="/plants" element={<PlaceholderPage titleKey="nav.plantProfiles" />} />
          <Route path="/notes" element={<PlaceholderPage titleKey="nav.notes" />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
