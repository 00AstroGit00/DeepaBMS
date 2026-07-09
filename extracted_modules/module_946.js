__d(function(g,   _r,   _i,   _a,   _m,   _e,   _d)   {
  
  
  "use strict";
  
  
  Object.defineProperty(_e,   '__esModule',      {
    
    
    value:!0
  
  
  }),   _e.buildDayBook=function(n,   i=(0,   e.todayKey)())   {
    
    
    const l=[];
    
    
    for(const t of n.sales)   {
      
      
      if((0,   e.keyOf)(t.date)!==i)continue;
      
      
      const a='cash'===t.mode,   o='upi'===t.mode||'card'===t.mode||'bank'===t.mode;
      
      
      l.push(   {
        
        
        time:s(t.date),   iso:t.date,   particulars:`${t.dept.toUpperCase()} sale - ${t.description}`,   ref:t.billNo||'-',   cashIn:a?t.total:0,   bankIn:o?t.total:0,   cashOut:0,   bankOut:0
      
      
      })
    
    
    }
    
    for(const t of n.txns)   {
      
      
      if((0,   e.keyOf)(t.date)!==i)continue;
      
      
      const a='cash'===t.mode;
      
      
      'income'===t.kind?l.push(   {
        
        
        time:s(t.date),   iso:t.date,   particulars:`${t.category} - ${t.description}`,   ref:'-',   cashIn:a?t.amount:0,   bankIn:a?0:t.amount,   cashOut:0,   bankOut:0
      
      
      }):l.push(   {
        
        
        time:s(t.date),   iso:t.date,   particulars:`${t.category} - ${t.description}`,   ref:t.hasBill?'Bill att.':'-',   cashIn:0,   bankIn:0,   cashOut:a?t.amount:0,   bankOut:a?0:t.amount
      
      
      })
    
    
    }
    
    for(const t of n.bankMoves)(0,   e.keyOf)(t.date)===i&&('deposit'===t.kind?l.push(   {
      
      
      time:s(t.date),   iso:t.date,   particulars:`Contra - cash deposited to bank (${t.note})`,   ref:'C',   cashIn:0,   bankIn:t.amount,   cashOut:t.amount,   bankOut:0
    
    
    }):'withdraw'===t.kind?l.push(   {
      
      
      time:s(t.date),   iso:t.date,   particulars:`Contra - cash withdrawn from bank (${t.note})`,   ref:'C',   cashIn:t.amount,   bankIn:0,   cashOut:0,   bankOut:t.amount
    
    
    }):l.push(   {
      
      
      time:s(t.date),   iso:t.date,   particulars:`Bank transfer - ${t.note}`,   ref:'C',   cashIn:0,   bankIn:0,   cashOut:0,   bankOut:0
    
    
    }));
    
    
    l.sort((e,   t)=>e.iso.localeCompare(t.iso));
    
    
    const u=l.reduce((e,   t)=>e+t.cashIn,   0),   c=l.reduce((e,   t)=>e+t.bankIn,   0),   d=l.reduce((e,   t)=>e+t.cashOut,   0),   h=l.reduce((e,   t)=>e+t.bankOut,   0),   m=(0,   t.cashInHand)(n),   p=m-(u-d),   T=[['-',   'OPENING BALANCE b/d',   '-',   a(p),   '',   '',   ''],   ...l.map(e=>[e.time,   e.particulars,   e.ref,   e.cashIn?a(e.cashIn):'',   e.bankIn?a(e.bankIn):'',   e.cashOut?a(e.cashOut):'',   e.bankOut?a(e.bankOut):''])];
    
    
    return   {
      
      
      code:r('DRTH/DB'),   title:'DAY BOOK (Double-Column Cash Book)',   period:`For the day: ${o(i+'T12:00:00')}`,   sections:[   {
        
        
        headers:['Time',   'Particulars',   'Ref/Bill',   'Cash In (Rs)',   'Bank In (Rs)',   'Cash Out (Rs)',   'Bank Out (Rs)'],   align:['l',   'l',   'l',   'r',   'r',   'r',   'r'],   rows:T,   totalsRow:['',   'TOTAL',   '',   a(p+u),   a(c),   a(d),   a(h)]
      
      
      }],   summary:[['Opening Cash b/d',   `Rs ${a(p)}`],   ['Total Receipts (Cash + Bank)',   `Rs ${a(u+c)}`],   ['Total Payments (Cash + Bank)',   `Rs ${a(d+h)}`],   ['CLOSING CASH c/d',   `Rs ${a(m)}`]],   notes:['Ref "C" denotes contra entries (cash-bank transfers) - not income or expense.',   'Bank column includes UPI, card and NEFT settlements to the default current account.',   'Closing cash c/d becomes opening balance b/d of the next working day.']
    
    
    }
  
  
  },   _e.buildSalesRegister=function(t)   {
    
    
    const s=(0,   e.todayKey)().slice(0,   7),   i=t.sales.filter(t=>(0,   e.keyOf)(t.date).startsWith(s)).sort((e,   t)=>e.date.localeCompare(t.date)),   l=i.map((e,   t)=>[t+1,   o(e.date),   e.billNo||'-',   e.dept.toUpperCase(),   e.description,   a(e.amount),   e.gstRate?`${e.gstRate}%`:'NON-GST',   a(e.gstAmount/2),   a(e.gstAmount/2),   a(e.total),   e.mode.toUpperCase()]),   u=i.reduce((e,   t)=>e+t.amount,   0),   c=i.reduce((e,   t)=>e+t.gstAmount,   0),   d=i.reduce((e,   t)=>e+t.total,   0),   h=new Map;
    
    
    for(const e of i)   {
      
      
      const t=h.get(e.gstRate)||   {
        
        
        taxable:0,   tax:0
      
      
      };
      
      
      t.taxable+=e.amount,   t.tax+=e.gstAmount,   h.set(e.gstRate,   t)
    
    
    }
    
    const m=Array.from(h.entries()).sort((e,   t)=>t[0]-e[0]).map(([e,   t])=>[e?`${e}%`:'Non-GST (liquor)',   a(t.taxable),   a(t.tax/2),   a(t.tax/2),   a(t.taxable+t.tax)]);
    
    
    return   {
      
      
      code:r('DRTH/SR'),   title:'SALES REGISTER (Outward Supplies)',   period:`For the month: ${n()}`,   sections:[   {
        
        
        heading:'A. Invoice-level Listing',   headers:['Sl',   'Date',   'Bill No',   'Dept',   'Description',   'Taxable (Rs)',   'Rate',   'CGST (Rs)',   'SGST (Rs)',   'Total (Rs)',   'Mode'],   align:['r',   'l',   'l',   'l',   'l',   'r',   'l',   'r',   'r',   'r',   'l'],   rows:l,   totalsRow:['',   '',   '',   '',   'TOTAL',   a(u),   '',   a(c/2),   a(c/2),   a(d),   '']
      
      
      },      {
        
        
        heading:'B. Rate-wise Summary (for GSTR-1 / GSTR-3B Table 3.1)',   headers:['GST Rate',   'Taxable Value (Rs)',   'CGST (Rs)',   'SGST (Rs)',   'Invoice Value (Rs)'],   align:['l',   'r',   'r',   'r',   'r'],   rows:m,   totalsRow:['TOTAL',   a(u),   a(c/2),   a(c/2),   a(d)]
      
      
      }],   summary:[['Total invoices',   String(i.length)],   ['Taxable turnover',   `Rs ${a(u)}`],   ['Output GST (CGST+SGST)',   `Rs ${a(c)}`],   ['Gross sales',   `Rs ${a(d)}`]],   notes:['All supplies are intra-state (Kerala); IGST not applicable.',   'Liquor sales are non-GST supplies under Entry 54, State List; reported in GSTR-1 Table 8 as non-GST outward supply.',   'Restaurant & room services taxed @5% without ITC (GST 2.0, w.e.f. 22-Sep-2025).']
    
    
    }
  
  
  },   _e.buildExpenseRegister=function(t)   {
    
    
    const s=(0,   e.todayKey)().slice(0,   7),   i=t.txns.filter(t=>'expense'===t.kind&&(0,   e.keyOf)(t.date).startsWith(s)).sort((e,   t)=>e.date.localeCompare(t.date)),   l=i.map((e,   t)=>[t+1,   o(e.date),   e.category,   e.description,   e.mode.toUpperCase(),   e.hasBill?'Yes':'No',   a(e.amount)]),   u=i.reduce((e,   t)=>e+t.amount,   0),   c=new Map;
    
    
    for(const e of i)c.set(e.category,   (c.get(e.category)||0)+e.amount);
    
    
    const d=Array.from(c.entries()).sort((e,   t)=>t[1]-e[1]).map(([e,   t])=>[e,   a(t),   `${(t/(u||1)*100).toFixed(1)}%`]);
    
    
    return   {
      
      
      code:r('DRTH/ER'),   title:'EXPENSE REGISTER',   period:`For the month: ${n()}`,   sections:[   {
        
        
        heading:'A. Voucher-level Listing',   headers:['Sl',   'Date',   'Category',   'Particulars',   'Mode',   'Bill',   'Amount (Rs)'],   align:['r',   'l',   'l',   'l',   'l',   'l',   'r'],   rows:l,   totalsRow:['',   '',   '',   '',   '',   'TOTAL',   a(u)]
      
      
      },      {
        
        
        heading:'B. Category-wise Analysis',   headers:['Category',   'Amount (Rs)',   '% of Total'],   align:['l',   'r',   'r'],   rows:d,   totalsRow:['TOTAL',   a(u),   '100%']
      
      
      }],   summary:[['Total vouchers',   String(i.length)],   ['Total expenses',   `Rs ${a(u)}`],   ['With supporting bills',   `${i.filter(e=>e.hasBill).length} of ${i.length}`]],   notes:['Vouchers marked "Bill: Yes" carry scanned supporting documents inside Deepa BMS.']
    
    
    }
  
  
  },   _e.buildPL=function(o)   {
    
    
    const s=(0,   t.financeForMonth)(o),   i=(0,   e.todayKey)().slice(0,   7),   l=new Map;
    
    
    for(const t of o.txns)'expense'===t.kind&&(0,   e.keyOf)(t.date).startsWith(i)&&l.set(t.category,   (l.get(t.category)||0)+t.amount);
    
    
    const u=s.revenue+s.otherIncome,   c=[['Restaurant sales (incl. GST)',   a(s.restaurant)],   ['Bar sales (non-GST)',   a(s.bar)],   ['Room revenue (incl. GST)',   a(s.rooms)],   ['Takeaway & online orders',   a(s.takeaway+s.online)],   ['Other income',   a(s.otherIncome)]],   d=Array.from(l.entries()).sort((e,   t)=>t[1]-e[1]).map(([e,   t])=>[e,   a(t)]);
    
    
    return   {
      
      
      code:r('DRTH/PL'),   title:'PROFIT & LOSS STATEMENT',   period:`For the month: ${n()}`,   sections:[   {
        
        
        heading:'A. Income',   headers:['Particulars',   'Amount (Rs)'],   align:['l',   'r'],   rows:c,   totalsRow:['TOTAL INCOME (A)',   a(u)]
      
      
      },      {
        
        
        heading:'B. Expenses',   headers:['Particulars',   'Amount (Rs)'],   align:['l',   'r'],   rows:d,   totalsRow:['TOTAL EXPENSES (B)',   a(s.expenses)]
      
      
      },      {
        
        
        heading:'C. Result',   headers:['Particulars',   'Amount (Rs)'],   align:['l',   'r'],   rows:[[s.profit>=0?'NET PROFIT (A - B)':'NET LOSS (A - B)',   a(s.profit)]]
      
      
      }],   summary:[['Total income',   `Rs ${a(u)}`],   ['Total expenses',   `Rs ${a(s.expenses)}`],   ['Net result',   `Rs ${a(s.profit)} ${s.profit>=0?'(Profit)':'(Loss)'}`],   ['GST collected in period',   `Rs ${a(s.gstCollected)}`]],   notes:['Income figures are gross (inclusive of GST collected, which is a liability payable to Government).',   'Statement is on cash/day-book basis; depreciation, licence amortisation and stock adjustment are made at year-end by the accountant.']
    
    
    }
  
  
  },   _e.buildGST=function(t)   {
    
    
    const o=(0,   e.todayKey)().slice(0,   7);
    
    
    let s=0,   i=0,   l=0,   u=0,   c=0;
    
    
    for(const a of t.sales)(0,   e.keyOf)(a.date).startsWith(o)&&('rooms'===a.dept?(l+=a.amount,   u+=a.gstAmount):a.gstRate>0?(s+=a.amount,   i+=a.gstAmount):c+=a.total);
    
    
    const d=i+u,   h=Math.round(.1*c);
    
    
    return   {
      
      
      code:r('DRTH/GST'),   title:'GST & TURNOVER TAX SUMMARY',   period:`Tax period: ${n()}`,   sections:[   {
        
        
        heading:'A. Outward Taxable Supplies (GSTR-3B Table 3.1(a) basis)',   headers:['Nature of Supply',   'Rate',   'Taxable Value (Rs)',   'CGST (Rs)',   'SGST (Rs)',   'Total Tax (Rs)'],   align:['l',   'l',   'r',   'r',   'r',   'r'],   rows:[['Restaurant / takeaway / online (SAC 996331)',   '5%',   a(s),   a(i/2),   a(i/2),   a(i)],   ['Hotel accommodation, tariff <= Rs 7,500 (SAC 996311)',   '5%',   a(l),   a(u/2),   a(u/2),   a(u)]],   totalsRow:['TOTAL',   '',   a(s+l),   a(d/2),   a(d/2),   a(d)]
      
      
      },      {
        
        
        heading:'B. Non-GST Outward Supplies (GSTR-1 Table 8)',   headers:['Nature of Supply',   'Value (Rs)'],   align:['l',   'r'],   rows:[['Liquor for human consumption (FL-3 bar sales)',   a(c)]]
      
      
      },      {
        
        
        heading:'C. Kerala Turnover Tax on Liquor (KGST Act, S.5(2))',   headers:['Particulars',   'Amount (Rs)'],   align:['l',   'r'],   rows:[['Liquor turnover for the period',   a(c)],   ['Turnover Tax @ 10% (bar-attached hotel)',   a(h)]]
      
      
      }],   summary:[['Output GST payable (cash, no ITC)',   `Rs ${a(d)}`],   ['- CGST component',   `Rs ${a(d/2)}`],   ['- SGST component',   `Rs ${a(d/2)}`],   ['Kerala TOT payable (KITIS portal)',   `Rs ${a(h)}`]],   notes:['GST 2.0 rates effective 22-Sep-2025: restaurant service and hotel rooms (tariff <= Rs 7,500/day) attract 5% WITHOUT input tax credit.',   'All supplies are intra-state; IGST is nil. File GSTR-1 by the 11th and GSTR-3B by the 20th of the following month.',   'Liquor is outside GST. Turnover Tax @10% is filed separately under the KGST Act through the KITIS portal.',   'This summary is a filing aid - reconcile with the GSTN auto-populated GSTR-3B before submission.']
    
    
    }
  
  
  },   _e.buildGuestRegister=function(e)   {
    
    
    const t=[...e.stays].sort((e,   t)=>e.checkIn.localeCompare(t.checkIn)),   n=t.map((e,   t)=>[t+1,   e.guestName,   e.phone,   e.roomNo,   e.category,   `${o(e.checkIn)} ${s(e.checkIn)}`,   `${o(e.checkOut)} ${s(e.checkOut)}`,   e.nights,   a(e.amount),   e.mode.toUpperCase()]),   i=e.rooms.filter(e=>e.guest).map((e,   t)=>[t+1,   e.guest.name,   e.guest.phone,   e.guest.idProof,   e.no,   `${o(e.guest.checkIn)} ${s(e.guest.checkIn)}`,   e.guest.adults,   a(e.guest.advance)]),   l=t.reduce((e,   t)=>e+t.amount,   0);
    
    
    return   {
      
      
      code:r('DRTH/GR'),   title:'GUEST REGISTER (Arrival / Departure Record)',   period:`As on: ${o((new Date).toISOString())}`,   sections:[   {
        
        
        heading:'A. Guests Currently In House',   headers:['Sl',   'Guest Name',   'Phone',   'ID Proof',   'Room',   'Arrival',   'Pax',   'Advance (Rs)'],   align:['r',   'l',   'l',   'l',   'l',   'l',   'r',   'r'],   rows:i
      
      
      },      {
        
        
        heading:'B. Departed Guests (Completed Stays)',   headers:['Sl',   'Guest Name',   'Phone',   'Room',   'Category',   'Arrival',   'Departure',   'Nights',   'Bill (Rs)',   'Mode'],   align:['r',   'l',   'l',   'l',   'l',   'l',   'l',   'r',   'r',   'l'],   rows:n,   totalsRow:['',   '',   '',   '',   '',   '',   'TOTAL',   String(t.reduce((e,   t)=>e+t.nights,   0)),   a(l),   '']
      
      
      }],   summary:[['Guests in house',   String(i.length)],   ['Completed stays on record',   String(t.length)],   ['Room revenue (all stays listed)',   `Rs ${a(l)}`]],   notes:['Maintained as per Kerala Police lodging-house rules; produce on demand to authorities.',   'ID proof details of in-house guests are recorded at check-in and retained in the system.',   'Foreign nationals additionally require Form-C submission within 24 hours of arrival (via FRRO portal).']
    
    
    }
  
  
  },   _e.buildCredits=function(e)   {
    
    
    const t=e.credits.filter(e=>'customer'===e.type),   s=e.credits.filter(e=>'vendor'===e.type),   n=Date.now(),   i=e=>   {
      
      
      const t=e.history.find(e=>'credit'===e.kind);
      
      
      if(!t||0===e.balance)return'-';
      
      
      const a=Math.floor((n-new Date(t.date).getTime())/864e5);
      
      
      return a<=30?'0-30 days':a<=60?'31-60 days':'60+ days'
    
    
    },   l=t.sort((e,   t)=>t.balance-e.balance).map((e,   t)=>[t+1,   e.name,   e.phone,   i(e),   a(e.balance)]),   u=s.sort((e,   t)=>t.balance-e.balance).map((e,   t)=>[t+1,   e.name,   e.gstin||'-',   i(e),   a(e.balance)]),   c=t.reduce((e,   t)=>e+t.balance,   0),   d=s.reduce((e,   t)=>e+t.balance,   0);
    
    
    return   {
      
      
      code:r('DRTH/CR'),   title:'OUTSTANDING CREDITS & PAYABLES',   period:`As on: ${o((new Date).toISOString())}`,   sections:[   {
        
        
        heading:'A. Sundry Debtors (Customers who owe us)',   headers:['Sl',   'Customer',   'Phone',   'Ageing',   'Outstanding (Rs)'],   align:['r',   'l',   'l',   'l',   'r'],   rows:l,   totalsRow:['',   '',   '',   'TOTAL RECEIVABLE',   a(c)]
      
      
      },      {
        
        
        heading:'B. Sundry Creditors (Vendors we owe)',   headers:['Sl',   'Vendor',   'GSTIN',   'Ageing',   'Outstanding (Rs)'],   align:['r',   'l',   'l',   'l',   'r'],   rows:u,   totalsRow:['',   '',   '',   'TOTAL PAYABLE',   a(d)]
      
      
      }],   summary:[['Total receivable from customers',   `Rs ${a(c)}`],   ['Total payable to vendors',   `Rs ${a(d)}`],   ['Net position',   `Rs ${a(c-d)}`]],   notes:['Ageing is measured from the most recent credit extended. Follow up 60+ day receivables first.']
    
    
    }
  
  
  },   _e.buildPosition=function(e)   {
    
    
    const s=(0,   t.cashInHand)(e),   n=(0,   t.bankBalance)(e),   i=(0,   t.customerOutstanding)(e),   l=(0,   t.vendorPayables)(e),   u=(0,   t.inventoryValue)(e),   c=(0,   t.liquorStockValue)(e),   d=s+n+i+u+c;
    
    
    return   {
      
      
      code:r('DRTH/FP'),   title:'STATEMENT OF FINANCIAL POSITION (Working Capital)',   period:`As on: ${o((new Date).toISOString())}`,   sections:[   {
        
        
        heading:'A. Current Assets',   headers:['Particulars',   'Amount (Rs)'],   align:['l',   'r'],   rows:[['Cash in hand',   a(s)],   ['Bank balances (all accounts)',   a(n)],   ['Sundry debtors (customer credits)',   a(i)],   ['Inventory - food & consumables at cost',   a(u)],   ['Inventory - liquor stock at cost',   a(c)]],   totalsRow:['TOTAL CURRENT ASSETS',   a(d)]
      
      
      },      {
        
        
        heading:'B. Current Liabilities',   headers:['Particulars',   'Amount (Rs)'],   align:['l',   'r'],   rows:[['Sundry creditors (vendor payables)',   a(l)]],   totalsRow:['TOTAL CURRENT LIABILITIES',   a(l)]
      
      
      },      {
        
        
        heading:'C. Net Working Capital',   headers:['Particulars',   'Amount (Rs)'],   align:['l',   'r'],   rows:[['Net working capital (A - B)',   a(d-l)]]
      
      
      }],   summary:[['Total current assets',   `Rs ${a(d)}`],   ['Total current liabilities',   `Rs ${a(l)}`],   ['Net working capital',   `Rs ${a(d-l)}`]],   notes:['Fixed assets (building, kitchen equipment, furniture) are outside the scope of this operational statement.']
    
    
    }
  
  
  };
  
  
  var e=_r(_d[0]),   t=_r(_d[1]);
  
  
  const a=e=>e.toLocaleString('en-IN',      {
    
    
    maximumFractionDigits:2
  
  
  }),   o=e=>   {
    
    
    const t=new Date(e);
    
    
    return`${String(t.getDate()).padStart(2,'0')}-${t.toLocaleString('en-IN',{month:'short'})}-${t.getFullYear()}`
  
  
  },   s=e=>new Date(e).toLocaleTimeString('en-IN',      {
    
    
    hour:'2-digit',   minute:'2-digit'
  
  
  });
  
  
  function n()   {
    
    
    return(new Date).toLocaleDateString('en-IN',      {
      
      
      month:'long',   year:'numeric'
    
    
    })
  
  
  }
  
  
  function r(t)   {
    
    
    return`${t}/${(0,e.todayKey)().replace(/-/g,'')}`
  
  
  }


},   946,   [859,   853])