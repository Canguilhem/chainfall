# CHAINFALL — rules, card set, and design framework

A small two-player card game built on Hearthstone's structural decisions. **2058:** cheap quantum broke signatures, so banks, IDs, and the public chains failed the same week. **Chainfall** is that break, and the street after it. The people who already lived on scrap, cold keys, and neighbors are still here; leftover firms recage whoever they can. You pick a crew and fight for a way out: **The Consortium** (the last firm, seizure, attrition), **The Sovereigns** (neighbors, keys, going wide), **The Degens** (variance, self-harm, tempo).

Target game length is 8–10 turns each, around 15 minutes.

---

## 1. Rules

### Setup

Each player picks a crew and brings a **kit** of 25 cards, maximum 2 copies of any card (1 for Legendaries). A deck may use its own faction's cards plus neutrals; it may not use another faction's cards.

Each player has **20 HP**. The player going first draws 3 cards. The player going second draws 5 and gets an extra **Airdrop** card (0 Gas: gain 1 Gas this turn) — this is the catch-up for being on the draw.

### The turn (a "block")

1. Your **Gas** maximum increases by 1, to a cap of 8. Your Gas refills to that maximum.
2. Draw one card.
3. Play cards and attack in any order.
4. Seal the block.

Gas does not carry over. There is no resource card — everyone's curve is identical, which is the single most important thing being borrowed here.

### Cards

**Assets** are creatures. They have Attack and HP, occupy one of your **5 board slots**, and cannot attack the turn they are deployed unless they have Zero-Conf.

**Ops** are one-shot effects. They resolve immediately and go to the discard.

### Combat

On your turn, each of your Assets may attack once. Choose an enemy Asset or the other player. Both combatants deal their Attack to each other simultaneously. Anything at 0 HP or less is **liquidated**.

Damage on Assets **persists between turns**. A 4/5 that took 3 damage is a 4/2 until something heals it.

**There is no interaction on your opponent's turn.** No instants, no responses, no priority. Your turn is entirely yours. This is what keeps the rules short and the game fast.

### Hero powers

Once per turn, for 2 Gas:

| Faction | Power | Effect |
|---|---|---|
| The Consortium | PRINT | Restore 2 HP to you |
| The Sovereigns | FORK | Summon a 1/1 Node |
| The Degens | APE IN | Deal 2 damage to them and 1 to you |

### Keywords

| Keyword | Meaning | Hearthstone equivalent |
|---|---|---|
| **Firewall** | Enemies must attack this before anything else | Taunt |
| **Zero-Conf** | Can attack the turn it is deployed | Charge |
| **Cold Storage** | Ignores the first instance of damage, then breaks | Divine Shield |
| **Yield** | Damage this Asset deals also heals you | Lifesteal |
| **Sharded** | Attacks twice per turn | Windfury |
| **Overclock** | Your Ops deal +1 damage while this is on the board | Spell Damage |
| **On Deploy** | Triggers when played from hand | Battlecry |
| **On Liquidation** | Triggers when it dies | Deathrattle |
| **Seized** | Cannot attack; clears at the end of your next turn | Freeze |
| **Consensus** | Extra effect if you already played another card of this faction this block | Hero Realms' Ally |

Nine cards carry Consensus; see `chainfall-modes-and-pvp.md` for the list and for **Salvage Run**, the shared-Feed mode that needs no collection to play.

### Limits and edge cases

- Hand limit 8. Cards drawn past 8 are burned.
- Board limit 5. Summons that have nowhere to go fizzle.
- Empty kit: drawing from an empty deck deals **scraped the bag** damage to you, increasing by 1 each time (1, then 2, then 3…). This is Hearthstone's fatigue and it is what ends stalled games.
- Buffs are permanent unless the card says "this turn." Healing cannot exceed an Asset's maximum HP.
- Both players at 0 HP simultaneously is a draw.

---

## 2. The costing framework

This is the part that lets your community design cards without the set falling apart.

