import { PrintableReport } from './ledgerBuilders';
import { GeneralSettings } from '../context/StoreContext';

const escapeHtml = (val: any): string => {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

// ─── Shared helpers ──────────────────────────────────────────────────────────

const isZeroCell = (val: string) => {
  const n = parseFloat(val.replace(/,/g, ''));
  return !isNaN(n) && n === 0;
};

const isAmountHeader = (h: string) =>
  /(rs|amount|total|cgst|sgst|gst|tax|cash|bank|bill|advance|outstanding|payable|receivable|income|expense|profit|loss|value|net)/i.test(h);

// ═══════════════════════════════════════════════════════════════════════════════
// PDF RENDERER — Tally-style professional print format
// ═══════════════════════════════════════════════════════════════════════════════

export const renderPDF = (report: PrintableReport, settings: GeneralSettings): string => {
  const timestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });

  const sectionsHtml = report.sections
    .map((sec) => {
      const headingHtml = sec.heading
        ? `<div class="sec-heading">${escapeHtml(sec.heading)}</div>`
        : '';

      const thCells = sec.headers
        .map((h, i) => {
          const align = sec.align[i] === 'r' ? 'right' : sec.align[i] === 'c' ? 'center' : 'left';
          return `<th style="text-align:${align}">${escapeHtml(h)}</th>`;
        })
        .join('');

      const emptyRowHtml =
        sec.rows.length === 0
          ? `<tr><td colspan="${sec.headers.length}" class="nil-row">— No entries for this period —</td></tr>`
          : '';

      const rowsHtml = sec.rows
        .map((row, ri) => {
          const rowClass = ri % 2 === 1 ? ' class="stripe"' : '';
          const cells = row
            .map((cell, idx) => {
              const align = sec.align[idx] === 'r' ? 'right' : sec.align[idx] === 'c' ? 'center' : 'left';
              const dimCell = isZeroCell(cell) ? ' style="color:#bbb;text-align:' + align + '"' : ` style="text-align:${align}"`;
              return `<td${dimCell}>${escapeHtml(cell)}</td>`;
            })
            .join('');
          return `<tr${rowClass}>${cells}</tr>`;
        })
        .join('');

      const totalsHtml = sec.totalsRow
        ? `<tr class="totals-row">${sec.totalsRow
            .map((t, idx) => {
              const align = sec.align[idx] === 'r' ? 'right' : sec.align[idx] === 'c' ? 'center' : 'left';
              return `<td style="text-align:${align}">${escapeHtml(t)}</td>`;
            })
            .join('')}</tr>`
        : '';

      return `${headingHtml}<table class="data-table"><thead><tr>${thCells}</tr></thead><tbody>${emptyRowHtml}${rowsHtml}${totalsHtml}</tbody></table>`;
    })
    .join('<div class="section-gap"></div>');

  const summaryHtml = report.summary
    .map(([key, val], idx) => {
      const isTotal =
        key.toLowerCase().startsWith('net') ||
        key.toLowerCase().startsWith('total') ||
        idx === report.summary.length - 1;
      return `<tr class="${isTotal ? 'sum-total' : 'sum-row'}"><td>${escapeHtml(key)}</td><td class="sum-val">${escapeHtml(val)}</td></tr>`;
    })
    .join('');

  const notesHtml = report.notes.length
    ? `<div class="notes-block"><div class="notes-title">Notes &amp; Compliance Remarks</div><ol class="notes-list">${report.notes.map((n) => `<li>${escapeHtml(n)}</li>`).join('')}</ol></div>`
    : '';

  const css = `
    @page { size: A4; margin: 16mm 14mm 18mm 14mm; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'Courier New', Courier, monospace; font-size: 10.5pt; color: #111; line-height: 1.45; background: #fff; }
    .letterhead { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 8px; border-bottom: 2px solid #1a1a1a; margin-bottom: 10px; }
    .biz-name { font-size: 16pt; font-weight: bold; letter-spacing: 0.5px; color: #1a1a1a; font-family: Arial, sans-serif; }
    .biz-details { font-size: 8.5pt; color: #444; margin-top: 3px; line-height: 1.6; font-family: Arial, sans-serif; }
    .report-meta { text-align: right; font-size: 8.5pt; color: #444; line-height: 1.7; font-family: Arial, sans-serif; }
    .report-meta b { color: #1a1a1a; }
    .report-title-block { text-align: center; margin: 12px 0 6px; border-top: 1px solid #888; border-bottom: 1px solid #888; padding: 6px 0; }
    .report-title { font-size: 13pt; font-weight: bold; letter-spacing: 1.5px; text-transform: uppercase; font-family: Arial, sans-serif; color: #1a1a1a; }
    .report-period { font-size: 9pt; color: #555; margin-top: 2px; font-family: Arial, sans-serif; }
    .sec-heading { font-family: Arial, sans-serif; font-size: 9.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.6px; padding: 5px 8px; background: #1a1a1a; color: #fff; margin-top: 14px; page-break-after: avoid; break-after: avoid; }
    .section-gap { height: 18px; }
    .data-table { width: 100%; border-collapse: collapse; font-size: 9.5pt; page-break-inside: auto; }
    .data-table thead tr { background: #333; color: #fff; }
    .data-table th { font-family: Arial, sans-serif; font-size: 8.5pt; font-weight: bold; padding: 5px 7px; letter-spacing: 0.3px; text-transform: uppercase; border: 1px solid #444; }
    .data-table td { padding: 4px 7px; border: 1px solid #ccc; vertical-align: top; font-size: 9.5pt; }
    .data-table tr.stripe td { background: #f7f7f7; }
    .data-table tr.totals-row td { font-weight: bold; background: #eee; border-top: 2px solid #111; border-bottom: 2.5pt double #111; font-size: 9.5pt; }
    .nil-row { text-align: center; color: #888; font-style: italic; padding: 10px !important; }
    .summary-wrap { margin-top: 18px; page-break-inside: avoid; border: 1.5px solid #1a1a1a; }
    .summary-header { background: #1a1a1a; color: #fff; font-family: Arial, sans-serif; font-size: 8.5pt; font-weight: bold; letter-spacing: 1px; padding: 5px 8px; text-transform: uppercase; }
    .summary-table { width: 100%; border-collapse: collapse; }
    .summary-table tr.sum-row td { padding: 4px 8px; border-bottom: 1px solid #ddd; font-size: 9.5pt; }
    .summary-table tr.sum-total td { padding: 5px 8px; font-weight: bold; font-size: 10pt; border-top: 1.5px solid #1a1a1a; border-bottom: 2px double #1a1a1a; background: #f0f0f0; }
    .sum-val { text-align: right; font-family: 'Courier New', Courier, monospace; white-space: nowrap; }
    .notes-block { margin-top: 16px; padding: 8px 10px; border: 1px solid #bbb; page-break-inside: avoid; background: #fafafa; }
    .notes-title { font-family: Arial, sans-serif; font-size: 8.5pt; font-weight: bold; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px; color: #333; }
    .notes-list { margin-left: 18px; font-size: 8.5pt; color: #555; line-height: 1.7; }
    .signature-block { display: flex; justify-content: space-between; margin-top: 48px; page-break-inside: avoid; }
    .sig-box { width: 28%; text-align: center; font-size: 8pt; color: #333; font-family: Arial, sans-serif; }
    .sig-line { border-top: 1px solid #333; margin-top: 36px; padding-top: 4px; }
    .page-footer { margin-top: 18px; padding-top: 6px; border-top: 1px solid #ccc; display: flex; justify-content: space-between; font-size: 7.5pt; color: #888; font-family: Arial, sans-serif; page-break-inside: avoid; }
    @media print { .data-table { page-break-inside: auto; } .data-table tr { page-break-inside: avoid; } .data-table thead { display: table-header-group; } }
  `;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>${css}</style>
