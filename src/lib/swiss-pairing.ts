import { v4 as uuidv4 } from 'uuid';
import type { Match, Round, Tournament, SubMatch } from '../types/index.ts';

export interface PairingInput {
  participantId: string;
  wins: number;
}

interface PastMatch {
  participant1Id: string;
  participant2Id: string;
  roundNumber: number;
}

export interface PairingWarning {
  type: 'rematch' | 'few_participants' | 'all_had_bye';
  message: string;
}

export function generateRound(
  tournament: Tournament,
  standings: PairingInput[],
  fixedPairs: [string, string][] = []
): { round: Round; warnings: PairingWarning[] } {
  const warnings: PairingWarning[] = [];
  const roundNumber = tournament.rounds.length + 1;
  const pastMatches = getPastMatches(tournament);
  const byeHistory = getByeHistory(tournament);

  // Exclude withdrawn and absent participants
  const excludedIds = new Set(
    tournament.participants.filter((p) => p.withdrawn || p.absent).map((p) => p.id)
  );

  const sorted = [...standings]
    .filter((s) => !excludedIds.has(s.participantId))
    .sort((a, b) => b.wins - a.wins);
  let participants = sorted.map((s) => s.participantId);

  if (participants.length < 2) {
    return {
      round: { number: roundNumber, matches: [], isComplete: false },
      warnings: [{ type: 'few_participants', message: '有効な参加者が2名未満のためペアリングできません' }],
    };
  }

  if (participants.length <= 3) {
    warnings.push({ type: 'few_participants', message: `参加者が${participants.length}名のため、再戦が発生する可能性があります` });
  }

  // Validate and separate fixed pairs
  const fixedMatches: Match[] = [];
  const fixedIds = new Set<string>();
  for (const [fp1, fp2] of fixedPairs) {
    if (!participants.includes(fp1) || !participants.includes(fp2)) continue;
    if (fixedIds.has(fp1) || fixedIds.has(fp2)) continue;
    fixedIds.add(fp1);
    fixedIds.add(fp2);
    fixedMatches.push(createMatch(roundNumber, fp1, fp2, tournament));
    if (havePlayed(fp1, fp2, pastMatches)) {
      warnings.push({ type: 'rematch', message: `固定対戦: 再戦が含まれています` });
    }
  }

  // Remove fixed participants from auto-pairing pool
  participants = participants.filter((pid) => !fixedIds.has(pid));

  let byeParticipantId: string | null = null;

  // Handle odd number: assign bye to lowest-ranked participant without bye
  if (participants.length % 2 === 1) {
    for (let i = participants.length - 1; i >= 0; i--) {
      if (!byeHistory.has(participants[i])) {
        byeParticipantId = participants[i];
        participants = [...participants.slice(0, i), ...participants.slice(i + 1)];
        break;
      }
    }
    // If all have had byes, give to lowest
    if (byeParticipantId === null) {
      byeParticipantId = participants[participants.length - 1];
      participants = participants.slice(0, -1);
      warnings.push({ type: 'all_had_bye', message: '全員がBye経験済みのため、最下位にByeを再付与しました' });
    }
  }

  // Pair remaining participants using backtracking
  const { pairs, hadRematches } = pairWithBacktrackingResult(participants, sorted, pastMatches);

  if (hadRematches) {
    warnings.push({ type: 'rematch', message: '全組み合わせが再戦のため、間隔の最も空いたペアリングを選択しました' });
  }

  const autoMatches: Match[] = pairs.map(([p1, p2]) => createMatch(roundNumber, p1, p2, tournament));

  // Combine: fixed pairs first, then auto-paired
  const matches: Match[] = [...fixedMatches, ...autoMatches];

  // Add bye match
  if (byeParticipantId !== null) {
    matches.push(createByeMatch(roundNumber, byeParticipantId));
  }

  return {
    round: {
      number: roundNumber,
      matches,
      isComplete: false,
    },
    warnings,
  };
}

