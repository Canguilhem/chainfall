import { describe, it, expect } from 'vitest';
import {
  createMatch, applyAction, view, botAction, replay, DECKS, validateKit,
  type Action, type MatchState, type PlayableFaction, type Seat
} from '../src/engine/index.ts';

const F: PlayableFaction[] = ['consortium', 'sovereign', 'degen'];

function autoplay(seed: number, mode: 'constructed' | 'salvage', factions: [PlayableFaction, PlayableFaction],
                  record?: { seat: Seat; action: Action }[]): MatchState {
  const S = createMatch({ seed, mode, factions });
  let g = 0;
  while (!S.over && g++ < 800) {
    const a = botAction(S, S.turn);
    if (!a) break;
    const seat = S.turn;
    if (!applyAction(S, seat, a).ok) break;
    record?.push({ seat, action: a });
  }
  return S;
}

describe('determinism', () => {
  it('same seed and actions produce the same match', () => {
    for (let k = 0; k < 60; k++) {
      const seed = (k * 7919) >>> 0;
      const mode = k % 2 ? 'salvage' : 'constructed';
      const f: [PlayableFaction, PlayableFaction] = [F[k % 3]!, F[(k + 1) % 3]!];
      const a = autoplay(seed, mode, f), b = autoplay(seed, mode, f);
      expect([a.p[0].hp, a.p[1].hp, a.block, a.log.length])
        .toEqual([b.p[0].hp, b.p[1].hp, b.block, b.log.length]);
    }
  });
});

describe('replay', () => {
  it('reconstructs the final state from (seed, actions)', () => {
    for (let k = 0; k < 60; k++) {
      const seed = (k * 104729) >>> 0;
      const mode = k % 2 ? 'salvage' : 'constructed';
      const f: [PlayableFaction, PlayableFaction] = [F[k % 3]!, F[(k + 2) % 3]!];
      const actions: { seat: Seat; action: Action }[] = [];
      const live = autoplay(seed, mode, f, actions);
      const again = replay({ seed, mode, factions: f, actions });
      expect([again.p[0].hp, again.p[1].hp, again.block]).toEqual([live.p[0].hp, live.p[1].hp, live.block]);
    }
  });
  it('keeps a match record small', () => {
    const actions: { seat: Seat; action: Action }[] = [];
    autoplay(1234, 'salvage', ['degen', 'consortium'], actions);
    const bytes = JSON.stringify({ seed: 1234, mode: 'salvage', factions: ['degen', 'consortium'], actions }).length;
    expect(bytes).toBeLessThan(12_000);
  });
});

describe('hidden information', () => {
  it('never sends an opponent hand id or any deck order', () => {
    const S = createMatch({ seed: 42, mode: 'salvage', factions: ['degen', 'consortium'] });
    const v0 = view(S, 0);
    const raw = JSON.stringify(v0);
    const leaked = S.p[1].hand.filter(id =>
      raw.includes(`"${id}"`) && !S.feed.includes(id) && !S.p[0].hand.includes(id));
    expect(leaked).toEqual([]);
    expect(v0.them).not.toHaveProperty('hand');
    expect(v0.them.handCount).toBe(S.p[1].hand.length);
    expect(raw).not.toContain('feedDeck');
  });
  it('redacts both hands for spectators', () => {
    const S = createMatch({ seed: 7, factions: ['sovereign', 'degen'] });
    const vs = view(S, null);
    expect(vs.you).not.toHaveProperty('hand');
    expect(vs.them).not.toHaveProperty('hand');
  });
});

describe('match stats', () => {
  it('counts cards played and operator damage on the public view', () => {
    const S = autoplay(42, 'constructed', ['degen', 'consortium']);
    const v = view(S, 0);
    expect(v.you.cardsPlayed + v.them.cardsPlayed).toBeGreaterThan(0);
    expect(v.you.dmgTaken + v.them.dmgTaken + v.you.dmgSelf + v.them.dmgSelf).toBeGreaterThan(0);
    expect(v.you.cardsPlayed).toBe(S.p[0].cardsPlayed);
    expect(v.them.dmgDealt).toBe(S.p[1].dmgDealt);
    expect(v.you.dmgSelf).toBe(S.p[0].dmgSelf);
  });
});

