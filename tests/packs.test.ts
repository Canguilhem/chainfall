import { describe, it, expect } from 'vitest';
import {
  CARD_IDS, CARD_RARITY, PACK_IDS, PACK_SIZE, PITY_LEGEND, isToken,
  craftCard, maxOf, openPack, rarityOf, type PackState
} from '../src/engine/index.ts';

function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const zero = () => 0;
const fresh = (): PackState => ({ owned: {}, sinceEpic: 0, sinceLegend: 0, opened: 0, salvage: 0 });

describe('packs', () => {
  it('gives every collectable a rarity and leaves tokens out', () => {
    const tokens = CARD_IDS.filter(isToken);
    expect(tokens).toEqual(['node', 'bot', 'airdrop_coin']);
    expect(PACK_IDS).toHaveLength(CARD_IDS.length - tokens.length);
    for (const id of PACK_IDS) {
      expect(CARD_RARITY[id]).toBe(rarityOf(id));
      expect(['common', 'rare', 'epic', 'legend']).toContain(rarityOf(id));
    }
  });

  it('opens five cards with a rare-or-better floor', () => {
    const s = fresh();
    const { pulls } = openPack(s, zero);
    expect(pulls).toHaveLength(PACK_SIZE);
    expect(pulls.some(p => p.rar !== 'common')).toBe(true);
    expect(pulls[PACK_SIZE - 1]!.rar).not.toBe('common');
    expect(s.opened).toBe(1);
  });

  it('forces a legend within the pity window', () => {
    const s = fresh();
    s.sinceLegend = PITY_LEGEND - 1;
    const { pulls } = openPack(s, zero);
    expect(pulls.some(p => p.rar === 'legend')).toBe(true);
    expect(s.sinceLegend).toBe(0);
  });

  it('keeps extras when a playset-complete card drops again', () => {
    const s = fresh();
    for (const id of PACK_IDS) s.owned[id] = maxOf(id);
    const before = { ...s.owned };
    const { pulls, refund } = openPack(s, zero);
    expect(pulls.every(p => p.dupe)).toBe(true);
    expect(refund).toBe(0);
    expect(s.salvage).toBe(0);
    for (const p of pulls) {
      expect(s.owned[p.id]).toBe((before[p.id] ?? 0) + pulls.filter(x => x.id === p.id).length);
    }
  });

  it('lets craft exceed the playset soft cap', () => {
    const s = fresh();
    s.salvage = 10_000;
    const id = PACK_IDS[0]!;
    s.owned[id] = maxOf(id);
    expect(craftCard(s, id)).toBe(true);
    expect(s.owned[id]).toBe(maxOf(id) + 1);
  });

  it('is deterministic for a given rng', () => {
    const a = openPack(fresh(), rng(42)).pulls.map(p => p.id);
    const b = openPack(fresh(), rng(42)).pulls.map(p => p.id);
    expect(a).toEqual(b);
  });
});
