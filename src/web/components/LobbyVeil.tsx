import { FACTIONS, type Mode, type PlayableFaction, type Pull, type MatchView, type CardId } from '../../engine/index.ts';
import type { DeckSource, Opponent, Screen } from '../match/types.ts';
import type { LobbyId } from '../match/routes.ts';
import type { Wallet } from '../stash.ts';
import { customKitError } from '../decks.ts';
import { FactionMark, PowerPreview } from './Marks.tsx';
import { KitBuilder } from './KitBuilder.tsx';
import { Recap } from './Recap.tsx';
import { Rules } from './Rules.tsx';
import { Vault } from './Vault.tsx';

type Props = {
  screen: Screen;
  v: MatchView | null;
  payout: number | null;
  mode: Mode;
  opponent: Opponent;
  deckSource: DeckSource;
  found: Set<CardId>;
  wallet: Wallet;
  onMode: (mode: Mode) => void;
  onOpponent: (opponent: Opponent) => void;
  onDeckSource: (source: DeckSource) => void;
  onBegin: (faction: PlayableFaction) => void;
  onGoLobby: (id: LobbyId) => void;
  onBuyPack: () => boolean;
  onOpenPack: () => { pulls: Pull[]; refund: number } | null;
  onCraft: (id: string) => boolean;
  onSalvage: (id: string) => boolean;
};

export function LobbyVeil({
  screen, v, payout, mode, opponent, deckSource, found, wallet,
  onMode, onOpponent, onDeckSource, onBegin, onGoLobby,
  onBuyPack, onOpenPack, onCraft, onSalvage,
}: Props) {
  const anyCustomValid = (['consortium', 'sovereign', 'degen'] as PlayableFaction[]).some(
    f => !customKitError(f, wallet),
  );
  const canCustom = opponent === 'bot';
  return (
    <div id="veil" className={[screen.id === 'match' ? 'off' : '', screen.id === 'over' ? 'has-dock' : ''].filter(Boolean).join(' ')}>
      <div className={`panel${screen.id === 'vault' || screen.id === 'deck' ? ' stash-panel' : ''}${screen.id === 'deck' ? ' deck-panel' : ''}`}>
        {screen.id === 'queued' && (
          <>
            <h1>QUEUED</h1>
            <p className="lede">Waiting for another crew. Open a second tab to fight yourself.</p>
          </>
        )}
        {screen.id === 'over' && (
          <>
            <h1>{screen.won === null ? <>BOTH <span>FELL</span></> : screen.won ? <>STILL <span>FREE</span></> : <>YOU <span>FELL</span></>}</h1>
            {v && <Recap v={v} won={screen.won} why={screen.why} payout={payout} />}
          </>
        )}
        {screen.id === 'start' && (
          <>
            <p className="lede">2058. Quantum broke the keys. Crews scrape the wreck for gas and a way out — 20 HP, last one standing walks free.</p>
            <section className="setup">
              <h2><span>1</span> Play mode</h2>
              <div className="modes">
                {(['constructed', 'salvage'] as Mode[]).map(m => (
                  <button key={m} className={`mode${mode === m ? ' on' : ''}`}
                          aria-pressed={mode === m} onClick={() => onMode(m)}>
                    <h4>{m === 'constructed' ? 'CONSTRUCTED' : 'SALVAGE RUN'}
                      {mode === m && <em>selected</em>}</h4>
                    <p>{m === 'constructed'
                      ? 'Draw one card per block from a 25-card list.'
                      : 'No deck. Claim one card each block from a shared Feed.'}</p>
                  </button>
                ))}
              </div>
            </section>
            {mode === 'constructed' && (
              <section className="setup">
                <h2><span>2</span> Which list</h2>
                <div className="modes">
                  <button type="button" className={`mode${deckSource === 'starter' ? ' on' : ''}`}
                          aria-pressed={deckSource === 'starter'}
                          onClick={() => onDeckSource('starter')}>
                    <h4>STARTER DECK{deckSource === 'starter' && <em>selected</em>}</h4>
                    <p>The tuned 25-card list for each crew. Always legal, always fair.</p>
                  </button>
                  <button type="button" className={`mode${deckSource === 'custom' ? ' on' : ''}`}
                          aria-pressed={deckSource === 'custom'}
                          disabled={!canCustom}
                          onClick={() => canCustom && onDeckSource('custom')}>
                    <h4>YOUR DECK{deckSource === 'custom' && <em>selected</em>}</h4>
                    <p>{canCustom
                      ? <>Saved on the <button type="button" className="deck-link" onClick={e => { e.stopPropagation(); onGoLobby('deck'); }}>Deck</button> page. Solo only until Versus accepts custom lists.</>
                      : 'Versus always runs the starter list for now.'}</p>
                  </button>
                </div>
                {deckSource === 'custom' && !anyCustomValid && (
                  <p className="setup-warn">No valid saved deck yet — build one on the Deck page or pick Starter.</p>
                )}
              </section>
            )}
            <section className="setup">
              <h2><span>{mode === 'constructed' ? '3' : '2'}</span> Who you face</h2>
              <div className="modes">
                {(['bot', 'human'] as Opponent[]).map(o => (
                  <button key={o} className={`mode${opponent === o ? ' on' : ''}`}
                          aria-pressed={opponent === o} onClick={() => onOpponent(o)}>
                    <h4>{o === 'bot' ? 'SOLO' : 'VERSUS'}
                      {opponent === o && <em>selected</em>}</h4>
                    <p>{o === 'bot' ? 'Play the engine locally. No server needed.' : 'Queue for the next crew. Server-authoritative.'}</p>
                  </button>
                ))}
              </div>
            </section>
            <section className="setup">
              <h2><span>{mode === 'constructed' ? '4' : '3'}</span> Pick a crew — this starts the match</h2>
              <div className="picks">
                {(Object.keys(FACTIONS) as PlayableFaction[]).map(k => {
                  const f = FACTIONS[k];
                  return (
                    <button key={k} className={`pick ${f.cls}`} onClick={() => onBegin(k)}
                            aria-label={`Play as ${f.name.replace('The ', '')}. ${f.power.name}. ${f.power.text} ${f.blurb}`}>
                      <h3><FactionMark faction={k} size={26} />{f.name.replace('The ', '').toUpperCase()}</h3>
                      <PowerPreview faction={k} />
                      <p>{f.blurb}</p>
                      <div className="go">Play as {f.name.replace('The ', '')}</div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
        {screen.id === 'vault' && (
          <Vault found={found} wallet={wallet} onBuy={onBuyPack} onOpen={onOpenPack}
                 onCraft={onCraft} onSalvage={onSalvage} />
        )}
        {screen.id === 'deck' && <KitBuilder wallet={wallet} />}
        {screen.id === 'docs' && <Rules />}
      </div>
      {screen.id === 'over' && (
        <div className="dock">
          <button className="again" type="button" onClick={() => onGoLobby('start')}>RUN IT BACK</button>
          <button className="again stash-link" type="button" onClick={() => onGoLobby('deck')}>YOUR DECK</button>
          <button className="again stash-link" type="button" onClick={() => onGoLobby('vault')}>THE VAULT</button>
        </div>
      )}
    </div>
  );
}