</head>
<body>
  <div class="letterhead">
    <div>
      <div class="biz-name">${escapeHtml(settings.businessName.toUpperCase())}</div>
      <div class="biz-details">${escapeHtml(settings.place)}, Kerala, India<br>GSTIN: <b>${escapeHtml(settings.gstin)}</b> &nbsp;|&nbsp; FL-3 Bar Licence &nbsp;|&nbsp; 3-Star Classified Hotel</div>
    </div>
    <div class="report-meta">Report Ref: <b>${escapeHtml(report.code)}</b><br>Printed on: ${timestamp}<br>System: Deepa BMS v1.0</div>
  </div>
  <div class="report-title-block">
    <div class="report-title">${escapeHtml(report.title)}</div>
    <div class="report-period">${escapeHtml(report.period)}</div>
  </div>
  ${sectionsHtml}
  <div class="summary-wrap" style="margin-top:20px">
    <div class="summary-header">Executive Summary</div>
    <table class="summary-table"><tbody>${summaryHtml}</tbody></table>
  </div>
  ${notesHtml}
  <div class="signature-block">
    <div class="sig-box"><div class="sig-line">Prepared by</div></div>
    <div class="sig-box"><div class="sig-line">Verified by (Manager)</div></div>
    <div class="sig-box"><div class="sig-line">Proprietor / Authorised Signatory</div></div>
  </div>
  <div class="page-footer">
    <span>${escapeHtml(settings.businessName)} &nbsp;·&nbsp; Report: ${escapeHtml(report.code)}</span>
    <span>Computer-generated from Deepa BMS &nbsp;·&nbsp; Figures in Indian Rupees (INR) &nbsp;·&nbsp; ${timestamp}</span>
  </div>
