import { describe, it, expect } from 'vitest';
import { generateRound } from '../../src/lib/swiss-pairing';
import { calculateStandings } from '../../src/lib/standings-calculator';
import { determineMatchWinner } from '../../src/lib/score-calculator';
import { validateImport } from '../../src/lib/import-validator';
import { swapBetweenGroups, generateGroups, generateRoundRobinSchedule } from '../../src/lib/group-generator';
import type { Tournament, Match, Participant, Round } from '../../src/types';

function makeTournament(
  participantCount: number,
  overrides: Partial<Tournament> = {}
): Tournament {
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
    tiebreakCriteria: ['wins', 'set_diff', 'game_diff', 'head_to_head'],
    participants,
    rounds: [],
    status: 'in_progress',
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

// Bug 2: Import validator should accept totalRounds=0 for non-swiss formats
describe('Bug fix: import validator accepts totalRounds=0', () => {
  it('accepts single_elimination with totalRounds=0', () => {
    const result = validateImport([{
      id: 'se-1',
      name: 'SE Tournament',
      type: 'singles',
      format: 'single_elimination',
      totalRounds: 0,
      participants: [],
      rounds: [],
    }]);
    expect(result.valid).toBe(true);
    expect(result.tournaments).toHaveLength(1);
  });

  it('accepts round_robin_knockout with totalRounds=0', () => {
    const result = validateImport([{
      id: 'rrk-1',
      name: 'RRK Tournament',
      type: 'singles',
      format: 'round_robin_knockout',
      totalRounds: 0,
      participants: [],
      rounds: [],
    }]);
    expect(result.valid).toBe(true);
  });

  it('still rejects negative totalRounds', () => {
    const result = validateImport([{
      id: 't-1',
      name: 'Bad',
      type: 'singles',
      totalRounds: -1,
      participants: [],
      rounds: [],
    }]);
    expect(result.valid).toBe(false);
  });
});

// Bug 3: generateRound should exclude absent participants
describe('Bug fix: absent participants excluded from pairing', () => {
  it('excludes absent participants from round generation', () => {
    const t = makeTournament(6);
    // Mark player 6 as absent
    t.participants[5] = { ...t.participants[5], absent: true };

    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const { round } = generateRound(t, standings);

    // 5 active = 2 matches + 1 bye
    expect(round.matches.length).toBe(3);
    const allIds = round.matches.flatMap((m) =>
      [m.participant1Id, m.participant2Id].filter(Boolean)
    );
    expect(allIds).not.toContain('p6');
  });

  it('handles all absent except 1 - returns warning', () => {
    const t = makeTournament(4);
    t.participants[1] = { ...t.participants[1], absent: true };
    t.participants[2] = { ...t.participants[2], absent: true };
    t.participants[3] = { ...t.participants[3], absent: true };

    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const { round, warnings } = generateRound(t, standings);

    expect(round.matches.length).toBe(0);
    expect(warnings.some((w) => w.type === 'few_participants')).toBe(true);
  });
});

// Bug 4: Standings set winner should use same logic as score-calculator
describe('Bug fix: standings set winner consistency', () => {
  it('does not count incomplete sets as set wins', () => {
    // A set of 4-2 should NOT be counted as a set win (gamesPerSet=6)
    const t = makeTournament(2);
    t.rounds = [{
      number: 1,
      isComplete: true,
      matches: [{
        id: 'm1',
        roundNumber: 1,
        participant1Id: 'p1',
        participant2Id: 'p2',
        sets: [{ games1: 4, games2: 2 }], // Incomplete set
        subMatches: [],
        winner: 1, // Manually set winner
        isBye: false,
      }],
    }];

    const standings = calculateStandings(t);
    const p1 = standings.find((s) => s.participantId === 'p1')!;
    // The set is incomplete (4 < 6 gamesPerSet), so setWins should be 0
    expect(p1.setWins).toBe(0);
  });

  it('correctly counts completed sets', () => {
    const t = makeTournament(2);
    t.rounds = [{
      number: 1,
      isComplete: true,
      matches: [{
        id: 'm1',
        roundNumber: 1,
        participant1Id: 'p1',
        participant2Id: 'p2',
        sets: [{ games1: 6, games2: 3 }],
        subMatches: [],
        winner: 1,
        isBye: false,
      }],
    }];

    const standings = calculateStandings(t);
    const p1 = standings.find((s) => s.participantId === 'p1')!;
    expect(p1.setWins).toBe(1);
    expect(p1.gameWins).toBe(6);
    expect(p1.gameLosses).toBe(3);
  });
});

// Bug 5: Team match winner should be determined early when majority clinched
describe('Bug fix: team match early majority determination', () => {
  it('determines winner when majority clinched with incomplete sub-matches', () => {
    const t = makeTournament(2, {
      type: 'team',
      teamMatchConfig: {
        subMatchSlots: [
          { label: 'S1', type: 'singles' },
          { label: 'S2', type: 'singles' },
          { label: 'D1', type: 'doubles' },
        ],
        pointsPerSubMatch: { S1: 1, S2: 1, D1: 1 },
      },
    });

    const match: Match = {
      id: 'm1',
      roundNumber: 1,
      participant1Id: 'p1',
      participant2Id: 'p2',
      sets: [],
      subMatches: [
        { id: 's1', slotLabel: 'S1', type: 'singles', participant1Members: [], participant2Members: [], sets: [], winner: 1 },
        { id: 's2', slotLabel: 'S2', type: 'singles', participant1Members: [], participant2Members: [], sets: [] },
        { id: 'd1', slotLabel: 'D1', type: 'doubles', participant1Members: [], participant2Members: [], sets: [], winner: 1 },
      ],
      isBye: false,
    };

    // P1 won S1 and D1 (2 out of 3 points) — majority clinched
    const winner = determineMatchWinner(match, t);
    expect(winner).toBe(1);
  });

  it('returns undefined when no majority yet', () => {
    const t = makeTournament(2, {
      type: 'team',
      teamMatchConfig: {
        subMatchSlots: [
          { label: 'S1', type: 'singles' },
          { label: 'S2', type: 'singles' },
          { label: 'D1', type: 'doubles' },
        ],
        pointsPerSubMatch: { S1: 1, S2: 1, D1: 1 },
      },
    });

    const match: Match = {
      id: 'm1',
      roundNumber: 1,
      participant1Id: 'p1',
      participant2Id: 'p2',
      sets: [],
      subMatches: [
        { id: 's1', slotLabel: 'S1', type: 'singles', participant1Members: [], participant2Members: [], sets: [], winner: 1 },
        { id: 's2', slotLabel: 'S2', type: 'singles', participant1Members: [], participant2Members: [], sets: [] },
        { id: 'd1', slotLabel: 'D1', type: 'doubles', participant1Members: [], participant2Members: [], sets: [] },
      ],
      isBye: false,
    };

    // Only S1 completed, 1 point vs 0, but 2 remaining — not clinched
    const winner = determineMatchWinner(match, t);
    expect(winner).toBeUndefined();
  });
});

// Bug 6: Group swap should also update round-robin match participant IDs
describe('Bug fix: group swap updates round-robin matches', () => {
  it('swaps participant IDs in round-robin matches', () => {
    const ids = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];
    const groups = generateGroups(ids, 4);

    const baseTournament: Tournament = {
      id: 'test', name: 'Test', type: 'singles', format: 'round_robin_knockout',
      totalRounds: 0, setsPerMatch: 1, gamesPerSet: 6, useTiebreakGame: true,
      tiebreakCriteria: ['wins'], participants: [], rounds: [], status: 'setup',
      createdAt: '',
    };

    // Generate round-robin schedules
    const groupsWithSchedule = groups.map((g) => ({
      ...g,
      roundRobinRounds: generateRoundRobinSchedule(g.participantIds, baseTournament),
    }));

    const pid1 = groupsWithSchedule[0].participantIds[0];
    const pid2 = groupsWithSchedule[1].participantIds[0];

    const swapped = swapBetweenGroups(groupsWithSchedule, pid1, pid2);

    // Check that round-robin matches now reference swapped IDs
    const group0Matches = swapped[0].roundRobinRounds.flatMap((r) => r.matches);
    const group0MatchIds = group0Matches.flatMap((m) =>
      [m.participant1Id, m.participant2Id].filter(Boolean)
    );

    // pid1 should no longer be in group 0 matches (replaced by pid2)
    expect(group0MatchIds).not.toContain(pid1);
    expect(group0MatchIds).toContain(pid2);

    // pid2 should no longer be in group 1 matches (replaced by pid1)
    const group1Matches = swapped[1].roundRobinRounds.flatMap((r) => r.matches);
    const group1MatchIds = group1Matches.flatMap((m) =>
      [m.participant1Id, m.participant2Id].filter(Boolean)
    );
    expect(group1MatchIds).not.toContain(pid2);
    expect(group1MatchIds).toContain(pid1);
  });
});

