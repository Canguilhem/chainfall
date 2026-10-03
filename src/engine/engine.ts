/* ============================================================================
   CHAINFALL engine — pure, deterministic, framework-agnostic.

   IMPORTANT: this file is imported by both the React app and the Node server.
   It must never reach for anything Vite-specific (import.meta.env, ?raw
   imports, path aliases) or anything Node-specific (fs, crypto). Keeping it
   plain TypeScript is what lets one copy of the rules serve both sides.
   ========================================================================== */
import type {
  Card, Action, ActionResult, AssetInstance, Effect, Faction, LogEntry, MatchRecord,
  MatchState, MatchView, Mode, PlayableFaction, PlayerState, PublicPlayer, Seat,
  TargetRef, TargetSpec, ChooseTarget
} from './types.ts';
import { CARDS, CONSENSUS, FACTIONS, DECKS, type CardId } from './cards.ts';
import { kitToList, type KitCounts } from './deck.ts';

export const MAXGAS = 8, BOARD = 5, HANDMAX = 8, STARTHP = 20, FEEDSIZE = 5;

const other = (s: Seat): Seat => (1 - s) as Seat;
// CARDS keeps literal types (so CardId is a real union), but that means indexing
// it yields a union of ~70 exact object shapes with no shared optional keys.
// Widening to the declared Card interface here is what makes `c.fx` legal.
const card = (id: string): Card => CARDS[id as CardId] as Card;

/** mulberry32 — small, fast, identical across engines. Replayability depends on it. */
function makeRng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const rndInt = (S: MatchState, n: number) => Math.floor(S.rng() * n);
function pickOne<T>(S: MatchState, arr: T[]): T { return arr[rndInt(S, arr.length)]!; }
function shuffle<T>(S: MatchState, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rndInt(S, i + 1);
    const t = arr[i]!; arr[i] = arr[j]!; arr[j] = t;
  }
  return arr;
}
function log(S: MatchState, text: string, kind: LogEntry['kind'] = ''): void {
  S.log.push({ n: S.log.length, text, kind });
}

const auraFor = (S: MatchState, seat: Seat) => S.p[seat].board.reduce((s, a) => s + a.aura, 0);
export function effAtk(S: MatchState, a: AssetInstance, seat: Seat): number {
  return Math.max(0, a.atk + a.tempAtk + (auraFor(S, seat) - a.aura));
}
export const canAttack = (a: AssetInstance): boolean =>
  a.attacksLeft > 0 && !a.sick && !a.seized && (a.atk + a.tempAtk) > 0;

function instance(S: MatchState, cardId: string): AssetInstance {
  const c = card(cardId);
  if (c.t !== 'asset') throw new Error('not an asset: ' + cardId);
  const kw = c.kw ?? [];
  return {
    uid: S.uid++, id: cardId, name: c.n, atk: c.a, hp: c.h, maxHp: c.h, cost: c.c, f: c.f,
    kw: [...kw], shield: kw.includes('coldstorage'), sick: !kw.includes('zeroconf'),
    attacksLeft: 0, seized: false, tempAtk: 0, aura: c.aura ?? 0
  };
}
const findAsset = (S: MatchState, ref: TargetRef) =>
  S.p[ref.p].board.find(a => a.uid === ref.uid);

/* ------------------------------------------------------------- match setup */
function mkPlayer(faction: PlayableFaction): PlayerState {
  return { faction, hp: STARTHP, maxHp: STARTHP, armor: 0, gas: 0, maxGas: 0,
    deck: [], hand: [], board: [], fatigue: 0, powerUsed: false,
    cardsPlayed: 0, dmgDealt: 0, dmgTaken: 0, dmgSelf: 0 };
}
function buildDeck(S: MatchState, faction: PlayableFaction): string[] {
  const d: string[] = [];
  for (const [id, n] of Object.entries(DECKS[faction])) for (let i = 0; i < (n ?? 0); i++) d.push(id);
  return shuffle(S, d);
}
function buildKit(S: MatchState, counts: KitCounts): string[] {
  return shuffle(S, kitToList(counts));
}
function refillFeed(S: MatchState): void {
  while (S.feed.length < FEEDSIZE && S.feedDeck.length) S.feed.push(S.feedDeck.pop()!);
}

