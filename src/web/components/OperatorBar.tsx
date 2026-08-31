import { FACTIONS, MAXGAS, type Mode, type PublicPlayer } from '../../engine/index.ts';
import { FactionMark, PowerMark, PowerPreview, LiveHp } from './Marks.tsx';
import { Tip } from './Tip.tsx';

export function OperatorBar({ player, isMine, mode, targetable, canPower, canEnd, powerWhy, endWhy, onPlayer, onPower, onEnd }: {
  player: PublicPlayer; isMine: boolean; mode: Mode; targetable: boolean;
  canPower?: boolean; canEnd?: boolean;
  powerWhy?: string; endWhy?: string;
  onPlayer: () => void; onPower?: () => void; onEnd?: () => void;
}) {
  const crew = FACTIONS[player.faction];
  const handSummary = mode === 'salvage'
    ? `${player.handCount} in hand`
    : `${player.deckCount} left · ${player.handCount} in hand`;
  return (
    <div className={`rail${isMine ? ' you' : ' them'}`}>
      <div className="operator">
        <div className={targetable ? 'plate is-targetable' : 'plate'}
             tabIndex={targetable ? 0 : -1} onClick={onPlayer}
             aria-label={`${crew.name}, ${isMine ? 'you' : 'them'}`}
             onKeyDown={event => {
               if (event.key === 'Enter' || event.key === ' ') {
                 event.preventDefault();
                 onPlayer();
               }
             }}>
          <FactionMark faction={player.faction} size={18} />
          <Tip text={targetable ? (isMine ? 'click to target yourself' : 'click to target them') : undefined}>
            <div className="callsign">{crew.name.toUpperCase()}{isMine && <small>you</small>}</div>
          </Tip>
          <LiveHp n={Math.max(0, player.hp)} damaged={player.hp < player.maxHp} />
          {player.armor > 0 && (
            <Tip text="Armor soaks damage before HP">
              <div className="armor">+{player.armor}</div>
            </Tip>
          )}
        </div>
        <div className="gasbar">
          {Array.from({ length: MAXGAS }, (_, index) => (
            <span key={index} className={`pip${index < player.gas ? ' on' : ''}`} />
          ))}
          <span className="gasnum">{player.gas}/{player.maxGas} gas<span className="gas-extra"> · {handSummary}</span></span>
        </div>
        {!isMine && <div className="tag pwr-tag"><PowerMark size={13} />{crew.power.name} · {crew.power.text}</div>}
      </div>
      {isMine && (
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
      )}
    </div>
  );
}
