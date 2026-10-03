/* ============================================================================
   The card DSL, as types.

   This file is the actual reason to move to TypeScript. The card content is a
   stringly-typed data language — `{op:'damage', amt:2, tgt:'self-hero'}` — and
   in plain JS a typo in `op` or `tgt` produces a card that silently does
   nothing. There is no crash and no test failure; the card just quietly fails
   to work, and you find out when a player reports it.

   With the unions below, every one of those becomes a compile error:

     { op: 'damge',  amt: 2, tgt: 'choose-asset' }   // unknown op
     { op: 'damage', amt: 2, tgt: 'self_hero'    }   // underscore, not hyphen
     { op: 'damage',         tgt: 'choose-asset' }   // amt missing
     { op: 'draw',   amt: 2, tgt: 'choose-asset' }   // draw takes no target
     { op: 'summon', card: 'nodee', count: 1     }   // no such token
     { op: 'buff',   amt: 2, tgt: 'choose-asset' }   // buff uses a/h, not amt

   That is worth the whole migration on its own, and it gets more valuable as
   community-submitted cards start arriving.
   ========================================================================== */

export type Faction = 'neutral' | 'consortium' | 'sovereign' | 'degen';
export type PlayableFaction = Exclude<Faction, 'neutral'>;
export type Keyword = 'firewall' | 'zeroconf' | 'coldstorage' | 'yield' | 'sharded' | 'overclock';
export type Mode = 'constructed' | 'salvage';
export type Seat = 0 | 1;

/** Targets the player picks. These are the only ones that prompt. */
export type ChooseTarget =
  | 'choose-asset'
  | 'choose-enemy-asset'
  | 'choose-friendly-asset'
  | 'choose-other-friendly-asset'
  | 'choose-any';

/** Targets the engine resolves on its own. */
export type AutoTarget =
  | 'all-enemy-assets' | 'all-friendly-assets' | 'all-assets'
  | 'random-enemy-asset' | 'random-friendly-asset'
  | 'self-hero' | 'enemy-hero';

export type TargetSpec = ChooseTarget | AutoTarget;

/** Anything that can be pointed at an Asset. Excludes the two hero-only specs. */
export type AssetTarget = ChooseTarget | 'all-enemy-assets' | 'all-friendly-assets' | 'all-assets' | 'random-enemy-asset' | 'random-friendly-asset';
/** Anything that can be pointed at an Operator. */
export type HeroTarget = 'self-hero' | 'enemy-hero' | 'choose-any';

/**
 * The set of cards a card can summon. Written out rather than derived from
 * CardId to avoid a circular type — and it still catches typos, which is the
 * point. Add an id here when you print a card that summons something new.
 */
export type SummonableId = 'node' | 'bot' | 'satoshis_ghost';

/**
 * Each variant declares exactly the fields its op uses. Excess-property checks
 * do the rest: putting `amt` on a `buff` is an error, as is omitting `count`
 * from a `summon`.
 */
export type Effect =
  | { op: 'damage'; amt: number; tgt: AssetTarget | HeroTarget; maxAtk?: number; opt?: true }
  | { op: 'heal'; amt: number; tgt: AssetTarget | HeroTarget }
  | { op: 'armor'; amt: number; tgt: 'self-hero' }
  | { op: 'buff'; a?: number; h?: number; tgt: AssetTarget; opt?: true }
  | { op: 'buffTemp'; a: number; tgt: AssetTarget }
  | { op: 'doubleAtk'; tgt: AssetTarget }
  | { op: 'grantShield'; tgt: AssetTarget }
  | { op: 'seize'; tgt: AssetTarget }
  | { op: 'destroy'; tgt: AssetTarget; maxAtk?: number }
  | { op: 'control'; tgt: AssetTarget; maxAtk?: number }
  | { op: 'copyFriendly'; tgt: AssetTarget }
  | { op: 'summon'; card: SummonableId; count: number }
  | { op: 'draw'; amt: number }
  | { op: 'gas'; amt: number }
  | { op: 'discardEnemy'; amt: number }
  | { op: 'discardSelf'; amt: number }
  | { op: 'splitDamage'; amt: number };

export type EffectOp = Effect['op'];

