import { useMemo } from 'react';
import { BracketMatchCard } from './BracketMatch';
import { getRoundLabel } from '@/lib/knockout-bracket';
import type { KnockoutBracket, Tournament } from '@/types';

interface Props {
  bracket: KnockoutBracket;
  tournament: Tournament;
  onSelectMatch?: (matchId: string) => void;
  title?: string;
}

export function BracketView({ bracket, tournament, onSelectMatch, title }: Props) {
  const { roundColumns, totalRounds, thirdPlaceMatch } = useMemo(() => {
    const mainMatches = bracket.matches.filter((m) => m.position > 0);
    if (mainMatches.length === 0) return { roundColumns: [], totalRounds: 0, thirdPlaceMatch: undefined };

    const maxRound = Math.max(...mainMatches.map((m) => m.roundNum));
    const columns: typeof bracket.matches[] = [];

    // Build columns from first round (highest roundNum) to final (roundNum=1)
    for (let r = maxRound; r >= 1; r--) {
      const roundMatches = mainMatches
        .filter((m) => m.roundNum === r)
        .sort((a, b) => a.position - b.position);
      columns.push(roundMatches);
    }

    const thirdPlace = bracket.matches.find((m) => m.position === -1);

    return { roundColumns: columns, totalRounds: maxRound, thirdPlaceMatch: thirdPlace };
  }, [bracket]);

  if (bracket.matches.length === 0) {
    return <p className="text-sm text-muted-foreground">ブラケットが生成されていません</p>;
  }

  return (
    <div className="space-y-4">
      {title && <h3 className="font-medium">{title}</h3>}
      <div className="overflow-x-auto">
        <div className="flex gap-6 min-w-max pb-4">
          {roundColumns.map((matches, colIdx) => {
            const roundNum = totalRounds - colIdx;
            return (
              <div key={colIdx} className="flex flex-col">
                <div className="text-xs font-medium text-muted-foreground mb-2 text-center">
                  {getRoundLabel(roundNum, totalRounds)}
                </div>
                <div className="flex flex-col justify-around flex-1 gap-2">
                  {matches.map((m) => (
                    <div key={m.id} className="flex items-center">
                      <BracketMatchCard
                        bracketMatch={m}
                        tournament={tournament}
                        onSelectMatch={onSelectMatch}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {thirdPlaceMatch && (
        <div className="border-t pt-4">
          <div className="text-xs font-medium text-muted-foreground mb-2">3位決定戦</div>
          <BracketMatchCard
            bracketMatch={thirdPlaceMatch}
            tournament={tournament}
            onSelectMatch={onSelectMatch}
          />
        </div>
      )}
    </div>
  );
}