export function createMatch(opts: {
  seed?: number; mode?: Mode; factions?: [PlayableFaction, PlayableFaction];
  kits?: [KitCounts | undefined, KitCounts | undefined];
} = {}): MatchState {
  const seed = (opts.seed ?? Math.floor(Math.random() * 0xFFFFFFFF)) >>> 0;
  const factions = opts.factions ?? (['sovereign', 'consortium'] as [PlayableFaction, PlayableFaction]);
  const S: MatchState = {
    seed, rng: makeRng(seed), uid: 1,
    mode: opts.mode === 'salvage' ? 'salvage' : 'constructed',
    p: [mkPlayer(factions[0]), mkPlayer(factions[1])],
    turn: 0, block: 0, over: false, winner: null,
    feed: [], feedDeck: [], played: {}, awaitingClaim: false,
    log: [], actions: 0, cleaning: false
  };
  if (S.mode === 'salvage') {
    const pool: string[] = [];
    for (const id of Object.keys(CARDS)) if (!('token' in CARDS[id as CardId])) { pool.push(id, id); }
    S.feedDeck = shuffle(S, pool);
    const cheap = (): string => {
      const i = S.feedDeck.findIndex(id => card(id).c <= 3);
      return S.feedDeck.splice(i < 0 ? 0 : i, 1)[0]!;
    };
    for (let i = 0; i < 3; i++) S.p[0].hand.push(cheap());
    for (let i = 0; i < 4; i++) S.p[1].hand.push(cheap());
    refillFeed(S);
  } else {
    const kits = opts.kits;
    S.p[0].deck = kits?.[0] ? buildKit(S, kits[0]) : buildDeck(S, factions[0]);
    S.p[1].deck = kits?.[1] ? buildKit(S, kits[1]) : buildDeck(S, factions[1]);
    for (let i = 0; i < 3; i++) draw(S, 0);
    for (let i = 0; i < 5; i++) draw(S, 1);
  }
  S.p[1].hand.push('airdrop_coin');
  log(S, FACTIONS[factions[0]].name + ' vs ' + FACTIONS[factions[1]].name, 'blk');
  beginTurn(S, 0);
  return S;
}

/* ----------------------------------------------------------------- effects */
/** Next card a Draw effect would give this seat, or undefined if the well is dry. */
function takeForDraw(S: MatchState, seat: Seat): string | undefined {
  if (S.mode === 'salvage') {
    // Salvage has no kit. Draw drinks from the same well as claim: the remaining
    // Feed pile first, then a random face-up Feed card once that pile is gone.
    if (S.feedDeck.length) return S.feedDeck.pop();
    if (S.feed.length) return S.feed.splice(rndInt(S, S.feed.length), 1)[0];
    return undefined;
  }
  return S.p[seat].deck.pop();
}
function draw(S: MatchState, seat: Seat, n = 1): void {
  const P = S.p[seat];
  for (let i = 0; i < n; i++) {
    const fromDeck = S.mode === 'salvage' && S.feedDeck.length > 0;
    const id = takeForDraw(S, seat);
    if (!id) {
      P.fatigue++;
      log(S, (seat ? 'foe' : 'you') + ' · scraped the bag · ' + P.fatigue, 'hit');
      damageHero(S, seat, P.fatigue);
      continue;
    }
    if (P.hand.length >= HANDMAX) { log(S, 'hand full · ' + card(id).n + ' burned'); continue; }
    P.hand.push(id);
    if (S.mode === 'salvage') {
      log(S, (seat ? 'foe' : 'you') + ' · draw ' + card(id).n.toLowerCase());
      // Pulling from the hidden pile does not pass through claim, so top the Feed up.
      if (fromDeck) refillFeed(S);
    }
  }
}
function damageHero(S: MatchState, seat: Seat, amt: number, src?: Seat): void {
  const P = S.p[seat];
  if (src === undefined || src === seat) P.dmgSelf += amt;
  else { P.dmgTaken += amt; S.p[src].dmgDealt += amt; }
  const absorbed = Math.min(P.armor, amt);
  P.armor -= absorbed;
  P.hp -= (amt - absorbed);
  if (P.hp <= 0 && !S.over) {
    S.over = true; S.winner = other(seat);
    log(S, seat ? 'you walk free' : 'you fell', 'blk');
  }
}
function damageAsset(S: MatchState, a: AssetInstance, amt: number): void {
  if (a.shield) { a.shield = false; log(S, a.name + ' · cold storage broken'); return; }
  a.hp -= amt;
}
function cleanup(S: MatchState): void {
  if (S.cleaning) return;              // deathrattles re-enter; the loop handles cascades
  S.cleaning = true;
  let again = true, guard = 0;
  while (again && guard++ < 24) {
    again = false;
    for (const seat of [0, 1] as Seat[]) {
      const P = S.p[seat];
      const dead = P.board.filter(a => a.hp <= 0);
      if (!dead.length) continue;
      P.board = P.board.filter(a => a.hp > 0);
      again = true;
      for (const a of dead) {
        log(S, a.name + ' liquidated', 'hit');
        const dfx = card(a.id).dfx;
        if (dfx) resolve(S, dfx, seat, null);
      }
    }
  }
  S.cleaning = false;
}
function summon(S: MatchState, seat: Seat, cardId: string, count: number): void {
  const P = S.p[seat];
  for (let i = 0; i < count; i++) {
    if (P.board.length >= BOARD) { log(S, 'board full · summon fizzled'); return; }
    const a = instance(S, cardId);
    a.sick = true; a.attacksLeft = 0;
    P.board.push(a);
  }
}

