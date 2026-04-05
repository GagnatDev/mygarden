import { HttpError } from '../middleware/problem-details.js';

export function paramString(value: string | string[] | undefined, label = 'parameter'): string {
  if (typeof value === 'string' && value.length > 0) {
    return value;
  }
  throw new HttpError(400, `Invalid ${label}`, 'Bad Request');
}
