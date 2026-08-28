# Patch notes

## 1.1 — deck size, Degen rework, turn order

*Three balance patches, measured across 4,500 AI-vs-AI games each. Before: Consortium 61% / Sovereign 51% / Degens 38%, with one faction winning 62% of its mirror on the play. After: **54% / 51% / 46%**, mirrors at 51% / 55% / 52%.*

---

## Format changes

**Deck size 20 → 25.**

At 20 cards you saw 68% of your deck every game, so games played out nearly identically. Measured across 2,700 games per size:

| | 20 cards | 25 cards | 30 cards |
|---|---:|---:|---:|
| Game length | 17.2 blocks | 17.6 | 17.4 |
| Deck seen per game | 68% | **54%** | 47% |
| Fatigue decides | 14.1% | **6.7%** | 3.0% |

Game length is unaffected by deck size — damage is the clock, not chain exhaustion — so this was a free variable to tune purely for variety. 25 lands consistency near where a card game wants it while keeping fatigue as a real but uncommon finish. 30 is the right number once the card pool roughly doubles; at 67 cards a 30-card deck is too large a fraction of what's legal, and everyone converges on the same list.

**Player on the draw now takes five cards instead of four**, keeping Airdrop.

Going first was worth 62% in the Sovereign mirror and 58% in the Degen mirror — a board-race deck wants the play far more than one extra Gas compensates for. Five cards brings all three mirrors to 51–55%.

---

## The Degens

The faction sat at 38% and needed a design pass rather than a tuning pass. The root cause was diagnosed wrong once already: an earlier change made APE IN reliable board control, which quietly deleted the faction's only repeatable way to close a game.

**APE IN** — was: 2 damage to a random enemy Asset, or the Operator if there are none. Now: **deal 2 damage to the enemy Operator and 1 to your own.**
Reach restored, with a cost that fits the faction. It also creates a real matchup axis: the Consortium's PRINT heals through exactly this.

**Send It** — new card. 3 Gas Op: deal 4 damage to the enemy Operator and 2 to yours.
The deck had almost no way to close from turn 8 onward. Two copies in the starter list.

**Meme Coin** — 1/1 → **2/1**. On Liquidation: Draw a card, unchanged.

**Starter deck rebuilt** around the aggressive curve the faction wanted: Paper Hands and a second Gas Leak in, Liquidation Cascade out. A symmetric board clear is anti-synergy in a deck built on small bodies.

## The Sovereign

**Mesh Relay** — 2/2 → **1/3**. Aura unchanged.
A board-wide Attack aura at 2 Gas should not also arrive on a fair body.

**Bull Run removed from the starter deck.** It stays fully legal in the set. This was our own error, introduced while converting the deck to 25 cards: a board-wide +2/+2 across five Nodes is one of the strongest effects in the game, and it pushed the faction from 51% to 57% in a single patch.

## The Consortium

**Asset Freeze** — 4 Gas → **5 Gas**.
The cheapest full-board tempo denial in the game, and it arrived a turn before the boards it was denying.

No other Consortium nerfs. The faction fell from 61% to 54% almost entirely on the back of the Degen buffs — which is the outcome you want. Buffing the weak lifts the floor without shrinking what's playable; nerfing the strong does the reverse.

---

## Engine and AI fixes

**Overclock no longer amplifies damage you point at your own Operator.** It was making Signal Caller actively punish a Degen player for using their own hero power.

**The AI will no longer ape itself to death.** It now checks self-damage against its remaining HP before using a hero power, unless the swing is lethal.

**Archetype-aware aggression.** The AI used one face-versus-trade weight for every faction, which is the wrong way to pilot both a control deck and a burn deck. Each faction now carries its own weighting. This gained the Degens 2 points with no card changes — worth remembering that some of what looks like a weak faction is a bot that cannot pilot it.

---

## Known and not being changed

**Consortium vs Sovereign sits at 60/40.** This is the widest remaining matchup and it is being left alone. Plenty of shipped card games carry 60/40 matchups without anyone minding, and further tuning against a heuristic bot has sharply diminishing returns. This is the number to revisit once there is real play data, not before.

**Degens are still the weakest at 46%,** and are hardest to pilot automatically — Rekt and 100x Long need judgement the bot doesn't have and are deliberately excluded from its starter list. Their true rate against humans is likely closer to even.

---

## One industry norm not to copy

Commercial TCGs make each new set slightly stronger than the last. That is a monetisation mechanic: power creep drives sales of the newest packs, and it is why those games need rotation to survive.

You have no monetisation, so power creep buys you nothing and costs you everything — it invalidates the costing framework, obsoletes cards people already collected, and forces rotation onto a community that would rather keep playing with the cards they know. When new sets arrive, print them **on the same curve** as the existing set: new mechanics, sideways rather than upward. If a new card is strictly better than an existing one, that is a bug, not a release strategy.

---

## 1.2 — Consensus, Salvage Run, TypeScript

**Consensus** added (Hero Realms' Ally mechanic): if you already played another
card of this faction this block, the card does something extra. Nine cards carry
it. Constructed balance was unchanged at 54/50/46, with games running slightly
faster.

**Salvage Run** added: five cards face up in a shared Feed, claim one per block,
no chain and no collection required. Currently 55/50/45 with no tuning passes —
faction choice there is essentially a hero-power choice.

**Overclock** no longer amplifies damage you point at your own Operator.

**Engine ported to TypeScript** and extracted into a module shared by the client,
the server, the bot and the tests. Balance came through the port unchanged
(53/50/47 against the JS engine's 54/50/46, inside the confidence interval),
which was the check that mattered after rewriting 900 lines.
