import type { Card, Effect, Faction, PlayableFaction, Keyword } from './types.ts';

/**
 * The card set. `satisfies` keeps the literal types (so CardId below is a union
 * of the real ids) while still checking every entry against Card — which means
 * a malformed effect is a compile error right here, at the card.
 */
export const CARDS = {
  // ---- tokens: summoned, never drawn, never collected ----
  node: { n: "Node", c: 1, t: "asset", a: 1, h: 1, f: "sovereign", token: 1 },
  bot: { n: "Bot", c: 1, t: "asset", a: 1, h: 1, f: "neutral", token: 1 },
  airdrop_coin: { n: "Airdrop", c: 0, t: "op", f: "neutral", token: 1, tx: "Gain 1 Gas this turn.", fx: [{ op: "gas", amt: 1 }] },

  // ---- neutral (24) ----
  seed_phrase_kid: { n: "Seed Phrase Kid", c: 1, t: "asset", a: 2, h: 1, f: "neutral" },
  bagholder: { n: "Bagholder", c: 1, t: "asset", a: 1, h: 2, f: "neutral", kw: ["firewall"] },
  gas_leak: { n: "Gas Leak", c: 1, t: "op", f: "neutral", tx: "Deal 2 damage to an Asset.", fx: [{ op: "damage", amt: 2, tgt: "choose-asset" }] },
  hopium: { n: "Hopium", c: 1, t: "op", f: "neutral", tx: "Give an Asset +2/+1.", fx: [{ op: "buff", a: 2, h: 1, tgt: "choose-asset" }] },
  cold_wallet: { n: "Cold Wallet", c: 2, t: "asset", a: 2, h: 2, f: "neutral", kw: ["coldstorage"] },
  node_runner: { n: "Node Runner", c: 2, t: "asset", a: 3, h: 2, f: "neutral" },
  paper_hands: { n: "Paper Hands", c: 2, t: "asset", a: 4, h: 1, f: "neutral" },
  frontrunner: { n: "Frontrunner", c: 2, t: "asset", a: 2, h: 1, f: "neutral", kw: ["zeroconf"] },
  ledger_sweep: { n: "Ledger Sweep", c: 2, t: "op", f: "neutral", tx: "Deal 3 damage to an Asset.", fx: [{ op: "damage", amt: 3, tgt: "choose-asset" }] },
  scavenger_rig: { n: "Scavenger Rig", c: 3, t: "asset", a: 3, h: 4, f: "neutral" },
  diamond_hands: { n: "Diamond Hands", c: 3, t: "asset", a: 2, h: 5, f: "neutral", kw: ["firewall"] },
  yield_miner: { n: "Yield Miner", c: 3, t: "asset", a: 2, h: 3, f: "neutral", kw: ["yield"] },
  flash_loan: { n: "Flash Loan", c: 3, t: "op", f: "neutral", tx: "Draw 2 cards.", fx: [{ op: "draw", amt: 2 }] },
  rug_pull: { n: "Rug Pull", c: 3, t: "op", f: "neutral", tx: "Destroy an Asset with 4 or less Attack.", fx: [{ op: "destroy", tgt: "choose-asset", maxAtk: 4 }] },
  sharded_rig: { n: "Sharded Rig", c: 4, t: "asset", a: 3, h: 3, f: "neutral", kw: ["sharded"] },
  bot_swarm: { n: "Bot Swarm", c: 4, t: "op", f: "neutral", tx: "Summon three 1/1 Bots.", fx: [{ op: "summon", card: "bot", count: 3 }] },
  salvage_crew: { n: "Salvage Crew", c: 4, t: "asset", a: 4, h: 4, f: "neutral", tx: "On Deploy: Restore 3 HP to you.", fx: [{ op: "heal", amt: 3, tgt: "self-hero" }] },
  exit_liquidity: { n: "Exit Liquidity", c: 4, t: "asset", a: 5, h: 3, f: "neutral", tx: "On Liquidation: Deal 2 damage to them.", dfx: [{ op: "damage", amt: 2, tgt: "enemy-hero" }] },
  hardware_failure: { n: "Hardware Failure", c: 4, t: "op", f: "neutral", tx: "Destroy an Asset.", fx: [{ op: "destroy", tgt: "choose-asset" }] },
  sentry_rig: { n: "Sentry Rig", c: 5, t: "asset", a: 4, h: 6, f: "neutral", kw: ["firewall"] },
  cascade: { n: "Cascade", c: 5, t: "op", f: "neutral", tx: "Deal 2 damage to all enemy Assets.", fx: [{ op: "damage", amt: 2, tgt: "all-enemy-assets" }] },
  bull_run: { n: "Bull Run", c: 5, t: "op", f: "neutral", tx: "Give your Assets +2/+2.", fx: [{ op: "buff", a: 2, h: 2, tgt: "all-friendly-assets" }] },
  whale: { n: "Whale", c: 6, t: "asset", a: 7, h: 6, f: "neutral" },
  junkyard_titan: { n: "Junkyard Titan", c: 7, t: "asset", a: 8, h: 8, f: "neutral" },

  // ---- consortium (14) ----
  kyc_checkpoint: { n: "KYC Checkpoint", c: 1, t: "op", f: "consortium", tx: "Seize an enemy Asset. Draw a card.", fx: [{ op: "seize", tgt: "choose-enemy-asset" }, { op: "draw", amt: 1 }] },
  private_security: { n: "Private Security", c: 2, t: "asset", a: 1, h: 3, f: "consortium", kw: ["firewall"] },
  surveillance_drone: { n: "Surveillance Drone", c: 2, t: "asset", a: 2, h: 2, f: "consortium", tx: "On Deploy: Deal 1 damage to an enemy Asset.", fx: [{ op: "damage", amt: 1, tgt: "choose-enemy-asset" }] },
  compliance_officer: { n: "Compliance Officer", c: 3, t: "asset", a: 2, h: 3, f: "consortium", tx: "On Deploy: Seize an enemy Asset.", fx: [{ op: "seize", tgt: "choose-enemy-asset" }] },
  data_broker: { n: "Data Broker", c: 3, t: "asset", a: 2, h: 3, f: "consortium", tx: "On Deploy: Draw a card.", fx: [{ op: "draw", amt: 1 }] },
  debt_collector: { n: "Debt Collector", c: 4, t: "asset", a: 3, h: 4, f: "consortium", tx: "On Deploy: Your opponent discards a random card.", fx: [{ op: "discardEnemy", amt: 1 }] },
  custodian_vault: { n: "Custodian Vault", c: 4, t: "asset", a: 3, h: 5, f: "consortium", kw: ["firewall"] },
  bailout: { n: "Bailout", c: 4, t: "op", f: "consortium", tx: "Gain 5 Armor.", fx: [{ op: "armor", amt: 5, tgt: "self-hero" }] },
  asset_freeze: { n: "Asset Freeze", c: 5, t: "op", f: "consortium", tx: "Seize all enemy Assets.", fx: [{ op: "seize", tgt: "all-enemy-assets" }] },
  board_member: { n: "Board Member", c: 5, t: "asset", a: 4, h: 5, f: "consortium", tx: "On Deploy: Give another friendly Asset +2/+2.", fx: [{ op: "buff", a: 2, h: 2, tgt: "choose-other-friendly-asset", opt: true }] },
  liquidation_order: { n: "Liquidation Order", c: 5, t: "op", f: "consortium", tx: "Destroy an Asset. Gain 2 Armor.", fx: [{ op: "destroy", tgt: "choose-asset" }, { op: "armor", amt: 2, tgt: "self-hero" }] },
  riot_enforcer: { n: "Riot Enforcer", c: 5, t: "asset", a: 5, h: 4, f: "consortium", kw: ["firewall"] },
  regulatory_capture: { n: "Regulatory Capture", c: 6, t: "op", f: "consortium", tx: "Take control of an enemy Asset with 4 or less Attack.", fx: [{ op: "control", tgt: "choose-enemy-asset", maxAtk: 4 }] },
  the_chairman: { n: "The Chairman", c: 8, t: "asset", a: 7, h: 7, f: "consortium", tx: "On Deploy: Seize all enemy Assets. Gain 3 Armor.", fx: [{ op: "seize", tgt: "all-enemy-assets" }, { op: "armor", amt: 3, tgt: "self-hero" }] },

  // ---- sovereign (14) ----
  full_node: { n: "Full Node", c: 1, t: "asset", a: 1, h: 2, f: "sovereign", tx: "On Liquidation: Summon a 1/1 Node.", dfx: [{ op: "summon", card: "node", count: 1 }] },
  self_custody: { n: "Self Custody", c: 1, t: "op", f: "sovereign", tx: "Give an Asset Cold Storage.", fx: [{ op: "grantShield", tgt: "choose-friendly-asset" }] },
  airdrop: { n: "Airdrop", c: 2, t: "op", f: "sovereign", tx: "Summon two 1/1 Nodes.", fx: [{ op: "summon", card: "node", count: 2 }] },
  mesh_relay: { n: "Mesh Relay", c: 2, t: "asset", a: 1, h: 3, f: "sovereign", aura: 1, tx: "Your other Assets have +1 Attack." },
  cypherpunk: { n: "Cypherpunk", c: 3, t: "asset", a: 2, h: 3, f: "sovereign", kw: ["coldstorage"] },
  sovereign_miner: { n: "Sovereign Miner", c: 3, t: "asset", a: 2, h: 4, f: "sovereign", tx: "On Deploy: Gain 2 Gas this turn.", fx: [{ op: "gas", amt: 2 }] },
  torch_relay: { n: "Torch Relay", c: 3, t: "asset", a: 3, h: 3, f: "sovereign", tx: "On Liquidation: Give a random friendly Asset +2/+2.", dfx: [{ op: "buff", a: 2, h: 2, tgt: "random-friendly-asset" }] },
  peer_enforcer: { n: "Peer Enforcer", c: 4, t: "asset", a: 4, h: 3, f: "sovereign", kw: ["zeroconf"] },
  node_cluster: { n: "Node Cluster", c: 4, t: "asset", a: 2, h: 2, f: "sovereign", tx: "On Deploy: Summon two 1/1 Nodes.", fx: [{ op: "summon", card: "node", count: 2 }] },
  hard_fork: { n: "Hard Fork", c: 4, t: "op", f: "sovereign", tx: "Summon a copy of a friendly Asset.", fx: [{ op: "copyFriendly", tgt: "choose-friendly-asset" }] },
  open_source: { n: "Open Source", c: 4, t: "op", f: "sovereign", tx: "Give your Assets +1/+1. Draw a card.", fx: [{ op: "buff", a: 1, h: 1, tgt: "all-friendly-assets" }, { op: "draw", amt: 1 }] },
  decentralized_swarm: { n: "Decentralized Swarm", c: 5, t: "op", f: "sovereign", tx: "Summon four 1/1 Nodes.", fx: [{ op: "summon", card: "node", count: 4 }] },
  the_whitepaper: { n: "The Whitepaper", c: 6, t: "op", f: "sovereign", tx: "Draw 3 cards.", fx: [{ op: "draw", amt: 3 }] },
  satoshis_ghost: { n: "Satoshi's Ghost", c: 8, t: "asset", a: 6, h: 6, f: "sovereign", kw: ["coldstorage"], tx: "On Liquidation: Summon a copy of this.", dfx: [{ op: "summon", card: "satoshis_ghost", count: 1 }] },

  // ---- degen (15) ----
  leverage: { n: "Leverage", c: 1, t: "op", f: "degen", tx: "Give an Asset +3 Attack this turn.", fx: [{ op: "buffTemp", a: 3, tgt: "choose-friendly-asset" }] },
  moonboy: { n: "Moonboy", c: 1, t: "asset", a: 3, h: 1, f: "degen", tx: "On Deploy: Deal 1 damage to you.", fx: [{ op: "damage", amt: 1, tgt: "self-hero" }] },
  rekt: { n: "Rekt", c: 1, t: "op", f: "degen", tx: "Destroy a friendly Asset. Draw 2 cards.", fx: [{ op: "destroy", tgt: "choose-friendly-asset" }, { op: "draw", amt: 2 }] },
  pump: { n: "Pump", c: 2, t: "op", f: "degen", tx: "Give a random friendly Asset +3/+3.", fx: [{ op: "buff", a: 3, h: 3, tgt: "random-friendly-asset" }] },
  meme_coin: { n: "Meme Coin", c: 2, t: "asset", a: 2, h: 1, f: "degen", tx: "On Liquidation: Draw a card.", dfx: [{ op: "draw", amt: 1 }] },
  bagchaser: { n: "Bagchaser", c: 2, t: "asset", a: 3, h: 2, f: "degen" },
  degen_trader: { n: "Degen Trader", c: 3, t: "asset", a: 3, h: 4, f: "degen", tx: "On Deploy: Draw a card, then discard a random card.", fx: [{ op: "draw", amt: 1 }, { op: "discardSelf", amt: 1 }] },
  dump: { n: "Dump", c: 3, t: "op", f: "degen", tx: "Destroy a random enemy Asset.", fx: [{ op: "destroy", tgt: "random-enemy-asset" }] },
  hundred_x: { n: "100x Long", c: 3, t: "op", f: "degen", tx: "Double an Asset's Attack.", fx: [{ op: "doubleAtk", tgt: "choose-asset" }] },
  signal_caller: { n: "Signal Caller", c: 3, t: "asset", a: 2, h: 3, f: "degen", kw: ["overclock"] },
  send_it: { n: "Send It", c: 3, t: "op", f: "degen", tx: "Deal 4 damage to them and 2 to you.", fx: [{ op: "damage", amt: 4, tgt: "enemy-hero" }, { op: "damage", amt: 2, tgt: "self-hero" }] },
  casino_rig: { n: "Casino Rig", c: 4, t: "asset", a: 4, h: 4, f: "degen", tx: "On Deploy: Deal 3 damage split randomly among enemies.", fx: [{ op: "splitDamage", amt: 3 }] },
  the_influencer: { n: "The Influencer", c: 5, t: "asset", a: 4, h: 4, f: "degen", tx: "On Deploy: Draw 2 cards.", fx: [{ op: "draw", amt: 2 }] },
  ponzi_engine: { n: "Ponzi Engine", c: 5, t: "asset", a: 6, h: 6, f: "degen", tx: "On Liquidation: Deal 3 damage to you.", dfx: [{ op: "damage", amt: 3, tgt: "self-hero" }] },
  liquidation_cascade: { n: "Liquidation Cascade", c: 5, t: "op", f: "degen", tx: "Deal 3 damage to all Assets.", fx: [{ op: "damage", amt: 3, tgt: "all-assets" }] },

} satisfies Record<string, Card>;