describe('discard', () => {
  it('logs which card discardEnemy dumps', () => {
    const S = createMatch({ seed: 1, mode: 'constructed', factions: ['consortium', 'degen'] });
    S.awaitingClaim = false;
    S.p[0].hand = ['debt_collector'];
    S.p[0].gas = 4;
    S.p[0].board = [];
    S.p[1].hand = ['hopium', 'gas_leak', 'rekt'];
    const before = S.p[1].hand.length;
    expect(applyAction(S, 0, { t: 'play', i: 0 }).ok).toBe(true);
    expect(S.p[1].hand.length).toBe(before - 1);
    expect(S.log.some(e => /^foe · discard /.test(e.text))).toBe(true);
  });
  it('logs when discard finds an empty hand', () => {
    const S = createMatch({ seed: 1, mode: 'constructed', factions: ['consortium', 'degen'] });
    S.awaitingClaim = false;
    S.p[0].hand = ['debt_collector'];
    S.p[0].gas = 4;
    S.p[0].board = [];
    S.p[1].hand = [];
    expect(applyAction(S, 0, { t: 'play', i: 0 }).ok).toBe(true);
    expect(S.log.some(e => e.text === 'foe · discard fizzled · empty hand')).toBe(true);
  });
});

describe('bot targeting', () => {
  it('does not buff an enemy Asset when its own board is empty', () => {
    const S = createMatch({ seed: 1, mode: 'salvage', factions: ['sovereign', 'consortium'] });
    S.awaitingClaim = false;
    S.turn = 1;
    S.p[1].hand = ['hopium'];
    S.p[1].gas = 3;
    S.p[1].board = [];
    S.p[0].board = [{
      uid: 9, id: 'node', name: 'Node', atk: 3, hp: 3, maxHp: 3, cost: 0, f: 'sovereign',
      kw: [], shield: false, sick: false, seized: false, attacksLeft: 1, tempAtk: 0, aura: 0,
    }];
    const a = botAction(S, 1);
    expect(a?.t === 'play' && a.target?.p === 0).toBe(false);
    if (a?.t === 'play') expect(applyAction(S, 1, a).ok).toBe(true);
    expect(S.p[0].board[0]!.atk).toBe(3);
    expect(S.p[0].board[0]!.hp).toBe(3);
  });
});

