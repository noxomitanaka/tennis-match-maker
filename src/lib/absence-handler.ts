import { v4 as uuidv4 } from 'uuid';
import type { Tournament, Match, KnockoutBracket, GroupDef } from '@/types';
import { advanceWinner } from './knockout-bracket';

export interface AbsenceResult {
  tournament: Partial<Tournament>;
  warnings: string[];
}

/**
 * Handle participant absence for any tournament format.
 * Returns partial tournament updates and warnings.
 */
export function handleAbsence(
  tournament: Tournament,
  absentParticipantId: string
): AbsenceResult {
  const warnings: string[] = [];
  const format = tournament.format || 'swiss';
  const participant = tournament.participants.find((p) => p.id === absentParticipantId);
  if (!participant) {
    return { tournament: {}, warnings: ['参加者が見つかりません'] };
  }

  const updates: Partial<Tournament> = {
    participants: tournament.participants.map((p) =>
      p.id === absentParticipantId ? { ...p, absent: true } : p
    ),
  };

  switch (format) {
    case 'swiss':
      return handleSwissAbsence(tournament, absentParticipantId, updates, warnings);
    case 'single_elimination':
      return handleKnockoutAbsence(tournament, absentParticipantId, updates, warnings);
    case 'round_robin_knockout':
      return handleRoundRobinAbsence(tournament, absentParticipantId, updates, warnings);
    default:
      return { tournament: updates, warnings };
  }
}

/**
 * Preview the impact of marking a participant absent.
 */
export function previewAbsence(
  tournament: Tournament,
  absentParticipantId: string
): string[] {
  const effects: string[] = [];
  const format = tournament.format || 'swiss';
  const name = tournament.participants.find((p) => p.id === absentParticipantId)?.name || '不明';

  if (format === 'swiss') {
    // Check if there are incomplete rounds with this participant
    for (const round of tournament.rounds) {
      if (round.isComplete) continue;
      const match = round.matches.find(
        (m) => (m.participant1Id === absentParticipantId || m.participant2Id === absentParticipantId) && !m.winner
      );
      if (match) {
        const opponentId = match.participant1Id === absentParticipantId ? match.participant2Id : match.participant1Id;
        const opponentName = tournament.participants.find((p) => p.id === opponentId)?.name || 'BYE';
        effects.push(`ラウンド${round.number}: ${name} vs ${opponentName} → ${opponentName}の不戦勝`);
      }
    }
    effects.push(`${name}は今後のラウンドでペアリング対象外になります`);
  }

  if (format === 'single_elimination' && tournament.bracket) {
    const match = tournament.bracket.matches.find(
      (m) => !m.winnerId && (m.participant1Id === absentParticipantId || m.participant2Id === absentParticipantId)
    );
    if (match) {
      const opponentId = match.participant1Id === absentParticipantId ? match.participant2Id : match.participant1Id;
      const opponentName = tournament.participants.find((p) => p.id === opponentId)?.name || 'TBD';
      effects.push(`${opponentName}の不戦勝（ブラケット自動進行）`);
    }
  }

  if (format === 'round_robin_knockout' && tournament.groups) {
    const group = tournament.groups.find((g) => g.participantIds.includes(absentParticipantId));
    if (group) {
      const pendingMatches = group.roundRobinRounds.flatMap((r) => r.matches).filter(
        (m) => !m.winner && !m.isBye &&
          (m.participant1Id === absentParticipantId || m.participant2Id === absentParticipantId)
      );
      effects.push(`${group.name}: ${pendingMatches.length}試合が不戦敗になります`);
    }
  }

  return effects;
}

function handleSwissAbsence(
  tournament: Tournament,
  absentPid: string,
  updates: Partial<Tournament>,
  warnings: string[]
): AbsenceResult {
  // Mark incomplete matches as walkover for opponent
  const updatedRounds = tournament.rounds.map((round) => {
    if (round.isComplete) return round;
    const updatedMatches = round.matches.map((match) => {
      if (match.winner) return match; // Already decided
      if (match.participant1Id === absentPid && match.participant2Id) {
        return { ...match, winner: 2 as const, resultReason: 'no_show' as const };
      }
      if (match.participant2Id === absentPid) {
        return { ...match, winner: 1 as const, resultReason: 'no_show' as const };
      }
      return match;
    });
    return { ...round, matches: updatedMatches };
  });

  updates.rounds = updatedRounds;
  warnings.push('スイスドロー: 欠席者の未完了試合を不戦敗に設定しました');

  return { tournament: updates, warnings };
}

function handleKnockoutAbsence(
  tournament: Tournament,
  absentPid: string,
  updates: Partial<Tournament>,
  warnings: string[]
): AbsenceResult {
  if (!tournament.bracket) return { tournament: updates, warnings };

  let bracket = { ...tournament.bracket, matches: tournament.bracket.matches.map((m) => ({ ...m })) };

  // Find the match where absent player is scheduled
  const match = bracket.matches.find(
    (m) => !m.winnerId && (m.participant1Id === absentPid || m.participant2Id === absentPid)
  );

  if (match) {
    const winnerId = match.participant1Id === absentPid ? match.participant2Id : match.participant1Id;
    if (winnerId) {
      match.winnerId = winnerId;
      match.isBye = true;
      bracket = advanceWinner(bracket, match.id, winnerId);
      warnings.push('トーナメント: 対戦相手に不戦勝を付与し、ブラケットを進行しました');
    }
  }

  updates.bracket = bracket;
  return { tournament: updates, warnings };
}

function handleRoundRobinAbsence(
  tournament: Tournament,
  absentPid: string,
  updates: Partial<Tournament>,
  warnings: string[]
): AbsenceResult {
  if (!tournament.groups) return { tournament: updates, warnings };

  const updatedGroups: GroupDef[] = tournament.groups.map((group) => {
    if (!group.participantIds.includes(absentPid)) return group;

    // Mark all pending matches involving absent player as forfeit
    const updatedRounds = group.roundRobinRounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => {
        if (match.winner || match.isBye) return match;
        if (match.participant1Id === absentPid && match.participant2Id) {
          return { ...match, winner: 2 as const, resultReason: 'no_show' as const };
        }
        if (match.participant2Id === absentPid) {
          return { ...match, winner: 1 as const, resultReason: 'no_show' as const };
        }
        return match;
      }),
    }));

    // Check if rounds are now complete
    const finalRounds = updatedRounds.map((round) => ({
      ...round,
      isComplete: round.matches.every((m) => m.winner !== undefined),
    }));

    warnings.push(`${group.name}: 欠席者の試合を不戦敗に設定しました`);

    return { ...group, roundRobinRounds: finalRounds };
  });

  updates.groups = updatedGroups;
  return { tournament: updates, warnings };
}
