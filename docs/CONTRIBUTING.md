# Contributing a card

The card set lives in one file, `src/engine/cards.ts`, and the types check your
work as you type it. You do not need to touch the engine, the server, or the
client to add a card.

## 1. Write it

```ts
cold_snap: { n: 'Cold Snap', c: 3, t: 'op', f: 'consortium',
  tx: 'Seize an enemy Asset. Draw a card.',
  fx: [{ op: 'seize', tgt: 'choose-enemy-asset' }, { op: 'draw', amt: 1 }] },
```

| Field | Meaning |
|---|---|
| `n` | Display name |
| `c` | Gas cost |
| `t` | `'asset'` (a body on the board) or `'op'` (one-shot) |
| `a` / `h` | Attack / HP — Assets only |
| `f` | `neutral`, `consortium`, `sovereign`, `degen` |
| `kw` | Keywords: `firewall`, `zeroconf`, `coldstorage`, `yield`, `sharded`, `overclock` |
| `tx` | Rules text for the card face. **Not parsed** — `fx` is the truth |
| `fx` | On Deploy (Assets) or the whole effect (Ops) |
| `dfx` | On Liquidation |
| `aura` | Static +N Attack to your *other* Assets |

Available ops: `damage`, `heal`, `armor`, `buff`, `buffTemp`, `doubleAtk`,
`grantShield`, `seize`, `destroy`, `control`, `copyFriendly`, `summon`, `draw`,
`gas`, `discardEnemy`, `discardSelf`, `splitDamage`.

Targets you pick: `choose-asset`, `choose-enemy-asset`, `choose-friendly-asset`,
`choose-other-friendly-asset`, `choose-any`.
Targets the engine resolves: `all-enemy-assets`, `all-friendly-assets`,
`all-assets`, `random-enemy-asset`, `random-friendly-asset`, `self-hero`,
`enemy-hero`.

`npm run typecheck` will reject a misspelled op, a hyphen typed as an underscore,
a missing `amt`, a target on a `draw`, a token that doesn't exist, or `amt` on a
`buff` — with a "did you mean" suggestion. If it compiles, the shape is right.

## 2. Price it

Assets are priced against a vanilla line of **Attack + HP = (2 × Gas) + 1**.

| Gas | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
|---|---|---|---|---|---|---|---|---|
| Budget | 3 | 5 | 7 | 9 | 11 | 13 | 15 | 17 |

A card printed exactly on the line with no text is fair and boring. **Text is
paid for by going under the line.** Cypherpunk is a 3-Gas 2/3 — five stats where
seven is standard — and the two missing stats buy Cold Storage.

Rough prices, in stats: Firewall 1–2 · Cold Storage 2 · Zero-Conf 2 · Yield 2 ·
Sharded 3 · draw a card 2 · 1 damage on deploy 1 · summon a 1/1 2 · seize an
enemy Asset 2.

For Ops, the benchmark is **3 Gas should kill roughly a 4-Gas Asset**. Print
unconditional removal cheaper than that and building a board stops being worth
doing.

Two things that bite:

- **Skew matters as much as the total.** A 4/1 trades once and dies; a 1/4 buys
  turns. The same budget makes a completely different card.
- **Health is 20, not 30.** Every self-damage, armor and healing number does
  about 1.5× the work your instincts from a 30 HP game expect. This was the
  single biggest correction during balancing.

## 3. Check it

```bash
npm run typecheck
npm test              # includes a balance-band assertion
npm run balance       # 3,600 games, ~3 seconds
```

Compare the faction spread before and after. Anything that moves a faction more
than ~3 points wants explaining in the PR.

If the card is a Consensus card, its effect **must be targetless** — random,
self, or board-wide. A Consensus trigger that needs its own target means a
second prompt mid-resolution, which is unpleasant in a client and worse over a
network.

## 4. Rarity

Rarity follows **design complexity, not power level**. A Common is not a weak
card; it's a simple one. Keeping power off the rarity axis is what stops the
collection from becoming pay-to-win-by-grinding.

| Tier | What goes here | Max copies |
|---|---|---|
| Common | Vanilla stats, one simple keyword | 2 |
| Rare | One triggered effect, single target | 2 |
| Epic | Board-wide swings, control effects | 2 |
| Legend | Unique, game-defining | 1 |

## House rules

- **Be most conservative with neutral cards.** A broken faction card touches a
  third of decks; a broken neutral touches all of them. New cards should be
  15–20% neutral at most.
- **Sideways, not upward.** A new card that is strictly better than an existing
  one is a bug, not a release strategy. There is no monetisation here, so power
  creep buys nothing and costs the whole costing framework.
- **Nerf numbers, don't restrict copies.** Restricting an overpowered card makes
  games swingier rather than fairer. We're digital; we can change a number.
