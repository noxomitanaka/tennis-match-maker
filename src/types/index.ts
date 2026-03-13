export type TournamentType = 'singles' | 'doubles' | 'team';
export type TournamentStatus = 'setup' | 'in_progress' | 'completed';
export type TiebreakCriterion = 'wins' | 'set_diff' | 'game_diff' | 'head_to_head' | 'team_points' | 'buchholz';

// 大会形式
export type TournamentFormat = 'swiss' | 'single_elimination' | 'round_robin_knockout';

export interface SingleEliminationConfig {
  hasConsolation: boolean;
  thirdPlaceMatch: boolean;
}

export interface RoundRobinKnockoutConfig {
  groupSize: number;
  advancingPerGroup: number;
  hasConsolation: boolean;
  thirdPlaceMatch: boolean;
}

export interface GroupDef {
  id: string;
  name: string;
  participantIds: string[];
  roundRobinRounds: Round[];
  standings?: StandingEntry[];
}

export interface KnockoutBracket {
  type: 'main' | 'consolation';
  matches: BracketMatch[];
}

export interface BracketMatch {
  id: string;
  position: number;       // 二分木番号: 1=root(決勝), 子は 2N, 2N+1
  roundNum: number;       // 1=決勝, 2=準決勝, ...（逆順）
  participant1Id?: string;
  participant2Id?: string;
  match?: Match;
  winnerId?: string;
  isBye?: boolean;
}

export interface TeamMatchConfig {
  subMatchSlots: { label: string; type: 'singles' | 'doubles' }[];
  pointsPerSubMatch: Record<string, number>;
}

export interface IndividualParticipant {
  id: string;
  kind: 'individual';
  name: string;
  withdrawn?: boolean;
  absent?: boolean;
}

export interface PairParticipant {
  id: string;
  kind: 'pair';
  player1: string;
  player2: string;
  name: string;
  withdrawn?: boolean;
  absent?: boolean;
}

export interface TeamMember {
  id: string;
  name: string;
}

export interface TeamParticipant {
  id: string;
  kind: 'team';
  name: string;
  members: TeamMember[];
  withdrawn?: boolean;
  absent?: boolean;
}

export type Participant = IndividualParticipant | PairParticipant | TeamParticipant;

// 棄権・失格等で通常のスコアによらず勝敗が決まった場合
export type MatchResultReason = 'normal' | 'forfeit' | 'disqualification' | 'rain' | 'injury' | 'no_show';

export const RESULT_REASON_LABELS: Record<MatchResultReason, string> = {
  normal: '通常',
  forfeit: '棄権',
  disqualification: '失格',
  rain: '雨天中断',
  injury: '負傷',
  no_show: '不戦勝',
};

export interface SetScore {
  games1: number;
  games2: number;
  tiebreak1?: number;
  tiebreak2?: number;
}

export interface SubMatch {
  id: string;
  slotLabel: string;
  type: 'singles' | 'doubles';
  participant1Members: string[];
  participant2Members: string[];
  sets: SetScore[];
  winner?: 1 | 2;
  resultReason?: MatchResultReason;
}

export interface Match {
  id: string;
  roundNumber: number;
  participant1Id: string;
  participant2Id: string | null; // null = Bye
  sets: SetScore[];
  subMatches: SubMatch[];
  winner?: 1 | 2;
  resultReason?: MatchResultReason;
  isBye: boolean;
}

export interface Round {
  number: number;
  matches: Match[];
  isComplete: boolean;
}

export interface Tournament {
  id: string;
  name: string;
  type: TournamentType;
  format?: TournamentFormat;
  formatConfig?: SingleEliminationConfig | RoundRobinKnockoutConfig;
  maxParticipants?: number;
  totalRounds: number;
  setsPerMatch: number;
  gamesPerSet: number;
  useTiebreakGame: boolean;
  teamMatchConfig?: TeamMatchConfig;
  tiebreakCriteria: TiebreakCriterion[];
  participants: Participant[];
  rounds: Round[];
  status: TournamentStatus;
  createdAt: string;
  // Multi-format fields
  groups?: GroupDef[];
  bracket?: KnockoutBracket;
  consolationBracket?: KnockoutBracket;
  phase?: 'group_stage' | 'knockout' | 'completed';
}

export interface StandingEntry {
  participantId: string;
  rank: number;
  wins: number;
  losses: number;
  setWins: number;
  setLosses: number;
  gameWins: number;
  gameLosses: number;
  teamPoints: number;
  buchholz?: number;
  headToHead: Record<string, number>; // opponentId -> wins against
}
