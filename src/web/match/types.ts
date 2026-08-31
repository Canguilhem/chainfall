import type { ChooseTarget } from '../../engine/index.ts';

export type Opponent = 'bot' | 'human';

/** Constructed only — starter lists are always legal; custom is the Deck page save. */
export type DeckSource = 'starter' | 'custom';

export type Pending = { i: number; spec: ChooseTarget; maxAtk?: number } | null;

export type Screen =
  | { id: 'start' }
  | { id: 'docs' }
  | { id: 'vault' }
  | { id: 'deck' }
  | { id: 'queued' }
  | { id: 'match' }
  | { id: 'over'; won: boolean | null; why: string };

export type Hint = { phase: string; text: string; extra?: string };
