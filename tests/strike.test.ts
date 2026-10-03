import { describe, expect, it } from 'vitest';
import { strikeUids, type StrikeAsset, type StrikeLine } from '../src/web/strike.ts';

const node = (uid: number, attacksLeft: number): StrikeAsset => ({ uid, name: 'Node', attacksLeft });

const block = (n: number, who: 'you' | 'foe'): StrikeLine => ({
  n, kind: 'blk', text: `block 00${n} · ${who} · 3 gas`,
});

describe('strikeUids', () => {
  it('lunges each Node that spent an attack, not the first one three times', () => {
    const lines = [
      block(1, 'foe'),
      { n: 2, kind: 'hit', text: 'Node → you · 1' },
    ];
    const them = [node(10, 0), node(11, 1), node(12, 1)];
    const prev = new Map([[10, 1], [11, 1], [12, 1]]);
    expect([...strikeUids(lines, lines.slice(1), [], them, prev)]).toEqual([10]);

    const second = [...lines, { n: 3, kind: 'hit', text: 'Node → you · 1' }];
    const after = [node(10, 0), node(11, 0), node(12, 1)];
    const prev2 = new Map([[10, 0], [11, 1], [12, 1]]);
    expect([...strikeUids(second, second.slice(2), [], after, prev2)]).toEqual([11]);
  });

  it('spends a second swing on the same Sharded asset', () => {
    const lines = [
      block(1, 'you'),
      { n: 2, kind: 'hit', text: 'Node → them · 1' },
    ];
    const you = [node(4, 1)];
    const prev = new Map([[4, 2]]);
    expect([...strikeUids(lines, lines.slice(1), you, [], prev)]).toEqual([4]);
  });
});
