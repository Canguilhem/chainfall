import { useCallback, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { LOBBY_PATHS, lobbyFromPath, type LobbyId } from '../match/routes.ts';
import type { Screen } from '../match/types.ts';

type SessionGoLobby = (id: LobbyId) => void;

export function useLobbyRoute(screen: Screen, setScreen: (s: Screen) => void, sessionGoLobby: SessionGoLobby) {
  const location = useLocation();
  const navigate = useNavigate();
  const inMatchFlow = screen.id === 'match' || screen.id === 'queued' || screen.id === 'over';

  const goLobby = useCallback((id: LobbyId) => {
    sessionGoLobby(id);
    navigate(LOBBY_PATHS[id]);
  }, [sessionGoLobby, navigate]);

  useEffect(() => {
    if (inMatchFlow) return;
    const id = lobbyFromPath(location.pathname);
    if (!id) {
      navigate('/', { replace: true });
      return;
    }
    if (screen.id !== id) setScreen({ id });
  }, [location.pathname, inMatchFlow, screen.id, setScreen, navigate]);

  return goLobby;
}
