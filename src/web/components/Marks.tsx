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
export function LiveHp({ n, damaged, tips = true }: { n: number; damaged?: boolean; tips?: boolean }) {
  const prev = useRef(n);
  const tick = useRef(0);
  const [pop, setPop] = useState<{ d: number; id: number } | null>(null);
  useEffect(() => {
    const d = n - prev.current;
    if (!d) return;
    prev.current = n;
    tick.current += 1;
    setPop({ d, id: tick.current });
    const t = window.setTimeout(() => setPop(null), 680);
    return () => window.clearTimeout(t);
  }, [n]);
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

export function KwLine({ keywords, className = 'card-keywords', tips = true }: {
  keywords?: Keyword[]; className?: string; tips?: boolean;
}) {
  const bits = (keywords ?? []).filter(keyword => KWNAME[keyword]);
  if (!bits.length) return null;
  return (
    <span className={className}>
      {bits.map((keyword, index) => (
        <span key={keyword} className="kwi">
          <Tip text={tips ? KWHELP[keyword] : undefined}>
            <span>{index ? ' · ' : ''}{KWNAME[keyword]}</span>
          </Tip>
        </span>
      ))}
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

export function PowerPreview({ faction, tips = true }: { faction: PlayableFaction; tips?: boolean }) {
  const power = FACTIONS[faction].power;
  const gas = <span className="pwr-gas">{power.cost}</span>;
  return (
    <div className="pwr">
      <span className="pwr-name"><PowerMark size={15} />{power.name}</span>
      {tips ? <Tip text="Gas cost">{gas}</Tip> : gas}
      <span className="pwr-fx">{power.text}</span>
      <span className="pwr-once">Crew power · {power.cost} gas · once per block</span>
    </div>
  );
}
