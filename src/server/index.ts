/* ============================================================================
   CHAINFALL server.

   HTTP for anything durable (packs, collection, replays) — request/response,
   retryable, idempotent. WebSocket for the live match only.

   In dev, Vite serves the client on :5173 and proxies /api and /ws here, so
   this process never serves HTML. In production it serves ./dist.
   ========================================================================== */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { WebSocketServer, type WebSocket } from 'ws';
import {
  createMatch, applyAction, view, CARDS,
  type Action, type ClientMessage, type MatchRecord, type MatchState,
  type Mode, type PlayableFaction, type Seat, type ServerMessage
} from '../engine/index.ts';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const DIST = path.resolve(DIR, '../../dist');
const PORT = Number(process.env.PORT ?? 8787);
const TURN_MS = Number(process.env.TURN_MS ?? 75_000);
const GRACE_MS = Number(process.env.GRACE_MS ?? 60_000);

interface Seatt { ws: WebSocket | null; token: string; playerId: string }
interface Room {
  id: string; S: MatchState; factions: [PlayableFaction, PlayableFaction]; mode: Mode;
  actions: { seat: Seat; action: Action }[]; seats: [Seatt, Seatt];
  spectators: WebSocket[]; turnTimer?: NodeJS.Timeout; graceTimer?: NodeJS.Timeout;
  turnLeft: number; turnArmedAt?: number;
}
interface Sock extends WebSocket { room?: Room; seat?: Seat; spectator?: boolean; playerId?: string }

// In-memory for now. Each of these is a table later; nothing around them changes.
const matches = new Map<string, Room>();
const finished = new Map<string, MatchRecord>();
const idempotency = new Map<string, unknown>();
const players = new Map<string, { scrip: number; salvage: number; owned: Record<string, number> }>();
let queue: { ws: Sock; faction: PlayableFaction; mode: Mode; playerId: string }[] = [];
let nextMatch = 1;

const rid = () => crypto.randomBytes(9).toString('base64url');
const send = (ws: WebSocket | null | undefined, m: ServerMessage) => {
  if (ws && ws.readyState === 1) ws.send(JSON.stringify(m));
};
const playerOf = (id: string) => {
  let p = players.get(id);
  if (!p) { p = { scrip: 300, salvage: 0, owned: {} }; players.set(id, p); }
  return p;
};

/* ---------------------------------------------------------------- HTTP */
const MIME: Record<string, string> = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.map': 'application/json', '.svg': 'image/svg+xml' };
function json(res: http.ServerResponse, code: number, body: unknown) {
  const s = JSON.stringify(body);
  res.writeHead(code, { 'content-type': 'application/json', 'content-length': Buffer.byteLength(s) });
  res.end(s);
}
const readBody = (req: http.IncomingMessage) => new Promise<Record<string, unknown>>(resolve => {
  let b = '';
  req.on('data', c => { b += c; if (b.length > 1e6) req.destroy(); });
  req.on('end', () => { try { resolve(JSON.parse(b || '{}')); } catch { resolve({}); } });
});

