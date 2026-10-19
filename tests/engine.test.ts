import { describe, it, expect } from 'vitest';
import {
  createMatch, applyAction, view, botAction, lessonAction, lessonPending, settleLesson,
  replay, DECKS, validateKit, LESSON_COURSES, LESSON_STEPS,
  type Action, type LessonCourse, type MatchState, type PlayableFaction, type Seat
} from '../src/engine/index.ts';
import { lessonCue } from '../src/web/lesson.ts';

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

function pawn(uid: number, atk = 2, hp = 2) {
  return {
    uid, id: 'node', name: 'Node', atk, hp, maxHp: hp, cost: 1, f: 'neutral' as const,
    kw: [], shield: false, sick: true, seized: false, attacksLeft: 0, tempAtk: 0, aura: 0,
  };
}

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

  it('buffs its own Asset when both boards have one', () => {
    const S = createMatch({ seed: 1, mode: 'constructed', factions: ['degen', 'degen'] });
    S.turn = 1;
    S.p[1].powerUsed = true;
    S.p[1].hand = ['hopium'];
    S.p[1].gas = 3;
    S.p[1].board = [pawn(2, 1, 1)];
    S.p[0].board = [pawn(9, 3, 3)];
    const a = botAction(S, 1);
    expect(a).toMatchObject({ t: 'play', target: { p: 1, uid: 2 } });
    expect(applyAction(S, 1, a!).ok).toBe(true);
    expect(S.p[1].board[0]!.atk).toBe(3);
    expect(S.p[0].board[0]!.atk).toBe(3);
  });

  it('destroys an enemy Asset rather than its own', () => {
    const S = createMatch({ seed: 1, mode: 'constructed', factions: ['consortium', 'consortium'] });
    S.turn = 1;
    S.p[1].powerUsed = true;
    S.p[1].hand = ['hardware_failure'];
    S.p[1].gas = 6;
    S.p[1].board = [pawn(2, 5, 5)];
    S.p[0].board = [pawn(9, 2, 2)];
    const a = botAction(S, 1);
    expect(a).toMatchObject({ t: 'play', target: { p: 0, uid: 9 } });
  });

  it('does not destroy its own Asset when the enemy board is empty', () => {
    const S = createMatch({ seed: 1, mode: 'constructed', factions: ['consortium', 'consortium'] });
    S.turn = 1;
    S.p[1].powerUsed = true;
    S.p[1].hand = ['hardware_failure'];
    S.p[1].gas = 6;
    S.p[1].board = [pawn(2)];
    S.p[0].board = [];
    expect(botAction(S, 1)).toEqual({ t: 'end' });
  });

  it('does not seize when the enemy has no Asset', () => {
    const S = createMatch({ seed: 1, mode: 'constructed', factions: ['consortium', 'consortium'] });
    S.turn = 1;
    S.p[1].powerUsed = true;
    S.p[1].hand = ['kyc_checkpoint'];
    S.p[1].gas = 4;
    S.p[0].board = [];
    expect(botAction(S, 1)).toEqual({ t: 'end' });
    expect(applyAction(S, 1, { t: 'play', i: 0 }).ok).toBe(true);
  });

  it('does not buff when it has no Asset', () => {
    const S = createMatch({ seed: 1, mode: 'constructed', factions: ['degen', 'degen'] });
    S.turn = 1;
    S.p[1].powerUsed = true;
    S.p[1].hand = ['pump'];
    S.p[1].gas = 4;
    S.p[1].board = [];
    S.p[0].board = [pawn(9)];
    expect(botAction(S, 1)).toEqual({ t: 'end' });
  });

  it('still sacrifices its own Asset when that is what the card does', () => {
    const S = createMatch({ seed: 1, mode: 'constructed', factions: ['degen', 'degen'] });
    S.turn = 1;
    S.p[1].powerUsed = true;
    S.p[1].hand = ['rekt'];
    S.p[1].gas = 4;
    S.p[1].board = [pawn(2, 1, 1)];
    S.p[0].board = [pawn(9, 4, 4)];
    const a = botAction(S, 1);
    expect(a).toMatchObject({ t: 'play', target: { p: 1, uid: 2 } });
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

  it('teaches one block, then a point of health', () => {
    const S = createMatch({ lesson: true, seed: 3 });
    const tape: { seat: Seat; action: Action }[] = [];
    const step = () => LESSON_STEPS[S.lessonCourse!][S.lessonStep!];
    const act = (seat: Seat, action: Action) => {
      const r = applyAction(S, seat, action);
      expect(r.ok, `${step()} ${JSON.stringify(action)} ${r.error ?? ''}`).toBe(true);
      tape.push({ seat, action });
      if (lessonPending(S)) settleLesson(S);
    };
    const foe = () => {
      let guard = 0;
      while (S.turn === 1 && guard++ < 8) {
        const a = lessonAction(S, 1);
        expect(a, step()).not.toBeNull();
        act(1, a!);
      }
    };

    expect(S.mode).toBe('salvage');
    expect(S.p[0].faction).toBe('sovereign');
    expect(step()).toBe('claim');
    expect(S.p[0].gas).toBe(1);
    expect(S.p[0].maxGas).toBe(1);
    expect(S.feed[0]).toBe('seed_phrase_kid');
    expect(applyAction(S, 0, { t: 'claim', i: 1 }).ok).toBe(false);
    expect(applyAction(S, 0, { t: 'end' }).ok).toBe(false);
    act(0, { t: 'claim', i: 0 });

    expect(step()).toBe('play');
    const kidAt = S.p[0].hand.indexOf('seed_phrase_kid');
    expect(applyAction(S, 0, { t: 'attack', attacker: 1, target: { p: 1, kind: 'hero' } }).ok).toBe(false);
    act(0, { t: 'play', i: kidAt });

    expect(step()).toBe('seal');
    const kid = S.p[0].board.find(a => a.id === 'seed_phrase_kid')!;
    expect(kid.attacksLeft).toBe(0);
    expect(applyAction(S, 0, { t: 'attack', attacker: kid.uid, target: { p: 1, kind: 'hero' } }).ok).toBe(false);
    act(0, { t: 'end' });

    expect(step()).toBe('hit');
    foe();
    expect(S.turn).toBe(0);
    expect(S.p[0].gas).toBe(2);
    expect(S.p[0].maxGas).toBe(2);
    expect(S.p[1].board).toHaveLength(0);
    expect(S.p[1].hp).toBe(20);
    const ready = S.p[0].board.find(a => a.id === 'seed_phrase_kid')!;
    expect(ready.attacksLeft).toBeGreaterThan(0);
    expect(applyAction(S, 0, { t: 'play', i: 0 }).ok).toBe(false);
    act(0, { t: 'claim', i: 0 });
    expect(applyAction(S, 0, { t: 'end' }).ok).toBe(false);
    act(0, { t: 'attack', attacker: ready.uid, target: { p: 1, kind: 'hero' } });

    expect(S.p[1].hp).toBe(18);
    expect(S.p[0].hp).toBe(20);
    expect(view(S, 0).lesson).toBe('done');
    expect(lessonCue(view(S, 0))?.cue).toBe('Done');
    expect(lessonCue(view(S, 0))?.hint).toContain('18');

    const again = replay({
      seed: 3, mode: 'salvage', factions: ['sovereign', 'degen'], lesson: true, actions: tape,
    });
    expect(view(again, 0).lesson).toBe('done');
    expect(again.p[1].hp).toBe(18);
    expect(again.p[1].board).toHaveLength(0);
    expect(again.p[0].board.some(a => a.id === 'seed_phrase_kid')).toBe(true);
  });

  it('teaches one term per sitting, and only the line that shows it', () => {
    const line = (S: MatchState): Action => {
      const course = S.lessonCourse!;
      const step = LESSON_STEPS[course][S.lessonStep!];
      const face = (id: string): Action => ({
        t: 'attack', attacker: S.p[0].board.find(a => a.id === id)!.uid, target: { p: 1, kind: 'hero' },
      });
      const strike = (yours: string, theirs: string): Action => ({
        t: 'attack',
        attacker: S.p[0].board.find(a => a.id === yours)!.uid,
        target: { p: 1, uid: S.p[1].board.find(a => a.id === theirs)!.uid, kind: 'asset' },
      });
      if (step === 'claim') return { t: 'claim', i: 0 };
      if (step === 'play' || step === 'first' || step === 'second') return { t: 'play', i: 0 };
      if (step === 'power') return { t: 'power' };
      if (course === 'liquidation') return strike('sovereign_miner', 'full_node');
      if (course === 'cold') return strike('sovereign_miner', 'cold_wallet');
      if (course === 'firewall') return strike('sovereign_miner', 'diamond_hands');
      if (course === 'yield') return face('yield_miner');
      if (course === 'sharded') return face('sharded_rig');
      return face('frontrunner');
    };
    const sit = (course: LessonCourse) => {
      const S = createMatch({ lesson: course, seed: 1 });
      let guard = 0;
      while (view(S, 0).lesson !== 'done' && guard++ < 6) {
        const r = applyAction(S, 0, line(S));
        expect(r.ok, `${course} ${r.error ?? ''}`).toBe(true);
        if (lessonPending(S)) settleLesson(S);
      }
      expect(view(S, 0).lesson, course).toBe('done');
      return S;
    };

    const cast = sit('op');
    expect(cast.p[0].board.some(a => a.id === 'seed_phrase_kid')).toBe(true);
    expect(cast.p[0].hand).not.toContain('airdrop_coin');
    expect(cast.p[0].gas).toBe(2);

    const deployed = sit('deploy');
    expect(deployed.p[0].board.some(a => a.id === 'sovereign_miner')).toBe(true);
    expect(deployed.p[0].gas).toBe(2);

    const popped = sit('liquidation');
    expect(popped.p[1].board.some(a => a.id === 'full_node')).toBe(false);
    expect(popped.p[1].board.some(a => a.id === 'node')).toBe(true);

    const iced = sit('freeze');
    expect(iced.p[1].board[0]!.seized).toBe(true);
    expect(iced.p[1].board[0]!.id).toBe('seed_phrase_kid');

    const zc = createMatch({ lesson: 'zeroconf', seed: 1 });
    expect(zc.p[0].gas).toBe(2);
    expect(applyAction(zc, 0, { t: 'claim', i: 1 }).ok).toBe(false);
    const swung = sit('zeroconf');
    expect(swung.p[1].hp).toBe(18);
    expect(swung.block).toBe(1);

    const cold = createMatch({ lesson: 'cold', seed: 1 });
    expect(cold.p[1].board[0]!.shield).toBe(true);
    const spent = sit('cold').p[1].board[0]!;
    expect(spent.shield).toBe(false);
    expect(spent.hp).toBe(spent.maxHp);

    const wall = createMatch({ lesson: 'firewall', seed: 1 });
    expect(applyAction(wall, 0, { t: 'attack', attacker: wall.p[0].board[0]!.uid, target: { p: 1, kind: 'hero' } }).ok).toBe(false);
    const afterWall = sit('firewall');
    expect(afterWall.p[1].hp).toBe(20);
    expect(afterWall.p[1].board[0]!.hp).toBeLessThan(afterWall.p[1].board[0]!.maxHp);

    expect(sit('yield').p[0].hp).toBe(22);

    const rig = createMatch({ lesson: 'sharded', seed: 1 });
    expect(rig.p[0].board[0]!.attacksLeft).toBe(2);
    const twice = sit('sharded');
    expect(twice.p[1].hp).toBe(14);
    expect(twice.p[0].board[0]!.attacksLeft).toBe(0);

    const clocked = sit('overclock');
    expect(clocked.p[1].hp).toBe(15);
    expect(clocked.p[0].hp).toBe(18);

    expect(sit('consensus').p[0].board.some(a => a.id === 'node')).toBe(true);
    const forked = sit('power');
    expect(forked.p[0].board.some(a => a.id === 'node')).toBe(true);
    expect(forked.p[0].powerUsed).toBe(true);
    expect(LESSON_COURSES.at(-1)).toBe('power');
  });

  it('createMatch uses a custom kit when provided', () => {
    const valid = { ...DECKS.sovereign };
    const S = createMatch({ factions: ['sovereign', 'degen'], kits: [valid, undefined] });
    expect(S.p[0].deck.length + S.p[0].hand.length).toBe(25);
  });
});
