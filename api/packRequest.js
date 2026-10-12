import { getPrimaryPackId } from './packLoader.js';

const KNOWN_PACKS = new Set(['au', 'uk']);

/**
 * Pack for this request. Header wins, then query, then JSON body.
 * Missing or unknown values stay on the server primary pack (Australia).
 */
export function packIdFromRequest(req) {
  const header = String(req?.headers?.['x-pack'] || '').trim().toLowerCase();
  const query = String(req?.query?.pack || '').trim().toLowerCase();
  const bodyPack =
    req?.body && typeof req.body.pack === 'string' ? req.body.pack.trim().toLowerCase() : '';
  const raw = header || query || bodyPack;
  if (KNOWN_PACKS.has(raw)) return raw;
  return getPrimaryPackId();
}
