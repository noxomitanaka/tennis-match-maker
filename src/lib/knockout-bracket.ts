import { v4 as uuidv4 } from 'uuid';
import type { KnockoutBracket, BracketMatch, Tournament, SingleEliminationConfig } from '@/types';

/**
 * Generate a single-elimination bracket.
 * Participants are placed in seed order. Byes fill to nearest power of 2.
 * Position numbering: 1 = final, children of N are 2N (top) and 2N+1 (bottom).
 */
export function generateBracket(
  participantIds: string[],
  config?: SingleEliminationConfig
): { main: KnockoutBracket; consolation?: KnockoutBracket } {
  const n = participantIds.length;
  if (n < 2) {
    return { main: { type: 'main', matches: [] } };
  }

  const bracketSize = nextPowerOf2(n);
  const totalRounds = Math.log2(bracketSize);
  const byeCount = bracketSize - n;

  // Place seeds into bracket positions (first round leaves)
  // Standard tennis seeding: 1 vs bracketSize, 2 vs bracketSize-1, etc.
  const seeds = placeSeedsInBracket(participantIds, bracketSize);

  const matches: BracketMatch[] = [];

  // Generate all bracket positions
  // Position 1 = final, position 2,3 = semis, etc.
  // First round positions: bracketSize/2 to bracketSize-1
  const firstRoundStart = bracketSize / 2;

  for (let pos = 1; pos < bracketSize; pos++) {
    const depth = Math.floor(Math.log2(pos)); // 0=root, 1=semis, 2=quarters...
    const roundNum = depth + 1; // 1=final, 2=semis, 3=quarters...
    const isFirstRound = pos >= firstRoundStart;

    const bm: BracketMatch = {
      id: uuidv4(),
      position: pos,
      roundNum,
      isBye: false,
    };

    if (isFirstRound) {
      const leftIdx = (pos - firstRoundStart) * 2;
      const rightIdx = leftIdx + 1;
      bm.participant1Id = seeds[leftIdx] || undefined;
      bm.participant2Id = seeds[rightIdx] || undefined;

      // Handle bye
      if (bm.participant1Id && !bm.participant2Id) {
        bm.isBye = true;
        bm.winnerId = bm.participant1Id;
      } else if (!bm.participant1Id && bm.participant2Id) {
        bm.isBye = true;
        bm.winnerId = bm.participant2Id;
      }
    }

    matches.push(bm);
  }

  // Add 3rd place match if configured
  if (config?.thirdPlaceMatch && totalRounds >= 2) {
    matches.push({
      id: uuidv4(),
      position: -1, // Special position for 3rd place match
      roundNum: 1,   // Same round as final
      isBye: false,
    });
  }

  // Propagate byes through bracket
  propagateByes(matches);

  const main: KnockoutBracket = { type: 'main', matches };

  // Generate consolation bracket if requested
  let consolation: KnockoutBracket | undefined;
  if (config?.hasConsolation && totalRounds >= 2) {
    consolation = generateConsolationBracket(matches, totalRounds);
  }

  return { main, consolation };
}

/**
 * Advance a winner through the bracket.
 * Returns the updated bracket.
 */
export function advanceWinner(
  bracket: KnockoutBracket,
  matchId: string,
  winnerId: string
): KnockoutBracket {
  const matches = bracket.matches.map((m) => ({ ...m }));
  const match = matches.find((m) => m.id === matchId);
  if (!match) return bracket;

  match.winnerId = winnerId;

  // Find parent match (position / 2, rounded down)
  if (match.position > 1) {
    const parentPos = Math.floor(match.position / 2);
    const parent = matches.find((m) => m.position === parentPos);
    if (parent) {
      const isLeft = match.position % 2 === 0;
      if (isLeft) {
        parent.participant1Id = winnerId;
      } else {
        parent.participant2Id = winnerId;
      }
    }
  }

  return { ...bracket, matches };
}

/**
 * Populate the 3rd place match with the two semi-final losers.
 */
export function populateThirdPlaceMatch(
  bracket: KnockoutBracket
): KnockoutBracket {
  const matches = bracket.matches.map((m) => ({ ...m }));
  const thirdPlace = matches.find((m) => m.position === -1);
  if (!thirdPlace) return bracket;

  // Semi-finals are positions 2 and 3
  const semi1 = matches.find((m) => m.position === 2);
  const semi2 = matches.find((m) => m.position === 3);

  if (semi1?.winnerId && semi1.participant1Id && semi1.participant2Id) {
    thirdPlace.participant1Id = semi1.winnerId === semi1.participant1Id
      ? semi1.participant2Id
      : semi1.participant1Id;
  }

  if (semi2?.winnerId && semi2.participant1Id && semi2.participant2Id) {
    thirdPlace.participant2Id = semi2.winnerId === semi2.participant1Id
      ? semi2.participant2Id
      : semi2.participant1Id;
  }

  return { ...bracket, matches };
}

/**
 * Get the next match position for a winner of the given match.
 */
export function getNextMatchPosition(position: number): number | null {
  if (position <= 1) return null;
  return Math.floor(position / 2);
}

/**
 * Get total rounds for a bracket with n participants.
 */
export function getTotalRounds(n: number): number {
  return Math.ceil(Math.log2(n));
}

/**
 * Get matches for a specific round number.
 */
export function getMatchesByRound(bracket: KnockoutBracket, roundNum: number): BracketMatch[] {
  return bracket.matches.filter((m) => m.roundNum === roundNum && m.position > 0);
}

