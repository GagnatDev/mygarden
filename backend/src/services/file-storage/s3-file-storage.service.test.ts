import { Readable } from 'node:stream';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { S3FileStorageService } from './s3-file-storage.service.js';

const sendMock = vi.fn();

vi.mock('@aws-sdk/client-s3', async () => {
  const actual = await vi.importActual<typeof import('@aws-sdk/client-s3')>('@aws-sdk/client-s3');
  return {
    ...actual,
    S3Client: vi.fn().mockImplementation(() => ({ send: sendMock })),
  };
});

describe('S3FileStorageService', () => {
  beforeEach(() => {
    sendMock.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('putObject sends PutObjectCommand with key and content type', async () => {
    sendMock.mockResolvedValue({});
    const client = new S3Client({ region: 'us-east-1' });
    const svc = new S3FileStorageService(client, 'bucket-one');
    const body = Buffer.from([1, 2, 3]);
    await svc.putObject('gardens/g1/background.jpg', body, 'image/jpeg');
    expect(sendMock).toHaveBeenCalledTimes(1);
    const cmd = sendMock.mock.calls[0]![0] as PutObjectCommand;
    expect(cmd).toBeInstanceOf(PutObjectCommand);
    expect(cmd.input).toEqual({
      Bucket: 'bucket-one',
      Key: 'gardens/g1/background.jpg',
      Body: body,
      ContentType: 'image/jpeg',
    });
  });

  it('deleteObject sends DeleteObjectCommand', async () => {
    sendMock.mockResolvedValue({});
    const client = new S3Client({ region: 'us-east-1' });
    const svc = new S3FileStorageService(client, 'bucket-one');
    await svc.deleteObject('gardens/g1/background.png');
    const cmd = sendMock.mock.calls[0]![0] as DeleteObjectCommand;
    expect(cmd).toBeInstanceOf(DeleteObjectCommand);
    expect(cmd.input).toEqual({ Bucket: 'bucket-one', Key: 'gardens/g1/background.png' });
  });

  it('getObject returns stream and metadata on hit', async () => {
    const stream = Readable.from([Buffer.from('x')]);
    sendMock.mockResolvedValue({
      Body: stream,
      ContentType: 'image/webp',
      ETag: '"abc"',
    });
    const client = new S3Client({ region: 'us-east-1' });
    const svc = new S3FileStorageService(client, 'bucket-one');
    const got = await svc.getObject('gardens/g1/background.webp');
    expect(got).not.toBeNull();
    expect(got!.contentType).toBe('image/webp');
    expect(got!.etag).toBe('"abc"');
    const cmd = sendMock.mock.calls[0]![0] as GetObjectCommand;
    expect(cmd.input).toEqual({ Bucket: 'bucket-one', Key: 'gardens/g1/background.webp' });
  });

  it('getObject returns null when key is missing', async () => {
    sendMock.mockRejectedValue(Object.assign(new Error('not found'), { name: 'NoSuchKey' }));
    const client = new S3Client({ region: 'us-east-1' });
    const svc = new S3FileStorageService(client, 'bucket-one');
    await expect(svc.getObject('missing')).resolves.toBeNull();
  });
});
