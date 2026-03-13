import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournamentStore } from '@/store/tournament-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { FormatSelector } from '@/components/tournament/FormatSelector';
import { parseWithAI } from '@/lib/api';
import type { TournamentType, TournamentFormat, TiebreakCriterion, TeamMatchConfig, SingleEliminationConfig, RoundRobinKnockoutConfig } from '@/types';

const DEFAULT_CRITERIA: TiebreakCriterion[] = ['wins', 'set_diff', 'game_diff', 'head_to_head'];
const DEFAULT_TEAM_CRITERIA: TiebreakCriterion[] = ['wins', 'team_points', 'set_diff', 'game_diff', 'head_to_head'];

const ALL_CRITERIA: { value: TiebreakCriterion; label: string }[] = [
  { value: 'wins', label: '勝数' },
  { value: 'set_diff', label: 'セット得失差' },
  { value: 'game_diff', label: 'ゲーム得失差' },
  { value: 'head_to_head', label: '直接対決' },
  { value: 'team_points', label: 'チームポイント' },
];

export function TournamentNewPage() {
  const navigate = useNavigate();
  const createTournament = useTournamentStore((s) => s.createTournament);

  const [name, setName] = useState('');
  const [maxParticipants, setMaxParticipants] = useState<number | ''>('');
  const [type, setType] = useState<TournamentType>('singles');
  const [format, setFormat] = useState<TournamentFormat>('swiss');
  const [totalRounds, setTotalRounds] = useState(4);
  const [setsPerMatch, setSetsPerMatch] = useState(1);
  const [gamesPerSet, setGamesPerSet] = useState(6);
  const [useTiebreakGame, setUseTiebreakGame] = useState(true);
  const [criteria, setCriteria] = useState<TiebreakCriterion[]>(DEFAULT_CRITERIA);

  // Single elimination config
  const [hasConsolation, setHasConsolation] = useState(false);
  const [thirdPlaceMatch, setThirdPlaceMatch] = useState(true);

  // Round robin + knockout config
  const [groupSize, setGroupSize] = useState(4);
  const [advancingPerGroup, setAdvancingPerGroup] = useState(2);

  // Team config
  const [subMatchSlots, setSubMatchSlots] = useState<{ label: string; type: 'singles' | 'doubles' }[]>([
    { label: 'S1', type: 'singles' },
    { label: 'S2', type: 'singles' },
    { label: 'D1', type: 'doubles' },
  ]);

  // AI input
  const [aiText, setAiText] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const [aiParsedNames, setAiParsedNames] = useState<string[]>([]);

  const handleAiParse = async () => {
    if (!aiText.trim()) return;
    setAiLoading(true);
    setAiError('');
    setAiParsedNames([]);
    try {
      const { parsed } = await parseWithAI(aiText);

      // Fill form fields with parsed values
      if (parsed.name) setName(parsed.name);
      if (parsed.type) {
        setType(parsed.type);
        if (parsed.type === 'team') setCriteria(DEFAULT_TEAM_CRITERIA);
        else setCriteria(DEFAULT_CRITERIA);
      }
      if (parsed.format) setFormat(parsed.format);
      if (parsed.totalRounds != null) setTotalRounds(parsed.totalRounds);
      if (parsed.setsPerMatch != null) setSetsPerMatch(parsed.setsPerMatch);
      if (parsed.gamesPerSet != null) setGamesPerSet(parsed.gamesPerSet);
      if (parsed.maxParticipants != null) setMaxParticipants(parsed.maxParticipants);
      if (parsed.thirdPlaceMatch != null) setThirdPlaceMatch(parsed.thirdPlaceMatch);
      if (parsed.hasConsolation != null) setHasConsolation(parsed.hasConsolation);
      if (parsed.groupSize != null) setGroupSize(parsed.groupSize);
      if (parsed.advancingPerGroup != null) setAdvancingPerGroup(parsed.advancingPerGroup);
      if (parsed.participants && parsed.participants.length > 0) {
        setAiParsedNames(parsed.participants);
      }
    } catch (e) {
      setAiError(e instanceof Error ? e.message : 'AIの応答でエラーが発生しました');
    } finally {
      setAiLoading(false);
    }
  };

  const handleTypeChange = (newType: TournamentType) => {
    setType(newType);
    if (newType === 'team') {
      setCriteria(DEFAULT_TEAM_CRITERIA);
    } else {
      setCriteria(DEFAULT_CRITERIA);
    }
  };

  const addParticipant = useTournamentStore((s) => s.addParticipant);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    let teamMatchConfig: TeamMatchConfig | undefined;
    if (type === 'team') {
      const pointsPerSubMatch: Record<string, number> = {};
      for (const slot of subMatchSlots) {
        pointsPerSubMatch[slot.label] = 1;
      }
      teamMatchConfig = { subMatchSlots, pointsPerSubMatch };
    }

    let formatConfig: SingleEliminationConfig | RoundRobinKnockoutConfig | undefined;
    if (format === 'single_elimination') {
      formatConfig = { hasConsolation, thirdPlaceMatch } satisfies SingleEliminationConfig;
    } else if (format === 'round_robin_knockout') {
      formatConfig = { groupSize, advancingPerGroup, hasConsolation, thirdPlaceMatch } satisfies RoundRobinKnockoutConfig;
    }

    const id = createTournament({
      name: name.trim(),
      type,
      format,
      formatConfig,
      maxParticipants: maxParticipants ? Number(maxParticipants) : undefined,
      totalRounds: format === 'swiss' ? totalRounds : 0,
      setsPerMatch,
      gamesPerSet,
      useTiebreakGame,
      teamMatchConfig,
      tiebreakCriteria: criteria,
    });

    // AI-parsed participants auto-registration
    if (aiParsedNames.length > 0) {
      for (const pName of aiParsedNames) {
        if (type === 'doubles') {
          // Doubles: split "A/B" or "A・B" pairs
          const parts = pName.split(/[\/・&]/).map(s => s.trim()).filter(Boolean);
          if (parts.length >= 2) {
            addParticipant(id, {
              id: crypto.randomUUID(),
              kind: 'pair',
              player1: parts[0],
              player2: parts[1],
              name: `${parts[0]}/${parts[1]}`,
            });
          }
        } else if (type === 'team') {
          addParticipant(id, {
            id: crypto.randomUUID(),
            kind: 'team',
            name: pName,
            members: [],
          });
        } else {
          addParticipant(id, {
            id: crypto.randomUUID(),
            kind: 'individual',
            name: pName,
          });
        }
      }
    }

    navigate(`/tournament/${id}`);
  };

  const moveCriterion = (index: number, direction: -1 | 1) => {
    const newIdx = index + direction;
    if (newIdx < 0 || newIdx >= criteria.length) return;
    const newCriteria = [...criteria];
    [newCriteria[index], newCriteria[newIdx]] = [newCriteria[newIdx], newCriteria[index]];
    setCriteria(newCriteria);
  };

  const toggleCriterion = (c: TiebreakCriterion) => {
    if (criteria.includes(c)) {
      setCriteria(criteria.filter((x) => x !== c));
    } else {
      setCriteria([...criteria, c]);
    }
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <Card>
        <CardHeader>
          <CardTitle>新規大会作成</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* AI Draft Input */}
            <div className="p-3 bg-blue-50 dark:bg-blue-950/30 rounded-[var(--radius)] space-y-2">
              <Label className="text-sm font-medium">AIで下書き</Label>
              <textarea
                value={aiText}
                onChange={(e) => setAiText(e.target.value)}
                placeholder="例: 8人シングルス、スイスドロー4ラウンド、1セットマッチ6ゲーム。参加者は田中、佐藤、鈴木、山田、加藤、渡辺、中村、小林"
                className="w-full h-20 px-3 py-2 text-sm border rounded-[var(--radius)] bg-background resize-none"
              />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAiParse}
                  disabled={aiLoading || !aiText.trim()}
                >
                  {aiLoading ? '解析中...' : 'AIで下書き作成'}
                </Button>
                {aiError && <span className="text-sm text-red-500">{aiError}</span>}
              </div>
              {aiParsedNames.length > 0 && (
                <div className="text-sm text-muted-foreground">
                  参加者 {aiParsedNames.length}名を検出: {aiParsedNames.join('、')}
                  <span className="block text-xs mt-1">（大会作成後に参加者画面で追加されます）</span>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="name">大会名</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxParticipants">定員</Label>
                <Input
                  id="maxParticipants"
                  type="number"
                  min={2}
                  max={999}
                  value={maxParticipants}
                  onChange={(e) => setMaxParticipants(e.target.value ? Number(e.target.value) : '')}
                  placeholder="上限なし"
                />
              </div>
              <div>
                <Label htmlFor="type">種別</Label>
                <Select id="type" value={type} onChange={(e) => handleTypeChange(e.target.value as TournamentType)}>
                  <option value="singles">シングルス</option>
                  <option value="doubles">ダブルス</option>
                  <option value="team">団体戦</option>
                </Select>
              </div>
            </div>

            <div>
              <Label>大会形式</Label>
              <div className="mt-2">
                <FormatSelector value={format} onChange={setFormat} />
              </div>
            </div>

            {/* Format-specific settings */}
            {format === 'swiss' && (
              <div>
                <Label htmlFor="rounds">ラウンド数</Label>
                <Input id="rounds" type="number" min={1} max={20} value={totalRounds} onChange={(e) => setTotalRounds(Number(e.target.value))} />
              </div>
            )}

            {format === 'single_elimination' && (
              <div className="space-y-2 p-3 bg-muted/50 rounded-[var(--radius)]">
                <Label className="text-sm font-medium">トーナメント設定</Label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={thirdPlaceMatch} onChange={(e) => setThirdPlaceMatch(e.target.checked)} className="rounded" />
                  3位決定戦
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasConsolation} onChange={(e) => setHasConsolation(e.target.checked)} className="rounded" />
                  コンソレーション（敗者復活トーナメント）
                </label>
              </div>
            )}

            {format === 'round_robin_knockout' && (
              <div className="space-y-3 p-3 bg-muted/50 rounded-[var(--radius)]">
                <Label className="text-sm font-medium">予選リーグ設定</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="groupSize" className="text-xs">{type === 'team' ? '1グループのチーム数' : '1グループの人数'}</Label>
                    <Input id="groupSize" type="number" min={3} max={8} value={groupSize} onChange={(e) => setGroupSize(Number(e.target.value))} />
                  </div>
                  <div>
                    <Label htmlFor="advancing" className="text-xs">{type === 'team' ? '各グループ通過チーム数' : '各グループ通過人数'}</Label>
                    <Input id="advancing" type="number" min={1} max={groupSize - 1} value={advancingPerGroup} onChange={(e) => setAdvancingPerGroup(Number(e.target.value))} />
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={thirdPlaceMatch} onChange={(e) => setThirdPlaceMatch(e.target.checked)} className="rounded" />
                  3位決定戦
                </label>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={hasConsolation} onChange={(e) => setHasConsolation(e.target.checked)} className="rounded" />
                  コンソレーション
                </label>
              </div>
            )}

            {/* Match settings */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sets">セット数</Label>
                <Input id="sets" type="number" min={1} max={5} step={2} value={setsPerMatch} onChange={(e) => setSetsPerMatch(Number(e.target.value))} />
              </div>
              <div>
                <Label htmlFor="games">ゲーム数/セット</Label>
                <Input id="games" type="number" min={1} max={10} value={gamesPerSet} onChange={(e) => setGamesPerSet(Number(e.target.value))} />
              </div>
            </div>

            <div className="flex items-end gap-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={useTiebreakGame}
                  onChange={(e) => setUseTiebreakGame(e.target.checked)}
                  className="rounded"
                />
                タイブレーク有
              </label>
            </div>

            {type === 'team' && (
              <div>
                <Label>団体戦試合構成</Label>
                <div className="space-y-2 mt-2">
                  {subMatchSlots.map((slot, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Input
                        value={slot.label}
                        onChange={(e) => {
                          const next = [...subMatchSlots];
                          next[i] = { ...next[i], label: e.target.value };
                          setSubMatchSlots(next);
                        }}
                        className="w-24"
                      />
                      <Select
                        value={slot.type}
                        onChange={(e) => {
                          const next = [...subMatchSlots];
                          next[i] = { ...next[i], type: e.target.value as 'singles' | 'doubles' };
                          setSubMatchSlots(next);
                        }}
                        className="w-32"
                      >
                        <option value="singles">シングルス</option>
                        <option value="doubles">ダブルス</option>
                      </Select>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setSubMatchSlots(subMatchSlots.filter((_, j) => j !== i))}>
                        ×
                      </Button>
                    </div>
                  ))}
                  <Button type="button" variant="outline" size="sm" onClick={() => setSubMatchSlots([...subMatchSlots, { label: `S${subMatchSlots.length + 1}`, type: 'singles' }])}>
                    + 試合追加
                  </Button>
                </div>
              </div>
            )}

            {/* Tiebreak criteria - only for swiss and round_robin */}
            {format !== 'single_elimination' && (
              <div>
                <Label>順位基準（上から優先）</Label>
                <div className="space-y-1 mt-2">
                  {criteria.map((c, i) => {
                    const item = ALL_CRITERIA.find((x) => x.value === c);
                    return (
                      <div key={c} className="flex items-center gap-2 text-sm">
                        <span className="text-muted-foreground w-4">{i + 1}.</span>
                        <span className="flex-1">{item?.label}</span>
                        <Button type="button" variant="ghost" size="sm" onClick={() => moveCriterion(i, -1)} disabled={i === 0}>↑</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => moveCriterion(i, 1)} disabled={i === criteria.length - 1}>↓</Button>
                        <Button type="button" variant="ghost" size="sm" onClick={() => toggleCriterion(c)}>×</Button>
                      </div>
                    );
                  })}
                  {ALL_CRITERIA.filter((c) => !criteria.includes(c.value)).map((c) => (
                    <Button key={c.value} type="button" variant="outline" size="sm" onClick={() => toggleCriterion(c.value)} className="mr-1">
                      + {c.label}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex gap-2 pt-4">
              <Button type="submit" className="flex-1">作成</Button>
              <Button type="button" variant="outline" onClick={() => navigate('/')}>キャンセル</Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
