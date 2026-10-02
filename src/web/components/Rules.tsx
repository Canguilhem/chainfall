import { FACTIONS, KWHELP, KWNAME, type Keyword, type PlayableFaction } from '../../engine/index.ts';
import { CardFace } from './Card.tsx';
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
          Two same-crew cards in one block → <a href="#read-consensus">Consensus</a> fires on the second.
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
            <span>Stay on the board. Attack next block — or this one with <a href="#kw-zeroconf">Zero-Conf</a>.</span>
          </li>
          <li>
            <b>Ops</b>
            <span>Fire once, then leave. Marked <a href="#read-op">OP</a> on the face.</span>
          </li>
          <li>
            <b>Crew power</b>
            <span>2 gas, once per block. The button under your name. See <a href="#crew-powers">crew powers</a>.</span>
          </li>
        </ul>
      </section>

      <section className="how">
        <h2>How to read a card</h2>
        <div className="read-grid" aria-label="How to read a card">
          <div className="read-specimen">
            <CardFace id="satoshis_ghost" tips={false} />
          </div>
          <article className="read-callout gas">
            <b>Gas</b>
            <p>The corner number. What you spend to play it.</p>
          </article>
          <article className="read-callout crew">
            <b>Crew</b>
            <p>The band and mark. Consortium, Sovereign, Degen, or Neutral.</p>
          </article>
          <article className="read-callout name">
            <b>Name</b>
            <p>What the ledger calls it when it is played.</p>
          </article>
          <article className="read-callout kw">
            <b>Keyword</b>
            <p>A glyph and a short label in the text box. Each one is defined in <a href="#keyword-marks">Keyword marks</a>.</p>
          </article>
          <article className="read-callout rules">
            <b>Rules</b>
            <p>The effect. <a href="#term-deploy">On Deploy</a>, <a href="#term-liquidation">On Liquidation</a>, or the whole card when it is an <a href="#read-op">Op</a>.</p>
          </article>
          <article className="read-callout stats">
            <b>Attack / health</b>
            <p>Triangle and heart. At 0 health the Asset is <a href="#term-liquidation">liquidated</a>.</p>
          </article>
        </div>
        <ul className="rules-also">
          <li id="read-consensus">
            <b>Consensus</b>
            <span>A crew-colored line under the rules, on some cards. Fires when you play a second card of that crew this block.</span>
          </li>
          <li id="read-op">
            <b>OP</b>
            <span>Operations have no attack or health. They resolve, then leave.</span>
          </li>
        </ul>
      </section>

      <section className="how" id="keyword-marks">
        <h2>Keyword marks</h2>
        <p className="how-note">Same glyphs on the card face, the board, and every hover tip.</p>
        <ul className="rules-keywords">
          {KEYWORDS.map(k => (
            <li key={k} id={`kw-${k}`}>
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

      <section className="how" id="crew-powers">
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

      <details className="rules-ref" id="terms">
        <summary>Terms</summary>
        <p className="rules-ref-note">Also available mid-match via <b>terms</b> in the header.</p>
        <Glossary keywords={false} />
      </details>
    </div>
  );
}
