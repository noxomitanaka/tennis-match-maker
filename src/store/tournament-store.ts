import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';
import * as api from '@/lib/api';
import type {
  Tournament, Participant, Round, Match, SubMatch,
  TournamentType, TournamentFormat, TiebreakCriterion, TeamMatchConfig,
  SingleEliminationConfig, RoundRobinKnockoutConfig,
  GroupDef, KnockoutBracket,
} from '@/types';

interface TournamentStore {
  tournaments: Tournament[];
  loading: boolean;
  loadTournaments: () => Promise<void>;
  clearAll: () => void;
  createTournament: (data: {
    name: string;
    type: TournamentType;
    format: TournamentFormat;
    formatConfig?: SingleEliminationConfig | RoundRobinKnockoutConfig;
    maxParticipants?: number;
    totalRounds: number;
    setsPerMatch: number;
    gamesPerSet: number;
    useTiebreakGame: boolean;
    teamMatchConfig?: TeamMatchConfig;
    tiebreakCriteria: TiebreakCriterion[];
  }) => string;
  deleteTournament: (id: string) => void;
  getTournament: (id: string) => Tournament | undefined;
  addParticipant: (tournamentId: string, participant: Participant) => void;
  removeParticipant: (tournamentId: string, participantId: string) => void;
  withdrawParticipant: (tournamentId: string, participantId: string) => void;
  reinstateParticipant: (tournamentId: string, participantId: string) => void;
  addRound: (tournamentId: string, round: Round) => void;
  updateMatch: (tournamentId: string, roundNumber: number, matchId: string, updates: Partial<Match>) => void;
  updateSubMatch: (tournamentId: string, roundNumber: number, matchId: string, subMatchId: string, updates: Partial<SubMatch>) => void;
  swapParticipants: (tournamentId: string, roundNumber: number, match1Id: string, match1Side: 1 | 2, match2Id: string, match2Side: 1 | 2) => void;
  completeRound: (tournamentId: string, roundNumber: number) => void;
  updateTournamentStatus: (tournamentId: string, status: Tournament['status']) => void;
  importTournaments: (tournaments: Tournament[]) => void;
  // Group actions
  updateTournament: (id: string, updates: Partial<Tournament>) => void;
  setGroups: (id: string, groups: GroupDef[]) => void;
  updateGroupRounds: (id: string, groupId: string, rounds: Round[]) => void;
  updateGroupMatch: (id: string, groupId: string, roundNumber: number, matchId: string, updates: Partial<Match>) => void;
  // Bracket actions
  setBracket: (id: string, bracket: KnockoutBracket, consolation?: KnockoutBracket) => void;
  updateBracket: (id: string, bracket: KnockoutBracket) => void;
  updateConsolationBracket: (id: string, bracket: KnockoutBracket) => void;
  // Absence actions
  markAbsent: (id: string, participantId: string) => void;
  markPresent: (id: string, participantId: string) => void;
}

const updateTournamentById = (
  tournaments: Tournament[],
  id: string,
  updater: (t: Tournament) => Tournament
): Tournament[] => tournaments.map((t) => (t.id === id ? updater(t) : t));

// Debounced save: tracks pending saves per tournament
const saveTimers = new Map<string, ReturnType<typeof setTimeout>>();

function debouncedSave(tournament: Tournament) {
  const existing = saveTimers.get(tournament.id);
  if (existing) clearTimeout(existing);
  saveTimers.set(
    tournament.id,
    setTimeout(() => {
      saveTimers.delete(tournament.id);
      api.saveTournamentApi(tournament).catch((err) => {
        console.error(`Failed to save tournament ${tournament.id}:`, err);
      });
    }, 500)
  );
}

function syncAfterUpdate(get: () => TournamentStore, tournamentId: string) {
  const t = get().tournaments.find((t) => t.id === tournamentId);
  if (t) debouncedSave(t);
}

