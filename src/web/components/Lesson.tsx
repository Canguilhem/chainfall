import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import type { LessonBeat, LessonFocus, LessonGlance, OrientRegion } from '../lesson.ts';

type Part = OrientRegion | LessonGlance | null;
type Hole = { x: number; y: number; w: number; h: number; ring: boolean };

function shown(el: Element): boolean {
  const r = el.getBoundingClientRect();
  return r.width >= 8 && r.height >= 8;
}

/** Phone lanes draw the name, health and gas as one bar. A ring around only the plate slices it. */
function lessonStacked(): boolean {
  return !!document.querySelector('#table .lane.stacked');
}

/** What this beat is pointing at. A sheet stays fully lit; the card glow marks the one inside it. */
function spotlightNodes(focus: LessonFocus | null): Element[] {
  const table = document.getElementById('table');
  const stacked = lessonStacked();
  const nodes: Element[] = [];
  if (focus === 'crews') nodes.push(...document.querySelectorAll(stacked ? '#table .lane.stacked .lane-status' : '#table .plate'));
  else if (focus === 'gas') nodes.push(...document.querySelectorAll(stacked ? '#table .lane.stacked.you .lane-gas' : '.lane.you .gasbar'));
  else if (focus === 'feed') nodes.push(...document.querySelectorAll('#feed, #feedbtn'));
  else if (focus === 'ledger') nodes.push(...document.querySelectorAll('#ledger, #ticker, #tick-log'));
  else {
    nodes.push(...document.querySelectorAll('.is-lesson'));
    if (table?.dataset.lessonHero) nodes.push(...document.querySelectorAll(stacked ? '#table .lane.stacked.them .lane-status' : '.lane.them .plate'));
    if (table?.dataset.lessonPower) nodes.push(...document.querySelectorAll('.lane.you button.power, #prompt button.power'));
    if (table?.dataset.lessonSeal) nodes.push(...document.querySelectorAll('button.seal'));
  }
  const sheet = document.querySelector('.sheet');
  if (sheet) {
    const inside = nodes.filter(node => sheet.contains(node));
    return [...(inside.length ? inside : []), sheet].filter(shown);
  }
  return nodes.filter(shown);
}

function measureHoles(focus: LessonFocus | null): Hole[] {
  const pad = 8;
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const nodes = spotlightNodes(focus);
  const blocked = [...document.querySelectorAll('#table .plate')].filter(plate => !nodes.includes(plate));
  return nodes.map(node => {
    const base = node.getBoundingClientRect();
    const flags = node.querySelector('.asset-flags')?.getBoundingClientRect();
    const status = node.classList.contains('lane-gas') ? node.closest('.lane-status')?.getBoundingClientRect() : undefined;
    const r = status && status.height > base.height + 4
      ? new DOMRect(base.left, status.top, base.width, status.height)
      : !flags || flags.width < 4 ? base : new DOMRect(
      Math.min(base.left, flags.left),
      Math.min(base.top, flags.top),
      Math.max(base.right, flags.right) - Math.min(base.left, flags.left),
      Math.max(base.bottom, flags.bottom) - Math.min(base.top, flags.top),
    );
    let x = Math.max(4, r.left - pad);
    let y = Math.max(4, r.top - pad);
    let right = Math.min(vw - 4, r.right + pad);
    let bottom = Math.min(vh - 4, r.bottom + pad);
    const inSheet = node.classList.contains('sheet') || !!node.closest('.sheet');
    const ledgerNode = node.id === 'ticker' || node.id === 'tick-log' || node.id === 'ledger';
    if (!inSheet && !ledgerNode) {
      for (const plate of blocked) {
        const b = plate.getBoundingClientRect();
        if (right < b.left || x > b.right || bottom < b.top || y > b.bottom) continue;
        if (bottom > b.top && y < b.top - 28) bottom = b.top - 6;
      }
    }
    return {
      x: Math.round(x), y: Math.round(y), w: Math.round(right - x), h: Math.round(bottom - y),
      ring: !node.classList.contains('sheet'),
    };
  });
}

function sameHoles(a: Hole[], b: Hole[]): boolean {
  return a.length === b.length && a.every((h, i) => h.x === b[i]!.x && h.y === b[i]!.y && h.w === b[i]!.w && h.h === b[i]!.h && h.ring === b[i]!.ring);
}

