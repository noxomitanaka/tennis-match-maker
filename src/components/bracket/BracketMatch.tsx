import { Badge } from '@/components/ui/badge';
import type { BracketMatch as BracketMatchType, Tournament } from '@/types';
import { getParticipantName } from '@/lib/participant-utils';

interface Props {
  bracketMatch: BracketMatchType;
  tournament: Tournament;
  onSelectMatch?: (matchId: string) => void;
}

export function BracketMatchCard({ bracketMatch, tournament, onSelectMatch }: Props) {
  const p1Name = bracketMatch.participant1Id
    ? getParticipantName(tournament, bracketMatch.participant1Id)
    : 'TBD';
  const p2Name = bracketMatch.participant2Id
    ? getParticipantName(tournament, bracketMatch.participant2Id)
    : 'TBD';

  const isComplete = !!bracketMatch.winnerId;
  const canPlay = !!bracketMatch.participant1Id && !!bracketMatch.participant2Id && !bracketMatch.isBye && !isComplete;

  const matchResult = bracketMatch.match;
  const score1 = matchResult?.sets.map((s) => s.games1).join('-') || '';
  const score2 = matchResult?.sets.map((s) => s.games2).join('-') || '';

  return (
    <div
      className={`border rounded-[var(--radius)] text-sm w-48 ${
        canPlay ? 'cursor-pointer hover:border-primary' : ''
      } ${bracketMatch.isBye ? 'opacity-60' : ''}`}
      onClick={() => canPlay && onSelectMatch?.(bracketMatch.id)}
    >
      <div
        className={`flex items-center justify-between px-2 py-1.5 border-b ${
          bracketMatch.winnerId === bracketMatch.participant1Id ? 'bg-primary/10 font-medium' : ''
        }`}
      >
        <span className="truncate flex-1">{p1Name}</span>
        {score1 && <span className="text-xs text-muted-foreground ml-1">{score1}</span>}
      </div>
      <div
        className={`flex items-center justify-between px-2 py-1.5 ${
          bracketMatch.winnerId === bracketMatch.participant2Id ? 'bg-primary/10 font-medium' : ''
        }`}
      >
        <span className="truncate flex-1">{p2Name}</span>
        {score2 && <span className="text-xs text-muted-foreground ml-1">{score2}</span>}
      </div>
      {bracketMatch.isBye && (
        <div className="text-center text-xs text-muted-foreground py-0.5 border-t">
          BYE
        </div>
      )}
      {isComplete && !bracketMatch.isBye && (
        <div className="text-center py-0.5 border-t">
          <Badge variant="outline" className="text-xs">完了</Badge>
        </div>
      )}
    </div>
  );
}