export const useTournamentStore = create<TournamentStore>()(
  (set, get) => ({
    tournaments: [],
    loading: false,

    loadTournaments: async () => {
      set({ loading: true });
      try {
        const tournaments = await api.fetchTournaments();
        set({ tournaments, loading: false });
      } catch (err) {
        console.error('Failed to load tournaments:', err);
        set({ loading: false });
      }
    },

    clearAll: () => {
      saveTimers.forEach((timer) => clearTimeout(timer));
      saveTimers.clear();
      set({ tournaments: [] });
    },

    createTournament: (data) => {
      const id = uuidv4();
      const tournament: Tournament = {
        id,
        ...data,
        participants: [],
        rounds: [],
        status: 'setup',
        createdAt: new Date().toISOString(),
      };
      set((state) => ({ tournaments: [...state.tournaments, tournament] }));
      api.createTournamentApi(tournament).catch((err) => {
        console.error('Failed to create tournament:', err);
      });
      return id;
    },

    deleteTournament: (id) => {
      const timer = saveTimers.get(id);
      if (timer) { clearTimeout(timer); saveTimers.delete(id); }
      set((state) => ({ tournaments: state.tournaments.filter((t) => t.id !== id) }));
      api.deleteTournamentApi(id).catch((err) => {
        console.error('Failed to delete tournament:', err);
      });
    },

    getTournament: (id) => {
      return get().tournaments.find((t) => t.id === id);
    },

    addParticipant: (tournamentId, participant) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, tournamentId, (t) => ({
          ...t,
          participants: [...t.participants, participant],
        })),
      }));
      syncAfterUpdate(get, tournamentId);
    },

    removeParticipant: (tournamentId, participantId) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, tournamentId, (t) => ({
          ...t,
          participants: t.participants.filter((p) => p.id !== participantId),
        })),
      }));
      syncAfterUpdate(get, tournamentId);
    },

    withdrawParticipant: (tournamentId, participantId) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, tournamentId, (t) => ({
          ...t,
          participants: t.participants.map((p) =>
            p.id === participantId ? { ...p, withdrawn: true } : p
          ),
        })),
      }));
      syncAfterUpdate(get, tournamentId);
    },

    reinstateParticipant: (tournamentId, participantId) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, tournamentId, (t) => ({
          ...t,
          participants: t.participants.map((p) =>
            p.id === participantId ? { ...p, withdrawn: false } : p
          ),
        })),
      }));
      syncAfterUpdate(get, tournamentId);
    },

    addRound: (tournamentId, round) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, tournamentId, (t) => ({
          ...t,
          rounds: [...t.rounds, round],
          status: 'in_progress' as const,
        })),
      }));
      syncAfterUpdate(get, tournamentId);
    },

    updateMatch: (tournamentId, roundNumber, matchId, updates) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, tournamentId, (t) => ({
          ...t,
          rounds: t.rounds.map((r) =>
            r.number === roundNumber
              ? { ...r, matches: r.matches.map((m) => (m.id === matchId ? { ...m, ...updates } : m)) }
              : r
          ),
        })),
      }));
      syncAfterUpdate(get, tournamentId);
    },

    updateSubMatch: (tournamentId, roundNumber, matchId, subMatchId, updates) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, tournamentId, (t) => ({
          ...t,
          rounds: t.rounds.map((r) =>
            r.number === roundNumber
              ? {
                  ...r,
                  matches: r.matches.map((m) =>
                    m.id === matchId
                      ? {
                          ...m,
                          subMatches: m.subMatches.map((sm) =>
                            sm.id === subMatchId ? { ...sm, ...updates } : sm
                          ),
                        }
                      : m
                  ),
                }
              : r
          ),
        })),
      }));
      syncAfterUpdate(get, tournamentId);
    },

    swapParticipants: (tournamentId, roundNumber, match1Id, match1Side, match2Id, match2Side) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, tournamentId, (t) => ({
          ...t,
          rounds: t.rounds.map((r) => {
            if (r.number !== roundNumber) return r;

            const getParticipantId = (match: Match, side: 1 | 2) =>
              side === 1 ? match.participant1Id : match.participant2Id;

            const origM1 = r.matches.find((m) => m.id === match1Id);
            const origM2 = r.matches.find((m) => m.id === match2Id);
            if (!origM1 || !origM2) return r;

            const id1 = getParticipantId(origM1, match1Side);
            const id2 = getParticipantId(origM2, match2Side);

            const applySwap = (match: Match): Match => {
              if (match.id !== match1Id && match.id !== match2Id) return match;
              let updated = { ...match };
              if (match.id === match1Id) {
                updated = match1Side === 1
                  ? { ...updated, participant1Id: id2! }
                  : { ...updated, participant2Id: id2 };
              }
              if (match.id === match2Id) {
                updated = match2Side === 1
                  ? { ...updated, participant1Id: id1! }
                  : { ...updated, participant2Id: id1 };
              }
              const isBye = updated.participant2Id === null;
              if (isBye) {
                updated = { ...updated, isBye: true, winner: 1, sets: [], subMatches: [] };
              } else {
                updated = { ...updated, isBye: false };
              }
              return updated;
            };

            return { ...r, matches: r.matches.map(applySwap) };
          }),
        })),
      }));
      syncAfterUpdate(get, tournamentId);
    },

    completeRound: (tournamentId, roundNumber) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, tournamentId, (t) => ({
          ...t,
          rounds: t.rounds.map((r) => (r.number === roundNumber ? { ...r, isComplete: true } : r)),
          status: t.rounds.length >= t.totalRounds && roundNumber === t.totalRounds ? 'completed' as const : t.status,
        })),
      }));
      syncAfterUpdate(get, tournamentId);
    },

    updateTournamentStatus: (tournamentId, status) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, tournamentId, (t) => ({ ...t, status })),
      }));
      syncAfterUpdate(get, tournamentId);
    },

    importTournaments: (tournaments) => {
      set((state) => {
        const existingIds = new Set(state.tournaments.map((t) => t.id));
        const newTournaments = tournaments.map((t) => {
          if (existingIds.has(t.id)) {
            return { ...t, id: uuidv4() };
          }
          return t;
        });
        for (const t of newTournaments) {
          api.createTournamentApi(t).catch((err) => {
            console.error('Failed to import tournament:', err);
          });
        }
        return { tournaments: [...state.tournaments, ...newTournaments] };
      });
    },

    // Group actions
    updateTournament: (id, updates) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, id, (t) => ({ ...t, ...updates })),
      }));
      syncAfterUpdate(get, id);
    },

    setGroups: (id, groups) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, id, (t) => ({
          ...t,
          groups,
          phase: 'group_stage' as const,
          status: 'in_progress' as const,
        })),
      }));
      syncAfterUpdate(get, id);
    },

    updateGroupRounds: (id, groupId, rounds) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, id, (t) => ({
          ...t,
          groups: t.groups?.map((g) => (g.id === groupId ? { ...g, roundRobinRounds: rounds } : g)),
        })),
      }));
      syncAfterUpdate(get, id);
    },

    updateGroupMatch: (id, groupId, roundNumber, matchId, updates) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, id, (t) => ({
          ...t,
          groups: t.groups?.map((g) =>
            g.id === groupId
              ? {
                  ...g,
                  roundRobinRounds: g.roundRobinRounds.map((r) =>
                    r.number === roundNumber
                      ? { ...r, matches: r.matches.map((m) => (m.id === matchId ? { ...m, ...updates } : m)) }
                      : r
                  ),
                }
              : g
          ),
        })),
      }));
      syncAfterUpdate(get, id);
    },

    // Bracket actions
    setBracket: (id, bracket, consolation) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, id, (t) => ({
          ...t,
          bracket,
          consolationBracket: consolation,
          phase: 'knockout' as const,
        })),
      }));
      syncAfterUpdate(get, id);
    },

    updateBracket: (id, bracket) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, id, (t) => ({ ...t, bracket })),
      }));
      syncAfterUpdate(get, id);
    },

    updateConsolationBracket: (id, bracket) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, id, (t) => ({ ...t, consolationBracket: bracket })),
      }));
      syncAfterUpdate(get, id);
    },

    // Absence actions
    markAbsent: (id, participantId) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, id, (t) => ({
          ...t,
          participants: t.participants.map((p) =>
            p.id === participantId ? { ...p, absent: true } : p
          ),
        })),
      }));
      syncAfterUpdate(get, id);
    },

    markPresent: (id, participantId) => {
      set((state) => ({
        tournaments: updateTournamentById(state.tournaments, id, (t) => ({
          ...t,
          participants: t.participants.map((p) =>
            p.id === participantId ? { ...p, absent: false } : p
          ),
        })),
      }));
      syncAfterUpdate(get, id);
    },
  })
);
