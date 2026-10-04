import { CARDS, CARD_IDS, FACTIONS, type CardId, type MatchView } from '../../engine/index.ts';
import { CardFace } from './Card.tsx';
import { FactionMark } from './Marks.tsx';

function idByName(name: string): CardId | null {
  const key = name.trim().toLowerCase();
  for (const id of CARD_IDS) {
    if (CARDS[id].n.toLowerCase() === key) return id;
  }
  return null;
}

/** The card behind the last blow in this match, if the log names one. */
function finishingCard(log: MatchView['log']): CardId | null {
  let played: CardId | null = null;
  for (let i = log.length - 1; i >= 0; i--) {
    const text = log[i]!.text;
    if (text === 'you walk free' || text === 'you fell') continue;
    if (/^block \d{3}/.test(text)) break;
    const hit = text.match(/^(.+?) (?:→|×) /);
    if (hit) {
      const id = idByName(hit[1]!);
      if (id) return id;
    }
    const play = text.match(/^(?:you|foe) · (?:deploy|run) (.+?) · -/);
    if (play && !played) played = idByName(play[1]!);
  }
  return played;
}

export function Recap({ v, won, why, payout }: { v: MatchView; won: boolean | null; why: string; payout?: number | null }) {
  const youF = FACTIONS[v.you.faction];
  const themF = FACTIONS[v.them.faction];
  const block = String(v.block).padStart(3, '0');
  const blurb = won === null
    ? `Both crews hit 0 on block ${block}.`
    : won
      ? `They went down on block ${block}.`
      : `You went down on block ${block}.`;
  const outcome = won === null ? 'draw' : won ? 'win' : 'loss';
  const dmgLead = v.you.dmgDealt - v.them.dmgDealt;
  const blow = finishingCard(v.log);

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
            <strong>{youF.name.replace('The ', '').toUpperCase()}</strong>
            <small>you · {Math.max(0, v.you.hp)} HP</small>
          </div>
          {bar(v.you.hp, v.you.maxHp)}
          {won === true && <em className="recap-tag">SURVIVED</em>}
          {won === false && <em className="recap-tag down">DOWN</em>}
        </div>
        <div className="recap-vs">
          {blow && (
            <div className="recap-blow">
              <CardFace id={blow} tips={false} />
              <span>last blow</span>
            </div>
          )}
          <b>{v.block}</b>
          <span>blocks</span>
        </div>
        <div className={`recap-fighter them${won === false ? ' victor' : won === true ? ' fallen' : ''}`}>
          <FactionMark faction={v.them.faction} size={22} />
          <div>
            <strong>{themF.name.replace('The ', '').toUpperCase()}</strong>
            <small>them · {Math.max(0, v.them.hp)} HP</small>
          </div>
          {bar(v.them.hp, v.them.maxHp)}
          {won === false && <em className="recap-tag">SURVIVED</em>}
          {won === true && <em className="recap-tag down">DOWN</em>}
        </div>
      </div>

      {won === true && (
        <div className="recap-hero">
          <span className="recap-hero-kicker">damage dealt</span>
          <b>{v.you.dmgDealt}</b>
          {dmgLead > 0 && <small>+{dmgLead} more than them</small>}
        </div>
      )}
      {won === false && (
        <div className="recap-hero loss">
          <span className="recap-hero-kicker">damage taken</span>
          <b>{v.you.dmgTaken}</b>
        </div>
      )}

      <table className="recap-board">
        <thead>
          <tr><th></th><th>you</th><th>them</th></tr>
        </thead>
        <tbody>
          {row('cards played', v.you.cardsPlayed, v.them.cardsPlayed)}
          <tr className="recap-sec"><th colSpan={3}>damage</th></tr>
          {row('dealt', v.you.dmgDealt, v.them.dmgDealt, v.you.dmgDealt > v.them.dmgDealt ? 'you' : v.them.dmgDealt > v.you.dmgDealt ? 'them' : null)}
          {row('received', v.you.dmgTaken, v.them.dmgTaken)}
          {row('self inflicted', v.you.dmgSelf, v.them.dmgSelf)}
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