const server = http.createServer(async (req, res) => {
  const p = new URL(req.url ?? '/', 'http://localhost').pathname;

  if (p === '/api/health') return json(res, 200, { ok: true, matches: matches.size, queued: queue.length });

  // A replay is just the match record; the client re-runs it through the same
  // engine, so there is nothing extra to store or keep in sync.
  if (p.startsWith('/api/replay/')) {
    const rec = finished.get(p.slice(12));
    return rec ? json(res, 200, rec) : json(res, 404, { error: 'no such match' });
  }

  // Economy writes are HTTP and idempotent, which is precisely why they are not
  // on the socket: "did my pack open?" must have exactly one answer.
  if (p === '/api/packs/open' && req.method === 'POST') {
    const key = req.headers['idempotency-key'];
    if (typeof key !== 'string') return json(res, 400, { error: 'Idempotency-Key required' });
    const prior = idempotency.get(key);
    if (prior) return json(res, 200, { ...(prior as object), replayed: true });
    const body = await readBody(req);
    const me = playerOf(typeof body.playerId === 'string' ? body.playerId : 'demo');
    if (me.scrip < 100) return json(res, 402, { error: 'not enough scrip' });
    me.scrip -= 100;
    const ids = Object.keys(CARDS).filter(id => !('token' in CARDS[id as keyof typeof CARDS]));
    const pulls = Array.from({ length: 5 }, () => {
      const id = ids[crypto.randomInt(ids.length)]!;
      const dupe = (me.owned[id] ?? 0) >= 2;
      if (dupe) me.salvage += 5; else me.owned[id] = (me.owned[id] ?? 0) + 1;
      return { id, dupe };
    });
    const out = { pulls, scrip: me.scrip, salvage: me.salvage };
    idempotency.set(key, out);
    return json(res, 200, out);
  }

  // Production only: in dev, Vite owns the HTML.
  const file = p === '/' ? '/index.html' : p;
  const full = path.join(DIST, path.normalize(file).replace(/^(\.\.[/\\])+/, ''));
  fs.readFile(full, (err, buf) => {
    if (err) {
      // SPA fallback
      return fs.readFile(path.join(DIST, 'index.html'), (e2, idx) => {
        if (e2) return json(res, 404, { error: 'not built — run `npm run build`, or use `npm run dev`' });
        res.writeHead(200, { 'content-type': 'text/html' });
        res.end(idx);
      });
    }
    res.writeHead(200, { 'content-type': MIME[path.extname(full)] ?? 'application/octet-stream' });
    res.end(buf);
  });
});

/* ------------------------------------------------------------------ WS */
const wss = new WebSocketServer({ server, path: '/ws' });

function pushState(room: Room, keepClock = false) {
  room.seats.forEach((s, i) => send(s.ws, { t: 'state', view: view(room.S, i as Seat), seat: i as Seat, token: s.token }));
  room.spectators.forEach(ws => send(ws, { t: 'state', view: view(room.S, null), seat: null }));
  if (room.S.over) return finish(room, room.S.winner, 'match complete');
  armTurnTimer(room, keepClock);
}
function finish(room: Room, winner: Seat | null, why: string) {
  clearTimeout(room.turnTimer); clearTimeout(room.graceTimer);
  finished.set(room.id, { id: room.id, seed: room.S.seed, mode: room.S.mode, factions: room.factions, actions: room.actions, winner });
  room.seats.forEach((s, i) => send(s.ws, { t: 'over', won: winner === i, why, replayId: room.id }));
  room.spectators.forEach(ws => send(ws, { t: 'over', won: null, why, replayId: room.id }));
  matches.delete(room.id);
}
/* The turn clock only runs while both seats are connected. A phone that
   backgrounds the tab drops its socket within seconds, and a clock that kept
   counting through that would seal the block of a player who never left. The
   grace timer, not this one, is what punishes actually walking away.
   `keepClock` resumes the remaining time; without it the turn gets a full one. */
function armTurnTimer(room: Room, keepClock = false) {
  pauseTurnTimer(room);
  if (!keepClock) room.turnLeft = TURN_MS;
  if (room.seats.some(s => !s.ws)) return;                // paused until they are back
  room.turnArmedAt = Date.now();
  room.turnTimer = setTimeout(() => {                     // someone walked away
    if (room.S.over) return;
    const seat = room.S.turn;
    room.actions.push({ seat, action: { t: 'end' } });
    applyAction(room.S, seat, { t: 'end' });
    room.seats.forEach(s => send(s.ws, { t: 'timeout', seat }));
    pushState(room);
  }, room.turnLeft);
}
function pauseTurnTimer(room: Room) {
  if (room.turnArmedAt !== undefined) {
    room.turnLeft = Math.max(0, room.turnLeft - (Date.now() - room.turnArmedAt));
  }
  clearTimeout(room.turnTimer);
  room.turnTimer = undefined;
  room.turnArmedAt = undefined;
}
function makeRoom(a: { ws: Sock; faction: PlayableFaction; mode: Mode; playerId: string },
                  b: { ws: Sock; faction: PlayableFaction; mode: Mode; playerId: string }): Room {
  const id = 'm' + (nextMatch++);
  const factions: [PlayableFaction, PlayableFaction] = [a.faction, b.faction];
  const room: Room = {
    id, S: createMatch({ mode: a.mode, factions }), factions, mode: a.mode, actions: [],
    seats: [{ ws: a.ws, token: rid(), playerId: a.playerId }, { ws: b.ws, token: rid(), playerId: b.playerId }],
    spectators: [], turnLeft: TURN_MS
  };
  matches.set(id, room);
  room.seats.forEach((s, i) => {
    const ws = s.ws as Sock;
    ws.room = room; ws.seat = i as Seat;
    send(ws, { t: 'start', matchId: id, seat: i as Seat, mode: a.mode, token: s.token });
  });
  pushState(room);
  return room;
}