### The vanilla line

Every Asset is priced against a baseline of **Attack + HP = (2 × Gas) + 1**.

| Gas | Budget | Example split |
|---:|---:|---|
| 1 | 3 | 2/1 |
| 2 | 5 | 3/2, 2/3 |
| 3 | 7 | 3/4 |
| 4 | 9 | 4/5 |
| 5 | 11 | 5/6 |
| 6 | 13 | 7/6 |
| 7 | 15 | 8/7 |
| 8 | 17 | 8/9 |

A card printed exactly on the line with no text is a fair, boring card. **Text is paid for by going under the line.** Cypherpunk is a 3-Gas 2/3 — five stats where seven is standard — and the two missing stats buy Cold Storage.

The card tables in section 3 show each Asset's actual stats against its budget, so you can see what every effect in the set was priced at.

### Rough effect prices, in stats

These are what the current set implies. Use them as a starting point, not law.

| Effect | Stat cost |
|---|---|
| Firewall | 1–2 |
| Cold Storage | 2 |
| Zero-Conf | 2 |
| Yield | 2 |
| Sharded | 3 (scales badly with buffs — be careful) |
| Draw a card | 2 |
| Deal 1 damage on deploy | 1 |
| Summon a 1/1 | 2 |
| Seize an enemy Asset | 2 |
| Restore 3 HP to your Operator | 1 |

### Skew matters as much as total

The same budget behaves very differently depending on the split. High-Attack, low-HP Assets (Paper Hands, 4/1) trade once and die; they push damage and reward the aggressor. High-HP, low-Attack Assets (Private Security, 1/3 Firewall) buy turns. Give the aggressive faction top-heavy stats and the control faction bottom-heavy ones, and the factions will *feel* different before you write a word of card text.

### Ops are priced on removal efficiency

The benchmark: **3 Gas should kill roughly a 4-Gas Asset.** Hardware Failure destroys anything for 4 and that is deliberately at the edge. If you print unconditional removal cheaper than that, board-building stops being worth doing.

### The two knobs that actually control the format

**Life total against the curve.** At 20 HP, a card that deals 5 damage to your own Operator is spending a quarter of your resources. The same card in Hearthstone spends a sixth. Every self-damage, armor, and healing number has to be scaled to the smaller pool — this was the single biggest correction during balancing, and it is the thing most likely to break if you port cards in from a 30 HP game.

**Board size.** Five slots instead of seven means token swarms cap out fast and board clears are worth less. If you expand to seven, every "summon N" effect gets stronger and every AoE gets stronger too.

---

## 3. The card set (67 cards)

Stats are Attack/HP. "Budget" shows actual stat total against the vanilla line for that cost — under budget means the card is paying for its text.

### Neutral (24)

