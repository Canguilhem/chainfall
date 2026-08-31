import { useCallback, useState } from 'react';
import type { Pending } from '../match/types.ts';

export function useMatchInput() {
  const [pending, setPending] = useState<Pending>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [peek, setPeek] = useState<number | null>(null);
  const [feedOpen, setFeedOpen] = useState(false);
  const [feedShut, setFeedShut] = useState(false);

  const resetInput = useCallback(() => {
    setPending(null);
    setSel(null);
    setPeek(null);
    setFeedOpen(false);
    setFeedShut(false);
  }, []);

  const resetTargeting = useCallback(() => {
    setPending(null);
    setSel(null);
  }, []);

  const clearPeek = useCallback(() => {
    setPeek(null);
  }, []);

  return {
    pending, setPending,
    sel, setSel,
    peek, setPeek,
    feedOpen, setFeedOpen,
    feedShut, setFeedShut,
    resetInput,
    resetTargeting,
    clearPeek,
  };
}
