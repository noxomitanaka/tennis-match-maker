import { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useTournamentStore } from '@/store/tournament-store';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ParticipantList } from '@/components/participant/ParticipantList';
import { RoundList } from '@/components/round/RoundList';
import { StandingsTable } from '@/components/standings/StandingsTable';
import { BracketView } from '@/components/bracket/BracketView';
import { BracketScoreDialog } from '@/components/bracket/BracketScoreDialog';
import { GroupStageView } from '@/components/group/GroupStageView';
import { AbsenceDialog } from '@/components/absence/AbsenceDialog';
import { generateBracket, advanceWinner, populateThirdPlaceMatch } from '@/lib/knockout-bracket';
import { generateGroups, generateRoundRobinSchedule } from '@/lib/group-generator';
import { calculateStandings } from '@/lib/standings-calculator';
import type { Tournament, BracketMatch, RoundRobinKnockoutConfig, SingleEliminationConfig } from '@/types';

const statusLabels: Record<string, string> = {
  setup: '準備中',
  in_progress: '進行中',
  completed: '完了',
};

const formatLabels: Record<string, string> = {
  swiss: 'スイスドロー',
  single_elimination: 'トーナメント',
  round_robin_knockout: '予選リーグ→決勝T',
};

// 団体戦・シングルス/ダブルスで表記を切り替える
function unitLabel(type: string): string {
  return type === 'team' ? 'チーム' : '参加者';
}

