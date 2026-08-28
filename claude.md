# CHAINFALL

A two-player TCG for a community. Server-authoritative, deterministic, replayable.
No monetisation, and none planned.

```bash
npm run dev        # vite :5173, api :8787
npm test           # engine + server
npm run balance    # 3,600 AI-vs-AI games, ~3s
npm run typecheck
```

## Read first

- `docs/PRD.md` — what this is, and the product decisions already made **with the
  reasoning behind each**. If you're about to argue for a change, check whether
  it's already been argued. Each decision has a "revisit if".
- `docs/CONTRIBUTING.md` — card format and the costing framework. Required before
  touching `src/engine/cards.ts`.
- `docs/architecture.md` — why HTTP for durable state and WS for the match.
- `docs/ROADMAP.md` — what's next and why in that order.
  **The docs describe intent; the code is the truth.** The web client has been
  reworked since the docs were written, so read the actual components before
  trusting a description of them.

## Invariants — don't break these without saying so

**`src/engine/` is framework-agnostic.** It's imported by the React app, the Node
server, the bot and the tests. No `import.meta.env`, no `?raw` imports, no path
aliases, nothing from `node:`. One copy of the rules is the entire point — an
earlier version had the engine duplicated across three files and they drifted.

**`applyAction(state, seat, action)` is the only way to mutate match state.**
Clients, bot and replay all go through it. The bot returns _actions_ rather than
mutating, so it can't do anything a player couldn't — which is what makes the
balance numbers mean anything.

**All randomness comes from `state.rng`**, seeded at creation. Never `Math.random()`
inside the engine. Same seed plus same actions must reproduce a match exactly;
there's a test asserting it over 60 matches.

**A match is `(seed, mode, factions, actions[])`** — about 3 KB. Reconnection,
spectating, replays and dispute resolution all come from that one record. Don't
add a parallel state snapshot.

**A seat only ever receives `view(state, seat)`.** Opponent's hand as a count,
deck order never serialised. The client computes legality locally for
highlighting only; the server re-checks everything. This is a hidden-information
game — treat a leak as a correctness bug, not a polish item.

**Card data lives only in `src/engine/cards.ts`.** If you find yourself typing a
card name or cost anywhere else, stop.

## House rules for changes

- **Balance claims need an error bar.** `npm run balance` at N=500 per cell.
  An early 540-game run reported a 9-point faction spread when the real answer
  was 23 — 60 games per cell has a ±6 point error. Under-sampling sends you
  tuning cards that were never the problem.
- **Don't buff on bot data alone.** Adding archetype-aware aggression to the bot
  moved a faction 2 points with zero card changes. Some of what looks like a weak
  faction is a bot that can't pilot it.
- **Nerf numbers; don't restrict copies.** Restricting an overpowered card makes
  games swingier, not fairer. We're digital and can ship a number change in an hour.
- **New cards print sideways, not upward.** A card strictly better than an existing
  one is a bug. There's no monetisation here, so power creep buys nothing and
  costs the whole costing framework.
- **Be most conservative with neutral cards.** A broken faction card touches a
  third of decks; a broken neutral touches all of them.

## Known open work

Identity and persistence are the gate — `playerId` is currently whatever the
client claims, and nothing in collection or trading is safe to build on that.
See `docs/ROADMAP.md`.

Current UI issues worth fixing (from a design review of the running app):

1. **The card face.** Fixed. There is one face now — `CardBody` in `Card.tsx`,
   styled by `cards.css` — and the hand, the Feed, the sheets, the stash and the
   vault all render it. The Feed used to keep a second copy of the markup under
   its own class names, which is how it ended up showing no rules text at all
   while 76% of the set carries text or a Consensus clause. The face is a query
   container, so its type and spacing scale with its own width and it holds
   together from 81px in a phone hand to 260px in a sheet without a breakpoint
   per surface. Two things follow from that container: `cqi` in a rule that
   targets `.card` itself would resolve against `#table`, not the card, so keep
   fluid values on descendants; and the card is now a stacking context, which is
   why the Feed popover needs `#feed .fcard.peek{z-index:7}` to clear its
   neighbour. Below ~90px the face drops to a tab — cost, crew mark, name, stats
   — and the sheet the first tap opens carries the text instead.

   How big the face gets is a separate question, decided in `table.css`. One
   driver — `--hand-h`, the height of a card in hand — and the Feed and the board
   derive from it. It is the smaller of a height budget (the two boards, the Feed
   and the hand share the table) and a width budget (five Assets across), floored
   at the old fixed size so a laptop is unchanged and capped so a large monitor
   stops somewhere sane. Those vars sit on `#table > *`, not `#table`: it is the
   same container-unit trap as above, and a `cqh` written in `#table`'s own block
   silently means the viewport. The phone and landscape overrides in `mobile.css`
   have to target the children too, or they get shadowed rather than applied.
2. **Enemy hero power renders from the wrong POV.** `FACTIONS[f].power.text` is
   written owner-POV ("2 to them, 1 to you"); on the opponent's bar it reads
   backwards. Flip the pronouns when rendering enemy-side, or store it neutrally.
3. **SEAL is styled as the primary action** even when a playable card is in hand.
   Keep it secondary until there are no legal plays.
4. **Terminology drift.** UI says "crew" / "Sovereigns" / "kit"; engine says
   "faction" / "The Sovereign"; docs say "chain". Pick one of each and make
   `cards.ts`, the glossary and the docs agree.
5. **Mobile.** Portrait is playable now: the Feed is a claim sheet you can step
   out of, a hand card takes two taps (read, then Play), the tape collapses to a
   ticker, and the server holds the turn clock while a seat is away. Two things
   are still open. An Asset on the board cannot be inspected on touch — `Tip` is
   pointer-fine only, because on a coarse pointer it was taking the tap that
   selects the Asset, which made attacking impossible. And phone landscape asks
   for portrait rather than fitting: the fixed chrome is 339px of the 333px the
   table gets, so both board rows round to nothing and the Assets spill over the
   rails. Closing that means restructuring, most likely the hand as a drawer.
