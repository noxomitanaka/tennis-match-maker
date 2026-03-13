import { useRef, useState } from 'react';
import { useTournamentStore } from '@/store/tournament-store';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Link } from 'react-router-dom';
import { validateImport } from '@/lib/import-validator';

export function DataPage() {
  const tournaments = useTournamentStore((s) => s.tournaments);
  const importTournaments = useTournamentStore((s) => s.importTournaments);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | 'warning'>('success');
  const [importErrors, setImportErrors] = useState<string[]>([]);

  const handleExport = () => {
    try {
      const data = JSON.stringify(tournaments, null, 2);
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tennis-match-maker-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      setMessage('エクスポートしました');
      setMessageType('success');
      setImportErrors([]);
    } catch (err) {
      setMessage('エクスポートに失敗しました');
      setMessageType('error');
    }
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      setMessage('ファイルサイズが大きすぎます（10MB上限）');
      setMessageType('error');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const raw = JSON.parse(ev.target?.result as string);
        const result = validateImport(raw);

        if (!result.valid) {
          setMessage('インポートに失敗しました');
          setMessageType('error');
          setImportErrors([...result.errors, ...result.warnings]);
          return;
        }

        if (!confirm(`${result.tournaments.length}件の大会をインポートしますか？`)) return;

        importTournaments(result.tournaments);
        setMessage(`${result.tournaments.length}件の大会をインポートしました`);
        setMessageType('success');

        if (result.warnings.length > 0) {
          setImportErrors(result.warnings);
        } else {
          setImportErrors([]);
        }
      } catch {
        setMessage('JSONの解析に失敗しました。ファイル形式を確認してください。');
        setMessageType('error');
        setImportErrors([]);
      }
    };
    reader.onerror = () => {
      setMessage('ファイルの読み込みに失敗しました');
      setMessageType('error');
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="max-w-lg mx-auto p-4">
      <div className="flex items-center gap-2 mb-4">
        <Link to="/" className="text-muted-foreground text-sm hover:underline">← ホーム</Link>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>データ管理</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground mb-2">
              全大会データをJSONファイルとしてエクスポート/インポートできます。
              別端末へのデータ移行やバックアップにご利用ください。
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleExport} disabled={tournaments.length === 0}>
              エクスポート（{tournaments.length}件）
            </Button>
            <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
              インポート
            </Button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />
          </div>

          {message && (
            <p className={`text-sm ${
              messageType === 'error' ? 'text-destructive' :
              messageType === 'warning' ? 'text-yellow-600' :
              'text-primary'
            }`}>
              {message}
            </p>
          )}

          {importErrors.length > 0 && (
            <div className="p-3 bg-muted rounded text-xs space-y-1">
              {importErrors.map((err, i) => (
                <div key={i} className="text-muted-foreground">{err}</div>
              ))}
            </div>
          )}

          <div className="border-t border-border pt-4">
            <p className="text-xs text-muted-foreground">
              データはブラウザのローカルストレージに保存されています。
              ブラウザのデータを消去するとデータが失われます。定期的にエクスポートしてバックアップしてください。
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
