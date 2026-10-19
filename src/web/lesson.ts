import {
  LESSON_COURSES, LESSON_STEPS, type LessonCourse, type LessonStepId, type MatchView,
} from '../engine/index.ts';

export type LessonGlance = 'kw' | 'crew' | 'consensus';

export type OrientRegion = 'crews' | 'gas' | 'feed';
/** Where the veil cuts a hole. Ledger is the table sitting's last look, not a look-beat. */
export type LessonFocus = OrientRegion | 'ledger';

export type LessonBeat = {
  id: LessonStepId;
  /** One word in the prompt. The ring does the rest. */
  cue: string;
  /** The term this sitting is about, shown beside Sensei. */
  notion?: string;
  /** What Sensei says. */
  hint: string;
  spots: string[];
  /** Blink this part of the ringed card. */
  glance?: LessonGlance;
  spotPower?: boolean;
  spotHero?: boolean;
  closing?: boolean;
  index: number;
  /** Dots in the bubble. The closing beat is not one of them. */
  steps: number;
};

/** Look beats, before the first claim. Next advances them. Nothing is played. */
export const ORIENT: { region: OrientRegion; say: string }[] = [
  {
    region: 'crews',
    say: 'Both crews start at 20. A crew at 0 loses the match.',
  },
  {
    region: 'gas',
    say: 'Gas is what a card costs to play. This turn you have 1.',
  },
  {
    region: 'feed',
    say: 'The Feed is one shared row. Each crew takes one card from it each turn.',
  },
];

/** Shown on Sensei's line, at the right. The sentence under it says what the term is for. */
const NOTION: Partial<Record<LessonCourse, string>> = {
  op: 'Operation',
  deploy: 'On Deploy',
  liquidation: 'On Liquidation',
  freeze: 'Freeze',
  zeroconf: 'Zero-Conf',
  cold: 'Cold Storage',
  firewall: 'Firewall',
  yield: 'Yield',
  sharded: 'Sharded',
  overclock: 'Overclock',
  consensus: 'Consensus',
  power: 'Crew power',
};

const CUE: Record<LessonStepId, string> = {
  claim: 'Claim',
  play: 'Play',
  seal: 'Seal',
  hit: 'Hit',
  swing: 'Hit',
  again: 'Hit',
  first: 'Play',
  second: 'Play',
  power: 'Power',
  done: 'Done',
};

/** The next sitting in the one tutorial, from the table through the crew power. */
export function continueCourse(id: LessonCourse): LessonCourse | null {
  const i = LESSON_COURSES.indexOf(id);
  return i < 0 ? null : (LESSON_COURSES[i + 1] ?? null);
}

/** The beat the table is showing. Null on a real match. */
export function lessonCue(v: MatchView): LessonBeat | null {
  const id = v.lesson;
  const course = v.course;
  if (!id || !course) return null;
  const steps = LESSON_STEPS[course];
  const beat: LessonBeat = {
    id, cue: CUE[id], notion: NOTION[course], hint: '', spots: [],
    index: (steps as readonly string[]).indexOf(id),
    steps: steps.length - 1, closing: id === 'done',
  };

  if (course === 'table') return tableBeat(v, beat);
  if (id === 'done') {
    beat.hint = doneLine(course, v);
    return beat;
  }
  switch (course) {
    case 'op':
      beat.spots = ['seed_phrase_kid', 'airdrop_coin'];
      beat.hint = 'An Asset stays on the board after it is played. An Operation happens once and is gone.';
      break;
    case 'deploy':
      beat.spots = ['sovereign_miner'];
      beat.hint = 'On Deploy is the line that happens when an Asset is played. This one gains 2 gas as it lands.';
      break;
    case 'liquidation':
      beat.spots = ['full_node'];
      beat.hint = 'On Liquidation is the line that happens when an Asset hits 0 and leaves. Full Node’s line summons a 1/1.';
      break;
    case 'freeze':
      beat.spots = ['asset_freeze', 'seed_phrase_kid'];
      beat.hint = 'Freeze stops an Asset from attacking until the end of its owner’s next turn.';
      break;
    case 'zeroconf':
      beat.spots = ['frontrunner'];
      if (id === 'claim') beat.hint = 'Zero-Conf lets an Asset attack the same turn it is played.';
      else if (id === 'play') beat.hint = 'This Asset has Zero-Conf, so it does not have to wait a turn to attack.';
      else beat.hint = 'The attack can happen the same turn the Asset was played, because of Zero-Conf.';
      if (id === 'swing') beat.spotHero = true;
      break;
    case 'cold':
      beat.spots = ['cold_wallet'];
      beat.hint = 'Cold Storage is a shield that stops the first damage an Asset would take.';
      break;
    case 'firewall':
      beat.spots = ['diamond_hands'];
      beat.hint = 'A Firewall has to be attacked before anything else, including the crew behind it.';
      break;
    case 'yield':
      beat.spots = ['yield_miner'];
      beat.spotHero = true;
      beat.hint = 'Yield heals your crew for the damage that Asset deals.';
      break;
    case 'sharded':
      beat.spots = ['sharded_rig'];
      beat.spotHero = true;
      beat.hint = id === 'hit'
        ? 'Sharded lets an Asset attack twice in the same turn.'
        : 'The first attack leaves a second one, so this Asset is still ready.';
      break;
    case 'overclock':
      beat.spots = ['signal_caller', 'send_it'];
      beat.hint = 'While this Asset is on the board, your Operations deal 1 more damage. Send It says 4 to them, so it deals 5.';
      break;
    case 'consensus':
      beat.spots = id === 'first' ? ['full_node', 'torch_relay'] : ['torch_relay'];
      beat.glance = 'consensus';
      beat.hint = id === 'first'
        ? 'Play two cards from the same crew. Consensus fires only if the second one is the card with the line. Full Node first, then Torch Relay.'
        : 'Torch Relay is the second Sovereigns card, and it is the one with Consensus, so the line summons a 1/1.';
      break;
    case 'power':
      beat.spotPower = true;
      beat.hint = 'Each crew has a different power that can be used once a turn for 2 gas.';
      break;
    default:
      break;
  }
  return beat;
}

