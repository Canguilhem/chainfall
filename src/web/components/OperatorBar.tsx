import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { createPortal } from 'react-dom';
import { FACTIONS, MAXGAS, type Mode, type PublicPlayer } from '../../engine/index.ts';
import { cn } from '../lib/utils.ts';
import { FactionMark, PowerPreview, LiveHp, powerBlurb } from './Marks.tsx';
import { Tip } from './Tip.tsx';

type Props = {
  player: PublicPlayer;
  isMine: boolean;
  mode: Mode;
  targetable: boolean;
  canPower?: boolean;
  canEnd?: boolean;
  powerWhy?: string;
  endWhy?: string;
  onPlayer: () => void;
  onPower?: () => void;
  onEnd?: () => void;
  /** Lesson only. Sits on the top edge of this lane so selecting a card does not open a new row. */
  onCancel?: () => void;
  /** Phone / short window: one column, and SEAL lives in the prompt instead of this lane. */
  stacked?: boolean;
  /** `board` is the row of Assets. `status` is the plate, gas, and powers, for a drawer. */
  slot?: 'all' | 'board' | 'status';
  /** When the prompt already has FORK and SEAL, the drawer does not repeat them. */
  acts?: boolean;
  children: ReactNode;
};

/** The lesson Cancel, portaled so the spotlight cannot wash it out and the lane grid does not keep a cell for it. */
function LessonCancel({ onCancel, anchor }: { onCancel: () => void; anchor: RefObject<HTMLDivElement | null> }) {
  const [at, setAt] = useState<{ left: number; top: number; shift: string } | null>(null);
  useLayoutEffect(() => {
    let frame = 0;
    const place = () => {
      const el = anchor.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const label = document.querySelector('#feed .fl, #feedbtn');
      const below = label ? label.getBoundingClientRect().bottom + 8 : r.top;
      const stacked = el.classList.contains('stacked');
      const next = {
        left: Math.round(stacked ? r.right - 8 : r.left + r.width / 2),
        top: Math.round(Math.max(r.top, below)),
        shift: stacked ? '-100%' : '-50%',
      };
      setAt(prev => prev && prev.left === next.left && prev.top === next.top && prev.shift === next.shift ? prev : next);
      frame = requestAnimationFrame(place);
    };
    frame = requestAnimationFrame(place);
    return () => cancelAnimationFrame(frame);
  }, [anchor]);
  if (!at) return null;
  return createPortal(
    <button type="button" className="lesson-cancel" style={{ left: at.left, top: at.top, transform: `translate(${at.shift}, 0)` }} onClick={onCancel}>
      cancel
    </button>,
    document.body,
  );
}

