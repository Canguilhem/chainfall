import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CARDS, DECK_SIZE, FACTIONS, RARITY, availableCopies, brewPool, kitTotal, maxOf, rarityOf, validateKit,
  type CardId, type KitCounts, type PlayableFaction, type Pull,
} from '../../engine/index.ts';
import { loadKit, saveKit, starterKit } from '../decks.ts';
import type { Wallet } from '../stash.ts';
import { CardFace } from './Card.tsx';
import { FactionMark } from './Marks.tsx';
import { PackSupply } from './PackSupply.tsx';

const CREWS = Object.keys(FACTIONS) as PlayableFaction[];
type PoolFilter = 'all' | 'in' | 'out' | 'need';

type Props = {
  wallet: Wallet;
  onBuyPack: () => boolean;
  onOpenPack: () => { pulls: Pull[]; refund: number } | null;
  onCraft: (id: string) => boolean;
  onSalvage: (id: string) => boolean;
};

function curveBuckets(kit: KitCounts): number[] {
  const buckets = Array.from({ length: 9 }, () => 0);
  for (const [id, n] of Object.entries(kit)) {
    const cost = Math.min(8, CARDS[id as CardId].c);
    buckets[cost]! += n ?? 0;
  }
  return buckets;
}

export function KitBuilder({ wallet, onBuyPack, onOpenPack, onCraft, onSalvage }: Props) {
  const [faction, setFaction] = useState<PlayableFaction>('consortium');
  const [kit, setKit] = useState<KitCounts>(() => loadKit('consortium'));
  const [filter, setFilter] = useState<PoolFilter>('all');
  const [q, setQ] = useState('');
  const [toast, setToast] = useState('');

  const ping = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1600);
  };

  const pool = useMemo(() => brewPool(faction).sort(
    (a, b) => CARDS[a].c - CARDS[b].c || CARDS[a].n.localeCompare(CARDS[b].n),
  ), [faction]);

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
    const avail = availableCopies(faction, id, wallet.owned);
    if (filter === 'in' && !n) return false;
    if (filter === 'out' && n) return false;
    if (filter === 'need' && avail >= maxOf(id)) return false;
    if (q.trim()) {
      const hay = CARDS[id].n.toLowerCase();
      if (!hay.includes(q.trim().toLowerCase())) return false;
    }
    return true;
  }), [pool, kit, filter, q, faction, wallet.owned]);

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
      <h1>YOUR <span>DECK</span></h1>
      <p className="kit-lede">
        Starters are always legal. Packs and craft add copies so you can brew custom lists.
        Deck rules still cap copies (usually 2 · legends 1) — extras sit in stash until you sell them.
      </p>

      <PackSupply wallet={wallet} onBuy={onBuyPack} onOpen={onOpenPack} />

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
                <b>{n > 0 ? n : ''}</b>
                <span className="kit-curve-plot">
                  <i style={{ height: n ? `${(n / curveMax) * 100}%` : '0%' }} />
                </span>
                <em>{cost === 8 ? '8+' : cost}</em>
              </div>
            ))}
          </div>

          <p className="kit-deck-hint">Tap a card to remove one copy</p>
          <div className="kit-deck-faces">
            {!deckCards.length
              ? <p className="stash-empty">Empty. Pick cards from the pool.</p>
              : deckCards.map(id => {
                const n = kit[id] ?? 0;
                const avail = availableCopies(faction, id, wallet.owned);
                return (
                  <button key={id} type="button" className="kit-deck-face"
                          onClick={() => remove(id)}
                          aria-label={`Remove one ${CARDS[id].n}`}>
                    <CardFace id={id} tips={false}
                              footerMid={
                                <span className="kit-copy-n">{n}<small>/{avail}</small></span>
                              } />
                  </button>
                );
              })}
          </div>
        </aside>

        <section className="kit-coll" aria-label="Card pool">
          <div className="kit-coll-bar">
            <div className="kit-coll-tabs">
              <div className="stash-tabs kit-filters" role="tablist" aria-label="Filter pool">
                {([
                  ['all', 'ALL'],
                  ['in', 'IN DECK'],
                  ['out', 'NOT IN DECK'],
                  ['need', 'NEED'],
                ] as const).map(([id, label]) => (
                  <button key={id} type="button" role="tab" aria-selected={filter === id}
                          className={`stash-tab${filter === id ? ' on' : ''}`}
                          onClick={() => setFilter(id)}>
                    {label}
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
          <p className="kit-coll-hint">
            Tap to add · craft when you have no copies · sell extras for salvage · {shown.length} shown
          </p>
          <div className="kit-grid">
            {shown.map(id => {
              const n = kit[id] ?? 0;
              const avail = availableCopies(faction, id, wallet.owned);
              const owned = wallet.owned[id] ?? 0;
              const rar = rarityOf(id);
              const R = RARITY[rar];
              const canAdd = avail > n && total < DECK_SIZE;
              const locked = avail === 0;
              const extras = owned > R.max;

              return (
                <article key={id}
                         className={`kit-tile-wrap${n ? ' in' : ''}${locked ? ' locked' : ''}${extras ? ' extra' : ''}`}>
                  <button type="button"
                          className={`kit-tile${n ? ' in' : ''}${!canAdd && !n ? ' full' : ''}`}
                          disabled={!canAdd && !n}
                          onClick={() => {
                            if (n >= avail) {
                              if (n > 0) remove(id);
                              return;
                            }
                            if (total >= DECK_SIZE) {
                              if (n > 0) remove(id);
                              return;
                            }
                            add(id);
                          }}
                          aria-label={locked
                            ? `${CARDS[id].n}, no copies — craft or open packs`
                            : `${CARDS[id].n}, ${n} of ${avail} in deck`}>
                    <CardFace id={id}
                              footerMid={
                                <span className="kit-copy-n" title={owned ? `${owned} owned (deck max ${R.max})` : 'No vault copies'}>
                                  {n}<small>/{avail || R.max}</small>
                                </span>
                              } />
                  </button>
                  {(wallet.salvage >= R.craft || owned > 0) && (
                    <div className="kit-tile-act">
                      {wallet.salvage >= R.craft && (
                        <button type="button"
                                title={`Spend ${R.craft} salvage to craft one copy`}
                                onClick={() => {
                                  if (onCraft(id)) ping(`${CARDS[id].n} crafted · −${R.craft}`);
                                  else ping(`Need ${R.craft} salvage`);
                                }}>
                          CRAFT −{R.craft}
                        </button>
                      )}
                      {owned > 0 && (
                        <button type="button" className="vault-act-sell"
                                title={`Sell one for +${R.salvage} salvage`}
                                onClick={() => {
                                  if (onSalvage(id)) ping(`${CARDS[id].n} sold · +${R.salvage}`);
                                  else ping(`Can't sell`);
                                }}>
                          SELL +{R.salvage}
                        </button>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      </div>
      <p className="kit-foot">
        25 cards · one saved list per crew · soft playset: you can own more than the deck allows.
      </p>
      {toast && createPortal(<div className="vault-toast" role="status">{toast}</div>, document.body)}
    </div>
  );
}
