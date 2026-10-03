/** Which board uid lunged. Same-name copies (three Nodes) are told apart by
 *  who actually spent an attack since the previous view, not by the first
 *  asset that happens to share the printed name. */

export type StrikeAsset = { uid: number; name: string; attacksLeft: number };
export type StrikeLine = { n: number; text: string; kind: string };

export function strikeUids(
  lines: StrikeLine[],
  fresh: StrikeLine[],
  you: StrikeAsset[],
  them: StrikeAsset[],
  prevAttacks: Map<number, number>,
): Set<number> {
  const budget = new Map<number, number>();
  for (const a of [...you, ...them]) {
    const before = prevAttacks.get(a.uid);
    if (before === undefined) continue;
    const spent = before - a.attacksLeft;
    if (spent > 0) budget.set(a.uid, spent);
  }

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
    const uid = take(actor === 'foe' ? them : you, name, budget)
      ?? take(actor === 'foe' ? you : them, name, budget);
    if (uid !== undefined) struck.add(uid);
  }
  return struck;
}

function take(board: StrikeAsset[], name: string, budget: Map<number, number>): number | undefined {
  const hit = board.find(a => a.name === name && (budget.get(a.uid) ?? 0) > 0);
  if (!hit) return;
  budget.set(hit.uid, budget.get(hit.uid)! - 1);
  return hit.uid;
}
