import { FACTIONS, type MatchView } from '../../engine/index.ts';
import { FactionMark } from './Marks.tsx';

export function Recap({ v, won, why, payout }: { v: MatchView; won: boolean | null; why: string; payout?: number | null }) {
  const youF = FACTIONS[v.you.faction];
  const themF = FACTIONS[v.them.faction];
  const block = String(v.block).padStart(3, '0');
  const blurb = won === null
    ? `Both of you hit 0 on block ${block}.`
    : won
      ? `They went down on block ${block}.`
      : `You went down on block ${block}.`;
  const bar = (hp: number, max: number) => (
    <div className="recap-bar"><i style={{ width: `${Math.min(100, Math.max(0, hp) / max * 100)}%` }} /></div>
  );
  const row = (label: string, a: number, b: number) => (
    <tr><th>{label}</th><td>{a}</td><td>{b}</td></tr>
  );
  return (
    <div className="recap">
      <p className="lede recap-lede">{blurb}</p>
      <div className="recap-hp">
        <div className="recap-side">
          <FactionMark faction={v.you.faction} size={16} />
          <div>
            <strong>{youF.name.replace('The ', '').toUpperCase()}</strong>
            <small>you · {Math.max(0, v.you.hp)} HP</small>
          </div>
          {bar(v.you.hp, v.you.maxHp)}
        </div>
        <div className="recap-side them">
          <FactionMark faction={v.them.faction} size={16} />
          <div>
            <strong>{themF.name.replace('The ', '').toUpperCase()}</strong>
            <small>them · {Math.max(0, v.them.hp)} HP</small>
          </div>
          {bar(v.them.hp, v.them.maxHp)}
        </div>
      </div>
      <div className="recap-stat recap-blocks">
        <b>{v.block}</b>
        <span>blocks</span>
      </div>
      <table className="recap-board">
        <thead>
          <tr><th></th><th>you</th><th>them</th></tr>
        </thead>
        <tbody>
          {row('cards played', v.you.cardsPlayed, v.them.cardsPlayed)}
          <tr className="recap-sec"><th colSpan={3}>damage</th></tr>
          {row('dealt', v.you.dmgDealt, v.them.dmgDealt)}
          {row('received', v.you.dmgTaken, v.them.dmgTaken)}
          {row('self inflicted', v.you.dmgSelf, v.them.dmgSelf)}
        </tbody>
      </table>
      <p className="recap-meta">{v.mode === 'salvage' ? 'Salvage Run' : 'Constructed'} · {why}</p>
      {payout != null && <p className="recap-meta recap-pay">Payout · +{payout} scrip</p>}
    </div>
  );
}
