import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

export function OfflineIndicator() {
  const { t } = useTranslation();
  const [online, setOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  );

  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  if (online) return null;

  return (
    <div
      role="status"
      data-testid="offline-indicator"
      className="fixed left-1/2 top-14 z-30 -translate-x-1/2 rounded-full bg-amber-900 px-4 py-1.5 text-center text-xs font-medium text-amber-50 shadow-md md:top-4"
    >
      {t('offline.banner')}
    </div>
  );
}
