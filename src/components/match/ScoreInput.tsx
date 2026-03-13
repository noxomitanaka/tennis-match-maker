import { useState } from 'react';
import { useTournamentStore } from '@/store/tournament-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { determineMatchWinner, determineSetWinner } from '@/lib/score-calculator';
import { validateAllSets } from '@/lib/score-validator';
import { getParticipantName } from '@/lib/participant-utils';
import { RESULT_REASON_LABELS } from '@/types';
import type { Tournament, Match, SetScore, MatchResultReason } from '@/types';

interface Props {
  tournament: Tournament;
  roundNumber: number;
  match: Match;
}

export function ScoreInput({ tournament, roundNumber, match }: Props) {
  const updateMatch = useTournamentStore((s) => s.updateMatch);
  const [sets, setSets] = useState<SetScore[]>(
    match.sets.length > 0
      ? match.sets
      : Array.from({ length: tournament.setsPerMatch }, () => ({ games1: 0, games2: 0 }))
  );
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [showOverride, setShowOverride] = useState(false);

  const p1Name = getParticipantName(tournament, match.participant1Id);
  const p2Name = match.participant2Id ? getParticipantName(tournament, match.participant2Id) : '';

  const handleSetChange = (setIndex: number, field: keyof SetScore, value: string) => {
    const num = parseInt(value);
    if (value !== '' && isNaN(num)) return;
    const next = [...sets];
    next[setIndex] = { ...next[setIndex], [field]: value === '' ? 0 : Math.max(0, num) };
    setSets(next);
    setErrors([]);
    setSaved(false);
  };

  const handleSave = () => {
    // Validate
    const validationErrors = validateAllSets(sets, tournament.gamesPerSet, tournament.useTiebreakGame);
    if (validationErrors.length > 0) {
      setErrors(validationErrors.map((e) => e.message));
      return;
    }

    const tempMatch = { ...match, sets };
    const winner = determineMatchWinner(tempMatch, tournament);
    const updates: Partial<Match> = { sets, resultReason: 'normal' as MatchResultReason };
    if (winner) updates.winner = winner;
    else updates.winner = undefined;
    updateMatch(tournament.id, roundNumber, match.id, updates);
    setSaved(true);
    setErrors([]);
  };

  const handleManualWinner = (winnerId: 1 | 2, reason: MatchResultReason) => {
    updateMatch(tournament.id, roundNumber, match.id, {
      sets,
      winner: winnerId,
      resultReason: reason,
    });
    setSaved(true);
    setShowOverride(false);
    setErrors([]);
  };

  const handleClearResult = () => {
    updateMatch(tournament.id, roundNumber, match.id, {
      winner: undefined,
      resultReason: undefined,
      sets: [],
    });
    setSets(Array.from({ length: tournament.setsPerMatch }, () => ({ games1: 0, games2: 0 })));
    setSaved(false);
  };

  const needsTiebreak = (set: SetScore) =>
    tournament.useTiebreakGame &&
    set.games1 === tournament.gamesPerSet &&
    set.games2 === tournament.gamesPerSet;

  return (
    <div className="space-y-4">
      {/* Current result display */}
      {match.winner && (
        <div className="p-3 bg-muted rounded-[var(--radius)] text-sm">
          <span className="font-medium">
            結果: {match.winner === 1 ? p1Name : p2Name} の勝ち
          </span>
          {match.resultReason && match.resultReason !== 'normal' && (
            <span className="ml-2 text-muted-foreground">
              （{RESULT_REASON_LABELS[match.resultReason]}）
            </span>
          )}
          <Button variant="ghost" size="sm" className="ml-2 text-destructive" onClick={handleClearResult}>
            結果を取消
          </Button>
        </div>
      )}

      {/* Error messages */}
      {errors.length > 0 && (
        <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-[var(--radius)] text-sm text-destructive space-y-1">
          {errors.map((err, i) => (
            <div key={i}>{err}</div>
          ))}
        </div>
      )}

      {/* Set score inputs */}
      {sets.map((set, i) => (
        <div key={i} className="space-y-2">
          <div className="text-sm font-medium">セット {i + 1}</div>
          <div className="flex items-center gap-2">
            <Input
              type="number"
              min={0}
              max={tournament.gamesPerSet + 1}
              value={set.games1}
              onChange={(e) => handleSetChange(i, 'games1', e.target.value)}
              className="w-20 text-center"
              aria-label={`セット${i + 1} ${p1Name}のゲーム数`}
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              min={0}
              max={tournament.gamesPerSet + 1}
              value={set.games2}
              onChange={(e) => handleSetChange(i, 'games2', e.target.value)}
              className="w-20 text-center"
              aria-label={`セット${i + 1} ${p2Name}のゲーム数`}
            />
            {determineSetWinner(set, tournament.gamesPerSet, tournament.useTiebreakGame) && (
              <span className="text-sm text-primary ml-2">
                {determineSetWinner(set, tournament.gamesPerSet, tournament.useTiebreakGame) === 1 ? p1Name : p2Name}
              </span>
            )}
          </div>
          {needsTiebreak(set) && (
            <div className="flex items-center gap-2 pl-4">
              <span className="text-sm text-muted-foreground">TB:</span>
              <Input
                type="number"
                min={0}
                value={set.tiebreak1 ?? 0}
                onChange={(e) => handleSetChange(i, 'tiebreak1', e.target.value)}
                className="w-20 text-center"
              />
              <span className="text-muted-foreground">-</span>
              <Input
                type="number"
                min={0}
                value={set.tiebreak2 ?? 0}
                onChange={(e) => handleSetChange(i, 'tiebreak2', e.target.value)}
                className="w-20 text-center"
              />
            </div>
          )}
        </div>
      ))}

      <div className="flex gap-2">
        <Button onClick={handleSave} className="flex-1">
          スコアを保存
        </Button>
      </div>

      {saved && errors.length === 0 && (
        <div className="text-sm text-primary">保存しました</div>
      )}

      {/* Manual winner override section */}
      <div className="border-t border-border pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOverride(!showOverride)}
          className="w-full"
        >
          {showOverride ? '閉じる' : '棄権・失格・中断で勝者を手動指定'}
        </Button>

        {showOverride && (
          <ManualWinnerPanel
            p1Name={p1Name}
            p2Name={p2Name}
            onSelect={handleManualWinner}
          />
        )}
      </div>
    </div>
  );
}

