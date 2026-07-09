__d(function(g,       _r,       _i,       _a,       _m,       _e,       _d)       {
  
  
  
  
  
  
  "use strict";
  
  
  
  
  
  
  function e(e)       {
    
    
    
    
    
    
    return e&&e.__esModule?e:       {
      
      
      
      
      
      
      default:e
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }
  
  
  Object.defineProperty(_e,       '__esModule',              {
    
    
    
    
    
    
    value:!0
  
  
  
  
  
  
  }),       Object.defineProperty(_e,       "default",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return y
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var t=_r(_d[0]),       o=e(_r(_d[1])),       a=e(_r(_d[2])),       r=e(_r(_d[3])),       s=e(_r(_d[4]));
  
  
  
  
  
  
  _r(_d[5]);
  
  
  
  
  
  
  var n=_r(_d[6]),       i=_r(_d[7]),       l=_r(_d[8]),       u=_r(_d[9]),       c=_r(_d[10]),       d=_r(_d[11]),       h=_r(_d[12]),       x=_r(_d[13]),       f=_r(_d[14]),       p=_r(_d[15]),       m=_r(_d[16]);
  
  
  
  
  
  
  function y()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e
    
    
    
    
    
    
    }
    
    =(0,       l.useTheme)(),              {
      
      
      
      
      
      
      state:y
    
    
    
    
    
    
    }
    
    =(0,       u.useStore)(),       [b,       S]=(0,       t.useState)('pl'),       j=(0,       t.useMemo)(()=>(0,       u.financeForMonth)(y),       [y]),       T=(0,       t.useMemo)(()=>(0,       u.cashInHand)(y),       [y]),       v=(0,       t.useMemo)(()=>(0,       u.bankBalance)(y),       [y]),       C=(0,       c.todayKey)().slice(0,       7),       k=(0,       t.useMemo)(()=>       {
      
      
      
      
      
      
      let e=0,       t=0,       o=0,       a=0,       r=0;
      
      
      
      
      
      
      for(const s of y.sales)(0,       c.keyOf)(s.date).startsWith(C)&&('rooms'===s.dept?(t+=s.gstAmount,       a+=s.amount):s.gstRate>0?(e+=s.gstAmount,       o+=s.amount):r+=s.total);
      
      
      
      
      
      
      return       {
        
        
        
        
        
        
        outFood:e,       outRooms:t,       taxFood:o,       taxRooms:a,       liquor:r,       tot:Math.round(.1*r),       total:e+t
      
      
      
      
      
      
      }
    
    
    
    
    
    
    },       [y,       C]),       R=(0,       t.useMemo)(()=>       {
      
      
      
      
      
      
      const e=new Map;
      
      
      
      
      
      
      for(const t of y.txns)'expense'===t.kind&&(0,       c.keyOf)(t.date).startsWith(C)&&e.set(t.category,       (e.get(t.category)||0)+t.amount);
      
      
      
      
      
      
      return Array.from(e.entries()).sort((e,       t)=>t[1]-e[1])
    
    
    
    
    
    
    },       [y,       C]),       w=(0,       t.useMemo)(()=>(0,       c.lastNDays)(14).map(e=>       {
      
      
      
      
      
      
      const t=(0,       u.financeForDay)(y,       e);
      
      
      
      
      
      
      return       {
        
        
        
        
        
        
        label:(0,       c.dayLabel)(e).charAt(0),       value:Math.max(0,       t.revenue+t.otherIncome-t.expenses)
      
      
      
      
      
      
      }
    
    
    
    
    
    
    }),       [y]),       [P,       G]=(0,       t.useState)('pl'),       [B,       F]=(0,       t.useState)(!1),       I=e=>       {
      
      
      
      
      
      
      switch(e)       {
        
        
        
        
        
        
        case'daybook':return(0,       f.buildDayBook)(y);
        
        
        
        
        
        
        case'sales':return(0,       f.buildSalesRegister)(y);
        
        
        
        
        
        
        case'expenses':return(0,       f.buildExpenseRegister)(y);
        
        
        
        
        
        
        case'gst':return(0,       f.buildGST)(y);
        
        
        
        
        
        
        case'guests':return(0,       f.buildGuestRegister)(y);
        
        
        
        
        
        
        case'credits':return(0,       f.buildCredits)(y);
        
        
        
        
        
        
        case'position':return(0,       f.buildPosition)(y);
        
        
        
        
        
        
        default:return(0,       f.buildPL)(y)
      
      
      
      
      
      
      }
    
    
    
    
    
    
    },       V=async e=>       {
      
      
      
      
      
      
      if(!B)       {
        
        
        
        
        
        
        F(!0);
        
        
        
        
        
        
        try       {
          
          
          
          
          
          
          const t=I(P),       o=t.code.replace(/\//g,       '-').toLowerCase();
          
          
          
          
          
          
          'CSV'===e?await(0,       x.saveTextFile)(`${o}.csv`,       (0,       p.renderCSV)(t,       y.settings),       'text/csv'):'Excel'===e?await(0,       x.saveTextFile)(`${o}.xls`,       (0,       p.renderExcel)(t,       y.settings),       'application/vnd.ms-excel'):await(0,       x.exportPDF)(o,       (0,       p.renderPDF)(t,       y.settings))
        
        
        
        
        
        
        }finally       {
          
          
          
          
          
          
          F(!1)
        
        
        
        
        
        
        }
      
      
      
      
      
      
      }
    
    
    
    
    
    
    },       z=(t,       o,       r=!1,       s)=>(0,       m.jsxs)(d.Row,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        justifyContent:'space-between',       paddingVertical:7
      
      
      
      
      
      
      },       children:[(0,       m.jsx)(a.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          color:r?e.text:e.sub,       fontSize:r?15:14,       fontWeight:r?'800':'500'
        
        
        
        
        
        
        },       children:t
      
      
      
      
      
      
      }),       (0,       m.jsx)(a.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          color:s||e.text,       fontSize:r?16:14,       fontWeight:r?'800':'600'
        
        
        
        
        
        
        },       children:o
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    },       t);
    
    
    
    
    
    
    return(0,       m.jsx)(n.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg
      
      
      
      
      
      
      },       edges:['top'],       children:(0,       m.jsxs)(r.default,              {
        
        
        
        
        
        
        contentContainerStyle:       {
          
          
          
          
          
          
          padding:16,       paddingBottom:40
        
        
        
        
        
        
        },       children:[(0,       m.jsx)(a.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:22,       fontWeight:'800',       color:e.text,       marginBottom:12
          
          
          
          
          
          
          },       children:"Reports"
        
        
        
        
        
        
        }),       (0,       m.jsx)(d.Segmented,              {
          
          
          
          
          
          
          options:[       {
            
            
            
            
            
            
            key:'pl',       label:'P&L'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'cash',       label:'Cash Flow'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'gst',       label:'GST'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'registers',       label:'Registers'
          
          
          
          
          
          
          }],       value:b,       onChange:S
        
        
        
        
        
        
        }),       'pl'===b&&(0,       m.jsxs)(o.default,              {
          
          
          
          
          
          
          children:[(0,       m.jsxs)(d.Card,              {
            
            
            
            
            
            
            children:[(0,       m.jsx)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'800',       color:e.text,       fontSize:16,       marginBottom:4
              
              
              
              
              
              
              },       children:"Profit & Loss - This Month"
            
            
            
            
            
            
            }),       (0,       m.jsx)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:12,       marginBottom:10
              
              
              
              
              
              
              },       children:y.settings.businessName
            
            
            
            
            
            
            }),       z('Restaurant sales',       (0,       c.inr)(j.restaurant)),       z('Bar sales',       (0,       c.inr)(j.bar)),       z('Room revenue',       (0,       c.inr)(j.rooms)),       z('Takeaway + online',       (0,       c.inr)(j.takeaway+j.online)),       z('Other income',       (0,       c.inr)(j.otherIncome)),       (0,       m.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                height:1,       backgroundColor:e.border,       marginVertical:6
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       z('Total income',       (0,       c.inr)(j.revenue+j.otherIncome),       !0,       e.green),       (0,       m.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                height:10
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       R.slice(0,       8).map(([e,       t])=>z(e,       '-'+(0,       c.inr)(t))),       (0,       m.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                height:1,       backgroundColor:e.border,       marginVertical:6
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       z('Total expenses',       '-'+(0,       c.inr)(j.expenses),       !0,       e.red),       (0,       m.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                height:1.5,       backgroundColor:e.text,       marginVertical:8,       opacity:.5
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       z('NET PROFIT / LOSS',       (j.profit>=0?'+':'')+(0,       c.inr)(j.profit),       !0,       j.profit>=0?e.green:e.red)]
          
          
          
          
          
          
          }),       (0,       m.jsx)(d.SectionTitle,              {
            
            
            
            
            
            
            children:"Expense Breakdown"
          
          
          
          
          
          
          }),       (0,       m.jsx)(d.Card,              {
            
            
            
            
            
            
            children:(0,       m.jsx)(h.HBarChart,              {
              
              
              
              
              
              
              data:R.slice(0,       6).map(([t,       o],       a)=>(       {
                
                
                
                
                
                
                label:t,       value:o,       color:[e.red,       e.amber,       e.blue,       e.purple,       e.teal,       e.primary][a]
              
              
              
              
              
              
              }))
            
            
            
            
            
            
            })
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       'cash'===b&&(0,       m.jsxs)(o.default,              {
          
          
          
          
          
          
          children:[(0,       m.jsxs)(d.Card,              {
            
            
            
            
            
            
            children:[(0,       m.jsx)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'800',       color:e.text,       fontSize:16,       marginBottom:10
              
              
              
              
              
              
              },       children:"Cash & Fund Position"
            
            
            
            
            
            
            }),       z('Cash in hand',       (0,       c.inr)(T),       !1,       e.green),       z('Bank balances (all accounts)',       (0,       c.inr)(v),       !1,       e.blue),       z('Customer credits receivable',       (0,       c.inr)((0,       u.customerOutstanding)(y)),       !1,       e.amber),       z('Vendor payables',       '-'+(0,       c.inr)((0,       u.vendorPayables)(y)),       !1,       e.red),       z('Inventory value',       (0,       c.inr)((0,       u.inventoryValue)(y))),       z('Liquor stock value',       (0,       c.inr)((0,       u.liquorStockValue)(y))),       (0,       m.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                height:1.5,       backgroundColor:e.text,       marginVertical:8,       opacity:.5
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       z('Net position',       (0,       c.inr)(T+v+(0,       u.customerOutstanding)(y)-(0,       u.vendorPayables)(y)+(0,       u.inventoryValue)(y)+(0,       u.liquorStockValue)(y)),       !0,       e.green)]
          
          
          
          
          
          
          }),       (0,       m.jsx)(d.SectionTitle,              {
            
            
            
            
            
            
            children:"Daily Net Cash Flow - 14 Days"
          
          
          
          
          
          
          }),       (0,       m.jsx)(d.Card,              {
            
            
            
            
            
            
            children:(0,       m.jsx)(h.BarChart,              {
              
              
              
              
              
              
              data:w,       height:110
            
            
            
            
            
            
            })
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       'gst'===b&&(0,       m.jsxs)(d.Card,              {
          
          
          
          
          
          
          children:[(0,       m.jsx)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              fontWeight:'800',       color:e.text,       fontSize:16,       marginBottom:4
            
            
            
            
            
            
            },       children:"GST & TOT Summary - This Month"
          
          
          
          
          
          
          }),       (0,       m.jsxs)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.faint,       fontSize:12,       marginBottom:10
            
            
            
            
            
            
            },       children:["GSTIN ",       y.settings.gstin,       " \xb7 GST 2.0 rates w.e.f. 22-Sep-2025"]
          
          
          
          
          
          
          }),       z('Restaurant / takeaway / online taxable',       (0,       c.inr)(k.taxFood)),       z('Output GST @ 5% (no ITC)',       (0,       c.inr)(k.outFood),       !1,       e.purple),       (0,       m.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              height:8
            
            
            
            
            
            
            }
          
          
          
          
          
          
          }),       z('Room taxable (tariff \u2264 \u20b97,500/day)',       (0,       c.inr)(k.taxRooms)),       z('Output GST @ 5% (no ITC)',       (0,       c.inr)(k.outRooms),       !1,       e.purple),       (0,       m.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              height:1.5,       backgroundColor:e.text,       marginVertical:8,       opacity:.5
            
            
            
            
            
            
            }
          
          
          
          
          
          
          }),       z('Total output GST payable',       (0,       c.inr)(k.total),       !0,       e.purple),       (0,       m.jsxs)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.faint,       fontSize:12,       marginTop:4
            
            
            
            
            
            
            },       children:["CGST ",       (0,       c.inr)(k.total/2,       2),       " + SGST ",       (0,       c.inr)(k.total/2,       2),       " \xb7 for GSTR-1 / GSTR-3B filing."]
          
          
          
          
          
          
          }),       (0,       m.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              height:14
            
            
            
            
            
            
            }
          
          
          
          
          
          
          }),       z('Liquor sales (outside GST)',       (0,       c.inr)(k.liquor),       !1,       e.amber),       z('Kerala Turnover Tax @ 10% (KGST S.5(2))',       (0,       c.inr)(k.tot),       !0,       e.amber),       (0,       m.jsx)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.faint,       fontSize:12,       marginTop:8
            
            
            
            
            
            
            },       children:"Under GST 2.0, hotels with tariff \u2264 \u20b97,500/day and their restaurants are taxed at 5% without input tax credit. Liquor served under the FL-3 bar licence is outside GST \u2014 bar-attached hotels pay 10% Turnover Tax on liquor sales under the KGST Act (file via KITIS portal), plus annual licence fee to Kerala Excise. Stock must be purchased only from KSBC/BEVCO warehouses."
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       'registers'===b&&(0,       m.jsx)(o.default,              {
          
          
          
          
          
          
          children:[       {
            
            
            
            
            
            
            t:'Sales Register',       d:`${y.sales.length} bills recorded`,       i:'receipt-outline',       c:e.green
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            t:'Purchase Register',       d:`${y.txns.filter(e=>['Provisions','Meat & Fish','Liquor Purchase','Soft Drinks Purchase'].includes(e.category)).length} purchase entries`,       i:'cart-outline',       c:e.blue
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            t:'Expense Register',       d:`${y.txns.filter(e=>'expense'===e.kind).length} expense entries`,       i:'wallet-outline',       c:e.red
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            t:'Guest Register',       d:`${y.stays.length} completed stays`,       i:'people-outline',       c:e.purple
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            t:'Stock Movement Register',       d:`${y.stockMoves.length} movements`,       i:'cube-outline',       c:e.teal
          
          
          
          
          
          
          }].map(t=>(0,       m.jsxs)(d.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              marginBottom:8,       padding:13,       flexDirection:'row',       alignItems:'center',       gap:12
            
            
            
            
            
            
            },       children:[(0,       m.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                width:38,       height:38,       borderRadius:12,       backgroundColor:e.cardAlt,       alignItems:'center',       justifyContent:'center'
              
              
              
              
              
              
              },       children:(0,       m.jsx)(i.Ionicons,              {
                
                
                
                
                
                
                name:t.i,       size:19,       color:t.c
              
              
              
              
              
              
              })
            
            
            
            
            
            
            }),       (0,       m.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                flex:1
              
              
              
              
              
              
              },       children:[(0,       m.jsx)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'700',       color:e.text,       fontSize:14
                
                
                
                
                
                
                },       children:t.t
              
              
              
              
              
              
              }),       (0,       m.jsx)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.faint,       fontSize:12,       marginTop:2
                
                
                
                
                
                
                },       children:t.d
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       m.jsx)(i.Ionicons,              {
              
              
              
              
              
              
              name:"checkmark-circle",       size:18,       color:e.green
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          },       t.t))
        
        
        
        
        
        
        }),       (0,       m.jsx)(d.SectionTitle,              {
          
          
          
          
          
          
          children:"Export & Share"
        
        
        
        
        
        
        }),       (0,       m.jsxs)(d.Card,              {
          
          
          
          
          
          
          children:[(0,       m.jsx)(d.Select,              {
            
            
            
            
            
            
            label:"What to export",       value:P,       onChange:e=>G(e),       options:[       {
              
              
              
              
              
              
              value:'pl',       label:'Profit & Loss Statement',       icon:'stats-chart-outline',       sub:'Classified income & expenses \xb7 this month'
            
            
            
            
            
            
            },              {
              
              
              
              
              
              
              value:'daybook',       label:'Day Book (Cash Book)',       icon:'book-outline',       sub:'Double-column: opening b/d \u2192 closing c/d \xb7 today'
            
            
            
            
            
            
            },              {
              
              
              
              
              
              
              value:'sales',       label:'Sales Register',       icon:'receipt-outline',       sub:'Invoice listing + GSTR-1 rate-wise summary'
            
            
            
            
            
            
            },              {
              
              
              
              
              
              
              value:'expenses',       label:'Expense Register',       icon:'wallet-outline',       sub:'Voucher listing + category analysis'
            
            
            
            
            
            
            },              {
              
              
              
              
              
              
              value:'gst',       label:'GST & TOT Summary',       icon:'document-text-outline',       sub:'GSTR-3B Table 3.1 layout + Kerala TOT annexure'
            
            
            
            
            
            
            },              {
              
              
              
              
              
              
              value:'guests',       label:'Guest Register',       icon:'people-outline',       sub:'In-house + departed \xb7 police-register format'
            
            
            
            
            
            
            },              {
              
              
              
              
              
              
              value:'credits',       label:'Credits & Payables',       icon:'card-outline',       sub:'Debtors/creditors with ageing buckets'
            
            
            
            
            
            
            },              {
              
              
              
              
              
              
              value:'position',       label:'Financial Position',       icon:'briefcase-outline',       sub:'Working capital: assets vs liabilities'
            
            
            
            
            
            
            }]
          
          
          
          
          
          
          }),       (0,       m.jsx)(d.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              gap:10
            
            
            
            
            
            
            },       children:['PDF',       'Excel',       'CSV'].map(t=>(0,       m.jsxs)(s.default,              {
              
              
              
              
              
              
              disabled:B,       onPress:()=>V(t),       style:       {
                
                
                
                
                
                
                flex:1,       backgroundColor:e.cardAlt,       borderWidth:1,       borderColor:e.border,       borderRadius:14,       paddingVertical:14,       alignItems:'center',       gap:5,       opacity:B?.5:1
              
              
              
              
              
              
              },       children:[(0,       m.jsx)(i.Ionicons,              {
                
                
                
                
                
                
                name:'PDF'===t?'document-outline':'Excel'===t?'grid-outline':'list-outline',       size:20,       color:e.primary
              
              
              
              
              
              
              }),       (0,       m.jsx)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'700',       color:e.text,       fontSize:13
                
                
                
                
                
                
                },       children:t
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            },       t))
          
          
          
          
          
          
          }),       (0,       m.jsx)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.faint,       fontSize:12,       marginTop:10
            
            
            
            
            
            
            },       children:'Desktop: CSV & Excel download instantly; PDF opens the print dialog \u2014 choose \u201cSave as PDF\u201d.'
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       937,       [51,       1108,       1153,       1179,       1290,       1095,       1249,       1291,       860,       853,       859,       918,       919,       938,       946,       947,       229])