// Fixed pairs feature
describe('Fixed pairs in round generation', () => {
  it('creates specified fixed pairs and auto-pairs the rest', () => {
    const t = makeTournament(8);
    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const fixedPairs: [string, string][] = [['p1', 'p5'], ['p3', 'p7']];

    const { round } = generateRound(t, standings, fixedPairs);

    expect(round.matches.length).toBe(4);

    // Fixed pairs should be present
    const matchPairs = round.matches.map((m) => [m.participant1Id, m.participant2Id].sort());
    expect(matchPairs.some(([a, b]) => a === 'p1' && b === 'p5')).toBe(true);
    expect(matchPairs.some(([a, b]) => a === 'p3' && b === 'p7')).toBe(true);

    // All 8 participants should be paired
    const allIds = round.matches.flatMap((m) => [m.participant1Id, m.participant2Id].filter(Boolean));
    expect(new Set(allIds).size).toBe(8);
  });

  it('fixed pairs appear first in match list', () => {
    const t = makeTournament(6);
    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const fixedPairs: [string, string][] = [['p2', 'p4']];

    const { round } = generateRound(t, standings, fixedPairs);

    // First match should be the fixed pair
    const m0 = round.matches[0];
    const pair = [m0.participant1Id, m0.participant2Id].sort();
    expect(pair).toEqual(['p2', 'p4']);
  });

  it('warns when fixed pair is a rematch', () => {
    const t = makeTournament(4);
    // Create a past round where p1 played p2
    t.rounds.push({
      number: 1,
      isComplete: true,
      matches: [{
        id: 'prev1', roundNumber: 1, participant1Id: 'p1', participant2Id: 'p2',
        sets: [{ games1: 6, games2: 3 }], subMatches: [], winner: 1, isBye: false,
      }, {
        id: 'prev2', roundNumber: 1, participant1Id: 'p3', participant2Id: 'p4',
        sets: [{ games1: 6, games2: 4 }], subMatches: [], winner: 1, isBye: false,
      }],
    });

    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const { round, warnings } = generateRound(t, standings, [['p1', 'p2']]);

    // Fixed pair should still be created despite rematch
    const m0 = round.matches[0];
    const pair = [m0.participant1Id, m0.participant2Id].sort();
    expect(pair).toEqual(['p1', 'p2']);
    expect(warnings.some((w) => w.type === 'rematch')).toBe(true);
  });

  it('handles fixed pair with odd total participants (bye assigned to remaining)', () => {
    const t = makeTournament(5);
    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const fixedPairs: [string, string][] = [['p1', 'p3']];

    const { round } = generateRound(t, standings, fixedPairs);

    // 1 fixed + 1 auto + 1 bye = 3 matches
    expect(round.matches.length).toBe(3);
    const byeMatch = round.matches.find((m) => m.isBye);
    expect(byeMatch).toBeDefined();
    expect(byeMatch!.participant1Id).not.toBe('p1');
    expect(byeMatch!.participant1Id).not.toBe('p3');
  });

  it('skips invalid fixed pair (participant not active)', () => {
    const t = makeTournament(4);
    t.participants[3] = { ...t.participants[3], withdrawn: true };

    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    // p4 is withdrawn — fixed pair should be skipped
    const { round } = generateRound(t, standings, [['p1', 'p4']]);

    // All 3 active participants are paired (1 match + 1 bye)
    expect(round.matches.length).toBe(2);
    const allIds = round.matches.flatMap((m) => [m.participant1Id, m.participant2Id].filter(Boolean));
    expect(allIds).not.toContain('p4');
  });

  it('handles all participants fixed into pairs', () => {
    const t = makeTournament(4);
    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const fixedPairs: [string, string][] = [['p1', 'p2'], ['p3', 'p4']];

    const { round } = generateRound(t, standings, fixedPairs);

    expect(round.matches.length).toBe(2);
    const pairs = round.matches.map((m) => [m.participant1Id, m.participant2Id].sort());
    expect(pairs).toContainEqual(['p1', 'p2']);
    expect(pairs).toContainEqual(['p3', 'p4']);
  });

  it('prevents duplicate participant in multiple fixed pairs', () => {
    const t = makeTournament(6);
    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    // p1 appears in two pairs — second should be skipped
    const fixedPairs: [string, string][] = [['p1', 'p2'], ['p1', 'p3']];

    const { round } = generateRound(t, standings, fixedPairs);

    expect(round.matches.length).toBe(3);
    // p1 should only appear once
    const p1Matches = round.matches.filter(
      (m) => m.participant1Id === 'p1' || m.participant2Id === 'p1'
    );
    expect(p1Matches.length).toBe(1);
  });
});

