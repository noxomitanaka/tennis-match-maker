import { useParams, useSearchParams, Link } from 'react-router-dom';
import { useTournamentStore } from '@/store/tournament-store';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { getParticipantName } from '@/lib/participant-utils';
import { ScoreInput } from '@/components/match/ScoreInput';
import { TeamScoreInput } from '@/components/match/TeamScoreInput';

export function MatchScorePage() {
  const { id, mid } = useParams<{ id: string; mid: string }>();
  const [searchParams] = useSearchParams();
  const roundNumber = parseInt(searchParams.get('round') || '1');
  const tournament = useTournamentStore((s) => s.tournaments.find((t) => t.id === id));

  if (!tournament) {
    return <div className="max-w-2xl mx-auto p-4 text-center text-muted-foreground">大会が見つかりません</div>;
  }

  const round = tournament.rounds.find((r) => r.number === roundNumber);
  const match = round?.matches.find((m) => m.id === mid);

  if (!round || !match) {
    return <div className="max-w-2xl mx-auto p-4 text-center text-muted-foreground">試合が見つかりません</div>;
  }

  const p1Name = getParticipantName(tournament, match.participant1Id);
  const p2Name = match.participant2Id ? getParticipantName(tournament, match.participant2Id) : 'Bye';

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center gap-2 mb-1">
        <Link to={`/tournament/${tournament.id}/round/${roundNumber}`} className="text-muted-foreground text-sm hover:underline">
          ← ラウンド {roundNumber}
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {p1Name} vs {p2Name}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournament.type === 'team' && tournament.teamMatchConfig ? (
            <TeamScoreInput
              tournament={tournament}
              roundNumber={roundNumber}
              match={match}
            />
          ) : (
            <ScoreInput
              tournament={tournament}
              roundNumber={roundNumber}
              match={match}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
