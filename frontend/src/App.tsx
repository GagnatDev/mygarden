import { useTranslation } from 'react-i18next';
import { BrowserRouter, Route, Routes } from 'react-router-dom';

function Home() {
  const { t } = useTranslation();
  return (
    <main className="min-h-dvh bg-stone-50 p-8 text-stone-900">
      <h1 className="text-3xl font-semibold tracking-tight">{t('app.title')}</h1>
    </main>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
      </Routes>
    </BrowserRouter>
  );
}
