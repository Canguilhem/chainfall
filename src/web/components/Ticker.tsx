/* The ledger, at phone width. The desktop aside is 238px the layout does not
   have, but hiding it outright loses the only record of what just happened on
   a turn you were not watching. One line, tap for the rest. */
import { useEffect, useRef, useState } from 'react';

export type Line = { n: number; text: string; kind: string };

export function Ticker({ lines }: { lines: Line[] }) {
  const [open, setOpen] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const last = lines[lines.length - 1];

  useEffect(() => {
    if (open && logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [open, lines]);

  return (
    <>
      <button type="button" id="ticker" onClick={() => setOpen(o => !o)}
              aria-expanded={open} aria-label="The ledger">
        <span className="tick-tag">ledger</span>
        <span className={`tick-line ${last?.kind ?? ''}`}>{last?.text ?? 'standing by'}</span>
        <span className="tick-more" aria-hidden>{open ? '×' : '···'}</span>
      </button>
      {open && (
        <div id="tick-log" ref={logRef}>
          {lines.map(e => <div key={e.n} className={e.kind}>{e.text}</div>)}
        </div>
      )}
    </>
  );
}
