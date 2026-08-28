import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CARDS, FNAME, PACK_COST, PACK_IDS, PITY_EPIC, PITY_LEGEND, PLAYSET, RARITY,
  maxOf, rarityOf, type CardId, type Pull, type Rarity
} from '../../engine/index.ts';
import { CardFace } from './Card.tsx';
import type { Wallet } from '../stash.ts';

type Tab = 'vault' | 'coll';
type Filter = 'all' | 'missing' | Rarity;

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'ALL' },
  { id: 'missing', label: 'MISSING' },
  { id: 'common', label: 'COMMON' },
  { id: 'rare', label: 'RARE' },
  { id: 'epic', label: 'EPIC' },
  { id: 'legend', label: 'LEGEND' },
];

function packHash(opened: number, i: number): string {
  let x = (opened * 1103515245 + i * 12345) >>> 0;
  return Array.from({ length: 16 }, () => {
    x = (x * 1664525 + 1013904223) >>> 0;
    return '0123456789abcdef'[x & 15]!;
  }).join('');
}

function Flip({ pull, delay, up, onFlip }: {
  pull: Pull; delay: number; up: boolean; onFlip: () => void;
}) {
  const c = CARDS[pull.id];
  return (
    <div className={`vault-pull r-${pull.rar}${up ? ' shown' : ''}`}>
      <button type="button" className={`vault-flip r-${pull.rar}${up ? ' up' : ''} dealt`}
              style={{ animationDelay: `${delay}ms` }}
              aria-label={up ? `${c.n}, ${pull.dupe ? 'duplicate' : 'new'}` : 'Sealed card. Tap to verify.'}
              onClick={onFlip}>
        <div className="vault-face vault-back">◆</div>
        <div className="vault-face vault-front">
          <CardFace id={pull.id} />
        </div>
      </button>
      <div className={`vault-tag${up ? (pull.dupe ? '' : ' new') : ' wait'}`}>
        {up ? (pull.dupe ? `DUPE · +${RARITY[pull.rar].salvage}` : 'NEW') : '—'}
      </div>
    </div>
  );
}

