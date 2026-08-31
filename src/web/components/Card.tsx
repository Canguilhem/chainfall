import { CARDS, consensusHelp, CTEXT, FNAME, KWHELP, KWNAME, type CardId, type Faction } from '../../engine/index.ts';
import { useState, type ReactElement } from 'react';
import { Fly } from '../anim.tsx';
import { cn } from '../lib/utils.ts';
import { useCoarsePointer } from '../media.ts';
import { FactionMark, KwLine, StatChip, StatPair } from './Marks.tsx';
import { Tip, TipHit } from './Tip.tsx';

const cardKeywords = (id: string) => {
  const card = CARDS[id as CardId];
  return (('kw' in card ? card.kw : undefined) ?? []).filter(keyword => KWNAME[keyword]);
};

function ConsensusTip({ faction }: { faction: Faction }) {
  return (
    <div className="tip-consensus">
      <div className="tip-consensus-h">
        <FactionMark faction={faction} size={14} />
        <span>Consensus</span>
      </div>
      <p>{consensusHelp(faction)}</p>
    </div>
  );
}

/** Hero Realms-style ally row: rule above, then a rule + crew mark + bonus text. */
function ConsensusLine({ faction, text, tips = true }: { faction: Faction; text: string; tips?: boolean }) {
  const row = (
    <span className="card-consensus-row">
      <span className="card-consensus-fx">
        <FactionMark faction={faction} size={11} />
        <span className="card-consensus-text">{text}</span>
      </span>
    </span>
  );
  if (!tips) return row;
  return (
    <Tip content={<ConsensusTip faction={faction} />}>
      {row as ReactElement}
    </Tip>
  );
}

/** Whether CardNotes would say anything. `terse` is for callers that already
 *  render the card face beside the notes — there the rules text is on screen
 *  twice over, so only the keyword glosses and Consensus help are worth a box. */
export function hasNotes(id: string, terse = false): boolean {
  const card = CARDS[id as CardId];
  const rulesText = 'tx' in card ? card.tx : '';
  return cardKeywords(id).length > 0 || !!CTEXT[id as CardId] || (!terse && !!rulesText);
}

/** Everything a card's face is too small to say: keywords spelled out, rules
 *  text, and what Consensus actually costs you. Shared by the feed popover and
 *  both touch sheets so there is one copy of this prose. */
export function CardNotes({ id, terse }: { id: string; terse?: boolean }) {
  const card = CARDS[id as CardId];
  const consensus = CTEXT[id as CardId];
  const keywords = cardKeywords(id);
  const rulesText = terse ? '' : ('tx' in card ? card.tx : '');
  return (
    <>
      {keywords.map(keyword => <p key={keyword}><b>{KWNAME[keyword]}.</b> {KWHELP[keyword]}</p>)}
      {rulesText && <p>{rulesText}</p>}
      {consensus && (
        <>
          <ConsensusLine faction={card.f} text={consensus} tips={false} />
          <p className="consensus-gloss">{consensusHelp(card.f)}</p>
        </>
      )}
      {!terse && !rulesText && !keywords.length && !consensus && card.t === 'asset' && <p>Vanilla Asset. No extra text.</p>}
      {!terse && card.t === 'op' && !rulesText && !consensus && <p>Operation.</p>}
    </>
  );
}

/** The face itself, in reading order: cost and crew in a band across the top,
 *  then the name, then the rules text, then stats. */
