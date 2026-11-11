import { FC } from 'react';

import { splitGatheringsByStatus } from '../../utils/gatheringView';
import { Overline } from '../Overline';
import { GatheringListItem } from './GatheringListItem';

import type { GatheringSummary } from '@omni/shared/split-expenses';

import classes from './GatheringList.module.scss';

interface GatheringListProps {
  items: GatheringSummary[];
  selectedId: string | null;
  onSelect: (gatheringId: string) => void;
}

/** Panel izquierdo: juntadas Activas y Saldadas; la elegida lleva el borde de marca. */
export const GatheringList: FC<GatheringListProps> = ({ items, selectedId, onSelect }) => {
  const { active, settled } = splitGatheringsByStatus(items);

  return (
    <section className={classes.root} aria-label="Juntadas">
      {active.length > 0 && <Overline>Activas</Overline>}
      {active.map(item => (
        <GatheringListItem key={item.id} gathering={item} selected={item.id === selectedId} onSelect={onSelect} />
      ))}
      {settled.length > 0 && <Overline>Saldadas</Overline>}
      {settled.map(item => (
        <GatheringListItem key={item.id} gathering={item} selected={item.id === selectedId} onSelect={onSelect} />
      ))}
    </section>
  );
};
