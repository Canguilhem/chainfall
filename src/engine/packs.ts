import { CARD_IDS, isToken, type CardId } from './cards.ts';

export type Rarity = 'common' | 'rare' | 'epic' | 'legend';

export const RARITY = {
  common: { label: 'COMMON', weight: 65, salvage: 5, craft: 40, max: 2 },
  rare: { label: 'RARE', weight: 25, salvage: 20, craft: 100, max: 2 },
  epic: { label: 'EPIC', weight: 7, salvage: 100, craft: 400, max: 2 },
  legend: { label: 'LEGEND', weight: 3, salvage: 400, craft: 1600, max: 1 }
} as const;

export const PACK_COST = 100, PACK_SIZE = 5, PITY_EPIC = 8, PITY_LEGEND = 25;
export const EARN_WIN = 25, EARN_LOSS = 10;

/** Rarity follows design complexity, not power. Tokens are not in packs. */
export const CARD_RARITY = {
  seed_phrase_kid: 'common', bagholder: 'common', gas_leak: 'common', hopium: 'common',
  cold_wallet: 'common', node_runner: 'common', paper_hands: 'common', frontrunner: 'common',
  ledger_sweep: 'common', scavenger_rig: 'common', diamond_hands: 'common', yield_miner: 'common',
  sharded_rig: 'common', salvage_crew: 'common',
  flash_loan: 'rare', rug_pull: 'rare', bot_swarm: 'rare', exit_liquidity: 'rare',
  hardware_failure: 'rare', sentry_rig: 'rare',
  cascade: 'epic', bull_run: 'epic', whale: 'epic', junkyard_titan: 'legend',

  kyc_checkpoint: 'common', private_security: 'common', surveillance_drone: 'common', data_broker: 'common',
  compliance_officer: 'rare', custodian_vault: 'rare', bailout: 'rare', debt_collector: 'rare', riot_enforcer: 'rare',
  asset_freeze: 'epic', liquidation_order: 'epic', board_member: 'epic', regulatory_capture: 'epic',
  the_chairman: 'legend',

  full_node: 'common', self_custody: 'common', airdrop: 'common', cypherpunk: 'common', sovereign_miner: 'common',
  mesh_relay: 'rare', torch_relay: 'rare', node_cluster: 'rare', peer_enforcer: 'rare',
  open_source: 'rare', the_whitepaper: 'rare',
  hard_fork: 'epic', decentralized_swarm: 'epic', satoshis_ghost: 'legend',

  leverage: 'common', moonboy: 'common', rekt: 'common', pump: 'common', meme_coin: 'common',
  bagchaser: 'common', signal_caller: 'common',
  degen_trader: 'rare', dump: 'rare', hundred_x: 'rare', ponzi_engine: 'rare', send_it: 'rare',
  casino_rig: 'epic', liquidation_cascade: 'epic', the_influencer: 'legend'
} as const satisfies Record<Exclude<CardId, 'node' | 'bot' | 'airdrop_coin'>, Rarity>;

export type PackCardId = keyof typeof CARD_RARITY;
export const PACK_IDS = CARD_IDS.filter(id => !isToken(id)) as PackCardId[];

const TIERS: Rarity[] = ['common', 'rare', 'epic', 'legend'];

export function rarityOf(id: string): Rarity {
  return (CARD_RARITY as Record<string, Rarity>)[id] ?? 'common';
}
export const maxOf = (id: string) => RARITY[rarityOf(id)].max;

export interface PackState {
  owned: Record<string, number>;
  sinceEpic: number;
  sinceLegend: number;
  opened: number;
  salvage: number;
}

export interface Pull { id: PackCardId; rar: Rarity; dupe: boolean }

function eligible(rar: Rarity, owned: Record<string, number>): PackCardId[] {
  const pool = PACK_IDS.filter(id => rarityOf(id) === rar && (owned[id] ?? 0) < maxOf(id));
  return pool.length ? pool : PACK_IDS.filter(id => rarityOf(id) === rar);
}

export function rollRarity(rng: () => number, min: Rarity = 'common'): Rarity {
  const pool = TIERS.slice(TIERS.indexOf(min));
  const total = pool.reduce((s, k) => s + RARITY[k].weight, 0);
  let roll = rng() * total;
  for (const k of pool) {
    roll -= RARITY[k].weight;
    if (roll < 0) return k;
  }
  return pool[pool.length - 1]!;
}

export const PLAYSET = PACK_IDS.reduce((n, id) => n + maxOf(id), 0);

export function craftCard(state: PackState, id: string): boolean {
  const have = state.owned[id] ?? 0;
  const cost = RARITY[rarityOf(id)].craft;
  if (have >= maxOf(id) || state.salvage < cost) return false;
  state.salvage -= cost;
  state.owned[id] = have + 1;
  return true;
}

export function salvageCard(state: PackState, id: string): boolean {
  const have = state.owned[id] ?? 0;
  if (have <= 0) return false;
  state.owned[id] = have - 1;
  state.salvage += RARITY[rarityOf(id)].salvage;
  return true;
}

export function openPack(state: PackState, rng: () => number): { pulls: Pull[]; refund: number } {
  const pulls: Pull[] = [];
  const owned = { ...state.owned };
  let gotRarePlus = false, gotEpicPlus = false, gotLegend = false;
  for (let i = 0; i < PACK_SIZE; i++) {
    let min: Rarity | undefined;
    const last = i === PACK_SIZE - 1;
    if (state.sinceLegend + 1 >= PITY_LEGEND && !gotLegend) min = 'legend';
    else if (last && state.sinceEpic + 1 >= PITY_EPIC && !gotEpicPlus) min = 'epic';
    else if (last && !gotRarePlus) min = 'rare';
    const rar = rollRarity(rng, min ?? 'common');
    if (rar !== 'common') gotRarePlus = true;
    if (rar === 'epic' || rar === 'legend') gotEpicPlus = true;
    if (rar === 'legend') gotLegend = true;
    const pool = eligible(rar, owned);
    const id = pool[Math.floor(rng() * pool.length)]!;
    const have = owned[id] ?? 0;
    const dupe = have >= maxOf(id);
    if (!dupe) owned[id] = have + 1;
    pulls.push({ id, rar, dupe });
  }
  state.owned = owned;
  state.sinceLegend = gotLegend ? 0 : state.sinceLegend + 1;
  state.sinceEpic = gotEpicPlus ? 0 : state.sinceEpic + 1;
  state.opened++;
  const refund = pulls.filter(p => p.dupe).reduce((s, p) => s + RARITY[p.rar].salvage, 0);
  state.salvage += refund;
  return { pulls, refund };
}
