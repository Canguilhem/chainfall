import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawn, type ChildProcess } from 'node:child_process';
import WebSocket from 'ws';
import type { ServerMessage, MatchView } from '../src/engine/index.ts';

const PORT = 8921;
const CLOCK_PORT = 8922;
const base = `http://localhost:${PORT}`;
const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));
const connTo = (p: number) => new Promise<WebSocket>(r => { const w = new WebSocket(`ws://localhost:${p}/ws`); w.on('open', () => r(w)); });
const conn = () => connTo(PORT);
let srv: ChildProcess;

beforeAll(async () => {
  srv = spawn('npx', ['tsx', 'src/server/index.ts'], { env: { ...process.env, PORT: String(PORT), GRACE_MS: '1200' }, stdio: 'ignore' });
  for (let i = 0; i < 40; i++) { try { await fetch(base + '/api/health'); return; } catch { await sleep(250); } }
}, 20_000);
afterAll(() => srv?.kill());

describe('HTTP', () => {
  it('is idempotent for pack opening', async () => {
    const post = (key: string) => fetch(base + '/api/packs/open', {
      method: 'POST', headers: { 'content-type': 'application/json', 'idempotency-key': key },
      body: JSON.stringify({ playerId: 'p1' })
    }).then(r => r.json());
    const a = await post('same-key'), b = await post('same-key'), c = await post('other-key');
    expect(b.replayed).toBe(true);
    expect(b.pulls).toEqual(a.pulls);
    expect(b.scrip).toBe(a.scrip);
    expect(c.scrip).toBeLessThan(a.scrip);
  });
});

describe('WS match', () => {
  it('matches, redacts, validates, and survives a reconnect', async () => {
    const A = await conn(), B = await conn();
    const st: Record<string, MatchView> = {}, tok: Record<string, { matchId: string; token: string }> = {};
    const ev: string[] = [];
    const wire = (w: WebSocket, n: string) => w.on('message', raw => {
      const m: ServerMessage = JSON.parse(String(raw));
      ev.push(n + ':' + m.t);
      if (m.t === 'start') tok[n] = { matchId: m.matchId, token: m.token };
      if (m.t === 'state') st[n] = m.view;
    });
    wire(A, 'A'); wire(B, 'B');
    A.send(JSON.stringify({ t: 'queue', faction: 'degen', mode: 'salvage' }));
    await sleep(120);
    B.send(JSON.stringify({ t: 'queue', faction: 'consortium', mode: 'salvage' }));
    await sleep(350);

    expect(st.A).toBeDefined(); expect(st.B).toBeDefined();

    // no opponent hand ids reach the other seat
    const raw = JSON.stringify(st.A);
    const leaked = (st.B!.you.hand ?? []).filter(id =>
      raw.includes(`"${id}"`) && !st.A!.feed.includes(id) && !(st.A!.you.hand ?? []).includes(id));
    expect(leaked).toEqual([]);

    // acting out of turn is rejected
    const idle = st.A!.yourTurn ? 'B' : 'A';
    (idle === 'A' ? A : B).send(JSON.stringify({ t: 'play', i: 0 }));
    await sleep(150);
    expect(ev).toContain(idle + ':reject');

    // disconnect, then resume with the seat token
    const active = st.A!.yourTurn ? 'A' : 'B';
    const blockBefore = st[active]!.block;
    (active === 'A' ? A : B).close();
    await sleep(250);
    expect(ev.some(e => e.endsWith(':opponentGone'))).toBe(true);
    const R = await conn(); wire(R, active);
    R.send(JSON.stringify({ t: 'resume', ...tok[active]! }));
    await sleep(300);
    expect(st[active]!.block).toBe(blockBefore);
    expect(ev.some(e => e.endsWith(':opponentBack'))).toBe(true);

    [A, B, R].forEach(w => { try { w.close(); } catch { /* already closed */ } });
  }, 20_000);
});

describe('turn clock', () => {
  // Its own server: a 1.5s turn is the only way to watch the clock without
  // waiting 75 seconds, and a long grace keeps the drop from ending the match.
  let clockSrv: ChildProcess;
  beforeAll(async () => {
    clockSrv = spawn('npx', ['tsx', 'src/server/index.ts'],
      { env: { ...process.env, PORT: String(CLOCK_PORT), TURN_MS: '1500', GRACE_MS: '30000' }, stdio: 'ignore' });
    for (let i = 0; i < 40; i++) {
      try { await fetch(`http://localhost:${CLOCK_PORT}/api/health`); return; } catch { await sleep(250); }
    }
  }, 20_000);
  afterAll(() => clockSrv?.kill());

  it('stops while a seat is away and resumes on reconnect', async () => {
    const A = await connTo(CLOCK_PORT), B = await connTo(CLOCK_PORT);
    const st: Record<string, MatchView> = {}, tok: Record<string, { matchId: string; token: string }> = {};
    const ev: string[] = [];
    const wire = (w: WebSocket, n: string) => w.on('message', raw => {
      const m: ServerMessage = JSON.parse(String(raw));
      ev.push(n + ':' + m.t);
      if (m.t === 'start') tok[n] = { matchId: m.matchId, token: m.token };
      if (m.t === 'state') st[n] = m.view;
    });
    wire(A, 'A'); wire(B, 'B');
    A.send(JSON.stringify({ t: 'queue', faction: 'degen', mode: 'salvage' }));
    await sleep(120);
    B.send(JSON.stringify({ t: 'queue', faction: 'consortium', mode: 'salvage' }));
    await sleep(300);

    // drop the seat that is on the clock, then sit out longer than a full turn
    const active = st.A!.yourTurn ? 'A' : 'B';
    const idle = active === 'A' ? 'B' : 'A';
    const blockBefore = st[active]!.block;
    (active === 'A' ? A : B).close();
    await sleep(2600);
    expect(ev.some(e => e.endsWith(':timeout'))).toBe(false);
    expect(st[idle]!.block).toBe(blockBefore);

    // back on the socket, the clock picks up its remainder and does expire
    const R = await connTo(CLOCK_PORT); wire(R, active);
    R.send(JSON.stringify({ t: 'resume', ...tok[active]! }));
    await sleep(1900);
    expect(ev.some(e => e.endsWith(':timeout'))).toBe(true);

    [A, B, R].forEach(w => { try { w.close(); } catch { /* already closed */ } });
  }, 20_000);
});
