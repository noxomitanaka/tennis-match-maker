import { describe, it, expect } from 'vitest';
import { calculateStandings } from '../../src/lib/standings-calculator';
import type { Tournament, Match, Round } from '../../src/types';

function makeMatch(id: string, p1: string, p2: string | null, winner?: 1 | 2, sets: Match['sets'] = []): Match {
  return {
    id,
    roundNumber: 1,
    participant1Id: p1,
    participant2Id: p2,
    sets,
    subMatches: [],
    winner,
    isBye: p2 === null,
  };
}

function makeTournament(participants: string[], rounds: Round[]): Tournament {
  return {
    id: 'test',
    name: 'Test',
    type: 'singles',
    format: 'swiss',
    totalRounds: 4,
    setsPerMatch: 1,
    gamesPerSet: 6,
    useTiebreakGame: true,
    tiebreakCriteria: ['wins', 'set_diff', 'game_diff', 'head_to_head'],
    participants: participants.map((name) => ({ id: name, kind: 'individual' as const, name })),
    rounds,
    status: 'in_progress',
    createdAt: new Date().toISOString(),
  };
}

describe('calculateStandings', () => {
  it('ranks by wins first', () => {
    const t = makeTournament(['A', 'B', 'C', 'D'], [
      {
        number: 1,
        isComplete: true,
        matches: [
          makeMatch('m1', 'A', 'B', 1, [{ games1: 6, games2: 3 }]),
          makeMatch('m2', 'C', 'D', 1, [{ games1: 6, games2: 4 }]),
        ],
      },
    ]);

    const standings = calculateStandings(t);
    expect(standings[0].participantId).toBe('A');
    expect(standings[0].wins).toBe(1);
    expect(standings[0].rank).toBe(1);
    // C also has 1 win
    expect(standings[1].wins).toBe(1);
    // B and D have 0 wins
    expect(standings[2].wins).toBe(0);
    expect(standings[3].wins).toBe(0);
  });

  it('uses game diff as tiebreaker', () => {
    const t = makeTournament(['A', 'B', 'C', 'D'], [
      {
        number: 1,
        isComplete: true,
        matches: [
          makeMatch('m1', 'A', 'B', 1, [{ games1: 6, games2: 0 }]),
          makeMatch('m2', 'C', 'D', 1, [{ games1: 6, games2: 4 }]),
        ],
      },
    ]);

    const standings = calculateStandings(t);
    // A has game diff +6, C has game diff +2
    expect(standings[0].participantId).toBe('A');
    expect(standings[1].participantId).toBe('C');
  });

  it('bye counts as a win', () => {
    const t = makeTournament(['A', 'B', 'C'], [
      {
        number: 1,
        isComplete: true,
        matches: [
          makeMatch('m1', 'A', 'B', 1, [{ games1: 6, games2: 3 }]),
          makeMatch('m2', 'C', null, 1),
        ],
      },
    ]);

    const standings = calculateStandings(t);
    const cEntry = standings.find((s) => s.participantId === 'C')!;
    expect(cEntry.wins).toBe(1);
  });

});
