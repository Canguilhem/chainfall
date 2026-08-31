import { useMemo, useState } from 'react';
import {
  CARDS, DECK_SIZE, FACTIONS, FNAME, availableCopies, kitTotal, legalPool, rarityOf, validateKit,
  type CardId, type KitCounts, type PlayableFaction
} from '../../engine/index.ts';
import { loadKit, saveKit, starterKit } from '../decks.ts';
import type { Wallet } from '../stash.ts';
import { CardFace } from './Card.tsx';
import { FactionMark } from './Marks.tsx';

const CREWS = Object.keys(FACTIONS) as PlayableFaction[];
type PoolFilter = 'all' | 'in' | 'out';

type Props = {
  wallet: Wallet;
};

function curveBuckets(kit: KitCounts): number[] {
  const buckets = Array.from({ length: 9 }, () => 0);
  for (const [id, n] of Object.entries(kit)) {
    const cost = Math.min(8, CARDS[id as CardId].c);
    buckets[cost]! += n ?? 0;
  }
  return buckets;
}

export function KitBuilder({ wallet }: Props) {
  const [faction, setFaction] = useState<PlayableFaction>('consortium');
  const [kit, setKit] = useState<KitCounts>(() => loadKit('consortium'));
  const [filter, setFilter] = useState<PoolFilter>('all');
  const [q, setQ] = useState('');

  const pool = useMemo(
    () => legalPool(faction, wallet.owned).sort((a, b) => CARDS[a].c - CARDS[b].c || CARDS[a].n.localeCompare(CARDS[b].n)),
    [faction, wallet.owned],
  );
  const total = kitTotal(kit);
  const err = validateKit(kit, faction, wallet.owned);
  const valid = !err;
  const curve = useMemo(() => curveBuckets(kit), [kit]);
  const curveMax = Math.max(1, ...curve);

  const deckCards = useMemo(
    () => pool.filter(id => (kit[id] ?? 0) > 0),
    [pool, kit],
  );

  const shown = useMemo(() => pool.filter(id => {
    const n = kit[id] ?? 0;
    if (filter === 'in' && !n) return false;
    if (filter === 'out' && n) return false;
    if (q.trim()) {
      const hay = CARDS[id].n.toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  }), [pool, kit, filter, q]);

  const pickFaction = (f: PlayableFaction) => {
    setFaction(f);
    setKit(loadKit(f));
    setFilter('all');
    setQ('');
  };

  const setCount = (id: CardId, n: number) => {
    const next = { ...kit };
    if (n <= 0) delete next[id];
    else next[id] = n;
    setKit(next);
    saveKit(faction, next);
  };

  const add = (id: CardId) => {
    const avail = availableCopies(faction, id, wallet.owned);
    const cur = kit[id] ?? 0;
    if (cur >= avail || total >= DECK_SIZE) return;
    setCount(id, cur + 1);
  };

  const remove = (id: CardId) => {
    const cur = kit[id] ?? 0;
    if (cur <= 0) return;
    setCount(id, cur - 1);
  };

  const reset = () => {
    const s = starterKit(faction);
    setKit(s);
    saveKit(faction, s);
  };

  return (
    <div className="kit-page">
      <div className="kit-workspace">
        <aside className="kit-deck" aria-label="Your deck">
          <div className="kit-deck-top">
            <div className="kit-deck-count" aria-live="polite">
              <b>{total}</b><span>/ {DECK_SIZE}</span>
              <p className={`kit-status${valid ? ' ok' : ''}`}>{valid ? 'Ready' : err}</p>
            </div>
            <button type="button" className="vault-btn ghost kit-reset" onClick={reset}>Reset</button>
          </div>

          <div className="kit-curve" aria-label="Gas curve">
            {curve.map((n, cost) => (
              <div key={cost} className="kit-curve-col" title={`${cost === 8 ? '8+' : cost} gas · ${n}`}>
                <i style={{ height: `${n / curveMax * 100}%` }} />
                <em>{cost === 8 ? '8+' : cost}</em>
              </div>
            ))}
          </div>

          <p className="kit-deck-hint">Tap a row to remove one copy</p>
          <div className="kit-deck-list">
            {!deckCards.length
              ? <p className="stash-empty">Empty. Pick cards from the collection.</p>
              : deckCards.map(id => {
                const c = CARDS[id];
                const n = kit[id] ?? 0;
                const avail = availableCopies(faction, id, wallet.owned);
                const rar = rarityOf(id);
                return (
                  <button key={id} type="button" className={`kit-deck-row r-${rar}`}
                          onClick={() => remove(id)}
                          aria-label={`Remove one ${c.n}`}>
                    <span className="kit-row-cost">{c.c}</span>
                    <span className="kit-row-name">{c.n}</span>
                    <span className="kit-row-meta">{FNAME[c.f]}</span>
                    <span className="kit-row-n">{n}<small>/{avail}</small></span>
                  </button>
                );
              })}
          </div>
        </aside>

        <section className="kit-coll" aria-label="Collection">
          <div className="kit-coll-bar">
            <div className="kit-coll-tabs">
              <div className="stash-tabs kit-filters" role="tablist" aria-label="Filter collection">
                {(['all', 'in', 'out'] as PoolFilter[]).map(f => (
                  <button key={f} type="button" role="tab" aria-selected={filter === f}
                          className={`stash-tab${filter === f ? ' on' : ''}`}
                          onClick={() => setFilter(f)}>
                    {f === 'all' ? 'ALL' : f === 'in' ? 'IN DECK' : 'NOT IN DECK'}
                  </button>
                ))}
              </div>
              <span className="kit-bar-sep" aria-hidden />
              <div className="stash-tabs kit-crews" role="tablist" aria-label="Crew">
                {CREWS.map(f => (
                  <button key={f} type="button" role="tab" aria-selected={faction === f}
                          className={`stash-tab${faction === f ? ' on' : ''}`}
                          onClick={() => pickFaction(f)}>
                    <FactionMark faction={f} size={12} />
                    {FACTIONS[f].name.replace('The ', '').toUpperCase()}
                  </button>
                ))}
              </div>
            </div>
            <input type="search" className="kit-search" placeholder="Search cards…"
                   value={q} onChange={e => setQ(e.target.value)} aria-label="Search cards" />
          </div>
          <p className="kit-coll-hint">Tap a card to add · {shown.length} shown</p>
          <div className="kit-grid">
            {shown.map(id => {
              const n = kit[id] ?? 0;
              const avail = availableCopies(faction, id, wallet.owned);
              const full = n >= avail || (total >= DECK_SIZE && !n);
              return (
                <button key={id} type="button"
                        className={`kit-tile${n ? ' in' : ''}${full && !n ? ' full' : ''}`}
                        disabled={full && !n}
                        onClick={() => {
                          if (n >= avail) return;
                          if (total >= DECK_SIZE) { if (n > 0) remove(id); return; }
                          add(id);
                        }}
                        aria-label={`${CARDS[id].n}, ${n} of ${avail} in deck`}>
                  <CardFace id={id}
                            footerMid={<span className="kit-copy-n">{n}<small>/{avail}</small></span>} />
                </button>
              );
            })}
          </div>
        </section>
      </div>
      <p className="kit-foot">25 cards · starter copies always legal · vault adds brews · one saved list per crew.</p>
    </div>
  );
}
