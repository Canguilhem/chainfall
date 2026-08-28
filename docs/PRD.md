# CHAINFALL — Product Requirements

**Status:** draft · v0.2 · engine and match server built, economy and social layers not started
**Owner:** _TBD_

---

## 1. What this is

A small trading card game for a specific online community. Two players, twenty
minutes, sixty-seven cards, three crews, set in 2058 after cheap quantum broke
the keys. Banks, IDs, and the public chains failed the same week. The people who
already lived on scrap, cold storage, and mesh neighbors still fight for a way
out.

It borrows its structure from Hearthstone — an auto-ramping resource curve, no
interaction on the opponent's turn, persistent damage — because those choices
make a card game legible to a newcomer in about four minutes. It borrows a
shared-market mode from Hero Realms for the same reason.

## 2. Why

The community already exists and already talks to itself. It does not need
another game to play; it needs **a thing to have opinions about together**.

That reframes the goal. The product is not really the match — it's the shared
context around the match: the decks people brew, the cards people argue about,
the patch notes, the weekly restriction, the card someone in the community
designed that got printed. The match is the substrate those things grow on.

This has a concrete implication that shapes most decisions below: **retention
comes from the social layer, not the grind.** Anything that makes the game feel
like a job is working against the actual goal.

## 3. Who it's for

| | |
|---|---|
| **Primary** | Existing community members. Know each other, play in bursts, will talk about it in the same channels they already use. Mixed familiarity with card games. |
| **Secondary** | Friends they drag in. First card game for some. Must be able to sit down with zero context and play a full match. |
| **Explicit non-audience** | Competitive TCG players seeking a ladder. Not designed for them, and chasing them would distort the balance work. |

## 4. Success

Deliberately modest and observable. These are proposals — set real numbers before launch.

| Signal | Target | Why this one |
|---|---|---|
| Median session length | 2+ matches | One match is a trial; two is a habit forming |
| Week-4 return rate | 30%+ of week-1 players | Survives the collection completing |
| Matches per active player per week | 5+ | Enough for a metagame to exist |
| Community-designed cards printed | 1+ per month | The retention mechanism actually running |
| Share of matches in Salvage Run | 25%+ | Newcomers have a viable door |

**The anti-metric:** if daily-active climbs while matches-per-session falls, the
game has become a chore checklist. That's a failure regardless of the headline
number.

## 5. Scope

### v1 — must ship

- Constructed mode, three factions, 25-card chains, the tuned 67-card set
- Salvage Run mode (shared Feed, no collection required)
- Solo play against the bot
- Server-authoritative PvP with matchmaking, reconnection, turn timers
- Collection, packs, salvage/craft
- Card-for-card trading with a public trade ledger
- Deckbuilder
- Match replays

### v1 — explicitly out

- Ranked ladder or MMR. Wrong shape for a community that knows each other; it
  turns friends into opponents and invites the competitive audience we're not
  building for.
- Mobile apps. The web client is responsive; native is a distribution problem
  we don't have.
- Real-money anything. There is no monetisation and there will not be one.
- Rotation. With 67 cards there is nothing to rotate away from.
- Tournaments. Add when the community asks, not before.

### Later

Spectating (redaction already supports it), cosmetics as a long-term currency
sink, community card submission and voting, seasonal restrictions.

## 6. Product decisions already made

These came out of design and balance work and are recorded so they don't get
re-litigated by accident. Each has a "revisit if" so they aren't permanent.

**All three starter decks are free and permanent from first login.**
The set is balanced assuming both players have the full pool. Once cards are
scarce, a newcomer loses for reasons unrelated to skill — and in a community
where people know each other, being out-collected stings more than it does
among strangers. Collection means *more options*, never *permission to compete*.
*Revisit if:* never. This one is load-bearing.

**Collection is an onboarding arc, not a treadmill.**
Simulated: median 23 packs to 80% and 47 to complete, roughly 12 and 25 days at
eight matches a day. Hearthstone never finishes because it has ~1500 cards; we
have 67. Design for the arc ending, and put the long-term currency sink in
cosmetics, which can absorb infinite scrip without touching balance.
*Revisit if:* the set roughly doubles.

**Card-for-card trading only. No currency in trades, ever.**
The token being valueless does not make the system abuse-proof, because the
token was never the valuable thing — the cards are. If currency can move between
accounts, alts become faucets. If only cards move, each transfer costs the alt a
card and the return on farming collapses. Plus: 10-match gate before trading
unlocks, trades restricted to copies above your playset, 24h re-trade cooldown,
and every trade public on a ledger page.
*Revisit if:* the ledger shows farming anyway, in which case tighten rather than loosen.

