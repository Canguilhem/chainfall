import { FACTIONS, KWHELP, KWNAME, type Keyword, type PlayableFaction } from '../../engine/index.ts';
import { FactionMark, KwMark } from './Marks.tsx';
import { Glossary } from './Glossary.tsx';

const CREWS = Object.keys(FACTIONS) as PlayableFaction[];
const KEYWORDS = Object.keys(KWHELP) as Keyword[];

export function Rules() {
  return (
    <div className="rules">
      <h1>RULES</h1>
      <p className="lede">Two crews, 20 HP. Spend gas, attack, seal. Last one standing walks free.</p>

      <section className="how rules-block">
        <h2>A block</h2>
        <ol className="loop" aria-label="A block">
          <li>Claim or draw</li>
          <li>Spend gas</li>
          <li>Attack</li>
          <li>Seal</li>
        </ol>
        <p className="how-note">
          Play and attack in any order. They cannot answer on your block.
          Two same-crew cards in one block → <b>Consensus</b> fires on the second.
        </p>
      </section>

      <section className="how">
        <h2>Essentials</h2>
        <ul className="rules-essentials">
          <li>
            <b>Gas</b>
            <span>Max rises by 1 each block, cap 8. Unspent gas dies when you seal.</span>
          </li>
          <li>
            <b>Assets</b>
            <span>Stay on the board. Attack next block — or this one with Zero-Conf.</span>
          </li>
          <li>
            <b>Ops</b>
            <span>Fire once, then leave. Marked OP on the face.</span>
          </li>
          <li>
            <b>Crew power</b>
            <span>2 gas, once per block. The button under your name.</span>
          </li>
        </ul>
      </section>

      <section className="how">
        <h2>Keyword marks</h2>
        <p className="how-note">Same glyphs on the card face, the board, and every hover tip.</p>
        <ul className="rules-keywords">
          {KEYWORDS.map(k => (
            <li key={k}>
              <span className="rules-kw-name">
                <KwMark keyword={k} size={16} />
                {KWNAME[k]}
              </span>
              <span className="rules-kw-fx">{KWHELP[k]}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="how">
        <h2>Modes</h2>
        <div className="modes play-modes">
          <article className="mode">
            <h4>Salvage Run</h4>
            <p>No deck. Claim one face-up Feed card each block, then play. Collection not required.</p>
          </article>
          <article className="mode">
            <h4>Constructed</h4>
            <p>Your 25-card deck. Draw one each block. Crew + neutrals only.</p>
          </article>
        </div>
      </section>

      <section className="how">
        <h2>Crew powers</h2>
        <ul className="rules-powers">
          {CREWS.map(k => {
            const f = FACTIONS[k];
            return (
              <li key={k}>
                <span className="rules-power-name">
                  <FactionMark faction={k} size={12} />
                  {f.power.name}
                </span>
                <span className="rules-power-crew">{f.name.replace('The ', '')}</span>
                <span className="rules-power-fx">{f.power.text}</span>
              </li>
            );
          })}
        </ul>
      </section>

      <details className="rules-ref">
        <summary>Terms &amp; keywords</summary>
        <p className="rules-ref-note">Also available mid-match via <b>terms</b> in the header.</p>
        <Glossary />
      </details>
    </div>
  );
}
