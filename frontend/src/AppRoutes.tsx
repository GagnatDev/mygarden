import { Navigate, Route, Routes } from 'react-router-dom';
import { GardenProvider } from './garden/GardenContext';
import { AppShell } from './layout/AppShell';
import { AreaMapPage } from './pages/AreaMapPage';
import { CalendarPage } from './pages/CalendarPage';
import { GardenAreasPage } from './pages/GardenAreasPage';
import { HomeDashboard } from './pages/HomeDashboard';
import { LoginPage } from './pages/LoginPage';
import { HistoryPage } from './pages/HistoryPage';
import { SeasonNotesPage } from './pages/SeasonNotesPage';
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
          <Route path="/gardens" element={<Navigate to="/" replace />} />
          <Route path="/gardens/:gardenId" element={<GardenAreasPage />} />
          <Route path="/gardens/:gardenId/areas/:areaId" element={<AreaMapPage />} />
          <Route path="/garden" element={<Navigate to="/" replace />} />
          <Route path="/plan" element={<PlantingPlanPage />} />
          <Route path="/calendar" element={<CalendarPage />} />
          <Route path="/plants" element={<PlantProfilesPage />} />
          <Route path="/notes" element={<SeasonNotesPage />} />
          <Route path="/history" element={<HistoryPage />} />
        </Route>
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
