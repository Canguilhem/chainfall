import { useState, type MouseEvent, type ReactElement, type ReactNode } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip.tsx';
import { useCoarsePointer } from '../media.ts';

/** In-game help. Use instead of the native `title` tooltip.
 *
 *  Touch has no hover, so a tip can only open by taking the tap. Almost every
 *  one of these sits inside something that already answers to a tap — a card, an
 *  Asset, an operator plate — and taking it there meant a phone could not target
 *  or attack at all: the tap landed on the gloss for the thing you were aiming
 *  at. So on a coarse pointer a tip is hover chrome that isn't there. It renders
 *  its child bare and the tap goes where the player pointed it. What the tips
 *  said is on the touch path already: the card sheets carry keyword glosses and
 *  Consensus text, the prompt bar narrates the current step, and `terms` opens
 *  the glossary.
 *
 *  A disabled control is the exception. It has no action of its own to steal,
 *  and "why is SEAL greyed out" has nowhere else to be answered. */
export function Tip({ text, content, side = 'top', sideOffset = 12, contentClassName, children }: {
  text?: string;
  content?: ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
  sideOffset?: number;
  contentClassName?: string;
  children: ReactElement;
}) {
  const body = content ?? text;
  const coarse = useCoarsePointer();
  const [open, setOpen] = useState(false);
  if (!body) return children;
  const props = children.props as { disabled?: boolean };
  const disabled = Boolean(props.disabled);
  if (coarse && !disabled) return children;
  const trigger = disabled ? <span className="inline-flex">{children}</span> : children;
  const onClick = coarse
    ? (e: MouseEvent) => { e.stopPropagation(); setOpen(v => !v); }
    : undefined;
  return (
    <Tooltip open={coarse ? open : undefined} onOpenChange={coarse ? setOpen : undefined}>
      <TooltipTrigger asChild onClick={onClick}>
        {trigger}
      </TooltipTrigger>
      <TooltipContent
        side={side}
        sideOffset={sideOffset}
        collisionPadding={24}
        className={contentClassName}
      >
        {body}
      </TooltipContent>
    </Tooltip>
  );
}

/** Cover a positioned parent without wrapping keyword/stat hits (nested Radix
 *  tips do not open). Pointer-fine only — the surface it covers is the tap
 *  target on touch, so there it must not exist at all. */
export function TipHit({ text }: { text?: string }) {
  const coarse = useCoarsePointer();
  if (!text || coarse) return null;
  return (
    <Tip text={text}>
      <span className="tip-hit" aria-hidden />
    </Tip>
  );
}
