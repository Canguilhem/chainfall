# Roadmap

Ordered by what unblocks what, not by what's most fun to build.

## Now — accounts and persistence (M2)

**This is the gate.** Nothing in collection or trading is safe to build on a
`playerId` the client makes up.

- Real identity. Discord OAuth if that's where the community lives — it also
  makes the public trade ledger meaningful.
- Move `matches`, `finished`, `players` and `idempotency` off in-memory `Map`s.
  They're already table-shaped: a match record is a row with a JSON `actions`
  column, and the idempotency map is a key/response table with a TTL.
- Rate limiting. Nothing currently stops a client flooding actions — a token
  bucket per socket plus a cap on queue joins.

## Next — collection (M3)

- Port the vault prototype (`prototypes/vault.html`) into the React app.
- Deckbuilder. The most-requested thing that doesn't exist yet, and the point of
  having a collection at all.
- Collection, salvage and craft endpoints, following the idempotency pattern
  `/api/packs/open` already demonstrates.

## Then — social (M4)

This is where retention actually lives, and none of it is built.

- **Public deck list page.** People copying and countering each other's brews is
  most of the entertainment in a group that knows each other.
- **Trade ledger.** Card-for-card only, 10-match gate, playset-surplus only,
  24h re-trade cooldown, every trade public.
- **Spectating.** The redaction already supports it — a spectator view is a
  one-line variant. It needs a page.
- **Weekly rotating restriction.** No Legendaries, one faction only, 10-card
  chains. Costs almost nothing and resets the metagame every week.
- **Community card design.** One card a month, submitted and voted on, balanced
  against `docs/CONTRIBUTING.md`. The strongest retention mechanic available,
  and it makes the set genuinely theirs.

## Balance backlog

- **Consortium vs Sovereign sits at 61/39** — the widest matchup. Left alone
  deliberately for now; plenty of shipped card games carry 60/40 without anyone
  minding, and tuning further against a heuristic bot has sharp diminishing
  returns. Revisit with real play data.
- **Salvage Run has had no tuning pass.** Faction choice there is essentially a
  hero-power choice, so its 55/50/45 spread is a hero-power problem, not a card
  problem. Do not assume constructed numbers transfer.
- **Deck size 30** once the pool roughly doubles. At 67 cards a 30-card chain is
  too large a fraction of what's legal and everyone converges on the same list.

## Deliberately not doing

Ranked ladder · mobile apps · real-money anything · rotation · power creep in
new sets. See `docs/PRD.md` §5 and §6 for the reasoning on each.