function getPastMatches(tournament: Tournament): PastMatch[] {
  const matches: PastMatch[] = [];
  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (!match.isBye && match.participant2Id) {
        matches.push({
          participant1Id: match.participant1Id,
          participant2Id: match.participant2Id,
          roundNumber: round.number,
        });
      }
    }
  }
  return matches;
}

function getByeHistory(tournament: Tournament): Set<string> {
  const byes = new Set<string>();
  for (const round of tournament.rounds) {
    for (const match of round.matches) {
      if (match.isBye) {
        byes.add(match.participant1Id);
      }
    }
  }
  return byes;
}

function havePlayed(p1: string, p2: string, pastMatches: PastMatch[]): boolean {
  return pastMatches.some(
    (m) =>
      (m.participant1Id === p1 && m.participant2Id === p2) ||
      (m.participant1Id === p2 && m.participant2Id === p1)
  );
}

function lastPlayedRound(p1: string, p2: string, pastMatches: PastMatch[]): number {
  let latest = 0;
  for (const m of pastMatches) {
    if (
      (m.participant1Id === p1 && m.participant2Id === p2) ||
      (m.participant1Id === p2 && m.participant2Id === p1)
    ) {
      latest = Math.max(latest, m.roundNumber);
    }
  }
  return latest;
}

function pairWithBacktrackingResult(
  participants: string[],
  _standings: PairingInput[],
  pastMatches: PastMatch[]
): { pairs: [string, string][]; hadRematches: boolean } {
  const n = participants.length;
  if (n === 0) return { pairs: [], hadRematches: false };

  // Try pairing avoiding rematches first
  const result = tryPair(participants, pastMatches, true);
  if (result) return { pairs: result, hadRematches: false };

  // Fallback: allow rematches, prefer longest interval
  return { pairs: pairWithMinRematches(participants, pastMatches), hadRematches: true };
}

function tryPair(
  remaining: string[],
  pastMatches: PastMatch[],
  avoidRematches: boolean
): [string, string][] | null {
  if (remaining.length === 0) return [];
  if (remaining.length === 2) {
    if (!avoidRematches || !havePlayed(remaining[0], remaining[1], pastMatches)) {
      return [[remaining[0], remaining[1]]];
    }
    return null;
  }

  const first = remaining[0];
  const rest = remaining.slice(1);

  for (let i = 0; i < rest.length; i++) {
    const opponent = rest[i];
    if (avoidRematches && havePlayed(first, opponent, pastMatches)) continue;

    const newRemaining = [...rest.slice(0, i), ...rest.slice(i + 1)];
    const subResult = tryPair(newRemaining, pastMatches, avoidRematches);
    if (subResult) {
      return [[first, opponent], ...subResult];
    }
  }

  return null;
}

function pairWithMinRematches(
  participants: string[],
  pastMatches: PastMatch[]
): [string, string][] {
  // Greedy: pair first with opponent having max interval since last meeting
  const result: [string, string][] = [];
  const remaining = [...participants];

  while (remaining.length >= 2) {
    const first = remaining.shift()!;
    let bestIdx = 0;
    let bestScore = -Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const played = havePlayed(first, remaining[i], pastMatches);
      const interval = played ? -lastPlayedRound(first, remaining[i], pastMatches) : Infinity;
      if (interval > bestScore) {
        bestScore = interval;
        bestIdx = i;
      }
    }

    result.push([first, remaining[bestIdx]]);
    remaining.splice(bestIdx, 1);
  }

  return result;
}

function createMatch(roundNumber: number, p1: string, p2: string, tournament: Tournament): Match {
  const subMatches: SubMatch[] = [];
  if (tournament.type === 'team' && tournament.teamMatchConfig) {
    for (const slot of tournament.teamMatchConfig.subMatchSlots) {
      subMatches.push({
        id: uuidv4(),
        slotLabel: slot.label,
        type: slot.type,
        participant1Members: [],
        participant2Members: [],
        sets: [],
      });
    }
  }

  return {
    id: uuidv4(),
    roundNumber,
    participant1Id: p1,
    participant2Id: p2,
    sets: [],
    subMatches,
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
