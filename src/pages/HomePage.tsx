import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTournamentStore } from '@/store/tournament-store';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const typeLabels: Record<string, string> = {
  singles: 'シングルス',
  doubles: 'ダブルス',
  team: '団体戦',
};

const formatLabels: Record<string, string> = {
  swiss: 'スイスドロー',
  single_elimination: 'トーナメント',
  round_robin_knockout: 'リーグ→T',
};

const statusLabels: Record<string, string> = {
  setup: '準備中',
  in_progress: '進行中',
  completed: '完了',
};

const statusVariants: Record<string, 'default' | 'secondary' | 'outline'> = {
  setup: 'secondary',
  in_progress: 'default',
  completed: 'outline',
};

const GUIDE_STEPS = [
  { num: '1', text: '「新規大会」を押して大会をつくる' },
  { num: '2', text: '参加者を登録する（1人ずつ or CSVで一括）' },
  { num: '3', text: '試合の組み合わせを生成して対戦開始' },
  { num: '4', text: 'スコアを入力して順位を確認・印刷' },
];

export function HomePage() {
  const tournaments = useTournamentStore((s) => s.tournaments);
  const loading = useTournamentStore((s) => s.loading);
  const loadTournaments = useTournamentStore((s) => s.loadTournaments);
  const deleteTournament = useTournamentStore((s) => s.deleteTournament);
  const { user, logout } = useAuth();
  const [guideOpen, setGuideOpen] = useState(() => {
    return localStorage.getItem('tennis-guide-dismissed') !== 'true';
  });

  useEffect(() => {
    loadTournaments();
  }, [loadTournaments]);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between mb-4 sm:mb-6 gap-2">
        <h1 className="text-xl sm:text-2xl font-bold truncate">Tennis Match Maker</h1>
        <div className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
          <span className="text-xs sm:text-sm text-muted-foreground hidden sm:inline">{user?.displayName}</span>
          <Button variant="ghost" size="sm" onClick={logout}>ログアウト</Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        <Link to="/tournament/new" className="flex-1">
          <Button className="w-full h-12 sm:h-10 text-base sm:text-sm">新規大会</Button>
        </Link>
        <Link to="/guide">
          <Button variant="outline" className="h-12 sm:h-10 text-sm">使い方</Button>
        </Link>
        <Link to="/data">
          <Button variant="outline" className="h-12 sm:h-10 text-sm">データ管理</Button>
        </Link>
      </div>

      {guideOpen && (
        <Card className="mb-4 border-primary/20 bg-primary/5">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-bold">はじめての方へ — かんたん4ステップ</span>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs h-6 px-2"
                onClick={() => {
                  setGuideOpen(false);
                  localStorage.setItem('tennis-guide-dismissed', 'true');
                }}
              >
                閉じる
              </Button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {GUIDE_STEPS.map((step) => (
                <div key={step.num} className="flex items-center gap-2 text-sm">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">{step.num}</span>
                  <span>{step.text}</span>
                </div>
              ))}
            </div>
            <div className="mt-2 text-right">
              <Link to="/guide" className="text-xs text-primary hover:underline">
                くわしい使い方を見る →
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            読み込み中...
          </CardContent>
        </Card>
      ) : tournaments.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-muted-foreground">
            大会がありません。新規大会を作成してください。
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tournaments.map((t) => (
            <Card key={t.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <Link to={`/tournament/${t.id}`} className="flex-1 no-underline">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-foreground">{t.name}</span>
                      <Badge variant={statusVariants[t.status]}>{statusLabels[t.status]}</Badge>
                      <Badge variant="outline">{typeLabels[t.type]}</Badge>
                      {t.format && t.format !== 'swiss' && (
                        <Badge variant="outline">{formatLabels[t.format]}</Badge>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {t.participants.length}{t.maxParticipants ? `/${t.maxParticipants}` : ''}{t.type === 'team' ? 'チーム' : '名'}
                      {t.format === 'swiss' || !t.format ? ` / ${t.totalRounds}ラウンド / R${t.rounds.length}完了` : ''}
                    </div>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive"
                    onClick={(e) => {
                      e.preventDefault();
                      if (confirm('この大会を削除しますか？')) deleteTournament(t.id);
                    }}
                  >
                    削除
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
