import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { SHARE_MAX_CHARS } from '../core/limits';

const PREFIX = '#d=';

export interface ShareResult {
  hash: string | null;
  reason: string | null;
}

export function encodeShare(text: string): ShareResult {
  if (text.trim() === '') return { hash: null, reason: 'No hay nada que compartir' };
  if (text.length > SHARE_MAX_CHARS) {
    return { hash: null, reason: 'El documento es demasiado grande para caber en una URL' };
  }
  return { hash: `${PREFIX}${compressToEncodedURIComponent(text)}`, reason: null };
}

export function decodeShare(hash: string): string | null {
  if (!hash.startsWith(PREFIX)) return null;
  const payload = hash.slice(PREFIX.length);
  if (payload === '') return null;
  const text = decompressFromEncodedURIComponent(payload);
  return text === null || text === '' ? null : text;
}