export function targets(S: MatchState, spec: TargetSpec, seat: Seat, sourceUid: number | null): TargetRef[] {
  const me = S.p[seat], them = S.p[other(seat)], out: TargetRef[] = [];
  const A = (p: Seat, a: AssetInstance): TargetRef => ({ p, uid: a.uid, kind: 'asset' });
  if (spec === 'choose-asset') { me.board.forEach(a => out.push(A(seat, a))); them.board.forEach(a => out.push(A(other(seat), a))); }
  else if (spec === 'choose-enemy-asset') them.board.forEach(a => out.push(A(other(seat), a)));
  else if (spec === 'choose-friendly-asset') me.board.forEach(a => out.push(A(seat, a)));
  else if (spec === 'choose-other-friendly-asset') me.board.forEach(a => { if (a.uid !== sourceUid) out.push(A(seat, a)); });
  else if (spec === 'choose-any') {
    me.board.forEach(a => out.push(A(seat, a)));
    them.board.forEach(a => out.push(A(other(seat), a)));
    out.push({ p: seat, kind: 'hero' }, { p: other(seat), kind: 'hero' });
  }
  return out;
}
const isChoose = (t: unknown): t is ChooseTarget => typeof t === 'string' && t.startsWith('choose');

export function needsTarget(S: MatchState, fx: Effect[] | undefined, seat: Seat, sourceUid: number | null): ChooseTarget | 'IMPOSSIBLE' | null {
  if (!fx) return null;
  for (const e of fx) {
    const tgt = 'tgt' in e ? e.tgt : undefined;
    if (isChoose(tgt)) {
      let t = targets(S, tgt, seat, sourceUid);
      const maxAtk = 'maxAtk' in e ? e.maxAtk : undefined;
      if (maxAtk !== undefined) t = t.filter(r => { const a = findAsset(S, r); return !!a && effAtk(S, a, r.p) <= maxAtk; });
      return t.length ? tgt : (('opt' in e && e.opt) ? null : 'IMPOSSIBLE');
    }
  }
  return null;
}

