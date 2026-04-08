import type { Readable } from 'node:stream';

export interface StoredObject {
  stream: Readable;
  contentType: string;
  etag?: string;
}

export interface IFileStorageService {
  putObject(key: string, body: Buffer, contentType: string): Promise<void>;
  deleteObject(key: string): Promise<void>;
  getObject(key: string): Promise<StoredObject | null>;
}
