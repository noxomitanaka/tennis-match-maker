import { describe, it, expect } from 'vitest';
import { generateBracket, advanceWinner, populateThirdPlaceMatch, getMatchesByRound, getRoundLabel, getTotalRounds } from '@/lib/knockout-bracket';

describe('knockout-bracket', () => {
  describe('generateBracket', () => {
    it('generates bracket for 4 participants', () => {
      const ids = ['a', 'b', 'c', 'd'];
      const { main } = generateBracket(ids);

      // 4 players = 3 matches (2 semis + 1 final)
      expect(main.matches).toHaveLength(3);

      // Final at position 1
      const final = main.matches.find((m) => m.position === 1);
      expect(final).toBeDefined();
      expect(final!.roundNum).toBe(1);

      // Semis at positions 2 and 3
      const semis = main.matches.filter((m) => m.position === 2 || m.position === 3);
      expect(semis).toHaveLength(2);
      expect(semis.every((m) => m.roundNum === 2)).toBe(true);

      // All 4 participants should be in first round
      const firstRound = main.matches.filter((m) => m.roundNum === 2);
      const allPids = firstRound.flatMap((m) => [m.participant1Id, m.participant2Id].filter(Boolean));
      expect(allPids).toHaveLength(4);
      for (const id of ids) {
        expect(allPids).toContain(id);
      }
    });

    it('generates bracket for 8 participants with no byes', () => {
      const ids = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
      const { main } = generateBracket(ids);

      // 8 players = 7 matches total
      expect(main.matches).toHaveLength(7);
      expect(main.matches.every((m) => !m.isBye)).toBe(true);
    });

    it('generates byes for non-power-of-2 participants', () => {
      const ids = ['a', 'b', 'c', 'd', 'e']; // 5 participants
      const { main } = generateBracket(ids);

      // Bracket size = 8, so 3 byes
      const byes = main.matches.filter((m) => m.isBye);
      expect(byes.length).toBe(3);

      // Bye winners should be propagated
      for (const bye of byes) {
        expect(bye.winnerId).toBeDefined();
      }
    });

    it('generates 3rd place match when configured', () => {
      const ids = ['a', 'b', 'c', 'd'];
      const { main } = generateBracket(ids, { hasConsolation: false, thirdPlaceMatch: true });

      const thirdPlace = main.matches.find((m) => m.position === -1);
      expect(thirdPlace).toBeDefined();
      expect(thirdPlace!.roundNum).toBe(1);
    });

    it('generates consolation bracket when configured', () => {
      const ids = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
      const { main, consolation } = generateBracket(ids, { hasConsolation: true, thirdPlaceMatch: false });

      expect(consolation).toBeDefined();
      expect(consolation!.type).toBe('consolation');
    });

    it('handles 2 participants (minimum)', () => {
      const { main } = generateBracket(['a', 'b']);
      expect(main.matches).toHaveLength(1);
      expect(main.matches[0].position).toBe(1);
      expect(main.matches[0].participant1Id).toBe('a');
      expect(main.matches[0].participant2Id).toBe('b');
    });

    it('returns empty bracket for less than 2 participants', () => {
      const { main } = generateBracket(['a']);
      expect(main.matches).toHaveLength(0);
    });
  });

  describe('advanceWinner', () => {
    it('advances winner to parent match', () => {
      const ids = ['a', 'b', 'c', 'd'];
      const { main } = generateBracket(ids);

      // Find a semi-final match
      const semi = main.matches.find((m) => m.position === 2);
      expect(semi).toBeDefined();
      expect(semi!.participant1Id).toBeDefined();

      const updated = advanceWinner(main, semi!.id, semi!.participant1Id!);

      // Winner should be in final
      const final = updated.matches.find((m) => m.position === 1);
      expect(final!.participant1Id).toBe(semi!.participant1Id);
    });
  });

  describe('populateThirdPlaceMatch', () => {
    it('populates losers from semi-finals', () => {
      const ids = ['a', 'b', 'c', 'd'];
      let { main } = generateBracket(ids, { hasConsolation: false, thirdPlaceMatch: true });

      // Simulate semi-final results
      const semi1 = main.matches.find((m) => m.position === 2)!;
      const semi2 = main.matches.find((m) => m.position === 3)!;

      main = advanceWinner(main, semi1.id, semi1.participant1Id!);
      main = advanceWinner(main, semi2.id, semi2.participant1Id!);

      main = populateThirdPlaceMatch(main);

      const thirdPlace = main.matches.find((m) => m.position === -1);
      expect(thirdPlace).toBeDefined();
      // Losers should be the participant2 of each semi
      expect(thirdPlace!.participant1Id).toBe(semi1.participant2Id);
      expect(thirdPlace!.participant2Id).toBe(semi2.participant2Id);
    });
  });

  describe('utility functions', () => {
    it('getTotalRounds calculates correctly', () => {
      expect(getTotalRounds(2)).toBe(1);
      expect(getTotalRounds(4)).toBe(2);
      expect(getTotalRounds(8)).toBe(3);
      expect(getTotalRounds(5)).toBe(3); // rounds up
      expect(getTotalRounds(16)).toBe(4);
    });

    it('getRoundLabel returns correct labels', () => {
      expect(getRoundLabel(1, 4)).toBe('決勝');
      expect(getRoundLabel(2, 4)).toBe('準決勝');
      expect(getRoundLabel(3, 4)).toBe('準々決勝');
      expect(getRoundLabel(4, 4)).toBe('1回戦');
    });

    it('getMatchesByRound filters correctly', () => {
      const ids = Array.from({ length: 8 }, (_, i) => `p${i + 1}`);
      const { main } = generateBracket(ids);

      // 8 players: totalRounds=3, roundNum: 1=final, 2=semis, 3=first round
      const firstRound = getMatchesByRound(main, 3); // quarters/first round
      expect(firstRound).toHaveLength(4);

      const semis = getMatchesByRound(main, 2);
      expect(semis).toHaveLength(2);

      const final = getMatchesByRound(main, 1);
      expect(final).toHaveLength(1);
    });
  });
});