| Gas | Card | Type | Stats | Budget | Text |
|---:|---|---|---|---:|---|
| 1 | Bagholder | Asset | 1/2 | 3 / 3 | **Firewall.** |
| 1 | Gas Leak | Op | — | — | Deal 2 damage to an Asset. |
| 1 | Hopium | Op | — | — | Give an Asset +2/+1. |
| 1 | Seed Phrase Kid | Asset | 2/1 | 3 / 3 | — |
| 2 | Cold Wallet | Asset | 2/2 | 4 / 5 | **Cold Storage.** |
| 2 | Frontrunner | Asset | 2/1 | 3 / 5 | **Zero-Conf.** |
| 2 | Ledger Sweep | Op | — | — | Deal 3 damage to an Asset. |
| 2 | Node Runner | Asset | 3/2 | 5 / 5 | — |
| 2 | Paper Hands | Asset | 4/1 | 5 / 5 | — |
| 3 | Diamond Hands | Asset | 2/5 | 7 / 7 | **Firewall.** |
| 3 | Flash Loan | Op | — | — | Draw 2 cards. |
| 3 | Rug Pull | Op | — | — | Destroy an Asset with 4 or less Attack. |
| 3 | Scavenger Rig | Asset | 3/4 | 7 / 7 | — |
| 3 | Yield Miner | Asset | 2/3 | 5 / 7 | **Yield.** |
| 4 | Bot Swarm | Op | — | — | Summon three 1/1 Bots. |
| 4 | Exit Liquidity | Asset | 5/3 | 8 / 9 | On Liquidation: Deal 2 damage to the enemy Operator. |
| 4 | Hardware Failure | Op | — | — | Destroy an Asset. |
| 4 | Salvage Crew | Asset | 4/4 | 8 / 9 | On Deploy: Restore 3 HP to your Operator. |
| 4 | Sharded Rig | Asset | 3/3 | 6 / 9 | **Sharded.** |
| 5 | Bull Run | Op | — | — | Give your Assets +2/+2. |
| 5 | Cascade | Op | — | — | Deal 2 damage to all enemy Assets. |
| 5 | Sentry Rig | Asset | 4/6 | 10 / 11 | **Firewall.** |
| 6 | Whale | Asset | 7/6 | 13 / 13 | — |
| 7 | Junkyard Titan | Asset | 8/8 | 16 / 15 | — |

### Consortium (14)

| Gas | Card | Type | Stats | Budget | Text |
|---:|---|---|---|---:|---|
| 1 | KYC Checkpoint | Op | — | — | Seize an enemy Asset. Draw a card. |
| 2 | Private Security | Asset | 1/3 | 4 / 5 | **Firewall.** |
| 2 | Surveillance Drone | Asset | 2/2 | 4 / 5 | On Deploy: Deal 1 damage to an enemy Asset. |
| 3 | Compliance Officer | Asset | 2/3 | 5 / 7 | On Deploy: Seize an enemy Asset. |
| 3 | Data Broker | Asset | 2/3 | 5 / 7 | On Deploy: Draw a card. |
| 4 | Bailout | Op | — | — | Gain 5 Armor. |
| 4 | Custodian Vault | Asset | 3/5 | 8 / 9 | **Firewall.** |
| 4 | Debt Collector | Asset | 3/4 | 7 / 9 | On Deploy: Your opponent discards a random card. |
| 5 | Asset Freeze | Op | — | — | Seize all enemy Assets. |
| 5 | Board Member | Asset | 4/5 | 9 / 11 | On Deploy: Give another friendly Asset +2/+2. |
| 5 | Liquidation Order | Op | — | — | Destroy an Asset. Gain 2 Armor. |
| 5 | Riot Enforcer | Asset | 5/4 | 9 / 11 | **Firewall.** |
| 6 | Regulatory Capture | Op | — | — | Take control of an enemy Asset with 4 or less Attack. |
| 8 | The Chairman | Asset | 7/7 | 14 / 17 | On Deploy: Seize all enemy Assets. Gain 3 Armor. |

### Sovereign (14)

| Gas | Card | Type | Stats | Budget | Text |
|---:|---|---|---|---:|---|
| 1 | Full Node | Asset | 1/2 | 3 / 3 | On Liquidation: Summon a 1/1 Node. |
| 1 | Self Custody | Op | — | — | Give an Asset Cold Storage. |
| 2 | Airdrop | Op | — | — | Summon two 1/1 Nodes. |
| 2 | Mesh Relay | Asset | 1/3 | 4 / 5 | Your other Assets have +1 Attack. |
| 3 | Cypherpunk | Asset | 2/3 | 5 / 7 | **Cold Storage.** |
| 3 | Sovereign Miner | Asset | 2/4 | 6 / 7 | On Deploy: Gain 2 Gas this turn. |
| 3 | Torch Relay | Asset | 3/3 | 6 / 7 | On Liquidation: Give a random friendly Asset +2/+2. |
| 4 | Hard Fork | Op | — | — | Summon a copy of a friendly Asset. |
| 4 | Node Cluster | Asset | 2/2 | 4 / 9 | On Deploy: Summon two 1/1 Nodes. |
| 4 | Open Source | Op | — | — | Give your Assets +1/+1. Draw a card. |
| 4 | Peer Enforcer | Asset | 4/3 | 7 / 9 | **Zero-Conf.** |
| 5 | Decentralized Swarm | Op | — | — | Summon four 1/1 Nodes. |
| 6 | The Whitepaper | Op | — | — | Draw 3 cards. |
| 8 | Satoshi's Ghost | Asset | 6/6 | 12 / 17 | **Cold Storage.** On Liquidation: Summon a copy of this. |

