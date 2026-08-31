import { useCallback, useEffect, useState } from 'react';
import type { MatchView } from '../../engine/index.ts';

const COACH_KEY = 'chainfall-coached';

function readCoach(): boolean {
  try { return localStorage.getItem(COACH_KEY) !== '1'; } catch { return true; }
}

export function useCoach(v: MatchView | null) {
  const [coach, setCoach] = useState(readCoach);

  const dismissCoach = useCallback(() => {
    setCoach(false);
    try { localStorage.setItem(COACH_KEY, '1'); } catch { /* private mode */ }
  }, []);

  useEffect(() => { if (v && v.block >= 4 && coach) dismissCoach(); }, [v, coach, dismissCoach]);

  return { coach, dismissCoach };
}
