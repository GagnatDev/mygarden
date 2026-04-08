import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import type { Readable } from 'node:stream';
import type { IFileStorageService, StoredObject } from './file-storage.interface.js';

function isBucketMissingError(e: unknown): boolean {
  const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    err.name === 'NotFound' ||
    err.name === 'NoSuchBucket' ||
    err.$metadata?.httpStatusCode === 404
  );
}

function isBucketAlreadyExistsError(e: unknown): boolean {
  const err = e as { name?: string };
  return err.name === 'BucketAlreadyOwnedByYou' || err.name === 'BucketAlreadyExists';
}

export class S3FileStorageService implements IFileStorageService {
  private bucketReady: Promise<void> | null = null;

  constructor(
    private readonly client: S3Client,
    private readonly bucket: string,
  ) {}

  /** MinIO/AWS need the bucket to exist before PutObject; dev setups often skip creating it manually. */
  private ensureBucket(): Promise<void> {
    if (!this.bucketReady) {
      this.bucketReady = this.ensureBucketInner();
    }
    return this.bucketReady;
  }

  private async ensureBucketInner(): Promise<void> {
    try {
      await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      return;
    } catch (e: unknown) {
      if (!isBucketMissingError(e)) {
        throw e;
      }
    }
    try {
      await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
    } catch (e: unknown) {
      if (isBucketAlreadyExistsError(e)) {
        return;
      }
      throw e;
    }
  }

  async putObject(key: string, body: Buffer, contentType: string): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: contentType,
      }),
    );
  }

  async deleteObject(key: string): Promise<void> {
    await this.ensureBucket();
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: key,
      }),
    );
  }

  async getObject(key: string): Promise<StoredObject | null> {
    await this.ensureBucket();
    try {
      const out = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      const body = out.Body;
      if (!body) return null;
      return {
        stream: body as Readable,
        contentType: out.ContentType ?? 'application/octet-stream',
        etag: out.ETag,
      };
    } catch (e: unknown) {
      const err = e as { name?: string; $metadata?: { httpStatusCode?: number } };
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return null;
      }
      throw e;
    }
  }
}
