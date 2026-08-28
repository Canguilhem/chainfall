# CHAINFALL — collection, packs, and trading

Design notes for the economy layer. Companion to `chainfall-rules.md`.

Two currencies, neither worth anything outside the game:

- **SCRIP** — earned by playing. Buys sealed blocks. (Company scrip: money only the Consortium honours.)
- **SALVAGE** — recovered from duplicates. Crafts a specific card you're missing.

---

## 1. The decision to make first

**Give every player all three starter decks, free and permanent, from their first login.**

This is the single most important call in the whole economy, and it is easy to get wrong by default. The 66-card set in `chainfall-rules.md` was balanced on the assumption that both players have access to everything. The moment cards become scarce, a new player's deck is worse than a veteran's for reasons that have nothing to do with skill or deckbuilding — and in a community where people know each other, getting stomped by someone who simply owns more cards gets old faster than it does among strangers.

Unlocking the starter decks permanently fixes this cleanly. Collection then means *more options*, not *the ability to compete*. Every game is fair from day one, and packs stay motivating because the thing they buy is expression rather than power. It also means you can keep balancing against the full pool, which is the only way the numbers in the rules doc stay meaningful.

## 2. The thing that will surprise you: the economy solves itself in about a month

Full collection is 128 copies (2 of everything, 1 of each Legendary). Simulating 400 collectors through the pack model below:

| Milestone | Median | p10 | p90 |
|---|---:|---:|---:|
| 80% collection | 23 blocks | 21 | 26 |
| 100% collection | 47 blocks | 39 | 55 |

At roughly 8 matches a day that's **12 days to 80% and 25 days to complete**. Hearthstone never finishes because it has ~1500 cards and adds more every few months. Yours has 66.

Which means scarcity is not a long-term engine here, and you shouldn't design as if it is. Three ways to respond:

**Treat collection as an onboarding arc, not a treadmill.** Three or four weeks of unlocking, then everyone has the full pool and the game becomes purely about deckbuilding and play. For a community game this is genuinely the healthiest option — your veterans and your newcomers converge instead of diverging, and the long-term retention comes from the metagame rather than from the grind.

**Release sets.** A new "block" of 20–30 cards every month or two restarts the arc. This keeps scarcity alive permanently but it's a standing design and balance commitment, and it's how you end up with power creep if you're not careful.

**Put the long-term sink in cosmetics.** Foil variants, alternate card art, Operator portraits, card backs. Once someone completes their collection, SCRIP needs somewhere to go, and cosmetics are the only sink that can absorb it forever without ever touching balance.

Recommendation: build for the first, add the third once people start completing collections, and only do the second if the community is still hungry after that.

## 3. Rarity

Rarity follows **design complexity, not power level**. This is worth stating explicitly because it's the rule your community will need when they submit cards.

| Tier | Count | What goes here | Max copies | Salvage | Craft |
|---|---:|---|---:|---:|---:|
| Common | 30 | Vanilla stats, one simple keyword | 2 | 5 | 40 |
| Rare | 21 | One triggered effect, a single target | 2 | 20 | 100 |
| Epic | 11 | Board-wide swings, control effects | 2 | 100 | 400 |
| Legend | 4 | Unique, game-defining, one per faction plus one neutral | 1 | 400 | 1600 |

A Common is not a weak card — Paper Hands and Diamond Hands are both perfectly good. It's a *simple* card. Keeping power off the rarity axis is what stops the collection from becoming pay-to-win-by-grinding, and it means a new player's Common-heavy deck is a real deck.

The four Legendaries are The Chairman, Satoshi's Ghost, The Influencer, and Junkyard Titan.

## 4. Sealed blocks

**100 SCRIP. Five cards. At least one Rare or better.**

| Tier | Per-slot rate |
|---|---:|
| Common | 65% |
| Rare | 25% |
| Epic | 7% |
| Legend | 3% |

Three protections, all of which matter much more in a 66-card set than they would in a large one:

