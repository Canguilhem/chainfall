# CHAINFALL

A small trading card game for a community. Two players, twenty minutes,
sixty-seven cards, three factions, set after a slow-motion collapse in which the
last functioning ledger is contested by corporate custodians, crypto sovereigns,
and people who will bet on anything.

Server-authoritative, deterministic, replayable. No monetisation, and no plans
for any.

```bash
npm install
npm run dev        # vite on :5173, api on :8787, HMR on the client
npm test           # 13 tests: determinism, replay, redaction, validation, balance, server
npm run build      # tsc -b && vite build
npm start          # serves ./dist + the API on :8787
npm run balance    # 3,600 AI-vs-AI games, ~3s
```

Open two tabs and pick VERSUS in both to play against yourself. SOLO needs no
server at all — it runs the engine in the tab.

## Deploying

**Versus needs the Node match server** (`src/server/index.ts`) with WebSocket
support. A static host (Vercel, Netlify, GitHub Pages) serves only the client —
SOLO works there; Versus does not, unless you point the client at a running API.

### Option A — one service (recommended)

Build and run everything together:

```bash
npm run build
npm start          # serves ./dist + /api + /ws on :8787
```

Or use the included `Dockerfile` on Railway, Fly.io, Render, etc. Set `PORT` if
the platform requires it.

### Option B — split client + server

1. Deploy the server (`npm run build && npm start` or Docker) somewhere with a
   public HTTPS URL.
2. Build the client with the server URL baked in:

```bash
VITE_SERVER_ORIGIN=https://your-api.example.com npm run build
```

3. Deploy `./dist` to Vercel (or any static host).

Versus is currently marked coming soon in the lobby until a match host is
deployed. The client can still target a separate API via `VITE_SERVER_ORIGIN`.

### Option C — existing EC2 (e.g. t2.micro)

If you already have a micro instance, that is often the **cheapest** path
(Free Tier = $0). One process serves client + API + WebSocket. See
[`docs/deploy-ec2.md`](docs/deploy-ec2.md) and the files in `deploy/`.

## Documentation

| | |
|---|---|
| [`docs/PRD.md`](docs/PRD.md) | What this is, who for, scope, the product decisions already made and why, open questions |
| [`docs/game-rules.md`](docs/game-rules.md) | Full rules, the card-costing framework, all 67 cards, starter decks, balance state |
| [`docs/CONTRIBUTING.md`](docs/CONTRIBUTING.md) | How to add a card: the data format, how to price it, how to check it |
| [`docs/architecture.md`](docs/architecture.md) | Why HTTP for durable state and WebSocket for the match; determinism, replay, redaction |
| [`docs/economy.md`](docs/economy.md) | Packs, rarity, salvage/craft, trading rules and the anti-farming reasoning |
| [`docs/modes.md`](docs/modes.md) | Salvage Run and Consensus — what was taken from Hero Realms and what wasn't |
| [`docs/patch-notes.md`](docs/patch-notes.md) | Balance history, with the measurements behind each change |
| [`docs/ROADMAP.md`](docs/ROADMAP.md) | What's next, ordered by what unblocks what |

New here? Read the PRD, then the rules. Adding a card? `CONTRIBUTING.md` is all
you need. Working on the server? `architecture.md`.

## Status

Engine and match server are built and tested. Accounts, persistence, collection,
deckbuilder and trading are not — see `docs/ROADMAP.md`. **Identity and
persistence are the gate**: nothing in collection or trading is safe to build on
a `playerId` the client makes up.

`prototypes/vault.html` is a standalone pack-opening and collection prototype
from before the TypeScript migration. It still runs, and it carries its own copy
of the card data — porting it into the React app is the first job in M3.

## Layout

```
src/engine/     plain TypeScript, no framework, no Node APIs.
                Imported by BOTH the web app and the server.
  types.ts        the card DSL as types — see below
  cards.ts        the 70-card set, checked against those types
  engine.ts       rules, bot, views, replay
src/server/     http + ws. Never imports anything from src/web.
src/web/        React. The only thing Vite builds.
  transport.ts    local (solo) and remote (versus) behind one interface
tools/          balance harness
```

**The engine must never import anything Vite-specific** — no `import.meta.env`,
no `?raw` imports, no path aliases — and nothing from `node:`. That constraint
is the whole reason one copy of the rules can serve the browser, the server, the
bot and the test suite.

## Why TypeScript

The card content is a data language. In plain JS a typo produces a card that
silently does nothing — no crash, no failing test, just a card that doesn't
work until a player reports it. The unions in `types.ts` turn all of these into
compile errors:

```
Type '"damge"' is not assignable to type '"armor" | "buff" | … | "damage"'.
  Did you mean '"damage"'?
Type '"self_hero"' is not assignable to type … Did you mean '"self-hero"'?
Property 'amt' is missing in type '{ op: "damage"; tgt: "choose-asset"; }'
'tgt' does not exist in type '{ op: "draw"; amt: number; }'
Type '"nodee"' is not assignable to type 'SummonableId'. Did you mean '"node"'?
'amt' does not exist in type '{ op: "buff"; a?: number; h?: number; … }'
Type '"enemy-hero"' is not assignable to type 'AssetTarget'.
Type '{ n: string; c: number; t: "asset"; f: "neutral"; }' is missing … a, h
Type '"anarchist"' is not assignable to type 'Faction'.
Type '"stealth"' is not assignable to type 'Keyword'.
```

This matters most when community-submitted cards start arriving: a contributor
gets the error in their editor rather than shipping a dead card.

## Adding a card

Add an entry to `CARDS` in `src/engine/cards.ts`. `satisfies Record<string, Card>`
checks it in place. Then `npm run balance` to see what moved.

```ts
cold_snap: { n: 'Cold Snap', c: 3, t: 'op', f: 'consortium',
  tx: 'Seize an enemy Asset. Draw a card.',
  fx: [{ op: 'seize', tgt: 'choose-enemy-asset' }, { op: 'draw', amt: 1 }] },
```

## Invariants worth not breaking

- **`applyAction` is the only way to mutate state.** Clients, bot and replay all
  go through it, so the bot can't do anything a player couldn't — which is what
  makes the balance numbers mean something.
- **All randomness comes from `state.rng`**, seeded at creation. Same seed plus
  same actions reproduces a match exactly, on any machine.
- **A match is `(seed, mode, factions, actions[])`** — about 3 KB. That one
  record gives you reconnection, spectating, replays, and a way to settle
  disputes by re-running the game.
- **A seat only ever receives `view(state, seat)`.** Opponent hand as a count,
  deck order absent entirely. The client computes legality locally for
  highlighting only; the server re-checks everything.
