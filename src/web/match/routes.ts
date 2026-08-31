export const LOBBY_PATHS = {
  start: '/',
  docs: '/rules',
  vault: '/vault',
  deck: '/deck',
} as const;

export type LobbyId = keyof typeof LOBBY_PATHS;

const PATH_TO_LOBBY: Record<string, LobbyId> = {
  '/': 'start',
  '/rules': 'docs',
  '/vault': 'vault',
  '/deck': 'deck',
  '/kit': 'deck',
  '/stash': 'vault',
};

export function lobbyFromPath(path: string): LobbyId | undefined {
  return PATH_TO_LOBBY[path];
}

export function isLobbyPath(path: string): boolean {
  return path in PATH_TO_LOBBY;
}
