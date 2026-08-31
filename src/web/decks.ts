import {
  DECKS, validateKit, type CardId, type KitCounts, type PlayableFaction
} from '../engine/index.ts';
import type { DeckSource } from './match/types.ts';
import type { Wallet } from './stash.ts';

const KIT_KEY = 'chainfall-kits';
const DECK_SRC_KEY = 'chainfall-deck-source';

type Stored = Partial<Record<PlayableFaction, KitCounts>>;

function read(): Stored {
  try {
    const raw = JSON.parse(localStorage.getItem(KIT_KEY) || '{}') as unknown;
    return raw && typeof raw === 'object' ? raw as Stored : {};
  } catch {
    return {};
  }
}

function write(kits: Stored): void {
  try { localStorage.setItem(KIT_KEY, JSON.stringify(kits)); } catch { /* private mode */ }
}

export function loadDeckSource(): DeckSource {
  try {
    const v = localStorage.getItem(DECK_SRC_KEY);
    return v === 'custom' ? 'custom' : 'starter';
  } catch {
    return 'starter';
  }
}

export function saveDeckSource(source: DeckSource): void {
  try { localStorage.setItem(DECK_SRC_KEY, source); } catch { /* private mode */ }
}

export function starterKit(faction: PlayableFaction): KitCounts {
  return { ...DECKS[faction] };
}

export function loadKit(faction: PlayableFaction): KitCounts {
  return read()[faction] ?? starterKit(faction);
}

export function saveKit(faction: PlayableFaction, counts: KitCounts): void {
  const kits = read();
  kits[faction] = counts;
  write(kits);
}

export function customKitError(faction: PlayableFaction, wallet: Wallet): string | null {
  return validateKit(loadKit(faction), faction, wallet.owned);
}

export function kitForMatch(
  faction: PlayableFaction,
  wallet: Wallet,
  source: DeckSource,
): KitCounts | undefined {
  if (source === 'starter') return undefined;
  const counts = loadKit(faction);
  const err = validateKit(counts, faction, wallet.owned);
  return err ? undefined : counts;
}

export function kitCardIds(counts: KitCounts): CardId[] {
  return Object.keys(counts).filter(id => (counts[id as CardId] ?? 0) > 0) as CardId[];
}

/** Card ids to mark discovered after a constructed match. */
export function kitIdsForStash(faction: PlayableFaction, wallet: Wallet, source: DeckSource): CardId[] {
  if (source === 'starter') return Object.keys(DECKS[faction]) as CardId[];
  return kitCardIds(loadKit(faction));
}