function CardBody({ id, missing, tips = true, footerMid }: { id: string; missing?: boolean; tips?: boolean; footerMid?: ReactElement }) {
  const card = CARDS[id as CardId];
  const consensus = CTEXT[id as CardId];
  const keywords = 'kw' in card ? card.kw : undefined;
  return (
    <>
      <div className="card-header">
        <Tip text={tips ? 'Gas cost' : undefined}><span className="cost">{card.c}</span></Tip>
        <span className="card-faction">
          <FactionMark faction={card.f} size={12} />
          <span className="card-faction-name">{FNAME[card.f].toUpperCase()}</span>
        </span>
      </div>
      <div className="card-name">{card.n}</div>
      <div className="card-body">
        {missing
          ? <span className="card-missing">Still in the wreck</span>
          : <>
              <KwLine keywords={keywords} tips={tips} />
              {'tx' in card ? card.tx : ''}
              {consensus && <ConsensusLine faction={card.f} text={consensus} tips={tips} />}
            </>}
      </div>
      {card.t === 'asset'
        ? footerMid
          ? (
            <div className="card-stats has-mid">
              <StatChip kind="atk" n={card.a} tips={tips} />
              {footerMid}
              <StatChip kind="hp" n={card.h} tips={tips} />
            </div>
          )
          : <StatPair atk={card.a} hp={card.h} tips={tips} />
        : footerMid
          ? (
            <div className="card-stats card-stats-op has-mid">
              <span className="card-stats-spacer" aria-hidden />
              {footerMid}
              <span className="ops-mark">OP</span>
            </div>
          )
          : <div className="card-stats card-stats-op"><span className="ops-mark">OP</span></div>}
    </>
  );
}

export function CardFace({ id, missing, playable, selected, fresh, why, footerMid, onClick }: {
  id: string; missing?: boolean; playable?: boolean; selected?: boolean; fresh?: boolean; why?: string;
  footerMid?: ReactElement; onClick?: () => void;
}) {
  const card = CARDS[id as CardId];
  const interactive = !!onClick;
  const className = cn(
    'card',
    `faction-${card.f}`,
    missing && 'ghost',
    playable === false && 'dead',
    selected && 'is-selected',
    fresh && 'just-drawn',
  );
  return (
    <div className={className}
         role={interactive ? 'button' : undefined}
         aria-disabled={interactive && playable === false}
         aria-label={`${missing ? 'Still out. ' : ''}${card.n}, ${card.c} gas${card.t === 'asset' ? `, ${card.a} attack, ${card.h} health` : ''}${why ? `. ${why}` : ''}`}
         tabIndex={interactive && playable !== false ? 0 : -1} onClick={onClick}
         onKeyDown={event => {
           if (interactive && (event.key === 'Enter' || event.key === ' ')) {
             event.preventDefault();
             onClick?.();
           }
         }}>
      <TipHit text={why} />
      <CardBody id={id} missing={missing} footerMid={footerMid} />
    </div>
  );
}

export function HandCard({ id, playable, selected, fresh, why, onClick, flyId, shared, first }: {
  id: string; playable: boolean; selected: boolean; fresh?: boolean; why?: string; onClick: () => void;
  flyId: string; shared?: boolean; first?: boolean;
}) {
  return (
    <Fly id={flyId} shared={shared} first={first}>
      <CardFace id={id} playable={playable} selected={selected} fresh={fresh} why={why} onClick={onClick} />
    </Fly>
  );
}

export function FeedCard({ id, claimable, onClick, flyId, first }: {
  id: string; claimable: boolean; onClick: () => void; flyId: string; first?: boolean;
}) {
  const card = CARDS[id as CardId];
  const coarse = useCoarsePointer();
  const [peek, setPeek] = useState(false);
  const tap = () => {
    if (coarse && !peek) { setPeek(true); return; }
    if (claimable) onClick();
    else setPeek(false);
  };
  return (
    <Fly id={flyId} first={first}>
      <div className={cn('fcard', `faction-${card.f}`, claimable && 'take', peek && 'peek')}
           role="button"
           aria-label={`${claimable ? 'Claim ' : ''}${card.n}, ${card.c} gas${card.t === 'asset' ? `, ${card.a} attack, ${card.h} health` : ''}`}
           tabIndex={0} onClick={tap} onBlur={() => setPeek(false)}
           onKeyDown={event => {
             if (event.key === 'Enter' || event.key === ' ') {
               event.preventDefault();
               tap();
             }
           }}>
        <CardBody id={id} tips={false} />
        <div className="fpop" aria-hidden="true">
          <strong>{card.n}</strong>
          <CardNotes id={id} />
        </div>
      </div>
    </Fly>
  );
}
