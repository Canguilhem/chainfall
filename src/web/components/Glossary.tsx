import { KWHELP, KWNAME, type Keyword } from '../../engine/index.ts';

const TABLE_TERMS: { t: string; d: string }[] = [
  { t: 'Block', d: 'Your turn. Gas refills, you act, then you seal. Unspent gas is gone.' },
  { t: 'Gas', d: 'The spend to play cards and fire your crew power. Refills each block.' },
  { t: 'Asset', d: 'A unit on the board. Attack hits. HP is life. 0 HP is a liquidation.' },
  { t: 'Operation', d: 'A one-shot. Resolves, then leaves your hand. Marked OP.' },
  { t: 'Deploy', d: 'Play an Asset onto the board. It cannot attack this block unless it has Zero-Conf.' },
  { t: 'Liquidation', d: 'An Asset hits 0 HP and is destroyed. Some cards fire when they go.' },
  { t: 'Seize', d: 'Frozen. The Asset cannot attack. Clears at the end of your next turn.' },
  { t: 'Claim', d: 'Take one face-up card from the Feed into your hand. Salvage Run only.' },
  { t: 'Seal', d: 'End your turn. The fight passes to them.' },
  { t: 'Ledger', d: 'The match log. Claims, plays, hits and scrapes, in order.' },
  { t: 'Armor', d: 'Soaks damage before HP. Consortium prints it.' },
  { t: 'Consensus', d: 'Play a second card of the same crew this block and that card’s CONSENSUS line fires. Two of the same crew agreeing in the same block.' },
];

const KW_ORDER = Object.keys(KWHELP) as Keyword[];

function Cards({ items }: { items: { t: string; d: string }[] }) {
  return (
    <dl className="gloss">
      {items.map(e => (
        <div key={e.t} className="gloss-item">
          <dt>{e.t}</dt>
          <dd>{e.d}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Glossary({ compact }: { compact?: boolean }) {
  return (
    <div className={`glossary${compact ? ' compact' : ''}`}>
      {compact && (
        <p className="gloss-cap">
          Salvage Run: claim one card from the Feed each block.
          Constructed: draw from your 25-card kit.
        </p>
      )}
      <section className="gloss-sec">
        <h2>Terms</h2>
        {!compact && <p className="gloss-cap">Verbs on the table and on the ledger.</p>}
        <Cards items={TABLE_TERMS} />
      </section>
      <section className="gloss-sec">
        <h2>Keywords</h2>
        {!compact && <p className="gloss-cap">Printed on Assets. Hover or tap a keyword or CONSENSUS line for the same text.</p>}
        <Cards items={KW_ORDER.map(k => ({ t: KWNAME[k], d: KWHELP[k] }))} />
      </section>
    </div>
  );
}
