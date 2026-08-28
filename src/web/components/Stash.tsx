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
    return ca.c - cb.c || ca.n.localeCompare(cb.n);
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

export function Stash({ found }: { found: Set<CardId> }) {
  const [crew, setCrew] = useState<Faction | 'all'>('all');
  const pool = useMemo(() => sortIds(
    COLLECTABLE.filter(id => crew === 'all' || CARDS[id].f === crew)
  ), [crew]);
  const pulled = pool.filter(id => found.has(id));
  const missing = pool.filter(id => !found.has(id));
  const n = COLLECTABLE.length;
  const have = found.size;

  return (
    <>
      <h1>THE <span>STASH</span></h1>
      <p className="lede">What you pulled from the wreck, and what is still out there. Salvage claims and cards from your kit stay here.</p>
      <div className="stash-count" aria-live="polite">
        <b>{have}<span> / {n}</span></b>
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
        <h2>Pulled <span>{pulled.length}</span></h2>
        {pulled.length
          ? <Grid ids={pulled} found={found} />
          : <p className="stash-empty">Nothing in the bag yet. Claim from the Feed, or run a kit.</p>}
      </section>
      <section className="stash-sec">
        <h2>Still out <span>{missing.length}</span></h2>
        <Grid ids={missing} found={found} />
      </section>
    </>
  );
}
