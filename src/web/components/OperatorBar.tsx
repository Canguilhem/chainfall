import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import { FACTIONS, MAXGAS, type Mode, type PublicPlayer } from '../../engine/index.ts';
import { cn } from '../lib/utils.ts';
import { FactionMark, PowerPreview, LiveHp } from './Marks.tsx';
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
  children: ReactNode;
};

/** One seat's board row: identity/HP left, Assets center, gas right. */
export function OperatorLane({
  player, isMine, mode, targetable, canPower, canEnd, powerWhy, endWhy,
  onPlayer, onPower, onEnd, children,
}: Props) {
  const crew = FACTIONS[player.faction];
  const handSummary = mode === 'salvage'
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

  const myActs = (
    <div className="acts">
      <Tip text={!canPower ? powerWhy : crew.power.text}>
        <button className="power" disabled={!canPower} onClick={onPower}
                aria-label={`${crew.power.name}, ${crew.power.cost} gas, ${crew.power.text}`}>
          <PowerPreview faction={player.faction} />
        </button>
      </Tip>
      <Tip text={!canEnd ? endWhy : 'Seal the block, end your turn'}>
        <button className="seal" disabled={!canEnd} onClick={onEnd}
                aria-label="Seal the block">
          SEAL
        </button>
      </Tip>
    </div>
  );

  const oppPower = (
    <Tip text={crew.power.text} contentClassName="tip-panel">
      <div className="power lane-opp-pwr" tabIndex={0}
           aria-label={`${crew.power.name}: ${crew.power.text}`}>
        <PowerPreview faction={player.faction} />
      </div>
    </Tip>
  );

  return (
    <div className={cn('lane', isMine ? 'you' : 'them')}>
      <div className="lane-id">
        {/* Mirror across the midline: their power sits above the plate, yours below. */}
        {!isMine && oppPower}
        {plate}
        {isMine && myActs}
      </div>

      <div className={cn('board', isMine ? 'you' : 'them')}>
        {children}
      </div>

      <div className="lane-gas">
        <div className="gasbar" aria-label={`${player.gas} of ${player.maxGas} gas`}>
          {Array.from({ length: MAXGAS }, (_, index) => (
            <span key={index} className={cn('pip', index < player.gas && 'on', spent.has(index) && 'spent')} />
          ))}
          <span className="gasnum">{player.gas}/{player.maxGas} gas</span>
        </div>
        <span className="handnum">{handSummary}</span>
      </div>
    </div>
  );
}
