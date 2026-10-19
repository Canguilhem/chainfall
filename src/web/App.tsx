import { useEffect, useRef, useState } from 'react';
import { type Mode, type PlayableFaction } from '../engine/index.ts';
import { AppHeader } from './components/AppHeader.tsx';
import { LobbyVeil } from './components/LobbyVeil.tsx';
import { MatchOverlays } from './components/MatchOverlays.tsx';
import { MatchTable } from './components/MatchTable.tsx';
import { TooltipProvider } from './components/ui/tooltip.tsx';
import { customKitError, loadDeckSource } from './decks.ts';
import { useStash } from './stash.ts';
import { useFlyLists } from './anim.tsx';
import { useCoarsePointer, usePhoneLayout, useShortLandscape } from './media.ts';
import { Lesson, Sensei } from './components/Lesson.tsx';
import { useCoach } from './hooks/useCoach.ts';
import { ORIENT, continueCourse, lessonCue } from './lesson.ts';
import type { LessonCourse } from '../engine/index.ts';
import { useLobbyRoute } from './hooks/useLobbyRoute.ts';
import { useMatchInput } from './hooks/useMatchInput.ts';
import { useMatchSession } from './hooks/useMatchSession.ts';
import { useMatchActions } from './hooks/useMatchActions.ts';
import type { DeckSource, Opponent } from './match/types.ts';

export function App() {
  const mode: Mode = 'salvage';
  const [opponent, setOpponent] = useState<Opponent>('bot');
  const [deckSource] = useState<DeckSource>(loadDeckSource);
  const [lexicon, setLexicon] = useState(false);
  const [look, setLook] = useState(0);

  const phone = usePhoneLayout();
  const short = useShortLandscape();
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
    begin, send, seek, lessonReached, flash, goLobby: sessionGoLobby, lesson, leaveMatch,
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
  const beat = lesson && v && screen.id === 'match' ? lessonCue(v) : null;
  const spotlight = beat && v?.course === 'table' && look < ORIENT.length ? ORIENT[look]! : null;
  const onward = v?.course ? continueCourse(v.course) : null;
  const ledgerLook = !spotlight && v?.course === 'table' && v.lesson === 'done';
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

  const startLesson = (course: LessonCourse = 'table') => {
    setLook(0);
    begin('sovereign', { lesson: course });
  };

  const playSalvage = (faction: PlayableFaction) => {
    if (opponent === 'human') return flash('versus coming soon — play solo for now');
    begin(faction, { mode: 'salvage' });
  };

  const playDeck = (faction: PlayableFaction) => {
    if (opponent === 'human') return flash('versus coming soon — play solo for now');
    const err = customKitError(faction, wallet);
    if (err) return flash(err);
    begin(faction, { mode: 'constructed', deck: 'custom' });
  };

  const sheetFeed = (phone || short) && !!v && v.mode === 'salvage' && screen.id === 'match'
    && (feedOpen || (actions.claiming && !feedShut
      && !spotlight));
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
          coach={coach && !beat}
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
          lesson={beat}
          spotlight={spotlight?.region ?? null}
        />
      </div>

      <LobbyVeil
        screen={screen}
        v={v}
        payout={payout}
        opponent={opponent}
        wallet={wallet}
        onOpponent={setOpponent}
        onBegin={playSalvage}
        onPlayDeck={playDeck}
        onGoLobby={goLobby}
        onBuyPack={buyPack}
        onOpenPack={openPack}
        onCraft={craft}
        onSalvage={salvage}
        onLearn={startLesson}
      />
      {beat && <Lesson beat={beat} focus={spotlight?.region ?? (ledgerLook ? 'ledger' : null)} />}
      {beat && (
        <Sensei
          say={spotlight ? spotlight.say : beat.hint}
          cue={spotlight ? 'Look' : beat.cue}
          notion={spotlight ? undefined : beat.notion}
          step={beat.index}
          steps={beat.steps}
          closing={beat.closing}
          prefer={phone ? 'tr' : 'br'}
          reached={lessonReached}
          onNext={spotlight ? () => setLook(n => n + 1) : undefined}
          onStep={spotlight ? undefined : seek}
          onContinue={beat.closing && onward ? () => startLesson(onward) : undefined}
          onSkip={onward ? () => startLesson(onward) : leaveMatch}
          skipLabel={onward ? 'Next' : 'Lobby'}
          onLeave={leaveMatch}
          onPlay={() => begin('sovereign')}
        />
      )}

      <MatchOverlays
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
