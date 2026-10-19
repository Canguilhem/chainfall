import { KWHELP, KWNAME, type Keyword } from '../../engine/index.ts';
import { KwMark } from './Marks.tsx';

const TABLE_TERMS: { t: string; d: string }[] = [
  { t: 'Block', d: 'Your turn. Gas refills, you act, then you seal. Unspent gas is gone.' },
  { t: 'Gas', d: 'The spend to play cards and fire your crew power. Refills each block.' },
  { t: 'Asset', d: 'A unit on the board. Attack hits. HP is life. 0 HP is a liquidation.' },
  { t: 'Operation', d: 'A one-shot. Resolves, then leaves your hand. Marked OP.' },
  { t: 'Deploy', d: 'Play an Asset onto the board. The On Deploy line happens then. It cannot attack this block unless it has Zero-Conf.' },
  { t: 'Liquidation', d: 'An Asset hits 0 HP and leaves. The On Liquidation line happens as it goes.' },
  { t: 'Freeze', d: 'The Asset cannot attack until the end of its owner’s next turn.' },
  { t: 'Claim', d: 'Take one face-up card from the Feed into your hand. Salvage Run only.' },
  { t: 'Seal', d: 'End your turn. The fight passes to them.' },
  { t: 'Ledger', d: 'The match log. Claims, plays, hits and scrapes, in order.' },
  { t: 'Armor', d: 'Soaks damage before HP. Consortium prints it.' },
  { t: 'Consensus', d: 'Fires only when the card with the line is the second card of its crew you play this block. Playing that card first does nothing.' },
];

const KW_ORDER = Object.keys(KWHELP) as Keyword[];

function termId(name: string): string {
  return `term-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;
}

function Cards({ items }: { items: { t: string; d: string; kw?: Keyword }[] }) {
  return (
    <dl className="gloss">
      {items.map(e => (
        <div key={e.t} id={e.kw ? `kw-${e.kw}` : termId(e.t)} className="gloss-item">
          <dt>
            {e.kw && <KwMark keyword={e.kw} size={14} />}
            {e.t}
          </dt>
          <dd>{e.d}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Glossary({ compact, keywords = true }: { compact?: boolean; keywords?: boolean }) {
  return (
    <div className={`glossary${compact ? ' compact' : ''}`}>
      {compact && (
        <p className="gloss-cap">
          Salvage Run: claim one card from the Feed each block.
          Constructed: draw from your 25-card deck.
        </p>
      )}
      <section className="gloss-sec">
        <h2>Terms</h2>
        {!compact && <p className="gloss-cap">Short definitions. The same list opens from Terms during a match.</p>}
        <Cards items={TABLE_TERMS} />
      </section>
      {keywords && (
        <section className="gloss-sec">
          <h2>Keywords</h2>
          {!compact && (
            <p className="gloss-cap">
              Printed as marks on Assets. Hover or tap a keyword chip or CONSENSUS line for the same text.
            </p>
          )}
          <Cards items={KW_ORDER.map(k => ({ t: KWNAME[k], d: KWHELP[k], kw: k }))} />
        </section>
      )}
    </div>
  );
}