interface CardBase {
  /** Display name. */
  n: string;
  /** Gas cost. */
  c: number;
  f: Faction;
  /** Rules text shown on the card. Not parsed — `fx` is the truth. */
  tx?: string;
  kw?: Keyword[];
  /** Tokens are summoned, never drawn, and never appear in a collection. */
  token?: 1;
  /** On Deploy (Assets) or the whole effect (Ops). */
  fx?: Effect[];
  /** On Liquidation. */
  dfx?: Effect[];
  /** Static aura: +N Attack to your other Assets. */
  aura?: number;
}
export interface AssetCard extends CardBase { t: 'asset'; a: number; h: number }
export interface OpCard extends CardBase { t: 'op' }
export type Card = AssetCard | OpCard;

/* ------------------------------------------------------------ match state */

export interface AssetInstance {
  uid: number; id: string; name: string;
  atk: number; hp: number; maxHp: number; cost: number; f: Faction;
  kw: Keyword[];
  shield: boolean; sick: boolean; seized: boolean;
  attacksLeft: number; tempAtk: number; aura: number;
}
export interface PlayerState {
  faction: PlayableFaction;
  hp: number; maxHp: number; armor: number; gas: number; maxGas: number;
  deck: string[]; hand: string[]; board: AssetInstance[];
  fatigue: number; powerUsed: boolean;
  cardsPlayed: number; dmgDealt: number; dmgTaken: number; dmgSelf: number;
}
export interface LogEntry { n: number; text: string; kind: '' | 'blk' | 'hit' }

export interface MatchState {
  seed: number;
  rng: () => number;
  uid: number;
  mode: Mode;
  p: [PlayerState, PlayerState];
  turn: Seat;
  block: number;
  over: boolean;
  winner: Seat | null;
  feed: string[];
  feedDeck: string[];
  played: Partial<Record<Faction, number>>;
  awaitingClaim: boolean;
  log: LogEntry[];
  actions: number;
  cleaning: boolean;
}

/* ---------------------------------------------------------------- actions */

export interface TargetRef { p: Seat; kind: 'asset' | 'hero'; uid?: number }

export type Action =
  | { t: 'claim'; i: number }
  | { t: 'play'; i: number; target?: TargetRef | null }
  | { t: 'attack'; attacker: number; target: TargetRef }
  | { t: 'power' }
  | { t: 'end' };

export interface ActionResult { ok: boolean; error?: string; events: LogEntry[] }

/* ------------------------------------------------------------------ views */
// What a seat is allowed to see. The opponent's hand is a count, decks are
// counts, and the feed deck order is absent entirely.

export interface PublicPlayer {
  faction: PlayableFaction;
  hp: number; maxHp: number; armor: number; gas: number; maxGas: number;
  powerUsed: boolean; fatigue: number;
  deckCount: number; handCount: number;
  cardsPlayed: number; dmgDealt: number; dmgTaken: number; dmgSelf: number;
  board: ViewAsset[];
}
export interface ViewAsset {
  uid: number; id: string; name: string; atk: number; hp: number; maxHp: number;
  f: Faction; kw: Keyword[]; shield: boolean; seized: boolean; canAttack: boolean;
  /** Swings still available this block. Public: it is what the READY badge is counting. */
  attacksLeft: number;
}
export interface MatchView {
  seat: Seat | null;
  mode: Mode;
  block: number;
  yourTurn: boolean;
  activeSeat: Seat;
  over: boolean;
  winner: Seat | null;
  you: PublicPlayer & { hand?: string[] };
  them: PublicPlayer;
  feed: string[];
  feedRemaining: number;
  awaitingClaim: boolean;
  log: LogEntry[];
}

export interface MatchRecord {
  id?: string;
  seed: number;
  mode: Mode;
  factions: [PlayableFaction, PlayableFaction];
  actions: { seat: Seat; action: Action }[];
  winner?: Seat | null;
}

/* --------------------------------------------------------- wire protocol */
// Typed both ways, so the client cannot send a message shape the server does
// not handle and vice versa.

export type ClientMessage =
  | { t: 'queue'; faction: PlayableFaction; mode: Mode; playerId?: string }
  | { t: 'resume'; matchId: string; token: string }
  | { t: 'spectate'; matchId: string }
  | Action;

export type ServerMessage =
  | { t: 'queued' }
  | { t: 'start'; matchId: string; seat: Seat; mode: Mode; token: string }
  | { t: 'state'; view: MatchView; seat: Seat | null; token?: string }
  | { t: 'reject'; why: string }
  | { t: 'timeout'; seat: Seat }
  | { t: 'opponentGone'; graceMs: number }
  | { t: 'opponentBack' }
  | { t: 'resumeFailed' }
  | { t: 'over'; won: boolean | null; why: string; replayId: string };
