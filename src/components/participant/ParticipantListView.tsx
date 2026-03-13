/** Participant list display: shows each participant with status badges and action buttons. */
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import type { Tournament, Participant } from '@/types';
import { getParticipantDisplayName } from '@/lib/participant-utils';

interface Props {
  tournament: Tournament;
  canRemove: boolean;
  onRemoveOrWithdraw: (p: Participant) => void;
}

export function ParticipantListView({ tournament, canRemove, onRemoveOrWithdraw }: Props) {
  return (
    <div className="space-y-1">
      {tournament.participants.map((p, i) => (
        <div
          key={p.id}
          className={`flex items-center justify-between py-2 px-3 rounded hover:bg-muted ${
            p.withdrawn ? 'opacity-50' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{i + 1}.</span>
            <span className={p.withdrawn ? 'line-through' : ''}>{getParticipantDisplayName(p)}</span>
            {p.kind === 'team' && p.members.length > 0 && (
              <span className="text-sm text-muted-foreground">
                ({p.members.map((m) => m.name).join(', ')})
              </span>
            )}
            {p.withdrawn && <Badge variant="destructive" className="text-xs">棄権</Badge>}
            {p.absent && !p.withdrawn && <Badge variant="secondary" className="text-xs">欠席</Badge>}
          </div>
          <Button
            variant="ghost"
            size="sm"
            className={p.withdrawn ? 'text-primary' : 'text-destructive'}
            onClick={() => onRemoveOrWithdraw(p)}
          >
            {canRemove ? '削除' : p.withdrawn ? '復帰' : '棄権'}
          </Button>
        </div>
      ))}
    </div>
  );
}
