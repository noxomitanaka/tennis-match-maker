/** Participant CRUD logic hook: add, remove, withdraw, CSV import. */
import { useState, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useTournamentStore } from '@/store/tournament-store';
import type { Tournament, Participant, TeamMember } from '@/types';
import { parseCsv, type ParsedEntry } from './csv-helpers';

export function useParticipants(tournament: Tournament) {
  const addParticipant = useTournamentStore((s) => s.addParticipant);
  const removeParticipant = useTournamentStore((s) => s.removeParticipant);
  const withdrawParticipant = useTournamentStore((s) => s.withdrawParticipant);
  const reinstateParticipant = useTournamentStore((s) => s.reinstateParticipant);

  const [name, setName] = useState('');
  const [player1, setPlayer1] = useState('');
  const [player2, setPlayer2] = useState('');
  const [teamName, setTeamName] = useState('');
  const [memberName, setMemberName] = useState('');
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // CSV state
  const [csvPreview, setCsvPreview] = useState<ParsedEntry[] | null>(null);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const hasRounds = tournament.rounds.length > 0;
  const canRemove = !hasRounds;

  const isDuplicateName = (newName: string) => {
    return tournament.participants.some(
      (p) => p.name.toLowerCase() === newName.toLowerCase()
    );
  };

  const handleAddIndividual = () => {
    const trimmed = name.trim();
    if (!trimmed) { setError('名前を入力してください'); return; }
    if (isDuplicateName(trimmed)) { setError('同名の参加者が既に登録されています'); return; }
    addParticipant(tournament.id, { id: uuidv4(), kind: 'individual', name: trimmed });
    setName('');
    setError('');
  };

  const handleAddPair = () => {
    const p1 = player1.trim();
    const p2 = player2.trim();
    if (!p1 || !p2) { setError('両方の名前を入力してください'); return; }
    if (p1 === p2) { setError('同じ名前のペアは登録できません'); return; }
    const pairName = `${p1} / ${p2}`;
    if (isDuplicateName(pairName)) { setError('同名のペアが既に登録されています'); return; }
    addParticipant(tournament.id, { id: uuidv4(), kind: 'pair', player1: p1, player2: p2, name: pairName });
    setPlayer1('');
    setPlayer2('');
    setError('');
  };

  const handleAddTeam = () => {
    const tn = teamName.trim();
    if (!tn) { setError('チーム名を入力してください'); return; }
    if (isDuplicateName(tn)) { setError('同名のチームが既に登録されています'); return; }
    addParticipant(tournament.id, { id: uuidv4(), kind: 'team', name: tn, members: [...members] });
    setTeamName('');
    setMembers([]);
    setError('');
  };

  const handleAddMember = () => {
    const mn = memberName.trim();
    if (!mn) return;
    if (members.some((m) => m.name === mn)) return;
    setMembers([...members, { id: uuidv4(), name: mn }]);
    setMemberName('');
    setError('');
  };

  // ─── CSV handlers ───

  const handleFileRead = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text) return;
      const entries = parseCsv(text, tournament.type);
      if (entries.length === 0) {
        setError('CSVにデータがありません（ヘッダー行のみ？）');
        return;
      }
      setCsvPreview(entries);
      setError('');
    };
    reader.readAsText(file, 'UTF-8');
  }, [tournament.type]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileRead(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.endsWith('.csv') || file.name.endsWith('.txt'))) {
      handleFileRead(file);
    } else {
      setError('CSVファイル（.csv）を選択してください');
    }
  }, [handleFileRead]);

  const handleCsvConfirm = () => {
    if (!csvPreview) return;

    const maxP = tournament.maxParticipants;
    let currentCount = tournament.participants.length;
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of csvPreview) {
      if (entry.error) { skipped++; continue; }
      if (isDuplicateName(entry.name)) { skipped++; continue; }
      if (maxP && currentCount >= maxP) {
        errors.push(`定員(${maxP})超過のためスキップ: ${entry.name}`);
        skipped++;
        continue;
      }

      switch (tournament.type) {
        case 'singles':
          addParticipant(tournament.id, { id: uuidv4(), kind: 'individual', name: entry.name });
          break;
        case 'doubles':
          addParticipant(tournament.id, {
            id: uuidv4(), kind: 'pair',
            player1: entry.player1!, player2: entry.player2!,
            name: entry.name,
          });
          break;
        case 'team':
          addParticipant(tournament.id, {
            id: uuidv4(), kind: 'team', name: entry.name,
            members: (entry.members || []).map((m) => ({ id: uuidv4(), name: m })),
          });
          break;
      }
      added++;
      currentCount++;
    }

    setCsvPreview(null);
    if (skipped > 0 || errors.length > 0) {
      setError(`${added}件追加、${skipped}件スキップ${errors.length > 0 ? '\n' + errors.join('\n') : ''}`);
      setSuccess('');
    } else {
      setSuccess(`${added}件追加しました`);
      setError('');
      setTimeout(() => setSuccess(''), 3000);
    }
  };

  const handleRemoveOrWithdraw = (p: Participant) => {
    if (canRemove) {
      if (confirm(`${p.name} を削除しますか？`)) {
        removeParticipant(tournament.id, p.id);
      }
    } else {
      if (p.withdrawn) {
        if (confirm(`${p.name} を復帰させますか？`)) {
          reinstateParticipant(tournament.id, p.id);
        }
      } else {
        if (confirm(`${p.name} を棄権（途中離脱）にしますか？\n\n今後のラウンドでペアリング対象外になります。過去の成績は保持されます。`)) {
          withdrawParticipant(tournament.id, p.id);
        }
      }
    }
  };

  const activeCount = tournament.participants.filter((p) => !p.withdrawn && !p.absent).length;
  const withdrawnCount = tournament.participants.filter((p) => p.withdrawn).length;
  const absentCount = tournament.participants.filter((p) => p.absent && !p.withdrawn).length;
  const totalCount = tournament.participants.length;
  const maxP = tournament.maxParticipants;
  const isFull = maxP ? totalCount >= maxP : false;

  return {
    // Form state
    name, setName,
    player1, setPlayer1,
    player2, setPlayer2,
    teamName, setTeamName,
    memberName, setMemberName,
    members, setMembers,
    error, setError,
    success,
    // CSV state
    csvPreview, setCsvPreview,
    dragging, setDragging,
    fileInputRef,
    // Computed
    hasRounds, canRemove, isFull,
    activeCount, withdrawnCount, absentCount, maxP,
    // Handlers
    isDuplicateName,
    handleAddIndividual,
    handleAddPair,
    handleAddTeam,
    handleAddMember,
    handleFileSelect,
    handleDrop,
    handleCsvConfirm,
    handleRemoveOrWithdraw,
  };
}
