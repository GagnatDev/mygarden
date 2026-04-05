import { fireEvent, render, screen } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import type { Area, Garden } from '../api/gardens';
import { GridMapEditor } from './GridMapEditor';

const garden: Garden = {
  id: 'g1',
  name: 'G',
  gridWidth: 4,
  gridHeight: 3,
  cellSizeMeters: 1,
  createdBy: 'u1',
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

const area: Area = {
  id: 'a1',
  gardenId: 'g1',
  name: 'Bed',
  type: 'raised_bed',
  color: '#8B4513',
  gridX: 0,
  gridY: 0,
  gridWidth: 2,
  gridHeight: 1,
  createdAt: '2020-01-01T00:00:00.000Z',
  updatedAt: '2020-01-01T00:00:00.000Z',
};

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: {
      en: {
        translation: {
          garden: {
            toolSelect: 'Select',
            toolPan: 'Pan',
            zoomIn: 'Zoom in',
            zoomOut: 'Zoom out',
            gridAriaLabel: 'Grid {{width}} by {{height}}',
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('GridMapEditor', () => {
  it('renders grid with correct number of cells and shows placed areas', async () => {
    const onSelectArea = vi.fn();
    const onSelectionComplete = vi.fn();
    const onToolChange = vi.fn();
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[area]}
          selectedAreaId={null}
          onSelectArea={onSelectArea}
          onSelectionComplete={onSelectionComplete}
          tool="select"
          onToolChange={onToolChange}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    expect(map.querySelectorAll('[data-cell]')).toHaveLength(12);
    expect(screen.getByRole('grid', { name: /grid 4 by 3/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bed/i })).toBeInTheDocument();
  });

  it('selects an area when its label is clicked in select mode', async () => {
    const onSelectArea = vi.fn();
    const i18nInstance = await testI18n();

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[area]}
          selectedAreaId={null}
          onSelectArea={onSelectArea}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: /bed/i }));
    expect(onSelectArea).toHaveBeenCalledWith('a1');
  });
});
