import { describe, expect, it } from 'vitest';
import { detectImageMimeFromMagicBytes } from './image-magic-bytes.js';

const tinyPng = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

describe('detectImageMimeFromMagicBytes', () => {
  it('detects PNG', () => {
    expect(detectImageMimeFromMagicBytes(tinyPng)).toBe('image/png');
  });

  it('detects JPEG start marker', () => {
    const buf = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
    expect(detectImageMimeFromMagicBytes(buf)).toBe('image/jpeg');
  });

  it('detects WebP RIFF header', () => {
    const buf = Buffer.concat([
      Buffer.from('RIFF', 'ascii'),
      Buffer.from([0x04, 0x00, 0x00, 0x00]),
      Buffer.from('WEBP', 'ascii'),
    ]);
    expect(detectImageMimeFromMagicBytes(buf)).toBe('image/webp');
  });

  it('returns null for unknown or too short', () => {
    expect(detectImageMimeFromMagicBytes(Buffer.from('hello'))).toBeNull();
    expect(detectImageMimeFromMagicBytes(Buffer.from([0xff, 0xd8]))).toBeNull();
  });
});