function resolve(S: MatchState, fx: Effect[], seat: Seat, chosen: TargetRef | null): void {
  const me = S.p[seat], them = S.p[other(seat)];
  const overclock = me.board.reduce((s, a) => s + (a.kw.includes('overclock') ? 1 : 0), 0);
  for (const e of fx) {
    const tgt = 'tgt' in e ? e.tgt : undefined;
    const selfDmg = e.op === 'damage' && tgt === 'self-hero';
    const amt = ('amt' in e ? e.amt : 0) + (e.op === 'damage' && !selfDmg ? overclock : 0);

    let refs: TargetRef[] = [];
    if (isChoose(tgt)) refs = chosen ? [chosen] : [];
    else if (tgt === 'all-enemy-assets') refs = them.board.map(a => ({ p: other(seat), uid: a.uid, kind: 'asset' as const }));
    else if (tgt === 'all-friendly-assets') refs = me.board.map(a => ({ p: seat, uid: a.uid, kind: 'asset' as const }));
    else if (tgt === 'all-assets') refs = [
      ...me.board.map(a => ({ p: seat, uid: a.uid, kind: 'asset' as const })),
      ...them.board.map(a => ({ p: other(seat), uid: a.uid, kind: 'asset' as const }))];
    else if (tgt === 'random-enemy-asset') { if (them.board.length) refs = [{ p: other(seat), uid: pickOne(S, them.board).uid, kind: 'asset' }]; }
    else if (tgt === 'random-friendly-asset') { if (me.board.length) refs = [{ p: seat, uid: pickOne(S, me.board).uid, kind: 'asset' }]; }
    else if (tgt === 'self-hero') refs = [{ p: seat, kind: 'hero' }];
    else if (tgt === 'enemy-hero') refs = [{ p: other(seat), kind: 'hero' }];

    switch (e.op) {
      case 'damage':
        for (const r of refs) { if (r.kind === 'hero') damageHero(S, r.p, amt, seat); else { const a = findAsset(S, r); if (a) damageAsset(S, a, amt); } }
        break;
      case 'heal':
        for (const r of refs) {
          if (r.kind === 'hero') { S.p[r.p].hp += amt; }
          else { const a = findAsset(S, r); if (a) a.hp = Math.min(a.maxHp, a.hp + amt); }
        }
        break;
      case 'armor': me.armor += amt; break;
      case 'buff': for (const r of refs) { const a = findAsset(S, r); if (a) { a.atk += e.a ?? 0; a.hp += e.h ?? 0; a.maxHp += e.h ?? 0; } } break;
      case 'buffTemp': for (const r of refs) { const a = findAsset(S, r); if (a) a.tempAtk += e.a; } break;
      case 'doubleAtk': for (const r of refs) { const a = findAsset(S, r); if (a) a.atk *= 2; } break;
      case 'grantShield': for (const r of refs) { const a = findAsset(S, r); if (a) a.shield = true; } break;
      case 'seize': for (const r of refs) { const a = findAsset(S, r); if (a) { a.seized = true; a.attacksLeft = 0; } } break;
      case 'destroy': for (const r of refs) { const a = findAsset(S, r); if (a) a.hp = 0; } break;
      case 'copyFriendly': for (const r of refs) { const a = findAsset(S, r); if (a) summon(S, seat, a.id, 1); } break;
      case 'control':
        for (const r of refs) {
          const a = findAsset(S, r);
          if (a && me.board.length < BOARD) {
            them.board.splice(them.board.indexOf(a), 1);
            a.sick = true; a.attacksLeft = 0; me.board.push(a);
            log(S, a.name + ' · control transferred');
          }
        }
        break;
      case 'summon': summon(S, seat, e.card, e.count); break;
      case 'draw': draw(S, seat, amt); break;
      case 'gas': me.gas += amt; break;
      case 'discardEnemy':
        for (let i = 0; i < amt; i++) {
          if (!them.hand.length) {
            log(S, (other(seat) ? 'foe' : 'you') + ' · discard fizzled · empty hand');
            break;
          }
          const dumped = them.hand.splice(rndInt(S, them.hand.length), 1)[0]!;
          log(S, (other(seat) ? 'foe' : 'you') + ' · discard ' + card(dumped).n.toLowerCase());
        }
        break;
      case 'discardSelf':
        for (let i = 0; i < amt; i++) {
          if (!me.hand.length) {
            log(S, (seat ? 'foe' : 'you') + ' · discard fizzled · empty hand');
            break;
          }
          const dumped = me.hand.splice(rndInt(S, me.hand.length), 1)[0]!;
          log(S, (seat ? 'foe' : 'you') + ' · discard ' + card(dumped).n.toLowerCase());
        }
        break;
      case 'splitDamage':
        for (let i = 0; i < amt; i++) {
          const pool: TargetRef[] = [
            ...them.board.map(a => ({ p: other(seat), uid: a.uid, kind: 'asset' as const })),
            { p: other(seat), kind: 'hero' as const }];
          const r = pickOne(S, pool);
          if (r.kind === 'hero') damageHero(S, r.p, 1, seat); else { const a = findAsset(S, r); if (a) damageAsset(S, a, 1); }
        }
        break;
    }
  }
  cleanup(S);
}

