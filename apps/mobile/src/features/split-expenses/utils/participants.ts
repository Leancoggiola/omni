import type { GatheringParticipantDraft } from '@omni/shared/split-expenses';

export const DUPLICATE_PARTICIPANT_MESSAGE = 'Ya está en la juntada';

/** Si ya hay en la juntada alguien con ese nombre, sin distinguir mayúsculas: la API rechaza los repetidos. */
export function hasParticipantNamed(participants: GatheringParticipantDraft[], name: string): boolean {
  const wanted = name.trim().toLowerCase();
  return participants.some(participant => participant.displayName.trim().toLowerCase() === wanted);
}
