import { describe, it, expect } from 'vitest';
import { generateRound } from '../../src/lib/swiss-pairing';
import type { Tournament, Participant } from '../../src/types';

function makeTournament(participantCount: number, rounds: Tournament['rounds'] = []): Tournament {
  const participants: Participant[] = Array.from({ length: participantCount }, (_, i) => ({
    id: `p${i + 1}`,
    kind: 'individual' as const,
    name: `Player ${i + 1}`,
  }));

  return {
    id: 'test',
    name: 'Test Tournament',
    type: 'singles',
    format: 'swiss',
    totalRounds: 5,
    setsPerMatch: 1,
    gamesPerSet: 6,
    useTiebreakGame: true,
    tiebreakCriteria: ['wins', 'game_diff'],
    participants,
    rounds,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
  };
}

describe('generateRound', () => {
  it('pairs all participants in even count', () => {
    const t = makeTournament(8);
    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const { round } = generateRound(t, standings);

    expect(round.matches.length).toBe(4);
    expect(round.matches.every((m) => !m.isBye)).toBe(true);

    const ids = new Set<string>();
    for (const m of round.matches) {
      ids.add(m.participant1Id);
      if (m.participant2Id) ids.add(m.participant2Id);
    }
    expect(ids.size).toBe(8);
  });

  it('assigns bye for odd count', () => {
    const t = makeTournament(7);
    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const { round } = generateRound(t, standings);

    expect(round.matches.length).toBe(4);
    const byeMatches = round.matches.filter((m) => m.isBye);
    expect(byeMatches.length).toBe(1);
    expect(byeMatches[0].winner).toBe(1);
  });

  it('avoids rematches across rounds', () => {
    const t = makeTournament(6);
    const standings1 = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const { round: round1 } = generateRound(t, standings1);
    for (const m of round1.matches) m.winner = 1;
    round1.isComplete = true;
    t.rounds.push(round1);

    const standings2 = t.participants.map((p) => ({
      participantId: p.id,
      wins: round1.matches.some((m) => m.participant1Id === p.id && m.winner === 1) ? 1 : 0,
    }));
    const { round: round2 } = generateRound(t, standings2);

    for (const m2 of round2.matches) {
      if (!m2.participant2Id) continue;
      const isRematch = round1.matches.some(
        (m1) =>
          (m1.participant1Id === m2.participant1Id && m1.participant2Id === m2.participant2Id) ||
          (m1.participant1Id === m2.participant2Id && m1.participant2Id === m2.participant1Id)
      );
      expect(isRematch).toBe(false);
    }
  });

  it('rotates bye across rounds', () => {
    const t = makeTournament(5);
    const byeRecipients: string[] = [];

    for (let r = 0; r < 5; r++) {
      const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
      const { round } = generateRound(t, standings);
      const bye = round.matches.find((m) => m.isBye);
      if (bye) byeRecipients.push(bye.participant1Id);

      for (const m of round.matches) m.winner = 1;
      round.isComplete = true;
      t.rounds.push(round);
    }

    const uniqueRecipients = new Set(byeRecipients);
    expect(uniqueRecipients.size).toBe(5);
  });

  it('handles 32 participants over 5 rounds without rematches', () => {
    const t = makeTournament(32);

    for (let r = 0; r < 5; r++) {
      const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
      const { round } = generateRound(t, standings);

      expect(round.matches.every((m) => !m.isBye)).toBe(true);

      for (const newMatch of round.matches) {
        if (!newMatch.participant2Id) continue;
        for (const prevRound of t.rounds) {
          for (const prevMatch of prevRound.matches) {
            if (!prevMatch.participant2Id) continue;
            const isRematch =
              (prevMatch.participant1Id === newMatch.participant1Id && prevMatch.participant2Id === newMatch.participant2Id) ||
              (prevMatch.participant1Id === newMatch.participant2Id && prevMatch.participant2Id === newMatch.participant1Id);
            expect(isRematch).toBe(false);
          }
        }
      }

      for (const m of round.matches) m.winner = 1;
      round.isComplete = true;
      t.rounds.push(round);
    }
  });

  it('excludes withdrawn participants from pairing', () => {
    const t = makeTournament(6);
    // Withdraw player 6
    t.participants[5].withdrawn = true;

    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const { round } = generateRound(t, standings);

    // 5 active = 2 matches + 1 bye
    expect(round.matches.length).toBe(3);
    const allIds = round.matches.flatMap((m) => [m.participant1Id, m.participant2Id].filter(Boolean));
    expect(allIds).not.toContain('p6');
  });

  it('returns warning for few participants', () => {
    const t = makeTournament(2);
    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const { round: round1 } = generateRound(t, standings);
    for (const m of round1.matches) m.winner = 1;
    round1.isComplete = true;
    t.rounds.push(round1);

    const { round: round2, warnings } = generateRound(t, standings);
    expect(round2.matches.length).toBe(1);
    expect(warnings.some((w) => w.type === 'rematch' || w.type === 'few_participants')).toBe(true);
  });

  it('returns empty round when all participants withdrawn', () => {
    const t = makeTournament(4);
    t.participants.forEach((p) => p.withdrawn = true);

    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const { round, warnings } = generateRound(t, standings);

    expect(round.matches.length).toBe(0);
    expect(warnings.some((w) => w.type === 'few_participants')).toBe(true);
  });
});