export type CardId = keyof typeof CARDS;
export const CARD_IDS = Object.keys(CARDS) as CardId[];
export const isToken = (id: CardId): boolean => 'token' in CARDS[id];

/** Consensus effects are targetless by rule, so they never prompt mid-resolution. */
export const CONSENSUS = {
  surveillance_drone: [{ op: "draw", amt: 1 }],
  compliance_officer: [{ op: "armor", amt: 3, tgt: "self-hero" }],
  riot_enforcer: [{ op: "armor", amt: 4, tgt: "self-hero" }],
  cypherpunk: [{ op: "summon", card: "node", count: 1 }],
  torch_relay: [{ op: "summon", card: "node", count: 1 }],
  peer_enforcer: [{ op: "buff", a: 1, h: 1, tgt: "all-friendly-assets" }],
  moonboy: [{ op: "damage", amt: 2, tgt: "enemy-hero" }],
  bagchaser: [{ op: "damage", amt: 2, tgt: "enemy-hero" }],
  casino_rig: [{ op: "splitDamage", amt: 2 }],
} satisfies Partial<Record<CardId, Effect[]>>;

export const CTEXT: Partial<Record<CardId, string>> = {
  surveillance_drone: "Draw a card.",
  compliance_officer: "Gain 3 Armor.",
  riot_enforcer: "Gain 4 Armor.",
  cypherpunk: "Summon a 1/1 Node.",
  torch_relay: "Summon a 1/1 Node.",
  peer_enforcer: "Give your Assets +1/+1.",
  moonboy: "2 damage to them.",
  bagchaser: "2 damage to them.",
  casino_rig: "2 damage split randomly.",
};

