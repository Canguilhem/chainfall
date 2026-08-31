import { CARDS, DECKS, isToken, type CardId } from './cards.ts';
import type { PlayableFaction } from './types.ts';
import { maxOf } from './packs.ts';

export const DECK_SIZE = 25;

export type KitCounts = Partial<Record<CardId, number>>;

export function kitToList(counts: KitCounts): string[] {
  const d: string[] = [];
  for (const [id, n] of Object.entries(counts)) {
    for (let i = 0; i < (n ?? 0); i++) d.push(id);
  }
  return d;
}

export function kitTotal(counts: KitCounts): number {
  return Object.values(counts).reduce((s, n) => s + (n ?? 0), 0);
}

/** Starter copies are always legal; vault copies stack up to the rarity cap. */
export function availableCopies(
  faction: PlayableFaction,
  id: CardId,
  owned: Record<string, number>,
): number {
  const starter = DECKS[faction][id] ?? 0;
  const have = owned[id] ?? 0;
  return Math.min(maxOf(id), starter + have);
}

export function validateKit(
  counts: KitCounts,
  faction: PlayableFaction,
  owned: Record<string, number> = {},
): string | null {
  const total = kitTotal(counts);
  if (total !== DECK_SIZE) return `Kit must be ${DECK_SIZE} cards · ${total} selected`;

  for (const [id, n] of Object.entries(counts)) {
    const copies = n ?? 0;
    if (copies <= 0) continue;
    if (isToken(id as CardId) || !(id in CARDS)) return `Invalid card: ${id}`;
    const c = CARDS[id as CardId];
    if (c.f !== 'neutral' && c.f !== faction) return `${c.n} is not legal in this crew`;
    const cap = maxOf(id);
    if (copies > cap) return `Too many copies of ${c.n} (max ${cap})`;
    if (copies > availableCopies(faction, id as CardId, owned)) {
      return `Not enough copies of ${c.n} in your vault`;
    }
  }
  return null;
}

export function legalPool(faction: PlayableFaction, owned: Record<string, number>): CardId[] {
  return (Object.keys(CARDS) as CardId[]).filter(id => {
    if (isToken(id)) return false;
    const c = CARDS[id];
    if (c.f !== 'neutral' && c.f !== faction) return false;
    return availableCopies(faction, id, owned) > 0;
  });
}
