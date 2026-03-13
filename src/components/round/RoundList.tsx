import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTournamentStore } from '@/store/tournament-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { generateRound, type PairingWarning } from '@/lib/swiss-pairing';
import { calculateStandings } from '@/lib/standings-calculator';
import { getParticipantDisplayName } from '@/lib/participant-utils';
import type { Tournament } from '@/types';

interface Props {
  tournament: Tournament;
}

export function RoundList({ tournament }: Props) {
  const addRound = useTournamentStore((s) => s.addRound);
  const [warnings, setWarnings] = useState<PairingWarning[]>([]);
  const [fixedPairs, setFixedPairs] = useState<[string, string][]>([]);
  const [showFixedPairUI, setShowFixedPairUI] = useState(false);
  const [fixPick1, setFixPick1] = useState('');
  const [fixPick2, setFixPick2] = useState('');

  const activeParticipants = tournament.participants.filter((p) => !p.withdrawn && !p.absent);
  const lastRound = tournament.rounds[tournament.rounds.length - 1];
  const lastRoundComplete = !lastRound || lastRound.isComplete;

  const canGenerateRound =
    activeParticipants.length >= 2 &&
    tournament.rounds.length < tournament.totalRounds &&
    lastRoundComplete;

  const lastRoundIncomplete = lastRound && !lastRound.isComplete;

  // IDs already assigned to a fixed pair
  const fixedIds = new Set(fixedPairs.flat());

  // Available participants for fixed pair selection
  const availableForFix = activeParticipants.filter((p) => !fixedIds.has(p.id));

  const handleAddFixedPair = () => {
    if (!fixPick1 || !fixPick2 || fixPick1 === fixPick2) return;
    setFixedPairs([...fixedPairs, [fixPick1, fixPick2]]);
    setFixPick1('');
    setFixPick2('');
  };

  const handleRemoveFixedPair = (index: number) => {
    setFixedPairs(fixedPairs.filter((_, i) => i !== index));
  };

  const handleGenerateRound = () => {
    const standings = calculateStandings(tournament);
    const pairingInput = standings.map((s) => ({
      participantId: s.participantId,
      wins: s.wins,
    }));
    const result = generateRound(tournament, pairingInput, fixedPairs);

    if (result.round.matches.length === 0) {
      setWarnings(result.warnings);
      return;
    }

    if (result.warnings.length > 0) {
      setWarnings(result.warnings);
    } else {
      setWarnings([]);
    }

    addRound(tournament.id, result.round);
    setFixedPairs([]);
    setShowFixedPairUI(false);
  };

  const getNameById = (pid: string) => {
    const p = tournament.participants.find((x) => x.id === pid);
    return p ? getParticipantDisplayName(p) : pid;
  };

  return (
    <div className="space-y-4">
      {/* Warnings */}
      {warnings.length > 0 && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-[var(--radius)] text-sm space-y-1">
          {warnings.map((w, i) => (
            <div key={i} className="text-yellow-800">{w.message}</div>
          ))}
          <Button variant="ghost" size="sm" className="text-yellow-600" onClick={() => setWarnings([])}>
            閉じる
          </Button>
        </div>
      )}

      {canGenerateRound && (
        <div className="space-y-3">
          {/* Fixed pair UI toggle */}
          <div className="flex gap-2">
            <Button onClick={handleGenerateRound}>
              ラウンド {tournament.rounds.length + 1} を生成
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowFixedPairUI(!showFixedPairUI)}
            >
              {showFixedPairUI ? '固定対戦を閉じる' : '対戦を固定指定'}
            </Button>
          </div>

          {/* Fixed pair configuration */}
          {showFixedPairUI && (
            <Card>
              <CardContent className="p-4 space-y-3">
                <p className="text-sm text-muted-foreground">
                  固定したい対戦を指定してください。残りは自動ペアリングされます。
                </p>

                {/* Existing fixed pairs */}
                {fixedPairs.length > 0 && (
                  <div className="space-y-1">
                    {fixedPairs.map(([p1, p2], i) => (
                      <div key={i} className="flex items-center gap-2 text-sm py-1 px-2 bg-muted rounded">
                        <Badge variant="outline" className="text-xs">固定</Badge>
                        <span className="font-medium">{getNameById(p1)}</span>
                        <span className="text-muted-foreground">vs</span>
                        <span className="font-medium">{getNameById(p2)}</span>
                        <button
                          className="ml-auto text-destructive cursor-pointer text-xs"
                          onClick={() => handleRemoveFixedPair(i)}
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add new fixed pair */}
                {availableForFix.length >= 2 && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={fixPick1}
                      onChange={(e) => { setFixPick1(e.target.value); if (e.target.value === fixPick2) setFixPick2(''); }}
                      className="flex-1 text-sm"
                    >
                      <option value="">{tournament.type === 'team' ? '-- チーム1 --' : '-- 選手1 --'}</option>
                      {availableForFix.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.id === fixPick2}>
                          {getParticipantDisplayName(p)}
                        </option>
                      ))}
                    </Select>
                    <span className="text-muted-foreground text-sm">vs</span>
                    <Select
                      value={fixPick2}
                      onChange={(e) => setFixPick2(e.target.value)}
                      className="flex-1 text-sm"
                    >
                      <option value="">{tournament.type === 'team' ? '-- チーム2 --' : '-- 選手2 --'}</option>
                      {availableForFix.map((p) => (
                        <option key={p.id} value={p.id} disabled={p.id === fixPick1}>
                          {getParticipantDisplayName(p)}
                        </option>
                      ))}
                    </Select>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleAddFixedPair}
                      disabled={!fixPick1 || !fixPick2 || fixPick1 === fixPick2}
                    >
                      追加
                    </Button>
                  </div>
                )}

                {availableForFix.length < 2 && fixedPairs.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    残り{availableForFix.length}{tournament.type === 'team' ? 'チーム' : '名'} — 自動ペアリングまたはByeに割り当てられます。
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {activeParticipants.length < 2 && tournament.rounds.length === 0 && (
        <p className="text-sm text-muted-foreground">{tournament.type === 'team' ? '2チーム以上登録してください。' : '2名以上の参加者を登録してください。'}</p>
      )}

      {lastRoundIncomplete && (
        <p className="text-sm text-muted-foreground">
          現在のラウンドを確定してから次のラウンドを生成してください。
        </p>
      )}

      {tournament.rounds.length === 0 && activeParticipants.length >= 2 && (
        <p className="text-sm text-muted-foreground">ラウンドを生成してください。</p>
      )}

      {tournament.rounds.length >= tournament.totalRounds && (
        <p className="text-sm text-primary font-medium">全{tournament.totalRounds}ラウンド完了</p>
      )}

      <div className="space-y-3">
        {[...tournament.rounds].reverse().map((round) => (
          <Card key={round.number}>
            <CardContent className="p-4">
              <Link to={`/tournament/${tournament.id}/round/${round.number}`} className="flex items-center justify-between no-underline">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-foreground">ラウンド {round.number}</span>
                  {round.isComplete ? (
                    <Badge variant="outline">完了</Badge>
                  ) : (
                    <Badge variant="secondary">進行中</Badge>
                  )}
                </div>
                <span className="text-sm text-muted-foreground">
                  {round.matches.filter((m) => m.winner !== undefined).length}/{round.matches.length} 試合完了
                </span>
              </Link>

              {/* Match list */}
              <div className="mt-3 space-y-1 border-t border-border pt-2">
                {round.matches.map((match) => {
                  const name1 = getNameById(match.participant1Id);
                  const name2 = match.participant2Id ? getNameById(match.participant2Id) : null;
                  const hasResult = match.winner !== undefined;
                  const scoreText = match.sets.length > 0
                    ? match.sets.map((s) => `${s.games1}-${s.games2}`).join(', ')
                    : '';

                  return (
                    <Link
                      key={match.id}
                      to={`/tournament/${tournament.id}/match/${match.id}`}
                      className="flex items-center gap-2 py-1.5 px-2 rounded hover:bg-muted no-underline text-sm"
                    >
                      {match.isBye ? (
                        <span className="text-muted-foreground">{name1} — Bye</span>
                      ) : (
                        <>
                          <span className={`flex-1 text-right ${hasResult && match.winner === 1 ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                            {name1}
                          </span>
                          {hasResult ? (
                            <span className="text-xs text-muted-foreground w-20 text-center shrink-0">{scoreText}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground w-20 text-center shrink-0">vs</span>
                          )}
                          <span className={`flex-1 text-left ${hasResult && match.winner === 2 ? 'font-semibold text-foreground' : 'text-foreground'}`}>
                            {name2}
                          </span>
                        </>
                      )}
                    </Link>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