/** Printed as CONSENSUS on cards. Fires if another card of the same crew already resolved this block. */
export const CONSENSUS_HELP =
  'If you already played another card of this crew this block, this line fires.';

export const KWNAME: Record<Keyword, string> = {
  firewall: "FIREWALL",
  zeroconf: "ZERO-CONF",
  coldstorage: "COLD STORAGE",
  yield: "YIELD",
  sharded: "SHARDED",
  overclock: "OVERCLOCK"
};

export const KWHELP: Record<Keyword, string> = {
  firewall: "Enemies must attack this before anything else.",
  zeroconf: "Can attack the turn it is deployed.",
  coldstorage: "Ignores the first instance of damage, then breaks.",
  yield: "Damage this Asset deals also heals you.",
  sharded: "Attacks twice per turn.",
  overclock: "Your Ops deal +1 damage while this is on the board."
};

export const FNAME: Record<Faction, string> = {
  consortium: "Consortium",
  sovereign: "Sovereigns",
  degen: "Degens",
  neutral: "Neutral"
};

export const FACTIONS = {
  consortium: {
    name: "The Consortium",
    cls: "c",
    power: {
      name: "PRINT",
      cost: 2,
      text: "Restore 2 HP to yourself.",
      fx: [
        {
          op: "heal",
          amt: 2,
          tgt: "self-hero"
        }
      ]
    },
    blurb: "The last firm. They will cage the street if that's what keeps the lights on."
  },
  sovereign: {
    name: "The Sovereigns",
    cls: "s",
    power: {
      name: "FORK",
      cost: 2,
      text: "Put a 1/1 Node onto your board.",
      fx: [
        {
          op: "summon",
          card: "node",
          count: 1
        }
      ]
    },
    blurb: "No bosses. Keys in your pocket, neighbors on the mesh, nobody to ask."
  },
  degen: {
    name: "The Degens",
    cls: "d",
    power: {
      name: "APE IN",
      cost: 2,
      text: "Deal 2 damage to them and 1 to yourself.",
      fx: [
        {
          op: "damage",
          amt: 2,
          tgt: "enemy-hero"
        },
        {
          op: "damage",
          amt: 1,
          tgt: "self-hero"
        }
      ]
    },
    blurb: "Freedom is a bet. Burn your own luck before anyone else can own you."
  }
} as const;

