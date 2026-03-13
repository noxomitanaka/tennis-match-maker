import { useParams, Link } from 'react-router-dom';
import { useTournamentStore } from '@/store/tournament-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { getParticipantName } from '@/lib/participant-utils';
import { RESULT_REASON_LABELS } from '@/types';
import { SwapDialog } from '@/components/round/SwapDialog';
import { useState } from 'react';

export function RoundDetailPage() {
  const { id, num } = useParams<{ id: string; num: string }>();
  const tournament = useTournamentStore((s) => s.tournaments.find((t) => t.id === id));
  const completeRound = useTournamentStore((s) => s.completeRound);
  const [showSwap, setShowSwap] = useState(false);

  if (!tournament || !num) {
    return <div className="max-w-2xl mx-auto p-4 text-center text-muted-foreground">ラウンドが見つかりません</div>;
  }

  const roundNumber = parseInt(num);
  if (isNaN(roundNumber)) {
    return <div className="max-w-2xl mx-auto p-4 text-center text-muted-foreground">無効なラウンド番号です</div>;
  }

  const round = tournament.rounds.find((r) => r.number === roundNumber);
  if (!round) {
    return <div className="max-w-2xl mx-auto p-4 text-center text-muted-foreground">ラウンドが見つかりません</div>;
  }

  const allMatchesComplete = round.matches.every((m) => m.winner !== undefined);
  const incompleteCount = round.matches.filter((m) => m.winner === undefined).length;
  const canComplete = allMatchesComplete && !round.isComplete;

  const handleCompleteRound = () => {
    if (!allMatchesComplete) return;
    if (confirm('このラウンドを確定しますか？確定後は対戦入替できません。')) {
      completeRound(tournament.id, roundNumber);
    }
  };

  return (
    <div className="max-w-2xl mx-auto p-4">
      <div className="flex items-center gap-2 mb-1">
        <Link to={`/tournament/${tournament.id}`} className="text-muted-foreground text-sm hover:underline">
          ← {tournament.name}
        </Link>
      </div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold">ラウンド {roundNumber}</h1>
          {round.isComplete && <Badge variant="outline">完了</Badge>}
        </div>
        <div className="flex gap-2">
          {!round.isComplete && (
            <Button variant="outline" size="sm" onClick={() => setShowSwap(true)}>
              対戦入替
            </Button>
          )}
          {canComplete && (
            <Button size="sm" onClick={handleCompleteRound}>
              ラウンド確定
            </Button>
          )}
        </div>
      </div>

      {/* Progress indicator */}
      {!round.isComplete && (
        <div className="mb-4 text-sm text-muted-foreground">
          {incompleteCount > 0
            ? `${incompleteCount}試合が未完了です。全試合のスコアを入力してください。`
            : '全試合完了。ラウンドを確定できます。'}
        </div>
      )}

      <div className="space-y-2">
        {round.matches.map((match) => (
          <Card key={match.id} className={match.winner === undefined && !match.isBye ? 'border-yellow-300' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`font-medium ${match.winner === 1 ? 'text-primary' : ''}`}>
                      {getParticipantName(tournament, match.participant1Id)}
                    </span>
                    <span className="text-muted-foreground">vs</span>
                    {match.isBye ? (
                      <Badge variant="secondary">Bye</Badge>
                    ) : (
                      <span className={`font-medium ${match.winner === 2 ? 'text-primary' : ''}`}>
                        {match.participant2Id ? getParticipantName(tournament, match.participant2Id) : ''}
                      </span>
                    )}
                    {match.resultReason && match.resultReason !== 'normal' && (
                      <Badge variant="secondary" className="text-xs">
                        {RESULT_REASON_LABELS[match.resultReason]}
                      </Badge>
                    )}
                  </div>
                  {!match.isBye && match.sets.length > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {match.sets.map((s, i) => (
                        <span key={i} className="mr-2">
                          {s.games1}-{s.games2}
                          {s.tiebreak1 !== undefined && s.tiebreak2 !== undefined && `(${s.tiebreak1}-${s.tiebreak2})`}
                        </span>
                      ))}
                    </div>
                  )}
                  {match.subMatches.length > 0 && (
                    <div className="text-sm text-muted-foreground mt-1">
                      {match.subMatches.map((sm) => (
                        <span key={sm.id} className="mr-3">
                          {sm.slotLabel}: {sm.winner ? (
                            <>
                              P{sm.winner}
                              {sm.resultReason && sm.resultReason !== 'normal' && (
                                <span className="text-xs ml-1">({RESULT_REASON_LABELS[sm.resultReason]})</span>
                              )}
                            </>
                          ) : (
                            <span className="text-yellow-600">未完</span>
                          )}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {!match.isBye && (
                  <Link to={`/tournament/${tournament.id}/match/${match.id}?round=${roundNumber}`}>
                    <Button variant="outline" size="sm">
                      {match.winner ? 'スコア' : 'スコア入力'}
                    </Button>
                  </Link>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {showSwap && (
        <SwapDialog
          tournament={tournament}
          round={round}
          onClose={() => setShowSwap(false)}
        />
      )}
    </div>
  );
}
