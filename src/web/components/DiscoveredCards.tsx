import { useMemo, useState } from 'react';
import { CARDS, FNAME, type CardId, type Faction } from '../../engine/index.ts';
import { COLLECTABLE } from '../stash.ts';
import { CardFace } from './Card.tsx';
import { FactionMark } from './Marks.tsx';

const CREWS: { id: Faction | 'all'; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'neutral', label: FNAME.neutral },
  { id: 'consortium', label: FNAME.consortium },
  { id: 'sovereign', label: FNAME.sovereign },
  { id: 'degen', label: FNAME.degen },
];

function sortIds(ids: CardId[]): CardId[] {
  return [...ids].sort((a, b) => {
    const ca = CARDS[a], cb = CARDS[b];
    return ca.c - CARDS[b].c || ca.n.localeCompare(cb.n);
  });
}

function Grid({ ids, found }: { ids: CardId[]; found: Set<CardId> }) {
  if (!ids.length) return <p className="stash-empty">None in this crew.</p>;
  return (
    <div className="stash-grid">
      {ids.map(id => <CardFace key={id} id={id} missing={!found.has(id)} />)}
    </div>
  );
}

export function DiscoveredCards({ found }: { found: Set<CardId> }) {
  const [crew, setCrew] = useState<Faction | 'all'>('all');
  const pool = useMemo(() => sortIds(
    COLLECTABLE.filter(id => crew === 'all' || CARDS[id].f === crew),
  ), [crew]);
  const seen = pool.filter(id => found.has(id));
  const missing = pool.filter(id => !found.has(id));
  const n = COLLECTABLE.length;
  const have = found.size;

  return (
    <div className="vault-discovered">
      <div className="stash-count" aria-live="polite">
        <b>{have}<span> / {n} seen</span></b>
        <div className="recap-bar"><i style={{ width: `${have / n * 100}%` }} /></div>
      </div>
      <div className="stash-tabs" role="tablist" aria-label="Crew">
        {CREWS.map(tab => {
          const total = tab.id === 'all' ? n : COLLECTABLE.filter(id => CARDS[id].f === tab.id).length;
          const got = tab.id === 'all' ? have : COLLECTABLE.filter(id => CARDS[id].f === tab.id && found.has(id)).length;
          return (
            <button key={tab.id} type="button" role="tab" aria-selected={crew === tab.id}
                    className={`stash-tab${crew === tab.id ? ' on' : ''}`}
                    onClick={() => setCrew(tab.id)}>
              {tab.id !== 'all' && <FactionMark faction={tab.id} size={12} />}
              {tab.label.toUpperCase()}
              <em>{got}/{total}</em>
            </button>
          );
        })}
      </div>
      <section className="stash-sec">
        <h2>Seen <span>{seen.length}</span></h2>
        {seen.length
          ? <Grid ids={seen} found={found} />
          : <p className="stash-empty">Nothing logged yet. Play a match, claim from the Feed, or open a pack.</p>}
      </section>
      <section className="stash-sec">
        <h2>Not yet <span>{missing.length}</span></h2>
        <Grid ids={missing} found={found} />
      </section>
      <p className="vault-note">
        Card types you&apos;ve encountered at least once — not copy counts (see Collection) and not your deck list (see Deck).
      </p>
    </div>
  );
}
