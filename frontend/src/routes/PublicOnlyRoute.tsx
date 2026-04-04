import { useTranslation } from 'react-i18next';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';

export function PublicOnlyRoute() {
  const { t } = useTranslation();
  const { user, ready } = useAuth();

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

  if (user) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
