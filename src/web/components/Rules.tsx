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
      <p className="lede">20 health each. First crew at 0 loses.</p>

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
          Two same-crew cards in one block. <a href="#read-consensus">Consensus</a> fires only if the second one has the line.
        </p>
      </section>

      <section className="how">
        <h2>The table</h2>
        <div className="table-read" aria-label="How the table is laid out">
          <div className="table-stage" aria-hidden>
            <div className="ts-plate them">Their crew</div>
            <div className="ts-row">
              <i /><i /><i /><i /><i />
            </div>
            <div className="ts-feed">Feed</div>
            <div className="ts-row you">
              <i /><i /><i /><i /><i />
            </div>
            <div className="ts-plate you">Your crew</div>
            <div className="ts-hand"><i /><i /><i /><i /></div>
          </div>
          <article className="read-callout ts-them">
            <b>Their crew</b>
            <p>Health, gas, and their power. On their plate the power is written so “you” means you.</p>
          </article>
          <article className="read-callout ts-board">
            <b>Boards</b>
            <p>Five Assets a side. READY means it can attack. An empty board means the attack hits that crew. Hover an Asset to read it. On a phone, hold it.</p>
          </article>
          <article className="read-callout ts-feed">
            <b>Feed</b>
            <p>Salvage Run. One shared row. Each crew takes one card from it each block.</p>
          </article>
          <article className="read-callout ts-hand">
            <b>Hand</b>
            <p>A card you can afford is lit. A grey card costs more gas than you have.</p>
          </article>
        </div>
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
            <span>Stay on the board. They attack next block, or this block with <a href="#kw-zeroconf">Zero-Conf</a>.</span>
          </li>
          <li id="read-op">
            <b>Ops</b>
            <span>Fire once, then leave. Marked OP on the face.</span>
          </li>
          <li>
            <b>Crew power</b>
            <span>Each crew has its own. 2 gas, once a block. The button under your name. See <a href="#crew-powers">crew powers</a>.</span>
          </li>
          <li id="read-deploy">
            <b>On Deploy</b>
            <span>The line that happens when an Asset is played onto the board.</span>
          </li>
          <li id="read-liquidation">
            <b>On Liquidation</b>
            <span>The line that happens when an Asset hits 0 and leaves the board.</span>
          </li>
          <li id="read-freeze">
            <b>Freeze</b>
            <span>The Asset cannot attack until the end of its owner’s next turn.</span>
          </li>
          <li id="read-consensus">
            <b>Consensus</b>
            <span>A labeled line on some cards. It fires only when that card is the second one of its crew this block.</span>
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
            <p>The band and mark. Consortium, Sovereigns, Degens, or Neutral.</p>
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
            <p>The effect. <a href="#read-deploy">On Deploy</a> happens when the Asset is played. <a href="#read-liquidation">On Liquidation</a> happens when it hits 0 and leaves. An <a href="#read-op">Op</a> is the whole card. <a href="#read-consensus">Consensus</a> is the labeled line under that.</p>
          </article>
          <article className="read-callout stats">
            <b>Attack / health</b>
            <p>Triangle is attack. Heart is health. At 0 health the Asset is <a href="#read-liquidation">liquidated</a>.</p>
          </article>
        </div>
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
            <p>The match on the homepage. No deck. Each block, both crews take one card from the same row.</p>
          </article>
          <article className="mode">
            <h4>Constructed</h4>
            <p>Play this deck, on the Deck page. A starter list is legal from the start. Cards you open add more choices. Draw one each block.</p>
          </article>
        </div>
      </section>

      <section className="how" id="crew-powers">
        <h2>Crew powers</h2>
        <p className="how-note">Each crew has a different power. Once a block, for 2 gas.</p>
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
