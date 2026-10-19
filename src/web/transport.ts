/* ============================================================================
   Two transports, one interface.

   `local` runs the engine in the tab; `remote` talks to the server. The React
   layer below never learns which one it has — it receives MatchView objects
   and emits Actions either way. This is the reason there is no second copy of
   the game rules for solo play.
   ========================================================================== */
import {
  createMatch, applyAction, view, botAction, lessonAction, lessonPending, lessonScript, settleLesson,
  FACTIONS, LESSON_STEPS,
  type Action, type KitCounts, type LessonCourse, type MatchState, type MatchView, type Mode, type PlayableFaction, type ServerMessage
} from '../engine/index.ts';
import { wsUrl } from './serverOrigin.ts';

export interface Transport {
  send(a: Action): void;
  /** Replay this sitting up to a beat already reached. Lessons only. */
  seek?(step: number): void;
  close(): void;
}
export interface Handlers {
  onView(v: MatchView): void;
  onMessage(m: ServerMessage): void;
  onSocket?(s: 'connecting' | 'open' | 'closed'): void;
}

export function localTransport(
  faction: PlayableFaction, mode: Mode, h: Handlers, kit?: KitCounts, lesson: boolean | LessonCourse = false,
  prepare?: (S: MatchState) => void,
): Transport {
  const teaching = !!lesson;
  const foes = (Object.keys(FACTIONS) as PlayableFaction[]).filter(f => f !== faction);
  let S = createMatch({
    mode: teaching ? 'salvage' : mode,
    factions: teaching ? ['sovereign', 'degen'] : [faction, foes[Math.floor(Math.random() * foes.length)]!],
    kits: teaching ? undefined : (kit ? [kit, undefined] : undefined),
    lesson,
  });
  prepare?.(S);
  let dead = false;
  const timers: ReturnType<typeof setTimeout>[] = [];

  const push = () => h.onView(view(S, 0));
  const over = () => h.onMessage({ t: 'over', won: S.winner === 0, why: 'solo run · seed ' + S.seed, replayId: '' });

  // A hit stays up long enough to read, then the beat advances. A beat that
  // opens on your claim advances immediately, so the feed's one legal card is
  // the one the new beat actually wants.
  function follow(): void {
    if (dead) return;
    // The action that just landed may be the one that ended the match. Publish
    // that view before announcing it — bailing here leaves the board on the
    // last HP and drops every click after it.
    push();
    if (S.over) return over();
    if (!teaching) {
      if (S.turn === 1) timers.push(setTimeout(botTurn, 420));
      return;
    }
    if (lessonPending(S)) {
      if (S.turn === 0 && S.awaitingClaim) {
        settleLesson(S);
        push();
        return;
      }
      timers.push(setTimeout(() => {
        if (dead || S.over) return;
        settleLesson(S);
        push();
        if (S.turn === 1) timers.push(setTimeout(botTurn, 900));
      }, 800));
      return;
    }
    if (S.turn === 1) timers.push(setTimeout(botTurn, 900));
  }

  function botTurn(): void {
    if (dead || S.over) return;
    if (S.turn !== 1) return;
    const a = teaching ? lessonAction(S, 1) : botAction(S, 1);
    if (!teaching) {
      if (a) applyAction(S, 1, a);
      push();
      if (S.over) return over();
      if (S.turn === 1) timers.push(setTimeout(botTurn, 380));
      return;
    }
    if (!a) return;
    const r = applyAction(S, 1, a);
    if (!r.ok) return;
    follow();
  }

  h.onMessage({ t: 'start', matchId: 'solo', seat: 0, mode, token: '' });
  push();
  /** Land on `step` with the board matching that beat, including an enemy turn the beat waits out. */
  function seek(step: number): void {
    if (dead || !teaching || !S.lessonCourse || S.lessonStep == null) return;
    const last = LESSON_STEPS[S.lessonCourse].length - 1;
    if (step < 0 || step >= last || step === S.lessonStep) return;
    timers.forEach(clearTimeout);
    timers.length = 0;
    S = createMatch({
      seed: S.seed, mode: 'salvage', factions: ['sovereign', 'degen'], lesson: S.lessonCourse,
    });
    let guard = 0;
    while (guard++ < 16) {
      if ((S.lessonStep ?? 0) > step) break;
      if (S.lessonStep === step && S.turn === 0 && !lessonPending(S)) break;
      if (lessonPending(S)) { settleLesson(S); continue; }
      if (S.turn !== 0) {
        const a = lessonAction(S, 1);
        if (!a || !applyAction(S, 1, a).ok) break;
        continue;
      }
      if (S.lessonStep === step) break;
      const a = lessonScript(S);
      if (!a || !applyAction(S, 0, a).ok) break;
    }
    push();
  }

  return {
    send(a) {
      if (dead || S.over) return;
      const r = applyAction(S, 0, a);
      if (!r.ok) return h.onMessage({ t: 'reject', why: r.error ?? 'rejected' });
      follow();
    },
    seek,
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
    h.onSocket?.('connecting');
    ws = new WebSocket(wsUrl());
    ws.onopen = () => {
      h.onSocket?.('open');
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
    ws.onclose = () => {
      h.onSocket?.('closed');
      if (!closed) retry = setTimeout(open, 1200);
    };   // the token gets us the seat back
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
