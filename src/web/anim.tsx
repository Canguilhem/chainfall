import { useEffect, useRef, useState, type CSSProperties, type ReactNode, type Ref } from 'react';
import { motion, useReducedMotion, type Transition } from 'motion/react';
import type { MatchView } from '../engine/index.ts';

export type FlashKind = '' | 'hit' | 'heal';

/** One-shot class when a numeric value moves — damage = hit, gain = heal. */
export function useValueFlash(n: number, ms = 420): FlashKind {
  const prev = useRef(n);
  const [flash, setFlash] = useState<FlashKind>('');
  useEffect(() => {
    const d = n - prev.current;
    prev.current = n;
    if (!d) return;
    setFlash(d < 0 ? 'hit' : 'heal');
    const t = window.setTimeout(() => setFlash(''), ms);
    return () => window.clearTimeout(t);
  }, [n, ms]);
  return flash;
}

/** True for `ms` after `flag` rises false → true (e.g. your turn starts). */
export function useRisingEdge(flag: boolean | undefined, ms = 720): boolean {
  const prev = useRef(false);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const now = !!flag;
    if (now && !prev.current) {
      setOn(true);
      const t = window.setTimeout(() => setOn(false), ms);
      prev.current = now;
      return () => window.clearTimeout(t);
    }
    prev.current = now;
  }, [flag, ms]);
  return on;
}

/** Uids of Assets that just struck — driven by fresh ledger hit lines. */
export function useStrikeFlash(
  lines: { n: number; text: string; kind: string }[],
  v: MatchView | null,
  ms = 340,
): Set<number> {
  const seen = useRef(0);
  const primed = useRef(false);
  const [uids, setUids] = useState(() => new Set<number>());
  useEffect(() => {
    if (!v) {
      seen.current = 0;
      primed.current = false;
      return;
    }
    // Skip the backlog on first paint / reconnect — only animate new strikes.
    if (!primed.current) {
      primed.current = true;
      if (lines.length) seen.current = lines[lines.length - 1]!.n + 1;
      return;
    }
    const fresh = lines.filter(e => e.n >= seen.current);
    if (!fresh.length) return;
    seen.current = fresh[fresh.length - 1]!.n + 1;

    const struck = new Set<number>();
    for (const h of fresh) {
      if (h.kind !== 'hit') continue;
      const m = h.text.match(/^(.+?) (?:→|×) /);
      if (!m) continue;
      const name = m[1]!;
      let actor: 'you' | 'foe' | null = null;
      for (const e of lines) {
        if (e.n > h.n) break;
        const blk = e.kind === 'blk' && e.text.match(/^block \d{3} · (you|foe) ·/);
        if (blk) actor = blk[1] as 'you' | 'foe';
      }
      const primary = actor === 'foe' ? v.them.board : v.you.board;
      const secondary = actor === 'foe' ? v.you.board : v.them.board;
      const hit = primary.find(a => a.name === name) ?? secondary.find(a => a.name === name);
      if (hit) struck.add(hit.uid);
    }
    if (!struck.size) return;
    setUids(struck);
    const t = window.setTimeout(() => setUids(new Set()), ms);
    return () => window.clearTimeout(t);
  }, [lines, v, ms]);
  return uids;
}

export type Keyed = { key: string; id: string };

let n = 0;
export const nextKey = () => 'k' + (++n);

export const SPRING: Transition = { type: 'spring', stiffness: 480, damping: 38, mass: 0.75 };

function pull(list: Keyed[], id: string): Keyed | undefined {
  const i = list.findIndex(x => x.id === id);
  if (i < 0) return;
  return list.splice(i, 1)[0];
}

export function assign(prev: Keyed[], nextIds: string[], extras: Keyed[] = []): Keyed[] {
  const src = prev.slice();
  const extra = extras.slice();
  return nextIds.map(id => pull(src, id) ?? pull(extra, id) ?? { key: nextKey(), id });
}

