import { forwardRef, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { CARDS, FNAME, type CardId, type Keyword, type ViewAsset } from '../../engine/index.ts';
import { Fly, useValueFlash } from '../anim.tsx';
import { cn } from '../lib/utils.ts';
import { useCoarsePointer } from '../media.ts';
import { CardNotes } from './Card.tsx';
import { FactionMark, KwLine, KwMark, StatPair } from './Marks.tsx';
import { AssetSheet } from './Sheet.tsx';

/** Statuses that hang under the Asset — not printed as face keywords. */
const FACE_SKIP = new Set<Keyword>(['coldstorage']);

export const BoardAsset = forwardRef<HTMLDivElement, {
  asset: ViewAsset;
  isMine: boolean;
  isReady: boolean;
  isSelected: boolean;
  isTargetable: boolean;
  striking?: boolean;
  onClick: () => void;
  flyId: string;
  shared?: boolean;
  first?: boolean;
  fresh?: boolean;
}>(function BoardAsset({
  asset, isMine, isReady, isSelected, isTargetable, striking, onClick, flyId, shared, first, fresh,
}, ref) {
  const hpFlash = useValueFlash(asset.hp);
  const coarse = useCoarsePointer();
  const [reading, setReading] = useState(false);
  const [popAt, setPopAt] = useState<{ left: number; top: number; above: boolean } | null>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const origin = useRef<{ x: number; y: number } | null>(null);
  const [deployPop, setDeployPop] = useState(!!fresh && !first);
  useEffect(() => {
    if (!fresh || first) return;
    setDeployPop(true);
    const t = window.setTimeout(() => setDeployPop(false), 620);
    return () => window.clearTimeout(t);
  }, [fresh, first, asset.uid]);
  useEffect(() => () => window.clearTimeout(holdTimer.current), []);

  const cold = asset.shield;
  const showReady = isMine && isReady;
  const faceKw = (asset.kw ?? []).filter(k => !FACE_SKIP.has(k));
  const className = cn(
    'asset',
    `faction-${asset.f}`,
    isMine && isReady && 'ready',
    isSelected && 'is-selected',
    cold && 'shield',
    asset.seized && 'seized',
    isTargetable && 'is-targetable',
    hpFlash === 'hit' && 'hit',
    hpFlash === 'heal' && 'heal',
    deployPop && 'just-deployed',
    striking && 'striking',
  );
  const clearHold = () => {
    window.clearTimeout(holdTimer.current);
    origin.current = null;
  };
  const onPointerDown = (event: ReactPointerEvent) => {
    if (!coarse || event.button !== 0) return;
    held.current = false;
    origin.current = { x: event.clientX, y: event.clientY };
    holdTimer.current = window.setTimeout(() => {
      held.current = true;
      setReading(true);
      const swallow = (click: Event) => {
        click.preventDefault();
        click.stopPropagation();
        window.removeEventListener('click', swallow, true);
        held.current = false;
      };
      window.addEventListener('click', swallow, true);
      window.setTimeout(() => {
        window.removeEventListener('click', swallow, true);
        held.current = false;
      }, 500);
    }, 420);
  };
  const onPointerMove = (event: ReactPointerEvent) => {
    if (!origin.current) return;
    const dx = event.clientX - origin.current.x;
    const dy = event.clientY - origin.current.y;
    if (dx * dx + dy * dy > 100) clearHold();
  };
  const showPop = () => {
    if (coarse || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
    const el = cardRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const half = Math.min(220, window.innerWidth * 0.7) / 2;
    const left = Math.max(12 + half, Math.min(window.innerWidth - 12 - half, r.left + r.width / 2));
    const above = isMine && r.top > 96;
    setPopAt({ left, top: above ? r.top - 10 : r.bottom + 10, above });
  };

  const interactive = isReady || isSelected || isTargetable;
  const printed = CARDS[asset.id as CardId];
  const shifted = printed?.t === 'asset' && (asset.atk !== printed.a || asset.hp !== printed.h);

  const statusBits = [
    asset.name,
    `${asset.atk} attack`,
    `${asset.hp} health`,
    isReady && 'ready to attack',
    cold && 'Cold Storage',
    asset.seized && 'seized',
  ].filter(Boolean).join(', ');

  return (
    <Fly id={flyId} shared={shared} first={first} flyRef={ref}>
      <div ref={cardRef} className={className} data-card={asset.id} tabIndex={interactive ? 0 : -1}
           aria-label={coarse ? `${statusBits}. Hold to read` : statusBits}
           onPointerEnter={showPop}
           onPointerLeave={() => setPopAt(null)}
           onPointerDown={onPointerDown}
           onPointerMove={onPointerMove}
           onPointerUp={clearHold}
           onPointerCancel={clearHold}
           onContextMenu={event => { if (coarse) event.preventDefault(); }}
           onClick={event => {
             if (held.current) {
               held.current = false;
               event.preventDefault();
               event.stopPropagation();
               return;
             }
             onClick();
           }}
           onKeyDown={event => {
             if (event.key === 'Enter' || event.key === ' ') {
               event.preventDefault();
               onClick();
             }
           }}>
        <div className="asset-header">
          <FactionMark faction={asset.f} size={11} />
          <span className="asset-faction">{FNAME[asset.f].toUpperCase()}</span>
        </div>
        <div className="asset-name">{asset.name}</div>
        <KwLine keywords={faceKw} className="asset-keywords" tips={false} />
        <StatPair atk={asset.atk} hp={asset.hp} damaged={asset.hp < asset.maxHp} live tips={false} className="stats" />
        {(cold || asset.seized || showReady) && (
          <div className="asset-flags" aria-hidden>
            {cold && (
              <span className="asset-flag cold-flag">
                <KwMark keyword="coldstorage" size={11} />
                COLD
              </span>
            )}
            {asset.seized && (
              <span className="asset-flag seized-flag">FROZEN</span>
            )}
            {showReady && (
              <span className="asset-flag ready-flag">
                <svg viewBox="0 0 10 10" className="asset-flag-ico"><path d="M5 .9 9.3 8.9 H.7 Z" fill="currentColor" /></svg>
                READY
              </span>
            )}
          </div>
        )}
      </div>
      {popAt && createPortal(
        <div className={`asset-pop${popAt.above ? ' above' : ''}`} style={{ left: popAt.left, top: popAt.top }} role="tooltip">
          <strong>{asset.name}</strong>
          <CardNotes id={asset.id} />
          {shifted && <p>Now {asset.atk} attack, {asset.hp} health.</p>}
        </div>,
        document.body,
      )}
      {reading && createPortal(
        <AssetSheet id={asset.id} name={asset.name} atk={asset.atk} hp={asset.hp} maxHp={asset.maxHp}
                    onClose={() => setReading(false)} />,
        document.body,
      )}
    </Fly>
  );
});
