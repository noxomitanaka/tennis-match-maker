import { useState } from 'react';
import { useTournamentStore } from '@/store/tournament-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { determineSubMatchWinner, determineMatchWinner } from '@/lib/score-calculator';
import { validateAllSets } from '@/lib/score-validator';
import { getParticipantName } from '@/lib/participant-utils';
import { RESULT_REASON_LABELS } from '@/types';
import type { Tournament, Match, SubMatch, SetScore, TeamParticipant, MatchResultReason } from '@/types';

interface Props {
  tournament: Tournament;
  roundNumber: number;
  match: Match;
}

export function TeamScoreInput({ tournament, roundNumber, match }: Props) {
  const updateSubMatch = useTournamentStore((s) => s.updateSubMatch);
  const updateMatch = useTournamentStore((s) => s.updateMatch);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState<MatchResultReason>('forfeit');

  const team1 = tournament.participants.find((p) => p.id === match.participant1Id) as TeamParticipant | undefined;
  const team2 = tournament.participants.find((p) => p.id === match.participant2Id) as TeamParticipant | undefined;
  const p1Name = getParticipantName(tournament, match.participant1Id);
  const p2Name = match.participant2Id ? getParticipantName(tournament, match.participant2Id) : '';

  const handleSubMatchSave = (subMatch: SubMatch, sets: SetScore[], p1Members: string[], p2Members: string[]) => {
    const winner = determineSubMatchWinner(
      { ...subMatch, sets },
      tournament.setsPerMatch,
      tournament.gamesPerSet,
      tournament.useTiebreakGame
    );
    updateSubMatch(tournament.id, roundNumber, match.id, subMatch.id, {
      sets,
      winner,
      resultReason: 'normal' as MatchResultReason,
      participant1Members: p1Members,
      participant2Members: p2Members,
    });

    // Re-check match winner using fresh state
    requestAnimationFrame(() => {
      const fresh = useTournamentStore.getState().tournaments.find((t) => t.id === tournament.id);
      if (!fresh) return;
      const freshRound = fresh.rounds.find((r) => r.number === roundNumber);
      const freshMatch = freshRound?.matches.find((m) => m.id === match.id);
      if (!freshMatch) return;
      const matchWinner = determineMatchWinner(freshMatch, fresh);
      if (matchWinner) {
        updateMatch(tournament.id, roundNumber, match.id, { winner: matchWinner, resultReason: 'normal' });
      }
    });
  };

  const handleSubMatchOverride = (subMatch: SubMatch, winner: 1 | 2, reason: MatchResultReason) => {
    updateSubMatch(tournament.id, roundNumber, match.id, subMatch.id, {
      winner,
      resultReason: reason,
    });

    // Re-check match winner
    requestAnimationFrame(() => {
      const fresh = useTournamentStore.getState().tournaments.find((t) => t.id === tournament.id);
      if (!fresh) return;
      const freshRound = fresh.rounds.find((r) => r.number === roundNumber);
      const freshMatch = freshRound?.matches.find((m) => m.id === match.id);
      if (!freshMatch) return;
      const matchWinner = determineMatchWinner(freshMatch, fresh);
      if (matchWinner) {
        updateMatch(tournament.id, roundNumber, match.id, { winner: matchWinner, resultReason: 'normal' });
      }
    });
  };

  const handleMatchOverride = (winner: 1 | 2) => {
    updateMatch(tournament.id, roundNumber, match.id, {
      winner,
      resultReason: overrideReason,
    });
    setShowOverride(false);
  };

  const handleClearResult = () => {
    updateMatch(tournament.id, roundNumber, match.id, {
      winner: undefined,
      resultReason: undefined,
    });
  };

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

      <div className="text-sm text-muted-foreground">
        {p1Name} vs {p2Name}
      </div>

      {match.subMatches.map((sub) => (
        <SubMatchInput
          key={sub.id}
          subMatch={sub}
          tournament={tournament}
          team1={team1}
          team2={team2}
          onSave={handleSubMatchSave}
          onOverride={handleSubMatchOverride}
        />
      ))}

      {/* Match-level manual override */}
      <div className="border-t border-border pt-4">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowOverride(!showOverride)}
          className="w-full"
        >
          {showOverride ? '閉じる' : '試合全体の勝者を手動指定'}
        </Button>

        {showOverride && (
          <div className="mt-3 p-3 bg-muted/50 rounded-[var(--radius)] space-y-3">
            <p className="text-sm text-muted-foreground">
              個別試合の結果に関係なく、チームの勝敗を直接指定します。
            </p>
            <Select value={overrideReason} onChange={(e) => setOverrideReason(e.target.value as MatchResultReason)}>
              {(['forfeit', 'disqualification', 'rain', 'injury', 'no_show'] as MatchResultReason[]).map((r) => (
                <option key={r} value={r}>{RESULT_REASON_LABELS[r]}</option>
              ))}
            </Select>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => handleMatchOverride(1)}>
                {p1Name} の勝ち
              </Button>
              <Button variant="outline" className="flex-1" onClick={() => handleMatchOverride(2)}>
                {p2Name} の勝ち
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function SubMatchInput({
  subMatch,
  tournament,
  team1,
  team2,
  onSave,
  onOverride,
}: {
  subMatch: SubMatch;
  tournament: Tournament;
  team1?: TeamParticipant;
  team2?: TeamParticipant;
  onSave: (subMatch: SubMatch, sets: SetScore[], p1Members: string[], p2Members: string[]) => void;
  onOverride: (subMatch: SubMatch, winner: 1 | 2, reason: MatchResultReason) => void;
}) {
  const [sets, setSets] = useState<SetScore[]>(
    subMatch.sets.length > 0
      ? subMatch.sets
      : Array.from({ length: tournament.setsPerMatch }, () => ({ games1: 0, games2: 0 }))
  );
  const [p1Members, setP1Members] = useState<string[]>(subMatch.participant1Members);
  const [p2Members, setP2Members] = useState<string[]>(subMatch.participant2Members);
  const [errors, setErrors] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const [showOverride, setShowOverride] = useState(false);
  const [overrideReason, setOverrideReason] = useState<MatchResultReason>('forfeit');

  const memberCount = subMatch.type === 'singles' ? 1 : 2;

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
    // Validate member selection
    const memberErrors: string[] = [];
    if (team1 && team1.members.length > 0) {
      const selectedP1 = p1Members.filter(Boolean);
      if (selectedP1.length < memberCount) {
        memberErrors.push(`チーム1のメンバーを${memberCount}名選択してください`);
      }
      if (new Set(selectedP1).size !== selectedP1.length) {
        memberErrors.push('チーム1で同じメンバーが重複しています');
      }
    }
    if (team2 && team2.members.length > 0) {
      const selectedP2 = p2Members.filter(Boolean);
      if (selectedP2.length < memberCount) {
        memberErrors.push(`チーム2のメンバーを${memberCount}名選択してください`);
      }
      if (new Set(selectedP2).size !== selectedP2.length) {
        memberErrors.push('チーム2で同じメンバーが重複しています');
      }
    }

    // Validate scores
    const scoreErrors = validateAllSets(sets, tournament.gamesPerSet, tournament.useTiebreakGame);
    const allErrors = [...memberErrors, ...scoreErrors.map((e) => e.message)];

    if (allErrors.length > 0) {
      setErrors(allErrors);
      return;
    }

    onSave(subMatch, sets, p1Members, p2Members);
    setSaved(true);
    setErrors([]);
  };

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{subMatch.slotLabel}</span>
          <span className="text-xs text-muted-foreground">
            ({subMatch.type === 'singles' ? 'シングルス' : 'ダブルス'})
          </span>
          {subMatch.winner && (
            <span className="text-sm text-primary ml-auto">
              P{subMatch.winner} 勝利
              {subMatch.resultReason && subMatch.resultReason !== 'normal' && (
                <span className="text-muted-foreground ml-1">
                  ({RESULT_REASON_LABELS[subMatch.resultReason]})
                </span>
              )}
            </span>
          )}
        </div>

        {/* Errors */}
        {errors.length > 0 && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-xs text-destructive space-y-1">
            {errors.map((err, i) => <div key={i}>{err}</div>)}
          </div>
        )}

        {/* Member selection */}
        {team1 && team1.members.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">{team1.name}:</span>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: memberCount }).map((_, i) => (
                <Select
                  key={i}
                  value={p1Members[i] || ''}
                  onChange={(e) => {
                    const next = [...p1Members];
                    next[i] = e.target.value;
                    setP1Members(next);
                    setErrors([]);
                  }}
                  className="w-auto text-xs"
                >
                  <option value="">-- 選択 --</option>
                  {team1.members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </Select>
              ))}
            </div>
          </div>
        )}
        {team2 && team2.members.length > 0 && (
          <div className="text-sm">
            <span className="text-muted-foreground">{team2.name}:</span>
            <div className="flex gap-1 mt-1">
              {Array.from({ length: memberCount }).map((_, i) => (
                <Select
                  key={i}
                  value={p2Members[i] || ''}
                  onChange={(e) => {
                    const next = [...p2Members];
                    next[i] = e.target.value;
                    setP2Members(next);
                    setErrors([]);
                  }}
                  className="w-auto text-xs"
                >
                  <option value="">-- 選択 --</option>
                  {team2.members.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                </Select>
              ))}
            </div>
          </div>
        )}

        {/* Set scores */}
        {sets.map((set, i) => (
          <div key={i} className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-8">S{i + 1}</span>
            <Input
              type="number"
              min={0}
              value={set.games1}
              onChange={(e) => handleSetChange(i, 'games1', e.target.value)}
              className="w-16 text-center"
            />
            <span className="text-muted-foreground">-</span>
            <Input
              type="number"
              min={0}
              value={set.games2}
              onChange={(e) => handleSetChange(i, 'games2', e.target.value)}
              className="w-16 text-center"
            />
          </div>
        ))}

        <div className="flex gap-2">
          <Button size="sm" onClick={handleSave}>保存</Button>
          <Button size="sm" variant="ghost" onClick={() => setShowOverride(!showOverride)}>
            {showOverride ? '閉じる' : '手動指定'}
          </Button>
        </div>

        {saved && errors.length === 0 && (
          <div className="text-xs text-primary">保存しました</div>
        )}

        {showOverride && (
          <div className="p-2 bg-muted/50 rounded space-y-2">
            <p className="text-xs text-muted-foreground">スコアに関係なく勝者を指定</p>
            <Select
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value as MatchResultReason)}
              className="text-xs"
            >
              {(['forfeit', 'disqualification', 'rain', 'injury', 'no_show'] as MatchResultReason[]).map((r) => (
                <option key={r} value={r}>{RESULT_REASON_LABELS[r]}</option>
              ))}
            </Select>
            <div className="flex gap-1">
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => {
                onOverride(subMatch, 1, overrideReason);
                setShowOverride(false);
              }}>
                P1 勝ち
              </Button>
              <Button size="sm" variant="outline" className="flex-1 text-xs" onClick={() => {
                onOverride(subMatch, 2, overrideReason);
                setShowOverride(false);
              }}>
                P2 勝ち
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
