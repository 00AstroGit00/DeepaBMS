__d(function(g,   _r,   _i,   a,   m,   e,   d)   {
  
  
  "use strict";
  
  
  Object.defineProperty(e,   '__esModule',      {
    
    
    value:!0
  
  
  }),   e.renderPDF=function(t,   o)   {
    
    
    return`<!DOCTYPE html><html><head><meta charset="UTF-8"><style>\n  @page { margin: 18mm 14mm; }\n  body{font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:12px;margin:0}\n  .letterhead{border-bottom:3px double #8B2E2E;padding-bottom:10px;display:flex;justify-content:space-between;align-items:flex-end}\n  .biz{font-size:19px;font-weight:bold;color:#8B2E2E;letter-spacing:.4px}\n  .addr{font-size:10.5px;color:#555;margin-top:3px;line-height:1.5}\n  .meta{text-align:right;font-size:10.5px;color:#555;line-height:1.6}\n  .rtitle{text-align:center;margin:16px 0 2px;font-size:15px;font-weight:bold;letter-spacing:1px;text-decoration:underline}\n  .rperiod{text-align:center;font-size:11.5px;color:#444;margin-bottom:14px}\n  .sec{background:#F3EAE8;color:#8B2E2E;font-weight:bold;font-size:12px;padding:5px 9px;margin:16px 0 0;border-left:4px solid #8B2E2E}\n  table{width:100%;border-collapse:collapse;margin-top:6px}\n  th{background:#8B2E2E;color:#fff;font-size:10px;padding:5px 7px;text-align:left;text-transform:uppercase;letter-spacing:.4px}\n  th.r{text-align:right}\n  td{border-bottom:1px solid #ddd;font-size:11px;padding:4.5px 7px;vertical-align:top}\n  td.r{text-align:right;font-variant-numeric:tabular-nums}\n  td.nil{text-align:center;color:#999;font-style:italic}\n  tr.tot td{border-top:2px solid #1a1a1a;border-bottom:2px double #1a1a1a;font-weight:bold;background:#FAF5F4}\n  .sumwrap{margin-top:18px;border:1.5px solid #8B2E2E;border-radius:4px;overflow:hidden}\n  .sumhead{background:#8B2E2E;color:#fff;font-weight:bold;font-size:11px;padding:5px 10px;letter-spacing:.6px}\n  .sumrow{display:flex;justify-content:space-between;padding:5px 10px;border-bottom:1px solid #eee;font-size:11.5px}\n  .sumrow b{font-variant-numeric:tabular-nums}\n  .notes{margin-top:16px;font-size:10px;color:#555}\n  .notes .nh{font-weight:bold;color:#333;margin-bottom:3px;font-size:10.5px}\n  .notes ol{margin:2px 0 0 16px;padding:0;line-height:1.6}\n  .signs{display:flex;justify-content:space-between;margin-top:44px}\n  .sign{width:30%;text-align:center;font-size:10.5px;color:#333}\n  .sign .line{border-top:1px solid #333;padding-top:5px;margin-top:34px}\n  .foot{margin-top:24px;padding-top:8px;border-top:1px solid #ccc;font-size:9px;color:#999;display:flex;justify-content:space-between}\n  </style></head><body>\n\n  <div class="letterhead">\n    <div>\n      <div class="biz">${n(o.businessName.toUpperCase())}</div>\n      <div class="addr">${n(o.place)}, Kerala, India<br/>GSTIN: ${n(o.gstin)} &nbsp;|&nbsp; FL-3 Bar Licence &nbsp;|&nbsp; 3-Star Classified</div>\n    </div>\n    <div class="meta">\n      Report No: <b>${n(t.code)}</b><br/>\n      Generated: ${(new Date).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'})}<br/>\n      System: Deepa BMS v1.0\n    </div>\n  </div>\n\n  <div class="rtitle">${n(t.title)}</div>\n  <div class="rperiod">${n(t.period)}</div>\n\n  ${t.sections.map(t=>`\n    $   {
      
      
      t.heading?`<div class="sec">${n(t.heading)}</div>`:''
    
    
    }
    
    \n    <table>\n      <thead><tr>$   {
      
      
      t.headers.map((o,   s)=>`<th class="${'r'===t.align[s]?'r':''}">${n(o)}</th>`).join('')
    
    
    }
    
    </tr></thead>\n      <tbody>\n        $   {
      
      
      0===t.rows.length?`<tr><td colspan="${t.headers.length}" class="nil">- Nil -</td></tr>`:''
    
    
    }
    
    \n        $   {
      
      
      t.rows.map(o=>`<tr>${o.map((o,s)=>`<td class="${'r'===t.align[s]?'r':''}">$   {
        
        
        n(o)
      
      
      }
      
      </td>`).join('')}</tr>`).join('')
    
    
    }
    
    \n        $   {
      
      
      t.totalsRow?`<tr class="tot">${t.totalsRow.map((o,s)=>`<td class="${'r'===t.align[s]?'r':''}">$   {
        
        
        n(o)
      
      
      }
      
      </td>`).join('')}</tr>`:''
    
    
    }
    
    \n      </tbody>\n    </table>`).join('')}\n\n  <div class="sumwrap">\n    <div class="sumhead">EXECUTIVE SUMMARY</div>\n    ${t.summary.map(([t,o])=>`<div class="sumrow"><span>$   {
      
      
      n(t)
    
    
    }
    
    </span><b>$   {
      
      
      n(o)
    
    
    }
    
    </b></div>`).join('')}\n  </div>\n\n  ${t.notes.length?`<div class="notes"><div class="nh">Notes:</div><ol>$   {
      
      
      t.notes.map(t=>`<li>${n(t)}</li>`).join('')
    
    
    }
    
    </ol></div>`:''}\n\n  <div class="signs">\n    <div class="sign"><div class="line">Prepared by</div></div>\n    <div class="sign"><div class="line">Checked by (Manager)</div></div>\n    <div class="sign"><div class="line">Proprietor</div></div>\n  </div>\n\n  <div class="foot">\n    <span>${n(o.businessName)} \xb7 ${n(t.code)}</span>\n    <span>System-generated from Deepa BMS. Figures in Indian Rupees.</span>\n  </div>\n  </body></html>`
  
  
  },   e.renderExcel=function(t,   o)   {
    
    
    const s=Math.max(...t.sections.map(t=>t.headers.length),   2);
    
    
    return`<html xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="UTF-8"><style>\n  td,th{border:.5pt solid #bbb;padding:3px 7px;font-family:Calibri,Arial;font-size:11px;mso-number-format:'\\@'}\n  th{background:#8B2E2E;color:#fff;font-weight:bold}\n  .title{font-size:15px;font-weight:bold;color:#8B2E2E;border:none}\n  .sub{font-size:10px;color:#555;border:none}\n  .sec{background:#F3EAE8;color:#8B2E2E;font-weight:bold}\n  .tot td,tr.tot td{font-weight:bold;background:#FAF5F4;border-top:1.5pt solid #333}\n  .r{text-align:right}\n  .sumk{background:#FAF5F4;font-weight:bold}\n  </style></head><body><table>\n  <tr><td class="title" colspan="${s}">${n(o.businessName)}</td></tr>\n  <tr><td class="sub" colspan="${s}">${n(o.place)}, Kerala \xb7 GSTIN ${n(o.gstin)}</td></tr>\n  <tr><td class="sub" colspan="${s}">${n(t.title)} \xb7 ${n(t.period)} \xb7 Report No ${n(t.code)} \xb7 Generated ${(new Date).toLocaleString('en-IN')}</td></tr>\n  <tr><td colspan="${s}"></td></tr>\n  ${t.sections.map(t=>`\n    $   {
      
      
      t.heading?`<tr><td class="sec" colspan="${t.headers.length}">${n(t.heading)}</td></tr>`:''
    
    
    }
    
    \n    <tr>$   {
      
      
      t.headers.map(t=>`<th>${n(t)}</th>`).join('')
    
    
    }
    
    </tr>\n    $   {
      
      
      t.rows.map(o=>`<tr>${o.map((o,s)=>`<td class="${'r'===t.align[s]?'r':''}">$   {
        
        
        n(o)
      
      
      }
      
      </td>`).join('')}</tr>`).join('')
    
    
    }
    
    \n    $   {
      
      
      t.totalsRow?`<tr class="tot">${t.totalsRow.map(t=>`<td>$   {
        
        
        n(t)
      
      
      }
      
      </td>`).join('')}</tr>`:''
    
    
    }
    
    \n    <tr><td colspan="${t.headers.length}"></td></tr>`).join('')}\n  <tr><td class="sec" colspan="2">EXECUTIVE SUMMARY</td></tr>\n  ${t.summary.map(([t,o])=>`<tr><td class="sumk">$   {
      
      
      n(t)
    
    
    }
    
    </td><td class="r">$   {
      
      
      n(o)
    
    
    }
    
    </td></tr>`).join('')}\n  <tr><td colspan="${s}"></td></tr>\n  ${t.notes.map((t,o)=>`<tr><td class="sub" colspan="${s}">Note $   {
      
      
      o+1
    
    
    }
    
    : $   {
      
      
      n(t)
    
    
    }
    
    </td></tr>`).join('')}\n  </table></body></html>`
  
  
  },   e.renderCSV=function(n,   o)   {
    
    
    const s=[];
    
    
    s.push((0,   t.toCSV)(['# Field',   'Value'],   [['# Business',   o.businessName],   ['# Location',   `${o.place}, Kerala`],   ['# GSTIN',   o.gstin],   ['# Report',   n.title],   ['# Report No',   n.code],   ['# Period',   n.period],   ['# Generated',   (new Date).toISOString()]])),   s.push('');
    
    
    for(const o of n.sections)o.heading&&s.push((0,   t.toCSV)([`## ${o.heading}`],   [])),   s.push((0,   t.toCSV)(o.headers,   o.rows)),   o.totalsRow&&s.push((0,   t.toCSV)([],   [o.totalsRow]).replace(/^\n/,   '')),   s.push('');
    
    
    return s.push((0,   t.toCSV)(['## EXECUTIVE SUMMARY'],   [])),   s.push((0,   t.toCSV)(['Item',   'Value'],   n.summary)),   s.join('\n')
  
  
  };
  
  
  var t=_r(d[0]);
  
  
  const n=t=>String(t??'').replace(/&/g,   '&amp;').replace(/</g,   '&lt;').replace(/>/g,   '&gt;')


},   947,   [939])