</body>
</html>`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXCEL RENDERER — Tally-style XLS (HTML-as-Excel)
// ═══════════════════════════════════════════════════════════════════════════════

export const renderExcel = (report: PrintableReport, settings: GeneralSettings): string => {
  const maxCols = Math.max(...report.sections.map((sec) => sec.headers.length), 2);
  const timestamp = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const numFmt = (cell: string, header: string) =>
    isAmountHeader(header) && !isNaN(parseFloat(cell.replace(/,/g, '')));

  const sectionsHtml = report.sections
    .map((sec) => {
      const colCount = sec.headers.length;
      const pad = colCount < maxCols ? `<td class="blank" colspan="${maxCols - colCount}"></td>` : '';

      const headingRow = sec.heading
        ? `<tr><td class="section-head" colspan="${colCount}">${escapeHtml(sec.heading)}</td>${pad}</tr>`
        : '';

      const headerRow = `<tr>${sec.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}${pad}</tr>`;

      const dataRows = sec.rows.length === 0
        ? `<tr><td class="nil-cell" colspan="${colCount}">— No entries —</td>${pad}</tr>`
        : sec.rows.map((row, ri) => {
            const cls = ri % 2 === 1 ? ' class="alt"' : '';
            const cells = row.map((cell, idx) => {
              const numClass = sec.align[idx] === 'r' ? ' class="num"' : '';
              const isAmt = numFmt(cell, sec.headers[idx] || '');
              const numAttr = isAmt ? ` x:num="${cell.replace(/,/g, '')}"` : '';
              return `<td${numClass}${numAttr}>${escapeHtml(cell)}</td>`;
            }).join('');
            return `<tr${cls}>${cells}${pad}</tr>`;
          }).join('');

      const totRow = sec.totalsRow
        ? `<tr class="totals">${sec.totalsRow.map((t, idx) => {
            const numClass = sec.align[idx] === 'r' ? ' class="num"' : '';
            return `<td${numClass}>${escapeHtml(t)}</td>`;
          }).join('')}${pad}</tr>`
        : '';

      return `${headingRow}${headerRow}${dataRows}${totRow}<tr><td class="spacer" colspan="${maxCols}"></td></tr>`;
    })
    .join('');

  const summaryRows = report.summary
    .map(([key, val], idx) => {
      const isTotal = idx === report.summary.length - 1 ||
        key.toLowerCase().startsWith('net') ||
        key.toLowerCase().startsWith('total');
      const cls = isTotal ? 'sum-total' : 'sum-row';
      return `<tr class="${cls}"><td colspan="${Math.max(1, maxCols - 1)}">${escapeHtml(key)}</td><td class="num">${escapeHtml(val)}</td></tr>`;
    })
    .join('');

  const notesRows = report.notes.length
    ? `<tr><td class="spacer" colspan="${maxCols}"></td></tr>
       <tr><td class="notes-hdr" colspan="${maxCols}">Notes &amp; Compliance Remarks</td></tr>
       ${report.notes.map((n, i) => `<tr><td class="note-cell" colspan="${maxCols}">${i + 1}. ${escapeHtml(n)}</td></tr>`).join('')}`
    : '';

  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; color: #111; }
    table { border-collapse: collapse; width: 100%; }
    td, th { border: 0.75pt solid #bbb; padding: 4px 8px; mso-number-format:"\\@"; font-size: 10pt; vertical-align: middle; }
    .biz-title { font-size: 16pt; font-weight: bold; color: #1a1a1a; border: none; padding: 4px 6px; }
    .biz-sub { font-size: 9pt; color: #555; border: none; padding: 1px 6px; }
    .rpt-title { font-size: 13pt; font-weight: bold; text-decoration: underline; border: none; padding: 4px 6px; text-transform: uppercase; }
    .rpt-sub { font-size: 9pt; color: #555; border: none; padding: 1px 6px; }
    .blank { border: none; background: #fff; }
    .spacer { border: none; height: 6px; }
    .section-head { background: #1a1a1a; color: #fff; font-weight: bold; font-size: 9.5pt; text-transform: uppercase; letter-spacing: 0.5px; padding: 5px 8px; border: 1px solid #333; }
    th { background: #333; color: #fff; font-weight: bold; font-size: 9pt; text-transform: uppercase; letter-spacing: 0.3px; text-align: left; }
    .num { text-align: right; font-family: 'Courier New', Courier, monospace; mso-number-format:"\[\>\=10000000\]\#\#\\,\#\#\\,\#\#\\,\#\#0\.00\;\[\>\=100000\]\#\#\\,\#\#\\,\#\#0\.00\;\#\#\,\#\#0\.00"; }
    .alt { background: #f5f5f5; }
    .nil-cell { text-align: center; color: #888; font-style: italic; }
    .totals td { font-weight: bold; background: #e0e0e0; border-top: 2pt solid #111 !important; border-bottom: 2.5pt double #111 !important; font-size: 10.5pt; }
    .sum-section-head { background: #1a1a1a; color: #fff; font-weight: bold; font-size: 9.5pt; text-transform: uppercase; border: 1px solid #333; padding: 5px 8px; }
    .sum-row td { background: #fafafa; }
    .sum-total td { font-weight: bold; background: #e8e8e8; border-top: 2pt solid #111; border-bottom: 2.5pt double #111; font-size: 11pt; }
    .notes-hdr { font-weight: bold; background: #f0f0f0; font-size: 9.5pt; border-top: 2pt solid #555; }
    .note-cell { font-size: 9pt; color: #555; border: none; padding: 2px 6px; }
  </style>
</head>
<body>
<table>
  <tr><td class="biz-title" colspan="${maxCols}">${escapeHtml(settings.businessName.toUpperCase())}</td></tr>
  <tr><td class="biz-sub" colspan="${maxCols}">${escapeHtml(settings.place)}, Kerala, India &nbsp;·&nbsp; GSTIN: ${escapeHtml(settings.gstin)} &nbsp;·&nbsp; FL-3 Bar Licence</td></tr>
  <tr><td class="biz-sub" colspan="${maxCols}">System: Deepa BMS v1.0 &nbsp;·&nbsp; Printed: ${timestamp}</td></tr>
  <tr><td class="spacer" colspan="${maxCols}"></td></tr>
  <tr><td class="rpt-title" colspan="${maxCols}">${escapeHtml(report.title)}</td></tr>
  <tr><td class="rpt-sub" colspan="${maxCols}">${escapeHtml(report.period)} &nbsp;|&nbsp; Report Ref: ${escapeHtml(report.code)}</td></tr>
  <tr><td class="spacer" colspan="${maxCols}"></td></tr>
  ${sectionsHtml}
  <tr><td class="sum-section-head" colspan="${maxCols}">EXECUTIVE SUMMARY</td></tr>
  ${summaryRows}
  ${notesRows}
</table>
</body>
</html>`;
};

