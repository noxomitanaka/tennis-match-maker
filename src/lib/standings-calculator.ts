import type { Tournament, StandingEntry, TiebreakCriterion } from '@/types';
import { determineSetWinner } from './score-calculator';

export function calculateStandings(tournament: Tournament): StandingEntry[] {
  const entries = new Map<string, StandingEntry>();

  // Initialize all participants
  for (const p of tournament.participants) {
    entries.set(p.id, {
      participantId: p.id,
      rank: 0,
      wins: 0,
      losses: 0,
      setWins: 0,
      setLosses: 0,
      gameWins: 0,
      gameLosses: 0,
      teamPoints: 0,
      headToHead: {},
    });
  }

  // Process all rounds
  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      const e1 = entries.get(match.participant1Id);
      if (!e1) continue;

      if (match.isBye) {
        e1.wins++;
        continue;
      }

      if (!match.participant2Id) continue;
      const e2 = entries.get(match.participant2Id);
      if (!e2) continue;

      // Match result
      if (match.winner === 1) {
        e1.wins++;
        e2.losses++;
        e1.headToHead[match.participant2Id] = (e1.headToHead[match.participant2Id] || 0) + 1;
      } else if (match.winner === 2) {
        e2.wins++;
        e1.losses++;
        e2.headToHead[match.participant1Id] = (e2.headToHead[match.participant1Id] || 0) + 1;
      }

      // Set and game stats (for non-team matches)
      if (tournament.type !== 'team') {
        for (const set of match.sets) {
          const setWinner = determineSetWinner(set, tournament.gamesPerSet, tournament.useTiebreakGame);
          if (setWinner === 1) { e1.setWins++; e2.setLosses++; }
          else if (setWinner === 2) { e2.setWins++; e1.setLosses++; }

          e1.gameWins += set.games1;
          e1.gameLosses += set.games2;
          e2.gameWins += set.games2;
          e2.gameLosses += set.games1;
        }
      } else {
        // Team: count sub-match results and game stats
        for (const sub of match.subMatches) {
          const pts = tournament.teamMatchConfig?.pointsPerSubMatch[sub.slotLabel] ?? 1;
          if (sub.winner === 1) e1.teamPoints += pts;
          if (sub.winner === 2) e2.teamPoints += pts;

          for (const set of sub.sets) {
            if (set.games1 > set.games2) {
              e1.setWins++;
              e2.setLosses++;
            } else if (set.games2 > set.games1) {
              e2.setWins++;
              e1.setLosses++;
            }
            e1.gameWins += set.games1;
            e1.gameLosses += set.games2;
            e2.gameWins += set.games2;
            e2.gameLosses += set.games1;
          }
        }
      }
    }
  }

  // Sort by tiebreak criteria
  const arr = Array.from(entries.values());
  const criteria = tournament.tiebreakCriteria;

  arr.sort((a, b) => {
    for (const criterion of criteria) {
      const diff = compareByCriterion(a, b, criterion);
      if (diff !== 0) return diff;
    }
    return 0;
  });

  // Assign ranks
  for (let i = 0; i < arr.length; i++) {
    if (i === 0) {
      arr[i].rank = 1;
    } else {
      const same = criteria.every((c) => compareByCriterion(arr[i], arr[i - 1], c) === 0);
      arr[i].rank = same ? arr[i - 1].rank : i + 1;
    }
  }

  return arr;
}

function compareByCriterion(a: StandingEntry, b: StandingEntry, criterion: TiebreakCriterion): number {
  switch (criterion) {
    case 'wins':
      return b.wins - a.wins;
    case 'set_diff':
      return (b.setWins - b.setLosses) - (a.setWins - a.setLosses);
    case 'game_diff':
      return (b.gameWins - b.gameLosses) - (a.gameWins - a.gameLosses);
    case 'head_to_head':
      // h2h: if a has beaten b more than b has beaten a
      const aBeatsB = a.headToHead[b.participantId] || 0;
      const bBeatsA = b.headToHead[a.participantId] || 0;
      return bBeatsA - aBeatsB; // reversed: more wins = higher
    case 'team_points':
      return b.teamPoints - a.teamPoints;
    default:
      return 0;
  }
}

export function getWinsForParticipant(tournament: Tournament, participantId: string): number {
  let wins = 0;
  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (match.participant1Id === participantId && match.winner === 1) wins++;
      if (match.participant2Id === participantId && match.winner === 2) wins++;
    }
  }
  return wins;
}
