import { type MatchView } from '../../engine/index.ts';
import { useFlyLists } from '../anim.tsx';
import { deadWhy, isPlayable } from '../match/legality.ts';
import { ClaimSheet, CardSheet } from './Sheet.tsx';
import { Glossary } from './Glossary.tsx';

type FlyLists = ReturnType<typeof useFlyLists>;

type Props = {
  fighting: boolean;
  v: MatchView | null;
  fly: FlyLists;
  sheetFeed: boolean;
  claiming: boolean;
  peeked?: FlyLists['hand'][number];
  lexicon: boolean;
  onClaim: (i: number) => void;
  onFeedClose: () => void;
  onPlayPeeked: () => void;
  onClosePeek: () => void;
  onCloseLexicon: () => void;
};

export function MatchOverlays({
  fighting, v, fly, sheetFeed, claiming, peeked, lexicon,
  onClaim, onFeedClose, onPlayPeeked, onClosePeek, onCloseLexicon,
}: Props) {
  return (
    <>
      {sheetFeed && v && (
        <ClaimSheet feed={fly.feed} remaining={v.feedRemaining} claimable={claiming}
                    onClaim={onClaim} onClose={onFeedClose} />
      )}
      {peeked && v && !sheetFeed && (
        <CardSheet id={peeked.id} playable={isPlayable(v, peeked.id)}
                   why={deadWhy(v, peeked.id)}
                   onPlay={onPlayPeeked}
                   onClose={onClosePeek} />
      )}

      {fighting && (
        <div id="rotate" role="alertdialog" aria-labelledby="rot-h">
          <strong id="rot-h">TURN THE PHONE</strong>
          <p>Portrait fits both boards, the Feed and your hand on one screen. Landscape does not.</p>
          <small>The match is still running. Nothing was lost.</small>
        </div>
      )}

      {lexicon && (
        <div id="lexicon" role="dialog" aria-labelledby="lex-h">
          <div className="lex-head">
            <h2 id="lex-h">Glossary</h2>
            <button type="button" className="skip" onClick={onCloseLexicon}>close</button>
          </div>
          <Glossary compact />
        </div>
      )}
    </>
  );
}