// ═══════════════════════════════════════════════════════════════════════════════
// CSV RENDERER — Tally-style structured CSV
// ═══════════════════════════════════════════════════════════════════════════════

export const renderCSV = (report: PrintableReport, settings: GeneralSettings): string => {
  const lines: string[] = [];
  const now = new Date().toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const esc = (val: any): string => {
    const s = String(val ?? '');
    if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
    return s;
  };

  const row = (...cols: string[]) => lines.push(cols.map(esc).join(','));
  const blank = () => lines.push('');
  const sep = (label: string) => { row('', `=== ${label.toUpperCase()} ===`); };

  // Document Header
  row('DEEPA BMS -- EXPORTED REPORT');
  blank();
  row('Business Name', settings.businessName);
  row('Location', `${settings.place}, Kerala, India`);
  row('GSTIN', settings.gstin);
  row('Bar Licence', 'FL-3');
  row('Report Title', report.title);
  row('Report Ref', report.code);
  row('Period', report.period);
  row('Printed On', now);
  row('System', 'Deepa BMS v1.0');
  blank();

  // Data Sections
  report.sections.forEach((sec, sIdx) => {
    sep(sec.heading || `Section ${sIdx + 1}`);
    blank();
    row(...sec.headers);
    if (sec.rows.length === 0) {
      row('(No entries for this period)');
    } else {
      sec.rows.forEach((r) => row(...r));
    }
    if (sec.totalsRow) {
      row(...sec.headers.map(() => ''));
      row(...sec.totalsRow);
    }
    blank();
  });

  // Executive Summary
  sep('EXECUTIVE SUMMARY');
  blank();
  row('Particulars', 'Value');
  report.summary.forEach(([key, val]) => row(key, val));
  blank();

  // Notes
  if (report.notes && report.notes.length > 0) {
    sep('NOTES AND COMPLIANCE REMARKS');
    blank();
    report.notes.forEach((note, idx) => { row(`Note ${idx + 1}`, note); });
    blank();
  }

  // Signature placeholder
  row('Prepared by', '', 'Checked by (Manager)', '', 'Proprietor');
  row('__________________', '', '__________________', '', '__________________');
  blank();
  row(`${settings.businessName} | ${report.code} | ${now} | Deepa BMS v1.0`);

  return lines.join('\n');
};
