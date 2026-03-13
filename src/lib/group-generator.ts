import { v4 as uuidv4 } from 'uuid';
import type { GroupDef, Round, Match, Tournament } from '@/types';

/**
 * Generate groups using snake seeding.
 * E.g., for 12 participants and groupSize=4:
 *   Group A: 1, 6, 7, 12
 *   Group B: 2, 5, 8, 11
 *   Group C: 3, 4, 9, 10
 */
export function generateGroups(participantIds: string[], groupSize: number): GroupDef[] {
  const n = participantIds.length;
  const numGroups = Math.ceil(n / groupSize);
  const groupNames = Array.from({ length: numGroups }, (_, i) =>
    `グループ${String.fromCharCode(65 + i)}`
  );

  const groups: GroupDef[] = groupNames.map((name, i) => ({
    id: uuidv4(),
    name,
    participantIds: [],
    roundRobinRounds: [],
  }));

  // Snake seeding
  let direction = 1;
  let groupIdx = 0;

  for (const pid of participantIds) {
    groups[groupIdx].participantIds.push(pid);

    // Move to next group in snake pattern
    const nextIdx = groupIdx + direction;
    if (nextIdx >= numGroups || nextIdx < 0) {
      direction *= -1; // Reverse direction
    } else {
      groupIdx = nextIdx;
    }
  }

  return groups;
}

/**
 * Swap two participants between groups.
 * Also updates participant IDs in round-robin match schedules.
 */
export function swapBetweenGroups(groups: GroupDef[], pid1: string, pid2: string): GroupDef[] {
  const swapId = (pid: string) => {
    if (pid === pid1) return pid2;
    if (pid === pid2) return pid1;
    return pid;
  };

  return groups.map((g) => ({
    ...g,
    participantIds: g.participantIds.map(swapId),
    roundRobinRounds: g.roundRobinRounds.map((round) => ({
      ...round,
      matches: round.matches.map((match) => ({
        ...match,
        participant1Id: swapId(match.participant1Id),
        participant2Id: match.participant2Id ? swapId(match.participant2Id) : null,
      })),
    })),
  }));
}

/**
 * Generate round-robin schedule for a group of participants.
 * Uses circle method for even numbers, dummy player for odd.
 */
export function generateRoundRobinSchedule(
  participantIds: string[],
  tournament: Tournament
): Round[] {
  const ids = [...participantIds];
  const hasBye = ids.length % 2 !== 0;
  if (hasBye) {
    ids.push('__bye__'); // Dummy participant for bye
  }

  const n = ids.length;
  const rounds: Round[] = [];
  const numRounds = n - 1;

  // Circle method: fix first participant, rotate the rest
  const fixed = ids[0];
  const rotating = ids.slice(1);

  for (let r = 0; r < numRounds; r++) {
    const matches: Match[] = [];
    const roundNum = r + 1;

    // First match: fixed vs last in rotating
    const opponent = rotating[rotating.length - 1];
    if (fixed !== '__bye__' && opponent !== '__bye__') {
      matches.push(createMatch(roundNum, fixed, opponent, tournament));
    } else {
      // Bye match
      const realPlayer = fixed === '__bye__' ? opponent : fixed;
      matches.push(createByeMatch(roundNum, realPlayer));
    }

    // Remaining matches: pair from outside in
    for (let i = 0; i < Math.floor((n - 2) / 2); i++) {
      const p1 = rotating[i];
      const p2 = rotating[rotating.length - 2 - i];
      if (p1 !== '__bye__' && p2 !== '__bye__') {
        matches.push(createMatch(roundNum, p1, p2, tournament));
      } else {
        const realPlayer = p1 === '__bye__' ? p2 : p1;
        matches.push(createByeMatch(roundNum, realPlayer));
      }
    }

    rounds.push({ number: roundNum, matches, isComplete: false });

    // Rotate: move last element to first position
    rotating.unshift(rotating.pop()!);
  }

  return rounds;
}

function createMatch(roundNumber: number, p1Id: string, p2Id: string, tournament: Tournament): Match {
  return {
    id: uuidv4(),
    roundNumber,
    participant1Id: p1Id,
    participant2Id: p2Id,
    sets: [],
    subMatches: [],
    isBye: false,
  };
}

function createByeMatch(roundNumber: number, participantId: string): Match {
  return {
    id: uuidv4(),
    roundNumber,
    participant1Id: participantId,
    participant2Id: null,
    sets: [],
    subMatches: [],
    winner: 1,
    isBye: true,
  };
}
