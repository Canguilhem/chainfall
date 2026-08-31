import type { Dispatch, SetStateAction } from 'react';
import { useCallback, useMemo } from 'react';
import {
  BOARD, CARDS, FACTIONS,
  type Action, type CardId, type MatchView, type Seat, type TargetRef, type ViewAsset
} from '../../engine/index.ts';
import {
  computeMarked, defenders, legalTargets, specFor, tableHint
} from '../match/legality.ts';
import type { Hint, Pending } from '../match/types.ts';

type Send = (action: Action) => void;
type Flash = (message: string) => void;

type Input = {
  pending: Pending;
  setPending: (p: Pending) => void;
  sel: number | null;
  setSel: (uid: number | null) => void;
  setPeek: Dispatch<SetStateAction<number | null>>;
  resetTargeting: () => void;
};

type Options = {
  v: MatchView | null;
  input: Input;
  send: Send;
  flash: Flash;
  coarse: boolean;
};

export function useMatchActions({ v, input, send, flash, coarse }: Options) {
  const { pending, setPending, sel, setSel, setPeek, resetTargeting } = input;

  const seat: Seat = v?.seat ?? 0;
  const awaitingClaim = !!v?.awaitingClaim;

  const atkDefenders = useMemo(() => v ? defenders(v, seat) : [], [v, seat]);
  const marked = useMemo(
    () => computeMarked(v, seat, pending, sel),
    [v, seat, pending, sel],
  );

  const targetsFor = useCallback(
    (spec: Parameters<typeof legalTargets>[2], maxAtk?: number) =>
      v ? legalTargets(v, seat, spec, maxAtk) : [],
    [v, seat],
  );

  const playCard = useCallback((id: string, i: number) => {
    if (!v || !v.yourTurn || v.over) return;
    if (v.awaitingClaim) return flash('claim from the feed first');
    const c = CARDS[id as CardId];
    if (c.c > v.you.gas || (c.t === 'asset' && v.you.board.length >= BOARD)) return;
    resetTargeting();
    setPeek(null);
    const s = specFor(id);
    if (s) {
      const refs = targetsFor(s.spec, s.maxAtk);
      if (refs.length) return setPending({ i, spec: s.spec, maxAtk: s.maxAtk });
      if (!s.opt && c.t === 'op') return flash('no legal target');
    }
    send({ t: 'play', i });
  }, [v, flash, resetTargeting, setPeek, targetsFor, setPending, send]);

  const onCard = useCallback((id: string, i: number) => {
    if (coarse) { setPeek(p => (p === i ? null : i)); return; }
    playCard(id, i);
  }, [coarse, setPeek, playCard]);

  const cancelTarget = useCallback(() => resetTargeting(), [resetTargeting]);

  const resolvePending = useCallback((ref: TargetRef) => {
    if (!pending) return;
    const ok = targetsFor(pending.spec, pending.maxAtk)
      .some(r => r.kind === ref.kind && r.p === ref.p && (r.kind === 'hero' || r.uid === ref.uid));
    if (ok) send({ t: 'play', i: pending.i, target: ref });
    setPending(null);
  }, [pending, targetsFor, send, setPending]);

  const onAsset = useCallback((a: ViewAsset, mine: boolean) => {
    if (!v || v.over) return;
    if (pending) return resolvePending({ p: (mine ? seat : 1 - seat) as Seat, kind: 'asset', uid: a.uid });
    if (!v.yourTurn) return;
    if (mine) return setSel(sel === a.uid ? null : (a.canAttack ? a.uid : null));
    if (sel === null) return;
    if (!atkDefenders.some(r => r.kind === 'asset' && r.uid === a.uid)) return flash('firewall blocks that line');
    send({ t: 'attack', attacker: sel, target: { p: (1 - seat) as Seat, kind: 'asset', uid: a.uid } });
    setSel(null);
  }, [v, pending, resolvePending, seat, setSel, sel, atkDefenders, flash, send]);

  const onPlayerTarget = useCallback((mine: boolean) => {
    if (!v || v.over) return;
    if (pending) return resolvePending({ p: (mine ? seat : 1 - seat) as Seat, kind: 'hero' });
    if (!v.yourTurn || mine || sel === null) return;
    if (!atkDefenders.some(r => r.kind === 'hero')) return flash('firewall blocks that line');
    send({ t: 'attack', attacker: sel, target: { p: (1 - seat) as Seat, kind: 'hero' } });
    setSel(null);
  }, [v, pending, resolvePending, seat, sel, atkDefenders, flash, send, setSel]);

  const onEnd = useCallback(() => {
    resetTargeting();
    send({ t: 'end' });
  }, [resetTargeting, send]);

  const claiming = !!v && v.mode === 'salvage' && awaitingClaim && v.yourTurn && !v.over;
  const hint: Hint = tableHint(v, pending, sel, claiming, coarse);
  const aiming = !!pending || sel !== null;

  const phase = !v ? 'standby'
    : v.over ? 'fight over'
    : !v.yourTurn ? 'their block'
    : awaitingClaim ? 'claim from the feed' : 'your block';

  const canPower = !!v && v.yourTurn && !v.over && !awaitingClaim && !pending
    && !v.you.powerUsed && v.you.gas >= FACTIONS[v.you.faction].power.cost;
  const canEnd = !!v && v.yourTurn && !v.over && !awaitingClaim;
  const endWhy = !v || !v.yourTurn || v.over ? 'not your block'
    : awaitingClaim ? 'claim from the feed first' : undefined;

  return {
    seat,
    marked,
    playCard,
    onCard,
    cancelTarget,
    onAsset,
    onPlayerTarget,
    onEnd,
    claiming,
    hint,
    aiming,
    phase,
    canPower,
    canEnd,
    endWhy,
    awaitingClaim,
  };
}
