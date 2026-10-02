import { useCallback, useRef, useState } from 'react';
import {
  CARD_IDS, EARN_LOSS, EARN_WIN, PACK_COST, craftCard, isToken, openPack as rollPack, salvageCard,
  type CardId, type Pull
} from '../engine/index.ts';

const FOUND_KEY = 'chainfall-stash';
const WALLET_KEY = 'chainfall-vault';

export const COLLECTABLE = CARD_IDS.filter(id => !isToken(id));
const ALLOWED = new Set<string>(COLLECTABLE);

export type Wallet = {
  scrip: number;
  salvage: number;
  packs: number;
  owned: Record<string, number>;
  sinceEpic: number;
  sinceLegend: number;
  opened: number;
};

const freshWallet = (): Wallet => ({
  scrip: 300, salvage: 0, packs: 2, owned: {}, sinceEpic: 0, sinceLegend: 0, opened: 0
});

export function loadFound(): Set<CardId> {
  try {
    const raw = JSON.parse(localStorage.getItem(FOUND_KEY) || '[]') as unknown;
    if (!Array.isArray(raw)) return new Set();
    return new Set(raw.filter((id): id is CardId => ALLOWED.has(id)));
  } catch {
    return new Set();
  }
}

function saveFound(found: Set<CardId>): void {
  try { localStorage.setItem(FOUND_KEY, JSON.stringify([...found])); } catch { /* private mode */ }
}

export function loadWallet(): Wallet {
  try {
    const raw = JSON.parse(localStorage.getItem(WALLET_KEY) || 'null') as unknown;
    if (!raw || typeof raw !== 'object') return freshWallet();
    const w = { ...freshWallet(), ...(raw as Partial<Wallet>) };
    w.owned = w.owned && typeof w.owned === 'object' ? w.owned : {};
    return w;
  } catch {
    return freshWallet();
  }
}

function saveWallet(w: Wallet): void {
  try { localStorage.setItem(WALLET_KEY, JSON.stringify(w)); } catch { /* private mode */ }
}

export function useStash() {
  const [found, setFound] = useState<Set<CardId>>(loadFound);
  const [wallet, setWallet] = useState<Wallet>(loadWallet);
  const walletRef = useRef(wallet);
  walletRef.current = wallet;

  const add = useCallback((ids: readonly string[]) => {
    setFound(prev => {
      let next: Set<CardId> | null = null;
      for (const id of ids) {
        if (!ALLOWED.has(id) || prev.has(id as CardId)) continue;
        if (!next) next = new Set(prev);
        next.add(id as CardId);
      }
      if (!next) return prev;
      saveFound(next);
      return next;
    });
  }, []);

  const commit = useCallback((next: Wallet) => {
    saveWallet(next);
    walletRef.current = next;
    setWallet(next);
  }, []);

  const buyPack = useCallback((): boolean => {
    const wallet = walletRef.current;
    if (wallet.scrip < PACK_COST) return false;
    commit({ ...wallet, scrip: wallet.scrip - PACK_COST, packs: wallet.packs + 1 });
    return true;
  }, [commit]);

  const openPack = useCallback((): { pulls: Pull[]; refund: number } | null => {
    const w = walletRef.current;
    if (w.packs < 1) return null;
    const next: Wallet = { ...w, packs: w.packs - 1, owned: { ...w.owned } };
    const result = rollPack(next, Math.random);
    commit(next);
    add(result.pulls.map(p => p.id));
    return result;
  }, [add, commit]);

  const craft = useCallback((id: string): boolean => {
    const w = walletRef.current;
    const next: Wallet = { ...w, owned: { ...w.owned } };
    if (!craftCard(next, id)) return false;
    commit(next);
    add([id]);
    return true;
  }, [add, commit]);

  const salvage = useCallback((id: string): boolean => {
    const w = walletRef.current;
    const next: Wallet = { ...w, owned: { ...w.owned } };
    if (!salvageCard(next, id)) return false;
    commit(next);
    return true;
  }, [commit]);

  const awardScrip = useCallback((won: boolean | null) => {
    const amt = won ? EARN_WIN : EARN_LOSS;
    const w = walletRef.current;
    commit({ ...w, scrip: w.scrip + amt });
    return amt;
  }, [commit]);

  return { found, add, wallet, buyPack, openPack, craft, salvage, awardScrip };
}
