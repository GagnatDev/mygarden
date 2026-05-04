import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { describe, expect, it, vi } from 'vitest';
import { PlantProfilesPage } from './PlantProfilesPage';

const tinyPngBytes = Uint8Array.from([137, 80, 78, 71, 13, 10, 26, 10]);

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
    addImage: 'Add photo',
    removeImage: 'Remove',
    maxImagesReached: 'Maximum 5 photos',
    profileImageAlt: '{{name}} profile photo',
    openImageGallery: 'View full size',
    imageGalleryBack: 'Back',
    imageGalleryClose: 'Close',
    imageGalleryForProfile: 'Photos — {{name}}',
    profileCardSettings: 'Profile actions',
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
          images: [],
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
            images: [],
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
    fireEvent.click(screen.getByTestId('profile-card-menu-trigger-p1'));
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
          images: [],
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
            images: [],
            createdAt: '',
            updatedAt: '',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    fireEvent.click(screen.getByTestId('profile-save-p1'));

    await waitFor(() => expect(screen.getByText('Cherry tomato')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('profile-card-menu-trigger-p1'));
    fireEvent.click(screen.getByTestId('profile-delete-btn-p1'));
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    fetchMock.mockResolvedValueOnce(
      new Response(JSON.stringify([]), { status: 200, headers: { 'Content-Type': 'application/json' } }),
    );
    fireEvent.click(screen.getByTestId('profile-delete-confirm-p1'));

    await waitFor(() => expect(screen.queryByTestId('plant-profile-row-p1')).not.toBeInTheDocument());

    vi.unstubAllGlobals();
  });

  it('uploads and removes profile images', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const i18nInstance = await testI18n();

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'p1',
            userId: 'u1',
            name: 'Tomato',
            type: 'vegetable',
            notes: null,
            images: [],
            createdAt: '',
            updatedAt: '',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(
      <I18nextProvider i18n={i18nInstance}>
        <PlantProfilesPage />
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('plant-profile-row-p1')).toBeInTheDocument());

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'p1',
          userId: 'u1',
          name: 'Tomato',
          type: 'vegetable',
          notes: null,
          images: [{ id: 'i1', url: '/plant-profiles/p1/images/i1' }],
          createdAt: '',
          updatedAt: '',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    fireEvent.change(screen.getByTestId('profile-image-input-p1'), {
      target: { files: [new File([tinyPngBytes], 'tiny.png', { type: 'image/png' })] },
    });

    await waitFor(() =>
      expect(fetchMock.mock.calls.some((c) => c[0] === '/api/v1/plant-profiles/p1/images')).toBe(true),
    );

    fetchMock.mockResolvedValueOnce(new Response(new Blob([tinyPngBytes]), { status: 200 }));
    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          id: 'p1',
          userId: 'u1',
          name: 'Tomato',
          type: 'vegetable',
          notes: null,
          images: [],
          createdAt: '',
          updatedAt: '',
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    fireEvent.click(await screen.findByTestId('profile-image-delete-p1-i1'));
    await waitFor(() =>
      expect(fetchMock.mock.calls.some((c) => c[0] === '/api/v1/plant-profiles/p1/images/i1')).toBe(true),
    );

    vi.unstubAllGlobals();
  });

  it('opens full-screen image gallery and closes via close, back, escape, and drag down', async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal('fetch', fetchMock);
    const i18nInstance = await testI18n();

    fetchMock.mockResolvedValueOnce(
      new Response(
        JSON.stringify([
          {
            id: 'p1',
            userId: 'u1',
            name: 'Tomato',
            type: 'vegetable',
            notes: null,
            images: [
              { id: 'i1', url: '/plant-profiles/p1/images/i1' },
              { id: 'i2', url: '/plant-profiles/p1/images/i2' },
            ],
            createdAt: '',
            updatedAt: '',
          },
        ]),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    render(
      <I18nextProvider i18n={i18nInstance}>
        <PlantProfilesPage />
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('plant-profile-row-p1')).toBeInTheDocument());

    fetchMock.mockResolvedValue(new Response(new Blob([tinyPngBytes]), { status: 200 }));

    fireEvent.click(screen.getByTestId('profile-image-open-gallery-p1-i1'));
    await waitFor(() => expect(screen.getByTestId('plant-profile-image-gallery')).toBeInTheDocument());

    fireEvent.click(screen.getByTestId('plant-profile-image-gallery-close'));
    await waitFor(() =>
      expect(screen.queryByTestId('plant-profile-image-gallery')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('profile-image-open-gallery-p1-i2'));
    await waitFor(() => expect(screen.getByTestId('plant-profile-image-gallery')).toBeInTheDocument());
    fireEvent.click(screen.getByTestId('plant-profile-image-gallery-back'));
    await waitFor(() =>
      expect(screen.queryByTestId('plant-profile-image-gallery')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('profile-image-open-gallery-p1-i1'));
    await waitFor(() => expect(screen.getByTestId('plant-profile-image-gallery')).toBeInTheDocument());
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    await waitFor(() =>
      expect(screen.queryByTestId('plant-profile-image-gallery')).not.toBeInTheDocument(),
    );

    fireEvent.click(screen.getByTestId('profile-image-open-gallery-p1-i1'));
    await waitFor(() => expect(screen.getByTestId('plant-profile-image-gallery')).toBeInTheDocument());
    const gallery = screen.getByTestId('plant-profile-image-gallery');
    const pane = gallery.querySelector('.touch-pan-x');
    expect(pane).toBeTruthy();
    fireEvent.pointerDown(pane!, { pointerId: 1, clientX: 100, clientY: 100, button: 0 });
    fireEvent.pointerMove(pane!, { pointerId: 1, clientX: 100, clientY: 220, buttons: 1 });
    fireEvent.pointerUp(pane!, { pointerId: 1, clientX: 100, clientY: 220, button: 0 });
    await waitFor(() =>
      expect(screen.queryByTestId('plant-profile-image-gallery')).not.toBeInTheDocument(),
    );

    vi.unstubAllGlobals();
  });
});