/** One seat's board row: identity/HP left, Assets center, gas right. */
export function OperatorLane({
  player, isMine, mode, targetable, canPower, canEnd, powerWhy, endWhy,
  onPlayer, onPower, onEnd, onCancel, stacked, slot = 'all', acts = true, children,
}: Props) {
  const crew = FACTIONS[player.faction];
  const handSummary = stacked
    ? `${player.handCount} in hand`
    : mode === 'salvage'
      ? `${player.handCount} ${player.handCount === 1 ? 'card' : 'cards'} in hand`
      : `${player.deckCount} left · ${player.handCount} ${player.handCount === 1 ? 'card' : 'cards'} in hand`;

  const [plateHit, setPlateHit] = useState(false);
  const hitTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const onFlash = useCallback((dir: 'up' | 'down') => {
    if (dir !== 'down') return;
    clearTimeout(hitTimer.current);
    setPlateHit(true);
    hitTimer.current = setTimeout(() => setPlateHit(false), 420);
  }, []);
  useEffect(() => () => clearTimeout(hitTimer.current), []);

  const prevGas = useRef(player.gas);
  const [spent, setSpent] = useState<Set<number>>(() => new Set());
  useEffect(() => {
    if (player.gas < prevGas.current) {
      const next = new Set<number>();
      for (let i = player.gas; i < prevGas.current; i++) next.add(i);
      setSpent(next);
      prevGas.current = player.gas;
      const t = window.setTimeout(() => setSpent(new Set()), 420);
      return () => window.clearTimeout(t);
    }
    prevGas.current = player.gas;
  }, [player.gas]);

  const laneRef = useRef<HTMLDivElement>(null);
  const floatingCancel = onCancel ? <LessonCancel onCancel={onCancel} anchor={laneRef} /> : null;

  const plate = (
    <div className={cn('plate', targetable && 'is-targetable', plateHit && 'plate-hit')}
         tabIndex={targetable ? 0 : -1} onClick={onPlayer}
         aria-label={`${crew.name}, ${isMine ? 'you' : 'them'}`}
         onKeyDown={event => {
           if (event.key === 'Enter' || event.key === ' ') {
             event.preventDefault();
             onPlayer();
           }
         }}>
      <FactionMark faction={player.faction} size={18} />
      <div className="callsign">
        <span className="callsign-name">{crew.name.replace(/^The /i, '').toUpperCase()}</span>
        {isMine && <small>you</small>}
      </div>
      <div className="plate-stats">
        <LiveHp n={Math.max(0, player.hp)} damaged={player.hp < player.maxHp} tips={false} onFlash={onFlash} />
        {player.armor > 0 && (
          <Tip text="Armor soaks damage before HP">
            <div className="armor">+{player.armor}</div>
          </Tip>
        )}
      </div>
    </div>
  );

  const powerBtn = (
    <Tip text={!canPower ? powerWhy : crew.power.text}>
      <button className="power" disabled={!canPower} onClick={onPower}
              aria-label={`${crew.power.name}, ${crew.power.cost} gas, ${crew.power.text}`}>
        <PowerPreview faction={player.faction} />
      </button>
    </Tip>
  );
  const sealBtn = (
    <Tip text={!canEnd ? endWhy : 'Seal the block, end your turn'}>
      <button className="seal" disabled={!canEnd} onClick={onEnd}
              aria-label="Seal the block">
        SEAL
      </button>
    </Tip>
  );
  const myActs = (
    <div className="acts">
      {powerBtn}
      {!stacked && sealBtn}
    </div>
  );

  const theirs = powerBlurb(crew.power.text, true);
  const oppPower = (
    <Tip text={theirs} contentClassName="tip-panel">
      <div className="power lane-opp-pwr" tabIndex={0}
           aria-label={`${crew.power.name}: ${theirs}`}>
        <PowerPreview faction={player.faction} theirs />
      </div>
    </Tip>
  );

  const gas = (
    <div className="lane-gas">
      <div className="gasbar" aria-label={`${player.gas} of ${player.maxGas} gas`}>
        {Array.from({ length: MAXGAS }, (_, index) => (
          <span key={index} className={cn('pip', index < player.gas && 'on', spent.has(index) && 'spent')} />
        ))}
        <span className="gasnum">{player.gas}/{player.maxGas}{stacked ? '' : ' gas'}</span>
      </div>
      <span className="handnum">{handSummary}</span>
    </div>
  );
  const board = <div className={cn('board', isMine ? 'you' : 'them')}>{children}</div>;
  const status = <div className="lane-status">{plate}{gas}</div>;

  if (slot === 'board') {
    return <div className={cn('lane', 'board-only', isMine ? 'you' : 'them')}>{board}</div>;
  }

  if (slot === 'status') {
    return (
      <div className={cn('seat-card', 'lane', isMine ? 'you' : 'them')}>
        {!isMine && oppPower}
        {plate}
        {gas}
        {isMine && acts && myActs}
      </div>
    );
  }

  if (stacked) {
    return (
      <div ref={laneRef} className={cn('lane', 'stacked', isMine ? 'you' : 'them')}>
        {floatingCancel}
        {!isMine && oppPower}
        {!isMine && status}
        {board}
        {isMine && status}
        {isMine && myActs}
      </div>
    );
  }

  return (
    <div ref={laneRef} className={cn('lane', isMine ? 'you' : 'them')}>
      {floatingCancel}
      <div className="lane-id">
        {/* Mirror across the midline: their power sits above the plate, yours below. */}
        {!isMine && oppPower}
        {plate}
        {isMine && myActs}
      </div>
      {board}
      {gas}
    </div>
  );
}
