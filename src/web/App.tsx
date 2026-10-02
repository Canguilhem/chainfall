import { useEffect, useRef, useState } from 'react';
import { type Mode, type PlayableFaction } from '../engine/index.ts';
import { AppHeader } from './components/AppHeader.tsx';
import { LobbyVeil } from './components/LobbyVeil.tsx';
import { MatchOverlays } from './components/MatchOverlays.tsx';
import { MatchTable } from './components/MatchTable.tsx';
import { TooltipProvider } from './components/ui/tooltip.tsx';
import { customKitError, loadDeckSource, saveDeckSource } from './decks.ts';
import { useStash } from './stash.ts';
import { useFlyLists } from './anim.tsx';
import { useCoarsePointer, usePhoneLayout } from './media.ts';
import { useCoach } from './hooks/useCoach.ts';
import { useLobbyRoute } from './hooks/useLobbyRoute.ts';
import { useMatchInput } from './hooks/useMatchInput.ts';
import { useMatchSession } from './hooks/useMatchSession.ts';
import { useMatchActions } from './hooks/useMatchActions.ts';
import type { DeckSource, Opponent } from './match/types.ts';

export function App() {
  const [mode, setMode] = useState<Mode>('salvage');
  const [opponent, setOpponent] = useState<Opponent>('bot');
  const [deckSource, setDeckSource] = useState<DeckSource>(loadDeckSource);
  const [lexicon, setLexicon] = useState(false);

  const phone = usePhoneLayout();
  const coarse = useCoarsePointer();
  const { add, wallet, buyPack, openPack, craft, salvage, awardScrip } = useStash();

  const inputCallbacks = useRef({
    resetInput: () => {},
    clearPeek: () => {},
    resetTargeting: () => {},
  });

  const session = useMatchSession({
    mode,
    opponent,
    deckSource,
    wallet,
    onAddCards: add,
    awardScrip,
    resetInput: () => inputCallbacks.current.resetInput(),
    clearPeek: () => inputCallbacks.current.clearPeek(),
    onViewResetTargeting: () => inputCallbacks.current.resetTargeting(),
  });

  const {
    screen, setScreen, v, conn, notice, lines, logRef, payout, first, fighting,
    begin, send, flash, goLobby: sessionGoLobby,
  } = session;

  const goLobby = useLobbyRoute(screen, setScreen, sessionGoLobby);

  const input = useMatchInput();
  inputCallbacks.current = {
    resetInput: input.resetInput,
    clearPeek: input.clearPeek,
    resetTargeting: input.resetTargeting,
  };

  const {
    pending, sel, peek,
    feedOpen, setFeedOpen, feedShut, setFeedShut,
    resetInput, setPeek,
  } = input;

  const { coach, dismissCoach } = useCoach(v);
  const fly = useFlyLists(v, !!v);

  const actions = useMatchActions({
    v,
    input: {
      pending, setPending: input.setPending, sel, setSel: input.setSel,
      setPeek, resetTargeting: input.resetTargeting,
    },
    send,
    flash,
    coarse,
  });

  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      resetInput();
      setLexicon(false);
      if (screen.id === 'docs' || screen.id === 'deck') goLobby('start');
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [screen.id, resetInput, goLobby]);

  useEffect(() => { if (!actions.awaitingClaim) setFeedShut(false); }, [actions.awaitingClaim, setFeedShut]);

  useEffect(() => {
    if (opponent === 'human') setOpponent('bot');
  }, [opponent]);

  const pickDeckSource = (source: DeckSource) => {
    setDeckSource(source);
    saveDeckSource(source);
  };

  const startMatch = (faction: PlayableFaction) => {
    if (opponent === 'human') return flash('versus coming soon — play solo for now');
    if (mode === 'constructed' && deckSource === 'custom') {
      const err = customKitError(faction, wallet);
      if (err) return flash(err);
    }
    begin(faction);
  };

  const sheetFeed = phone && !!v && v.mode === 'salvage' && screen.id === 'match'
    && (feedOpen || (actions.claiming && !feedShut));
  const peeked = peek != null ? fly.hand[peek] : undefined;

  return (
    <TooltipProvider delayDuration={150}>
    <>
      <AppHeader
        fighting={fighting}
        screen={screen}
        v={v}
        conn={conn}
        notice={notice}
        phase={actions.phase}
        lexicon={lexicon}
        onLexicon={() => setLexicon(on => !on)}
        wallet={wallet}
        onGoLobby={goLobby}
      />

      <div id="app" className={fighting ? '' : 'dormant'}>
        <MatchTable
          v={v}
          inMatch={screen.id === 'match'}
          lines={lines}
          logRef={logRef}
          first={first}
          fly={fly}
          phone={phone}
          coach={coach}
          onDismissCoach={dismissCoach}
          pending={pending}
          sel={sel}
          peek={peek}
          seat={actions.seat}
          marked={actions.marked}
          hint={actions.hint}
          aiming={actions.aiming}
          claiming={actions.claiming}
          awaitingClaim={actions.awaitingClaim}
          canPower={actions.canPower}
          canEnd={actions.canEnd}
          endWhy={actions.endWhy}
          onCancelTarget={actions.cancelTarget}
          onAsset={actions.onAsset}
          onPlayerTarget={actions.onPlayerTarget}
          onPower={() => send({ t: 'power' })}
          onEnd={actions.onEnd}
          onCard={actions.onCard}
          onFeedOpen={() => setFeedOpen(true)}
          send={send}
        />
      </div>

      <LobbyVeil
        screen={screen}
        v={v}
        payout={payout}
        mode={mode}
        opponent={opponent}
        deckSource={deckSource}
        wallet={wallet}
        onMode={setMode}
        onOpponent={setOpponent}
        onDeckSource={pickDeckSource}
        onBegin={startMatch}
        onGoLobby={goLobby}
        onBuyPack={buyPack}
        onOpenPack={openPack}
        onCraft={craft}
        onSalvage={salvage}
      />

      <MatchOverlays
        fighting={fighting}
        v={v}
        fly={fly}
        sheetFeed={sheetFeed}
        claiming={actions.claiming}
        peeked={peeked}
        lexicon={lexicon}
        onClaim={i => { send({ t: 'claim', i }); setFeedOpen(false); }}
        onFeedClose={() => { setFeedOpen(false); setFeedShut(true); }}
        onPlayPeeked={() => actions.playCard(peeked!.id, peek!)}
        onClosePeek={() => setPeek(null)}
        onCloseLexicon={() => setLexicon(false)}
      />
    </>
    </TooltipProvider>
  );
}
