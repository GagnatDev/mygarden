import { Readable } from 'node:stream';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  GetObjectCommand,
  HeadBucketCommand,
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

  it('putObject ensures bucket then sends PutObjectCommand', async () => {
    sendMock.mockResolvedValue({});
    const client = new S3Client({ region: 'us-east-1' });
    const svc = new S3FileStorageService(client, 'bucket-one');
    const body = Buffer.from([1, 2, 3]);
    await svc.putObject('gardens/g1/background.jpg', body, 'image/jpeg');
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0]![0]).toBeInstanceOf(HeadBucketCommand);
    expect(sendMock.mock.calls[1]![0]).toBeInstanceOf(PutObjectCommand);
    const put = sendMock.mock.calls[1]![0] as PutObjectCommand;
    expect(put.input).toEqual({
      Bucket: 'bucket-one',
      Key: 'gardens/g1/background.jpg',
      Body: body,
      ContentType: 'image/jpeg',
    });
  });

  it('putObject creates bucket when HeadBucket returns NotFound', async () => {
    sendMock
      .mockRejectedValueOnce(Object.assign(new Error('nf'), { name: 'NotFound' }))
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({});
    const client = new S3Client({ region: 'us-east-1' });
    const svc = new S3FileStorageService(client, 'bucket-one');
    await svc.putObject('gardens/g1/background.jpg', Buffer.from([1]), 'image/jpeg');
    expect(sendMock).toHaveBeenCalledTimes(3);
    expect(sendMock.mock.calls[0]![0]).toBeInstanceOf(HeadBucketCommand);
    expect(sendMock.mock.calls[1]![0]).toBeInstanceOf(CreateBucketCommand);
    expect(sendMock.mock.calls[2]![0]).toBeInstanceOf(PutObjectCommand);
  });

  it('deleteObject ensures bucket then sends DeleteObjectCommand', async () => {
    sendMock.mockResolvedValue({});
    const client = new S3Client({ region: 'us-east-1' });
    const svc = new S3FileStorageService(client, 'bucket-one');
    await svc.deleteObject('gardens/g1/background.png');
    expect(sendMock).toHaveBeenCalledTimes(2);
    expect(sendMock.mock.calls[0]![0]).toBeInstanceOf(HeadBucketCommand);
    expect(sendMock.mock.calls[1]![0]).toBeInstanceOf(DeleteObjectCommand);
    const cmd = sendMock.mock.calls[1]![0] as DeleteObjectCommand;
    expect(cmd.input).toEqual({ Bucket: 'bucket-one', Key: 'gardens/g1/background.png' });
  });

  it('getObject ensures bucket then returns stream and metadata on hit', async () => {
    const stream = Readable.from([Buffer.from('x')]);
    sendMock.mockResolvedValueOnce({}).mockResolvedValueOnce({
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
    expect(sendMock.mock.calls[0]![0]).toBeInstanceOf(HeadBucketCommand);
    const cmd = sendMock.mock.calls[1]![0] as GetObjectCommand;
    expect(cmd.input).toEqual({ Bucket: 'bucket-one', Key: 'gardens/g1/background.webp' });
  });

  it('getObject returns null when key is missing', async () => {
    sendMock
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(Object.assign(new Error('not found'), { name: 'NoSuchKey' }));
    const client = new S3Client({ region: 'us-east-1' });
    const svc = new S3FileStorageService(client, 'bucket-one');
    await expect(svc.getObject('missing')).resolves.toBeNull();
  });
});
