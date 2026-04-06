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
            hasPlantingsHint: 'has plantings',
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
    expect(map.querySelectorAll('[data-testid="grid-map-cell-layer"]')).toHaveLength(1);
    expect(map.querySelectorAll('[data-cell]')).toHaveLength(0);
    expect(screen.getByRole('grid', { name: /grid 4 by 3/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^bed$/i })).toBeInTheDocument();
  });

  it('uses one cell layer for large grids instead of one DOM node per cell', async () => {
    const onSelectArea = vi.fn();
    const i18nInstance = await testI18n();
    const bigGarden: Garden = {
      ...garden,
      gridWidth: 200,
      gridHeight: 200,
    };

    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={bigGarden}
          areas={[]}
          selectedAreaId={null}
          onSelectArea={onSelectArea}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );

    const map = screen.getByTestId('grid-map');
    expect(map.querySelectorAll('[data-testid="grid-map-cell-layer"]')).toHaveLength(1);
    expect(map.querySelectorAll('[data-cell]')).toHaveLength(0);
    const layer = screen.getByTestId('grid-map-cell-layer');
    expect(layer).toHaveStyle({ width: '5600px', height: '5600px' });
    expect(layer).toHaveStyle({ backgroundSize: '28px 28px' });
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

    fireEvent.click(screen.getByRole('button', { name: /^bed$/i }));
    expect(onSelectArea).toHaveBeenCalledWith('a1');
  });

  it('shows a subtle indicator when the area has plantings', async () => {
    const i18nInstance = await testI18n();
    render(
      <I18nextProvider i18n={i18nInstance}>
        <GridMapEditor
          garden={garden}
          areas={[area]}
          areaIdsWithPlantings={new Set(['a1'])}
          selectedAreaId={null}
          onSelectArea={vi.fn()}
          onSelectionComplete={vi.fn()}
          tool="select"
          onToolChange={vi.fn()}
        />
      </I18nextProvider>,
    );
    expect(screen.getByTestId('map-area-planting-indicator-a1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /bed.*has plantings/i })).toBeInTheDocument();
  });
});
