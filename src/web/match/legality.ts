import {
  BOARD, CARDS, FACTIONS,
  type CardId, type ChooseTarget, type Effect, type MatchView, type Seat, type TargetRef, type ViewAsset
} from '../../engine/index.ts';
import type { Hint, Pending } from './types.ts';

export const TARGET_COPY: Record<ChooseTarget, string> = {
  'choose-asset': 'any Asset to target',
  'choose-enemy-asset': 'an enemy Asset',
  'choose-friendly-asset': 'one of your Assets',
  'choose-other-friendly-asset': 'one of your other Assets',
  'choose-any': 'an Asset, or you or them',
};

/** Which target spec a card prompts for, read off the same Effect union the engine uses. */
export function specFor(id: string): { spec: ChooseTarget; maxAtk?: number; opt?: boolean } | null {
  const c = CARDS[id as CardId];
  const fx: Effect[] = ('fx' in c && c.fx) ? c.fx : [];
  for (const e of fx) {
    const tgt = 'tgt' in e ? e.tgt : undefined;
    if (typeof tgt === 'string' && tgt.startsWith('choose')) {
      return { spec: tgt as ChooseTarget, maxAtk: 'maxAtk' in e ? e.maxAtk : undefined, opt: 'opt' in e ? e.opt : undefined };
    }
  }
  return null;
}

export function isPlayable(v: MatchView, id: string): boolean {
  if (!v.yourTurn || v.over || v.awaitingClaim) return false;
  const c = CARDS[id as CardId];
  if (c.c > v.you.gas) return false;
  if (c.t === 'asset' && v.you.board.length >= BOARD) return false;
  return true;
}

export function deadWhy(v: MatchView, id: string): string | undefined {
  if (!v.yourTurn || v.over) return 'not your block';
  if (v.awaitingClaim) return 'claim from the feed first';
  const c = CARDS[id as CardId];
  if (c.c > v.you.gas) return `costs ${c.c} gas · you have ${v.you.gas}`;
  if (c.t === 'asset' && v.you.board.length >= BOARD) return 'board is full (5 assets)';
  return undefined;
}

export function powerWhy(v: MatchView, targeting: boolean): string | undefined {
  const cost = FACTIONS[v.you.faction].power.cost;
  if (!v.yourTurn || v.over) return 'not your block';
  if (v.awaitingClaim) return 'claim from the feed first';
  if (targeting) return 'finish targeting first';
  if (v.you.powerUsed) return 'already used this block';
  if (v.you.gas < cost) return `need ${cost} gas · you have ${v.you.gas}`;
  return undefined;
}

/** `touch` swaps the verb and drops the Esc hint — there is no Esc on a phone,
 *  which is why targeting also grows a Cancel button below. */
