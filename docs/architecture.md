# CHAINFALL — architecture, iteration one

> **Note on paths.** This was written against the standalone JS prototype. The
> reasoning is unchanged, but the files moved: `engine.js` → `src/engine/`,
> `server.js` → `src/server/index.ts`, `client.html` → `src/web/`, and the tests
> are now `tests/*.test.ts` under Vitest.

## Should you use WebSockets?

For the match, yes. For everything else, no — and the split matters more than the choice.

**WebSocket for the live match.** It's turn-based, but the server has to push: your opponent acted, the turn timer expired, you've been matched, they reconnected. Polling for that is wasteful and laggy, and the payloads are tiny. A socket is the right shape.

**HTTP for anything durable.** Auth, collection, packs, trading, deck lists, replays. Not because sockets can't carry them, but because HTTP gives you things you'd otherwise rebuild badly: status codes, caching, retries, and above all **idempotency**.

That last one is the actual argument. Consider a player opening a pack when their connection hiccups. Over a socket you sent `{t:'openPack'}` and got nothing back — did it open? Retrying might charge them twice; not retrying might lose the pack. There's no clean answer, and the failure lands on a player's collection, which is exactly where they'll never forgive you.

Over HTTP it's a solved problem:

```
POST /api/packs/open
Idempotency-Key: 01J8ZQ...
```

Retry with the same key and you get the same five cards back, charged once. This is implemented and tested:

```
first  scrip 200 | cards sharded_rig,seed_phrase_kid,bailout,node…
second scrip 200 | replayed: true | identical pulls: true
different key charges again: true
```

The rule of thumb: **if losing the message would cost a player something they own, it goes over HTTP.** If losing it just means a stale frame, the socket is fine — the next `state` push corrects it anyway.

One reasonable alternative worth knowing: **SSE downstream plus HTTP POST upstream**. It works through more corporate proxies, reconnects automatically, and for one action every few seconds the overhead is irrelevant. If WebSocket infrastructure ever becomes a hassle, that swap costs you about a day. It's not better here, just not much worse.

---

## The shape

```
  browser                              server
  ┌────────────────────┐               ┌──────────────────────────┐
  │ src/web (React)    │─── HTTP ─────▶│ packs · replay · static  │
  │   pure view        │               │  idempotent, cacheable   │
  │                    │◀── WS ───────▶│ match rooms              │
  │ src/engine ────────┼───────────────┼─▶ src/engine             │
  └────────────────────┘  same module  └──────────────────────────┘
```

`engine.js` is the whole game and it is loaded by both sides. The client uses it for card text and to decide which targets to highlight; the server uses it to decide what actually happened. There is exactly one copy of the rules, which is the reason the card database can't drift between client and server the way it did across the earlier prototypes.

### The engine is pure

```js
createMatch({seed, mode, factions})     -> state
applyAction(state, seat, action)        -> {ok, error?, events[]}
view(state, seat)                       -> what that seat may see
botAction(state, seat)                  -> an action, or null
replay({seed, mode, factions, actions}) -> state
```

No DOM, no I/O, no module-level mutable state. Three consequences fall out:

**`applyAction` is the only way to change anything.** Human clients, the bot, and replay all go through it. The bot returns *actions* rather than mutating state, so it cannot do anything a player couldn't — which also means bot-vs-bot balance runs are measuring the real game.

**The RNG is seeded and lives in state.** Every shuffle, every Casino Rig split, every random discard comes from `state.rng`. Verified over 200 matches: same seed plus same actions always produces the same result. If the client rolled its own dice a determined player would simply reroll until they liked the answer.

**A match is `(seed, mode, factions, actions[])`** — about 2.8 KB, or 4.6 KB for a long one. Replaying that record reproduces the exact final state. One mechanism gives you reconnection, spectating, replays, and a way to settle "he cheated" reports by re-running the match.

### The client holds nothing

Each socket receives `view(state, seat)` and only that: your hand as card ids, **your opponent's hand as a count**, decks as counts, feed order not serialised at all. Spectators get a view with both hands redacted, which is a one-line variant rather than a separate code path.

The client does compute legality locally — which cards look playable, which targets glow. That's advisory. The server re-checks everything, so a tampered client gains nothing but a `reject`:

```
wrong seat=rejected · unknown action=rejected · card not in hand=rejected
illegal attack=rejected · malformed=rejected
opponent hand ids visible to A: none
```

### One client, two transports

The React app doesn't know whether it's talking to a server. `src/web/transport.ts` exposes `localTransport` and `remoteTransport` behind one interface: solo instantiates the engine in the tab, versus opens a socket, and `App.tsx` receives `MatchView` objects either way. Solo play is not a second implementation of the rules.

---

## What's built and tested

| | Status |
|---|---|
| Pure engine, deterministic, replayable | ✅ 200-match determinism and replay tests |
| Server-authoritative match, redacted views | ✅ verified over a live socket |
| Action validation | ✅ five illegal-action classes rejected |
| Matchmaking queue | ✅ |
| Reconnection via seat token | ✅ 60s grace, opponent notified both ways |
| Turn timer | ✅ server auto-passes an idle turn |
| Spectator views | ✅ engine side; no UI yet |
| Replay endpoint | ✅ `GET /api/replay/:id` reproduces final state |
| Idempotent pack opening | ✅ |
| Solo play through the same client | ✅ |

Run it:

```
npm install
npm run dev     # vite on :5173, api on :8787
npm test        # 13 tests across engine and server
```

Open two tabs, pick VERSUS in both, and they'll match against each other.

---

## What iteration two needs

**Persistence.** `matches`, `finished`, `players` and `idempotency` are `Map`s. They're already shaped like tables: match records are a row with a JSON `actions` column, and the idempotency map is a key/response table with a TTL. Postgres, and nothing around them changes.

**Identity.** `playerId` is currently whatever the client claims. Anything real — even a magic link — before trading exists, because the anti-farming rules from the economy design depend on accounts being real.

**Rate limiting.** Nothing stops a client flooding actions. A token bucket per socket, plus a cap on queue joins.

**The economy endpoints.** Only `/api/packs/open` exists, as a demonstration of the idempotency pattern. Collection, salvage/craft and trading follow the same shape, and trades in particular need the idempotency treatment for exactly the reason packs do.

**Spectator UI.** The redaction is done; it needs a page.

**Everything above is tracked in `ROADMAP.md`.**

### Scale

Two players a match, tiny JSON payloads, a handful of concurrent rooms. A single small VPS carries a few hundred people without any of this needing to be clever. If it ever does grow, the seam is already in the right place: rooms are independent, and a room is fully described by its match record, so moving one between processes is a matter of shipping 3 KB of JSON.

Don't build for scale you don't have. Build reconnection, spectating and replays — those are what a community actually asks for.
