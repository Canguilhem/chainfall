import { AnimatePresence, LayoutGroup, motion } from 'motion/react';
import { FACTIONS, type Action, type MatchView, type ViewAsset } from '../../engine/index.ts';
import { useFlyLists, useRisingEdge, useStrikeFlash } from '../anim.tsx';
import { cn } from '../lib/utils.ts';
import { useEffect, useState } from 'react';
import { deadWhy, isPlayable, powerWhy, boardSlots } from '../match/legality.ts';
import { useShortLandscape } from '../media.ts';
import type { Hint, Pending } from '../match/types.ts';
import { HandCard, FeedCard } from './Card.tsx';
import { BoardAsset } from './Board.tsx';
import { OperatorLane } from './OperatorBar.tsx';
import { PowerPreview } from './Marks.tsx';
import { LedgerLog, type LogLine } from './Ledger.tsx';
import { Ticker } from './Ticker.tsx';
import { type LessonBeat, type OrientRegion } from '../lesson.ts';

type FlyLists = ReturnType<typeof useFlyLists>;

type Props = {
  v: MatchView | null;
  inMatch: boolean;
  lines: LogLine[];
  logRef: React.RefObject<HTMLDivElement | null>;
  first: boolean;
  fly: FlyLists;
  phone: boolean;
  coach: boolean;
  onDismissCoach: () => void;
  pending: Pending;
  sel: number | null;
  peek: number | null;
  seat: 0 | 1;
  marked: { assets: Set<number>; heroes: Set<number> };
  hint: Hint;
  aiming: boolean;
  claiming: boolean;
  awaitingClaim: boolean;
  canPower: boolean;
  canEnd: boolean;
  endWhy: string | undefined;
  onCancelTarget: () => void;
  onAsset: (a: ViewAsset, mine: boolean) => void;
  onPlayerTarget: (mine: boolean) => void;
  onPower: () => void;
  onEnd: () => void;
  onCard: (id: string, i: number) => void;
  onFeedOpen: () => void;
  send: (action: Action) => void;
  lesson: LessonBeat | null;
  /** Which part of the table Sensei is showing, before the first claim. */
  spotlight: OrientRegion | null;
};

