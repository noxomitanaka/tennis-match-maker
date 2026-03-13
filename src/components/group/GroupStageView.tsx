import { useState } from 'react';
import { useTournamentStore } from '@/store/tournament-store';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getParticipantName } from '@/lib/participant-utils';
import { calculateStandings } from '@/lib/standings-calculator';
import { swapBetweenGroups } from '@/lib/group-generator';
import type { Tournament, GroupDef, Match } from '@/types';
import { GroupMatchScoreDialog } from './GroupMatchScoreDialog';

interface Props {
  tournament: Tournament;
}

export function GroupStageView({ tournament }: Props) {
  const updateGroupMatch = useTournamentStore((s) => s.updateGroupMatch);
  const setGroups = useTournamentStore((s) => s.setGroups);
  const updateGroupRounds = useTournamentStore((s) => s.updateGroupRounds);

  const [selectedMatch, setSelectedMatch] = useState<{ groupId: string; match: Match } | null>(null);
  const [swapMode, setSwapMode] = useState(false);
  const [swapFirst, setSwapFirst] = useState<string | null>(null);

  if (!tournament.groups) return null;

  const handleParticipantClick = (pid: string) => {
    if (!swapMode) return;
    if (!swapFirst) {
      setSwapFirst(pid);
    } else if (swapFirst !== pid) {
      // Perform swap
      const newGroups = swapBetweenGroups(tournament.groups!, swapFirst, pid);
      setGroups(tournament.id, newGroups);
      setSwapFirst(null);
      setSwapMode(false);
    }
  };

  const handleMatchClick = (groupId: string, match: Match) => {
    if (match.isBye || match.winner) return;
    setSelectedMatch({ groupId, match });
  };

  const handleScoreSubmit = (groupId: string, matchId: string, updates: Partial<Match>) => {
    const group = tournament.groups?.find((g) => g.id === groupId);
    if (!group) return;

    const match = group.roundRobinRounds.flatMap((r) => r.matches).find((m) => m.id === matchId);
    if (!match) return;

    const roundNumber = match.roundNumber;
    updateGroupMatch(tournament.id, groupId, roundNumber, matchId, updates);

    // Check if round is complete after update
    const round = group.roundRobinRounds.find((r) => r.number === roundNumber);
    if (round) {
      const allDone = round.matches.every((m) => {
        if (m.id === matchId) return updates.winner !== undefined;
        return m.winner !== undefined;
      });
      if (allDone) {
        const updatedRounds = group.roundRobinRounds.map((r) =>
          r.number === roundNumber ? { ...r, isComplete: true } : r
        );
        updateGroupRounds(tournament.id, groupId, updatedRounds);
      }
    }

    setSelectedMatch(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <Button
          variant={swapMode ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => { setSwapMode(!swapMode); setSwapFirst(null); }}
        >
          {swapMode ? 'スワップ中止' : '参加者入替'}
        </Button>
        {swapMode && swapFirst && (
          <span className="text-sm text-muted-foreground self-center">
            {getParticipantName(tournament, swapFirst)} を選択中 — 入替先を選んでください
          </span>
        )}
      </div>

      {tournament.groups.map((group) => (
        <GroupCard
          key={group.id}
          group={group}
          tournament={tournament}
          swapMode={swapMode}
          swapFirst={swapFirst}
          onParticipantClick={handleParticipantClick}
          onMatchClick={handleMatchClick}
        />
      ))}

      {selectedMatch && (
        <GroupMatchScoreDialog
          match={selectedMatch.match}
          tournament={tournament}
          onSubmit={(matchId, updates) => handleScoreSubmit(selectedMatch.groupId, matchId, updates)}
          onClose={() => setSelectedMatch(null)}
        />
      )}
    </div>
  );
}

interface GroupCardProps {
  group: GroupDef;
  tournament: Tournament;
  swapMode: boolean;
  swapFirst: string | null;
  onParticipantClick: (pid: string) => void;
  onMatchClick: (groupId: string, match: Match) => void;
}

function GroupCard({ group, tournament, swapMode, swapFirst, onParticipantClick, onMatchClick }: GroupCardProps) {
  // Calculate group standings
  const groupTournament: Tournament = {
    ...tournament,
    participants: tournament.participants.filter((p) => group.participantIds.includes(p.id)),
    rounds: group.roundRobinRounds,
  };
  const standings = calculateStandings(groupTournament);

  const allComplete = group.roundRobinRounds.every((r) => r.isComplete);

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2">
          <CardTitle className="text-base">{group.name}</CardTitle>
          {allComplete ? (
            <Badge variant="outline">完了</Badge>
          ) : (
            <Badge variant="secondary">進行中</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Standings table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground text-xs border-b">
                <th className="py-1 pr-2">#</th>
                <th className="py-1 pr-2">名前</th>
                <th className="py-1 pr-2 text-center">勝</th>
                <th className="py-1 pr-2 text-center">負</th>
                <th className="py-1 text-center">得失差</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((s, i) => (
                <tr
                  key={s.participantId}
                  className={`border-b last:border-0 ${
                    swapMode ? 'cursor-pointer hover:bg-muted' : ''
                  } ${swapFirst === s.participantId ? 'bg-primary/10' : ''}`}
                  onClick={() => swapMode && onParticipantClick(s.participantId)}
                >
                  <td className="py-1 pr-2 text-muted-foreground">{i + 1}</td>
                  <td className="py-1 pr-2">{getParticipantName(tournament, s.participantId)}</td>
                  <td className="py-1 pr-2 text-center">{s.wins}</td>
                  <td className="py-1 pr-2 text-center">{s.losses}</td>
                  <td className="py-1 text-center">{s.gameWins - s.gameLosses > 0 ? '+' : ''}{s.gameWins - s.gameLosses}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Match list */}
        <div className="space-y-1">
          {group.roundRobinRounds.map((round) => (
            <div key={round.number}>
              <div className="text-xs text-muted-foreground mt-2 mb-1">ラウンド {round.number}</div>
              {round.matches.map((match) => (
                <div
                  key={match.id}
                  className={`flex items-center justify-between text-sm py-1 px-2 rounded ${
                    !match.isBye && !match.winner ? 'cursor-pointer hover:bg-muted' : ''
                  } ${match.winner ? 'text-muted-foreground' : ''}`}
                  onClick={() => onMatchClick(group.id, match)}
                >
                  <span>
                    {getParticipantName(tournament, match.participant1Id)}
                    {match.isBye ? ' (BYE)' : ` vs ${getParticipantName(tournament, match.participant2Id!)}`}
                  </span>
                  {match.winner && !match.isBye && (
                    <Badge variant="outline" className="text-xs">
                      {match.winner === 1
                        ? getParticipantName(tournament, match.participant1Id)
                        : getParticipantName(tournament, match.participant2Id!)}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
