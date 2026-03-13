import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { getParticipantName } from '@/lib/participant-utils';
import { determineSetWinner } from '@/lib/score-calculator';
import { validateSetScore } from '@/lib/score-validator';
import type { Match, Tournament, SetScore, MatchResultReason } from '@/types';

interface Props {
  match: Match;
  tournament: Tournament;
  onSubmit: (matchId: string, updates: Partial<Match>) => void;
  onClose: () => void;
}

export function GroupMatchScoreDialog({ match, tournament, onSubmit, onClose }: Props) {
  const p1Name = getParticipantName(tournament, match.participant1Id);
  const p2Name = match.participant2Id ? getParticipantName(tournament, match.participant2Id) : 'BYE';

  const [sets, setSets] = useState<SetScore[]>(
    match.sets.length > 0
      ? match.sets
      : Array.from({ length: tournament.setsPerMatch }, () => ({ games1: 0, games2: 0 }))
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [useOverride, setUseOverride] = useState(false);
  const [overrideWinner, setOverrideWinner] = useState<1 | 2>(1);

  const handleSetChange = (setIdx: number, field: keyof SetScore, value: number) => {
    setSets(sets.map((s, i) => (i === setIdx ? { ...s, [field]: value } : s)));
  };

  const handleSubmit = () => {
    if (useOverride) {
      onSubmit(match.id, { winner: overrideWinner, resultReason: 'forfeit' as MatchResultReason });
      return;
    }

    const allErrors: string[] = [];
    for (let i = 0; i < sets.length; i++) {
      const errs = validateSetScore(sets[i], tournament.gamesPerSet, tournament.useTiebreakGame, i);
      allErrors.push(...errs.map((e) => e.message));
    }
    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }

    let p1Sets = 0;
    let p2Sets = 0;
    for (const s of sets) {
      const w = determineSetWinner(s, tournament.gamesPerSet, tournament.useTiebreakGame);
      if (w === 1) p1Sets++;
      else if (w === 2) p2Sets++;
    }

    const neededSets = Math.ceil(tournament.setsPerMatch / 2);
    let winner: 1 | 2 | undefined;
    if (p1Sets >= neededSets) winner = 1;
    else if (p2Sets >= neededSets) winner = 2;

    if (!winner) {
      setErrors(['勝者が確定していません。']);
      return;
    }

    onSubmit(match.id, { sets, winner });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <Card className="w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
        <CardHeader>
          <CardTitle className="text-lg">スコア入力</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-2 text-sm font-medium text-center">
            <div>{p1Name}</div>
            <div className="text-muted-foreground">vs</div>
            <div>{p2Name}</div>
          </div>

          {!useOverride && (
            <div className="space-y-2">
              {sets.map((set, i) => (
                <div key={i} className="grid grid-cols-[1fr_auto_1fr] gap-2 items-center">
                  <Input
                    type="number" min={0} max={99}
                    value={set.games1}
                    onChange={(e) => handleSetChange(i, 'games1', Number(e.target.value))}
                    className="text-center"
                  />
                  <span className="text-xs text-muted-foreground">S{i + 1}</span>
                  <Input
                    type="number" min={0} max={99}
                    value={set.games2}
                    onChange={(e) => handleSetChange(i, 'games2', Number(e.target.value))}
                    className="text-center"
                  />
                  {set.games1 === tournament.gamesPerSet && set.games2 === tournament.gamesPerSet && tournament.useTiebreakGame && (
                    <>
                      <Input
                        type="number" min={0}
                        value={set.tiebreak1 || 0}
                        onChange={(e) => handleSetChange(i, 'tiebreak1', Number(e.target.value))}
                        className="text-center text-xs"
                      />
                      <span className="text-xs text-muted-foreground">TB</span>
                      <Input
                        type="number" min={0}
                        value={set.tiebreak2 || 0}
                        onChange={(e) => handleSetChange(i, 'tiebreak2', Number(e.target.value))}
                        className="text-center text-xs"
                      />
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          {useOverride && (
            <div className="space-y-2 p-3 bg-muted/50 rounded-[var(--radius)]">
              <Label className="text-sm">勝者</Label>
              <div className="flex gap-2">
                <Button size="sm" variant={overrideWinner === 1 ? 'default' : 'outline'} onClick={() => setOverrideWinner(1)}>
                  {p1Name}
                </Button>
                <Button size="sm" variant={overrideWinner === 2 ? 'default' : 'outline'} onClick={() => setOverrideWinner(2)}>
                  {p2Name}
                </Button>
              </div>
            </div>
          )}

          {errors.length > 0 && (
            <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
              {errors.map((e, i) => <div key={i}>{e}</div>)}
            </div>
          )}

          <div className="flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={() => setUseOverride(!useOverride)}>
              {useOverride ? 'スコア入力' : '手動判定'}
            </Button>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose}>キャンセル</Button>
              <Button onClick={handleSubmit}>確定</Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