export function Vault({ wallet, onBuy, onOpen, onCraft, onSalvage }: {
  wallet: Wallet;
  onBuy: () => boolean;
  onOpen: () => { pulls: Pull[]; refund: number } | null;
  onCraft: (id: string) => boolean;
  onSalvage: (id: string) => boolean;
}) {
  const [tab, setTab] = useState<Tab>('vault');
  const [filter, setFilter] = useState<Filter>('all');
  const [reveal, setReveal] = useState<{ pulls: Pull[]; refund: number; opened: number } | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [toast, setToast] = useState('');
  const ping = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1600);
  };

  const stackN = Math.min(3, Math.max(1, wallet.packs));
  const hashes = useMemo(
    () => Array.from({ length: stackN }, (_, i) => packHash(wallet.opened, i)),
    [stackN, wallet.opened]
  );
  const have = PACK_IDS.reduce((n, id) => n + Math.min(wallet.owned[id] ?? 0, maxOf(id)), 0);

  const ids = PACK_IDS.filter(id => {
    const n = wallet.owned[id] ?? 0;
    if (filter === 'all') return true;
    if (filter === 'missing') return n < maxOf(id);
    return rarityOf(id) === filter;
  }).sort((a, b) => CARDS[a].c - CARDS[b].c || CARDS[a].n.localeCompare(CARDS[b].n));

  const buy = () => {
    if (onBuy()) ping('block acquired');
  };
  const open = () => {
    const result = onOpen();
    if (!result) return;
    setFlipped(result.pulls.map(() => false));
    setReveal({ ...result, opened: wallet.opened + 1 });
  };
  const closeReveal = () => { setReveal(null); setTab('vault'); };

  return (
    <>
      <h1>THE <span>VAULT</span></h1>
      <div className="vault-wallet" aria-label="Wallet">
        <div className="vault-chip">SCRIP <b>{wallet.scrip}</b></div>
        <div className="vault-chip sv">SALVAGE <b>{wallet.salvage}</b></div>
        <div className="vault-chip">SEALED <b>{wallet.packs}</b></div>
      </div>
      <div className="stash-tabs" role="tablist" aria-label="Vault">
        <button type="button" role="tab" aria-selected={tab === 'vault'}
                className={`stash-tab${tab === 'vault' ? ' on' : ''}`} onClick={() => setTab('vault')}>
          VAULT
        </button>
        <button type="button" role="tab" aria-selected={tab === 'coll'}
                className={`stash-tab${tab === 'coll' ? ' on' : ''}`} onClick={() => setTab('coll')}>
          COLLECTION <em>{have}/{PLAYSET}</em>
        </button>
      </div>

      {tab === 'vault' && (
        <div className="vault-shop">
          <div className="vault-stack">
            {Array.from({ length: stackN }, (_, i) => {
              const top = i === stackN - 1;
              return (
                <button key={i} type="button"
                        className={`blockpack${top ? ' top' : ''}${wallet.packs ? '' : ' empty'}`}
                        disabled={!wallet.packs || !top}
                        onClick={top && wallet.packs ? open : undefined}
                        aria-label={wallet.packs ? 'Open a sealed block' : 'No sealed blocks'}>
                  <div className="seal">◆</div>
                  <div className="bt">SEALED</div>
                  <div className="bs">BLOCK · 5 CARDS</div>
                  <div className="hash">{hashes[i]}</div>
                </button>
              );
            })}
          </div>
          <div className="vault-info">
            <h2>SEALED BLOCKS</h2>
            <p>Five cards per block, at least one Rare or better. Salvaged from Consortium distribution depots, so the contents are whatever they were shipping that week.</p>
            <button className="vault-btn" type="button" disabled={wallet.scrip < PACK_COST} onClick={buy}>
              BUY BLOCK · {PACK_COST}
            </button>
            <div className="vault-odds">
              {(Object.keys(RARITY) as Rarity[]).map(k => {
                const r = RARITY[k];
                return (
                  <div key={k}>
                    <b>{r.label}</b> {r.weight}% · salvage {r.salvage} · craft {r.craft} · max {r.max}
                  </div>
                );
              })}
              <div className="vault-odds-note">
                <b>PITY</b>  epic by {PITY_EPIC} blocks · legend by {PITY_LEGEND}<br />
                <b>DUPES</b> maxed cards never drop again
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'coll' && (
        <div className="vault-coll">
          <div className="stash-count" aria-live="polite">
            <b>{have}<span> / {PLAYSET}</span></b>
            <div className="recap-bar"><i style={{ width: `${have / PLAYSET * 100}%` }} /></div>
          </div>
          <div className="stash-tabs" role="tablist" aria-label="Rarity">
            {FILTERS.map(f => (
              <button key={f.id} type="button" role="tab" aria-selected={filter === f.id}
                      className={`stash-tab${filter === f.id ? ' on' : ''}`}
                      onClick={() => setFilter(f.id)}>{f.label}</button>
            ))}
          </div>
          <div className="vault-grid">
            {ids.map(id => {
              const c = CARDS[id as CardId];
              const rar = rarityOf(id);
              const R = RARITY[rar];
              const n = wallet.owned[id] ?? 0;
              return (
                <div key={id} className={`vault-slot r-${rar}${n ? '' : ' none'}`}>
                  <div className="scount">{n}/{R.max}</div>
                  <div className="sn">{c.n}</div>
                  <div className="smeta">{c.c} GAS · {R.label} · {FNAME[c.f].toUpperCase()}</div>
                  <div className="sact">
                    <button type="button" disabled={n >= R.max || wallet.salvage < R.craft}
                            onClick={() => { if (onCraft(id)) ping(`crafted ${c.n}`); }}>
                      CRAFT {R.craft}
                    </button>
                    <button type="button" disabled={n <= 0}
                            onClick={() => { if (onSalvage(id)) ping(`+${R.salvage} salvage`); }}>
                      SALVAGE {R.salvage}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="vault-note">
            COLLECTION {have}/{PLAYSET} · {wallet.opened} {wallet.opened === 1 ? 'block' : 'blocks'} opened.
            Starter kits stay playable in full — this unlocks deckbuilding, not the right to fight.
          </p>
        </div>
      )}

      {reveal && createPortal(
        <div className="vault-reveal" role="dialog" aria-labelledby="vault-rev-h">
          <div className="revhead" id="vault-rev-h">
            block {String(reveal.opened).padStart(4, '0')} · tap to verify
          </div>
          <div className="vault-pulls">
            {reveal.pulls.map((p, i) => (
              <Flip key={`${reveal.opened}-${i}`} pull={p} delay={i * 70}
                    up={!!flipped[i]}
                    onFlip={() => setFlipped(prev => prev.map((v, j) => j === i ? true : v))} />
            ))}
          </div>
          <div className="revfoot">
            <div className="revsum">
              {reveal.pulls.filter(p => !p.dupe).length} new · {reveal.pulls.filter(p => p.dupe).length} dupe
              {reveal.refund ? ` · +${reveal.refund} salvage` : ''}
            </div>
            <button className="vault-btn ghost" type="button"
                    onClick={() => setFlipped(reveal.pulls.map(() => true))}>REVEAL ALL</button>
            <button className="vault-btn" type="button" onClick={closeReveal}>CLOSE</button>
          </div>
        </div>,
        document.body
      )}
      {toast && createPortal(<div className="vault-toast" role="status">{toast}</div>, document.body)}
    </>
  );
}