// Stress test: swiss pairing with many edge cases
describe('Stress test: swiss pairing edge cases', () => {
  it('handles mix of withdrawn and absent participants', () => {
    const t = makeTournament(10);
    t.participants[0] = { ...t.participants[0], withdrawn: true };
    t.participants[1] = { ...t.participants[1], absent: true };
    t.participants[2] = { ...t.participants[2], withdrawn: true };

    const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
    const { round } = generateRound(t, standings);

    // 7 active = 3 matches + 1 bye
    expect(round.matches.length).toBe(4);
    const allIds = round.matches.flatMap((m) =>
      [m.participant1Id, m.participant2Id].filter(Boolean)
    );
    expect(allIds).not.toContain('p1'); // withdrawn
    expect(allIds).not.toContain('p2'); // absent
    expect(allIds).not.toContain('p3'); // withdrawn
  });

  it('handles 64 participants over 6 rounds', () => {
    const t = makeTournament(64);

    for (let r = 0; r < 6; r++) {
      const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
      const { round } = generateRound(t, standings);

      expect(round.matches.length).toBe(32);
      expect(round.matches.every((m) => !m.isBye)).toBe(true);

      for (const m of round.matches) m.winner = 1;
      round.isComplete = true;
      t.rounds.push(round);
    }
  });

  it('handles 3 participants across many rounds with forced rematches', () => {
    const t = makeTournament(3, { totalRounds: 10 });

    for (let r = 0; r < 6; r++) {
      const standings = t.participants.map((p) => ({ participantId: p.id, wins: 0 }));
      const { round } = generateRound(t, standings);

      expect(round.matches.length).toBe(2); // 1 match + 1 bye
      for (const m of round.matches) m.winner = 1;
      round.isComplete = true;
      t.rounds.push(round);
    }
  });
});
