import { FACTIONS, type PlayableFaction } from '../../engine/index.ts';
import { FactionMark } from './Marks.tsx';
import { Glossary } from './Glossary.tsx';

const CREWS = Object.keys(FACTIONS) as PlayableFaction[];

export function Rules() {
  return (
    <>
      <h1>RULES</h1>
      <p className="lede">Two crews, 20 HP each. Last one standing walks free.</p>

      <section className="how">
        <h2>The fight</h2>
        <p className="how-note">
          This is a turn-based card fight. You and they each have a hand, a board of five slots,
          and a crew power. Cards cost <b>gas</b>. Assets stay on the board and attack.
          Operations fire once and leave. Hit their HP to 0 before they hit yours.
        </p>
        <ul className="how-list">
          <li><b>Hand</b> — cards you can play this block.</li>
          <li><b>Board</b> — Assets in play. They attack on your block, not the turn they deploy (unless Zero-Conf).</li>
          <li><b>Gas</b> — the spend. Max gas goes up by 1 each block, cap 8. Unspent gas dies when you seal.</li>
          <li><b>Crew power</b> — PRINT, FORK, or APE IN. 2 gas, once per block.</li>
        </ul>
      </section>

      <section className="how">
        <h2>How a block works</h2>
        <ol className="loop" aria-label="A block">
          <li>Claim or draw</li>
          <li>Spend gas</li>
          <li>Attack</li>
          <li>Seal the block</li>
        </ol>
        <p className="how-note">
          Your turn is a <b>block</b>. Play cards and attack in any order, then seal.
          They cannot answer on your block. Play two cards of the same crew in one block
          and CONSENSUS fires on the second.
        </p>
      </section>

      <section className="how">
        <h2>Game modes</h2>
        <p className="gloss-cap">Same fight. Different way the cards arrive.</p>
        <div className="modes play-modes">
          <article className="mode">
            <h4>Salvage Run</h4>
            <p>
              No kit. A shared Feed of five face-up cards sits between you.
              Each block you <b>claim one</b> into your hand, then play.
              Anyone can take what is sitting there — including their cards.
            </p>
            <p>What changes: no kit. A card that draws takes from the remaining Feed. Empty Feed scrapes you. Collection is not required.</p>
          </article>
          <article className="mode">
            <h4>Constructed</h4>
            <p>
              Your own 25-card kit. Draw one at the start of each block.
              Two copies max (one for legends). Your crew plus neutrals — not their cards.
            </p>
            <p>What changes: you built the list. Empty kit scrapes you for rising damage.</p>
          </article>
        </div>
      </section>

      <section className="how">
        <h2>Crew powers</h2>
        <p className="gloss-cap">Once per block, for 2 gas. The button under your name.</p>
        <dl className="gloss">
          {CREWS.map(k => {
            const f = FACTIONS[k];
            return (
              <div key={k} className="gloss-item">
                <dt><FactionMark faction={k} size={12} />{f.power.name}</dt>
                <dd><b>{f.name.replace('The ', '')}.</b> {f.power.text}</dd>
              </div>
            );
          })}
        </dl>
      </section>

      <Glossary />
    </>
  );
}