/** Marks the card this beat is about, and dims everything that is not the target. */
export function Lesson({ beat, focus }: { beat: LessonBeat; focus: LessonFocus | null }) {
  const part: Part = focus ? null : (beat.glance ?? null);
  const spots = focus ? '' : beat.spots.join(',');
  const [holes, setHoles] = useState<Hole[]>([]);

  useLayoutEffect(() => {
    const root = document.getElementById('root');
    if (!root) return;
    const want = new Set(spots ? spots.split(',') : []);
    if (want.size) root.dataset.lessonCard = '1';
    else delete root.dataset.lessonCard;
    if (part) root.dataset.lessonPart = part;
    else delete root.dataset.lessonPart;
    let frame = 0;
    const mark = () => {
      document.querySelectorAll<HTMLElement>('[data-card]').forEach(el => {
        el.classList.toggle('is-lesson', !!el.dataset.card && want.has(el.dataset.card));
      });
    };
    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const next = measureHoles(focus);
        setHoles(prev => sameHoles(prev, next) ? prev : next);
      });
    };
    mark();
    schedule();
    const again = window.setTimeout(schedule, 220);
    const obs = new MutationObserver(() => { mark(); schedule(); });
    obs.observe(root, { childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'data-drawer'] });
    window.addEventListener('resize', schedule);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(again);
      obs.disconnect();
      window.removeEventListener('resize', schedule);
      delete root.dataset.lessonCard;
      delete root.dataset.lessonPart;
      document.querySelectorAll('.is-lesson').forEach(el => el.classList.remove('is-lesson'));
      setHoles([]);
    };
  }, [spots, part, focus, beat.hint]);

  if (!holes.length) return null;
  return (
    <svg className="lesson-spot" aria-hidden="true">
      <defs>
        <mask id="lesson-spot-mask">
          <rect width="100%" height="100%" fill="white" />
          {holes.map(h => (
            <rect key={`${h.x},${h.y}`} x={h.x} y={h.y} width={h.w} height={h.h} rx={6} fill="black" />
          ))}
        </mask>
      </defs>
      <rect width="100%" height="100%" fill="rgba(8,6,4,.4)" mask="url(#lesson-spot-mask)" />
      {holes.filter(h => h.ring).map(h => (
        <rect key={`r${h.x},${h.y}`} className="lesson-spot-ring" x={h.x + 1} y={h.y + 1}
              width={Math.max(0, h.w - 2)} height={Math.max(0, h.h - 2)} rx={6} />
      ))}
    </svg>
  );
}

export type SenseiPlace = 'br' | 'tr';

const FALLBACK: Record<SenseiPlace, SenseiPlace> = {
  br: 'tr',
  tr: 'br',
};

/** A small figure in the corner. The bubble is the voice; this is who it belongs to. */
function SenseiSprite() {
  return (
    <svg className="sensei-sprite" viewBox="0 0 48 56" aria-hidden="true">
      <path d="M14 50c1.5-8 6.5-13 10-13s8.5 5 10 13" fill="var(--slab)" stroke="currentColor" strokeWidth="1.4" />
      <path d="M11 31c0-9 5.5-18 13-18s13 9 13 18v3c0 1.6-1.4 2.6-3.2 2.6H14.2C12.4 36.6 11 35.6 11 34z"
            fill="var(--concrete)" stroke="currentColor" strokeWidth="1.4" />
      <path d="M17 25.5h14" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
      <path d="M33 32c5 .6 8 4.4 8.5 9" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <circle cx="42" cy="43" r="2.1" fill="currentColor" />
    </svg>
  );
}

function coversSpotlight(box: DOMRect): boolean {
  const region = document.getElementById('table')?.dataset.lessonRegion;
  const sheet = document.querySelector('.sheet');
  const nodes: Element[] = [...document.querySelectorAll('.is-lesson')];
  if (region === 'feed') nodes.push(...document.querySelectorAll('#feed, #feedbtn'));
  if (region === 'hand') nodes.push(...document.querySelectorAll('#hand'));
  const stacked = lessonStacked();
  if (region === 'crews' || document.getElementById('table')?.dataset.lessonHero) {
    nodes.push(...document.querySelectorAll(stacked ? '#table .lane.stacked .lane-status, .live-hp' : '.lane.them .plate, .live-hp'));
  }
  if (region === 'gas') nodes.push(...document.querySelectorAll(stacked ? '#table .lane.stacked.you .lane-gas' : '.lane.you .gasbar'));
  if (region === 'ledger') nodes.push(...document.querySelectorAll('#ledger, #ticker, #tick-log'));
  if (region === 'cost' || region === 'stats') nodes.push(...document.querySelectorAll('.is-lesson'));
  return nodes.some(node => {
    if (sheet && !sheet.contains(node)) return false;
    const r = node.getBoundingClientRect();
    if (r.width < 8 || r.height < 8) return false;
    return !(r.right < box.left + 6 || r.left > box.right - 6 || r.bottom < box.top + 6 || r.top > box.bottom - 6);
  });
}

