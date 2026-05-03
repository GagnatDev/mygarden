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
        createdBy: 'u1',
        createdAt: '',
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
    expect(screen.getByTestId('note-add-form')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('note-edit-btn-n1'));
    expect(screen.getByTestId('note-edit-n1')).toBeInTheDocument();
  });
});
