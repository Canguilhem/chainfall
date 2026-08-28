import { type ViewAsset } from '../../engine/index.ts';
import { Fly } from '../anim.tsx';
import { cn } from '../lib/utils.ts';
import { FactionMark, KwLine, StatPair } from './Marks.tsx';
import { TipHit } from './Tip.tsx';

export function BoardAsset({ asset, isMine, isReady, isSelected, isTargetable, onClick, flyId, shared, first }: {
  asset: ViewAsset;
  isMine: boolean;
  isReady: boolean;
  isSelected: boolean;
  isTargetable: boolean;
  onClick: () => void;
  flyId: string;
  shared?: boolean;
  first?: boolean;
}) {
  const className = cn(
    'asset',
    `faction-${asset.f}`,
    isMine && isReady && 'ready',
    isSelected && 'is-selected',
    asset.shield && 'shield',
    asset.seized && 'seized',
    isTargetable && 'is-targetable',
  );
  const interactive = isReady || isSelected || isTargetable;
  const tip = isTargetable ? 'click to target'
    : isReady ? 'click, then click what it hits'
    : asset.seized ? 'seized — cannot attack'
    : isMine && !isReady ? 'cannot attack this block' : undefined;
  return (
    <Fly id={flyId} shared={shared} first={first}>
      <div className={className} tabIndex={interactive ? 0 : -1} onClick={onClick}
           aria-label={`${asset.name}, ${asset.atk} attack, ${asset.hp} health`}
           onKeyDown={event => {
             if (event.key === 'Enter' || event.key === ' ') {
               event.preventDefault();
               onClick();
             }
           }}>
        <TipHit text={tip} />
        <FactionMark faction={asset.f} size={13} />
        <div className="asset-name">{asset.name}</div>
        <KwLine keywords={asset.kw} className="asset-keywords" />
        <StatPair atk={asset.atk} hp={asset.hp} damaged={asset.hp < asset.maxHp} live className="stats" />
      </div>
    </Fly>
  );
}
