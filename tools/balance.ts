/* Balance harness. Runs the shipped engine directly: `npm run balance`. */
import { createMatch, applyAction, botAction, type Mode, type PlayableFaction } from '../src/engine/index.ts';

const F: PlayableFaction[] = ['consortium', 'sovereign', 'degen'];
const N = Number(process.argv[2] ?? 500);
const MODE = (process.argv[3] as Mode) ?? 'constructed';

const res: Record<string, number> = {};
const blocks: number[] = [];
for (const a of F) for (const b of F) {
  let w = 0;
  for (let k = 0; k < N; k++) {
    const S = createMatch({ seed: ((k + 1) * 2654435761) >>> 0, mode: MODE, factions: [a, b] });
    let g = 0;
    while (!S.over && g++ < 800) {
      const act = botAction(S, S.turn);
      if (!act || !applyAction(S, S.turn, act).ok) break;
    }
    blocks.push(S.block);
    if (S.winner === 0) w++;
  }
  res[`${a}|${b}`] = 100 * w / N;
}
const ci = 1.96 * Math.sqrt(0.25 / N) * 50;
console.log(`MODE ${MODE} · N = ${N} per cell, ${N * 9} games`);
console.log(`avg length ${(blocks.reduce((x, y) => x + y, 0) / blocks.length).toFixed(1)} blocks\n`);
const ov: Record<string, number[]> = Object.fromEntries(F.map(f => [f, []]));
for (let i = 0; i < 3; i++) for (let j = i + 1; j < 3; j++) {
  const A = F[i]!, B = F[j]!;
  const v = (res[`${A}|${B}`]! + 100 - res[`${B}|${A}`]!) / 2;
  ov[A]!.push(v); ov[B]!.push(100 - v);
  console.log(`  ${(A + ' vs ' + B).padEnd(26)}${v.toFixed(0)}% ±${ci.toFixed(1)}`);
}
console.log('\n  overall:');
for (const f of F) console.log(`   ${f.padEnd(14)}${(ov[f]!.reduce((x, y) => x + y, 0) / 2).toFixed(0)}%`);