export function TournamentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const tournament = useTournamentStore((s) => s.tournaments.find((t) => t.id === id));
  const setBracket = useTournamentStore((s) => s.setBracket);
  const updateBracket = useTournamentStore((s) => s.updateBracket);
  const updateTournament = useTournamentStore((s) => s.updateTournament);
  const setGroups = useTournamentStore((s) => s.setGroups);

  const [selectedBracketMatch, setSelectedBracketMatch] = useState<BracketMatch | null>(null);
  const [showAbsenceDialog, setShowAbsenceDialog] = useState(false);

  if (!tournament) {
    return (
      <div className="max-w-2xl mx-auto p-4 text-center">
        <p className="text-muted-foreground mb-4">大会が見つかりません</p>
        <Link to="/"><Button variant="outline">ホームに戻る</Button></Link>
      </div>
    );
  }

  const format = tournament.format || 'swiss';

  const handleGenerateBracket = () => {
    const activeParticipants = tournament.participants.filter((p) => !p.withdrawn && !p.absent);
    if (activeParticipants.length < 2) return;

    const config = tournament.formatConfig as SingleEliminationConfig | undefined;
    const result = generateBracket(
      activeParticipants.map((p) => p.id),
      config
    );

    setBracket(tournament.id, result.main, result.consolation);
  };

  const handleGenerateGroups = () => {
    const activeParticipants = tournament.participants.filter((p) => !p.withdrawn && !p.absent);
    if (activeParticipants.length < 3) return;

    const config = tournament.formatConfig as RoundRobinKnockoutConfig;
    const groups = generateGroups(activeParticipants.map((p) => p.id), config.groupSize);

    // Generate round robin schedules for each group
    const groupsWithSchedule = groups.map((g) => ({
      ...g,
      roundRobinRounds: generateRoundRobinSchedule(g.participantIds, tournament),
    }));

    setGroups(tournament.id, groupsWithSchedule);
  };

  const handleAdvanceToKnockout = () => {
    if (!tournament.groups) return;
    const config = tournament.formatConfig as RoundRobinKnockoutConfig;

    // Calculate standings for each group and pick top N
    const advancingIds: string[] = [];
    for (const group of tournament.groups) {
      // Build a mini-tournament from group rounds to calculate standings
      const groupTournament: Tournament = {
        ...tournament,
        participants: tournament.participants.filter((p) => group.participantIds.includes(p.id)),
        rounds: group.roundRobinRounds,
      };
      const standings = calculateStandings(groupTournament);
      const advancing = standings.slice(0, config.advancingPerGroup);
      advancingIds.push(...advancing.map((s) => s.participantId));
    }

    // Generate knockout bracket from advancing participants
    const seConfig: SingleEliminationConfig = {
      hasConsolation: config.hasConsolation,
      thirdPlaceMatch: config.thirdPlaceMatch,
    };
    const result = generateBracket(advancingIds, seConfig);
    setBracket(tournament.id, result.main, result.consolation);
    updateTournament(tournament.id, { phase: 'knockout' });
  };

  const handleBracketMatchSelect = (matchId: string) => {
    const bracket = tournament.bracket;
    if (!bracket) return;
    const match = bracket.matches.find((m) => m.id === matchId);
    if (match) setSelectedBracketMatch(match);
  };

  const handleBracketScoreSubmit = (matchId: string, winnerId: string, match?: BracketMatch['match']) => {
    if (!tournament.bracket) return;

    // Update the match with score and winner
    let updated = {
      ...tournament.bracket,
      matches: tournament.bracket.matches.map((m) =>
        m.id === matchId ? { ...m, winnerId, match: match || m.match } : m
      ),
    };

    // Advance winner to next round
    updated = advanceWinner(updated, matchId, winnerId);

    // Check if semi-finals are done → populate 3rd place match
    const semis = updated.matches.filter((m) => m.position === 2 || m.position === 3);
    if (semis.every((s) => s.winnerId)) {
      updated = populateThirdPlaceMatch(updated);
    }

    updateBracket(tournament.id, updated);

    // Check if tournament is complete
    const final = updated.matches.find((m) => m.position === 1);
    const thirdPlace = updated.matches.find((m) => m.position === -1);
    const allDone = final?.winnerId && (!thirdPlace || thirdPlace.winnerId);
    if (allDone) {
      updateTournament(tournament.id, {
        status: 'completed',
        phase: 'completed',
      });
    }

    setSelectedBracketMatch(null);
  };

  return (
    <div className="max-w-3xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-1">
        <Link to="/" className="text-muted-foreground text-sm hover:underline">← ホーム</Link>
      </div>
      <div className="flex items-center gap-3 mb-4">
        <h1 className="text-2xl font-bold">{tournament.name}</h1>
        <Badge variant="secondary">{statusLabels[tournament.status]}</Badge>
        <Badge variant="outline">{formatLabels[format]}</Badge>
        {tournament.status === 'in_progress' && (
          <Button variant="outline" size="sm" onClick={() => setShowAbsenceDialog(true)}>
            欠席処理
          </Button>
        )}
        <Link to={`/tournament/${tournament.id}/print`}>
          <Button variant="outline" size="sm">印刷</Button>
        </Link>
      </div>

      {/* Swiss format - original behavior */}
      {format === 'swiss' && (
        <Tabs defaultValue="participants">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="participants">{unitLabel(tournament.type)}</TabsTrigger>
            <TabsTrigger value="rounds">ラウンド</TabsTrigger>
            <TabsTrigger value="standings">順位表</TabsTrigger>
          </TabsList>
          <TabsContent value="participants" className="mt-4">
            <ParticipantList tournament={tournament} />
          </TabsContent>
          <TabsContent value="rounds" className="mt-4">
            <RoundList tournament={tournament} />
          </TabsContent>
          <TabsContent value="standings" className="mt-4">
            <StandingsTable tournament={tournament} />
          </TabsContent>
        </Tabs>
      )}

      {/* Single elimination format */}
      {format === 'single_elimination' && (
        <Tabs defaultValue="participants">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="participants">{unitLabel(tournament.type)}</TabsTrigger>
            <TabsTrigger value="bracket">トーナメント表</TabsTrigger>
          </TabsList>
          <TabsContent value="participants" className="mt-4">
            <ParticipantList tournament={tournament} />
          </TabsContent>
          <TabsContent value="bracket" className="mt-4">
            {!tournament.bracket && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {unitLabel(tournament.type)}を登録後、トーナメント表を生成してください。
                </p>
                <Button
                  onClick={handleGenerateBracket}
                  disabled={tournament.participants.filter((p) => !p.withdrawn && !p.absent).length < 2}
                >
                  トーナメント表を生成
                </Button>
              </div>
            )}
            {tournament.bracket && (
              <BracketView
                bracket={tournament.bracket}
                tournament={tournament}
                onSelectMatch={handleBracketMatchSelect}
              />
            )}
            {tournament.consolationBracket && tournament.consolationBracket.matches.length > 0 && (
              <div className="mt-6">
                <BracketView
                  bracket={tournament.consolationBracket}
                  tournament={tournament}
                  onSelectMatch={handleBracketMatchSelect}
                  title="コンソレーション"
                />
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Round robin + knockout format */}
      {format === 'round_robin_knockout' && (
        <Tabs defaultValue="participants">
          <TabsList className="w-full justify-start">
            <TabsTrigger value="participants">{unitLabel(tournament.type)}</TabsTrigger>
            <TabsTrigger value="groups">グループ</TabsTrigger>
            <TabsTrigger value="bracket">決勝T</TabsTrigger>
          </TabsList>
          <TabsContent value="participants" className="mt-4">
            <ParticipantList tournament={tournament} />
          </TabsContent>
          <TabsContent value="groups" className="mt-4">
            {!tournament.groups && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">
                  {unitLabel(tournament.type)}を登録後、グループを生成してください。
                </p>
                <Button
                  onClick={handleGenerateGroups}
                  disabled={tournament.participants.filter((p) => !p.withdrawn && !p.absent).length < 3}
                >
                  グループを生成
                </Button>
              </div>
            )}
            {tournament.groups && (
              <GroupStageView tournament={tournament} />
            )}
            {tournament.groups && tournament.phase === 'group_stage' && (
              <div className="mt-4">
                <Button
                  onClick={handleAdvanceToKnockout}
                  disabled={!tournament.groups.every((g) =>
                    g.roundRobinRounds.every((r) => r.isComplete)
                  )}
                >
                  決勝トーナメントへ進む
                </Button>
                {!tournament.groups.every((g) => g.roundRobinRounds.every((r) => r.isComplete)) && (
                  <p className="text-xs text-muted-foreground mt-1">
                    全グループの全試合を完了してください
                  </p>
                )}
              </div>
            )}
          </TabsContent>
          <TabsContent value="bracket" className="mt-4">
            {!tournament.bracket && (
              <p className="text-sm text-muted-foreground">
                グループステージ完了後、決勝トーナメントが生成されます。
              </p>
            )}
            {tournament.bracket && (
              <BracketView
                bracket={tournament.bracket}
                tournament={tournament}
                onSelectMatch={handleBracketMatchSelect}
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Bracket score dialog */}
      {selectedBracketMatch && (
        <BracketScoreDialog
          bracketMatch={selectedBracketMatch}
          tournament={tournament}
          onSubmit={handleBracketScoreSubmit}
          onClose={() => setSelectedBracketMatch(null)}
        />
      )}

      {/* Absence dialog */}
      {showAbsenceDialog && (
        <AbsenceDialog
          tournament={tournament}
          onClose={() => setShowAbsenceDialog(false)}
        />
      )}
    </div>
  );
}
