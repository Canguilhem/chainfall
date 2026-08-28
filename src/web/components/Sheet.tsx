/* ============================================================================
   Touch sheets.

   The desktop table is spatial: two boards facing each other with a Feed strip
   on the centreline. That metaphor does not survive 390x844, and it was never
   the right home for the Feed anyway — the Feed is only decidable for about
   four seconds a block, so it does not earn persistent chrome.

   Both sheets here are the same shape: cover the table, show cards big enough
   to read their rules text, take one tap to select and a second to commit. The
   second tap matters. A mis-tap that claims the wrong card or resolves removal
   on the wrong Asset is not recoverable, and there is no hover to inspect with
   first.
   ========================================================================== */
import { useEffect, useState } from 'react';
import { CARDS, type CardId } from '../../engine/index.ts';
import { CardFace, CardNotes, hasNotes } from './Card.tsx';
import type { Keyed } from '../anim.tsx';

function useLockedBody() {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);
}

/** The Feed, as a full-width sheet. Read-only outside your claim step, so the
 *  market stays inspectable on a block where you cannot take from it. */
export function ClaimSheet({ feed, remaining, claimable, onClaim, onClose }: {
  feed: Keyed[]; remaining: number; claimable: boolean;
  onClaim: (i: number) => void; onClose: () => void;
}) {
  const [pick, setPick] = useState<number | null>(null);
  useLockedBody();
  useEffect(() => { setPick(null); }, [claimable]);

  const chosen = pick != null ? feed[pick] : undefined;
  const name = chosen ? CARDS[chosen.id as CardId].n : '';
  return (
    <div className="sheet" role="dialog" aria-modal="true" aria-labelledby="claim-h">
      <div className="sheet-head">
        <h2 id="claim-h">{claimable ? 'CLAIM ONE' : 'SHARED FEED'}</h2>
        <span className="sheet-count">{remaining} left</span>
        {!claimable && (
          <button type="button" className="sheet-x" onClick={onClose} aria-label="Close the feed">close</button>
        )}
      </div>
      <div className="sheet-body">
        <div className="sheet-grid">
          {feed.map((item, i) => (
            <CardFace key={item.key} id={item.id} selected={pick === i}
                      onClick={() => setPick(pick === i ? null : i)} />
          ))}
        </div>
        {chosen && hasNotes(chosen.id, true) && (
          <div className="sheet-notes">
            <strong>{name}</strong>
            <CardNotes id={chosen.id} terse />
          </div>
        )}
      </div>
      <div className="sheet-foot">
        {claimable ? (
          <>
            <button type="button" className="sheet-go" disabled={!chosen}
                    onClick={() => { if (pick != null) { onClaim(pick); setPick(null); } }}>
              {chosen ? `CLAIM ${name.toUpperCase()}` : 'TAP A CARD, THEN CLAIM'}
            </button>
            {/* What to claim depends on the board — whether you need a Firewall,
                what you can afford next block. A modal that hides the board
                while you decide about the board is no good, so this steps out
                without claiming. The Feed bar reopens it. */}
            <button type="button" className="sheet-go ghost" onClick={onClose}>BOARD</button>
          </>
        ) : (
          <button type="button" className="sheet-go ghost" onClick={onClose}>BACK TO THE BOARD</button>
        )}
      </div>
    </div>
  );
}

/** One hand card, inspected. The first tap on a card in hand opens this; only
 *  the button below plays it. */
export function CardSheet({ id, playable, why, onPlay, onClose }: {
  id: string; playable: boolean; why?: string; onPlay: () => void; onClose: () => void;
}) {
  const card = CARDS[id as CardId];
  useLockedBody();
  return (
    <div className="sheet card-sheet" role="dialog" aria-modal="true" aria-labelledby="cs-h">
      <div className="sheet-head">
        <h2 id="cs-h">{card.n}</h2>
        <span className="sheet-count">{card.c} gas</span>
        <button type="button" className="sheet-x" onClick={onClose} aria-label="Close">close</button>
      </div>
      <div className="sheet-body">
        <div className="sheet-solo"><CardFace id={id} /></div>
        {hasNotes(id, true) && (
          <div className="sheet-notes"><CardNotes id={id} terse /></div>
        )}
      </div>
      <div className="sheet-foot">
        <button type="button" className="sheet-go" disabled={!playable} onClick={onPlay}>
          {playable ? 'PLAY' : (why ?? 'CANNOT PLAY').toUpperCase()}
        </button>
        <button type="button" className="sheet-go ghost" onClick={onClose}>BACK</button>
      </div>
    </div>
  );
}