- **Duplicate protection.** A card you already own the maximum of never drops again until your collection is complete. Without this, the last few cards take absurdly long — this is the single biggest quality-of-life feature in the model, and Hearthstone added it years too late.
- **Pity floors.** Guaranteed Epic-or-better within 8 blocks, Legendary within 25.
- **Floors are minimums, not fixed values.** A guaranteed Rare slot can still roll Epic or Legend. Implementing this as "force exactly Rare" quietly removes upside from every fifth card and makes packs feel flatter than the odds suggest.

### Earning

| Source | SCRIP |
|---|---:|
| Match win | 25 |
| Match loss | 10 |
| First win of the day | 50 |
| Daily objective | 50–75 |

**Losses pay.** In a small community people play each other repeatedly and someone is always on the wrong end of it; a loss that pays nothing turns a bad session into a reason to stop. Roughly 190 SCRIP a day at eight matches, or about 1.9 blocks.

## 5. Trading

Here's the trap: **the token being worthless doesn't make the system abuse-proof, because the token was never the valuable thing. The cards are.** Alt accounts farming daily bonuses and funnelling cards to a main is worth doing the moment trading exists, regardless of what your currency is called.

Four rules that make it not worth the effort:

**Card-for-card only. No SCRIP or SALVAGE in trades, ever.** This is the load-bearing one. If currency can move between accounts, alts become SCRIP faucets and you have a real economy to police. If only cards move, an alt has to actually open blocks and each transfer costs it a card — the return on farming collapses to roughly nothing.

**You can only trade copies above your playset.** Own two Cold Wallets, trade none; own three, trade one. Nobody can gut their own collection in a moment of bad judgement, and it removes the "new player traded away their whole deck" incident that every trading game eventually has.

**Trading unlocks after 10 completed matches.** Cheap to implement, and it makes throwaway alts cost real time rather than a signup form.

**Every trade is public on a ledger page.** This is on-theme to the point of being funny — it's a blockchain game, of course the trades are a public append-only log — and in a community of people who know each other it is by far your strongest enforcement mechanism. Farming that everyone can see mostly doesn't happen. Add a 24-hour cooldown before a received card can be re-traded, so the ledger can't be laundered through chains of accounts.

What this deliberately gives up is price discovery. There's no market, no exchange rate, no "this Legend is worth three Epics." For a community game that's a feature: markets are where the fun turns into a second job, and where a valueless token starts acquiring a value you didn't authorise.

## 6. Where the fun actually is

Packs are a slot machine, and slot machines are compelling for about two weeks. The things that keep a community game alive are social, and they're cheap to build compared to everything else:

- **A public deck list page.** People copying and countering each other's brews is the real metagame, and in a group that knows each other it's most of the entertainment.
- **A weekly rotating restriction.** No Legendaries, or one faction only, or 10-card decks. Costs almost nothing, resets the metagame every week, and gives people who've finished their collection a reason to keep brewing.
- **Community card design.** One card per month, submitted and voted on by the community, balanced against the framework in the rules doc and added to the set. This is the single strongest retention mechanic available to you, it produces the "release sets" option in section 2 for free, and it makes the game genuinely theirs.

---

## 7. Prototype status

`prototypes/vault.html` implements rarity, block generation with all three protections, the reveal sequence, the collection grid, and salvage/craft. Persistence uses the artifact storage API with an in-memory fallback, so state survives reloads in the Claude artifact viewer but resets when opened as a bare local file — swap that for your own backend.

Not built: trading, the public ledger, daily objectives, and any wiring between the vault and the game. The vault still carries its own copy of the card data — porting it into the React app so it imports `src/engine/cards.ts` is the first job in M3.

The pack model is a pure function (`openPack`) with no UI dependencies, so you can re-run the pacing simulation after any change to the rates or the set size. If you change nothing else, re-run it whenever the card count changes — completion time moves faster than intuition suggests.
