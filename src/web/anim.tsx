import { useRef, type CSSProperties, type ReactNode } from 'react';
import { motion, useReducedMotion, type Transition } from 'motion/react';
import type { MatchView } from '../engine/index.ts';

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
          deployed.add(a.uid);
        } else uidLayout.current.set(a.uid, 'a' + a.uid);
      }
    }
    for (const a of v.them.board) {
      if (!uidLayout.current.has(a.uid)) uidLayout.current.set(a.uid, 'a' + a.uid);
    }

    feed.current = nextFeed;
    hand.current = nextHand;
    snap.current = { feed: nextFeed, hand: nextHand, claimed, drawn, deployed };
  }

  return { ...snap.current, fly: (uid: number) => uidLayout.current.get(uid) ?? ('a' + uid) };
}

export function Fly({ id, shared, first, children }: {
  id: string; shared?: boolean; first?: boolean; children: ReactNode;
}) {
  const quiet = !!useReducedMotion();
  const still = quiet || first;
  const style: CSSProperties = { flex: 'none', position: 'relative', zIndex: shared ? 8 : undefined };
  return (
    <motion.div
      layout={!quiet}
      layoutId={quiet ? undefined : id}
      initial={still || shared ? false : { y: 18, opacity: 0, scale: 0.92 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={quiet ? undefined : { opacity: 0, scale: 0.86, y: 8 }}
      transition={SPRING}
      style={style}
    >
      {children}
    </motion.div>
  );
}
