import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion } from 'motion/react';
import {
  BOARD, CARDS, DECKS, FACTIONS,
  type Action, type CardId, type ChooseTarget, type Effect, type MatchView,
  type Mode, type PlayableFaction, type ServerMessage, type TargetRef, type ViewAsset
} from '../engine/index.ts';
import { localTransport, remoteTransport, type Transport } from './transport.ts';
import { HandCard, FeedCard } from './components/Card.tsx';
import { BoardAsset } from './components/Board.tsx';
import { OperatorBar } from './components/OperatorBar.tsx';
import { FactionMark, PowerPreview } from './components/Marks.tsx';
import { Glossary } from './components/Glossary.tsx';
import { Rules } from './components/Rules.tsx';
import { Stash } from './components/Stash.tsx';
import { Vault } from './components/Vault.tsx';
import { ClaimSheet, CardSheet } from './components/Sheet.tsx';
import { Ticker } from './components/Ticker.tsx';
import { TooltipProvider } from './components/ui/tooltip.tsx';
import { COLLECTABLE, useStash } from './stash.ts';
import { useFlyLists } from './anim.tsx';
import { useCoarsePointer, usePhoneLayout } from './media.ts';

type Opponent = 'bot' | 'human';
type Pending = { i: number; spec: ChooseTarget; maxAtk?: number } | null;
type Screen =
  | { id: 'start' }
  | { id: 'docs' }
  | { id: 'stash' }
  | { id: 'vault' }
  | { id: 'queued' }
  | { id: 'match' }
  | { id: 'over'; won: boolean | null; why: string };
type Hint = { phase: string; text: string; extra?: string };

const COACH_KEY = 'chainfall-coached';

function Recap({ v, won, why, payout }: { v: MatchView; won: boolean | null; why: string; payout?: number | null }) {
  const youF = FACTIONS[v.you.faction];
  const themF = FACTIONS[v.them.faction];
  const block = String(v.block).padStart(3, '0');
  const blurb = won === null
    ? `Both of you hit 0 on block ${block}.`
    : won
      ? `They went down on block ${block}.`
      : `You went down on block ${block}.`;
  const bar = (hp: number, max: number) => (
    <div className="recap-bar"><i style={{ width: `${Math.min(100, Math.max(0, hp) / max * 100)}%` }} /></div>
  );
  const row = (label: string, a: number, b: number) => (
    <tr><th>{label}</th><td>{a}</td><td>{b}</td></tr>
  );
  return (
    <div className="recap">
      <p className="lede recap-lede">{blurb}</p>
      <div className="recap-hp">
        <div className="recap-side">
          <FactionMark faction={v.you.faction} size={16} />
          <div>
            <strong>{youF.name.replace('The ', '').toUpperCase()}</strong>
            <small>you · {Math.max(0, v.you.hp)} HP</small>
          </div>
          {bar(v.you.hp, v.you.maxHp)}
        </div>
        <div className="recap-side them">
          <FactionMark faction={v.them.faction} size={16} />
          <div>
            <strong>{themF.name.replace('The ', '').toUpperCase()}</strong>
            <small>them · {Math.max(0, v.them.hp)} HP</small>
          </div>
          {bar(v.them.hp, v.them.maxHp)}
        </div>
      </div>
      <div className="recap-stat recap-blocks">
        <b>{v.block}</b>
        <span>blocks</span>
      </div>
      <table className="recap-board">
        <thead>
          <tr><th></th><th>you</th><th>them</th></tr>
        </thead>
        <tbody>
          {row('cards played', v.you.cardsPlayed, v.them.cardsPlayed)}
          <tr className="recap-sec"><th colSpan={3}>damage</th></tr>
          {row('dealt', v.you.dmgDealt, v.them.dmgDealt)}
          {row('received', v.you.dmgTaken, v.them.dmgTaken)}
          {row('self inflicted', v.you.dmgSelf, v.them.dmgSelf)}
        </tbody>
      </table>
      <p className="recap-meta">{v.mode === 'salvage' ? 'Salvage Run' : 'Constructed'} · {why}</p>
      {payout != null && <p className="recap-meta recap-pay">Payout · +{payout} scrip</p>}
    </div>
  );
}
const TARGET_COPY: Record<ChooseTarget, string> = {
  'choose-asset': 'any Asset to target',
  'choose-enemy-asset': 'an enemy Asset',
  'choose-friendly-asset': 'one of your Assets',
  'choose-other-friendly-asset': 'one of your other Assets',
  'choose-any': 'an Asset, or you or them',
};