/**
 * Get round label.
 */
export function getRoundLabel(roundNum: number, totalRounds: number): string {
  if (roundNum === 1) return '決勝';
  if (roundNum === 2) return '準決勝';
  if (roundNum === 3) return '準々決勝';
  return `${totalRounds - roundNum + 1}回戦`;
}

// --- Internal helpers ---

function nextPowerOf2(n: number): number {
  let p = 1;
  while (p < n) p *= 2;
  return p;
}

/**
 * Standard seeding placement for a bracket of given size.
 * Seeds 1,2,3,4... placed so that seed 1 meets seed 2 only in the final.
 * Top seeds get byes when bracket is not full.
 */
function placeSeedsInBracket(participantIds: string[], bracketSize: number): (string | null)[] {
  const slots: (string | null)[] = new Array(bracketSize).fill(null);

  // Generate standard bracket positions for seeds
  // positions[i] = slot index for the (i+1)th seed
  const positions = generateSeedPositions(bracketSize);

  for (let i = 0; i < participantIds.length; i++) {
    slots[positions[i]] = participantIds[i];
  }

  return slots;
}

/**
 * Generate standard seeding positions.
 * Returns an array where positions[i] = slot index for the (i+1)th seed.
 * For bracketSize=8: seed1→slot0, seed2→slot7, seed3→slot3, seed4→slot4,
 *                    seed5→slot1, seed6→slot6, seed7→slot2, seed8→slot5
 * Ensures: 1v8, 4v5, 2v7, 3v6 pairings in first round.
 */
function generateSeedPositions(bracketSize: number): number[] {
  // Use the standard bracket seeding algorithm:
  // The bracket has bracketSize/2 first-round matchups.
  // Matchup i pairs seed (i) with seed (bracketSize - 1 - i) (0-indexed)
  // But we need to arrange these so that 1v2 only happens in the final.
  //
  // Standard approach: recursively build the bracket ordering
  // For n=2: [1, 2]
  // For n=4: [1, 4, 2, 3]  (1v4, 2v3, and 1-side vs 2-side in final)
  // For n=8: [1, 8, 4, 5, 2, 7, 3, 6]

  const order = buildBracketOrder(bracketSize);
  // order[slotIndex] = seedNumber (1-based)
  // We need positions[seedIndex] = slotIndex (0-based)
  const positions: number[] = new Array(bracketSize);
  for (let slot = 0; slot < bracketSize; slot++) {
    positions[order[slot] - 1] = slot;
  }
  return positions;
}

/**
 * Build bracket ordering: returns array where result[slotIndex] = seedNumber (1-based).
 * E.g., for n=8: [1, 8, 4, 5, 2, 7, 3, 6]
 * meaning slot 0 = seed 1, slot 1 = seed 8, slot 2 = seed 4, etc.
 */
function buildBracketOrder(n: number): number[] {
  if (n === 1) return [1];
  if (n === 2) return [1, 2];

  const half = buildBracketOrder(n / 2);
  const result: number[] = [];

  for (const seed of half) {
    result.push(seed);
    result.push(n + 1 - seed);
  }

  return result;
}

function propagateByes(matches: BracketMatch[]): void {
  // Sort by position descending (process first round first)
  const sorted = [...matches].filter((m) => m.position > 0).sort((a, b) => b.position - a.position);

  for (const match of sorted) {
    if (!match.winnerId) continue;
    if (match.position <= 1) continue;

    const parentPos = Math.floor(match.position / 2);
    const parent = matches.find((m) => m.position === parentPos);
    if (!parent) continue;

    const isLeft = match.position % 2 === 0;
    if (isLeft) {
      parent.participant1Id = match.winnerId;
    } else {
      parent.participant2Id = match.winnerId;
    }

    // If both children are byes, parent is also a bye
    const siblingPos = isLeft ? match.position + 1 : match.position - 1;
    const sibling = matches.find((m) => m.position === siblingPos);
    if (sibling?.isBye && sibling.winnerId) {
      // Both sides determined by bye - auto-advance higher seed
      // Don't auto-decide non-bye matches
    }
  }
}

function generateConsolationBracket(
  mainMatches: BracketMatch[],
  _totalRounds: number
): KnockoutBracket {
  // Consolation: first-round losers play a separate mini-bracket
  // First round has the highest roundNum
  const maxRoundNum = Math.max(...mainMatches.filter((m) => m.position > 0).map((m) => m.roundNum));
  const firstRoundMatches = mainMatches
    .filter((m) => m.position > 0)
    .sort((a, b) => b.position - a.position)
    .filter((m) => m.roundNum === maxRoundNum && !m.isBye);

  // Collect losers from first round (once matches are played)
  const consolationMatches: BracketMatch[] = [];
  const loserCount = firstRoundMatches.length;
  if (loserCount < 2) return { type: 'consolation', matches: [] };

  const consolationSize = nextPowerOf2(loserCount);
  const consolationRounds = Math.log2(consolationSize);
  const consolationFirstRoundStart = consolationSize / 2;

  for (let pos = 1; pos < consolationSize; pos++) {
    consolationMatches.push({
      id: uuidv4(),
      position: pos,
      roundNum: Math.floor(Math.log2(pos)) + 1,
      isBye: false,
    });
  }

  return { type: 'consolation', matches: consolationMatches };
}
