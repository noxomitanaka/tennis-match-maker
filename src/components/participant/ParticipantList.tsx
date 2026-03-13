/** Participant management: combines form, CSV preview, and list view. */
import type { Tournament } from '@/types';
import { useParticipants } from './useParticipants';
import { CsvPreviewDialog } from './CsvPreviewDialog';
import { ParticipantForm } from './ParticipantForm';
import { ParticipantListView } from './ParticipantListView';

interface Props {
  tournament: Tournament;
}

export function ParticipantList({ tournament }: Props) {
  const hook = useParticipants(tournament);

  const {
    csvPreview, setCsvPreview,
    isFull, maxP,
    activeCount, withdrawnCount, absentCount,
    canRemove,
    isDuplicateName,
    handleCsvConfirm,
    handleRemoveOrWithdraw,
  } = hook;

  return (
    <div className="space-y-4">
      {/* CSV Preview Dialog */}
      {csvPreview && (
        <CsvPreviewDialog
          csvPreview={csvPreview}
          isDuplicateName={isDuplicateName}
          onConfirm={handleCsvConfirm}
          onCancel={() => setCsvPreview(null)}
        />
      )}

      {!isFull && !csvPreview && (
        <ParticipantForm tournament={tournament} hook={hook} />
      )}

      {isFull && (
        <div className="p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
          定員（{maxP}{tournament.type === 'team' ? 'チーム' : '名'}）に達しています。
        </div>
      )}

      <div className="text-sm text-muted-foreground">
        {activeCount}{tournament.type === 'team' ? 'チーム' : '名'}参加中
        {maxP ? ` / 定員${maxP}` : ''}
        {absentCount > 0 && ` / ${absentCount}${tournament.type === 'team' ? 'チーム' : '名'}欠席`}
        {withdrawnCount > 0 && ` / ${withdrawnCount}${tournament.type === 'team' ? 'チーム' : '名'}棄権`}
      </div>

      <ParticipantListView
        tournament={tournament}
        canRemove={canRemove}
        onRemoveOrWithdraw={handleRemoveOrWithdraw}
      />
    </div>
  );
}
