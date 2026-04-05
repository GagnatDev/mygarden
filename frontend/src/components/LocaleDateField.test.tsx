import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it } from 'vitest';
import { LocaleDateField } from './LocaleDateField';

const planningKeys = {
  datePlaceholder: 'Pick',
  openDatePicker: 'Cal',
  clearDate: 'Clear',
};

async function makeI18n(lng: string) {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng,
    resources: {
      en: { translation: { planning: planningKeys } },
      nb: { translation: { planning: planningKeys } },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('LocaleDateField', () => {
  it('shows dd/MM/yyyy for Norwegian locale when value is set', async () => {
    const i18nInstance = await makeI18n('nb');
    render(
      <I18nextProvider i18n={i18nInstance}>
        <LocaleDateField value="2026-03-08" onChange={() => {}} testId="df" />
      </I18nextProvider>,
    );
    expect(screen.getByTestId('df')).toHaveTextContent('08/03/2026');
  });

  it('starts the calendar week on Monday (English locale)', async () => {
    const i18nInstance = await makeI18n('en');
    render(
      <I18nextProvider i18n={i18nInstance}>
        <LocaleDateField value="2026-06-15" onChange={() => {}} testId="df" />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByTestId('df').querySelector('button')!);
    const dialog = screen.getByRole('dialog');
    const weekdays = dialog.querySelectorAll('.rdp-weekday');
    expect(weekdays.length).toBeGreaterThanOrEqual(7);
    expect(weekdays[0]).toHaveTextContent(/^mo/i);
  });

  it('uses Norwegian month name in the calendar caption', async () => {
    const i18nInstance = await makeI18n('nb');
    render(
      <I18nextProvider i18n={i18nInstance}>
        <LocaleDateField value="2026-01-15" onChange={() => {}} testId="df" />
      </I18nextProvider>,
    );
    fireEvent.click(screen.getByTestId('df').querySelector('button')!);
    expect(screen.getByText(/januar/i)).toBeInTheDocument();
  });
});
