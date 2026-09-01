import { type ReactNode, type RefObject } from 'react';
import { CARDS, CARD_IDS, FNAME, isToken, type CardId } from '../../engine/index.ts';
import { CardFace, CardNotes, hasNotes } from './Card.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx';

export type LogLine = { n: number; text: string; kind: string };

/** Longest names first so "Seed Phrase Kid" wins over "Seed". */
const CARD_MATCHERS = CARD_IDS
  .map(id => ({ id, name: CARDS[id].n }))
  .sort((a, b) => b.name.length - a.name.length);

function tokenize(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  let i = 0;
  while (i < text.length) {
    let hit: { id: CardId; label: string; len: number } | null = null;
    for (const { id, name } of CARD_MATCHERS) {
      const slice = text.slice(i, i + name.length);
      if (slice.toLowerCase() === name.toLowerCase()) {
        hit = { id, label: slice, len: name.length };
        break;
      }
    }
    if (hit) {
      out.push(<LedgerCard key={`${i}-${hit.id}`} id={hit.id} label={hit.label} />);
      i += hit.len;
      continue;
    }
    let j = i + 1;
    while (j < text.length) {
      let next = false;
      for (const { name } of CARD_MATCHERS) {
        if (text.slice(j, j + name.length).toLowerCase() === name.toLowerCase()) {
          next = true;
          break;
        }
      }
      if (next) break;
      j++;
    }
    out.push(text.slice(i, j));
    i = j;
  }
  return out;
}

function LedgerCard({ id, label }: { id: CardId; label: string }) {
  const card = CARDS[id];
  const token = isToken(id);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={`ledger-card faction-${card.f}`}
                aria-label={`${card.n}, ${card.c} gas${card.t === 'asset' ? `, ${card.a} attack, ${card.h} health` : ''}`}>
          {label}
        </button>
      </TooltipTrigger>
      <TooltipContent side="left" className="ledger-card-tip-wrap">
        <div className="ledger-card-tip">
          {!token && (
            <div className="ledger-card-face">
              <CardFace id={id} tips={false} />
            </div>
          )}
          {(token || hasNotes(id, true)) && (
            <div className="ledger-card-meta">
              {token && (
                <>
                  <strong>{card.n}</strong>
                  <span>{card.c} gas · {FNAME[card.f]}{card.t === 'asset' ? ` · ${card.a}/${card.h}` : ''}</span>
                </>
              )}
              {hasNotes(id, !token) && <CardNotes id={id} terse={!token} />}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

function Actor({ who }: { who: 'you' | 'foe' }) {
  return <span className={`ledger-actor ${who}`}>{who}</span>;
}

function renderLine(text: string, kind: string): ReactNode {
  const vs = text.match(/^(.+?) vs (.+)$/);
  if (kind === 'blk' && vs) {
    return <><span className="ledger-match">{vs[1]}</span><span className="ledger-sep"> vs </span><span className="ledger-match">{vs[2]}</span></>;
  }
  if (kind === 'blk' && (text === 'you walk free' || text === 'you fell')) {
    return <span className={`ledger-end ${text === 'you walk free' ? 'win' : 'lose'}`}>{text}</span>;
  }

  const block = text.match(/^block (\d{3}) · (you|foe) · (\d+) gas$/);
  if (kind === 'blk' && block) {
    return <>
      <span className="ledger-block">block {block[1]}</span>
      <span className="ledger-sep"> · </span>
      <Actor who={block[2] as 'you' | 'foe'} />
      <span className="ledger-sep"> · </span>
      <span className="ledger-gas">{block[3]} gas</span>
    </>;
  }

  const action = text.match(/^(you|foe) · (deploy|run|claim|draw|hero power) (.+?)(?: · -(\d+) gas)?$/);
  if (action) {
    const [, who, verb, rest, gasCost] = action;
    return <>
      <Actor who={who as 'you' | 'foe'} />
      <span className="ledger-sep"> · </span>
      <span className="ledger-verb">{verb}</span>
      {' '}
      {tokenize(rest!)}
      {gasCost && <><span className="ledger-sep"> · </span><span className="ledger-gas">−{gasCost} gas</span></>}
    </>;
  }

  const heroHit = text.match(/^(.+?) → (you|them) · (\d+)$/);
  if (kind === 'hit' && heroHit) {
    return <>
      {tokenize(heroHit[1]!)}
      <span className="ledger-arrow"> → </span>
      <span className={`ledger-target ${heroHit[2]}`}>{heroHit[2]}</span>
      <span className="ledger-sep"> · </span>
      <span className="ledger-dmg">{heroHit[3]}</span>
    </>;
  }

  const fight = text.match(/^(.+?) × (.+)$/);
  if (kind === 'hit' && fight) {
    return <>
      {tokenize(fight[1]!)}
      <span className="ledger-arrow"> × </span>
      {tokenize(fight[2]!)}
    </>;
  }

  const liquidated = text.match(/^(.+?) liquidated$/);
  if (kind === 'hit' && liquidated) {
    return <>{tokenize(liquidated[1]!)}<span className="ledger-muted"> liquidated</span></>;
  }

  const bag = text.match(/^(you|foe) · scraped the bag · (\d+)$/);
  if (kind === 'hit' && bag) {
    return <>
      <Actor who={bag[1] as 'you' | 'foe'} />
      <span className="ledger-sep"> · </span>
      <span className="ledger-muted">scraped the bag</span>
      <span className="ledger-sep"> · </span>
      <span className="ledger-dmg">{bag[2]}</span>
    </>;
  }

  const consensus = text.match(/^consensus · (.+)$/);
  if (consensus) {
    return <>
      <span className="ledger-consensus">consensus</span>
      <span className="ledger-sep"> · </span>
      <span className="ledger-faction">{consensus[1]}</span>
    </>;
  }

  const handFull = text.match(/^hand full · (.+?) burned$/);
  if (handFull) {
    return <><span className="ledger-muted">hand full · </span>{tokenize(handFull[1]!)}<span className="ledger-muted"> burned</span></>;
  }

  const status = text.match(/^(.+?) · (cold storage broken|control transferred)$/);
  if (status) {
    return <>{tokenize(status[1]!)}<span className="ledger-muted"> · {status[2]}</span></>;
  }

  if (text === 'board full · summon fizzled') {
    return <span className="ledger-muted">{text}</span>;
  }

  return tokenize(text);
}

function LedgerEntry({ text, kind }: { text: string; kind: string }) {
  return <div className={kind}>{renderLine(text, kind)}</div>;
}

export function LedgerLog({ lines, logRef, id = 'log' }: {
  lines: LogLine[];
  logRef?: RefObject<HTMLDivElement | null>;
  id?: string;
}) {
  return (
    <div id={id} ref={logRef}>
      {lines.map(e => <LedgerEntry key={e.n} text={e.text} kind={e.kind} />)}
    </div>
  );
}

/** One-line preview for the phone ticker. */
export function LedgerPreview({ text, kind }: { text: string; kind: string }) {
  return <span className={`tick-line ${kind}`}>{renderLine(text, kind)}</span>;
}
