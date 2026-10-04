import { useEffect, useRef, useState } from 'react';
import { FACTIONS, KWHELP, KWNAME, type Faction, type Keyword, type PlayableFaction } from '../../engine/index.ts';
import { Tip } from './Tip.tsx';

function AtkIco() {
  return (
    <svg className="sico" viewBox="0 0 10 10" aria-hidden>
      <path d="M5 .9 9.3 8.9 H.7 Z" fill="currentColor" />
    </svg>
  );
}

function HpIco() {
  return (
    <svg className="sico" viewBox="0 0 10 10" aria-hidden>
      <path d="M5 9 1.4 5.2 A2.35 2.35 0 0 1 5 2.15 A2.35 2.35 0 0 1 8.6 5.2 Z" fill="currentColor" />
    </svg>
  );
}

export function StatChip({ kind, n, damaged, title, tips = true }: {
  kind: 'atk' | 'hp'; n: number; damaged?: boolean; title?: string; tips?: boolean;
}) {
  return (
    <Tip text={tips ? (title ?? (kind === 'atk' ? 'Attack' : 'Health')) : undefined}>
    <span className={`stat ${kind}${damaged ? ' dmg' : ''}`}>
      {kind === 'atk' ? <AtkIco /> : <HpIco />}
      {n}
    </span>
    </Tip>
  );
}

/** Pulse + floating delta when HP moves. Skip on first paint so deploys stay quiet. */
export function LiveHp({ n, damaged, tips = true, onFlash }: {
  n: number; damaged?: boolean; tips?: boolean; onFlash?: (dir: 'up' | 'down') => void;
}) {
  const prev = useRef(n);
  const tick = useRef(0);
  const [pop, setPop] = useState<{ d: number; id: number } | null>(null);
  useEffect(() => {
    const d = n - prev.current;
    if (!d) return;
    prev.current = n;
    tick.current += 1;
    setPop({ d, id: tick.current });
    onFlash?.(d > 0 ? 'up' : 'down');
    const t = window.setTimeout(() => setPop(null), 680);
    return () => window.clearTimeout(t);
  }, [n, onFlash]);
  const dir = pop ? (pop.d > 0 ? 'up' : 'down') : '';
  return (
    <span className={`live-hp${dir ? ` ${dir}` : ''}`}>
      <StatChip kind="hp" n={n} damaged={damaged} tips={tips} />
      {pop && (
        <span key={pop.id} className="hp-delta" aria-hidden>
          {pop.d > 0 ? `+${pop.d}` : pop.d}
        </span>
      )}
    </span>
  );
}

export function FactionMark({ faction, size = 13 }: { faction: Faction; size?: number }) {
  return (
    <svg className={`fmark fmark-${faction}`} width={size} height={size} viewBox="0 0 16 16"
         aria-hidden>
      {faction === 'consortium' && (
        <>
          <rect x="3.5" y="7" width="9" height="7" rx="0.8" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M6 7 V5.2 a2 2 0 0 1 4 0 V7" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <circle cx="8" cy="10.6" r="1" fill="currentColor" />
        </>
      )}
      {faction === 'sovereign' && (
        <>
          <circle cx="8" cy="3.2" r="1.55" fill="currentColor" />
          <circle cx="3.2" cy="12.8" r="1.55" fill="currentColor" />
          <circle cx="12.8" cy="12.8" r="1.55" fill="currentColor" />
          <path d="M8 4.7 L4.3 11.4 M8 4.7 L11.7 11.4 M4.8 12.8 H11.2"
                fill="none" stroke="currentColor" strokeWidth="1.15" />
        </>
      )}
      {faction === 'degen' && (
        <>
          <polygon points="8,1.6 14.4,8 8,14.4 1.6,8" fill="none" stroke="currentColor" strokeWidth="1.5" />
          <circle cx="8" cy="8" r="1.6" fill="currentColor" />
        </>
      )}
      {faction === 'neutral' && (
        <path d="M3.5 5 H12.5 M3.5 8 H12.5 M3.5 11 H12.5"
              fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" />
      )}
    </svg>
  );
}