export function MatchTable({
  v, inMatch, lines, logRef, first, fly, phone, coach, onDismissCoach,
  pending, sel, peek, seat, marked, hint, aiming, claiming, awaitingClaim,
  canPower, canEnd, endWhy,
  onCancelTarget, onAsset, onPlayerTarget, onPower, onEnd, onCard, onFeedOpen, send,
  lesson, spotlight,
}: Props) {
  const yourBlock = useRisingEdge(inMatch ? v?.yourTurn : false);
  const striking = useStrikeFlash(inMatch ? lines : [], v);
  const short = useShortLandscape();
  const [handOpen, setHandOpen] = useState(false);
  const stacked = phone || short;
  const teaching = !!lesson;
  const drawers = !phone && !short;
  const [ledgerOpen, setLedgerOpen] = useState(false);
  const sealDialog = !teaching && stacked && hint.phase === 'seal' && canEnd && !aiming;
  const sealHere = !teaching && stacked && canEnd && !aiming && !sealDialog;
  const lessonSeal = teaching && lesson?.cue === 'Seal';
  const lessonPower = teaching && lesson?.cue === 'Power';
  const lanePower = canPower && (!lesson || lessonPower);
  const laneEnd = canEnd && (!teaching || lessonSeal);
  const promptActs = lessonSeal;
  const lessonFloat = teaching && aiming && !promptActs && !sealHere && !sealDialog;
  const teachLedger = v?.course === 'table' && lesson?.id === 'done';

  useEffect(() => {
    if (!drawers) setLedgerOpen(false);
  }, [drawers]);
  useEffect(() => {
    if (teachLedger && drawers) setLedgerOpen(true);
  }, [teachLedger, drawers]);
  useEffect(() => {
    if (!ledgerOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (teachLedger) return;
      if (event.key === 'Escape') setLedgerOpen(false);
    };
    const onPointer = (event: PointerEvent) => {
      if (teachLedger) return;
      const node = event.target;
      if (!(node instanceof Element)) return;
      if (node.closest('#ledger, .drawer-tab')) return;
      setLedgerOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointer);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointer);
    };
  }, [ledgerOpen, teachLedger]);

  return (
    <main className={drawers ? 'drawers' : undefined} data-drawer={ledgerOpen ? 'ledger' : undefined}>
      <div id="table" data-phase={hint.phase}
           data-lesson-hero={lesson?.spotHero ? '1' : undefined}
           data-lesson-power={lesson?.spotPower ? '1' : undefined}
           data-lesson-seal={lessonSeal ? '1' : undefined}
           data-lesson-region={spotlight ?? undefined}
           data-hand={short ? (handOpen ? 'open' : 'shut') : undefined}
           className={cn(
             claiming && 'claiming',
             aiming && 'aiming',
             pending && 'targeting',
             yourBlock && 'your-block',
           )}>
        {drawers && (
          <button type="button" className={cn('drawer-tab', 'right', ledgerOpen && 'on')}
                  aria-expanded={ledgerOpen} aria-controls="ledger"
                  onClick={() => setLedgerOpen(open => !open)}>
            Ledger
          </button>
        )}
        <LayoutGroup>
        {inMatch && <Ticker lines={lines} openLedger={teachLedger} />}
        {v ? (
          <OperatorLane
            player={v.them} isMine={false} mode={v.mode} stacked={stacked}
            targetable={marked.heroes.has(1 - seat)}
            onPlayer={() => onPlayerTarget(false)}
          >
            <AnimatePresence mode="popLayout">
              {boardSlots(v.them.board).map((a, i) => a
                ? <BoardAsset key={a.uid} flyId={fly.fly(a.uid)} first={first} fresh={fly.deployed.has(a.uid)}
                         asset={a} isMine={false} isReady={false} isSelected={false}
                         striking={striking.has(a.uid)}
                         isTargetable={marked.assets.has(a.uid)} onClick={() => onAsset(a, false)} />
                : <motion.div key={`them-${i}`} layout className="slot" aria-hidden />)}
            </AnimatePresence>
          </OperatorLane>
        ) : (
          <div className="board them">
            {boardSlots(undefined).map((_, i) => <div key={`them-${i}`} className="slot" aria-hidden />)}
          </div>
        )}
        {v?.mode === 'salvage' && (phone || short) && (
          <button type="button" id="feedbtn" className={claiming ? 'go' : ''}
                  onClick={onFeedOpen}>
            <b>{claiming ? 'CLAIM FROM THE FEED' : 'SHARED FEED'}</b>
            <em>{v.feedRemaining} left</em>
          </button>
        )}
        {v?.mode === 'salvage' && !phone && !short && (
          <div id="feed" className={`on${claiming ? ' claim' : ''}`}>
            <div className={`fl${claiming ? ' go' : ''}`}>
              <b>SHARED FEED</b>
              {claiming ? <span className="fl-claim">CLAIM</span> : <span>market</span>}
              <em>{v.feedRemaining} left</em>
            </div>
            {fly.feed.map((item, i) => (
              <FeedCard key={item.key} flyId={item.key} first={first} id={item.id}
                        claimable={claiming} onClick={() => send({ t: 'claim', i })} />
            ))}
          </div>
        )}
        <div id="prompt" className={cn(hint.phase, yourBlock && 'flash', sealDialog && 'holding', teaching && 'lesson', teaching && !promptActs && !sealHere && !sealDialog && 'quiet')} aria-live="polite">
          {!lesson && (
            <span className="prompt-text">{sealDialog ? '' : hint.text}</span>
          )}
          {promptActs && v && (
            <>
              <button className="power" type="button" disabled={!lanePower} onClick={onPower}
                      aria-label={`${FACTIONS[v.you.faction].power.name}, ${FACTIONS[v.you.faction].power.cost} gas`}>
                <PowerPreview faction={v.you.faction} />
              </button>
              {!sealHere && (
                <button className="seal" type="button" disabled={!laneEnd} onClick={onEnd}
                        aria-label="Seal the block">
                  SEAL
                </button>
              )}
            </>
          )}
          {sealHere && (
            <button className="seal" type="button" onClick={onEnd} aria-label="Seal the block">
              SEAL
            </button>
          )}
          {aiming && !lessonFloat && (
            <button className="skip cancel" type="button" onClick={onCancelTarget}>cancel</button>
          )}
          {coach && hint.extra && !sealDialog && <span className="prompt-extra">{hint.extra}</span>}
          {coach && inMatch && v?.yourTurn && !aiming && !sealDialog && (
            <button className="skip" type="button" onClick={onDismissCoach}>skip hints</button>
          )}
          {sealDialog && (
            <div className="seal-dialog" role="dialog" aria-label="Seal the block">
              <p>{hint.text}</p>
              <button className="seal" type="button" onClick={onEnd}>SEAL</button>
            </div>
          )}
        </div>
        {v ? (
          <OperatorLane
            player={v.you} isMine mode={v.mode} stacked={stacked}
            acts={!promptActs}
            targetable={marked.heroes.has(seat)}
            canPower={lanePower} canEnd={laneEnd}
            powerWhy={powerWhy(v, !!pending)} endWhy={endWhy}
            onPlayer={() => onPlayerTarget(true)}
            onPower={onPower} onEnd={onEnd}
            onCancel={lessonFloat ? onCancelTarget : undefined}
          >
            <AnimatePresence mode="popLayout">
              {boardSlots(v.you.board).map((a, i) => a
                ? <BoardAsset key={a.uid} flyId={fly.fly(a.uid)} shared={fly.deployed.has(a.uid)}
                         first={first} fresh={fly.deployed.has(a.uid)} asset={a} isMine
                         striking={striking.has(a.uid)}
                         isReady={a.canAttack && v.yourTurn && !pending && !awaitingClaim}
                         isSelected={sel === a.uid} isTargetable={marked.assets.has(a.uid)}
                         onClick={() => onAsset(a, true)} />
                : <motion.div key={`you-${i}`} layout className="slot" aria-hidden />)}
            </AnimatePresence>
          </OperatorLane>
        ) : (
          <div className="board you">
            {boardSlots(undefined).map((_, i) => <div key={`you-${i}`} className="slot" aria-hidden />)}
          </div>
        )}
        {short && (
          <button type="button" id="hand-tab" aria-expanded={handOpen}
                  onClick={() => setHandOpen(open => !open)}>
            <span>{handOpen ? 'Board' : 'Hand'}</span>
            <b>{fly.hand.length}</b>
          </button>
        )}
        <div id="hand" className={claiming ? 'locked' : ''}>
          {fly.hand.map((item, i) => (
            <HandCard key={item.key} flyId={item.key} shared={fly.claimed.has(item.key)}
                      fresh={fly.drawn.has(item.key)} first={first}
                      id={item.id} selected={pending?.i === i || peek === i}
                      playable={!!v && isPlayable(v, item.id)} why={v && !isPlayable(v, item.id) ? deadWhy(v, item.id) : undefined}
                      onClick={() => onCard(item.id, i)} />
          ))}
        </div>
        </LayoutGroup>
      </div>
      <aside id="ledger">
        <h2>the ledger</h2>
        <LedgerLog lines={lines} logRef={logRef} />
      </aside>
    </main>
  );
}
