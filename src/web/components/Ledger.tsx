import { useState, type MouseEvent, type ReactNode, type RefObject } from 'react';
import { CARDS, CARD_IDS, FNAME, isToken, type CardId } from '../../engine/index.ts';
import { useCoarsePointer } from '../media.ts';
import { CardFace, CardNotes, hasNotes } from './Card.tsx';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx';

export type LogLine = { n: number; text: string; kind: string };
type ActorId = 'you' | 'foe';

/** Longest names first so "Seed Phrase Kid" wins over "Seed". */
const CARD_MATCHERS = CARD_IDS
  .map(id => ({ id, name: CARDS[id].n }))
  .sort((a, b) => b.name.length - a.name.length);

function tokenize(text: string, plain = false): ReactNode[] {
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
      out.push(plain
        ? <span key={`${i}-${hit.id}`} className={`ledger-card faction-${CARDS[hit.id].f}`}>{hit.label}</span>
        : <LedgerCard key={`${i}-${hit.id}`} id={hit.id} label={hit.label} />);
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
  const coarse = useCoarsePointer();
  const [open, setOpen] = useState(false);
  const onClick = coarse
    ? (event: MouseEvent) => { event.stopPropagation(); setOpen(v => !v); }
    : undefined;
  return (
    <Tooltip open={coarse ? open : undefined} onOpenChange={coarse ? setOpen : undefined}>
      <TooltipTrigger asChild onClick={onClick}>
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

function Actor({ who }: { who: ActorId }) {
  return <span className={`ledger-actor ${who}`}>{who}</span>;
}

/** Block header already names the seat — omit the echo on that seat's own lines. */
function actorPrefix(who: ActorId, blockActor: ActorId | null): ReactNode {
  if (blockActor && who === blockActor) return null;
  return <><Actor who={who} /><span className="ledger-sep"> · </span></>;
}

function parseBlockActor(text: string, kind: string): ActorId | null {
  if (kind !== 'blk') return null;
  const m = text.match(/^block \d{3} · (you|foe) · \d+ gas$/);
  return m ? m[1] as ActorId : null;
}

/** Whose block owns this line — walk back to the nearest block header. */
export function blockActorAt(lines: LogLine[], index: number): ActorId | null {
  for (let i = index; i >= 0; i--) {
    const actor = parseBlockActor(lines[i]!.text, lines[i]!.kind);
    if (actor) return actor;
  }
  return null;
}

function renderLine(text: string, kind: string, blockActor: ActorId | null = null, plain = false): ReactNode {
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
      <Actor who={block[2] as ActorId} />
      <span className="ledger-sep"> · </span>
      <span className="ledger-gas">{block[3]} gas</span>
    </>;
  }

  const action = text.match(/^(you|foe) · (deploy|run|claim|draw|discard|hero power) (.+?)(?: · -(\d+) gas)?$/);
  if (action) {
    const [, who, verb, rest, gasCost] = action;
    return <>
      {actorPrefix(who as ActorId, blockActor)}
      <span className="ledger-verb">{verb}</span>
      {' '}
      {tokenize(rest!, plain)}
      {gasCost && <><span className="ledger-sep"> · </span><span className="ledger-gas">−{gasCost} gas</span></>}
    </>;
  }

  const discardFizzle = text.match(/^(you|foe) · discard fizzled · empty hand$/);
  if (discardFizzle) {
    return <>
      {actorPrefix(discardFizzle[1] as ActorId, blockActor)}
      <span className="ledger-muted">discard fizzled · empty hand</span>
    </>;
  }

  const heroHit = text.match(/^(.+?) → (you|them) · (\d+)$/);
  if (kind === 'hit' && heroHit) {
    return <>
      {tokenize(heroHit[1]!, plain)}
      <span className="ledger-arrow"> → </span>
      <span className={`ledger-target ${heroHit[2]}`}>{heroHit[2]}</span>
      <span className="ledger-sep"> · </span>
      <span className="ledger-dmg">{heroHit[3]}</span>
    </>;
  }

  const fight = text.match(/^(.+?) × (.+)$/);
  if (kind === 'hit' && fight) {
    return <>
      {tokenize(fight[1]!, plain)}
      <span className="ledger-arrow"> × </span>
      {tokenize(fight[2]!, plain)}
    </>;
  }

  const liquidated = text.match(/^(.+?) liquidated$/);
  if (kind === 'hit' && liquidated) {
    return <>{tokenize(liquidated[1]!, plain)}<span className="ledger-muted"> liquidated</span></>;
  }

  const bag = text.match(/^(you|foe) · scraped the bag · (\d+)$/);
  if (kind === 'hit' && bag) {
    return <>
      {actorPrefix(bag[1] as ActorId, blockActor)}
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
    return <><span className="ledger-muted">hand full · </span>{tokenize(handFull[1]!, plain)}<span className="ledger-muted"> burned</span></>;
  }

  const status = text.match(/^(.+?) · (cold storage broken|control transferred)$/);
  if (status) {
    return <>{tokenize(status[1]!, plain)}<span className="ledger-muted"> · {status[2]}</span></>;
  }

  if (text === 'board full · summon fizzled') {
    return <span className="ledger-muted">{text}</span>;
  }

  return tokenize(text, plain);
}

function LedgerEntry({ text, kind, blockActor }: { text: string; kind: string; blockActor: ActorId | null }) {
  return <div className={kind}>{renderLine(text, kind, blockActor)}</div>;
}

const BLOCK_HEAD = /^block \d{3}/;

/** Newest block first. Lines inside a block stay in the order they happened. */
function blocksNewestFirst(lines: LogLine[]): LogLine[][] {
  const groups: LogLine[][] = [];
  let cur: LogLine[] = [];
  for (const e of lines) {
    if (e.kind === 'blk' && BLOCK_HEAD.test(e.text)) {
      if (cur.length) groups.push(cur);
      cur = [e];
    } else {
      cur.push(e);
    }
  }
  if (cur.length) groups.push(cur);
  const preamble = groups[0]?.[0] && !(groups[0][0].kind === 'blk' && BLOCK_HEAD.test(groups[0][0].text))
    ? groups[0]
    : null;
  const blocks = preamble ? groups.slice(1) : groups;
  const newest = [...blocks].reverse();
  return preamble ? [preamble, ...newest] : newest;
}

export function LedgerLog({ lines, logRef, id = 'log' }: {
  lines: LogLine[];
  logRef?: RefObject<HTMLDivElement | null>;
  id?: string;
}) {
  const actors = new Map<number, ActorId | null>();
  let blockActor: ActorId | null = null;
  for (const e of lines) {
    const next = parseBlockActor(e.text, e.kind);
    if (next) blockActor = next;
    actors.set(e.n, blockActor);
  }
  return (
    <div id={id} ref={logRef}>
      {blocksNewestFirst(lines).flat().map(e => (
        <LedgerEntry key={e.n} text={e.text} kind={e.kind} blockActor={actors.get(e.n) ?? null} />
      ))}
    </div>
  );
}

/** One-line preview for the phone ticker. */
export function LedgerPreview({ text, kind, blockActor = null }: {
  text: string; kind: string; blockActor?: ActorId | null;
}) {
  return <span className={`tick-line ${kind}`}>{renderLine(text, kind, blockActor, true)}</span>;
}