/* -------------------------------------------------------------- turn cycle */
function beginTurn(S: MatchState, seat: Seat): void {
  S.turn = seat; S.block++;
  const P = S.p[seat];
  P.maxGas = Math.min(MAXGAS, P.maxGas + 1);
  P.gas = P.maxGas; P.powerUsed = false;
  P.board.forEach(a => {
    a.sick = false; a.tempAtk = 0;
    a.attacksLeft = a.seized ? 0 : (a.kw.includes('sharded') ? 2 : 1);
  });
  S.played = {};
  log(S, 'block ' + String(S.block).padStart(3, '0') + ' · ' + (seat ? 'foe' : 'you') + ' · ' + P.maxGas + ' gas', 'blk');
  if (S.mode === 'salvage') S.awaitingClaim = true; else draw(S, seat);
}
function claimFeed(S: MatchState, seat: Seat, idx: number): boolean {
  if (!S.awaitingClaim || S.turn !== seat) return false;
  if (!S.feed.length) { S.p[seat].fatigue++; damageHero(S, seat, S.p[seat].fatigue); S.awaitingClaim = false; return true; }
  const i = Math.max(0, Math.min(S.feed.length - 1, idx | 0));
  const id = S.feed.splice(i, 1)[0]!;
  if (S.p[seat].hand.length < HANDMAX) S.p[seat].hand.push(id);
  else log(S, 'hand full · ' + card(id).n + ' burned');
  log(S, (seat ? 'foe' : 'you') + ' · claim ' + card(id).n.toLowerCase());
  refillFeed(S); S.awaitingClaim = false;
  return true;
}
function endTurn(S: MatchState): void {
  if (S.over) return;
  if (S.awaitingClaim) claimFeed(S, S.turn, 0);
  S.p[S.turn].board.forEach(a => { a.seized = false; a.tempAtk = 0; });
  beginTurn(S, other(S.turn));
}

/* ----------------------------------------------------------------- actions */
export function legalDefenders(S: MatchState, seat: Seat): TargetRef[] {
  const b = S.p[other(seat)].board;
  const walls = b.filter(a => a.kw.includes('firewall'));
  const refs: TargetRef[] = (walls.length ? walls : b).map(a => ({ p: other(seat), uid: a.uid, kind: 'asset' as const }));
  if (!walls.length) refs.push({ p: other(seat), kind: 'hero' });
  return refs;
}
function playCard(S: MatchState, seat: Seat, handIdx: number, chosen: TargetRef | null): boolean {
  const P = S.p[seat], id = P.hand[handIdx];
  if (!id) return false;
  const c = card(id);
  if (c.c > P.gas) return false;
  if (c.t === 'asset' && P.board.length >= BOARD) return false;
  P.hand.splice(handIdx, 1);
  P.gas -= c.c;
  P.cardsPlayed++;
  log(S, (seat ? 'foe' : 'you') + ' · ' + (c.t === 'asset' ? 'deploy ' : 'run ') + c.n.toLowerCase() + ' · -' + c.c + ' gas');
  const consensusFx = (S.played[c.f] ?? 0) > 0 ? (CONSENSUS as Partial<Record<string, Effect[]>>)[id] : undefined;
  S.played[c.f] = (S.played[c.f] ?? 0) + 1;
  if (c.t === 'asset') {
    const a = instance(S, id);
    a.attacksLeft = a.kw.includes('zeroconf') ? (a.kw.includes('sharded') ? 2 : 1) : 0;
    P.board.push(a);
    if (c.fx) resolve(S, c.fx, seat, chosen);
  } else if (c.fx) resolve(S, c.fx, seat, chosen);
  if (consensusFx) { log(S, 'consensus · ' + c.f); resolve(S, consensusFx, seat, null); }
  cleanup(S);
  return true;
}
function useHeroPower(S: MatchState, seat: Seat): boolean {
  const P = S.p[seat], pw = FACTIONS[P.faction].power;
  if (P.powerUsed || P.gas < pw.cost) return false;
  P.gas -= pw.cost; P.powerUsed = true;
  log(S, (seat ? 'foe' : 'you') + ' · hero power ' + pw.name.toLowerCase());
  resolve(S, pw.fx as unknown as Effect[], seat, null);
  return true;
}
function attackWith(S: MatchState, seat: Seat, attUid: number, ref: TargetRef): boolean {
  const A = S.p[seat].board.find(a => a.uid === attUid);
  if (!A || !canAttack(A)) return false;
  const dmg = effAtk(S, A, seat);
  if (ref.kind === 'hero') { log(S, A.name + ' → ' + (ref.p ? 'them' : 'you') + ' · ' + dmg, 'hit'); damageHero(S, ref.p, dmg, seat); }
  else {
    const D = findAsset(S, ref);
    if (!D) return false;
    const back = effAtk(S, D, ref.p);
    log(S, A.name + ' × ' + D.name, 'hit');
    damageAsset(S, D, dmg); damageAsset(S, A, back);
  }
  if (A.kw.includes('yield')) { S.p[seat].hp += dmg; }
  A.attacksLeft--;
  cleanup(S);
  return true;
}

