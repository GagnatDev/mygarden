import sharp from 'sharp';
import { HttpError } from '../middleware/problem-details.js';
import type { StoredObject } from '../services/file-storage/file-storage.interface.js';

export const IMAGE_FULL_MAX_EDGE = 2560;
export const IMAGE_FULL_JPEG_QUALITY = 86;
export const IMAGE_THUMB_MAX_EDGE = 320;
export const IMAGE_THUMB_JPEG_QUALITY = 78;

export async function compressImageToJpeg(buffer: Buffer, maxEdge: number, quality: number): Promise<Buffer> {
  try {
    return await sharp(buffer)
      .rotate()
      .resize({
        width: maxEdge,
        height: maxEdge,
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new HttpError(400, 'Image data is invalid or unsupported', 'Bad Request');
  }
}

export async function createThumbnailJpeg(buffer: Buffer): Promise<Buffer> {
  return compressImageToJpeg(buffer, IMAGE_THUMB_MAX_EDGE, IMAGE_THUMB_JPEG_QUALITY);
}

export function fullImageObjectKeyToThumbKey(objectKey: string): string {
  if (objectKey.endsWith('-thumb.jpg')) return objectKey;
  if (objectKey.endsWith('.jpg')) return objectKey.replace(/\.jpg$/, '-thumb.jpg');
  const dot = objectKey.lastIndexOf('.');
  if (dot >= 0) return `${objectKey.slice(0, dot)}-thumb.jpg`;
  return `${objectKey}-thumb.jpg`;
}


export async function storedObjectToBuffer(obj: StoredObject): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of obj.stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}
