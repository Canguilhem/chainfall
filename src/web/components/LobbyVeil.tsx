import { FACTIONS, type Mode, type PlayableFaction, type Pull, type MatchView } from '../../engine/index.ts';
import type { DeckSource, Opponent, Screen } from '../match/types.ts';
import type { LobbyId } from '../match/routes.ts';
import type { Wallet } from '../stash.ts';
import { customKitError } from '../decks.ts';
import { FactionMark, PowerMark } from './Marks.tsx';
import { Tip } from './Tip.tsx';
import { KitBuilder } from './KitBuilder.tsx';
import { Recap } from './Recap.tsx';
import { Rules } from './Rules.tsx';

type Props = {
  screen: Screen;
  v: MatchView | null;
  payout: number | null;
  mode: Mode;
  opponent: Opponent;
  deckSource: DeckSource;
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
  screen, v, payout, mode, opponent, deckSource, wallet,
  onMode, onOpponent, onDeckSource, onBegin, onGoLobby,
  onBuyPack, onOpenPack, onCraft, onSalvage,
}: Props) {
  const anyCustomValid = (['consortium', 'sovereign', 'degen'] as PlayableFaction[]).some(
    f => !customKitError(f, wallet),
  );
  const canCustom = opponent === 'bot';
  return (
    <div id="veil" className={[screen.id === 'match' ? 'off' : '', screen.id === 'over' ? 'has-dock' : ''].filter(Boolean).join(' ')}>
      <div className={`panel${screen.id === 'deck' ? ' stash-panel deck-panel' : ''}`}>
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
            <p className="lede">2058. Quantum broke the keys. Crews scrape the wreck for gas — 20 HP each. Take the other crew to zero.</p>
            <div className="setup-bar" aria-label="Match settings">
              <div className="seg" role="group" aria-label="Play mode">
                {(['constructed', 'salvage'] as Mode[]).map(m => (
                  <Tip key={m} side="bottom" text={m === 'constructed'
                    ? 'Draw one card each block from a 25-card list.'
                    : 'No deck. Claim one card each block from a shared Feed.'}>
                    <button type="button" className={mode === m ? 'on' : ''}
                            aria-pressed={mode === m} onClick={() => onMode(m)}>
                      {m === 'constructed' ? 'Constructed' : 'Salvage'}
                    </button>
                  </Tip>
                ))}
              </div>
              {mode === 'constructed' && (
                <div className="seg" role="group" aria-label="Which list">
                  <Tip side="bottom" text="The tuned 25-card list for each crew. Always legal.">
                    <button type="button" className={deckSource === 'starter' ? 'on' : ''}
                            aria-pressed={deckSource === 'starter'}
                            onClick={() => onDeckSource('starter')}>
                      Starter
                    </button>
                  </Tip>
                  <Tip side="bottom" text={canCustom
                    ? 'The list saved on the Deck page. Solo only, until Versus takes custom lists.'
                    : 'Versus always runs the starter list for now.'}>
                    <button type="button" className={deckSource === 'custom' ? 'on' : ''}
                            aria-pressed={deckSource === 'custom'}
                            disabled={!canCustom}
                            onClick={() => canCustom && onDeckSource('custom')}>
                      Your deck
                    </button>
                  </Tip>
                </div>
              )}
              <div className="seg" role="group" aria-label="Who you face">
                <Tip side="bottom" text="Play the engine on this machine. No server needed.">
                  <button type="button" className={opponent === 'bot' ? 'on' : ''}
                          aria-pressed={opponent === 'bot'} onClick={() => onOpponent('bot')}>
                    Solo
                  </button>
                </Tip>
                <Tip side="bottom" text="Matchmaking is off until the match host is up. Solo still works.">
                  <button type="button" disabled aria-pressed={false}>
                    Versus
                  </button>
                </Tip>
              </div>
              {mode === 'constructed' && deckSource === 'custom' && (
                <button type="button" className="deck-link setup-edit" onClick={() => onGoLobby('deck')}>
                  Edit deck
                </button>
              )}
            </div>
            {mode === 'constructed' && deckSource === 'custom' && !anyCustomValid && (
              <p className="setup-warn">No valid saved deck yet. Build one on the Deck page, or pick Starter.</p>
            )}
            <section className="setup">
              <h2>Choose a crew</h2>
              <p className="crew-line"><em>Strong at one thing.</em> Pays for it.</p>
              <div className="picks">
                {(Object.keys(FACTIONS) as PlayableFaction[]).map(k => {
                  const f = FACTIONS[k];
                  const crew = f.name.replace('The ', '');
                  return (
                    <button key={k} className={`pick ${f.cls}`} onClick={() => onBegin(k)}
                            aria-label={`Play as ${crew}. ${f.power.name}, ${f.power.cost} gas, once a block. ${f.power.text} ${f.blurb}`}>
                      <div className="pick-id">
                        <h3><FactionMark faction={k} size={22} />{crew.toUpperCase()}</h3>
                        <p className="pick-blurb">{f.blurb}</p>
                      </div>
                      <div className="pick-power">
                        <div className="pick-kicker">
                          <PowerMark size={15} />
                          <span>Special ability</span>
                          <b>{f.power.name}</b>
                        </div>
                        <p className="pick-fx">{f.power.text}</p>
                      </div>
                      <div className="go">Play</div>
                    </button>
                  );
                })}
              </div>
            </section>
          </>
        )}
        {screen.id === 'deck' && (
          <KitBuilder
            wallet={wallet}
            onBuyPack={onBuyPack}
            onOpenPack={onOpenPack}
            onCraft={onCraft}
            onSalvage={onSalvage}
          />
        )}
        {screen.id === 'docs' && <Rules />}
      </div>
      {screen.id === 'over' && (
        <div className="dock">
          <button className="again" type="button" onClick={() => onGoLobby('start')}>RUN IT BACK</button>
          <button className="again stash-link" type="button" onClick={() => onGoLobby('deck')}>YOUR DECK</button>
        </div>
      )}
    </div>
  );
}