/* ------------------------------------------------- the single entry point */
export function applyAction(S: MatchState, seat: Seat, action: Action | null | undefined): ActionResult {
  const from = S.log.length;
  const fail = (why: string): ActionResult => ({ ok: false, error: why, events: [] });
  if (S.over) return fail('match over');
  if (S.turn !== seat) return fail('not your turn');
  if (!action || typeof action.t !== 'string') return fail('malformed');

  switch (action.t) {
    case 'claim':
      if (S.mode !== 'salvage' || !S.awaitingClaim) return fail('nothing to claim');
      claimFeed(S, seat, action.i | 0);
      break;
    case 'play': {
      if (S.awaitingClaim) return fail('claim first');
      const i = action.i | 0, id = S.p[seat].hand[i];
      if (!id) return fail('no such card');
      const c = card(id);
      if (c.c > S.p[seat].gas) return fail('not enough gas');
      if (c.t === 'asset' && S.p[seat].board.length >= BOARD) return fail('board full');
      const spec = needsTarget(S, c.fx, seat, null);
      let chosen: TargetRef | null = null;
      if (spec && spec !== 'IMPOSSIBLE') {
        const e = c.fx!.find(x => 'tgt' in x && x.tgt === spec)!;
        const maxAtk = 'maxAtk' in e ? e.maxAtk : undefined;
        let legal = targets(S, spec, seat, null);
        if (maxAtk !== undefined) legal = legal.filter(r => { const a = findAsset(S, r); return !!a && effAtk(S, a, r.p) <= maxAtk; });
        const t = action.target;
        chosen = (t && legal.find(r => r.kind === t.kind && r.p === t.p && (r.kind === 'hero' || r.uid === t.uid))) ?? null;
        if (!chosen) return fail('illegal target');
      }
      if (!playCard(S, seat, i, chosen)) return fail('cannot play');
      break;
    }
    case 'attack': {
      if (S.awaitingClaim) return fail('claim first');
      const t = action.target;
      const ref = legalDefenders(S, seat).find(r => r.kind === t?.kind && (r.kind === 'hero' || r.uid === t.uid));
      if (!ref) return fail('illegal attack');
      if (!attackWith(S, seat, action.attacker, ref)) return fail('cannot attack');
      break;
    }
    case 'power':
      if (S.awaitingClaim) return fail('claim first');
      if (!useHeroPower(S, seat)) return fail('cannot use power');
      break;
    case 'end':
      endTurn(S);
      break;
    default:
      return fail('unknown action');
  }
  S.actions++;
  return { ok: true, events: S.log.slice(from) };
}

