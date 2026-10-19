import { FACTIONS, type LessonCourse, type PlayableFaction, type Pull, type MatchView } from '../../engine/index.ts';
import type { Opponent, Screen } from '../match/types.ts';
import type { LobbyId } from '../match/routes.ts';
import type { Wallet } from '../stash.ts';
import { FactionMark, PowerMark } from './Marks.tsx';
import { Tip } from './Tip.tsx';
import { KitBuilder } from './KitBuilder.tsx';
import { Recap } from './Recap.tsx';
import { Rules } from './Rules.tsx';

type Props = {
  screen: Screen;
  v: MatchView | null;
  payout: number | null;
  opponent: Opponent;
  wallet: Wallet;
  onOpponent: (opponent: Opponent) => void;
  onBegin: (faction: PlayableFaction) => void;
  onPlayDeck: (faction: PlayableFaction) => void;
  onGoLobby: (id: LobbyId) => void;
  onBuyPack: () => boolean;
  onOpenPack: () => { pulls: Pull[]; refund: number } | null;
  onCraft: (id: string) => boolean;
  onSalvage: (id: string) => boolean;
  onLearn: (course?: LessonCourse) => void;
};

export function LobbyVeil({
  screen, v, payout, opponent, wallet,
  onOpponent, onBegin, onPlayDeck, onGoLobby,
  onBuyPack, onOpenPack, onCraft, onSalvage, onLearn,
}: Props) {
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
            <h1>{screen.won === null ? <>BOTH HIT <span>0</span></> : screen.won ? <>YOU <span>WON</span></> : <>YOU <span>LOST</span></>}</h1>
            {v && <Recap v={v} won={screen.won} why={screen.why} payout={payout} />}
          </>
        )}
        {screen.id === 'start' && (
          <>
            <div className="home-lead">
              <p className="home-kicker">A duel card game</p>
              <h1>FIRST TO <span>0</span> LOSES</h1>
              <p className="lede">20 health each.</p>
            </div>
            <div className="learn-row">
              <button type="button" className="again" onClick={() => onLearn()}>Play tutorial</button>
              <p>Learn quickly how the game works.</p>
            </div>
            <div className="setup-bar" aria-label="Match settings">
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
            </div>
            <p className="setup-note">No deck. Each turn, both players take one card from the same row. Your own deck is on the Deck page.</p>
            <section className="setup">
              <h2>Choose a side</h2>
              <p className="crew-line"><em>Good at one thing.</em> Weaker at the rest.</p>
              <div className="picks">
                {(Object.keys(FACTIONS) as PlayableFaction[]).map(k => {
                  const f = FACTIONS[k];
                  const crew = f.name.replace('The ', '');
                  return (
                    <button key={k} className={`pick ${f.cls}`} onClick={() => onBegin(k)}
                            aria-label={`Play as ${crew}. ${f.power.name}, ${f.power.cost} gas, once a block. ${f.power.text} ${f.blurb}`}>
                      <div className="pick-id">
                        <h3><FactionMark faction={k} size={22} />{crew.toUpperCase()}</h3>
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
            onPlay={onPlayDeck}
          />
        )}
        {screen.id === 'docs' && <Rules />}
      </div>
      {screen.id === 'over' && (
        <div className="dock">
          <button className="again" type="button" onClick={() => onGoLobby('start')}>PLAY AGAIN</button>
          <button className="again stash-link" type="button" onClick={() => onGoLobby('deck')}>YOUR DECK</button>
        </div>
      )}
    </div>
  );
}
