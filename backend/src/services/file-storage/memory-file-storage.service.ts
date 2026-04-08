import { Readable } from 'node:stream';
import type { IFileStorageService, StoredObject } from './file-storage.interface.js';

export class MemoryFileStorageService implements IFileStorageService {
  private readonly store = new Map<string, { body: Buffer; contentType: string }>();

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    this.store.set(key, { body: Buffer.from(body), contentType });
  }

  async deleteObject(key: string): Promise<void> {
    this.store.delete(key);
  }

  async getObject(key: string): Promise<StoredObject | null> {
    const v = this.store.get(key);
    if (!v) return null;
    return {
      stream: Readable.from(v.body),
      contentType: v.contentType,
      etag: `"mem-${key}"`,
    };
  }
}
