/* ============================================================================
   Two transports, one interface.

   `local` runs the engine in the tab; `remote` talks to the server. The React
   layer below never learns which one it has — it receives MatchView objects
   and emits Actions either way. This is the reason there is no second copy of
   the game rules for solo play.
   ========================================================================== */
import {
  createMatch, applyAction, view, botAction, FACTIONS,
  type Action, type MatchView, type Mode, type PlayableFaction, type ServerMessage
} from '../engine/index.ts';

export interface Transport {
  send(a: Action): void;
  close(): void;
}
export interface Handlers {
  onView(v: MatchView): void;
  onMessage(m: ServerMessage): void;
}

export function localTransport(faction: PlayableFaction, mode: Mode, h: Handlers): Transport {
  const foes = (Object.keys(FACTIONS) as PlayableFaction[]).filter(f => f !== faction);
  const S = createMatch({ mode, factions: [faction, foes[Math.floor(Math.random() * foes.length)]!] });
  let dead = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const push = () => h.onView(view(S, 0));
  const over = () => h.onMessage({ t: 'over', won: S.winner === 0, why: 'solo run · seed ' + S.seed, replayId: '' });

  function botTurn(): void {
    if (dead) return;
    if (S.over) return over();
    if (S.turn !== 0) {
      const a = botAction(S, 1);
      if (a) applyAction(S, 1, a);
      push();
      if (S.over) return over();
      timers.push(setTimeout(botTurn, S.turn === 1 ? 380 : 0));
    } else push();
  }

  h.onMessage({ t: 'start', matchId: 'solo', seat: 0, mode, token: '' });
  push();
  return {
    send(a) {
      if (dead || S.over) return;
      const r = applyAction(S, 0, a);
      if (!r.ok) return h.onMessage({ t: 'reject', why: r.error ?? 'rejected' });
      push();
      if (S.over) return over();
      timers.push(setTimeout(botTurn, 420));
    },
    close() { dead = true; timers.forEach(clearTimeout); }
  };
}

export function remoteTransport(faction: PlayableFaction, mode: Mode, h: Handlers): Transport {
  let session: { matchId: string; token: string } | null = null;
  let ws: WebSocket | null = null;
  let closed = false;
  let retry: ReturnType<typeof setTimeout> | undefined;

  const open = () => {
    clearTimeout(retry); retry = undefined;
    if (closed || ws?.readyState === 0 || ws?.readyState === 1) return;
    const proto = location.protocol === 'https:' ? 'wss' : 'ws';
    ws = new WebSocket(`${proto}://${location.host}/ws`);
    ws.onopen = () => {
      if (session) ws!.send(JSON.stringify({ t: 'resume', ...session }));
      else ws!.send(JSON.stringify({ t: 'queue', faction, mode }));
    };
    ws.onmessage = ev => {
      const m: ServerMessage = JSON.parse(ev.data);
      if (m.t === 'start') session = { matchId: m.matchId, token: m.token };
      if (m.t === 'over' || m.t === 'resumeFailed') session = null;
      if (m.t === 'state') h.onView(m.view);
      h.onMessage(m);
    };
    ws.onclose = () => { if (!closed) retry = setTimeout(open, 1200); };   // the token gets us the seat back
  };

  // A backgrounded phone has its socket closed out from under it and its timers
  // throttled, so the retry above may not run until the tab is looked at again.
  // Reconnect on the way back rather than waiting out a tick we cannot schedule.
  const wake = () => { if (!closed && document.visibilityState === 'visible' && ws?.readyState !== 1) open(); };
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('pageshow', wake);
  window.addEventListener('online', wake);

  open();
  return {
    send(a) { if (ws?.readyState === 1) ws.send(JSON.stringify(a)); },
    close() {
      closed = true;
      clearTimeout(retry);
      document.removeEventListener('visibilitychange', wake);
      window.removeEventListener('pageshow', wake);
      window.removeEventListener('online', wake);
      ws?.close();
    }
  };
}
