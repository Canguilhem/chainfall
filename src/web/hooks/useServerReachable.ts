import { useEffect, useState } from 'react';
import { apiUrl } from '../serverOrigin.ts';

export type ServerReach = 'checking' | 'up' | 'down';

export function useServerReachable(): ServerReach {
  const [reach, setReach] = useState<ServerReach>('checking');

  useEffect(() => {
    let dead = false;
    const check = async () => {
      try {
        const r = await fetch(apiUrl('/api/health'), { signal: AbortSignal.timeout(4000) });
        const j = await r.json() as { ok?: boolean };
        if (!dead) setReach(j?.ok ? 'up' : 'down');
      } catch {
        if (!dead) setReach('down');
      }
    };
    check();
    const id = setInterval(check, 30_000);
    return () => { dead = true; clearInterval(id); };
  }, []);

  return reach;
}
