import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useTournamentStore } from '@/store/tournament-store';
import { handleAbsence, previewAbsence } from '@/lib/absence-handler';
import { getParticipantDisplayName } from '@/lib/participant-utils';
import type { Tournament } from '@/types';

interface Props {
  tournament: Tournament;
  onClose: () => void;
}

export function AbsenceDialog({ tournament, onClose }: Props) {
  const updateTournament = useTournamentStore((s) => s.updateTournament);
  const markAbsent = useTournamentStore((s) => s.markAbsent);
  const markPresent = useTournamentStore((s) => s.markPresent);

  const [selectedId, setSelectedId] = useState<string | null>(null);

  const activeParticipants = tournament.participants.filter((p) => !p.withdrawn);

  const preview = useMemo(() => {
    if (!selectedId) return [];
    return previewAbsence(tournament, selectedId);
  }, [selectedId, tournament]);

  const handleConfirmAbsence = () => {
    if (!selectedId) return;

    // Mark as absent in store
    markAbsent(tournament.id, selectedId);

    // Apply absence effects
    const result = handleAbsence(tournament, selectedId);
    if (Object.keys(result.tournament).length > 0) {
      updateTournament(tournament.id, result.tournament);
    }

    setSelectedId(null);
    onClose();
  };

  const handleReinstate = (pid: string) => {
    markPresent(tournament.id, pid);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="text-lg">当日欠席処理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1">
            {activeParticipants.map((p) => (
              <div
                key={p.id}
                className={`flex items-center justify-between py-2 px-3 rounded cursor-pointer ${
                  selectedId === p.id ? 'bg-primary/10 border border-primary' : 'hover:bg-muted'
                } ${p.absent ? 'opacity-60' : ''}`}
                onClick={() => !p.absent && setSelectedId(p.id === selectedId ? null : p.id)}
              >
                <div className="flex items-center gap-2">
                  <span className={p.absent ? 'line-through' : ''}>
                    {getParticipantDisplayName(p)}
                  </span>
                  {p.absent && <Badge variant="destructive" className="text-xs">欠席</Badge>}
                </div>
                {p.absent && (
                  <Button variant="ghost" size="sm" className="text-primary" onClick={(e) => { e.stopPropagation(); handleReinstate(p.id); }}>
                    復帰
                  </Button>
                )}
              </div>
            ))}
          </div>

          {selectedId && preview.length > 0 && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-[var(--radius)] text-sm space-y-1">
              <div className="font-medium text-yellow-800">影響プレビュー</div>
              {preview.map((msg, i) => (
                <div key={i} className="text-yellow-700">{msg}</div>
              ))}
            </div>
          )}

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={onClose}>閉じる</Button>
            {selectedId && (
              <Button variant="destructive" onClick={handleConfirmAbsence}>
                欠席を確定
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
