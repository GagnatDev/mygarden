import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Element } from '../api/elements';
import { ElementDetailPanel } from './ElementDetailPanel';

const { patchElementMock, deleteElementMock } = vi.hoisted(() => ({
  patchElementMock: vi.fn(),
  deleteElementMock: vi.fn(),
}));

vi.mock('../api/elements', () => ({
  patchElement: patchElementMock,
  deleteElement: deleteElementMock,
}));

vi.mock('../components/NotesSection', () => ({
  NotesSection: () => null,
}));

const rectElement: Element = {
  id: 'e1',
  areaId: 'ar1',
  name: 'Bed',
  type: 'raised_bed',
  color: '#8B4513',
  gridX: 1,
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
            areaDetails: 'Details',
            close: 'Close',
            cells: 'cells',
            editArea: 'Edit',
            saveChanges: 'Save',
            cancel: 'Cancel',
            deleteArea: 'Delete',
            confirmDelete: 'Confirm',
            areaName: 'Name',
            areaType: 'Type',
            areaColor: 'Color',
            positionX: 'X (cells)',
            positionY: 'Y (cells)',
            widthCells: 'Width (cells)',
            heightCells: 'Height (cells)',
            sizeFieldsInvalid: 'Position and size must be whole numbers.',
            areaTypes: {
              raised_bed: 'Raised bed',
              open_bed: 'Open bed',
              tree_zone: 'Tree zone',
              path: 'Path',
              lawn: 'Lawn',
              other: 'Other',
            },
          },
          auth: {
            submitting: 'Saving',
            unknownError: 'Unknown error',
          },
        },
      },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
}

async function renderPanel(element: Element = rectElement) {
  const onChanged = vi.fn().mockResolvedValue(undefined);
  const onClose = vi.fn();
  const i18nInstance = await testI18n();
  render(
    <I18nextProvider i18n={i18nInstance}>
      <ElementDetailPanel
        gardenId="g1"
        areaId="ar1"
        seasonId="s1"
        element={element}
        onClose={onClose}
        onChanged={onChanged}
      />
    </I18nextProvider>,
  );
  return { onChanged, onClose };
}

beforeEach(() => {
  patchElementMock.mockReset();
  deleteElementMock.mockReset();
});

describe('ElementDetailPanel size fields', () => {
  it('shows editable X/Y/width/height fields for rectangle elements in edit mode', async () => {
    await renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));

    expect(screen.getByTestId('element-size-fields')).toBeInTheDocument();
    expect(screen.getByTestId('edit-element-grid-x')).toHaveValue(1);
    expect(screen.getByTestId('edit-element-grid-y')).toHaveValue(0);
    expect(screen.getByTestId('edit-element-grid-width')).toHaveValue(2);
    expect(screen.getByTestId('edit-element-grid-height')).toHaveValue(1);
  });

  it('does not show size fields for polygon elements', async () => {
    const polyElement: Element = {
      ...rectElement,
      shape: {
        kind: 'polygon',
        vertices: [
          { x: 0, y: 0 },
          { x: 2, y: 0 },
          { x: 2, y: 1 },
        ],
      },
    };
    await renderPanel(polyElement);
    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    expect(screen.queryByTestId('element-size-fields')).toBeNull();
  });

  it('persists changed position and size through patchElement', async () => {
    patchElementMock.mockResolvedValue({ ...rectElement, gridX: 0, gridWidth: 3 });
    const { onChanged } = await renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByTestId('edit-element-grid-x'), { target: { value: '0' } });
    fireEvent.change(screen.getByTestId('edit-element-grid-width'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    await waitFor(() => {
      expect(patchElementMock).toHaveBeenCalledWith('g1', 'ar1', 'e1', {
        name: 'Bed',
        type: 'raised_bed',
        color: '#8B4513',
        gridX: 0,
        gridY: 0,
        gridWidth: 3,
        gridHeight: 1,
      });
    });
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
  });

  it('rejects non-positive sizes with a validation error and no API call', async () => {
    await renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByTestId('edit-element-grid-width'), { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText(/whole numbers/i)).toBeInTheDocument();
    expect(patchElementMock).not.toHaveBeenCalled();
  });

  it('surfaces a backend rejection as the panel error', async () => {
    patchElementMock.mockRejectedValue(new Error('Overlaps another element'));
    await renderPanel();

    fireEvent.click(screen.getByRole('button', { name: 'Edit' }));
    fireEvent.change(screen.getByTestId('edit-element-grid-width'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(await screen.findByText('Overlaps another element')).toBeInTheDocument();
  });
});
