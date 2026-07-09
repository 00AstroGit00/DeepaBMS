__d(function(g,       _r,       _i,       _a,       m,       _e,       _d)       {
  
  
  
  
  
  
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
      
      
      
      
      
      
      return T
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var t=_r(_d[0]),       a=e(_r(_d[1])),       o=e(_r(_d[2])),       n=e(_r(_d[3])),       l=e(_r(_d[4])),       r=e(_r(_d[5])),       s=e(_r(_d[6])),       i=e(_r(_d[7]));
  
  
  
  
  
  
  _r(_d[8]),       _r(_d[9]);
  
  
  
  
  
  
  var d=_r(_d[10]),       c=_r(_d[11]),       u=_r(_d[12]),       f=_r(_d[13]),       h=_r(_d[14]),       p=_r(_d[15]),       y=_r(_d[16]),       x=_r(_d[17]),       j=_r(_d[18]),       b=_r(_d[19]),       S=_r(_d[20]);
  
  
  
  
  
  
  const v=[       {
    
    
    
    
    
    
    value:'Head Cook',       icon:'restaurant-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Cook',       icon:'restaurant-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Kitchen Helper',       icon:'restaurant-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Waiter',       icon:'cafe-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Bar Man',       icon:'wine-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Reception',       icon:'desktop-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Housekeeping',       icon:'bed-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Cleaner',       icon:'sparkles-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Security',       icon:'shield-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Manager',       icon:'briefcase-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Cashier',       icon:'cash-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Driver',       icon:'car-outline'
  
  
  
  
  
  
  }],       C=       {
    
    
    
    
    
    
    'Head Cook':22e3,       Cook:16e3,       'Kitchen Helper':11e3,       Waiter:12e3,       'Bar Man':15e3,       Reception:14e3,       Housekeeping:11e3,       Cleaner:1e4,       Security:12e3,       Manager:25e3,       Cashier:14e3,       Driver:13e3
  
  
  
  
  
  
  },       w=[       {
    
    
    
    
    
    
    value:'staff',       label:'Staff',       icon:'person-outline',       sub:'Attendance & leave requests only'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'manager',       label:'Manager',       icon:'briefcase-outline',       sub:'Approve leave, mark attendance, view payroll'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'owner',       label:'Owner',       icon:'key-outline',       sub:'Full access incl. salary edits & documents'
  
  
  
  
  
  
  }],       z=[       {
    
    
    
    
    
    
    value:'casual',       label:'Casual Leave',       icon:'sunny-outline',       sub:'From casual balance'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'sick',       label:'Sick Leave',       icon:'medkit-outline',       sub:'From sick balance'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'paid',       label:'Paid Leave',       icon:'cash-outline',       sub:'No balance deduction'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'unpaid',       label:'Unpaid Leave',       icon:'remove-circle-outline',       sub:'Salary deducted per day'
  
  
  
  
  
  
  }],       P=[       {
    
    
    
    
    
    
    value:'ID Proof',       icon:'finger-print-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Contract',       icon:'document-text-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Certificate',       icon:'ribbon-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Payslip',       icon:'receipt-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Other',       icon:'folder-outline'
  
  
  
  
  
  
  }];
  
  
  
  
  
  
  function T()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e
    
    
    
    
    
    
    }
    
    =(0,       u.useTheme)(),              {
      
      
      
      
      
      
      state:T,       dispatch:k
    
    
    
    
    
    
    }
    
    =(0,       f.useStore)(),       [I,       R]=(0,       t.useState)('overview'),       D=(0,       h.todayKey)(),       A=D.slice(0,       7),       B=(e,       t)=>       {
      
      
      
      
      
      
      window.alert(`${e}\n\n${t}`)
    
    
    
    
    
    
    },       W=e=>T.employees.find(t=>t.id===e)?.name||'Unknown',       E=(0,       t.useMemo)(()=>T.employees.filter(e=>'active'===e.status),       [T.employees]),       L=E.filter(e=>'P'===e.attendance[D]||'H'===e.attendance[D]).length,       O=E.filter(e=>'L'===e.attendance[D]).length,       N=T.leaves.filter(e=>'pending'===e.status),       H=(0,       t.useMemo)(()=>(0,       y.computePayroll)(T.employees,       T.leaves,       A),       [T.employees,       T.leaves,       A]),       M=(0,       t.useMemo)(()=>(0,       y.payrollTotals)(H),       [H]),       $=(0,       t.useMemo)(()=>       {
      
      
      
      
      
      
      const e=T.employees.flatMap(e=>e.reviews.map(e=>e.rating));
      
      
      
      
      
      
      return e.length?(e.reduce((e,       t)=>e+t,       0)/e.length).toFixed(1):'-'
    
    
    
    
    
    
    },       [T.employees]),       [V,       F]=(0,       t.useState)(''),       [_,       U]=(0,       t.useState)('all'),       [K,       q]=(0,       t.useState)(null),       [Y,       G]=(0,       t.useState)('profile'),       J=(0,       t.useMemo)(()=>T.employees.find(e=>e.id===K)||null,       [T.employees,       K]),       Q=(0,       t.useMemo)(()=>T.employees.filter(e=>'all'===_||e.role===_).filter(e=>!V||e.name.toLowerCase().includes(V.toLowerCase())||e.role.toLowerCase().includes(V.toLowerCase())||e.phone.includes(V)).sort((e,       t)=>e.status===t.status?e.name.localeCompare(t.name):'active'===e.status?-1:1),       [T.employees,       V,       _]),       X=(0,       t.useMemo)(()=>['all',       ...Array.from(new Set(T.employees.map(e=>e.role)))],       [T.employees]),       [Z,       ee]=(0,       t.useState)(!1),       [te,       ae]=(0,       t.useState)(!1),       [oe,       ne]=(0,       t.useState)(''),       [le,       re]=(0,       t.useState)(''),       [se,       ie]=(0,       t.useState)(''),       [de,       ce]=(0,       t.useState)(''),       [ue,       fe]=(0,       t.useState)('staff'),       [he,       me]=(0,       t.useState)(       {
      
      
      
      
      
      
      
    
    
    
    
    
    
    }),       pe=()=>       {
      
      
      
      
      
      
      const e=       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      };
      
      
      
      
      
      
      (!oe.trim()||oe.trim().length<3)&&(e.name='Enter the full name (min 3 characters)'),       le||(e.role='Select a role');
      
      
      
      
      
      
      10!==se.replace(/\D/g,       '').length&&(e.phone='Enter a valid 10-digit mobile number');
      
      
      
      
      
      
      const t=(0,       h.parseNum)(de);
      
      
      
      
      
      
      return(t<5e3||t>2e5)&&(e.salary='Salary should be between \u20b95,000 and \u20b92,00,000'),       me(e),       0===Object.keys(e).length
    
    
    
    
    
    
    },       [ge,       ye]=(0,       t.useState)(''),       [xe,       je]=(0,       t.useState)(4),       [be,       Se]=(0,       t.useState)(''),       [ve,       Ce]=(0,       t.useState)(''),       [we,       ze]=(0,       t.useState)('ID Proof'),       Pe=async e=>       {
      
      
      
      
      
      
      if(!J)return;
      
      
      
      
      
      
      const t='camera'===e?await(0,       x.captureBillPhoto)():'gallery'===e?await(0,       x.pickBillImage)():await(0,       x.pickBillDocument)();
      
      
      
      
      
      
      if(!t)return;
      
      
      
      
      
      
      const a=       {
        
        
        
        
        
        
        id:t.id,       name:t.name,       kind:t.kind,       uri:t.uri,       category:we,       addedOn:(new Date).toISOString()
      
      
      
      
      
      
      };
      
      
      
      
      
      
      k(       {
        
        
        
        
        
        
        type:'ADD_EMP_DOC',       empId:J.id,       doc:a
      
      
      
      
      
      
      })
    
    
    
    
    
    
    },       [Te,       ke]=(0,       t.useState)(0),       Ie=(0,       t.useMemo)(()=>(0,       h.dateKey)(new Date(Date.now()-864e5*Te)),       [Te]),       [Re,       De]=(0,       t.useState)([]),       Ae=e=>       {
      
      
      
      
      
      
      const t=Re.length?Re:E.map(e=>e.id);
      
      
      
      
      
      
      k(       {
        
        
        
        
        
        
        type:'BULK_ATTENDANCE',       empIds:t,       day:Ie,       status:e
      
      
      
      
      
      
      }),       De([])
    
    
    
    
    
    
    },       Be=t=>'P'===t?e.green:'H'===t?e.amber:'A'===t?e.red:'L'===t?e.blue:e.faint,       We=t=>'P'===t?e.greenSoft:'H'===t?e.amberSoft:'A'===t?e.redSoft:'L'===t?e.blueSoft:e.cardAlt,       [Ee,       Le]=(0,       t.useState)(!1),       [Oe,       Ne]=(0,       t.useState)(!1),       [He,       Me]=(0,       t.useState)(''),       [$e,       Ve]=(0,       t.useState)('casual'),       [Fe,       Ue]=(0,       t.useState)(D),       [Ke,       qe]=(0,       t.useState)('1'),       [Ye,       Ge]=(0,       t.useState)(''),       Je=(e,       t)=>k(       {
      
      
      
      
      
      
      type:'DECIDE_LEAVE',       leaveId:e,       status:t
    
    
    
    
    
    
    }),       [Qe,       Xe]=(0,       t.useState)(!1),       [Ze,       et]=(0,       t.useState)(''),       [tt,       at]=(0,       t.useState)(''),       [ot,       nt]=(0,       t.useState)('normal'),       lt=(t,       n,       r,       s,       i,       d)=>(0,       S.jsx)(l.default,              {
      
      
      
      
      
      
      disabled:!d,       onPress:d,       style:       {
        
        
        
        
        
        
        width:'48.5%'
      
      
      
      
      
      
      },       children:(0,       S.jsxs)(p.Card,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          padding:13
        
        
        
        
        
        
        },       children:[(0,       S.jsxs)(p.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            justifyContent:'space-between'
          
          
          
          
          
          
          },       children:[(0,       S.jsx)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              width:34,       height:34,       borderRadius:10,       backgroundColor:i,       alignItems:'center',       justifyContent:'center'
            
            
            
            
            
            
            },       children:(0,       S.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:r,       size:17,       color:s
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       d&&(0,       S.jsx)(c.Ionicons,              {
            
            
            
            
            
            
            name:"chevron-forward",       size:14,       color:e.faint
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       S.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:12,       color:e.sub,       marginTop:9
          
          
          
          
          
          
          },       children:t
        
        
        
        
        
        
        }),       (0,       S.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:17,       fontWeight:'800',       color:e.text,       marginTop:2
          
          
          
          
          
          
          },       children:n
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })
    
    
    
    
    
    
    },       t),       rt=(t,       a=14,       o)=>(0,       S.jsx)(p.Row,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        gap:3
      
      
      
      
      
      
      },       children:[1,       2,       3,       4,       5].map(n=>(0,       S.jsx)(l.default,              {
        
        
        
        
        
        
        disabled:!o,       onPress:()=>o?.(n),       children:(0,       S.jsx)(c.Ionicons,              {
          
          
          
          
          
          
          name:n<=t?'star':'star-outline',       size:a,       color:e.amber
        
        
        
        
        
        
        })
      
      
      
      
      
      
      },       n))
    
    
    
    
    
    
    });
    
    
    
    
    
    
    return(0,       S.jsxs)(d.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg
      
      
      
      
      
      
      },       edges:['bottom'],       children:[(0,       S.jsx)(a.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingTop:12
        
        
        
        
        
        
        },       children:(0,       S.jsx)(s.default,              {
          
          
          
          
          
          
          horizontal:!0,       showsHorizontalScrollIndicator:!1,       contentContainerStyle:       {
            
            
            
            
            
            
            gap:8,       paddingBottom:10
          
          
          
          
          
          
          },       children:[['overview',       'Overview',       'grid-outline'],       ['staff',       'Staff',       'people-outline'],       ['attendance',       'Attendance',       'checkbox-outline'],       ['payroll',       'Payroll',       'cash-outline'],       ['leave',       'Leave',       'calendar-outline'],       ['notices',       'Notices',       'megaphone-outline']].map(([t,       n,       r])=>(0,       S.jsxs)(l.default,              {
            
            
            
            
            
            
            onPress:()=>R(t),       style:       {
              
              
              
              
              
              
              flexDirection:'row',       alignItems:'center',       gap:6,       paddingHorizontal:13,       paddingVertical:8,       borderRadius:20,       backgroundColor:I===t?e.primary:e.card,       borderWidth:1,       borderColor:I===t?e.primary:e.border
            
            
            
            
            
            
            },       children:[(0,       S.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:r,       size:14,       color:I===t?'#fff':e.sub
            
            
            
            
            
            
            }),       (0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:I===t?'#fff':e.sub,       fontWeight:'700',       fontSize:13
              
              
              
              
              
              
              },       children:n
            
            
            
            
            
            
            }),       'leave'===t&&N.length>0&&(0,       S.jsx)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                backgroundColor:I===t?'#fff':e.red,       borderRadius:9,       minWidth:18,       height:18,       alignItems:'center',       justifyContent:'center',       paddingHorizontal:4
              
              
              
              
              
              
              },       children:(0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:I===t?e.primary:'#fff',       fontSize:10,       fontWeight:'800'
                
                
                
                
                
                
                },       children:N.length
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          },       t))
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       'overview'===I&&(0,       S.jsxs)(s.default,              {
        
        
        
        
        
        
        contentContainerStyle:       {
          
          
          
          
          
          
          padding:16,       paddingTop:4,       paddingBottom:40
        
        
        
        
        
        
        },       children:[(0,       S.jsxs)(a.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flexDirection:'row',       flexWrap:'wrap',       gap:10
          
          
          
          
          
          
          },       children:[lt('Active Staff',       String(E.length),       'people-outline',       e.primary,       e.primarySoft,       ()=>R('staff')),       lt('Present Today',       `${L}/${E.length}`,       'checkmark-circle-outline',       e.green,       e.greenSoft,       ()=>R('attendance')),       lt('On Leave Today',       String(O),       'calendar-outline',       e.blue,       e.blueSoft,       ()=>R('leave')),       lt('Pending Approvals',       String(N.length),       'hourglass-outline',       e.amber,       e.amberSoft,       ()=>R('leave')),       lt('Net Payroll (month)',       (0,       h.inr)(M.net),       'cash-outline',       e.teal,       e.tealSoft,       ()=>R('payroll')),       lt('Avg Performance',       `${$} / 5`,       'star-outline',       e.purple,       e.purpleSoft,       ()=>R('staff'))]
        
        
        
        
        
        
        }),       N.length>0&&(0,       S.jsx)(p.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginTop:14,       backgroundColor:e.amberSoft,       borderColor:e.amber
          
          
          
          
          
          
          },       children:(0,       S.jsxs)(p.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              gap:10
            
            
            
            
            
            
            },       children:[(0,       S.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:"hourglass-outline",       size:20,       color:e.amber
            
            
            
            
            
            
            }),       (0,       S.jsxs)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                flex:1
              
              
              
              
              
              
              },       children:[(0,       S.jsxs)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'700',       color:e.text,       fontSize:14
                
                
                
                
                
                
                },       children:[N.length,       " leave request",       N.length>1?'s':'',       " awaiting decision"]
              
              
              
              
              
              
              }),       (0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.sub,       fontSize:12,       marginTop:2
                
                
                
                
                
                
                },       numberOfLines:1,       children:N.map(e=>W(e.empId)).join(', ')
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       S.jsx)(l.default,              {
              
              
              
              
              
              
              onPress:()=>R('leave'),       style:       {
                
                
                
                
                
                
                backgroundColor:e.amber,       paddingHorizontal:12,       paddingVertical:7,       borderRadius:10
              
              
              
              
              
              
              },       children:(0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:'#fff',       fontWeight:'700',       fontSize:12
                
                
                
                
                
                
                },       children:"Review"
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       S.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:13,       fontWeight:'700',       color:e.sub,       textTransform:'uppercase',       letterSpacing:.5,       marginTop:20,       marginBottom:8
          
          
          
          
          
          
          },       children:"Latest Notices"
        
        
        
        
        
        
        }),       T.announcements.slice(0,       2).map(t=>(0,       S.jsxs)(p.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginBottom:8,       padding:13
          
          
          
          
          
          
          },       children:[(0,       S.jsxs)(p.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between'
            
            
            
            
            
            
            },       children:[(0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'700',       color:e.text,       fontSize:14,       flex:1
              
              
              
              
              
              
              },       children:t.title
            
            
            
            
            
            
            }),       'important'===t.priority&&(0,       S.jsx)(p.Badge,              {
              
              
              
              
              
              
              text:"IMPORTANT",       color:e.red,       soft:e.redSoft
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       S.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.sub,       fontSize:13,       marginTop:4
            
            
            
            
            
            
            },       numberOfLines:2,       children:t.body
          
          
          
          
          
          
          }),       (0,       S.jsxs)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.faint,       fontSize:11,       marginTop:6
            
            
            
            
            
            
            },       children:[t.author,       " \xb7 ",       (0,       h.fmtDate)(t.date)]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        },       t.id)),       (0,       S.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:13,       fontWeight:'700',       color:e.sub,       textTransform:'uppercase',       letterSpacing:.5,       marginTop:14,       marginBottom:8
          
          
          
          
          
          
          },       children:"Today at a Glance"
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.Card,              {
          
          
          
          
          
          
          children:E.map(t=>(0,       S.jsxs)(p.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between',       paddingVertical:7,       borderBottomWidth:1,       borderBottomColor:e.border
            
            
            
            
            
            
            },       children:[(0,       S.jsxs)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                gap:9,       flex:1
              
              
              
              
              
              
              },       children:[(0,       S.jsx)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  width:30,       height:30,       borderRadius:15,       backgroundColor:e.primarySoft,       alignItems:'center',       justifyContent:'center'
                
                
                
                
                
                
                },       children:(0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    fontWeight:'800',       color:e.primary,       fontSize:12
                  
                  
                  
                  
                  
                  
                  },       children:t.name.charAt(0)
                
                
                
                
                
                
                })
              
              
              
              
              
              
              }),       (0,       S.jsxs)(a.default,              {
                
                
                
                
                
                
                children:[(0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    fontWeight:'600',       color:e.text,       fontSize:13
                  
                  
                  
                  
                  
                  
                  },       children:t.name
                
                
                
                
                
                
                }),       (0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.faint,       fontSize:11
                  
                  
                  
                  
                  
                  
                  },       children:t.role
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       S.jsx)(p.Badge,              {
              
              
              
              
              
              
              text:'P'===t.attendance[D]?'PRESENT':'H'===t.attendance[D]?'HALF DAY':'A'===t.attendance[D]?'ABSENT':'L'===t.attendance[D]?'ON LEAVE':'NOT MARKED',       color:Be(t.attendance[D]),       soft:We(t.attendance[D])
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          },       t.id))
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       'staff'===I&&(0,       S.jsxs)(S.Fragment,              {
        
        
        
        
        
        
        children:[(0,       S.jsxs)(a.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            paddingHorizontal:16
          
          
          
          
          
          
          },       children:[(0,       S.jsxs)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flexDirection:'row',       alignItems:'center',       backgroundColor:e.card,       borderRadius:12,       borderWidth:1,       borderColor:e.border,       paddingHorizontal:12,       marginBottom:10
            
            
            
            
            
            
            },       children:[(0,       S.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:"search",       size:16,       color:e.faint
            
            
            
            
            
            
            }),       (0,       S.jsx)(r.default,              {
              
              
              
              
              
              
              value:V,       onChangeText:F,       placeholder:"Search name, role or phone...",       placeholderTextColor:e.faint,       style:       {
                
                
                
                
                
                
                flex:1,       paddingVertical:9,       paddingHorizontal:8,       color:e.text,       fontSize:14
              
              
              
              
              
              
              },       returnKeyType:"search"
            
            
            
            
            
            
            }),       V.length>0&&(0,       S.jsx)(l.default,              {
              
              
              
              
              
              
              onPress:()=>F(''),       children:(0,       S.jsx)(c.Ionicons,              {
                
                
                
                
                
                
                name:"close-circle",       size:16,       color:e.faint
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       S.jsx)(s.default,              {
            
            
            
            
            
            
            horizontal:!0,       showsHorizontalScrollIndicator:!1,       contentContainerStyle:       {
              
              
              
              
              
              
              gap:8,       paddingBottom:10
            
            
            
            
            
            
            },       children:X.map(t=>(0,       S.jsx)(l.default,              {
              
              
              
              
              
              
              onPress:()=>U(t),       style:       {
                
                
                
                
                
                
                paddingHorizontal:12,       paddingVertical:6,       borderRadius:16,       backgroundColor:_===t?e.primary:e.card,       borderWidth:1,       borderColor:_===t?e.primary:e.border
              
              
              
              
              
              
              },       children:(0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:_===t?'#fff':e.sub,       fontSize:12,       fontWeight:'600',       textTransform:'all'===t?'capitalize':'none'
                
                
                
                
                
                
                },       children:'all'===t?'All Roles':t
              
              
              
              
              
              
              })
            
            
            
            
            
            
            },       t))
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       S.jsx)(n.default,              {
          
          
          
          
          
          
          data:Q,       keyExtractor:e=>e.id,       contentContainerStyle:       {
            
            
            
            
            
            
            paddingHorizontal:16,       paddingBottom:100
          
          
          
          
          
          
          },       ListEmptyComponent:(0,       S.jsx)(p.EmptyState,              {
            
            
            
            
            
            
            icon:"people-outline",       text:"No staff match the search"
          
          
          
          
          
          
          }),       renderItem:(       {
            
            
            
            
            
            
            item:t
          
          
          
          
          
          
          })=>       {
            
            
            
            
            
            
            const n=t.reviews[0]?.rating;
            
            
            
            
            
            
            return(0,       S.jsx)(l.default,              {
              
              
              
              
              
              
              onPress:()=>       {
                
                
                
                
                
                
                q(t.id),       G('profile')
              
              
              
              
              
              
              },       children:(0,       S.jsx)(p.Card,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  marginBottom:8,       padding:13,       opacity:'active'===t.status?1:.55
                
                
                
                
                
                
                },       children:(0,       S.jsxs)(p.Row,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    gap:12
                  
                  
                  
                  
                  
                  
                  },       children:[(0,       S.jsx)(a.default,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      width:42,       height:42,       borderRadius:21,       backgroundColor:e.primarySoft,       alignItems:'center',       justifyContent:'center'
                    
                    
                    
                    
                    
                    
                    },       children:(0,       S.jsx)(o.default,              {
                      
                      
                      
                      
                      
                      
                      style:       {
                        
                        
                        
                        
                        
                        
                        fontWeight:'800',       color:e.primary,       fontSize:16
                      
                      
                      
                      
                      
                      
                      },       children:t.name.charAt(0)
                    
                    
                    
                    
                    
                    
                    })
                  
                  
                  
                  
                  
                  
                  }),       (0,       S.jsxs)(a.default,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      flex:1
                    
                    
                    
                    
                    
                    
                    },       children:[(0,       S.jsxs)(p.Row,              {
                      
                      
                      
                      
                      
                      
                      style:       {
                        
                        
                        
                        
                        
                        
                        gap:7
                      
                      
                      
                      
                      
                      
                      },       children:[(0,       S.jsx)(o.default,              {
                        
                        
                        
                        
                        
                        
                        style:       {
                          
                          
                          
                          
                          
                          
                          fontWeight:'700',       color:e.text,       fontSize:14
                        
                        
                        
                        
                        
                        
                        },       children:t.name
                      
                      
                      
                      
                      
                      
                      }),       'inactive'===t.status&&(0,       S.jsx)(p.Badge,              {
                        
                        
                        
                        
                        
                        
                        text:"INACTIVE",       color:e.faint,       soft:e.cardAlt
                      
                      
                      
                      
                      
                      
                      }),       'staff'!==t.access&&(0,       S.jsx)(p.Badge,              {
                        
                        
                        
                        
                        
                        
                        text:t.access.toUpperCase(),       color:e.purple,       soft:e.purpleSoft
                      
                      
                      
                      
                      
                      
                      })]
                    
                    
                    
                    
                    
                    
                    }),       (0,       S.jsxs)(o.default,              {
                      
                      
                      
                      
                      
                      
                      style:       {
                        
                        
                        
                        
                        
                        
                        color:e.faint,       fontSize:11,       marginTop:2
                      
                      
                      
                      
                      
                      
                      },       children:[t.role,       " \xb7 ",       (0,       h.inr)(t.salary),       "/mo \xb7 since ",       (0,       h.fmtDate)(t.joinDate+'T12:00:00')]
                    
                    
                    
                    
                    
                    
                    })]
                  
                  
                  
                  
                  
                  
                  }),       (0,       S.jsxs)(a.default,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      alignItems:'flex-end',       gap:4
                    
                    
                    
                    
                    
                    
                    },       children:[n?rt(n,       11):(0,       S.jsx)(o.default,              {
                      
                      
                      
                      
                      
                      
                      style:       {
                        
                        
                        
                        
                        
                        
                        color:e.faint,       fontSize:10
                      
                      
                      
                      
                      
                      
                      },       children:"No review"
                    
                    
                    
                    
                    
                    
                    }),       (0,       S.jsxs)(o.default,              {
                      
                      
                      
                      
                      
                      
                      style:       {
                        
                        
                        
                        
                        
                        
                        color:e.faint,       fontSize:10
                      
                      
                      
                      
                      
                      
                      },       children:["CL ",       t.leaveBalance.casual,       " \xb7 SL ",       t.leaveBalance.sick]
                    
                    
                    
                    
                    
                    
                    })]
                  
                  
                  
                  
                  
                  
                  })]
                
                
                
                
                
                
                })
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }
        
        
        
        
        
        
        }),       (0,       S.jsx)(l.default,              {
          
          
          
          
          
          
          onPress:()=>       {
            
            
            
            
            
            
            ae(!1),       ne(''),       re(''),       ie(''),       ce(''),       fe('staff'),       me(       {
              
              
              
              
              
              
              
            
            
            
            
            
            
            }),       ee(!0)
          
          
          
          
          
          
          },       style:       {
            
            
            
            
            
            
            position:'absolute',       right:20,       bottom:24,       width:58,       height:58,       borderRadius:29,       backgroundColor:e.primary,       alignItems:'center',       justifyContent:'center',       elevation:6,       shadowColor:'#000',       shadowOpacity:.3,       shadowRadius:8,       shadowOffset:       {
              
              
              
              
              
              
              width:0,       height:4
            
            
            
            
            
            
            }
          
          
          
          
          
          
          },       children:(0,       S.jsx)(c.Ionicons,              {
            
            
            
            
            
            
            name:"person-add-outline",       size:24,       color:"#fff"
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       'attendance'===I&&(0,       S.jsxs)(S.Fragment,              {
        
        
        
        
        
        
        children:[(0,       S.jsx)(a.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            paddingHorizontal:16
          
          
          
          
          
          
          },       children:(0,       S.jsxs)(p.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              padding:12,       marginBottom:10
            
            
            
            
            
            
            },       children:[(0,       S.jsxs)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                justifyContent:'space-between'
              
              
              
              
              
              
              },       children:[(0,       S.jsx)(l.default,              {
                
                
                
                
                
                
                onPress:()=>ke(e=>e+1),       style:       {
                  
                  
                  
                  
                  
                  
                  padding:6
                
                
                
                
                
                
                },       children:(0,       S.jsx)(c.Ionicons,              {
                  
                  
                  
                  
                  
                  
                  name:"chevron-back",       size:18,       color:e.sub
                
                
                
                
                
                
                })
              
              
              
              
              
              
              }),       (0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'800',       color:e.text,       fontSize:15
                
                
                
                
                
                
                },       children:0===Te?'Today':1===Te?'Yesterday':(0,       h.fmtDate)(Ie+'T12:00:00')
              
              
              
              
              
              
              }),       (0,       S.jsx)(l.default,              {
                
                
                
                
                
                
                disabled:0===Te,       onPress:()=>ke(e=>Math.max(0,       e-1)),       style:       {
                  
                  
                  
                  
                  
                  
                  padding:6,       opacity:0===Te?.3:1
                
                
                
                
                
                
                },       children:(0,       S.jsx)(c.Ionicons,              {
                  
                  
                  
                  
                  
                  
                  name:"chevron-forward",       size:18,       color:e.sub
                
                
                
                
                
                
                })
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       S.jsx)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                gap:8,       marginTop:10
              
              
              
              
              
              
              },       children:['P',       'H',       'A',       'L'].map(e=>(0,       S.jsx)(l.default,              {
                
                
                
                
                
                
                onPress:()=>Ae(e),       style:       {
                  
                  
                  
                  
                  
                  
                  flex:1,       paddingVertical:8,       borderRadius:10,       alignItems:'center',       backgroundColor:We(e),       borderWidth:1,       borderColor:Be(e)
                
                
                
                
                
                
                },       children:(0,       S.jsxs)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:Be(e),       fontWeight:'800',       fontSize:12
                  
                  
                  
                  
                  
                  
                  },       children:[Re.length?`${Re.length} sel`:'All',       " \u2192 ",       e]
                
                
                
                
                
                
                })
              
              
              
              
              
              
              },       e))
            
            
            
            
            
            
            }),       (0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:11,       marginTop:8
              
              
              
              
              
              
              },       children:"Tap avatars to select specific staff for bulk marking \xb7 P Present, H Half-day, A Absent, L Leave"
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       S.jsx)(n.default,              {
          
          
          
          
          
          
          data:E,       keyExtractor:e=>e.id,       contentContainerStyle:       {
            
            
            
            
            
            
            paddingHorizontal:16,       paddingBottom:40
          
          
          
          
          
          
          },       renderItem:(       {
            
            
            
            
            
            
            item:t
          
          
          
          
          
          
          })=>       {
            
            
            
            
            
            
            const n=t.attendance[Ie],       r=Re.includes(t.id);
            
            
            
            
            
            
            return(0,       S.jsx)(p.Card,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                marginBottom:8,       padding:12
              
              
              
              
              
              
              },       children:(0,       S.jsxs)(p.Row,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  gap:11
                
                
                
                
                
                
                },       children:[(0,       S.jsx)(l.default,              {
                  
                  
                  
                  
                  
                  
                  onPress:()=>       {
                    
                    
                    
                    
                    
                    
                    return e=t.id,       De(t=>t.includes(e)?t.filter(t=>t!==e):[...t,       e]);
                    
                    
                    
                    
                    
                    
                    var e
                  
                  
                  
                  
                  
                  
                  },       children:(0,       S.jsx)(a.default,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      width:40,       height:40,       borderRadius:20,       backgroundColor:r?e.primary:e.primarySoft,       alignItems:'center',       justifyContent:'center',       borderWidth:r?2:0,       borderColor:e.primary
                    
                    
                    
                    
                    
                    
                    },       children:r?(0,       S.jsx)(c.Ionicons,              {
                      
                      
                      
                      
                      
                      
                      name:"checkmark",       size:19,       color:"#fff"
                    
                    
                    
                    
                    
                    
                    }):(0,       S.jsx)(o.default,              {
                      
                      
                      
                      
                      
                      
                      style:       {
                        
                        
                        
                        
                        
                        
                        fontWeight:'800',       color:e.primary,       fontSize:15
                      
                      
                      
                      
                      
                      
                      },       children:t.name.charAt(0)
                    
                    
                    
                    
                    
                    
                    })
                  
                  
                  
                  
                  
                  
                  })
                
                
                
                
                
                
                }),       (0,       S.jsxs)(a.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    flex:1
                  
                  
                  
                  
                  
                  
                  },       children:[(0,       S.jsx)(o.default,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      fontWeight:'700',       color:e.text,       fontSize:14
                    
                    
                    
                    
                    
                    
                    },       children:t.name
                  
                  
                  
                  
                  
                  
                  }),       (0,       S.jsx)(o.default,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      color:e.faint,       fontSize:11,       marginTop:1
                    
                    
                    
                    
                    
                    
                    },       children:t.role
                  
                  
                  
                  
                  
                  
                  })]
                
                
                
                
                
                
                }),       (0,       S.jsx)(p.Row,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    gap:5
                  
                  
                  
                  
                  
                  
                  },       children:['P',       'H',       'A',       'L'].map(a=>(0,       S.jsx)(l.default,              {
                    
                    
                    
                    
                    
                    
                    onPress:()=>       {
                      
                      
                      
                      
                      
                      
                      return e=t.id,       k(       {
                        
                        
                        
                        
                        
                        
                        type:'MARK_ATTENDANCE',       empId:e,       day:Ie,       status:a
                      
                      
                      
                      
                      
                      
                      });
                      
                      
                      
                      
                      
                      
                      var e
                    
                    
                    
                    
                    
                    
                    },       style:       {
                      
                      
                      
                      
                      
                      
                      width:32,       height:32,       borderRadius:16,       alignItems:'center',       justifyContent:'center',       backgroundColor:n===a?Be(a):e.cardAlt,       borderWidth:1,       borderColor:n===a?Be(a):e.border
                    
                    
                    
                    
                    
                    
                    },       children:(0,       S.jsx)(o.default,              {
                      
                      
                      
                      
                      
                      
                      style:       {
                        
                        
                        
                        
                        
                        
                        fontWeight:'800',       fontSize:12,       color:n===a?'#fff':e.faint
                      
                      
                      
                      
                      
                      
                      },       children:a
                    
                    
                    
                    
                    
                    
                    })
                  
                  
                  
                  
                  
                  
                  },       a))
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       'payroll'===I&&(0,       S.jsxs)(s.default,              {
        
        
        
        
        
        
        contentContainerStyle:       {
          
          
          
          
          
          
          padding:16,       paddingTop:4,       paddingBottom:40
        
        
        
        
        
        
        },       children:[(0,       S.jsxs)(p.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            padding:14
          
          
          
          
          
          
          },       children:[(0,       S.jsxs)(p.Row,              {
            
            
            
            
            
            
            children:[(0,       S.jsx)(p.StatPill,              {
              
              
              
              
              
              
              label:"Gross Salaries",       value:(0,       h.inr)(M.gross)
            
            
            
            
            
            
            }),       (0,       S.jsx)(p.StatPill,              {
              
              
              
              
              
              
              label:"Advances",       value:'-'+(0,       h.inr)(M.advances),       color:e.amber
            
            
            
            
            
            
            }),       (0,       S.jsx)(p.StatPill,              {
              
              
              
              
              
              
              label:"Deductions",       value:'-'+(0,       h.inr)(M.deductions),       color:e.red
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       S.jsx)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              height:1,       backgroundColor:e.border,       marginVertical:10
            
            
            
            
            
            
            }
          
          
          
          
          
          
          }),       (0,       S.jsxs)(p.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between'
            
            
            
            
            
            
            },       children:[(0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'800',       color:e.text,       fontSize:15
              
              
              
              
              
              
              },       children:"NET PAYABLE"
            
            
            
            
            
            
            }),       (0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'900',       color:e.green,       fontSize:20
              
              
              
              
              
              
              },       children:(0,       h.inr)(M.net)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       S.jsxs)(p.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            gap:10,       marginTop:12
          
          
          
          
          
          
          },       children:[(0,       S.jsx)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:(0,       S.jsx)(p.PrimaryButton,              {
              
              
              
              
              
              
              title:"Pay Salaries",       onPress:()=>Le(!0),       icon:"cash-outline",       color:e.green
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       (0,       S.jsxs)(l.default,              {
            
            
            
            
            
            
            onPress:async()=>       {
              
              
              
              
              
              
              const e=H.map((e,       t)=>[t+1,       e.name,       e.role,       e.salary,       e.presentDays,       e.halfDays,       e.absentDays,       e.leaveDays,       e.advances,       e.deductions,       e.net]),       t=(0,       b.toCSV)(['Sl',       'Name',       'Role',       'Gross (Rs)',       'Present',       'Half',       'Absent',       'Leave',       'Advances (Rs)',       'Deductions (Rs)',       'Net Payable (Rs)'],       e)+`\n,,,TOTAL,,,,,"${M.advances}","${M.deductions}","${M.net}"`;
              
              
              
              
              
              
              await(0,       j.saveTextFile)(`payroll-${A}.csv`,       t,       'text/csv')
            
            
            
            
            
            
            },       style:       {
              
              
              
              
              
              
              paddingHorizontal:18,       borderRadius:14,       alignItems:'center',       justifyContent:'center',       backgroundColor:e.card,       borderWidth:1,       borderColor:e.border,       flexDirection:'row',       gap:7
            
            
            
            
            
            
            },       children:[(0,       S.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:"download-outline",       size:17,       color:e.primary
            
            
            
            
            
            
            }),       (0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.text,       fontWeight:'700',       fontSize:13
              
              
              
              
              
              
              },       children:"CSV"
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       S.jsxs)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:13,       fontWeight:'700',       color:e.sub,       textTransform:'uppercase',       letterSpacing:.5,       marginTop:20,       marginBottom:8
          
          
          
          
          
          
          },       children:["Salary Slips \xb7 ",       (new Date).toLocaleDateString('en-IN',              {
            
            
            
            
            
            
            month:'long',       year:'numeric'
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       H.map(t=>(0,       S.jsxs)(p.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginBottom:8,       padding:13
          
          
          
          
          
          
          },       children:[(0,       S.jsxs)(p.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between'
            
            
            
            
            
            
            },       children:[(0,       S.jsxs)(a.default,              {
              
              
              
              
              
              
              children:[(0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'700',       color:e.text,       fontSize:14
                
                
                
                
                
                
                },       children:t.name
              
              
              
              
              
              
              }),       (0,       S.jsxs)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.faint,       fontSize:11,       marginTop:2
                
                
                
                
                
                
                },       children:[t.role,       " \xb7 gross ",       (0,       h.inr)(t.salary)]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       S.jsxs)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                alignItems:'flex-end'
              
              
              
              
              
              
              },       children:[(0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'800',       color:e.green,       fontSize:16
                
                
                
                
                
                
                },       children:(0,       h.inr)(t.net)
              
              
              
              
              
              
              }),       (0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.faint,       fontSize:10
                
                
                
                
                
                
                },       children:"net payable"
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       S.jsxs)(p.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              marginTop:10,       gap:0
            
            
            
            
            
            
            },       children:[(0,       S.jsx)(p.StatPill,              {
              
              
              
              
              
              
              label:"P / H / A / L",       value:`${t.presentDays} / ${t.halfDays} / ${t.absentDays} / ${t.leaveDays}`
            
            
            
            
            
            
            }),       (0,       S.jsx)(p.StatPill,              {
              
              
              
              
              
              
              label:"Advances",       value:(0,       h.inr)(t.advances),       color:t.advances?e.amber:void 0
            
            
            
            
            
            
            }),       (0,       S.jsx)(p.StatPill,              {
              
              
              
              
              
              
              label:"Deductions",       value:(0,       h.inr)(t.deductions),       color:t.deductions?e.red:void 0
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        },       t.empId)),       (0,       S.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            color:e.faint,       fontSize:11,       marginTop:6
          
          
          
          
          
          
          },       children:"Deduction basis: monthly salary \xf7 26 working days. Absent & unpaid-leave days deduct a full day; half-days deduct half. Advances recovered in full."
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       'leave'===I&&(0,       S.jsxs)(S.Fragment,              {
        
        
        
        
        
        
        children:[(0,       S.jsx)(n.default,              {
          
          
          
          
          
          
          data:[...T.leaves].sort((e,       t)=>('pending'===e.status?-1:1)-('pending'===t.status?-1:1)||t.requestedOn.localeCompare(e.requestedOn)),       keyExtractor:e=>e.id,       contentContainerStyle:       {
            
            
            
            
            
            
            paddingHorizontal:16,       paddingBottom:100
          
          
          
          
          
          
          },       ListHeaderComponent:(0,       S.jsx)(p.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              padding:13,       marginBottom:10
            
            
            
            
            
            
            },       children:(0,       S.jsxs)(p.Row,              {
              
              
              
              
              
              
              children:[(0,       S.jsx)(p.StatPill,              {
                
                
                
                
                
                
                label:"Pending",       value:String(N.length),       color:e.amber
              
              
              
              
              
              
              }),       (0,       S.jsx)(p.StatPill,              {
                
                
                
                
                
                
                label:"Approved (all time)",       value:String(T.leaves.filter(e=>'approved'===e.status).length),       color:e.green
              
              
              
              
              
              
              }),       (0,       S.jsx)(p.StatPill,              {
                
                
                
                
                
                
                label:"Rejected",       value:String(T.leaves.filter(e=>'rejected'===e.status).length),       color:e.red
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       ListEmptyComponent:(0,       S.jsx)(p.EmptyState,              {
            
            
            
            
            
            
            icon:"calendar-outline",       text:"No leave requests yet"
          
          
          
          
          
          
          }),       renderItem:(       {
            
            
            
            
            
            
            item:t
          
          
          
          
          
          
          })=>(0,       S.jsxs)(p.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              marginBottom:8,       padding:13
            
            
            
            
            
            
            },       children:[(0,       S.jsxs)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                justifyContent:'space-between'
              
              
              
              
              
              
              },       children:[(0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'700',       color:e.text,       fontSize:14
                
                
                
                
                
                
                },       children:W(t.empId)
              
              
              
              
              
              
              }),       (0,       S.jsx)(p.Badge,              {
                
                
                
                
                
                
                text:t.status.toUpperCase(),       color:'pending'===t.status?e.amber:'approved'===t.status?e.green:e.red,       soft:'pending'===t.status?e.amberSoft:'approved'===t.status?e.greenSoft:e.redSoft
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       S.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:13,       marginTop:5
              
              
              
              
              
              
              },       children:[t.type.toUpperCase(),       " \xb7 ",       t.days,       " day",       t.days>1?'s':'',       " \xb7 ",       (0,       h.fmtDate)(t.from+'T12:00:00'),       t.days>1?` \u2192 ${(0,h.fmtDate)(t.to+'T12:00:00')}`:'']
            
            
            
            
            
            
            }),       (0,       S.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:12,       marginTop:3
              
              
              
              
              
              
              },       children:["\u201c",       t.reason,       "\u201d"]
            
            
            
            
            
            
            }),       'pending'===t.status&&(0,       S.jsxs)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                gap:8,       marginTop:11
              
              
              
              
              
              
              },       children:[(0,       S.jsx)(l.default,              {
                
                
                
                
                
                
                onPress:()=>Je(t.id,       'approved'),       style:       {
                  
                  
                  
                  
                  
                  
                  flex:1,       paddingVertical:9,       borderRadius:10,       alignItems:'center',       backgroundColor:e.green
                
                
                
                
                
                
                },       children:(0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:'#fff',       fontWeight:'700',       fontSize:13
                  
                  
                  
                  
                  
                  
                  },       children:"Approve"
                
                
                
                
                
                
                })
              
              
              
              
              
              
              }),       (0,       S.jsx)(l.default,              {
                
                
                
                
                
                
                onPress:()=>Je(t.id,       'rejected'),       style:       {
                  
                  
                  
                  
                  
                  
                  flex:1,       paddingVertical:9,       borderRadius:10,       alignItems:'center',       backgroundColor:e.card,       borderWidth:1,       borderColor:e.red
                
                
                
                
                
                
                },       children:(0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.red,       fontWeight:'700',       fontSize:13
                  
                  
                  
                  
                  
                  
                  },       children:"Reject"
                
                
                
                
                
                
                })
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       S.jsx)(l.default,              {
          
          
          
          
          
          
          onPress:()=>Ne(!0),       style:       {
            
            
            
            
            
            
            position:'absolute',       right:20,       bottom:24,       width:58,       height:58,       borderRadius:29,       backgroundColor:e.blue,       alignItems:'center',       justifyContent:'center',       elevation:6,       shadowColor:'#000',       shadowOpacity:.3,       shadowRadius:8,       shadowOffset:       {
              
              
              
              
              
              
              width:0,       height:4
            
            
            
            
            
            
            }
          
          
          
          
          
          
          },       children:(0,       S.jsx)(c.Ionicons,              {
            
            
            
            
            
            
            name:"add",       size:30,       color:"#fff"
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       'notices'===I&&(0,       S.jsxs)(S.Fragment,              {
        
        
        
        
        
        
        children:[(0,       S.jsx)(n.default,              {
          
          
          
          
          
          
          data:T.announcements,       keyExtractor:e=>e.id,       contentContainerStyle:       {
            
            
            
            
            
            
            paddingHorizontal:16,       paddingBottom:100
          
          
          
          
          
          
          },       ListEmptyComponent:(0,       S.jsx)(p.EmptyState,              {
            
            
            
            
            
            
            icon:"megaphone-outline",       text:"No notices posted yet"
          
          
          
          
          
          
          }),       renderItem:(       {
            
            
            
            
            
            
            item:t
          
          
          
          
          
          
          })=>(0,       S.jsxs)(p.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              marginBottom:8,       padding:14,       borderLeftWidth:4,       borderLeftColor:'important'===t.priority?e.red:e.blue
            
            
            
            
            
            
            },       children:[(0,       S.jsxs)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                justifyContent:'space-between'
              
              
              
              
              
              
              },       children:[(0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'800',       color:e.text,       fontSize:15,       flex:1
                
                
                
                
                
                
                },       children:t.title
              
              
              
              
              
              
              }),       (0,       S.jsx)(l.default,              {
                
                
                
                
                
                
                onPress:()=>k(       {
                  
                  
                  
                  
                  
                  
                  type:'REMOVE_ANNOUNCEMENT',       id:t.id
                
                
                
                
                
                
                }),       style:       {
                  
                  
                  
                  
                  
                  
                  padding:4
                
                
                
                
                
                
                },       children:(0,       S.jsx)(c.Ionicons,              {
                  
                  
                  
                  
                  
                  
                  name:"trash-outline",       size:16,       color:e.faint
                
                
                
                
                
                
                })
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:13,       marginTop:5,       lineHeight:19
              
              
              
              
              
              
              },       children:t.body
            
            
            
            
            
            
            }),       (0,       S.jsxs)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                justifyContent:'space-between',       marginTop:9
              
              
              
              
              
              
              },       children:[(0,       S.jsxs)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.faint,       fontSize:11
                
                
                
                
                
                
                },       children:[t.author,       " \xb7 ",       (0,       h.fmtDate)(t.date)]
              
              
              
              
              
              
              }),       'important'===t.priority&&(0,       S.jsx)(p.Badge,              {
                
                
                
                
                
                
                text:"IMPORTANT",       color:e.red,       soft:e.redSoft
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       S.jsx)(l.default,              {
          
          
          
          
          
          
          onPress:()=>Xe(!0),       style:       {
            
            
            
            
            
            
            position:'absolute',       right:20,       bottom:24,       width:58,       height:58,       borderRadius:29,       backgroundColor:e.purple,       alignItems:'center',       justifyContent:'center',       elevation:6,       shadowColor:'#000',       shadowOpacity:.3,       shadowRadius:8,       shadowOffset:       {
              
              
              
              
              
              
              width:0,       height:4
            
            
            
            
            
            
            }
          
          
          
          
          
          
          },       children:(0,       S.jsx)(c.Ionicons,              {
            
            
            
            
            
            
            name:"megaphone-outline",       size:24,       color:"#fff"
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       S.jsx)(p.Sheet,              {
        
        
        
        
        
        
        visible:!!J,       onClose:()=>q(null),       title:J?.name||'',       children:J&&(0,       S.jsxs)(a.default,              {
          
          
          
          
          
          
          children:[(0,       S.jsx)(p.Segmented,              {
            
            
            
            
            
            
            options:[       {
              
              
              
              
              
              
              key:'profile',       label:'Profile'
            
            
            
            
            
            
            },              {
              
              
              
              
              
              
              key:'reviews',       label:'Reviews'
            
            
            
            
            
            
            },              {
              
              
              
              
              
              
              key:'documents',       label:'Documents'
            
            
            
            
            
            
            }],       value:Y,       onChange:G
          
          
          
          
          
          
          }),       'profile'===Y&&(0,       S.jsxs)(a.default,              {
            
            
            
            
            
            
            children:[(0,       S.jsxs)(p.Card,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                backgroundColor:e.cardAlt,       marginBottom:14
              
              
              
              
              
              
              },       children:[(0,       S.jsxs)(p.Row,              {
                
                
                
                
                
                
                children:[(0,       S.jsx)(p.StatPill,              {
                  
                  
                  
                  
                  
                  
                  label:"Role",       value:J.role
                
                
                
                
                
                
                }),       (0,       S.jsx)(p.StatPill,              {
                  
                  
                  
                  
                  
                  
                  label:"Salary",       value:(0,       h.inr)(J.salary)
                
                
                
                
                
                
                }),       (0,       S.jsx)(p.StatPill,              {
                  
                  
                  
                  
                  
                  
                  label:"Access",       value:J.access.toUpperCase()
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              }),       (0,       S.jsx)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  height:1,       backgroundColor:e.border,       marginVertical:10
                
                
                
                
                
                
                }
              
              
              
              
              
              
              }),       (0,       S.jsxs)(p.Row,              {
                
                
                
                
                
                
                children:[(0,       S.jsx)(p.StatPill,              {
                  
                  
                  
                  
                  
                  
                  label:"Joined",       value:(0,       h.fmtDate)(J.joinDate+'T12:00:00')
                
                
                
                
                
                
                }),       (0,       S.jsx)(p.StatPill,              {
                  
                  
                  
                  
                  
                  
                  label:"Casual Leave",       value:`${J.leaveBalance.casual} left`
                
                
                
                
                
                
                }),       (0,       S.jsx)(p.StatPill,              {
                  
                  
                  
                  
                  
                  
                  label:"Sick Leave",       value:`${J.leaveBalance.sick} left`
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       S.jsxs)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                gap:8,       marginBottom:16
              
              
              
              
              
              
              },       children:[(0,       S.jsxs)(l.default,              {
                
                
                
                
                
                
                onPress:()=>       {
                  
                  
                  
                  
                  
                  
                  return e=J,       ae(!0),       ne(e.name),       re(e.role),       ie(e.phone),       ce(String(e.salary)),       fe(e.access),       me(       {
                    
                    
                    
                    
                    
                    
                    
                  
                  
                  
                  
                  
                  
                  }),       void ee(!0);
                  
                  
                  
                  
                  
                  
                  var e
                
                
                
                
                
                
                },       style:       {
                  
                  
                  
                  
                  
                  
                  flex:1,       paddingVertical:11,       borderRadius:12,       alignItems:'center',       flexDirection:'row',       justifyContent:'center',       gap:6,       backgroundColor:e.card,       borderWidth:1,       borderColor:e.border
                
                
                
                
                
                
                },       children:[(0,       S.jsx)(c.Ionicons,              {
                  
                  
                  
                  
                  
                  
                  name:"create-outline",       size:16,       color:e.primary
                
                
                
                
                
                
                }),       (0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.text,       fontWeight:'700',       fontSize:13
                  
                  
                  
                  
                  
                  
                  },       children:"Edit Details"
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              }),       (0,       S.jsxs)(l.default,              {
                
                
                
                
                
                
                onPress:()=>       {
                  
                  
                  
                  
                  
                  
                  return e=J,       void k(       {
                    
                    
                    
                    
                    
                    
                    type:'UPDATE_EMPLOYEE',       emp:Object.assign(       {
                      
                      
                      
                      
                      
                      
                      
                    
                    
                    
                    
                    
                    
                    },       e,              {
                      
                      
                      
                      
                      
                      
                      status:'active'===e.status?'inactive':'active'
                    
                    
                    
                    
                    
                    
                    })
                  
                  
                  
                  
                  
                  
                  });
                  
                  
                  
                  
                  
                  
                  var e
                
                
                
                
                
                
                },       style:       {
                  
                  
                  
                  
                  
                  
                  flex:1,       paddingVertical:11,       borderRadius:12,       alignItems:'center',       flexDirection:'row',       justifyContent:'center',       gap:6,       backgroundColor:e.card,       borderWidth:1,       borderColor:'active'===J.status?e.red:e.green
                
                
                
                
                
                
                },       children:[(0,       S.jsx)(c.Ionicons,              {
                  
                  
                  
                  
                  
                  
                  name:'active'===J.status?'pause-circle-outline':'play-circle-outline',       size:16,       color:'active'===J.status?e.red:e.green
                
                
                
                
                
                
                }),       (0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:'active'===J.status?e.red:e.green,       fontWeight:'700',       fontSize:13
                  
                  
                  
                  
                  
                  
                  },       children:'active'===J.status?'Deactivate':'Reactivate'
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontSize:13,       fontWeight:'700',       color:e.sub,       marginBottom:8,       textTransform:'uppercase',       letterSpacing:.5
              
              
              
              
              
              
              },       children:"Give Salary Advance (cash)"
            
            
            
            
            
            
            }),       (0,       S.jsx)(p.Field,              {
              
              
              
              
              
              
              label:"Amount (\u20b9)",       value:ge,       onChangeText:ye,       keyboardType:"numeric",       placeholder:"0"
            
            
            
            
            
            
            }),       (0,       S.jsx)(p.PrimaryButton,              {
              
              
              
              
              
              
              title:"Record Advance",       onPress:()=>       {
                
                
                
                
                
                
                if(!J)return;
                
                
                
                
                
                
                const e=(0,       h.parseNum)(ge);
                
                
                
                
                
                
                if(!e)return;
                
                
                
                
                
                
                if(e>J.salary)return void B('Too Large',       `Advance cannot exceed monthly salary (${(0,h.inr)(J.salary)}).`);
                
                
                
                
                
                
                const t=       {
                  
                  
                  
                  
                  
                  
                  id:(0,       h.uid)(),       date:(new Date).toISOString(),       kind:'expense',       category:'Salaries',       description:`Salary advance - ${J.name}`,       amount:e,       mode:'cash'
                
                
                
                
                
                
                };
                
                
                
                
                
                
                k(       {
                  
                  
                  
                  
                  
                  
                  type:'ADD_ADVANCE',       empId:J.id,       amount:e,       txn:t
                
                
                
                
                
                
                }),       ye('')
              
              
              
              
              
              
              },       icon:"cash-outline",       color:e.amber
            
            
            
            
            
            
            }),       (0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontSize:13,       fontWeight:'700',       color:e.sub,       marginTop:20,       marginBottom:8,       textTransform:'uppercase',       letterSpacing:.5
              
              
              
              
              
              
              },       children:"Advance History"
            
            
            
            
            
            
            }),       0===J.advances.length&&(0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint
              
              
              
              
              
              
              },       children:"No advances taken."
            
            
            
            
            
            
            }),       J.advances.map(t=>(0,       S.jsxs)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                justifyContent:'space-between',       paddingVertical:8,       borderBottomWidth:1,       borderBottomColor:e.border
              
              
              
              
              
              
              },       children:[(0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.sub,       fontSize:13
                
                
                
                
                
                
                },       children:(0,       h.fmtDate)(t.date)
              
              
              
              
              
              
              }),       (0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'700',       color:e.amber
                
                
                
                
                
                
                },       children:(0,       h.inr)(t.amount)
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            },       t.id))]
          
          
          
          
          
          
          }),       'reviews'===Y&&(0,       S.jsxs)(a.default,              {
            
            
            
            
            
            
            children:[(0,       S.jsxs)(p.Card,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                backgroundColor:e.cardAlt,       marginBottom:14
              
              
              
              
              
              
              },       children:[(0,       S.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontSize:13,       fontWeight:'700',       color:e.sub,       marginBottom:8
                
                
                
                
                
                
                },       children:"New Performance Review"
              
              
              
              
              
              
              }),       (0,       S.jsxs)(p.Row,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  justifyContent:'space-between',       marginBottom:10
                
                
                
                
                
                
                },       children:[(0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.sub,       fontSize:13
                  
                  
                  
                  
                  
                  
                  },       children:"Overall rating"
                
                
                
                
                
                
                }),       rt(xe,       24,       je)]
              
              
              
              
              
              
              }),       (0,       S.jsx)(p.Field,              {
                
                
                
                
                
                
                label:"Strengths observed",       value:be,       onChangeText:Se,       placeholder:"What is going well...",       multiline:!0
              
              
              
              
              
              
              }),       (0,       S.jsx)(p.Field,              {
                
                
                
                
                
                
                label:"Areas to improve",       value:ve,       onChangeText:Ce,       placeholder:"What needs attention...",       multiline:!0
              
              
              
              
              
              
              }),       (0,       S.jsx)(p.PrimaryButton,              {
                
                
                
                
                
                
                title:"Save Review",       onPress:()=>       {
                  
                  
                  
                  
                  
                  
                  if(!J||!be.trim())return void B('Incomplete',       'Describe at least the strengths observed.');
                  
                  
                  
                  
                  
                  
                  const e=       {
                    
                    
                    
                    
                    
                    
                    id:(0,       h.uid)(),       date:(new Date).toISOString(),       rating:xe,       strengths:be.trim(),       improvements:ve.trim(),       reviewer:'Owner'
                  
                  
                  
                  
                  
                  
                  };
                  
                  
                  
                  
                  
                  
                  k(       {
                    
                    
                    
                    
                    
                    
                    type:'ADD_REVIEW',       empId:J.id,       review:e
                  
                  
                  
                  
                  
                  
                  }),       Se(''),       Ce(''),       je(4)
                
                
                
                
                
                
                },       icon:"star-outline",       color:e.purple
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontSize:13,       fontWeight:'700',       color:e.sub,       marginBottom:8,       textTransform:'uppercase',       letterSpacing:.5
              
              
              
              
              
              
              },       children:"Review History"
            
            
            
            
            
            
            }),       0===J.reviews.length&&(0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint
              
              
              
              
              
              
              },       children:"No reviews recorded yet."
            
            
            
            
            
            
            }),       J.reviews.map(t=>(0,       S.jsxs)(p.Card,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                marginBottom:8,       padding:13
              
              
              
              
              
              
              },       children:[(0,       S.jsxs)(p.Row,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  justifyContent:'space-between'
                
                
                
                
                
                
                },       children:[rt(t.rating,       14),       (0,       S.jsxs)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.faint,       fontSize:11
                  
                  
                  
                  
                  
                  
                  },       children:[(0,       h.fmtDate)(t.date),       " \xb7 ",       t.reviewer]
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              }),       (0,       S.jsxs)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.text,       fontSize:13,       marginTop:7
                
                
                
                
                
                
                },       children:[(0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    fontWeight:'700',       color:e.green
                  
                  
                  
                  
                  
                  
                  },       children:"+ "
                
                
                
                
                
                
                }),       t.strengths]
              
              
              
              
              
              
              }),       !!t.improvements&&(0,       S.jsxs)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.text,       fontSize:13,       marginTop:4
                
                
                
                
                
                
                },       children:[(0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    fontWeight:'700',       color:e.amber
                  
                  
                  
                  
                  
                  
                  },       children:"\u25b3 "
                
                
                
                
                
                
                }),       t.improvements]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            },       t.id))]
          
          
          
          
          
          
          }),       'documents'===Y&&(0,       S.jsxs)(a.default,              {
            
            
            
            
            
            
            children:[(0,       S.jsx)(p.Select,              {
              
              
              
              
              
              
              label:"Document category",       value:we,       onChange:ze,       options:P,       color:e.teal
            
            
            
            
            
            
            }),       (0,       S.jsxs)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                gap:8,       marginBottom:14
              
              
              
              
              
              
              },       children:[!1,       (0,       S.jsxs)(l.default,              {
                
                
                
                
                
                
                onPress:()=>Pe('gallery'),       style:       {
                  
                  
                  
                  
                  
                  
                  flex:1,       paddingVertical:11,       borderRadius:12,       alignItems:'center',       gap:4,       backgroundColor:e.card,       borderWidth:1,       borderColor:e.border
                
                
                
                
                
                
                },       children:[(0,       S.jsx)(c.Ionicons,              {
                  
                  
                  
                  
                  
                  
                  name:"image-outline",       size:18,       color:e.teal
                
                
                
                
                
                
                }),       (0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.sub,       fontSize:12,       fontWeight:'600'
                  
                  
                  
                  
                  
                  
                  },       children:"Image"
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              }),       (0,       S.jsxs)(l.default,              {
                
                
                
                
                
                
                onPress:()=>Pe('file'),       style:       {
                  
                  
                  
                  
                  
                  
                  flex:1,       paddingVertical:11,       borderRadius:12,       alignItems:'center',       gap:4,       backgroundColor:e.card,       borderWidth:1,       borderColor:e.border
                
                
                
                
                
                
                },       children:[(0,       S.jsx)(c.Ionicons,              {
                  
                  
                  
                  
                  
                  
                  name:"document-attach-outline",       size:18,       color:e.teal
                
                
                
                
                
                
                }),       (0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.sub,       fontSize:12,       fontWeight:'600'
                  
                  
                  
                  
                  
                  
                  },       children:"PDF / File"
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       0===J.documents.length&&(0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint
              
              
              
              
              
              
              },       children:"No documents stored. Add ID proof, contracts or certificates."
            
            
            
            
            
            
            }),       J.documents.map(t=>(0,       S.jsxs)(p.Card,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                marginBottom:8,       padding:11,       flexDirection:'row',       alignItems:'center',       gap:11
              
              
              
              
              
              
              },       children:['image'===t.kind?(0,       S.jsx)(i.default,              {
                
                
                
                
                
                
                source:       {
                  
                  
                  
                  
                  
                  
                  uri:t.uri
                
                
                
                
                
                
                },       style:       {
                  
                  
                  
                  
                  
                  
                  width:44,       height:44,       borderRadius:8,       borderWidth:1,       borderColor:e.border
                
                
                
                
                
                
                }
              
              
              
              
              
              
              }):(0,       S.jsx)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  width:44,       height:44,       borderRadius:8,       backgroundColor:e.redSoft,       alignItems:'center',       justifyContent:'center'
                
                
                
                
                
                
                },       children:(0,       S.jsx)(c.Ionicons,              {
                  
                  
                  
                  
                  
                  
                  name:"document-text",       size:18,       color:e.red
                
                
                
                
                
                
                })
              
              
              
              
              
              
              }),       (0,       S.jsxs)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  flex:1
                
                
                
                
                
                
                },       children:[(0,       S.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    fontWeight:'600',       color:e.text,       fontSize:13
                  
                  
                  
                  
                  
                  
                  },       numberOfLines:1,       children:t.name
                
                
                
                
                
                
                }),       (0,       S.jsxs)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.faint,       fontSize:11,       marginTop:2
                  
                  
                  
                  
                  
                  
                  },       children:[t.category,       " \xb7 ",       (0,       h.fmtDate)(t.addedOn)]
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              }),       (0,       S.jsx)(l.default,              {
                
                
                
                
                
                
                onPress:()=>k(       {
                  
                  
                  
                  
                  
                  
                  type:'REMOVE_EMP_DOC',       empId:J.id,       docId:t.id
                
                
                
                
                
                
                }),       style:       {
                  
                  
                  
                  
                  
                  
                  padding:6
                
                
                
                
                
                
                },       children:(0,       S.jsx)(c.Ionicons,              {
                  
                  
                  
                  
                  
                  
                  name:"trash-outline",       size:16,       color:e.faint
                
                
                
                
                
                
                })
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            },       t.id))]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       S.jsxs)(p.Sheet,              {
        
        
        
        
        
        
        visible:Z,       onClose:()=>ee(!1),       title:te?'Edit Employee':'New Employee',       children:[(0,       S.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"Full Name",       value:oe,       onChangeText:e=>       {
            
            
            
            
            
            
            ne(e),       he.name&&me(e=>Object.assign(       {
              
              
              
              
              
              
              
            
            
            
            
            
            
            },       e,              {
              
              
              
              
              
              
              name:''
            
            
            
            
            
            
            }))
          
          
          
          
          
          
          },       placeholder:"e.g. Ramesh Kumar"
        
        
        
        
        
        
        }),       !!he.name&&(0,       S.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            color:e.red,       fontSize:12,       marginTop:-10,       marginBottom:10
          
          
          
          
          
          
          },       children:he.name
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.Select,              {
          
          
          
          
          
          
          label:"Role",       value:le,       onChange:e=>       {
            
            
            
            
            
            
            re(e),       he.role&&me(e=>Object.assign(       {
              
              
              
              
              
              
              
            
            
            
            
            
            
            },       e,              {
              
              
              
              
              
              
              role:''
            
            
            
            
            
            
            })),       !de&&C[e]&&ce(String(C[e]))
          
          
          
          
          
          
          },       options:v,       placeholder:"Select role..."
        
        
        
        
        
        
        }),       !!he.role&&(0,       S.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            color:e.red,       fontSize:12,       marginTop:-10,       marginBottom:10
          
          
          
          
          
          
          },       children:he.role
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"Phone (10 digits)",       value:se,       onChangeText:e=>       {
            
            
            
            
            
            
            ie(e),       he.phone&&me(e=>Object.assign(       {
              
              
              
              
              
              
              
            
            
            
            
            
            
            },       e,              {
              
              
              
              
              
              
              phone:''
            
            
            
            
            
            
            }))
          
          
          
          
          
          
          },       keyboardType:"phone-pad",       placeholder:"98470 12345"
        
        
        
        
        
        
        }),       !!he.phone&&(0,       S.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            color:e.red,       fontSize:12,       marginTop:-10,       marginBottom:10
          
          
          
          
          
          
          },       children:he.phone
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"Monthly Salary (\u20b9)"+(le&&C[le]?` \xb7 typical: ${(0,h.inr)(C[le])}`:''),       value:de,       onChangeText:e=>       {
            
            
            
            
            
            
            ce(e),       he.salary&&me(e=>Object.assign(       {
              
              
              
              
              
              
              
            
            
            
            
            
            
            },       e,              {
              
              
              
              
              
              
              salary:''
            
            
            
            
            
            
            }))
          
          
          
          
          
          
          },       keyboardType:"numeric",       placeholder:"0"
        
        
        
        
        
        
        }),       !!he.salary&&(0,       S.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            color:e.red,       fontSize:12,       marginTop:-10,       marginBottom:10
          
          
          
          
          
          
          },       children:he.salary
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.Select,              {
          
          
          
          
          
          
          label:"App Access Level",       value:ue,       onChange:e=>fe(e),       options:w,       color:e.purple
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.PrimaryButton,              {
          
          
          
          
          
          
          title:te?'Save Changes':'Add Employee',       onPress:()=>       {
            
            
            
            
            
            
            pe()&&(k(te&&J?       {
              
              
              
              
              
              
              type:'UPDATE_EMPLOYEE',       emp:Object.assign(       {
                
                
                
                
                
                
                
              
              
              
              
              
              
              },       J,              {
                
                
                
                
                
                
                name:oe.trim(),       role:le,       phone:se.trim(),       salary:(0,       h.parseNum)(de),       access:ue
              
              
              
              
              
              
              })
            
            
            
            
            
            
            }
            :       {
              
              
              
              
              
              
              type:'ADD_EMPLOYEE',       emp:       {
                
                
                
                
                
                
                id:(0,       h.uid)(),       name:oe.trim(),       role:le,       phone:se.trim(),       salary:(0,       h.parseNum)(de),       attendance:       {
                  
                  
                  
                  
                  
                  
                  
                
                
                
                
                
                
                },       advances:[],       status:'active',       joinDate:D,       access:ue,       leaveBalance:       {
                  
                  
                  
                  
                  
                  
                  casual:6,       sick:6
                
                
                
                
                
                
                },       reviews:[],       documents:[]
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       ee(!1))
          
          
          
          
          
          
          },       icon:te?'save-outline':'person-add-outline'
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       S.jsxs)(p.Sheet,              {
        
        
        
        
        
        
        visible:Oe,       onClose:()=>Ne(!1),       title:"New Leave Request",       children:[(0,       S.jsx)(p.Select,              {
          
          
          
          
          
          
          label:"Employee",       value:He,       onChange:Me,       placeholder:"Select staff member...",       color:e.blue,       options:E.map(e=>(       {
            
            
            
            
            
            
            value:e.id,       label:e.name,       icon:'person-outline',       sub:`${e.role} \xb7 CL ${e.leaveBalance.casual} \xb7 SL ${e.leaveBalance.sick}`
          
          
          
          
          
          
          }))
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.Select,              {
          
          
          
          
          
          
          label:"Leave Type",       value:$e,       onChange:Ve,       options:z,       color:e.blue
        
        
        
        
        
        
        }),       (0,       S.jsxs)(p.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            gap:12,       alignItems:'flex-start'
          
          
          
          
          
          
          },       children:[(0,       S.jsx)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:(0,       S.jsx)(p.Select,              {
              
              
              
              
              
              
              label:"From",       value:Fe,       onChange:Ue,       color:e.blue,       options:Array.from(       {
                
                
                
                
                
                
                length:15
              
              
              
              
              
              
              },       (e,       t)=>       {
                
                
                
                
                
                
                const a=new Date(Date.now()+864e5*t);
                
                
                
                
                
                
                return       {
                  
                  
                  
                  
                  
                  
                  value:(0,       h.dateKey)(a),       label:0===t?'Today':1===t?'Tomorrow':a.toLocaleDateString('en-IN',              {
                    
                    
                    
                    
                    
                    
                    weekday:'short',       day:'numeric',       month:'short'
                  
                  
                  
                  
                  
                  
                  })
                
                
                
                
                
                
                }
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       (0,       S.jsx)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:(0,       S.jsx)(p.Select,              {
              
              
              
              
              
              
              label:"Days",       value:Ke,       onChange:qe,       color:e.blue,       options:['1',       '2',       '3',       '4',       '5',       '7',       '10',       '15'].map(e=>(       {
                
                
                
                
                
                
                value:e,       label:`${e} day${'1'===e?'':'s'}`
              
              
              
              
              
              
              }))
            
            
            
            
            
            
            })
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"Reason",       value:Ye,       onChangeText:Ge,       placeholder:"e.g. Family function",       multiline:!0
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.PrimaryButton,              {
          
          
          
          
          
          
          title:"Submit Request",       onPress:()=>       {
            
            
            
            
            
            
            if(!He)return void B('Select Staff',       'Choose the employee requesting leave.');
            
            
            
            
            
            
            const e=Math.max(1,       Math.min(30,       Math.round((0,       h.parseNum)(Ke)||1))),       t=T.employees.find(e=>e.id===He);
            
            
            
            
            
            
            if(!t)return;
            
            
            
            
            
            
            if('casual'===$e&&e>t.leaveBalance.casual)return void B('Insufficient Balance',       `${t.name} has only ${t.leaveBalance.casual} casual leave day(s) left. Use unpaid leave instead.`);
            
            
            
            
            
            
            if('sick'===$e&&e>t.leaveBalance.sick)return void B('Insufficient Balance',       `${t.name} has only ${t.leaveBalance.sick} sick leave day(s) left.`);
            
            
            
            
            
            
            const a=/^\d       {
              
              
              
              
              
              
              4
            
            
            
            
            
            
            }
            -\d       {
              
              
              
              
              
              
              2
            
            
            
            
            
            
            }
            -\d       {
              
              
              
              
              
              
              2
            
            
            
            
            
            
            }
            $/.test(Fe)?Fe:D,       o=((0,       h.daysBetween)(a,       a),       (0,       h.dateKey)(new Date(new Date(a+'T12:00:00').getTime()+864e5*(e-1)))),       n=       {
              
              
              
              
              
              
              id:(0,       h.uid)(),       empId:He,       from:a,       to:o,       days:e,       type:$e,       reason:Ye.trim()||'Personal',       status:'pending',       requestedOn:(new Date).toISOString()
            
            
            
            
            
            
            };
            
            
            
            
            
            
            k(       {
              
              
              
              
              
              
              type:'REQUEST_LEAVE',       leave:n
            
            
            
            
            
            
            }),       Ne(!1),       Ge(''),       qe('1'),       Me('')
          
          
          
          
          
          
          },       icon:"paper-plane-outline",       color:e.blue
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       S.jsxs)(p.Sheet,              {
        
        
        
        
        
        
        visible:Ee,       onClose:()=>Le(!1),       title:"Confirm Salary Payment",       children:[(0,       S.jsxs)(p.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            backgroundColor:e.cardAlt,       marginBottom:16
          
          
          
          
          
          
          },       children:[H.map(t=>(0,       S.jsxs)(p.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between',       paddingVertical:6,       borderBottomWidth:1,       borderBottomColor:e.border
            
            
            
            
            
            
            },       children:[(0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:13
              
              
              
              
              
              
              },       children:t.name
            
            
            
            
            
            
            }),       (0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.text,       fontWeight:'700',       fontSize:13
              
              
              
              
              
              
              },       children:(0,       h.inr)(t.net)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          },       t.empId)),       (0,       S.jsxs)(p.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between',       paddingTop:10
            
            
            
            
            
            
            },       children:[(0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.text,       fontWeight:'800',       fontSize:15
              
              
              
              
              
              
              },       children:"TOTAL (bank)"
            
            
            
            
            
            
            }),       (0,       S.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.green,       fontWeight:'900',       fontSize:18
              
              
              
              
              
              
              },       children:(0,       h.inr)(M.net)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       S.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            color:e.faint,       fontSize:12,       marginBottom:14
          
          
          
          
          
          
          },       children:"Posts one consolidated expense entry (category: Salaries, mode: bank) to the day book and reduces the bank balance. Advances already recovered are not paid again."
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.PrimaryButton,              {
          
          
          
          
          
          
          title:`Pay ${(0,h.inr)(M.net)} & Post to Day Book`,       onPress:()=>       {
            
            
            
            
            
            
            const e=       {
              
              
              
              
              
              
              id:(0,       h.uid)(),       date:(new Date).toISOString(),       kind:'expense',       category:'Salaries',       description:`Monthly salaries - ${E.length} staff (net after advances/deductions)`,       amount:M.net,       mode:'bank',       bankId:T.settings.defaultBankId
            
            
            
            
            
            
            };
            
            
            
            
            
            
            k(       {
              
              
              
              
              
              
              type:'PAY_SALARIES',       txn:e
            
            
            
            
            
            
            }),       Le(!1),       B('Salaries Posted',       `${(0,h.inr)(M.net)} posted to the expense register as bank payment for ${E.length} staff.`)
          
          
          
          
          
          
          },       icon:"checkmark",       color:e.green
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       S.jsxs)(p.Sheet,              {
        
        
        
        
        
        
        visible:Qe,       onClose:()=>Xe(!1),       title:"Post Notice to Team",       children:[(0,       S.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"Title",       value:Ze,       onChangeText:et,       placeholder:"e.g. Holiday schedule"
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"Message",       value:tt,       onChangeText:at,       placeholder:"Write the announcement...",       multiline:!0
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.Segmented,              {
          
          
          
          
          
          
          options:[       {
            
            
            
            
            
            
            key:'normal',       label:'Normal'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'important',       label:'Important'
          
          
          
          
          
          
          }],       value:ot,       onChange:nt
        
        
        
        
        
        
        }),       (0,       S.jsx)(p.PrimaryButton,              {
          
          
          
          
          
          
          title:"Post Notice",       onPress:()=>       {
            
            
            
            
            
            
            if(!Ze.trim()||!tt.trim())return void B('Incomplete',       'Both title and message are required.');
            
            
            
            
            
            
            const e=       {
              
              
              
              
              
              
              id:(0,       h.uid)(),       date:(new Date).toISOString(),       title:Ze.trim(),       body:tt.trim(),       priority:ot,       author:'Owner'
            
            
            
            
            
            
            };
            
            
            
            
            
            
            k(       {
              
              
              
              
              
              
              type:'ADD_ANNOUNCEMENT',       announcement:e
            
            
            
            
            
            
            }),       Xe(!1),       et(''),       at('')
          
          
          
          
          
          
          },       icon:"megaphone-outline",       color:e.purple
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       952,       [51,       1108,       1153,       1171,       1290,       1256,       1179,       1219,       1095,       1298,       1249,       1291,       860,       853,       859,       918,       953,       921,       938,       939,       229])