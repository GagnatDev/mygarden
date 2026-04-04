import { useTranslation } from 'react-i18next';
import { useAuth } from '../auth/useAuth';
import type { UserLanguage } from '../api/types';
import i18n from '../i18n';

function detectUiLanguage(): UserLanguage {
  return i18n.language.startsWith('en') ? 'en' : 'nb';
}

export function LanguageSwitcher() {
  const { t } = useTranslation();
  const { user, setLanguage } = useAuth();
  const current = user?.language ?? detectUiLanguage();

  async function onChange(lng: UserLanguage) {
    if (user) {
      try {
        await setLanguage(lng);
      } catch {
        void i18n.changeLanguage(lng);
      }
    } else {
      void i18n.changeLanguage(lng);
    }
  }

  return (
    <div className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white p-0.5 text-xs shadow-sm">
      <button
        type="button"
        className={`rounded-md px-2 py-1 font-medium transition-colors ${
          current === 'nb' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:bg-stone-100'
        }`}
        onClick={() => void onChange('nb')}
        aria-pressed={current === 'nb'}
        data-testid="lang-nb"
      >
        {t('lang.nb')}
      </button>
      <button
        type="button"
        className={`rounded-md px-2 py-1 font-medium transition-colors ${
          current === 'en' ? 'bg-emerald-700 text-white' : 'text-stone-600 hover:bg-stone-100'
        }`}
        onClick={() => void onChange('en')}
        aria-pressed={current === 'en'}
        data-testid="lang-en"
      >
        {t('lang.en')}
      </button>
    </div>
  );
}
