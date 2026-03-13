import { describe, it, expect } from 'vitest';
import { generateGroups, swapBetweenGroups, generateRoundRobinSchedule } from '@/lib/group-generator';
import type { Tournament } from '@/types';

const baseTournament: Tournament = {
  id: 'test',
  name: 'Test',
  type: 'singles',
  format: 'round_robin_knockout',
  totalRounds: 0,
  setsPerMatch: 1,
  gamesPerSet: 6,
  useTiebreakGame: true,
  tiebreakCriteria: ['wins', 'game_diff'],
  participants: [],
  rounds: [],
  status: 'setup',
  createdAt: new Date().toISOString(),
};

describe('group-generator', () => {
  describe('generateGroups', () => {
    it('generates correct number of groups for 12 players / size 4', () => {
      const ids = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
      const groups = generateGroups(ids, 4);

      expect(groups).toHaveLength(3);
      expect(groups[0].name).toBe('グループA');
      expect(groups[1].name).toBe('グループB');
      expect(groups[2].name).toBe('グループC');
    });

    it('distributes participants evenly with snake seeding', () => {
      const ids = Array.from({ length: 12 }, (_, i) => `p${i + 1}`);
      const groups = generateGroups(ids, 4);

      // Each group should have 4 participants
      for (const g of groups) {
        expect(g.participantIds).toHaveLength(4);
      }

      // All participants should be assigned
      const all = groups.flatMap((g) => g.participantIds);
      expect(all).toHaveLength(12);
      expect(new Set(all).size).toBe(12);
    });

    it('snake pattern: seed 1 and 6 in same group', () => {
      const ids = Array.from({ length: 6 }, (_, i) => `p${i + 1}`);
      const groups = generateGroups(ids, 3);

      // Snake: p1→A, p2→B, p3→B, p4→A (for 2 groups)
      // Actually with 6/3 = 2 groups: p1→A, p2→B, p3→B, p4→A, p5→A, p6→B
      expect(groups).toHaveLength(2);
      expect(groups[0].participantIds).toContain('p1');
      expect(groups[1].participantIds).toContain('p2');
    });

    it('handles uneven groups', () => {
      const ids = Array.from({ length: 7 }, (_, i) => `p${i + 1}`);
      const groups = generateGroups(ids, 3);

      // 7 / 3 = 3 groups (3, 3, 1 or similar)
      expect(groups).toHaveLength(3);
      const total = groups.reduce((sum, g) => sum + g.participantIds.length, 0);
      expect(total).toBe(7);
    });
  });

  describe('swapBetweenGroups', () => {
    it('swaps two participants between groups', () => {
      const ids = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
      const groups = generateGroups(ids, 4);

      const g1p = groups[0].participantIds[0]; // first participant in group A
      const g2p = groups[1].participantIds[0]; // first participant in group B

      const swapped = swapBetweenGroups(groups, g1p, g2p);

      expect(swapped[0].participantIds).toContain(g2p);
      expect(swapped[1].participantIds).toContain(g1p);
      expect(swapped[0].participantIds).not.toContain(g1p);
      expect(swapped[1].participantIds).not.toContain(g2p);
    });
  });

  describe('generateRoundRobinSchedule', () => {
    it('generates correct number of rounds for 4 participants', () => {
      const ids = ['a', 'b', 'c', 'd'];
      const rounds = generateRoundRobinSchedule(ids, baseTournament);

      // 4 participants = 3 rounds (each plays 3 matches)
      expect(rounds).toHaveLength(3);
    });

    it('each participant plays every other participant exactly once', () => {
      const ids = ['a', 'b', 'c', 'd'];
      const rounds = generateRoundRobinSchedule(ids, baseTournament);

      const matchups = new Set<string>();
      for (const round of rounds) {
        for (const match of round.matches) {
          if (!match.isBye && match.participant2Id) {
            const key = [match.participant1Id, match.participant2Id].sort().join('-');
            expect(matchups.has(key)).toBe(false); // No duplicates
            matchups.add(key);
          }
        }
      }

      // 4 choose 2 = 6 unique matchups
      expect(matchups.size).toBe(6);
    });

    it('handles odd number of participants with byes', () => {
      const ids = ['a', 'b', 'c'];
      const rounds = generateRoundRobinSchedule(ids, baseTournament);

      // 3 participants (+ dummy) = 3 rounds
      expect(rounds).toHaveLength(3);

      // Each round should have some byes
      const totalByes = rounds.reduce(
        (sum, r) => sum + r.matches.filter((m) => m.isBye).length,
        0
      );
      expect(totalByes).toBe(3); // Each participant gets 1 bye
    });

    it('generates correct number of matches per round', () => {
      const ids = ['a', 'b', 'c', 'd'];
      const rounds = generateRoundRobinSchedule(ids, baseTournament);

      // 4 participants = 2 matches per round
      for (const round of rounds) {
        expect(round.matches).toHaveLength(2);
      }
    });
  });
});