function doneLine(course: LessonCourse, v: MatchView): string {
  switch (course) {
    case 'op': return 'The Asset is still on the board. The Operation resolved once and is gone.';
    case 'deploy': return 'The Asset is on the board, and the 2 gas from On Deploy is already yours.';
    case 'liquidation': return 'Full Node is gone. The 1/1 is here because On Liquidation fired.';
    case 'freeze': return 'That Asset is Frozen. It cannot attack until the end of its owner’s next turn.';
    case 'zeroconf': return 'It attacked the turn it came down, which is what Zero-Conf allows.';
    case 'cold': return 'The shield stopped the first hit, so the Asset is still at 2 and the badge is gone.';
    case 'firewall': return 'The Firewall took the hit, so the crew behind it was not damaged.';
    case 'yield': return `The damage also healed you, so you are at ${v.you.hp}.`;
    case 'sharded': return 'It attacked twice in the same turn.';
    case 'overclock': return 'It dealt 5 to them. The printed 4 became 5 while this Asset was on the board.';
    case 'consensus': return 'The 1/1 was summoned because Torch Relay was played second, and it is the card with Consensus.';
    case 'power': return 'This power summoned a 1/1, and it can be used again next turn.';
    default: return 'That is the term.';
  }
}

function tableBeat(v: MatchView, beat: LessonBeat): LessonBeat {
  const id = beat.id;
  if (!v.yourTurn && id === 'hit') {
    beat.cue = 'Watch';
    beat.hint = 'The other crew takes one card from the Feed on their turn, then can pass.';
    return beat;
  }
  if (v.yourTurn && v.awaitingClaim && (id === 'claim' || id === 'hit')) {
    beat.cue = 'Claim';
    if (id === 'claim') {
      beat.spots = ['seed_phrase_kid'];
      beat.hint = 'The top number is the gas a card costs. Left is attack, and right is health.';
    } else {
      beat.hint = 'Each new turn gives 1 more gas, and one card is taken from the Feed before anything else.';
    }
    return beat;
  }
  switch (id) {
    case 'claim':
    case 'play':
      beat.spots = ['seed_phrase_kid'];
      beat.hint = 'An Asset that was just played cannot attack until the next turn.';
      break;
    case 'seal':
      beat.hint = 'Sealing ends the turn, unspent gas is lost, and the next turn starts with 1 more gas.';
      break;
    case 'hit':
      beat.spots = ['seed_phrase_kid'];
      beat.spotHero = true;
      beat.hint = 'A ready Asset can attack, and with nothing in the way the damage goes to the other crew.';
      break;
    case 'done':
      beat.hint = `They are at ${v.them.hp}. The ledger is the record of that fight, newest block on top.`;
      break;
    default:
      break;
  }
  return beat;
}
