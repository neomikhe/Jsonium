import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { SHARE_MAX_CHARS } from '../core/limits';

const PREFIX = '#d=';

export type ShareFailure = 'empty' | 'tooLarge';

export interface ShareResult {
  hash: string | null;
  failure: ShareFailure | null;
}

export function encodeShare(text: string): ShareResult {
  if (text.trim() === '') return { hash: null, failure: 'empty' };
  if (text.length > SHARE_MAX_CHARS) return { hash: null, failure: 'tooLarge' };
  return { hash: `${PREFIX}${compressToEncodedURIComponent(text)}`, failure: null };
}

export function decodeShare(hash: string): string | null {
  if (!hash.startsWith(PREFIX)) return null;
  const payload = hash.slice(PREFIX.length);
  if (payload === '') return null;
  const text = decompressFromEncodedURIComponent(payload);
  return text === null || text === '' ? null : text;
}
