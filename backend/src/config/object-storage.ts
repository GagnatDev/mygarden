import { S3Client } from '@aws-sdk/client-s3';
import type { Env } from './env.js';
import type { IFileStorageService } from '../services/file-storage/file-storage.interface.js';
import { NoopFileStorageService } from '../services/file-storage/noop-file-storage.service.js';
import { S3FileStorageService } from '../services/file-storage/s3-file-storage.service.js';

export function isObjectStorageEnabled(env: Env): boolean {
  return Boolean(env.S3_BUCKET && env.S3_ACCESS_KEY_ID && env.S3_SECRET_ACCESS_KEY);
}

export function createFileStorageFromEnv(env: Env): IFileStorageService {
  if (!isObjectStorageEnabled(env)) {
    return new NoopFileStorageService();
  }
  const client = new S3Client({
    region: env.S3_REGION ?? 'us-east-1',
    ...(env.S3_ENDPOINT
      ? { endpoint: env.S3_ENDPOINT, forcePathStyle: true as const }
      : {}),
    credentials: {
      accessKeyId: env.S3_ACCESS_KEY_ID!,
      secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    },
  });
  return new S3FileStorageService(client, env.S3_BUCKET!);
}
