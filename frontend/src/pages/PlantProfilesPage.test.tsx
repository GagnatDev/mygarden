import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { PlantProfilesPage } from './PlantProfilesPage';

const en = {
  nav: { plantProfiles: 'Plant profiles' },
  auth: { loading: 'Loading…', submitting: 'Wait…', unknownError: 'Error' },
  garden: {
    editArea: 'Edit',
    saveChanges: 'Save',
    cancel: 'Cancel',
    confirmDelete: 'Confirm',
    areaType: 'Type',
  },
  planning: {
    profilesHint: 'Hint',
    newProfile: 'New',
    plantName: 'Name',
    notesOptional: 'Notes',
    createProfile: 'Create',
    deleteProfile: 'Delete profile',
    confirmDeleteProfile: 'Sure?',
    plantTypes: {
      vegetable: 'Vegetable',
      herb: 'Herb',
      flower: 'Flower',
      berry: 'Berry',
      tree_shrub: 'Tree',
    },
  },
};

async function testI18n() {
  const instance = i18n.createInstance();
  await instance.use(initReactI18next).init({
    lng: 'en',
    resources: { en: { translation: en } },
    interpolation: { escapeValue: false },
  });
  return instance;
}

describe('PlantProfilesPage', () => {
  it('lists, creates, edits, and deletes with confirmation', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const i18nInstance = await testI18n();

    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );

    render(
      <I18nextProvider i18n={i18nInstance}>
        <PlantProfilesPage />
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('plant-profile-list')).toBeInTheDocument());

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'p1',
          userId: 'u1',
          name: 'Tomato',
          type: 'vegetable',
          notes: null,
          createdAt: '',
          updatedAt: '',
        }),
        { status: 201, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'p1',
            userId: 'u1',
            name: 'Tomato',
            type: 'vegetable',
            notes: null,
            createdAt: '',
            updatedAt: '',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    fireEvent.change(screen.getByTestId('profile-name-input'), { target: { value: 'Tomato' } });
    fireEvent.click(screen.getByTestId('profile-create-submit'));

    await waitFor(() => expect(screen.getByTestId('plant-profile-row-p1')).toBeInTheDocument());
    expect(screen.getByTestId('profile-delete-btn-p1')).toHaveTextContent('Delete profile');

    fireEvent.click(screen.getByTestId('profile-edit-btn-p1'));
    fireEvent.change(screen.getByTestId('profile-edit-name-p1'), { target: { value: 'Cherry tomato' } });

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'p1',
          userId: 'u1',
          name: 'Cherry tomato',
          type: 'vegetable',
          notes: null,
          createdAt: '',
          updatedAt: '',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'p1',
            userId: 'u1',
            name: 'Cherry tomato',
            type: 'vegetable',
            notes: null,
            createdAt: '',
            updatedAt: '',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    fireEvent.click(screen.getByTestId('profile-save-p1'));

    await waitFor(() => expect(screen.getByText('Cherry tomato')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('profile-delete-btn-p1'));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    fireEvent.click(screen.getByTestId('profile-delete-confirm-p1'));

    await waitFor(() => expect(screen.queryByTestId('plant-profile-row-p1')).not.toBeInTheDocument());

    vi.unstubAllGlobals();
  });
});