### Degen (15)

| Gas | Card | Type | Stats | Budget | Text |
|---:|---|---|---|---:|---|
| 1 | Leverage | Op | — | — | Give an Asset +3 Attack this turn. |
| 1 | Moonboy | Asset | 3/1 | 4 / 3 | On Deploy: Deal 1 damage to your Operator. |
| 1 | Rekt | Op | — | — | Destroy a friendly Asset. Draw 2 cards. |
| 2 | Bagchaser | Asset | 3/2 | 5 / 5 | — |
| 2 | Meme Coin | Asset | 2/1 | 3 / 5 | On Liquidation: Draw a card. |
| 2 | Pump | Op | — | — | Give a random friendly Asset +3/+3. |
| 3 | 100x Long | Op | — | — | Double an Asset's Attack. |
| 3 | Degen Trader | Asset | 3/4 | 7 / 7 | On Deploy: Draw a card, then discard a random card. |
| 3 | Dump | Op | — | — | Destroy a random enemy Asset. |
| 3 | Send It | Op | — | — | Deal 4 damage to the enemy Operator and 2 to yours. |
| 3 | Signal Caller | Asset | 2/3 | 5 / 7 | **Overclock.** |
| 4 | Casino Rig | Asset | 4/4 | 8 / 9 | On Deploy: Deal 3 damage split randomly among enemies. |
| 5 | Liquidation Cascade | Op | — | — | Deal 3 damage to all Assets. |
| 5 | Ponzi Engine | Asset | 6/6 | 12 / 11 | On Liquidation: Deal 3 damage to your Operator. |
| 5 | The Influencer | Asset | 4/4 | 8 / 11 | On Deploy: Draw 2 cards. |

### Tokens

| Token | Stats | Source |
|---|---|---|
| Node | 1/1 | Fork, Airdrop, Node Cluster, Full Node, Decentralized Swarm |
| Bot | 1/1 | Bot Swarm |

---

## 4. Starter decks

These are the three preconstructed lists in the prototype. Each is 25 cards.

**consortium** (25 cards) — curve 1:3 2:6 3:4 4:5 5:5 6:1 8:1

1× Gas Leak · 2× KYC Checkpoint · 2× Private Security · 2× Surveillance Drone · 2× Ledger Sweep · 2× Compliance Officer · 2× Data Broker · 2× Custodian Vault · 1× Hardware Failure · 1× Bailout · 1× Debt Collector · 1× Asset Freeze · 1× Liquidation Order · 1× Riot Enforcer · 1× Board Member · 1× Sentry Rig · 1× Regulatory Capture · 1× The Chairman

**sovereign** (25 cards) — curve 1:7 2:4 3:5 4:6 5:1 6:1 8:1

2× Full Node · 2× Self Custody · 2× Seed Phrase Kid · 1× Bagholder · 2× Airdrop · 2× Mesh Relay · 2× Cypherpunk · 2× Sovereign Miner · 1× Torch Relay · 2× Node Cluster · 2× Peer Enforcer · 1× Open Source · 1× Hard Fork · 1× Decentralized Swarm · 1× The Whitepaper · 1× Satoshi's Ghost

**degen** (25 cards) — curve 1:6 2:8 3:5 4:4 5:2

