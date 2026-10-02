import { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  CARDS, PACK_COST, PITY_EPIC, PITY_LEGEND, RARITY,
  type Pull, type Rarity,
} from '../../engine/index.ts';
import type { Wallet } from '../stash.ts';
import { CardFace } from './Card.tsx';

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
              aria-label={up ? `${c.n}, ${pull.dupe ? 'extra copy' : 'new'}` : 'Sealed card. Tap to verify.'}
              onClick={onFlip}>
        <div className="vault-face vault-back">◆</div>
        <div className="vault-face vault-front">
          <CardFace id={pull.id} />
        </div>
      </button>
      <div className={`vault-tag${up ? (pull.dupe ? '' : ' new') : ' wait'}`}>
        {up ? (pull.dupe ? 'EXTRA' : 'NEW') : '—'}
      </div>
    </div>
  );
}

type Props = {
  wallet: Wallet;
  onBuy: () => boolean;
  onOpen: () => { pulls: Pull[]; refund: number } | null;
};

/** Pack buy/open for the Deck page — supply sits next to list building. */
export function PackSupply({ wallet, onBuy, onOpen }: Props) {
  const [openDetail, setOpenDetail] = useState(false);
  const [reveal, setReveal] = useState<{ pulls: Pull[]; opened: number } | null>(null);
  const [flipped, setFlipped] = useState<boolean[]>([]);
  const [toast, setToast] = useState('');

  const ping = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(''), 1600);
  };

  const stackN = Math.min(3, Math.max(1, wallet.packs));
  const hashes = useMemo(
    () => Array.from({ length: stackN }, (_, i) => packHash(wallet.opened, i)),
    [stackN, wallet.opened],
  );

  const buy = () => {
    if (onBuy()) ping('pack acquired');
  };

  const open = () => {
    const result = onOpen();
    if (!result) return;
    setFlipped(result.pulls.map(() => false));
    setReveal({ pulls: result.pulls, opened: wallet.opened + 1 });
  };

  return (
    <>
      <section className="kit-supply" aria-label="Pack supply">
        <div className="kit-supply-chips">
          <span className="vault-chip">SCRIP <b>{wallet.scrip}</b></span>
          <span className="vault-chip sv">SALVAGE <b>{wallet.salvage}</b></span>
          <span className="vault-chip">SEALED <b>{wallet.packs}</b></span>
        </div>
        <div className="kit-supply-acts">
          <button type="button" className="vault-btn" disabled={wallet.scrip < PACK_COST} onClick={buy}>
            BUY PACK · {PACK_COST}
          </button>
          <button type="button" className="vault-btn ghost" disabled={!wallet.packs} onClick={open}
                  aria-label={wallet.packs ? 'Open a sealed pack' : 'No sealed packs'}>
            OPEN {wallet.packs ? `(${wallet.packs})` : ''}
          </button>
          <button type="button" className="kit-supply-more"
                  aria-expanded={openDetail}
                  onClick={() => setOpenDetail(v => !v)}>
            {openDetail ? 'Hide odds' : 'Odds'}
          </button>
        </div>
        {openDetail && (
          <div className="kit-supply-detail">
            <div className="vault-stack kit-supply-stack">
              {Array.from({ length: stackN }, (_, i) => {
                const top = i === stackN - 1;
                return (
                  <button key={i} type="button"
                          className={`blockpack${top ? ' top' : ''}${wallet.packs ? '' : ' empty'}`}
                          disabled={!wallet.packs || !top}
                          onClick={top && wallet.packs ? open : undefined}
                          aria-label={wallet.packs ? 'Open a sealed pack' : 'No sealed packs'}>
                    <div className="seal">◆</div>
                    <div className="bt">SEALED</div>
                    <div className="bs">PACK · 5 CARDS</div>
                    <div className="hash">{hashes[i]}</div>
                  </button>
                );
              })}
            </div>
            <div className="vault-odds">
              <p>Five cards per pack, at least one Rare or better. Extras above the deck playset stay in your stash — sell them for salvage when you want.</p>
              {(Object.keys(RARITY) as Rarity[]).map(k => {
                const r = RARITY[k];
                return (
                  <div key={k}>
                    <b>{r.label}</b> {r.weight}% · salvage {r.salvage} · craft {r.craft} · deck max {r.max}
                  </div>
                );
              })}
              <div className="vault-odds-note">
                <b>PITY</b> epic by {PITY_EPIC} packs · legend by {PITY_LEGEND}<br />
                <b>PULLS</b> prefer cards under playset, then extras
              </div>
            </div>
          </div>
        )}
      </section>

      {reveal && createPortal(
        <div className="vault-reveal" role="dialog" aria-labelledby="vault-rev-h">
          <div className="revhead" id="vault-rev-h">
            pack {String(reveal.opened).padStart(4, '0')} · tap to verify
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
              {reveal.pulls.filter(p => !p.dupe).length} new · {reveal.pulls.filter(p => p.dupe).length} extra
            </div>
            <button className="vault-btn ghost" type="button"
                    onClick={() => setFlipped(reveal.pulls.map(() => true))}>REVEAL ALL</button>
            <button className="vault-btn" type="button" onClick={() => setReveal(null)}>CLOSE</button>
          </div>
        </div>,
        document.body,
      )}
      {toast && createPortal(<div className="vault-toast" role="status">{toast}</div>, document.body)}
    </>
  );
}