function ManualWinnerPanel({
  p1Name,
  p2Name,
  onSelect,
}: {
  p1Name: string;
  p2Name: string;
  onSelect: (winner: 1 | 2, reason: MatchResultReason) => void;
}) {
  const [reason, setReason] = useState<MatchResultReason>('forfeit');

  const reasons: MatchResultReason[] = ['forfeit', 'disqualification', 'rain', 'injury', 'no_show'];

  return (
    <div className="mt-3 p-3 bg-muted/50 rounded-[var(--radius)] space-y-3">
      <p className="text-sm text-muted-foreground">
        スコアに関係なく勝者を指定します。中断・棄権・失格などの場合に使用してください。
      </p>
      <div>
        <span className="text-sm font-medium">理由:</span>
        <Select
          value={reason}
          onChange={(e) => setReason(e.target.value as MatchResultReason)}
          className="mt-1"
        >
          {reasons.map((r) => (
            <option key={r} value={r}>{RESULT_REASON_LABELS[r]}</option>
          ))}
        </Select>
      </div>
      <div className="text-sm font-medium">勝者を選択:</div>
      <div className="flex gap-2">
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onSelect(1, reason)}
        >
          {p1Name} の勝ち
        </Button>
        <Button
          variant="outline"
          className="flex-1"
          onClick={() => onSelect(2, reason)}
        >
          {p2Name} の勝ち
        </Button>
      </div>
    </div>
  );
}