/** Which target spec a card prompts for, read off the same Effect union the engine uses. */
function specFor(id: string): { spec: ChooseTarget; maxAtk?: number; opt?: boolean } | null {
  const c = CARDS[id as CardId];
  const fx: Effect[] = ('fx' in c && c.fx) ? c.fx : [];
  for (const e of fx) {
    const tgt = 'tgt' in e ? e.tgt : undefined;
    if (typeof tgt === 'string' && tgt.startsWith('choose')) {
      return { spec: tgt as ChooseTarget, maxAtk: 'maxAtk' in e ? e.maxAtk : undefined, opt: 'opt' in e ? e.opt : undefined };
    }
  }
  return null;
}

function isPlayable(v: MatchView, id: string): boolean {
  if (!v.yourTurn || v.over || v.awaitingClaim) return false;
  const c = CARDS[id as CardId];
  if (c.c > v.you.gas) return false;
  if (c.t === 'asset' && v.you.board.length >= BOARD) return false;
  return true;
}

function deadWhy(v: MatchView, id: string): string | undefined {
  if (!v.yourTurn || v.over) return 'not your block';
  if (v.awaitingClaim) return 'claim from the feed first';
  const c = CARDS[id as CardId];
  if (c.c > v.you.gas) return `costs ${c.c} gas · you have ${v.you.gas}`;
  if (c.t === 'asset' && v.you.board.length >= BOARD) return 'board is full (5 assets)';
  return undefined;
}

function powerWhy(v: MatchView, targeting: boolean): string | undefined {
  const cost = FACTIONS[v.you.faction].power.cost;
  if (!v.yourTurn || v.over) return 'not your block';
  if (v.awaitingClaim) return 'claim from the feed first';
  if (targeting) return 'finish targeting first';
  if (v.you.powerUsed) return 'already used this block';
  if (v.you.gas < cost) return `need ${cost} gas · you have ${v.you.gas}`;
  return undefined;
}

/** `touch` swaps the verb and drops the Esc hint — there is no Esc on a phone,
 *  which is why targeting also grows a Cancel button below. */
function tableHint(v: MatchView | null, pending: Pending, sel: number | null, claiming: boolean, touch: boolean): Hint {
  const Tap = touch ? 'Tap' : 'Click';
  const tap = touch ? 'tap' : 'click';
  if (!v || v.over) return { phase: 'idle', text: 'Stand by.' };
  if (!v.yourTurn) return { phase: 'wait', text: 'They are taking this block.' };
  if (claiming) return {
    phase: 'claim',
    text: touch
      ? 'Pick one card from the Feed. It goes into your hand.'
      : 'Click one card in the Feed. It goes into your hand.',
    extra: touch
      ? 'The Feed is a shared market, not their board.'
      : 'The middle row is a shared market, not their board.',
  };
  if (pending) return {
    phase: 'target',
    text: `${Tap} ${TARGET_COPY[pending.spec]}.${touch ? '' : ' Esc cancels.'}`,
    extra: 'Outlined pieces are legal targets.',
  };
  if (sel !== null) {
    const walls = v.them.board.some(a => a.kw.includes('firewall'));
    return {
      phase: 'strike',
      text: walls
        ? `Firewall up — ${tap} the highlighted Asset. It must be hit first.`
        : `${Tap} a highlighted enemy Asset, or their HP box, to attack.`,
      extra: 'Amber ring means it can attack. Newly deployed Assets wait one block unless they have Zero-Conf.',
    };
  }
  const ready = v.you.board.some(a => a.canAttack);
  const playable = (v.you.hand ?? []).some(id => isPlayable(v, id));
  if (playable && ready) return {
    phase: 'act',
    text: `Play a lit card, ${tap} a ready Asset to attack, or seal the block.`,
    extra: 'Grey cards cost more gas than you have. Unspent gas is lost when you seal.',
  };
  if (playable) return {
    phase: 'play',
    text: touch
      ? 'Tap a card in your hand to read it, then Play.'
      : 'Click a lit card in your hand to play it.',
    extra: 'The gold circle is gas cost. Grey cards cost more than you have this block.',
  };
  if (ready) return {
    phase: 'attack',
    text: `${Tap} a ready Asset (amber ring), then ${tap} what it hits.`,
    extra: 'Assets cannot attack the block they are deployed unless they have Zero-Conf.',
  };
  return {
    phase: 'seal',
    text: 'Nothing left to play or attack. Seal the block to end your turn.',
    extra: 'SEAL passes the fight to them. Unspent gas does not carry over.',
  };
}

