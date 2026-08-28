# CHAINFALL — Salvage Run mode, Consensus, and PvP

## 1. What to take from Hero Realms, and what not to

Hero Realms solves pacing a completely different way than CHAINFALL does. It has no mana curve: your economy *is* your deck, you buy Gold-generating cards, and you play your whole hand every turn. CHAINFALL has an auto-ramping Gas curve. Bolting a Hero Realms market straight on would give you two economies competing for the same job, and the result would be muddier than either game.

So three things are worth taking, and the rest isn't:

**The shared market — taken, as a separate mode.** This is the signature idea and it's excellent, but it isn't a mechanic you sprinkle into a constructed game. It's a different mode, which is exactly what you need: the collection completes in about 25 days, and Salvage Run is the thing that's still there afterwards.

**Ally abilities — taken, in both modes.** Renamed **Consensus**, which fits the theme almost too well.

**Buying into your discard pile, deck cycling, no hand carryover — left behind.** These only make sense in a game where your deck is the resource engine. CHAINFALL's Gas curve already does that job.

---

## 2. Consensus

> **Consensus** — if you already played another card of this faction this block, this card does something extra.

Hero Realms' Ally mechanic, and thematically it lands: a consensus mechanism is what a distributed ledger uses to agree, and here it means two of the same faction agreeing in the same turn. It rewards faction concentration without requiring any market, so it works in constructed *and* Salvage Run — which is why it was worth adding to the base game rather than only the new mode.

Nine cards carry it in the current set:

| Card | Faction | Consensus |
|---|---|---|
| Surveillance Drone | Consortium | Draw a card |
| Compliance Officer | Consortium | Gain 3 Armor |
| Riot Enforcer | Consortium | Gain 4 Armor |
| Cypherpunk | Sovereign | Summon a 1/1 Node |
| Torch Relay | Sovereign | Summon a 1/1 Node |
| Peer Enforcer | Sovereign | Give your Assets +1/+1 |
| Moonboy | Degens | 2 damage to the enemy Operator |
| Bagchaser | Degens | 2 damage to the enemy Operator |
| Casino Rig | Degens | 2 damage split randomly |

One design constraint worth keeping if you add more: **Consensus effects are always targetless** — random, self, or board-wide. A Consensus trigger that needed its own target would mean a second targeting prompt in the middle of playing a card, which is a mess in a client and worse over a network.

Constructed balance after adding it: **Consortium 54%, Sovereign 50%, Degens 46%** across 3,600 games — unchanged from before Consensus, with games running slightly faster.

---

## 3. Salvage Run

No chain, no collection, no deckbuilding. Five cards sit face up in a shared **Feed**, drawn from a pool containing two copies of every card in the set.

- At the start of your block you **claim one card from the Feed** into your hand. It refills immediately from the Feed deck.
- Everything else is unchanged: Gas ramps 1→8, five board slots, 20 HP, same combat, same keywords.
- Your faction still determines your hero power and your Consensus affinity, but not what you can play — anything in the Feed is fair game.
- Running the Feed deck dry causes chain exhaustion the same way an empty chain does.

Three things this buys you:

**No barrier to entry.** A brand-new player and someone with a complete collection sit down on identical terms. For a community game this is the mode you point newcomers at, and it's the mode that stays fair forever.

**Real interaction on the draw step.** The best card in the Feed is visible to both players, so claiming is partly "what do I want" and partly "what do I refuse to leave for them." Constructed CHAINFALL has no equivalent decision — this is the single most interesting thing the mode adds.

**It never goes stale.** The Feed is randomised every game, so there is no metagame to solve and no correct list to net-deck. This is your answer to the twenty-five-day collection problem.

Current balance across 3,600 games: **Consortium 57%, Sovereign 49%, Degens 44%.** In this mode the faction pick is almost entirely a hero-power pick, so that 13-point spread is a hero-power balance problem, not a card balance problem — PRINT's repeatable healing is strongest where nobody can build a consistent curve. This mode has had zero tuning passes and needs its own; do not assume the constructed numbers transfer.

---

## 4. PvP

### The one thing that must not be got wrong

**The client cannot hold the game state.** In the single-player prototype the entire state lives in the browser, which is fine against a bot. Ship that shape to two humans and anyone with devtools open can read their opponent's hand and the exact order of the Feed deck. For a hidden-information game that isn't a leak, it's the whole game.

So the server is authoritative, and each socket receives only `redactedView(seat)`:

- Your own hand as card ids; **your opponent's hand as a count**.
- Both decks as counts; the Feed deck order **not transmitted at all**.
- Board state, HP, armor, and Gas in full — those are public anyway.

Every action is re-validated server-side. A client that claims it's their turn when it isn't, or targets something the card can't legally target, is rejected rather than trusted.

**All randomness rolls on the server.** Casino Rig, Pump, Dump, the shuffle, the Feed order. If the client rolls, a determined player rerolls until they like the result.

### What's built

`src/server/index.ts` is a working authoritative match server: matchmaking queue, per-seat redacted state, server-side validation of play/attack/claim/power/end, a 75-second turn timer for players who walk away, and disconnect handling that awards the match.

`tests/server.test.ts` spins it up, connects two real clients, and asserts the properties that matter:

```
A knows its own hand      : 5 card ids
A knows B hand as         : 3 (count only)
B hand ids leaked to A    : none
feed deck order sent      : no
out-of-turn play rejected : true
B told on A disconnect    : true
```

### What still needs doing

See `ROADMAP.md`. The engine extraction and the client rewrite described here
are **done** — the engine is `src/engine/`, the client is a pure view, and both
import the same module. Reconnection and spectator redaction are built;
spectating still needs a page.

### Scale

Two players per match, a handful of concurrent matches, tiny JSON payloads. A single small VPS will carry a community of a few hundred without any of this needing to be clever. Don't build for scale you don't have — build for reconnection and spectating instead, because those are what people will actually ask for.
