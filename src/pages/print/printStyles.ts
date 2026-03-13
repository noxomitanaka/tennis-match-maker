/** Print-specific CSS styles injected as a <style> tag. */
export const printStyles = `
/* Screen layout */
.print-page {
  max-width: 900px;
  margin: 0 auto;
  padding: 20px;
  font-family: "Helvetica Neue", "Hiragino Kaku Gothic ProN", "Meiryo", sans-serif;
  color: #1a1a1a;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding: 12px 16px;
  background: #f5f5f5;
  border-radius: 8px;
}

.back-link {
  color: #666;
  text-decoration: none;
  font-size: 14px;
}
.back-link:hover { text-decoration: underline; }

.print-btn {
  padding: 8px 24px;
  background: #1a1a1a;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  cursor: pointer;
}
.print-btn:hover { background: #333; }

/* Header */
.print-header {
  text-align: center;
  margin-bottom: 24px;
  padding-bottom: 12px;
  border-bottom: 2px solid #1a1a1a;
}
.print-header h1 {
  font-size: 22px;
  margin: 0 0 4px 0;
}
.print-meta {
  font-size: 13px;
  color: #666;
}

/* Section titles */
.section-title {
  font-size: 16px;
  margin: 24px 0 12px 0;
  padding-bottom: 4px;
  border-bottom: 1px solid #ccc;
}

/* ─── Round-Robin Grid ─── */
.group-section {
  margin-bottom: 32px;
  page-break-inside: avoid;
}
.group-title {
  font-size: 15px;
  margin: 16px 0 8px 0;
  font-weight: 700;
}

.league-grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 11px;
  table-layout: fixed;
}
.league-grid th,
.league-grid td {
  border: 1px solid #999;
  text-align: center;
  vertical-align: middle;
  padding: 2px;
}

.league-grid .name-col {
  width: auto;
  min-width: 80px;
  text-align: left;
}
.league-grid .match-col {
  width: 60px;
  font-weight: 700;
  background: #f0f0f0;
}
.league-grid .stat-col {
  width: 36px;
  font-weight: 700;
  background: #f0f0f0;
  font-size: 10px;
}

.name-cell {
  text-align: left !important;
  padding: 4px 6px !important;
  white-space: nowrap;
}
.player-label {
  display: inline-block;
  width: 18px;
  font-weight: 700;
  color: #666;
}
.player-name {
  font-weight: 500;
}

.diagonal-cell {
  background: #d0d0d0 !important;
}

.result-cell {
  height: 44px;
  vertical-align: middle;
  line-height: 1.3;
}
.result-mark {
  display: block;
  font-size: 14px;
  font-weight: 700;
}
.result-mark.win { color: #1a1a1a; }
.result-mark.loss { color: #999; }
.result-score {
  display: block;
  font-size: 9px;
  color: #666;
  margin-top: 1px;
}
.result-empty {
  display: block;
  min-height: 30px;
}

.stat-cell {
  font-size: 12px;
  font-weight: 500;
}
.stat-cell.rank {
  font-weight: 700;
  font-size: 14px;
}

tr.advancing .name-cell {
  background: #e8f5e9;
}
tr.advancing .stat-cell.rank {
  background: #e8f5e9;
}

/* Round schedule */
.round-schedule {
  margin-top: 8px;
  font-size: 11px;
}
.schedule-title {
  font-weight: 600;
  font-size: 11px;
  color: #666;
  margin-bottom: 4px;
}
.schedule-rounds {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.schedule-round {
  display: flex;
  align-items: center;
  gap: 6px;
}
.round-label {
  font-weight: 700;
  color: #666;
  min-width: 24px;
}
.match-pair {
  background: #f5f5f5;
  border: 1px solid #ddd;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
}

/* ─── Swiss Pairing Table ─── */
.swiss-round {
  margin-bottom: 20px;
  page-break-inside: avoid;
}

.pairing-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}
.pairing-table th,
.pairing-table td {
  border: 1px solid #999;
  padding: 6px 10px;
}
.pairing-table th {
  background: #f0f0f0;
  font-weight: 600;
  font-size: 11px;
}
.pairing-table .match-num {
  width: 32px;
  text-align: center;
}
.pairing-table .player-col {
  text-align: left;
}
.pairing-table .score-col {
  width: 100px;
  text-align: center;
  font-size: 12px;
  color: #666;
}
.pairing-table .winner {
  font-weight: 700;
}

/* ─── Standings Table ─── */
.swiss-standings {
  margin-top: 24px;
  page-break-inside: avoid;
}
.standings-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}
.standings-table th,
.standings-table td {
  border: 1px solid #999;
  padding: 4px 8px;
  text-align: center;
}
.standings-table th {
  background: #f0f0f0;
  font-weight: 600;
  font-size: 11px;
}
.standings-table .name-col {
  text-align: left;
}

/* ─── Bracket ─── */
.bracket-container {
  margin: 16px 0;
}
.bracket-flex {
  display: flex;
  gap: 8px;
  align-items: stretch;
}
.bracket-round {
  flex: 1;
  min-width: 100px;
  display: flex;
  flex-direction: column;
}
.round-header {
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #666;
  margin-bottom: 8px;
  padding: 2px 0;
  border-bottom: 1px solid #ccc;
}
.bracket-matches {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-around;
  gap: 4px;
}
.bracket-match {
  border: 1px solid #999;
  border-radius: 3px;
  font-size: 11px;
}
.bracket-match.bye {
  opacity: 0.5;
}
.bracket-slot {
  padding: 3px 6px;
  min-height: 20px;
  border-bottom: 1px solid #ddd;
}
.bracket-slot:last-child {
  border-bottom: none;
}
.bracket-slot.winner {
  font-weight: 700;
  background: #f0f0f0;
}
.slot-name {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.bracket-score {
  text-align: center;
  font-size: 9px;
  color: #666;
  padding: 1px 2px;
  border-bottom: 1px solid #ddd;
  min-height: 14px;
}

.third-place {
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px dashed #ccc;
  max-width: 200px;
}

/* ─── Print Media ─── */
@media print {
  .no-print { display: none !important; }

  @page {
    size: A4;
    margin: 12mm 10mm;
  }

  body {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .print-page {
    max-width: none;
    padding: 0;
    font-size: 11px;
  }

  .print-header {
    margin-bottom: 16px;
  }
  .print-header h1 {
    font-size: 18px;
  }

  .group-section {
    page-break-inside: avoid;
  }

  .page-break-before {
    page-break-before: always;
  }

  .swiss-round {
    page-break-inside: avoid;
  }

  .bracket-flex {
    gap: 4px;
  }
  .bracket-round {
    min-width: 80px;
  }
  .bracket-match {
    font-size: 10px;
  }
}
`;
