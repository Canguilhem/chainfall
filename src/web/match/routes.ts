export const LOBBY_PATHS = {
  start: '/',
  docs: '/rules',
  deck: '/deck',
} as const;

export type LobbyId = keyof typeof LOBBY_PATHS;

const PATH_TO_LOBBY: Record<string, LobbyId> = {
  '/': 'start',
  '/rules': 'docs',
  '/deck': 'deck',
  '/kit': 'deck',
  // Retired vault routes → Deck (packs live there now)
  '/vault': 'deck',
  '/stash': 'deck',
};

export function lobbyFromPath(path: string): LobbyId | undefined {
  return PATH_TO_LOBBY[path];
}

export function isLobbyPath(path: string): boolean {
  return path in PATH_TO_LOBBY;
}