/* -------------------------------------------------------------------- view */
export function view(S: MatchState, seat: Seat | null, sinceLog = 0): MatchView {
  const spectator = seat === null;
  const pub = (p: PlayerState, s: Seat): PublicPlayer => ({
    faction: p.faction, hp: p.hp, maxHp: p.maxHp, armor: p.armor, gas: p.gas, maxGas: p.maxGas,
    powerUsed: p.powerUsed, fatigue: p.fatigue, deckCount: p.deck.length, handCount: p.hand.length,
    cardsPlayed: p.cardsPlayed, dmgDealt: p.dmgDealt, dmgTaken: p.dmgTaken, dmgSelf: p.dmgSelf,
    board: p.board.map(a => ({
      uid: a.uid, id: a.id, name: a.name, atk: effAtk(S, a, s), hp: a.hp, maxHp: a.maxHp,
      f: a.f, kw: a.kw, shield: a.shield, seized: a.seized, canAttack: s === S.turn && canAttack(a),
      attacksLeft: a.attacksLeft
    }))
  });
  return {
    seat, mode: S.mode, block: S.block,
    yourTurn: !spectator && S.turn === seat,
    activeSeat: S.turn, over: S.over, winner: S.winner,
    you: spectator ? pub(S.p[0], 0) : { ...pub(S.p[seat], seat), hand: [...S.p[seat].hand] },
    them: spectator ? pub(S.p[1], 1) : pub(S.p[other(seat)], other(seat)),
    feed: [...S.feed], feedRemaining: S.feedDeck.length,
    awaitingClaim: S.awaitingClaim && (spectator || S.turn === seat),
    log: S.log.slice(sinceLog)
  };
}

/* ------------------------------------------------------------------- replay */
export function replay(record: MatchRecord): MatchState {
  const S = createMatch({ seed: record.seed, mode: record.mode, factions: record.factions });
  for (const a of record.actions) applyAction(S, a.seat, a.action);
  return S;
}

/* ---------------------------------------------------------------------- bot */
const worth = (S: MatchState, a: AssetInstance, s: Seat) =>
  effAtk(S, a, s) * 1.6 + a.hp + (a.shield ? 2 : 0) + (a.kw.includes('firewall') ? 1 : 0);
const AGGRO: Record<PlayableFaction, number> = { degen: 1.7, sovereign: 1.2, consortium: 0.95 };

