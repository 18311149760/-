import { MAX_PROGRESS_BYTES, freshProgress, mergeProgress, readProgress, sameProgress, type ProgressData } from './progress.ts';

type Store = {
  getWithMetadata(key: string, options: { type: 'json' }): Promise<{ data: unknown; etag?: string } | null>;
  setJSON(key: string, data: unknown, options: { onlyIfMatch: string } | { onlyIfNew: true }): Promise<{ modified: boolean }>;
};
type Dependencies = { getUser: () => Promise<{ id: string } | null>; getStore: () => Store };
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { 'Cache-Control': 'private, no-store', 'Netlify-CDN-Cache-Control': 'no-store', 'Vary': 'Cookie, Authorization', 'X-Content-Type-Options': 'nosniff' } });

export function progressHandler({ getUser, getStore }: Dependencies) {
  return async (request: Request): Promise<Response> => {
    if (request.method !== 'POST') return json({ error: 'method' }, 405);
    if (request.headers.get('origin') !== new URL(request.url).origin) return json({ error: 'origin' }, 403);
    if (!request.headers.get('content-type')?.startsWith('application/json')) return json({ error: 'content_type' }, 415);
    try {
      const user = await getUser();
      if (!user) return json({ error: 'unauthorized' }, 401);
      // The ID only detects a session changed in another tab. It never grants access.
      if (request.headers.get('x-starry-user') !== user.id) return json({ error: 'account_changed' }, 409);
      if (Number(request.headers.get('content-length')) > MAX_PROGRESS_BYTES) return json({ error: 'too_large' }, 413);
      const reader = request.body?.getReader();
      if (!reader) return json({ error: 'invalid_data' }, 400);
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > MAX_PROGRESS_BYTES) { await reader.cancel(); return json({ error: 'too_large' }, 413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      let incoming: ProgressData | null;
      try { incoming = readProgress(JSON.parse(new TextDecoder().decode(bytes))); } catch { return json({ error: 'invalid_data' }, 400); }
      if (!incoming) return json({ error: 'invalid_data' }, 400);
      const store = getStore(), key = `players/${encodeURIComponent(user.id)}`;
      // Conditional writes prevent two devices from overwriting each other's uploads.
      for (let attempt = 0; attempt < 4; attempt++) {
        const current = await store.getWithMetadata(key, { type: 'json' });
        const stored = current ? readProgress(current.data) : freshProgress();
        if (!stored) return json({ error: 'stored_data_invalid' }, 503);
        if (current && !current.etag) return json({ error: 'unavailable' }, 503);
        const merged = mergeProgress(stored, incoming);
        if (current && sameProgress(merged, stored)) return json({ userId: user.id, progress: merged });
        const result = await store.setJSON(key, merged, current ? { onlyIfMatch: current.etag! } : { onlyIfNew: true });
        if (result.modified) return json({ userId: user.id, progress: merged });
      }
      return json({ error: 'busy' }, 409);
    } catch {
      return json({ error: 'unavailable' }, 503);
    }
  };
}
