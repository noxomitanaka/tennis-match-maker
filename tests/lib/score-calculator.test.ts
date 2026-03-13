import { describe, it, expect } from 'vitest';
import { determineSetWinner, determineMatchWinner } from '../../src/lib/score-calculator';
import type { Tournament, Match } from '../../src/types';

describe('determineSetWinner', () => {
  it('returns 1 when player1 wins normally', () => {
    expect(determineSetWinner({ games1: 6, games2: 3 }, 6, true)).toBe(1);
  });

  it('returns 2 when player2 wins normally', () => {
    expect(determineSetWinner({ games1: 2, games2: 6 }, 6, true)).toBe(2);
  });

  it('returns null when set is incomplete', () => {
    expect(determineSetWinner({ games1: 4, games2: 3 }, 6, true)).toBe(null);
  });

  it('returns winner by tiebreak', () => {
    expect(
      determineSetWinner({ games1: 6, games2: 6, tiebreak1: 7, tiebreak2: 5 }, 6, true)
    ).toBe(1);
    expect(
      determineSetWinner({ games1: 6, games2: 6, tiebreak1: 3, tiebreak2: 7 }, 6, true)
    ).toBe(2);
  });

  it('returns null for tied tiebreak set without tiebreak', () => {
    expect(determineSetWinner({ games1: 6, games2: 6 }, 6, false)).toBe(null);
  });
});

describe('determineMatchWinner', () => {
  const baseTournament: Tournament = {
    id: 't',
    name: 'T',
    type: 'singles',
    totalRounds: 4,
    setsPerMatch: 3,
    gamesPerSet: 6,
    useTiebreakGame: true,
    tiebreakCriteria: ['wins'],
    participants: [],
    rounds: [],
    status: 'in_progress',
    createdAt: '',
  };

  it('returns winner for best-of-3 sets', () => {
    const match: Match = {
      id: 'm',
      roundNumber: 1,
      participant1Id: 'a',
      participant2Id: 'b',
      sets: [
        { games1: 6, games2: 3 },
        { games1: 4, games2: 6 },
        { games1: 6, games2: 2 },
      ],
      subMatches: [],
      isBye: false,
    };
    expect(determineMatchWinner(match, baseTournament)).toBe(1);
  });

  it('returns undefined when match is incomplete', () => {
    const match: Match = {
      id: 'm',
      roundNumber: 1,
      participant1Id: 'a',
      participant2Id: 'b',
      sets: [{ games1: 6, games2: 3 }],
      subMatches: [],
      isBye: false,
    };
    expect(determineMatchWinner(match, baseTournament)).toBe(undefined);
  });

  it('bye match returns 1', () => {
    const match: Match = {
      id: 'm',
      roundNumber: 1,
      participant1Id: 'a',
      participant2Id: null,
      sets: [],
      subMatches: [],
      isBye: true,
    };
    expect(determineMatchWinner(match, baseTournament)).toBe(1);
  });

  it('single set match determines winner', () => {
    const t = { ...baseTournament, setsPerMatch: 1 };
    const match: Match = {
      id: 'm',
      roundNumber: 1,
      participant1Id: 'a',
      participant2Id: 'b',
      sets: [{ games1: 6, games2: 4 }],
      subMatches: [],
      isBye: false,
    };
    expect(determineMatchWinner(match, t)).toBe(1);
  });
});