function boardSlots(board: ViewAsset[] | undefined): (ViewAsset | null)[] {
  return Array.from({ length: BOARD }, (_, i) => board?.[i] ?? null);
}

function readCoach(): boolean {
  try { return localStorage.getItem(COACH_KEY) !== '1'; } catch { return true; }
}

export function App() {
  const [screen, setScreen] = useState<Screen>({ id: 'start' });
  const [mode, setMode] = useState<Mode>('salvage');
  const [opponent, setOpponent] = useState<Opponent>('bot');
  const [v, setV] = useState<MatchView | null>(null);
  const [pending, setPending] = useState<Pending>(null);
  const [sel, setSel] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const [conn, setConn] = useState('offline');
  const [coach, setCoach] = useState(readCoach);
  const [lexicon, setLexicon] = useState(false);
  const [peek, setPeek] = useState<number | null>(null);   // hand card being read on touch
  const [feedOpen, setFeedOpen] = useState(false);          // feed sheet opened by hand
  const [feedShut, setFeedShut] = useState(false);          // stepped out of this claim step
  const phone = usePhoneLayout();
  const coarse = useCoarsePointer();
  const awaitingClaim = !!v?.awaitingClaim;
  const transport = useRef<Transport | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const seenLog = useRef(0);
  const [lines, setLines] = useState<{ n: number; text: string; kind: string }[]>([]);
  const deal = useRef(true);
  const fly = useFlyLists(v, !!v);
  const { found, add, wallet, buyPack, openPack, craft, salvage, awardScrip } = useStash();
  const addRef = useRef(add);
  addRef.current = add;
  const paid = useRef(false);
  const [payout, setPayout] = useState<number | null>(null);
  if (screen.id !== 'match') deal.current = true;
  const first = deal.current;

  const fighting = screen.id === 'match';
  const goLobby = useCallback((id: Exclude<Screen['id'], 'match' | 'over' | 'queued'>) => {
    if (screen.id === 'match') return;
    transport.current?.close();
    setV(null);
    setScreen({ id });
  }, [screen.id]);
  const send = useCallback((a: Action) => transport.current?.send(a), []);
  const flash = useCallback((m: string) => {
    setNotice(m);
    const t = setTimeout(() => setNotice(''), 1400);
    return () => clearTimeout(t);
  }, []);
  const dismissCoach = useCallback(() => {
    setCoach(false);
    try { localStorage.setItem(COACH_KEY, '1'); } catch { /* private mode */ }
  }, []);

  /* ---- transport wiring: identical handlers for local and remote ---- */
  const begin = useCallback((faction: PlayableFaction) => {
    transport.current?.close();
    seenLog.current = 0; setLines([]); setPending(null); setSel(null);
    setPeek(null); setFeedOpen(false); setFeedShut(false);
    const handlers = {
      onView: (nv: MatchView) => {
        setV(nv); setPending(null); setPeek(null);   // hand indices just moved
        const fresh = nv.log.filter(e => e.n >= seenLog.current);
        if (fresh.length) {
          seenLog.current = fresh[fresh.length - 1]!.n + 1;
          setLines(prev => [...prev, ...fresh]);
        }
        const matchCardIds = [...(nv.you.hand ?? [])];
        if (nv.mode === 'constructed') matchCardIds.push(...Object.keys(DECKS[nv.you.faction]));
        addRef.current(matchCardIds);
      },
      onMessage: (message: ServerMessage) => {
        if (message.t === 'queued') setScreen({ id: 'queued' });
        else if (message.t === 'start') { setScreen({ id: 'match' }); setConn(opponent === 'bot' ? 'solo' : 'connected'); }
        else if (message.t === 'reject') flash(message.why);
        else if (message.t === 'timeout') flash('turn timed out');
        else if (message.t === 'opponentGone') setConn('dropped · clock held');
        else if (message.t === 'opponentBack') setConn('connected');
        else if (message.t === 'resumeFailed') setScreen({ id: 'start' });
        else if (message.t === 'over') setScreen({ id: 'over', won: message.won, why: message.why });
      }
    };
    transport.current = opponent === 'bot'
      ? localTransport(faction, mode, handlers)
      : remoteTransport(faction, mode, handlers);
  }, [mode, opponent, flash]);

  useEffect(() => () => transport.current?.close(), []);
  useEffect(() => { if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight; }, [lines]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setPending(null); setSel(null); setLexicon(false); setPeek(null); setFeedOpen(false);
      if (screen.id === 'stash' || screen.id === 'docs' || screen.id === 'vault') setScreen({ id: 'start' });
    };
    window.addEventListener('keydown', esc);
    return () => window.removeEventListener('keydown', esc);
  }, [screen.id]);
  useEffect(() => { if (screen.id === 'match') deal.current = false; }, [screen.id]);
  useEffect(() => { if (v && v.block >= 4 && coach) dismissCoach(); }, [v, coach, dismissCoach]);
  /* Stepping out of the claim sheet holds for that claim step only. Once the
     claim is spent the flag clears, so the next block's sheet opens by itself. */
  useEffect(() => { if (!awaitingClaim) setFeedShut(false); }, [awaitingClaim]);
  useEffect(() => {
    if (screen.id === 'match') { paid.current = false; setPayout(null); }
  }, [screen.id]);
  useEffect(() => {
    if (screen.id !== 'over' || paid.current) return;
    paid.current = true;
    setPayout(awardScrip(screen.won));
  }, [screen, awardScrip]);

  /* ---- local legality: advisory only, the server re-checks everything ---- */
  const seat = v?.seat ?? 0;
  const legalTargets = useCallback((spec: ChooseTarget, maxAtk?: number): TargetRef[] => {
    if (!v) return [];
    const mine = v.you.board.map(a => ({ p: seat, kind: 'asset' as const, uid: a.uid, atk: a.atk }));
    const theirs = v.them.board.map(a => ({ p: (1 - seat) as 0 | 1, kind: 'asset' as const, uid: a.uid, atk: a.atk }));
    let out: (TargetRef & { atk?: number })[] =
      spec === 'choose-asset' ? [...mine, ...theirs]
      : spec === 'choose-enemy-asset' ? theirs
      : spec === 'choose-friendly-asset' || spec === 'choose-other-friendly-asset' ? mine
      : [...mine, ...theirs, { p: seat, kind: 'hero' }, { p: (1 - seat) as 0 | 1, kind: 'hero' }];
    if (maxAtk !== undefined) out = out.filter(r => r.atk === undefined || r.atk <= maxAtk);
    return out;
  }, [v, seat]);

  const defenders = useMemo((): TargetRef[] => {
    if (!v) return [];
    const walls = v.them.board.filter(a => a.kw.includes('firewall'));
    const refs: TargetRef[] = (walls.length ? walls : v.them.board)
      .map(a => ({ p: (1 - seat) as 0 | 1, kind: 'asset' as const, uid: a.uid }));
    if (!walls.length) refs.push({ p: (1 - seat) as 0 | 1, kind: 'hero' });
    return refs;
  }, [v, seat]);

  const marked = useMemo(() => {
    const empty = { assets: new Set<number>(), heroes: new Set<number>() };
    if (!v) return empty;
    if (pending) {
      const refs = legalTargets(pending.spec, pending.maxAtk);
      return {
        assets: new Set(refs.filter(r => r.kind === 'asset').map(r => r.uid!)),
        heroes: new Set(refs.filter(r => r.kind === 'hero').map(r => r.p))
      };
    }
    if (sel !== null && v.yourTurn && !v.awaitingClaim) {
      return {
        assets: new Set(defenders.filter(r => r.kind === 'asset').map(r => r.uid!)),
        heroes: new Set(defenders.filter(r => r.kind === 'hero').map(r => r.p))
      };
    }
    return empty;
  }, [v, pending, sel, legalTargets, defenders]);

  /* ---- input ---- */
  const playCard = (id: string, i: number) => {
    if (!v || !v.yourTurn || v.over) return;
    if (v.awaitingClaim) return flash('claim from the feed first');
    const c = CARDS[id as CardId];
    if (c.c > v.you.gas || (c.t === 'asset' && v.you.board.length >= BOARD)) return;
    setSel(null); setPeek(null);
    const s = specFor(id);
    if (s) {
      const refs = legalTargets(s.spec, s.maxAtk);
      if (refs.length) return setPending({ i, spec: s.spec, maxAtk: s.maxAtk });
      if (!s.opt && c.t === 'op') return flash('no legal target');
    }
    send({ t: 'play', i });
  };
  /* Two-stage on touch: the first tap reads the card, the sheet's button plays
     it. A 76px card is too small to commit gas on by accident, and there is no
     hover to check the rules text with first. */
  const onCard = (id: string, i: number) => {
    if (coarse) { setPeek(p => (p === i ? null : i)); return; }
    playCard(id, i);
  };
  const cancelTarget = () => { setPending(null); setSel(null); };
  const resolvePending = (ref: TargetRef) => {
    if (!pending) return;
    const ok = legalTargets(pending.spec, pending.maxAtk)
      .some(r => r.kind === ref.kind && r.p === ref.p && (r.kind === 'hero' || r.uid === ref.uid));
    if (ok) send({ t: 'play', i: pending.i, target: ref });
    setPending(null);
  };
  const onAsset = (a: ViewAsset, mine: boolean) => {
    if (!v || v.over) return;
    if (pending) return resolvePending({ p: (mine ? seat : 1 - seat) as 0 | 1, kind: 'asset', uid: a.uid });
    if (!v.yourTurn) return;
    if (mine) return setSel(sel === a.uid ? null : (a.canAttack ? a.uid : null));
    if (sel === null) return;
    if (!defenders.some(r => r.kind === 'asset' && r.uid === a.uid)) return flash('firewall blocks that line');
    send({ t: 'attack', attacker: sel, target: { p: (1 - seat) as 0 | 1, kind: 'asset', uid: a.uid } });
    setSel(null);
  };
  const onPlayerTarget = (mine: boolean) => {
    if (!v || v.over) return;
    if (pending) return resolvePending({ p: (mine ? seat : 1 - seat) as 0 | 1, kind: 'hero' });
    if (!v.yourTurn || mine || sel === null) return;
    if (!defenders.some(r => r.kind === 'hero')) return flash('firewall blocks that line');
    send({ t: 'attack', attacker: sel, target: { p: (1 - seat) as 0 | 1, kind: 'hero' } });
    setSel(null);
  };

  /* ---- render ---- */
  const claiming = !!v && v.mode === 'salvage' && v.awaitingClaim && v.yourTurn && !v.over;
  const hint = tableHint(v, pending, sel, claiming, coarse);
  const aiming = !!pending || sel !== null;
  // At phone width the Feed is a sheet, not a strip on the centreline: it is
  // only decidable for a few seconds a block, so it does not earn the band.
  const sheetFeed = phone && !!v && v.mode === 'salvage' && screen.id === 'match'
    && (feedOpen || (claiming && !feedShut));
  const peeked = peek != null ? fly.hand[peek] : undefined;
  const phase = !v ? 'standby'
    : v.over ? 'fight over'
    : !v.yourTurn ? 'their block'
    : v.awaitingClaim ? 'claim from the feed' : 'your block';
  const canPower = !!v && v.yourTurn && !v.over && !v.awaitingClaim && !pending
    && !v.you.powerUsed && v.you.gas >= FACTIONS[v.you.faction].power.cost;
  const canEnd = !!v && v.yourTurn && !v.over && !v.awaitingClaim;
  const endWhy = !v || !v.yourTurn || v.over ? 'not your block'
    : v.awaitingClaim ? 'claim from the feed first' : undefined;

  return (
    <TooltipProvider delayDuration={150}>
    <>
      <header>
        {fighting
          ? <div className="wordmark">CHAIN<span>FALL</span></div>
          : (
            <button type="button" className="wordmark" onClick={() => goLobby('start')}>
              CHAIN<span>FALL</span>
            </button>
          )}
        {fighting ? (
          <>
            <div className="tag blk">block {String(v?.block ?? 0).padStart(3, '0')}</div>
            <div className="spacer" />
            <div className={`tag conn${conn === 'connected' || conn === 'solo' ? ' live' : conn === 'offline' ? '' : ' warn'}`}>{conn}</div>
            <button type="button" className={`tag${lexicon ? ' live' : ''}`} onClick={() => setLexicon(on => !on)}>terms</button>
            <div className={`tag phase${notice ? ' warn' : ''}`}>{notice || phase}</div>
          </>
        ) : (
          <>
            <div className="spacer" />
            <nav className="topnav" aria-label="App">
              <button type="button" className={`nav${screen.id === 'docs' ? ' on' : ''}`}
                      aria-current={screen.id === 'docs' ? 'page' : undefined}
                      onClick={() => goLobby('docs')}>Rules</button>
              <button type="button" className={`nav${screen.id === 'stash' ? ' on' : ''}`}
                      aria-current={screen.id === 'stash' ? 'page' : undefined}
                      onClick={() => goLobby('stash')}>
                Stash <em>{found.size}/{COLLECTABLE.length}</em>
              </button>
              <button type="button" className={`nav${screen.id === 'vault' ? ' on' : ''}`}
                      aria-current={screen.id === 'vault' ? 'page' : undefined}
                      onClick={() => goLobby('vault')}>
                Vault <em>{wallet.packs} sealed</em>
              </button>
            </nav>
            <div className="tag chip">scrip <b>{wallet.scrip}</b></div>
          </>
        )}
      </header>

      <div id="app" className={fighting ? '' : 'dormant'}>
        <main>
          <div id="table" data-phase={hint.phase}
               className={`${claiming ? 'claiming' : ''}${aiming ? ' aiming' : ''}${pending ? ' targeting' : ''}`.trim()}>
            <LayoutGroup>
            {screen.id === 'match' && <Ticker lines={lines} />}
            {v && <OperatorBar player={v.them} isMine={false} mode={v.mode} targetable={marked.heroes.has(1 - seat)} onPlayer={() => onPlayerTarget(false)} />}
            <div className="board them">
              {boardSlots(v?.them.board).map((a, i) => a
                ? <BoardAsset key={a.uid} flyId={fly.fly(a.uid)} first={first} asset={a} isMine={false} isReady={false} isSelected={false}
                         isTargetable={marked.assets.has(a.uid)} onClick={() => onAsset(a, false)} />
                : <motion.div key={`them-${i}`} layout className="slot" aria-hidden />)}
            </div>
            {v?.mode === 'salvage' && phone && (
              <button type="button" id="feedbtn" className={claiming ? 'go' : ''}
                      onClick={() => setFeedOpen(true)}>
                <b>{claiming ? 'CLAIM FROM THE FEED' : 'SHARED FEED'}</b>
                <em>{v.feedRemaining} left</em>
              </button>
            )}
            {v?.mode === 'salvage' && !phone && (
              <div id="feed" className={`on${claiming ? ' claim' : ''}`}>
                <div className={`fl${claiming ? ' go' : ''}`}>
                  <b>SHARED FEED</b>
                  {claiming ? <span className="fl-claim">CLAIM</span> : <span>market</span>}
                  <em>{v.feedRemaining} left</em>
                </div>
                {fly.feed.map((item, i) => (
                  <FeedCard key={item.key} flyId={item.key} first={first} id={item.id}
                            claimable={claiming} onClick={() => send({ t: 'claim', i })} />
                ))}
              </div>
            )}
            <div id="prompt" className={hint.phase} aria-live="polite">
              <span className="prompt-text">{hint.text}</span>
              {aiming && (
                <button className="skip cancel" type="button" onClick={cancelTarget}>cancel</button>
              )}
              {coach && hint.extra && <span className="prompt-extra">{hint.extra}</span>}
              {coach && screen.id === 'match' && v?.yourTurn && !aiming && (
                <button className="skip" type="button" onClick={dismissCoach}>skip hints</button>
              )}
            </div>
            <div className="board you">
              {boardSlots(v?.you.board).map((a, i) => a
                ? <BoardAsset key={a.uid} flyId={fly.fly(a.uid)} shared={fly.deployed.has(a.uid)} first={first} asset={a} isMine
                         isReady={a.canAttack && v!.yourTurn && !pending && !v!.awaitingClaim}
                         isSelected={sel === a.uid} isTargetable={marked.assets.has(a.uid)}
                         onClick={() => onAsset(a, true)} />
                : <motion.div key={`you-${i}`} layout className="slot" aria-hidden />)}
            </div>
            {v && (
              <OperatorBar
                player={v.you} isMine mode={v.mode} targetable={marked.heroes.has(seat)}
                canPower={canPower} canEnd={canEnd}
                powerWhy={powerWhy(v, !!pending)} endWhy={endWhy}
                onPlayer={() => onPlayerTarget(true)}
                onPower={() => send({ t: 'power' })}
                onEnd={() => { setPending(null); setSel(null); send({ t: 'end' }); }}
              />
            )}
            <div id="hand" className={claiming ? 'locked' : ''} style={{ ['--n' as string]: fly.hand.length }}>
              {fly.hand.map((item, i) => (
                <HandCard key={item.key} flyId={item.key} shared={fly.claimed.has(item.key)}
                          fresh={fly.drawn.has(item.key)} first={first}
                          id={item.id} selected={pending?.i === i || peek === i}
                          playable={!!v && isPlayable(v, item.id)} why={v && !isPlayable(v, item.id) ? deadWhy(v, item.id) : undefined}
                          onClick={() => onCard(item.id, i)} />
              ))}
            </div>
            </LayoutGroup>
          </div>
          <aside id="ledger">
            {/* Match log. Phone ticker reads the same copy. */}
            <h2>the ledger</h2>
            <div id="log" ref={logRef}>
              {lines.map(e => <div key={e.n} className={e.kind}>{e.text}</div>)}
            </div>
          </aside>
        </main>
      </div>

      <div id="veil" className={[screen.id === 'match' ? 'off' : '', screen.id === 'over' ? 'has-dock' : ''].filter(Boolean).join(' ')}>
        <div className={`panel${screen.id === 'stash' || screen.id === 'vault' ? ' stash-panel' : ''}`}>
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
                            aria-pressed={mode === m} onClick={() => setMode(m)}>
                      <h4>{m === 'constructed' ? 'CONSTRUCTED' : 'SALVAGE RUN'}
                        {mode === m && <em>selected</em>}</h4>
                      <p>{m === 'constructed'
                        ? 'Your own 25-card kit. Draw one per block.'
                        : 'No kit. Claim one card each block from a shared Feed.'}</p>
                    </button>
                  ))}
                </div>
              </section>
              <section className="setup">
                <h2><span>2</span> Who you face</h2>
                <div className="modes">
                  {(['bot', 'human'] as Opponent[]).map(o => (
                    <button key={o} className={`mode${opponent === o ? ' on' : ''}`}
                            aria-pressed={opponent === o} onClick={() => setOpponent(o)}>
                      <h4>{o === 'bot' ? 'SOLO' : 'VERSUS'}
                        {opponent === o && <em>selected</em>}</h4>
                      <p>{o === 'bot' ? 'Play the engine locally. No server needed.' : 'Queue for the next crew. Server-authoritative.'}</p>
                    </button>
                  ))}
                </div>
              </section>
              <section className="setup">
                <h2><span>3</span> Pick a crew — this starts the match</h2>
                <div className="picks">
                  {(Object.keys(FACTIONS) as PlayableFaction[]).map(k => {
                    const f = FACTIONS[k];
                    return (
                      <button key={k} className={`pick ${f.cls}`} onClick={() => begin(k)}
                              aria-label={`Play as ${f.name.replace('The ', '')}. ${f.power.name}, ${f.power.cost} gas. ${f.power.text} ${f.blurb}`}>
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
          {screen.id === 'stash' && <Stash found={found} />}
          {screen.id === 'vault' && (
            <Vault wallet={wallet} onBuy={buyPack} onOpen={openPack}
                   onCraft={craft} onSalvage={salvage} />
          )}
          {screen.id === 'docs' && <Rules />}
        </div>
        {screen.id === 'over' && (
          <div className="dock">
            <button className="again" type="button" onClick={() => goLobby('start')}>RUN IT BACK</button>
            <button className="again stash-link" type="button" onClick={() => goLobby('stash')}>THE STASH</button>
            <button className="again stash-link" type="button" onClick={() => goLobby('vault')}>THE VAULT</button>
          </div>
        )}
      </div>

      {sheetFeed && v && (
        <ClaimSheet feed={fly.feed} remaining={v.feedRemaining} claimable={claiming}
                    onClaim={i => { send({ t: 'claim', i }); setFeedOpen(false); }}
                    onClose={() => { setFeedOpen(false); setFeedShut(true); }} />
      )}
      {peeked && v && !sheetFeed && (
        <CardSheet id={peeked.id} playable={isPlayable(v, peeked.id)}
                   why={deadWhy(v, peeked.id)}
                   onPlay={() => playCard(peeked.id, peek!)}
                   onClose={() => setPeek(null)} />
      )}

      {/* Phone landscape has ~333px of table and the fixed chrome alone — two
          rails, the Feed bar, the prompt and the hand — wants 339 before either
          board gets a pixel. There is no shrinking that fixes that, so ask for
          the orientation the layout was designed for. CSS decides when this
          shows; see the landscape block in styles/mobile.css. */}
      {fighting && (
        <div id="rotate" role="alertdialog" aria-labelledby="rot-h">
          <strong id="rot-h">TURN THE PHONE</strong>
          <p>Portrait fits both boards, the Feed and your hand on one screen. Landscape does not.</p>
          <small>The match is still running. Nothing was lost.</small>
        </div>
      )}

      {lexicon && (
        <div id="lexicon" role="dialog" aria-labelledby="lex-h">
          <div className="lex-head">
            <h2 id="lex-h">Glossary</h2>
            <button type="button" className="skip" onClick={() => setLexicon(false)}>close</button>
          </div>
          <Glossary compact />
        </div>
      )}
    </>
    </TooltipProvider>
  );
}
