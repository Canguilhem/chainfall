/* ============================================================================
   Viewport and pointer facts, as React state.

   Two separate questions, deliberately not conflated:

   `useCoarsePointer` asks *how you point* — it decides whether inspecting
   something needs a tap, because there is no hover to inspect with. A tablet
   with a large screen still answers yes.

   `usePhoneLayout` asks *how much room there is* — it decides whether the
   table renders as two armies facing across a table or as a portrait phase
   model. The breakpoint matches the one in styles/mobile.css; keep them equal.
   ========================================================================== */
import { useEffect, useState } from 'react';

export const PHONE_QUERY = '(max-width: 720px)';

function useMedia(query: string): boolean {
  const [on, setOn] = useState(() =>
    typeof window !== 'undefined' && window.matchMedia(query).matches
  );
  useEffect(() => {
    const mq = window.matchMedia(query);
    const sync = () => setOn(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, [query]);
  return on;
}

export const useCoarsePointer = () => useMedia('(pointer: coarse), (hover: none)');
export const usePhoneLayout = () => useMedia(PHONE_QUERY);
