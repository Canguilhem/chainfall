import { useCallback, useEffect, useRef, useState } from 'react';
import {
  type Action, type MatchView, type Mode, type PlayableFaction, type ServerMessage
} from '../../engine/index.ts';
import { kitForMatch, kitIdsForStash } from '../decks.ts';
import type { Wallet } from '../stash.ts';
import { localTransport, remoteTransport, type Transport } from '../transport.ts';
import type { DeckSource, Opponent, Screen } from '../match/types.ts';
import type { LobbyId } from '../match/routes.ts';

type LogLine = { n: number; text: string; kind: string };

type Options = {
  mode: Mode;
  opponent: Opponent;
  deckSource: DeckSource;
  wallet: Wallet;
  onAddCards: (ids: string[]) => void;
  awardScrip: (won: boolean | null) => number;
  resetInput: () => void;
  clearPeek: () => void;
  onViewResetTargeting: () => void;
};

export function useMatchSession({
  mode, opponent, deckSource, wallet, onAddCards, awardScrip, resetInput, clearPeek, onViewResetTargeting,
}: Options) {
  const [screen, setScreen] = useState<Screen>({ id: 'start' });
  const [v, setV] = useState<MatchView | null>(null);
  const [conn, setConn] = useState('offline');
  const [notice, setNotice] = useState('');
  const [lines, setLines] = useState<LogLine[]>([]);
  const [payout, setPayout] = useState<number | null>(null);

  const transport = useRef<Transport | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const seenLog = useRef(0);
  const deal = useRef(true);
  const paid = useRef(false);
  const onAddCardsRef = useRef(onAddCards);
  onAddCardsRef.current = onAddCards;
  const walletRef = useRef(wallet);
  walletRef.current = wallet;
  const deckSourceRef = useRef(deckSource);
  deckSourceRef.current = deckSource;

  if (screen.id !== 'match') deal.current = true;
  const first = deal.current;
  const fighting = screen.id === 'match';

  const flash = useCallback((m: string) => {
    setNotice(m);
    const t = setTimeout(() => setNotice(''), 1400);
    return () => clearTimeout(t);
  }, []);

  const send = useCallback((a: Action) => transport.current?.send(a), []);

  const goLobby = useCallback((id: LobbyId) => {
    if (screen.id === 'match') return;
    transport.current?.close();
    setV(null);
    setScreen({ id });
  }, [screen.id]);

  const begin = useCallback((faction: PlayableFaction) => {
    transport.current?.close();
    seenLog.current = 0;
    setLines([]);
    resetInput();
    const handlers = {
      onView: (nv: MatchView) => {
        setV(nv);
        onViewResetTargeting();
        clearPeek();
        const fresh = nv.log.filter(e => e.n >= seenLog.current);
        if (fresh.length) {
          seenLog.current = fresh[fresh.length - 1]!.n + 1;
          setLines(prev => [...prev, ...fresh]);
        }
        const matchCardIds = [...(nv.you.hand ?? [])];
        if (nv.mode === 'constructed') {
          matchCardIds.push(...kitIdsForStash(nv.you.faction, walletRef.current, deckSourceRef.current));
        }
        onAddCardsRef.current(matchCardIds);
      },
      onMessage: (message: ServerMessage) => {
        if (message.t === 'queued') setScreen({ id: 'queued' });
        else if (message.t === 'start') { setScreen({ id: 'match' }); setConn(opponent === 'bot' ? 'solo' : 'connected'); }
        else if (message.t === 'reject') flash(message.why);
        else if (message.t === 'timeout') flash('turn timed out');
        else if (message.t === 'opponentGone') setConn('dropped · clock held');
        else if (message.t === 'opponentBack') setConn('connected');
        else if (message.t === 'resumeFailed') setScreen({ id: 'start' });
        else if (message.t === 'over') setScreen({ id: 'over', won: message.won, why: message.why });
      }
    };
    const src = deckSourceRef.current;
    const kit = mode === 'constructed' ? kitForMatch(faction, walletRef.current, src) : undefined;
    transport.current = opponent === 'bot'
      ? localTransport(faction, mode, handlers, kit)
      : remoteTransport(faction, mode, handlers);
  }, [mode, opponent, flash, resetInput, clearPeek, onViewResetTargeting]);

  useEffect(() => () => transport.current?.close(), []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [lines]);
  useEffect(() => { if (screen.id === 'match') deal.current = false; }, [screen.id]);
  useEffect(() => {
    if (screen.id === 'match') { paid.current = false; setPayout(null); }
  }, [screen.id]);
  useEffect(() => {
    if (screen.id !== 'over' || paid.current) return;
    paid.current = true;
    setPayout(awardScrip(screen.won));
  }, [screen, awardScrip]);

  return {
    screen, setScreen,
    v,
    conn,
    notice,
    lines, logRef,
    payout,
    first,
    fighting,
    begin,
    send,
    flash,
    goLobby,
  };
}