/** Preconstructed 25-card starter kits. */
export const DECKS: Record<PlayableFaction, Partial<Record<CardId, number>>> = {
  consortium: {
    gas_leak: 1,
    kyc_checkpoint: 2,
    private_security: 2,
    surveillance_drone: 2,
    ledger_sweep: 2,
    compliance_officer: 2,
    data_broker: 2,
    custodian_vault: 2,
    hardware_failure: 1,
    bailout: 1,
    debt_collector: 1,
    asset_freeze: 1,
    liquidation_order: 1,
    riot_enforcer: 1,
    board_member: 1,
    sentry_rig: 1,
    regulatory_capture: 1,
    the_chairman: 1
  },
  sovereign: {
    full_node: 2,
    self_custody: 2,
    seed_phrase_kid: 2,
    bagholder: 1,
    airdrop: 2,
    mesh_relay: 2,
    cypherpunk: 2,
    sovereign_miner: 2,
    node_cluster: 2,
    peer_enforcer: 2,
    open_source: 1,
    hard_fork: 1,
    decentralized_swarm: 1,
    torch_relay: 1,
    the_whitepaper: 1,
    satoshis_ghost: 1
  },
  degen: {
    leverage: 1,
    moonboy: 2,
    seed_phrase_kid: 1,
    pump: 2,
    meme_coin: 2,
    bagchaser: 2,
    paper_hands: 2,
    gas_leak: 2,
    degen_trader: 1,
    dump: 1,
    signal_caller: 1,
    send_it: 2,
    exit_liquidity: 2,
    casino_rig: 2,
    ponzi_engine: 1,
    the_influencer: 1
  }
};
