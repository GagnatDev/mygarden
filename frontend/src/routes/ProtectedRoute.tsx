import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function ProtectedRoute() {
  const { t } = useTranslation();
  const { user, ready } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div
        className="flex min-h-dvh items-center justify-center bg-stone-50 text-stone-600"
        data-testid="auth-loading"
      >
        <p className="text-sm">{t('auth.loading')}</p>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  return <Outlet />;
}
