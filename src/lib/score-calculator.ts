import type { Match, SetScore, Tournament, SubMatch } from '../types/index.ts';

export function determineSetWinner(set: SetScore, gamesPerSet: number, useTiebreak: boolean): 1 | 2 | null {
  if (set.games1 > set.games2) {
    if (set.games1 >= gamesPerSet) return 1;
  }
  if (set.games2 > set.games1) {
    if (set.games2 >= gamesPerSet) return 2;
  }
  // Tiebreak case
  if (useTiebreak && set.games1 === gamesPerSet && set.games2 === gamesPerSet) {
    if (set.tiebreak1 !== undefined && set.tiebreak2 !== undefined) {
      if (set.tiebreak1 > set.tiebreak2) return 1;
      if (set.tiebreak2 > set.tiebreak1) return 2;
    }
  }
  return null;
}

export function determineMatchWinner(match: Match, tournament: Tournament): 1 | 2 | undefined {
  if (match.isBye) return 1;

  if (tournament.type === 'team' && tournament.teamMatchConfig) {
    return determineTeamMatchWinner(match, tournament);
  }

  const setsToWin = Math.ceil(tournament.setsPerMatch / 2);
  let sets1 = 0;
  let sets2 = 0;

  for (const set of match.sets) {
    const winner = determineSetWinner(set, tournament.gamesPerSet, tournament.useTiebreakGame);
    if (winner === 1) sets1++;
    if (winner === 2) sets2++;
  }

  if (sets1 >= setsToWin) return 1;
  if (sets2 >= setsToWin) return 2;
  return undefined;
}

function determineTeamMatchWinner(match: Match, tournament: Tournament): 1 | 2 | undefined {
  if (!tournament.teamMatchConfig) return undefined;

  let points1 = 0;
  let points2 = 0;

  for (const sub of match.subMatches) {
    if (!sub.winner) continue;
    const pts = tournament.teamMatchConfig.pointsPerSubMatch[sub.slotLabel] ?? 1;
    if (sub.winner === 1) points1 += pts;
    if (sub.winner === 2) points2 += pts;
  }

  const totalPoints = Object.values(tournament.teamMatchConfig.pointsPerSubMatch).reduce((a, b) => a + b, 0);

  // Check if one side has a majority (clinched regardless of remaining matches)
  if (points1 > totalPoints / 2) return 1;
  if (points2 > totalPoints / 2) return 2;

  const completedAll = match.subMatches.every((sm) => sm.winner !== undefined);
  if (completedAll) {
    if (points1 > points2) return 1;
    if (points2 > points1) return 2;
  }

  return undefined;
}

export function determineSubMatchWinner(subMatch: SubMatch, setsPerMatch: number, gamesPerSet: number, useTiebreak: boolean): 1 | 2 | undefined {
  const setsToWin = Math.ceil(setsPerMatch / 2);
  let sets1 = 0;
  let sets2 = 0;

  for (const set of subMatch.sets) {
    const winner = determineSetWinner(set, gamesPerSet, useTiebreak);
    if (winner === 1) sets1++;
    if (winner === 2) sets2++;
  }

  if (sets1 >= setsToWin) return 1;
  if (sets2 >= setsToWin) return 2;
  return undefined;
}