function botTarget(S: MatchState, spec: ChooseTarget, e: Effect, seat: Seat): TargetRef | null {
  let t = targets(S, spec, seat, null);
  const maxAtk = 'maxAtk' in e ? e.maxAtk : undefined;
  if (maxAtk !== undefined) t = t.filter(r => { const a = findAsset(S, r); return !!a && effAtk(S, a, r.p) <= maxAtk; });
  if (!t.length) return null;
  const destructive = (['damage', 'destroy', 'seize', 'control'] as const).includes(e.op as never);
  const helpful = (['buff', 'buffTemp', 'doubleAtk', 'grantShield', 'heal', 'copyFriendly'] as const).includes(e.op as never);
  const enemy = t.filter(r => r.p !== seat), mine = t.filter(r => r.p === seat);
  const score = (r: TargetRef) => { const a = findAsset(S, r); return a ? worth(S, a, r.p) : 0; };
  const friendlyOnly = spec === 'choose-friendly-asset' || spec === 'choose-other-friendly-asset';
  if (helpful && !mine.length) return null;     // Hopium with an empty board — don't buff them
  if (destructive && !enemy.length) {
    if (!friendlyOnly) return null;             // Gas Leak with an empty enemy board — don't shoot our own
    const assets = mine.filter(r => r.kind === 'asset');
    return assets.length ? assets.sort((x, y) => score(x) - score(y))[0]! : (mine[0] ?? null);
  }
  const pool = destructive ? enemy : mine;
  const assets = pool.filter(r => r.kind === 'asset');
  return assets.length ? assets.sort((x, y) => score(y) - score(x))[0]! : (pool[0] ?? null);
}
function selfBurn(id: string): number {
  const c = card(id);
  const sum = (fx?: Effect[]) => (fx ?? []).reduce((n, e) => n + (e.op === 'damage' && e.tgt === 'self-hero' ? e.amt : 0), 0);
  return sum(c.fx) + sum(c.dfx);
}
export function botAction(S: MatchState, seat: Seat): Action | null {
  if (S.over || S.turn !== seat) return null;
  const P = S.p[seat], T = S.p[other(seat)];

  if (S.awaitingClaim) {
    let best = 0, bv = -999;
    S.feed.forEach((id, i) => {
      const c = card(id);
      let v = (c.f === P.faction ? 4 : 0) + (c.f === 'neutral' ? 1 : 0) + Math.min(c.c, P.maxGas + 1) * 1.2;
      if (c.c > P.maxGas + 2) v -= 3;
      if ((CONSENSUS as Partial<Record<string, Effect[]>>)[id] && c.f === P.faction) v += 2;
      if (v > bv) { bv = v; best = i; }
    });
    return { t: 'claim', i: best };
  }

  const ready = P.board.filter(canAttack);
  const wall = T.board.some(a => a.kw.includes('firewall'));
  const swing = ready.reduce((s, a) => s + effAtk(S, a, seat) * a.attacksLeft, 0);
  if (!wall && ready.length && swing >= T.hp + T.armor)
    return { t: 'attack', attacker: ready[0]!.uid, target: { p: other(seat), kind: 'hero' } };

  const order = P.hand.map((id, i) => ({ id, i, c: card(id).c })).filter(o => o.c <= P.gas).sort((a, b) => b.c - a.c);
  for (const o of order) {
    const c = card(o.id);
    if (c.t === 'asset' && P.board.length >= BOARD) continue;
    if (selfBurn(o.id) >= P.hp - 3) continue;
    if (c.fx?.some(e => e.op === 'destroy' && e.tgt === 'choose-friendly-asset') && !P.board.length) continue;
    const spec = needsTarget(S, c.fx, seat, null);
    if (spec === 'IMPOSSIBLE') continue;
    let target: TargetRef | null = null;
    if (spec) {
      const e = c.fx!.find(x => 'tgt' in x && x.tgt === spec)!;
      target = botTarget(S, spec, e, seat);
      if (!target) continue;
    }
    return { t: 'play', i: o.i, target };
  }

  const pw = FACTIONS[P.faction].power;
  const pwfx = pw.fx as unknown as Effect[];
  if (!P.powerUsed && P.gas >= pw.cost) {
    const burn = pwfx.reduce((s, e) => s + (e.op === 'damage' && e.tgt === 'self-hero' ? e.amt : 0), 0);
    const lethal = pwfx.some(e => e.op === 'damage' && e.tgt === 'enemy-hero') && T.armor === 0 && T.hp <= 2;
    const summonsFull = pwfx[0]?.op === 'summon' && P.board.length >= BOARD;
    if ((burn === 0 || P.hp > burn + 2 || lethal) && !summonsFull) return { t: 'power' };
  }

  for (const a of P.board) {
    if (!canAttack(a)) continue;
    const defs = legalDefenders(S, seat);
    if (!defs.length) continue;
    const my = effAtk(S, a, seat);
    const heroRef = defs.find(r => r.kind === 'hero');
    let best: { r: TargetRef | undefined; v: number } = { r: heroRef, v: heroRef ? my * AGGRO[P.faction] : -Infinity };
    for (const r of defs) {
      if (r.kind === 'hero') continue;
      const d = findAsset(S, r);
      if (!d) continue;
      const kills = my >= d.hp && !d.shield, dies = effAtk(S, d, r.p) >= a.hp && !a.shield;
      let v = (kills ? worth(S, d, r.p) : my * 0.35) - (dies ? worth(S, a, seat) : 0);
      if (d.kw.includes('firewall') && kills) v += 2;
      if (v > best.v) best = { r, v };
    }
    if (best.r) return { t: 'attack', attacker: a.uid, target: best.r };
  }
  return { t: 'end' };
}

export * from './types.ts';
export { CARDS, CONSENSUS, CONSENSUS_HELP, CTEXT, KWNAME, KWHELP, FNAME, FACTIONS, DECKS, CARD_IDS, isToken, consensusHelp } from './cards.ts';
export type { CardId } from './cards.ts';
export {
  RARITY, CARD_RARITY, PACK_IDS, PACK_COST, PACK_SIZE, PITY_EPIC, PITY_LEGEND,
  EARN_WIN, EARN_LOSS, PLAYSET, rarityOf, maxOf, rollRarity, openPack, craftCard, salvageCard
} from './packs.ts';
export type { Rarity, PackState, Pull, PackCardId } from './packs.ts';
export {
  DECK_SIZE, kitToList, kitTotal, availableCopies, validateKit, legalPool, brewPool,
  type KitCounts
} from './deck.ts';
