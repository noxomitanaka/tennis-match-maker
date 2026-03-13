/** Participant add form: type-specific inputs and CSV drag-and-drop upload. */
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import type { Tournament } from '@/types';
import { downloadTemplate } from './csv-helpers';
import type { useParticipants } from './useParticipants';

type HookReturn = ReturnType<typeof useParticipants>;

interface Props {
  tournament: Tournament;
  hook: HookReturn;
}

export function ParticipantForm({ tournament, hook }: Props) {
  const {
    name, setName,
    player1, setPlayer1,
    player2, setPlayer2,
    teamName, setTeamName,
    memberName, setMemberName,
    members, setMembers,
    error, setError,
    success,
    dragging, setDragging,
    fileInputRef,
    hasRounds,
    handleAddIndividual,
    handleAddPair,
    handleAddTeam,
    handleAddMember,
    handleFileSelect,
    handleDrop,
  } = hook;

  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        {success && (
          <div className="p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
            {success}
          </div>
        )}
        {error && (
          <div className="p-2 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive whitespace-pre-line">
            {error}
          </div>
        )}

        {tournament.type === 'singles' && (
          <div className="flex gap-2">
            <Input
              placeholder="参加者名"
              value={name}
              onChange={(e) => { setName(e.target.value); setError(''); }}
              onKeyDown={(e) => e.key === 'Enter' && handleAddIndividual()}
            />
            <Button onClick={handleAddIndividual}>追加</Button>
          </div>
        )}

        {tournament.type === 'doubles' && (
          <div className="flex gap-2">
            <Input placeholder="選手1" value={player1} onChange={(e) => { setPlayer1(e.target.value); setError(''); }} />
            <Input placeholder="選手2" value={player2} onChange={(e) => { setPlayer2(e.target.value); setError(''); }} onKeyDown={(e) => e.key === 'Enter' && handleAddPair()} />
            <Button onClick={handleAddPair}>追加</Button>
          </div>
        )}

        {tournament.type === 'team' && (
          <div className="space-y-2">
            <Input placeholder="チーム名" value={teamName} onChange={(e) => { setTeamName(e.target.value); setError(''); }} />
            <div className="flex gap-2">
              <Input
                placeholder="メンバー名"
                value={memberName}
                onChange={(e) => { setMemberName(e.target.value); setError(''); }}
                onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
              />
              <Button variant="outline" onClick={handleAddMember}>メンバー追加</Button>
            </div>
            {members.length > 0 && (
              <div className="text-sm text-muted-foreground flex flex-wrap gap-1">
                {members.map((m, i) => (
                  <span key={m.id} className="inline-flex items-center bg-muted px-2 py-0.5 rounded text-xs">
                    {m.name}
                    <button className="ml-1 text-destructive cursor-pointer" onClick={() => setMembers(members.filter((_, j) => j !== i))}>×</button>
                  </span>
                ))}
              </div>
            )}
            <Button onClick={handleAddTeam} disabled={!teamName.trim()}>チーム追加</Button>
          </div>
        )}

        {/* CSV upload zone */}
        <div className="border-t border-border pt-3 space-y-2">
          <div
            className={`border-2 border-dashed rounded-lg p-4 text-center text-sm cursor-pointer transition-colors ${
              dragging ? 'border-primary bg-primary/5' : 'border-muted-foreground/25 hover:border-muted-foreground/50'
            }`}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              className="hidden"
              onChange={handleFileSelect}
            />
            <div className="text-muted-foreground">
              {dragging ? 'ここにドロップ' : 'CSVファイルをドラッグ&ドロップ、またはクリックして選択'}
            </div>
          </div>
          <div className="flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              className="text-xs text-muted-foreground"
              onClick={() => downloadTemplate(tournament.type)}
            >
              CSVテンプレートをダウンロード
            </Button>
          </div>
        </div>

        {hasRounds && (
          <p className="text-xs text-muted-foreground">
            大会進行中のため追加のみ可能です。離脱は各参加者の「棄権」ボタンを使用してください。
          </p>
        )}
      </CardContent>
    </Card>
  );
}