/** Sensei, in a corner. A bubble, and the figure it comes from. Moves if it would cover the lit target. */
export function Sensei({ say, prefer, cue, notion, step, steps, reached = step, closing, onNext, onStep, onContinue, continueLabel = 'Next', onSkip, skipLabel = 'Skip', onLeave, onPlay }: {
  say: string;
  prefer: SenseiPlace;
  cue: string;
  /** Term for this sitting, on the same line as Sensei. */
  notion?: string;
  step: number;
  steps: number;
  /** Furthest beat this sitting has reached. Dots up to here can be revisited. */
  reached?: number;
  closing?: boolean;
  onNext?: () => void;
  /** Jump to a beat already reached. The board rewinds or replays to match. */
  onStep?: (index: number) => void;
  onContinue?: () => void;
  continueLabel?: string;
  /** Open the next sitting. Hidden while a look-beat Next is already showing. */
  onSkip?: () => void;
  skipLabel?: string;
  onLeave: () => void;
  onPlay: () => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [place, setPlace] = useState(prefer);
  const [lift, setLift] = useState(0);
  const moved = useRef(false);

  useLayoutEffect(() => {
    moved.current = false;
    // A sheet fills the top of the phone. Start above its buttons, and only
    // jump up if that would cover the card this beat is pointing at. The sheet
    // opens without a new line from Sensei, so watch the tree, not just `say`.
    const pick = () => {
      const sheet = !!document.querySelector('.sheet');
      const next = sheet ? 'br' as const : prefer;
      setPlace(prev => {
        if (sheet && moved.current) return prev;
        if (prev === next) return prev;
        if (!sheet) moved.current = false;
        return next;
      });
    };
    pick();
    const obs = new MutationObserver(pick);
    obs.observe(document.getElementById('root') ?? document.body, { childList: true, subtree: true });
    return () => obs.disconnect();
  }, [say, prefer, cue]);

  useLayoutEffect(() => {
    let frame = 0;
    const measure = () => {
      const foot = document.querySelector('.sheet-foot');
      const next = foot ? Math.ceil(foot.getBoundingClientRect().height) + 12 : 0;
      setLift(prev => prev === next ? prev : next);
    };
    measure();
    frame = requestAnimationFrame(measure);
    const again = window.setTimeout(measure, 220);
    window.addEventListener('resize', measure);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(again);
      window.removeEventListener('resize', measure);
    };
  }, [say, place, prefer]);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || moved.current) return;
    if (!coversSpotlight(el.getBoundingClientRect())) return;
    moved.current = true;
    setPlace(FALLBACK[place]);
  }, [place, say, lift]);

  return (
    <div ref={ref} className={`sensei ${place}`} role="dialog" aria-labelledby="sensei-name"
         style={lift && place === 'br' ? { bottom: lift } : undefined}>
      <div className="sensei-bubble" onPointerDown={event => event.stopPropagation()}>
        <div className="sensei-head">
          <p id="sensei-name" className="sensei-name">Sensei</p>
          {notion && <p className="sensei-notion">{notion}</p>}
        </div>
        <p className="sensei-say">{say}</p>
        <div className="sensei-foot">
          <span className="sensei-cue">{cue}</span>
          <span className="lesson-dots" role="group" aria-label="Beats">
            {Array.from({ length: steps }, (_, i) => {
              const go = !!onStep && i !== step && i <= reached;
              const mark = closing || i < step ? 'was' : i === step ? 'on' : go ? 'ahead' : '';
              return (
                <button key={i} type="button" className={mark} disabled={!go}
                        aria-label={`Beat ${i + 1}${i === step ? ', now' : ''}`}
                        onClick={() => onStep?.(i)}>
                  <i />
                </button>
              );
            })}
          </span>
          <span className="sensei-actions">
            {closing ? (
              <>
              <button type="button" className="sensei-skip" onClick={onLeave}>Lobby</button>
              <button type="button" className="sensei-skip sensei-play" onClick={onPlay}>Play</button>
              {onContinue && (
                <button type="button" className="sensei-next" onClick={onContinue}>{continueLabel}</button>
              )}
            </>
            ) : !onNext ? (
              <button type="button" className="sensei-skip" onClick={onSkip ?? onLeave}>{skipLabel}</button>
            ) : null}
            {onNext && (
              <button type="button" className="sensei-next" onClick={onNext}>Next</button>
            )}
          </span>
        </div>
      </div>
      <SenseiSprite />
    </div>
  );
}
