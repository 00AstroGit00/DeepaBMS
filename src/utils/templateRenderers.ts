import { toCSV } from './fileExporter';
import { PrintableReport } from './ledgerBuilders';
import { GeneralSettings } from '../context/StoreContext';

const escapeHtml = (val: any): string => {
  return String(val ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
};

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
      const headingHtml = sec.heading ? `<div class="sec">${escapeHtml(sec.heading)}</div>` : '';
      const headersHtml = sec.headers
        .map((h, i) => `<th class="${sec.align[i] === 'r' ? 'r' : ''}">${escapeHtml(h)}</th>`)
        .join('');

      const emptyRowHtml =
        sec.rows.length === 0
          ? `<tr><td colspan="${sec.headers.length}" class="nil">- Nil -</td></tr>`
          : '';

      const rowsHtml = sec.rows
        .map((row) => {
          const cells = row
            .map((cell, idx) => `<td class="${sec.align[idx] === 'r' ? 'r' : ''}">${escapeHtml(cell)}</td>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');

      const totalsHtml = sec.totalsRow
        ? `<tr class="tot">${sec.totalsRow
            .map((t, idx) => `<td class="${sec.align[idx] === 'r' ? 'r' : ''}">${escapeHtml(t)}</td>`)
            .join('')}</tr>`
        : '';

      return `
      ${headingHtml}
      <table>
        <thead>
          <tr>${headersHtml}</tr>
        </thead>
        <tbody>
          ${emptyRowHtml}
          ${rowsHtml}
          ${totalsHtml}
        </tbody>
      </table>`;
    })
    .join('');

  const summaryHtml = report.summary
    .map(
      ([key, val]) => `
    <div class="sumrow">
      <span>${escapeHtml(key)}</span>
      <b>${escapeHtml(val)}</b>
    </div>`
    )
    .join('');

  const notesHtml = report.notes.length
    ? `
    <div class="notes">
      <div class="nh">Notes:</div>
      <ol>
        ${report.notes.map((note) => `<li>${escapeHtml(note)}</li>`).join('')}
      </ol>
    </div>`
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { margin: 18mm 14mm; }
    body { font-family: Arial, Helvetica, sans-serif; color: #1a1a1a; font-size: 12px; margin: 0; }
    .letterhead { border-bottom: 3px double #8B2E2E; padding-bottom: 10px; display: flex; justify-content: space-between; align-items: flex-end; }
    .biz { font-size: 19px; font-weight: bold; color: #8B2E2E; letter-spacing: .4px; }
    .addr { font-size: 10.5px; color: #555; margin-top: 3px; line-height: 1.5; }
    .meta { text-align: right; font-size: 10.5px; color: #555; line-height: 1.6; }
    .rtitle { text-align: center; margin: 16px 0 2px; font-size: 15px; font-weight: bold; letter-spacing: 1px; text-decoration: underline; }
    .rperiod { text-align: center; font-size: 11.5px; color: #444; margin-bottom: 14px; }
    .sec { background: #F3EAE8; color: #8B2E2E; font-weight: bold; font-size: 12px; padding: 5px 9px; margin: 16px 0 0; border-left: 4px solid #8B2E2E; }
    table { width: 100%; border-collapse: collapse; margin-top: 6px; }
    th { background: #8B2E2E; color: #fff; font-size: 10px; padding: 5px 7px; text-align: left; text-transform: uppercase; letter-spacing: .4px; }
    th.r { text-align: right; }
    td { border-bottom: 1px solid #ddd; font-size: 11px; padding: 4.5px 7px; vertical-align: top; }
    td.r { text-align: right; font-variant-numeric: tabular-nums; }
    td.nil { text-align: center; color: #999; font-style: italic; }
    tr.tot td { border-top: 2px solid #1a1a1a; border-bottom: 2px double #1a1a1a; font-weight: bold; background: #FAF5F4; }
    .sumwrap { margin-top: 18px; border: 1.5px solid #8B2E2E; border-radius: 4px; overflow: hidden; page-break-inside: avoid; }
    .sumhead { background: #8B2E2E; color: #fff; font-weight: bold; font-size: 11px; padding: 5px 10px; letter-spacing: .6px; }
    .sumrow { display: flex; justify-content: space-between; padding: 5px 10px; border-bottom: 1px solid #eee; font-size: 11.5px; }
    .sumrow b { font-variant-numeric: tabular-nums; }
    .notes { margin-top: 16px; font-size: 10px; color: #555; page-break-inside: avoid; }
    .notes .nh { font-weight: bold; color: #333; margin-bottom: 3px; font-size: 10.5px; }
    .notes ol { margin: 2px 0 0 16px; padding: 0; line-height: 1.6; }
    .signs { display: flex; justify-content: space-between; margin-top: 44px; page-break-inside: avoid; }
    .sign { width: 30%; text-align: center; font-size: 10.5px; color: #333; }
    .sign .line { border-top: 1px solid #333; padding-top: 5px; margin-top: 34px; }
    .foot { margin-top: 24px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 9px; color: #999; display: flex; justify-content: space-between; page-break-inside: avoid; }
  </style>
</head>
<body>
  <div class="letterhead">
    <div>
      <div class="biz">${escapeHtml(settings.businessName.toUpperCase())}</div>
      <div class="addr">${escapeHtml(settings.place)}, Kerala, India<br/>GSTIN: ${escapeHtml(settings.gstin)} &nbsp;|&nbsp; FL-3 Bar Licence &nbsp;|&nbsp; 3-Star Classified</div>
    </div>
    <div class="meta">
      Report No: <b>${escapeHtml(report.code)}</b><br/>
      Generated: ${timestamp}<br/>
      System: Deepa BMS v1.0
    </div>
  </div>

  <div class="rtitle">${escapeHtml(report.title)}</div>
  <div class="rperiod">${escapeHtml(report.period)}</div>

  ${sectionsHtml}

  <div class="sumwrap">
    <div class="sumhead">EXECUTIVE SUMMARY</div>
    ${summaryHtml}
  </div>

  ${notesHtml}

  <div class="signs">
    <div class="sign"><div class="line">Prepared by</div></div>
    <div class="sign"><div class="line">Checked by (Manager)</div></div>
    <div class="sign"><div class="line">Proprietor</div></div>
  </div>

  <div class="foot">
    <span>${escapeHtml(settings.businessName)} · ${escapeHtml(report.code)}</span>
    <span>System-generated from Deepa BMS. Figures in Indian Rupees.</span>
  </div>
</body>
</html>`;
};

export const renderExcel = (report: PrintableReport, settings: GeneralSettings): string => {
  const maxCols = Math.max(...report.sections.map((sec) => sec.headers.length), 2);
  const timestamp = new Date().toLocaleString('en-IN');

  const sectionsHtml = report.sections
    .map((sec) => {
      const headingRow = sec.heading
        ? `<tr><td class="sec" colspan="${sec.headers.length}">${escapeHtml(sec.heading)}</td></tr>`
        : '';
      const headersRow = `<tr>${sec.headers.map((h) => `<th>${escapeHtml(h)}</th>`).join('')}</tr>`;

      const rowsHtml = sec.rows
        .map((row) => {
          const cells = row
            .map((cell, idx) => `<td class="${sec.align[idx] === 'r' ? 'r' : ''}">${escapeHtml(cell)}</td>`)
            .join('');
          return `<tr>${cells}</tr>`;
        })
        .join('');

      const totalsRowHtml = sec.totalsRow
        ? `<tr class="tot">${sec.totalsRow.map((t) => `<td>${escapeHtml(t)}</td>`).join('')}</tr>`
        : '';

      return `
      ${headingRow}
      ${headersRow}
      ${rowsHtml}
      ${totalsRowHtml}
      <tr><td colspan="${sec.headers.length}"></td></tr>`;
    })
    .join('');

  const summaryHtml = report.summary
    .map(
      ([key, val]) => `
    <tr>
      <td class="sumk">${escapeHtml(key)}</td>
      <td class="r">${escapeHtml(val)}</td>
    </tr>`
    )
    .join('');

  const notesHtml = report.notes
    .map(
      (note, idx) => `
    <tr>
      <td class="sub" colspan="${maxCols}">Note ${idx + 1}: ${escapeHtml(note)}</td>
    </tr>`
    )
    .join('');

  return `<html xmlns:x="urn:schemas-microsoft-com:office:excel">
<head>
  <meta charset="UTF-8">
  <style>
    td, th { border: .5pt solid #bbb; padding: 3px 7px; font-family: Calibri, Arial; font-size: 11px; mso-number-format: '\\@' }
    th { background: #8B2E2E; color: #fff; font-weight: bold }
    .title { font-size: 15px; font-weight: bold; color: #8B2E2E; border: none }
    .sub { font-size: 10px; color: #555; border: none }
    .sec { background: #F3EAE8; color: #8B2E2E; font-weight: bold }
    .tot td, tr.tot td { font-weight: bold; background: #FAF5F4; border-top: 1.5pt solid #333 }
    .r { text-align: right }
    .sumk { background: #FAF5F4; font-weight: bold }
  </style>
</head>
<body>
  <table>
    <tr><td class="title" colspan="${maxCols}">${escapeHtml(settings.businessName)}</td></tr>
    <tr><td class="sub" colspan="${maxCols}">${escapeHtml(settings.place)}, Kerala · GSTIN ${escapeHtml(settings.gstin)}</td></tr>
    <tr><td class="sub" colspan="${maxCols}">${escapeHtml(report.title)} · ${escapeHtml(report.period)} · Report No ${escapeHtml(report.code)} · Generated ${timestamp}</td></tr>
    <tr><td colspan="${maxCols}"></td></tr>
    ${sectionsHtml}
    <tr><td class="sec" colspan="2">EXECUTIVE SUMMARY</td></tr>
    ${summaryHtml}
    <tr><td colspan="${maxCols}"></td></tr>
    ${notesHtml}
  </table>
</body>
</html>`;
};

export const renderCSV = (report: PrintableReport, settings: GeneralSettings): string => {
  const parts: string[] = [];

  parts.push(
    toCSV(
      ['# Field', 'Value'],
      [
        ['# Business', settings.businessName],
        ['# Location', `${settings.place}, Kerala`],
        ['# GSTIN', settings.gstin],
        ['# Report', report.title],
        ['# Report No', report.code],
        ['# Period', report.period],
        ['# Generated', new Date().toISOString()]
      ]
    )
  );
  parts.push('');

  report.sections.forEach((sec) => {
    if (sec.heading) {
      parts.push(toCSV([`## ${sec.heading}`], []));
    }
    parts.push(toCSV(sec.headers, sec.rows));
    if (sec.totalsRow) {
      parts.push(toCSV([], [sec.totalsRow]).replace(/^\n/, ''));
    }
    parts.push('');
  });

  parts.push(toCSV(['## EXECUTIVE SUMMARY'], []));
  parts.push(toCSV(['Item', 'Value'], report.summary));

  return parts.join('\n');
};
