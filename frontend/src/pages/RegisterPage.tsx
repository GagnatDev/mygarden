import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/useAuth';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export function RegisterPage() {
  const { t } = useTranslation();
  const { register } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await register(email, password, displayName);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.unknownError'));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-dvh flex-col bg-stone-50">
      <div className="flex justify-end p-4">
        <LanguageSwitcher />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center px-4 pb-16">
        <div className="w-full max-w-sm rounded-2xl border border-stone-200 bg-white p-8 shadow-sm">
          <h1 className="text-center text-2xl font-semibold text-stone-900">{t('auth.registerTitle')}</h1>
          <p className="mt-1 text-center text-sm text-stone-500">{t('app.title')}</p>
          <form className="mt-6 space-y-4" onSubmit={(e) => void onSubmit(e)}>
            <div>
              <label htmlFor="register-display" className="block text-sm font-medium text-stone-700">
                {t('auth.displayName')}
              </label>
              <input
                id="register-display"
                name="displayName"
                type="text"
                autoComplete="name"
                required
                value={displayName}
                onChange={(ev) => setDisplayName(ev.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-stone-700">
                {t('auth.email')}
              </label>
              <input
                id="register-email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(ev) => setEmail(ev.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
            </div>
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-stone-700">
                {t('auth.password')}
              </label>
              <input
                id="register-password"
                name="password"
                type="password"
                autoComplete="new-password"
                required
                minLength={8}
                value={password}
                onChange={(ev) => setPassword(ev.target.value)}
                className="mt-1 w-full rounded-lg border border-stone-300 px-3 py-2 text-stone-900 shadow-sm focus:border-emerald-600 focus:outline-none focus:ring-1 focus:ring-emerald-600"
              />
              <p className="mt-1 text-xs text-stone-500">{t('auth.passwordHint')}</p>
            </div>
            {error ? (
              <p className="text-sm text-red-600" role="alert" data-testid="register-error">
                {error}
              </p>
            ) : null}
            <button
              type="submit"
              disabled={submitting}
              data-testid="register-submit"
              className="w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-emerald-800 disabled:opacity-60"
            >
              {submitting ? t('auth.submitting') : t('auth.registerSubmit')}
            </button>
          </form>
          <p className="mt-4 text-center text-sm text-stone-600">
            <Link to="/login" className="font-medium text-emerald-800 hover:underline">
              {t('auth.goToLogin')}
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