export function tableHint(v: MatchView | null, pending: Pending, sel: number | null, claiming: boolean, touch: boolean): Hint {
  const Tap = touch ? 'Tap' : 'Click';
  const tap = touch ? 'tap' : 'click';
  if (!v || v.over) return { phase: 'idle', text: 'Stand by.' };
  if (!v.yourTurn) return { phase: 'wait', text: 'They are taking this block.' };
  if (claiming) return {
    phase: 'claim',
    text: touch
      ? 'Pick one card from the Feed. It goes into your hand.'
      : 'Click one card in the Feed. It goes into your hand.',
    extra: touch
      ? 'The Feed is a shared market, not their board.'
      : 'The middle row is a shared market, not their board.',
  };
  if (pending) return {
    phase: 'target',
    text: `${Tap} ${TARGET_COPY[pending.spec]}.${touch ? '' : ' Esc cancels.'}`,
    extra: 'Outlined pieces are legal targets.',
  };
  if (sel !== null) {
    const walls = v.them.board.some(a => a.kw.includes('firewall'));
    return {
      phase: 'strike',
      text: walls
        ? `Firewall up — ${tap} the highlighted Asset. It must be hit first.`
        : `${Tap} a highlighted enemy Asset, or their HP box, to attack.`,
      extra: 'Amber ring means it can attack. Newly deployed Assets wait one block unless they have Zero-Conf.',
    };
  }
  const ready = v.you.board.some(a => a.canAttack);
  const playable = (v.you.hand ?? []).some(id => isPlayable(v, id));
  if (playable && ready) return {
    phase: 'act',
    text: `Play a lit card, ${tap} a ready Asset to attack, or seal the block.`,
    extra: 'Grey cards cost more gas than you have. Unspent gas is lost when you seal.',
  };
  if (playable) return {
    phase: 'play',
    text: touch
      ? 'Tap a card in your hand to read it, then Play.'
      : 'Click a lit card in your hand to play it.',
    extra: 'The gold circle is gas cost. Grey cards cost more than you have this block.',
  };
  if (ready) return {
    phase: 'attack',
    text: `${Tap} a ready Asset (amber ring), then ${tap} what it hits.`,
    extra: 'Assets cannot attack the block they are deployed unless they have Zero-Conf.',
  };
  return {
    phase: 'seal',
    text: 'Nothing left to play or attack. Seal the block to end your turn.',
    extra: 'SEAL passes the fight to them. Unspent gas does not carry over.',
  };
}

export function boardSlots(board: ViewAsset[] | undefined): (ViewAsset | null)[] {
  return Array.from({ length: BOARD }, (_, i) => board?.[i] ?? null);
}

export function legalTargets(v: MatchView, seat: Seat, spec: ChooseTarget, maxAtk?: number): TargetRef[] {
  const mine = v.you.board.map(a => ({ p: seat, kind: 'asset' as const, uid: a.uid, atk: a.atk }));
  const theirs = v.them.board.map(a => ({ p: (1 - seat) as Seat, kind: 'asset' as const, uid: a.uid, atk: a.atk }));
  let out: (TargetRef & { atk?: number })[] =
    spec === 'choose-asset' ? [...mine, ...theirs]
    : spec === 'choose-enemy-asset' ? theirs
    : spec === 'choose-friendly-asset' || spec === 'choose-other-friendly-asset' ? mine
    : [...mine, ...theirs, { p: seat, kind: 'hero' as const }, { p: (1 - seat) as Seat, kind: 'hero' as const }];
  if (maxAtk !== undefined) out = out.filter(r => r.atk === undefined || r.atk <= maxAtk);
  return out;
}

export function defenders(v: MatchView, seat: Seat): TargetRef[] {
  const walls = v.them.board.filter(a => a.kw.includes('firewall'));
  const refs: TargetRef[] = (walls.length ? walls : v.them.board)
    .map(a => ({ p: (1 - seat) as Seat, kind: 'asset' as const, uid: a.uid }));
  if (!walls.length) refs.push({ p: (1 - seat) as Seat, kind: 'hero' });
  return refs;
}

export function computeMarked(
  v: MatchView | null,
  seat: Seat,
  pending: Pending,
  sel: number | null,
): { assets: Set<number>; heroes: Set<number> } {
  const empty = { assets: new Set<number>(), heroes: new Set<number>() };
  if (!v) return empty;
  if (pending) {
    const refs = legalTargets(v, seat, pending.spec, pending.maxAtk);
    return {
      assets: new Set(refs.filter(r => r.kind === 'asset').map(r => r.uid!)),
      heroes: new Set(refs.filter(r => r.kind === 'hero').map(r => r.p))
    };
  }
  if (sel !== null && v.yourTurn && !v.awaitingClaim) {
    const defs = defenders(v, seat);
    return {
      assets: new Set(defs.filter(r => r.kind === 'asset').map(r => r.uid!)),
      heroes: new Set(defs.filter(r => r.kind === 'hero').map(r => r.p))
    };
  }
  return empty;
}
