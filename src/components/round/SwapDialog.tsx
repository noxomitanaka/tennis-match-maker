import { useState } from 'react';
import { useTournamentStore } from '@/store/tournament-store';
import { Button } from '@/components/ui/button';
import { getParticipantName } from '@/lib/participant-utils';
import type { Tournament, Round } from '@/types';

interface Props {
  tournament: Tournament;
  round: Round;
  onClose: () => void;
}

export function SwapDialog({ tournament, round, onClose }: Props) {
  const swapParticipants = useTournamentStore((s) => s.swapParticipants);
  const [selection, setSelection] = useState<{ matchId: string; side: 1 | 2 } | null>(null);

  const handleSelect = (matchId: string, side: 1 | 2) => {
    if (!selection) {
      setSelection({ matchId, side });
      return;
    }

    if (selection.matchId === matchId && selection.side === side) {
      setSelection(null);
      return;
    }

    swapParticipants(
      tournament.id,
      round.number,
      selection.matchId,
      selection.side,
      matchId,
      side
    );
    setSelection(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-background rounded-lg p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
        <h3 className="text-lg font-semibold mb-2">対戦入替</h3>
        <p className="text-sm text-muted-foreground mb-4">
          入替したい2{tournament.type === 'team' ? 'チーム' : '名'}を順にクリックしてください。
        </p>

        <div className="space-y-2">
          {round.matches.map((match) => (
            <div key={match.id} className="flex items-center gap-2 py-2 border-b border-border">
              <button
                className={`flex-1 text-left px-2 py-1 rounded cursor-pointer ${
                  selection?.matchId === match.id && selection?.side === 1
                    ? 'bg-primary text-primary-foreground'
                    : 'hover:bg-muted'
                }`}
                onClick={() => handleSelect(match.id, 1)}
              >
                {getParticipantName(tournament, match.participant1Id)}
              </button>
              <span className="text-muted-foreground text-sm">vs</span>
              {match.isBye ? (
                <span className="flex-1 text-muted-foreground px-2">Bye</span>
              ) : (
                <button
                  className={`flex-1 text-left px-2 py-1 rounded cursor-pointer ${
                    selection?.matchId === match.id && selection?.side === 2
                      ? 'bg-primary text-primary-foreground'
                      : 'hover:bg-muted'
                  }`}
                  onClick={() => match.participant2Id && handleSelect(match.id, 2)}
                >
                  {match.participant2Id ? getParticipantName(tournament, match.participant2Id) : ''}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="flex justify-end mt-4">
          <Button variant="outline" onClick={onClose}>閉じる</Button>
        </div>
      </div>
    </div>
  );
}