**No power creep in new sets.**
Commercial TCGs make each set slightly stronger because it sells packs. We have
no monetisation, so it buys nothing and costs the costing framework, obsoletes
cards people already collected, and forces rotation on a community that would
rather keep playing. New sets print *sideways*: new mechanics, same curve. A
card strictly better than an existing one is a bug.
*Revisit if:* never.

**Nerf cards; don't restrict copies.**
Restricting an overpowered card to one copy makes games swingier, not fairer —
the game where it was drawn looks nothing like the game where it wasn't. Magic
maintains a restricted list because it cannot errata printed cardboard; we can
change a number and ship it in an hour. Copy limits are reserved for cards that
are fine at one and oppressive at two, and the 1-copy Legendary limit is an
*economy* device, not a balance one.
*Revisit if:* a card is genuinely fine at one copy and broken at two.

**Be most conservative with neutral cards.**
A broken faction card touches a third of decks; a broken neutral touches all of
them. Currently 24 neutral / 43 faction. New sets should be 15–20% neutral.

**The server is authoritative and the client holds nothing.**
Each seat receives only its own view: opponent's hand as a count, deck order
never transmitted. All randomness rolls server-side. This is not hardening for
later — for a hidden-information game it's the product.

## 7. Balance targets

Measured continuously by `npm run balance` (3,600 AI-vs-AI games, ~3s).

| | Current | Target |
|---|---|---|
| Faction spread, constructed | 54 / 50 / 46 | inside 10 points |
| Faction spread, Salvage Run | 55 / 50 / 45 | inside 10 points |
| Widest single matchup | 61 / 39 | under 60 / 40 |
| Going-first advantage (mirrors) | 50–56% | under 58% |
| Median match length | ~16 blocks (8 turns each) | 12–20 blocks |

Two standing rules learned the hard way:

**Report an error bar or don't report the number.** An early 540-game run gave
54/51/45 and the real answer was 61/51/38 — a 23-point gap read as a 9-point one
because 60 games per cell has a ±6 point error bar. Under-sampling sends you
tuning cards that were never the problem.

**Don't buff on bot data alone.** Adding archetype-aware aggression to the bot
moved the Degens 2 points with zero card changes. Some of what looks like a weak
faction is a bot that can't pilot it.

## 8. Risks

| Risk | Mitigation |
|---|---|
| **Community doesn't reach critical mass for PvP.** Empty queue is fatal. | Solo mode ships alongside. Seed with scheduled play sessions rather than hoping. |
| **Collection completes and people leave.** | Salvage Run, weekly restrictions, and community card design are the answers — all cheap, all currently unbuilt. Do not launch without at least one. |
| **Trading farming.** | Card-for-card only, match gate, public ledger. Social visibility is the real enforcement in a group this size. |
| **Balance work stalls after launch.** | The harness runs in seconds against the shipped engine. Cheap enough to run on every PR. |
| **Cheating accusations.** | Every match is `(seed, actions)` and replayable. Disputes get re-run, not argued. |
| **Scope creep into a ladder.** | It's in the out-of-scope list above for a reason. |

## 9. Open decisions

Genuinely open, and yours to make:

1. **Community size and platform.** Everything from queue design to trade
   volume depends on it. Thirty people and three hundred are different products.
2. **Identity.** Currently `playerId` is whatever the client claims. Discord
   OAuth is the obvious fit if that's where the community lives, and it makes
   the trade ledger meaningful. Must land before trading ships.
3. **Whether trading ships at all in v1.** It is the highest-complexity,
   highest-abuse-surface feature in the list, and a fixed pool everyone can use
   is much easier to keep fair. Worth asking whether the community actually
   wants to trade or just wants to play.
4. **Set cadence.** Monthly community cards, quarterly designed sets, or nothing
   until people ask. Affects whether deck size should move to 30.
5. **Hosting and who operates it.** A community game with one admin is one
   holiday away from being down.
6. **Moderation.** No chat is planned, which removes most of the problem — but
   trade disputes and the ledger still need someone to own them.

## 10. Milestones

| | Scope | State |
|---|---|---|
| **M0 — engine** | Rules, bot, determinism, replay, balance harness | ✅ done |
| **M1 — match** | Server-authoritative PvP, reconnect, timers, both modes | ✅ done |
| **M2 — accounts** | Identity, persistence, rate limiting | not started |
| **M3 — collection** | Packs, salvage/craft, deckbuilder | vault prototyped only |
| **M4 — social** | Trade ledger, deck sharing, spectating | not started |
| **M5 — launch** | Hosting, onboarding, seeded play sessions | not started |

M2 is the gate. Nothing in M3 or M4 is safe to build on a `playerId` the client
makes up.
