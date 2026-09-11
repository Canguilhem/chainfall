/** Where the match server lives. Empty = same origin (`npm start` or dev proxy).
 *  Set `VITE_SERVER_ORIGIN=https://your-api.example.com` when the client is
 *  hosted separately (e.g. Vercel static + Railway API). */
const ORIGIN = (import.meta.env.VITE_SERVER_ORIGIN as string | undefined)?.replace(/\/$/, '') ?? '';

export function serverOrigin(): string {
  return ORIGIN || location.origin;
}

export function apiUrl(path: string): string {
  return `${serverOrigin()}${path.startsWith('/') ? path : `/${path}`}`;
}

export function wsUrl(): string {
  if (ORIGIN) {
    const u = new URL(ORIGIN);
    u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:';
    u.pathname = '/ws';
    u.search = '';
    u.hash = '';
    return u.toString();
  }
  const proto = location.protocol === 'https:' ? 'wss' : 'ws';
  return `${proto}://${location.host}/ws`;
}