1× Leverage · 2× Moonboy · 1× Seed Phrase Kid · 2× Gas Leak · 2× Pump · 2× Meme Coin · 2× Bagchaser · 2× Paper Hands · 1× Degen Trader · 1× Dump · 1× Signal Caller · 2× Send It · 2× Exit Liquidity · 2× Casino Rig · 1× Ponzi Engine · 1× The Influencer

---

## 5. Balance state

Measured with `npm run balance`, which runs the shipped engine directly — 3,600 AI-vs-AI games in about three seconds. Turn-order corrected, 400 games per matchup cell, 95% confidence:

| Matchup | Result | On the play | On the draw |
|---|---:|---:|---:|
| Consortium vs Sovereign | 61% ±2.5 | 66% | 55% |
| Consortium vs Degens | 48% ±2.5 | 62% | 34% |
| Sovereign vs Degens | 61% ±2.5 | 65% | 57% |

**Overall: Consortium 54%, Sovereign 51%, Degens 46%.** Mirrors, going first: 51% / 55% / 52%.

This is after three balance patches (see `chainfall-patch-notes.md`). The starting point was a 23-point spread with a 62% turn-order advantage in one mirror; both are now inside the range most card games ship with. Consortium vs Sovereign at 60/40 is the widest remaining matchup, which is normal — plenty of shipped TCGs carry 60/40 matchups without complaint, and tuning further against a heuristic bot has sharply diminishing returns.

**A caution about earlier figures.** An initial 540-game run reported 54/51/45 and that number was wrong. At 60 games per cell the error bar on a faction's overall rate is roughly ±6 points, so a 9-point spread was indistinguishable from noise; it took 500 games per cell to see the real 23-point gap. **Run enough games to have an error bar, and report it.** A balance number without one will send you tuning cards that were never the problem.

**A caution about the bot.** These numbers measure a heuristic AI. When archetype-aware aggression was added to the attack logic, the Degens gained 2 points without a single card changing — some of what looked like a weak faction was a bot that could not pilot aggro. Never buff a deck on bot data alone if a human would obviously play it differently.

## 6. Extending the set

All card data lives in one typed object in `src/engine/cards.ts`. Adding a card means adding an entry, and the types check it in place:

```js
cold_wallet:{n:'Cold Wallet', c:2, t:'asset', a:2, h:2, f:'neutral', kw:['coldstorage']},
gas_leak:{n:'Gas Leak', c:1, t:'op', f:'neutral',
          tx:'Deal 2 damage to an Asset.',
          fx:[{op:'damage', amt:2, tgt:'choose-asset'}]},
```

`fx` runs on deploy (or on play, for Ops); `dfx` runs on liquidation. The available operations are `damage`, `heal`, `armor`, `buff`, `buffTemp`, `doubleAtk`, `grantShield`, `seize`, `destroy`, `summon`, `draw`, `drawEnemy`, `gas`, `discardEnemy`, `discardSelf`, `copyFriendly`, `control`, and `splitDamage`. Targets are `choose-asset`, `choose-enemy-asset`, `choose-friendly-asset`, `choose-other-friendly-asset`, `choose-any`, `all-enemy-assets`, `all-friendly-assets`, `all-assets`, `random-enemy-asset`, `random-friendly-asset`, `random-enemy-asset-else-hero`, `self-hero`, and `enemy-hero`.

The engine handles targeting, board limits, death cascades and the bot automatically from that data. After adding cards, run `npm run balance` to see what moved. See `CONTRIBUTING.md`.

### What the prototype does not have yet

- **A deckbuilder.** Faction selection only; decks are fixed lists. This is the first thing to build if you want the community actually brewing.
- **Collection and trading.** There is no ownership model. If "TCG" means packs and trading for your community rather than a fixed pool everyone can use, that is a design decision worth making early — it changes how you balance rarity, and a fixed pool is much easier to keep fair.
- **Mulligan.** Opening hands are dealt as-is.

Multiplayer, reconnection and replays are built — see `architecture.md`.
