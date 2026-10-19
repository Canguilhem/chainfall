import { FACTIONS, type MatchView } from '../../engine/index.ts';
import { FactionMark } from './Marks.tsx';

export function Recap({ v, won, why, payout }: { v: MatchView; won: boolean | null; why: string; payout?: number | null }) {
  const youF = FACTIONS[v.you.faction];
  const themF = FACTIONS[v.them.faction];
  const youName = youF.name.replace(/^The /i, '');
  const themName = themF.name.replace(/^The /i, '');
  const youHp = Math.max(0, v.you.hp);
  const themHp = Math.max(0, v.them.hp);
  const blurb = won === null
    ? `Both crews hit 0 on block ${v.block}.`
    : won
      ? `${themName} hit 0. You have ${youHp} left.`
      : `You hit 0. ${themName} has ${themHp} left.`;
  const outcome = won === null ? 'draw' : won ? 'win' : 'loss';

  const bar = (hp: number, max: number) => (
    <div className="recap-bar"><i style={{ width: `${Math.min(100, Math.max(0, hp) / max * 100)}%` }} /></div>
  );
  const row = (label: string, a: number, b: number, hot?: 'you' | 'them' | null) => (
    <tr className={hot ? `recap-hot-${hot}` : undefined}>
      <th>{label}</th>
      <td>{a}</td>
      <td>{b}</td>
    </tr>
  );

  return (
    <div className={`recap recap-${outcome}`}>
      <p className="lede recap-lede">{blurb}</p>

      <div className="recap-arena" aria-label="Final score">
        <div className={`recap-fighter${won === true ? ' victor' : won === false ? ' fallen' : ''}`}>
          <FactionMark faction={v.you.faction} size={22} />
          <div>
            <strong>{youName.toUpperCase()}</strong>
            <small>you</small>
          </div>
          <b className="recap-hp">{youHp}</b>
          {bar(v.you.hp, v.you.maxHp)}
          {won === true && <em className="recap-tag">WON</em>}
          {won === false && <em className="recap-tag down">LOST</em>}
        </div>
        <div className="recap-vs">
          <b>{v.block}</b>
          <span>blocks</span>
        </div>
        <div className={`recap-fighter them${won === false ? ' victor' : won === true ? ' fallen' : ''}`}>
          <FactionMark faction={v.them.faction} size={22} />
          <div>
            <strong>{themName.toUpperCase()}</strong>
            <small>them</small>
          </div>
          <b className="recap-hp">{themHp}</b>
          {bar(v.them.hp, v.them.maxHp)}
          {won === false && <em className="recap-tag">WON</em>}
          {won === true && <em className="recap-tag down">LOST</em>}
        </div>
      </div>

      <table className="recap-board">
        <thead>
          <tr><th></th><th>you</th><th>them</th></tr>
        </thead>
        <tbody>
          {row('cards played', v.you.cardsPlayed, v.them.cardsPlayed)}
          <tr className="recap-sec"><th colSpan={3}>damage</th></tr>
          {row('dealt', v.you.dmgDealt, v.them.dmgDealt, v.you.dmgDealt > v.them.dmgDealt ? 'you' : v.them.dmgDealt > v.you.dmgDealt ? 'them' : null)}
          {row('received', v.you.dmgTaken, v.them.dmgTaken)}
          {row('to themselves', v.you.dmgSelf, v.them.dmgSelf)}
        </tbody>
      </table>

      <div className="recap-foot">
        <p className="recap-meta">{v.mode === 'salvage' ? 'Salvage Run' : 'Constructed'} · {why}</p>
        {payout != null && (
          <div className={`recap-payout${won === true ? ' win' : ''}`}>
            <span>payout</span>
            <b>+{payout}</b>
            <em>scrip</em>
          </div>
        )}
      </div>
    </div>
  );
}
