/** CSV import preview dialog: shows parsed entries with validation before confirming. */
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { ParsedEntry } from './csv-helpers';

interface Props {
  csvPreview: ParsedEntry[];
  isDuplicateName: (name: string) => boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function CsvPreviewDialog({ csvPreview, isDuplicateName, onConfirm, onCancel }: Props) {
  return (
    <Card>
      <CardContent className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="font-medium text-sm">CSVプレビュー（{csvPreview.filter((e) => !e.error).length}件）</span>
          <Button variant="ghost" size="sm" onClick={onCancel}>×</Button>
        </div>
        <div className="max-h-48 overflow-y-auto space-y-1">
          {csvPreview.map((entry, i) => (
            <div key={i} className={`text-sm py-1 px-2 rounded ${
              entry.error ? 'bg-destructive/10 text-destructive' :
              isDuplicateName(entry.name) ? 'bg-yellow-50 text-yellow-700' :
              'bg-muted'
            }`}>
              {entry.error ? (
                <span>行{i + 1}: {entry.error}</span>
              ) : isDuplicateName(entry.name) ? (
                <span>{entry.name} （重複 — スキップ）</span>
              ) : (
                <span>
                  {entry.name}
                  {entry.members && entry.members.length > 0 && (
                    <span className="text-muted-foreground ml-1">({entry.members.join(', ')})</span>
                  )}
                </span>
              )}
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <Button size="sm" onClick={onConfirm}>
            {csvPreview.filter((e) => !e.error && !isDuplicateName(e.name)).length}件を登録
          </Button>
          <Button variant="outline" size="sm" onClick={onCancel}>キャンセル</Button>
        </div>
      </CardContent>
    </Card>
  );
}
