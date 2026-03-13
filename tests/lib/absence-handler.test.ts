import { describe, it, expect } from 'vitest';
import { handleAbsence, previewAbsence } from '@/lib/absence-handler';
import { generateBracket } from '@/lib/knockout-bracket';
import { generateGroups, generateRoundRobinSchedule } from '@/lib/group-generator';
import type { Tournament, Round, Match } from '@/types';

function makeSwissTournament(overrides?: Partial<Tournament>): Tournament {
  return {
    id: 'test',
    name: 'Test',
    type: 'singles',
    format: 'swiss',
    totalRounds: 4,
    setsPerMatch: 1,
    gamesPerSet: 6,
    useTiebreakGame: true,
    tiebreakCriteria: ['wins', 'game_diff'],
    participants: [
      { id: 'p1', kind: 'individual', name: 'Player 1' },
      { id: 'p2', kind: 'individual', name: 'Player 2' },
      { id: 'p3', kind: 'individual', name: 'Player 3' },
      { id: 'p4', kind: 'individual', name: 'Player 4' },
    ],
    rounds: [],
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('absence-handler', () => {
  describe('Swiss format', () => {
    it('marks pending matches as walkover for opponent', () => {
      const round: Round = {
        number: 1,
        isComplete: false,
        matches: [
          { id: 'm1', roundNumber: 1, participant1Id: 'p1', participant2Id: 'p2', sets: [], subMatches: [], isBye: false },
          { id: 'm2', roundNumber: 1, participant1Id: 'p3', participant2Id: 'p4', sets: [], subMatches: [], isBye: false },
        ],
      };
      const tournament = makeSwissTournament({ rounds: [round] });

      const result = handleAbsence(tournament, 'p1');
      const updatedMatch = result.tournament.rounds![0].matches[0];
      expect(updatedMatch.winner).toBe(2); // p2 wins
      expect(updatedMatch.resultReason).toBe('no_show');
    });

    it('does not affect completed matches', () => {
      const round: Round = {
        number: 1,
        isComplete: false,
        matches: [
          { id: 'm1', roundNumber: 1, participant1Id: 'p1', participant2Id: 'p2', sets: [{ games1: 6, games2: 3 }], subMatches: [], winner: 1, isBye: false },
          { id: 'm2', roundNumber: 1, participant1Id: 'p3', participant2Id: 'p4', sets: [], subMatches: [], isBye: false },
        ],
      };
      const tournament = makeSwissTournament({ rounds: [round] });

      const result = handleAbsence(tournament, 'p1');
      const m1 = result.tournament.rounds![0].matches[0];
      expect(m1.winner).toBe(1); // Original winner preserved
    });

    it('does not affect completed rounds', () => {
      const round: Round = {
        number: 1,
        isComplete: true,
        matches: [
          { id: 'm1', roundNumber: 1, participant1Id: 'p1', participant2Id: 'p2', sets: [{ games1: 6, games2: 3 }], subMatches: [], winner: 1, isBye: false },
        ],
      };
      const tournament = makeSwissTournament({ rounds: [round] });

      const result = handleAbsence(tournament, 'p1');
      // Completed rounds are returned as-is
      expect(result.tournament.rounds![0]).toEqual(round);
    });
  });

  describe('Single elimination format', () => {
    it('gives walkover to opponent and advances through bracket', () => {
      const pids = ['p1', 'p2', 'p3', 'p4'];
      const { main } = generateBracket(pids);

      const tournament = makeSwissTournament({
        format: 'single_elimination',
        bracket: main,
      });

      const result = handleAbsence(tournament, 'p1');
      expect(result.tournament.bracket).toBeDefined();

      // p1's opponent should have advanced
      const match = result.tournament.bracket!.matches.find(
        (m) => m.participant1Id === 'p1' || m.participant2Id === 'p1'
      );
      expect(match?.winnerId).toBeDefined();
      expect(match?.winnerId).not.toBe('p1');
    });
  });

  describe('Round robin format', () => {
    it('marks all pending group matches as forfeit', () => {
      const pids = ['p1', 'p2', 'p3', 'p4'];
      const baseTournament = makeSwissTournament({
        format: 'round_robin_knockout',
        formatConfig: { groupSize: 4, advancingPerGroup: 2, hasConsolation: false, thirdPlaceMatch: false },
      });

      const groups = generateGroups(pids, 4);
      const groupsWithRounds = groups.map((g) => ({
        ...g,
        roundRobinRounds: generateRoundRobinSchedule(g.participantIds, baseTournament),
      }));

      const tournament = { ...baseTournament, groups: groupsWithRounds, phase: 'group_stage' as const };

      const result = handleAbsence(tournament, 'p1');
      expect(result.tournament.groups).toBeDefined();

      const group = result.tournament.groups![0];
      const p1Matches = group.roundRobinRounds.flatMap((r) => r.matches).filter(
        (m) => m.participant1Id === 'p1' || m.participant2Id === 'p1'
      );

      // All matches involving p1 should be decided
      for (const m of p1Matches) {
        if (!m.isBye) {
          expect(m.winner).toBeDefined();
          expect(m.winner).not.toBe(m.participant1Id === 'p1' ? 1 : 2);
        }
      }
    });
  });

  describe('previewAbsence', () => {
    it('returns preview messages for swiss format', () => {
      const round: Round = {
        number: 1,
        isComplete: false,
        matches: [
          { id: 'm1', roundNumber: 1, participant1Id: 'p1', participant2Id: 'p2', sets: [], subMatches: [], isBye: false },
        ],
      };
      const tournament = makeSwissTournament({ rounds: [round] });
      const effects = previewAbsence(tournament, 'p1');
      expect(effects.length).toBeGreaterThan(0);
      expect(effects.some((e) => e.includes('Player 2'))).toBe(true);
    });
  });
});