wss.on('connection', (raw: WebSocket) => {
  const ws = raw as Sock;
  ws.on('message', data => {
    let m: ClientMessage;
    try { m = JSON.parse(String(data)); } catch { return; }

    // Reconnect: the token is the seat. Full state is re-sent, and nothing was
    // lost, because the client never held the authoritative copy.
    if (m.t === 'resume') {
      const room = matches.get(m.matchId);
      const i = room ? room.seats.findIndex(s => s.token === m.token) : -1;
      if (!room || i < 0) return send(ws, { t: 'resumeFailed' });
      clearTimeout(room.graceTimer);
      room.seats[i as 0 | 1].ws = ws;
      ws.room = room; ws.seat = i as Seat;
      send(ws, { t: 'start', matchId: room.id, seat: i as Seat, mode: room.mode, token: m.token });
      send(room.seats[(1 - i) as 0 | 1].ws, { t: 'opponentBack' });
      return pushState(room, true);      // clock picks up where it paused
    }
    if (m.t === 'spectate') {
      const room = matches.get(m.matchId);
      if (!room) return send(ws, { t: 'resumeFailed' });
      room.spectators.push(ws); ws.room = room; ws.spectator = true;
      return send(ws, { t: 'state', view: view(room.S, null), seat: null });
    }
    if (m.t === 'queue') {
      ws.playerId = m.playerId ?? rid();
      const mode: Mode = m.mode === 'salvage' ? 'salvage' : 'constructed';
      const i = queue.findIndex(q => q.ws !== ws && q.mode === mode && q.ws.readyState === 1);
      if (i >= 0) makeRoom(queue.splice(i, 1)[0]!, { ws, faction: m.faction, mode, playerId: ws.playerId });
      else { queue.push({ ws, faction: m.faction, mode, playerId: ws.playerId }); send(ws, { t: 'queued' }); }
      return;
    }

    // Match actions. The engine decides legality; this layer only decides who
    // is allowed to speak at all.
    const room = ws.room;
    if (!room || ws.spectator || ws.seat === undefined || matches.get(room.id) !== room) return;
    const r = applyAction(room.S, ws.seat, m);
    if (!r.ok) return send(ws, { t: 'reject', why: r.error ?? 'rejected' });
    room.actions.push({ seat: ws.seat, action: m });
    pushState(room);
  });

  ws.on('close', () => {
    queue = queue.filter(q => q.ws !== ws);
    const room = ws.room;
    if (!room || !matches.has(room.id)) return;
    if (ws.spectator) { room.spectators = room.spectators.filter(s => s !== ws); return; }
    const seat = ws.seat as Seat;
    room.seats[seat].ws = null;
    pauseTurnTimer(room);
    send(room.seats[(1 - seat) as 0 | 1].ws, { t: 'opponentGone', graceMs: GRACE_MS });
    room.graceTimer = setTimeout(() => {
      if (matches.has(room.id)) finish(room, (1 - seat) as Seat, 'opponent disconnected');
    }, GRACE_MS);
  });
});

server.listen(PORT, () => console.log('chainfall api on http://localhost:' + PORT));
export { server, matches, finished };