/** One glyph per keyword. Same mark on the face, the board, tips and the rules. */
export function KwMark({ keyword, size = 12 }: { keyword: Keyword; size?: number }) {
  return (
    <svg className={`kw-mark kw-${keyword}`} width={size} height={size} viewBox="0 0 16 16"
         aria-hidden>
      {keyword === 'firewall' && (
        <>
          <path d="M8 1.4 13.4 3.6 v4.1 c0 3.4-2.2 5.5-5.4 6.9 C4.8 13.2 2.6 11.1 2.6 7.7 V3.6 Z"
                fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
          <path d="M5.2 8.1 H10.8 M8 5.4 V10.8" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </>
      )}
      {keyword === 'zeroconf' && (
        <>
          <path d="M3.2 8 H10.2" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="square" />
          <path d="M7.4 4.2 12.6 8 7.4 11.8" fill="none" stroke="currentColor" strokeWidth="1.5"
                strokeLinejoin="miter" />
          <path d="M3.2 4.8 V11.2" fill="none" stroke="currentColor" strokeWidth="1.4" />
        </>
      )}
      {keyword === 'coldstorage' && (
        <>
          <rect x="3.2" y="5.2" width="9.6" height="8.2" rx="1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M5.4 5.2 V3.8 a2.6 2.6 0 0 1 5.2 0 V5.2" fill="none" stroke="currentColor" strokeWidth="1.35" />
          <circle cx="8" cy="9.4" r="1.15" fill="currentColor" />
        </>
      )}
      {keyword === 'yield' && (
        <>
          <path d="M8 13.4 3.2 8.2 A2.9 2.9 0 0 1 8 4.4 A2.9 2.9 0 0 1 12.8 8.2 Z"
                fill="none" stroke="currentColor" strokeWidth="1.35" />
          <path d="M8 6.2 V10.4 M6.1 8.3 H9.9" fill="none" stroke="currentColor" strokeWidth="1.25" />
        </>
      )}
      {keyword === 'sharded' && (
        <>
          <path d="M4.2 12.6 7.4 3.4 H8.8 L5.6 12.6 Z" fill="currentColor" />
          <path d="M7.4 12.6 10.6 3.4 H12 L8.8 12.6 Z" fill="currentColor" opacity=".55" />
          <path d="M4.2 12.6 H8.8 M7.4 12.6 H12" fill="none" stroke="currentColor" strokeWidth="1.1" />
        </>
      )}
      {keyword === 'overclock' && (
        <>
          <circle cx="8" cy="8" r="3.1" fill="none" stroke="currentColor" strokeWidth="1.4" />
          <path d="M8 2.4 V4.2 M8 11.8 V13.6 M2.4 8 H4.2 M11.8 8 H13.6 M4.1 4.1 5.4 5.4 M10.6 10.6 11.9 11.9 M11.9 4.1 10.6 5.4 M5.4 10.6 4.1 11.9"
                fill="none" stroke="currentColor" strokeWidth="1.25" strokeLinecap="square" />
        </>
      )}
    </svg>
  );
}

export function KwTip({ keyword }: { keyword: Keyword }) {
  return (
    <div className="kw-tip">
      <div className="kw-tip-h">
        <KwMark keyword={keyword} size={14} />
        <span>{KWNAME[keyword]}</span>
      </div>
      <p>{KWHELP[keyword]}</p>
    </div>
  );
}

export function KwLine({ keywords, className = 'card-keywords', tips = true, iconsOnly = false }: {
  keywords?: Keyword[]; className?: string; tips?: boolean; iconsOnly?: boolean;
}) {
  const bits = (keywords ?? []).filter(keyword => KWNAME[keyword]);
  if (!bits.length) return null;
  return (
    <span className={className}>
      {bits.map(keyword => {
        const chip = (
          <span className={`kw-chip kw-${keyword}`}>
            <KwMark keyword={keyword} size={iconsOnly ? 13 : 11} />
            {!iconsOnly && <span className="kw-label">{KWNAME[keyword]}</span>}
          </span>
        );
        return (
          <span key={keyword} className="kwi">
            {tips
              ? <Tip content={<KwTip keyword={keyword} />} sideOffset={20} contentClassName="tip-panel">
                  {chip}
                </Tip>
              : chip}
          </span>
        );
      })}
    </span>
  );
}

export function StatPair({ atk, hp, damaged, className = 'card-stats', live, tips = true }: {
  atk: number; hp: number; damaged?: boolean; className?: string; live?: boolean; tips?: boolean;
}) {
  return (
    <div className={className}>
      <StatChip kind="atk" n={atk} tips={tips} />
      {live
        ? <LiveHp n={hp} damaged={damaged} tips={tips} />
        : <StatChip kind="hp" n={hp} damaged={damaged} tips={tips} />}
    </div>
  );
}

export function PowerMark({ size = 16 }: { size?: number }) {
  return (
    <svg className="pwr-mark" width={size} height={size} viewBox="0 0 16 16" aria-hidden>
      <path d="M8 1.2 13.7 4.45 v7.1 L8 14.8 2.3 11.55 v-7.1 Z"
            fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="miter" />
      <path d="M9.05 3.15 4.85 8.35 H7.7 L6.55 13.05 11.35 7.65 H8.4 Z" fill="currentColor" />
    </svg>
  );
}

/** Crew powers are written from the owner's seat. On the other side of the
 *  table, "them" is the player reading it. */
export function powerBlurb(text: string, theirs: boolean): string {
  if (!theirs) return text;
  return text
    .replace(/\byourself\b/gi, 'themselves')
    .replace(/\byour\b/gi, 'their')
    .replace(/\bthem\b/gi, 'you');
}

export function PowerPreview({ faction, theirs = false }: { faction: PlayableFaction; theirs?: boolean }) {
  const power = FACTIONS[faction].power;
  return (
    <div className="pwr">
      <span className="pwr-name"><PowerMark size={15} />{power.name}</span>
      <span className="pwr-fx">{powerBlurb(power.text, theirs)}</span>
      <span className="pwr-once">Crew power · once per block</span>
    </div>
  );
}