describe('draw', () => {
  it('takes from the kit in constructed', () => {
    const S = createMatch({ seed: 7, mode: 'constructed', factions: ['sovereign', 'degen'] });
    S.p[0].hand.push('flash_loan');
    S.p[0].gas = 3;
    const deck = S.p[0].deck.length;
    const hand = S.p[0].hand.length;
    expect(applyAction(S, 0, { t: 'play', i: S.p[0].hand.indexOf('flash_loan') }).ok).toBe(true);
    expect(S.p[0].hand.length).toBe(hand - 1 + 2);
    expect(S.p[0].deck.length).toBe(deck - 2);
  });
  it('takes from the Feed pile in salvage, not an empty kit', () => {
    const S = createMatch({ seed: 7, mode: 'salvage', factions: ['sovereign', 'degen'] });
    expect(applyAction(S, 0, { t: 'claim', i: 0 }).ok).toBe(true);
    S.p[0].hand.push('flash_loan');
    S.p[0].gas = 3;
    const pile = S.feedDeck.length;
    const hand = S.p[0].hand.length;
    const hp = S.p[0].hp;
    expect(applyAction(S, 0, { t: 'play', i: S.p[0].hand.indexOf('flash_loan') }).ok).toBe(true);
    expect(S.p[0].hand.length).toBe(hand - 1 + 2);
    expect(S.feedDeck.length).toBe(pile - 2);
    expect(S.p[0].hp).toBe(hp);
    expect(S.p[0].fatigue).toBe(0);
  });
  it('draws from face-up Feed cards once the pile is dry', () => {
    const S = createMatch({ seed: 11, mode: 'salvage', factions: ['sovereign', 'degen'] });
    S.feedDeck.length = 0;
    S.feed = ['gas_leak', 'rekt', 'pump', 'hopium', 'bailout'];
    expect(applyAction(S, 0, { t: 'claim', i: 0 }).ok).toBe(true);
    S.p[0].hand.push('flash_loan');
    S.p[0].gas = 3;
    const feed = S.feed.length;
    expect(applyAction(S, 0, { t: 'play', i: S.p[0].hand.indexOf('flash_loan') }).ok).toBe(true);
    expect(S.p[0].fatigue).toBe(0);
    expect(S.feed.length).toBe(feed - 2);
    expect(S.log.some(e => e.text.includes('scraped the bag'))).toBe(false);
  });
  it('lets hero heals exceed starting HP', () => {
    const S = createMatch({ seed: 1, mode: 'constructed', factions: ['consortium', 'degen'] });
    S.p[0].hp = 20;
    S.p[0].gas = 2;
    S.p[0].powerUsed = false;
    expect(applyAction(S, 0, { t: 'power' }).ok).toBe(true);
    expect(S.p[0].hp).toBe(22);
  });
  it('draws on deploy in salvage when the Feed pile has cards', () => {
    const S = createMatch({ seed: 7, mode: 'salvage', factions: ['consortium', 'sovereign'] });
    expect(applyAction(S, 0, { t: 'claim', i: 0 }).ok).toBe(true);
    S.p[0].hand.push('data_broker');
    S.p[0].gas = 3;
    const hp = S.p[0].hp;
    expect(applyAction(S, 0, { t: 'play', i: S.p[0].hand.indexOf('data_broker') }).ok).toBe(true);
    expect(S.p[0].fatigue).toBe(0);
    expect(S.p[0].hp).toBe(hp);
    expect(S.log.some(e => e.text.includes('scraped the bag'))).toBe(false);
    expect(S.log.some(e => e.text.includes('draw '))).toBe(true);
  });
});

describe('validation', () => {
  const cases: [string, Action | null][] = [
    ['unknown action', { t: 'nope' } as unknown as Action],
    ['card not in hand', { t: 'play', i: 99 }],
    ['illegal attack', { t: 'attack', attacker: 1, target: { p: 1, kind: 'hero' } }],
    ['malformed', null]
  ];
  it.each(cases)('rejects %s', (_label, action) => {
    const S = createMatch({ seed: 7, factions: ['sovereign', 'degen'] });
    expect(applyAction(S, 0, action).ok).toBe(false);
  });
  it('rejects an action from the seat that is not on turn', () => {
    const S = createMatch({ seed: 7, factions: ['sovereign', 'degen'] });
    expect(applyAction(S, 1, { t: 'end' }).ok).toBe(false);
  });
});

describe('balance', () => {
  it('keeps every faction inside a 15-point band', () => {
    const res: Record<string, number> = {};
    const N = 150;
    for (const a of F) for (const b of F) {
      let w = 0;
      for (let k = 0; k < N; k++) {
        const S = autoplay(((k + 1) * 2654435761) >>> 0, 'constructed', [a, b]);
        if (S.winner === 0) w++;
      }
      res[`${a}|${b}`] = 100 * w / N;
    }
    const overall = F.map(f => {
      const vs = F.filter(o => o !== f).map(o => (res[`${f}|${o}`]! + 100 - res[`${o}|${f}`]!) / 2);
      return vs.reduce((x, y) => x + y, 0) / vs.length;
    });
    expect(Math.max(...overall) - Math.min(...overall)).toBeLessThan(15);
  });
});

describe('kits', () => {
  it('validateKit accepts starter lists', () => {
    for (const f of F) {
      expect(validateKit(DECKS[f], f)).toBeNull();
    }
  });

  it('createMatch uses a custom kit when provided', () => {
    const valid = { ...DECKS.sovereign };
    const S = createMatch({ factions: ['sovereign', 'degen'], kits: [valid, undefined] });
    expect(S.p[0].deck.length + S.p[0].hand.length).toBe(25);
  });
});