export function departed(prev: Keyed[], next: Keyed[]): Keyed[] {
  const keep = new Set(next.map(x => x.key));
  return prev.filter(x => !keep.has(x.key));
}

export function useFlyLists(v: MatchView | null, live: boolean) {
  const feed = useRef<Keyed[]>([]);
  const hand = useRef<Keyed[]>([]);
  const uidLayout = useRef(new Map<number, string>());
  const sig = useRef('');
  const snap = useRef({
    feed: [] as Keyed[],
    hand: [] as Keyed[],
    claimed: new Set<string>(),
    drawn: new Set<string>(),
    deployed: new Set<number>()
  });
  const empty = {
    feed: [] as Keyed[],
    hand: [] as Keyed[],
    claimed: new Set<string>(),
    drawn: new Set<string>(),
    deployed: new Set<number>(),
    fly: (uid: number) => uidLayout.current.get(uid) ?? ('a' + uid)
  };

  if (!live || !v) {
    if (sig.current !== '') {
      sig.current = '';
      feed.current = [];
      hand.current = [];
      uidLayout.current.clear();
      snap.current = { feed: [], hand: [], claimed: new Set(), drawn: new Set(), deployed: new Set() };
    }
    return empty;
  }

  const nextSig = [v.mode, v.feed.join(), (v.you.hand ?? []).join(),
    v.you.board.map(a => a.uid).join(), v.them.board.map(a => a.uid).join()].join('|');
  if (nextSig !== sig.current) {
    sig.current = nextSig;
    const nextFeed = assign(feed.current, v.mode === 'salvage' ? v.feed : []);
    const leftFeed = departed(feed.current, nextFeed);
    const nextHand = assign(hand.current, v.you.hand ?? [], leftFeed);
    const leftHand = departed(hand.current, nextHand);
    const claimed = new Set(nextHand.filter(h => leftFeed.some(f => f.key === h.key)).map(h => h.key));
    const prevHandKeys = new Set(hand.current.map(h => h.key));
    const drawn = new Set(
      nextHand.filter(h => !prevHandKeys.has(h.key) && !claimed.has(h.key)).map(h => h.key),
    );

    const liveUids = new Set([...v.you.board, ...v.them.board].map(a => a.uid));
    for (const uid of [...uidLayout.current.keys()]) if (!liveUids.has(uid)) uidLayout.current.delete(uid);

    const used = new Set<string>();
    const deployed = new Set<number>();
    for (const a of v.you.board) {
      if (!uidLayout.current.has(a.uid)) {
        const hit = leftHand.find(h => h.id === a.id && !used.has(h.key));
        if (hit) {
          used.add(hit.key);
          uidLayout.current.set(a.uid, hit.key);
        } else uidLayout.current.set(a.uid, 'a' + a.uid);
        deployed.add(a.uid);
      }
    }
    for (const a of v.them.board) {
      if (!uidLayout.current.has(a.uid)) {
        uidLayout.current.set(a.uid, 'a' + a.uid);
        deployed.add(a.uid);
      }
    }

    feed.current = nextFeed;
    hand.current = nextHand;
    snap.current = { feed: nextFeed, hand: nextHand, claimed, drawn, deployed };
  }

  return { ...snap.current, fly: (uid: number) => uidLayout.current.get(uid) ?? ('a' + uid) };
}

export function Fly({ id, shared, first, children, flyRef }: {
  id: string; shared?: boolean; first?: boolean; children: ReactNode; flyRef?: Ref<HTMLDivElement>;
}) {
  const quiet = !!useReducedMotion();
  const still = quiet || first;
  const style: CSSProperties = { flex: 'none', position: 'relative', zIndex: shared ? 8 : undefined };
  return (
    <motion.div
      ref={flyRef}
      layout={!quiet}
      layoutId={quiet ? undefined : id}
      initial={still || shared ? false : { y: 18, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={quiet ? undefined : { opacity: 0, scale: 0.82, y: 10, transition: { duration: 0.22 } }}
      transition={SPRING}
      style={style}
    >
      {children}
    </motion.div>
  );
}
