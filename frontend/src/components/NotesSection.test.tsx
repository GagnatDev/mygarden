import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import i18n from 'i18next';
import { I18nextProvider, initReactI18next } from 'react-i18next';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as notesApi from '../api/notes';
import { NotesSection } from './NotesSection';

vi.mock('../auth/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' } }),
}));

describe('NotesSection', () => {
  beforeEach(() => {
    vi.spyOn(notesApi, 'listNotes').mockResolvedValue([
      {
        id: 'n1',
        gardenId: 'g1',
        seasonId: 's1',
        targetType: 'element',
        targetId: 'a1',
        body: 'First',
        photo: null,
        createdBy: 'u1',
        createdAt: '2026-05-08T19:30:00.000Z',
        updatedAt: '',
      },
    ]);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders notes and create form', async () => {
    const instance = i18n.createInstance();
    await instance.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            notes: {
              title: 'Notes',
              placeholder: 'Write',
              add: 'Add',
              edit: 'Edit',
              delete: 'Delete',
              save: 'Save',
              confirmDelete: 'OK?',
            },
            auth: { loading: 'Loading', submitting: 'Wait', unknownError: 'Err' },
            garden: { cancel: 'Cancel' },
          },
        },
      },
    });

    render(
      <I18nextProvider i18n={instance}>
        <NotesSection gardenId="g1" seasonId="s1" targetType="element" targetId="a1" />
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('note-item-n1')).toHaveTextContent('First'));
    expect(screen.getByTestId('note-created-at-n1')).toHaveAttribute('dateTime', '2026-05-08T19:30:00.000Z');
    expect(screen.getByTestId('note-add-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('note-edit-btn-n1'));
    expect(screen.getByTestId('note-edit-n1')).toBeInTheDocument();
  });

  it('uploads photo after creating note when a file is selected', async () => {
    vi.spyOn(notesApi, 'createNote').mockResolvedValue({
      id: 'n2',
      gardenId: 'g1',
      seasonId: 's1',
      targetType: 'element',
      targetId: 'a1',
      body: 'Second',
      photo: null,
      createdBy: 'u1',
      createdAt: '2026-05-08T19:31:00.000Z',
      updatedAt: '',
    });
    const uploadSpy = vi.spyOn(notesApi, 'uploadNotePhoto').mockResolvedValue({
      id: 'n2',
      gardenId: 'g1',
      seasonId: 's1',
      targetType: 'element',
      targetId: 'a1',
      body: 'Second',
      photo: { id: 'n2', mimeType: 'image/png', createdAt: '' },
      createdBy: 'u1',
      createdAt: '2026-05-08T19:31:00.000Z',
      updatedAt: '',
    });

    const instance = i18n.createInstance();
    await instance.use(initReactI18next).init({
      lng: 'en',
      resources: {
        en: {
          translation: {
            notes: {
              title: 'Notes',
              placeholder: 'Write',
              add: 'Add',
              edit: 'Edit',
              delete: 'Delete',
              save: 'Save',
              confirmDelete: 'OK?',
            },
            auth: { loading: 'Loading', submitting: 'Wait', unknownError: 'Err' },
            garden: { cancel: 'Cancel' },
          },
        },
      },
    });

    render(
      <I18nextProvider i18n={instance}>
        <NotesSection gardenId="g1" seasonId="s1" targetType="element" targetId="a1" />
      </I18nextProvider>,
    );

    await waitFor(() => expect(screen.getByTestId('note-item-n1')).toHaveTextContent('First'));
    fireEvent.change(screen.getByTestId('note-draft'), { target: { value: 'Second' } });

    const file = new File([new Uint8Array([1, 2, 3])], 'x.png', { type: 'image/png' });
    fireEvent.change(screen.getByTestId('note-photo-input'), { target: { files: [file] } });

    fireEvent.click(screen.getByText('Add'));

    await waitFor(() => expect(uploadSpy).toHaveBeenCalledWith('g1', 'n2', file));
  });
});
