import { type Wallet } from '../stash.ts';
import type { CardId } from '../../engine/index.ts';
import type { MatchView } from '../../engine/index.ts';
import type { Screen } from '../match/types.ts';
import type { LobbyId } from '../match/routes.ts';

type Props = {
  fighting: boolean;
  screen: Screen;
  v: MatchView | null;
  conn: string;
  notice: string;
  phase: string;
  lexicon: boolean;
  onLexicon: () => void;
  found: Set<CardId>;
  wallet: Wallet;
  onGoLobby: (id: LobbyId) => void;
};

export function AppHeader({
  fighting, screen, v, conn, notice, phase, lexicon, onLexicon,
  found, wallet, onGoLobby,
}: Props) {
  return (
    <header>
      {fighting
        ? <div className="wordmark">CHAIN<span>FALL</span></div>
        : (
          <button type="button" className="wordmark" onClick={() => onGoLobby('start')}>
            CHAIN<span>FALL</span>
          </button>
        )}
      {fighting ? (
        <>
          <div className="tag blk">block {String(v?.block ?? 0).padStart(3, '0')}</div>
          <div className="spacer" />
          <div className={`tag conn${conn === 'connected' || conn === 'solo' ? ' live' : conn === 'offline' ? '' : ' warn'}`}>{conn}</div>
          <button type="button" className={`tag${lexicon ? ' live' : ''}`} onClick={onLexicon}>terms</button>
          <div className={`tag phase${notice ? ' warn' : ''}`}>{notice || phase}</div>
        </>
      ) : (
        <>
          <div className="spacer" />
          <nav className="topnav" aria-label="App">
            <button type="button" className={`nav${screen.id === 'docs' ? ' on' : ''}`}
                    aria-current={screen.id === 'docs' ? 'page' : undefined}
                    onClick={() => onGoLobby('docs')}>Rules</button>
            <button type="button" className={`nav${screen.id === 'vault' ? ' on' : ''}`}
                    aria-current={screen.id === 'vault' ? 'page' : undefined}
                    onClick={() => onGoLobby('vault')}
                    title="Packs, owned copies, and discovered card types">
              Vault <em>{wallet.packs} sealed · {found.size} seen</em>
            </button>
            <button type="button" className={`nav${screen.id === 'deck' ? ' on' : ''}`}
                    aria-current={screen.id === 'deck' ? 'page' : undefined}
                    onClick={() => onGoLobby('deck')}>Deck</button>
          </nav>
          <div className="tag chip">scrip <b>{wallet.scrip}</b></div>
        </>
      )}
    </header>
  );
}
