import type { Participant, Tournament } from '../types/index.ts';

export function getParticipantName(tournament: Tournament, participantId: string): string {
  const p = tournament.participants.find((p) => p.id === participantId);
  if (!p) return '不明';
  return p.name;
}

export function getParticipantDisplayName(participant: Participant): string {
  switch (participant.kind) {
    case 'individual':
      return participant.name;
    case 'pair':
      return `${participant.player1} / ${participant.player2}`;
    case 'team':
      return participant.name;
  }
}
