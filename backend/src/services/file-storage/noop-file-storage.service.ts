import type { IFileStorageService, StoredObject } from './file-storage.interface.js';

/** Used when S3 is not configured; object APIs are not called for uploads (routes return 503). */
export class NoopFileStorageService implements IFileStorageService {
  async putObject(): Promise<void> {
    throw new Error('File storage is not configured');
  }

  async deleteObject(): Promise<void> {
    /* no-op */
  }

  async getObject(): Promise<StoredObject | null> {
    return null;
  }
}
