__d(function(g,       r,       i,       _a,       _m,       _e,       _d)       {
  
  
  
  
  
  
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
      
      
      
      
      
      
      return C
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var t=r(_d[0]),       o=e(r(_d[1])),       n=e(r(_d[2])),       a=e(r(_d[3])),       l=e(r(_d[4])),       s=e(r(_d[5])),       d=e(r(_d[6])),       c=e(r(_d[7]));
  
  
  
  
  
  
  r(_d[8]);
  
  
  
  
  
  
  var u=r(_d[9]),       h=r(_d[10]),       f=r(_d[11]),       m=r(_d[12]),       b=r(_d[13]),       p=r(_d[14]),       x=r(_d[15]),       y=r(_d[16]);
  
  
  
  
  
  
  const j=[       {
    
    
    
    
    
    
    value:'Provisions',       icon:'basket-outline',       sub:'Vegetables, rice, groceries'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Meat & Fish',       icon:'fish-outline',       sub:'Chicken, fish, mutton'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'LPG & Fuel',       icon:'flame-outline',       sub:'Cylinders, generator diesel'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Electricity',       icon:'flash-outline',       sub:'KSEB bills'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Water',       icon:'water-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Maintenance',       icon:'construct-outline',       sub:'Repairs, plumbing, AMC'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Salaries',       icon:'people-outline',       sub:'Wages & advances'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Staff Welfare',       icon:'cafe-outline',       sub:'Staff food & tea'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Liquor Purchase',       icon:'wine-outline',       sub:'BEVCO invoices'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Soft Drinks Purchase',       icon:'pint-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Rent',       icon:'home-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'License & Tax',       icon:'document-text-outline',       sub:'Excise, GST, local body'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Marketing',       icon:'megaphone-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Vendor Payment',       icon:'cart-outline',       sub:'Settling supplier credit'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Other',       icon:'ellipsis-horizontal-outline'
  
  
  
  
  
  
  }],       v=[       {
    
    
    
    
    
    
    value:'Other Income',       icon:'cash-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Credit Recovery',       icon:'people-outline',       sub:'Customer credit received'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Function Advance',       icon:'calendar-outline',       sub:'Hall / event bookings'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Misc',       icon:'ellipsis-horizontal-outline'
  
  
  
  
  
  
  }];
  
  
  
  
  
  
  function C()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e
    
    
    
    
    
    
    }
    
    =(0,       f.useTheme)(),              {
      
      
      
      
      
      
      state:C,       dispatch:w
    
    
    
    
    
    
    }
    
    =(0,       m.useStore)(),       [k,       S]=(0,       t.useState)(''),       [I,       z]=(0,       t.useState)(0),       [P,       R]=(0,       t.useState)('all'),       [T,       W]=(0,       t.useState)(!1),       [B,       D]=(0,       t.useState)('expense'),       [O,       M]=(0,       t.useState)('Provisions'),       [A,       L]=(0,       t.useState)(''),       [E,       F]=(0,       t.useState)(''),       [N,       V]=(0,       t.useState)('cash'),       [_,       H]=(0,       t.useState)([]),       [$,       K]=(0,       t.useState)(null),       G=(0,       t.useMemo)(()=>       {
      
      
      
      
      
      
      const e=new Date;
      
      
      
      
      
      
      return e.setDate(e.getDate()-I),       (0,       b.dateKey)(e)
    
    
    
    
    
    
    },       [I]),       U=(0,       t.useMemo)(()=>(0,       m.financeForDay)(C,       G),       [C,       G]),       q=(0,       t.useMemo)(()=>(0,       m.cashInHand)(C),       [C]),       X=(0,       t.useMemo)(()=>       {
      
      
      
      
      
      
      const e=[];
      
      
      
      
      
      
      for(const t of C.sales)(0,       b.keyOf)(t.date)===G&&e.push(       {
        
        
        
        
        
        
        id:t.id,       date:t.date,       title:t.description,       sub:`${t.dept.toUpperCase()}${t.billNo?' \xb7 '+t.billNo:''}${t.gstAmount?' \xb7 GST '+(0,b.inr)(t.gstAmount):''}`,       amount:t.total,       positive:!0,       icon:'receipt-outline',       mode:t.mode
      
      
      
      
      
      
      });
      
      
      
      
      
      
      for(const t of C.txns)(0,       b.keyOf)(t.date)===G&&e.push(       {
        
        
        
        
        
        
        id:t.id,       date:t.date,       title:t.description,       sub:t.category,       amount:t.amount,       positive:'income'===t.kind,       icon:'income'===t.kind?'arrow-down-circle-outline':'arrow-up-circle-outline',       mode:t.mode,       hasBill:t.hasBill||(t.attachments?.length||0)>0,       attachments:t.attachments
      
      
      
      
      
      
      });
      
      
      
      
      
      
      for(const t of C.bankMoves)(0,       b.keyOf)(t.date)===G&&e.push(       {
        
        
        
        
        
        
        id:t.id,       date:t.date,       title:t.note||t.kind,       sub:`BANK ${t.kind.toUpperCase()}`,       amount:t.amount,       positive:'withdraw'===t.kind,       icon:'swap-horizontal-outline',       mode:'bank'
      
      
      
      
      
      
      });
      
      
      
      
      
      
      return e.filter(e=>'all'===P||('in'===P?e.positive:!e.positive)).filter(e=>!k||e.title.toLowerCase().includes(k.toLowerCase())||e.sub.toLowerCase().includes(k.toLowerCase())).sort((e,       t)=>t.date.localeCompare(e.date))
    
    
    
    
    
    
    },       [C,       G,       P,       k]),       Y=async e=>       {
      
      
      
      
      
      
      const t='camera'===e?await(0,       x.captureBillPhoto)():'gallery'===e?await(0,       x.pickBillImage)():await(0,       x.pickBillDocument)();
      
      
      
      
      
      
      t&&H(e=>[...e,       t])
    
    
    
    
    
    
    },       J=e=>       {
      
      
      
      
      
      
      if('pdf'===e.kind)try       {
        
        
        
        
        
        
        const t=window.open('',       '_blank');
        
        
        
        
        
        
        return void(t&&t.document.write(`<iframe src="${e.uri}" style="width:100%;height:100%;border:0" title="${e.name}"></iframe>`))
      
      
      
      
      
      
      }catch       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      }
      
      K(e)
    
    
    
    
    
    
    },       Q=0===I?'Today':1===I?'Yesterday':new Date(G+'T12:00:00').toLocaleDateString('en-IN',              {
      
      
      
      
      
      
      day:'numeric',       month:'short'
    
    
    
    
    
    
    });
    
    
    
    
    
    
    return(0,       y.jsxs)(u.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg
      
      
      
      
      
      
      },       edges:['top'],       children:[(0,       y.jsxs)(o.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          padding:16,       paddingBottom:8
        
        
        
        
        
        
        },       children:[(0,       y.jsxs)(p.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            justifyContent:'space-between',       marginBottom:12
          
          
          
          
          
          
          },       children:[(0,       y.jsx)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              fontSize:22,       fontWeight:'800',       color:e.text
            
            
            
            
            
            
            },       children:"Day Book"
          
          
          
          
          
          
          }),       (0,       y.jsxs)(p.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              gap:8
            
            
            
            
            
            
            },       children:[(0,       y.jsx)(l.default,              {
              
              
              
              
              
              
              onPress:()=>z(e=>e+1),       style:       {
                
                
                
                
                
                
                width:34,       height:34,       borderRadius:17,       backgroundColor:e.card,       borderWidth:1,       borderColor:e.border,       alignItems:'center',       justifyContent:'center'
              
              
              
              
              
              
              },       children:(0,       y.jsx)(h.Ionicons,              {
                
                
                
                
                
                
                name:"chevron-back",       size:17,       color:e.sub
              
              
              
              
              
              
              })
            
            
            
            
            
            
            }),       (0,       y.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                paddingHorizontal:12,       height:34,       borderRadius:17,       backgroundColor:e.card,       borderWidth:1,       borderColor:e.border,       alignItems:'center',       justifyContent:'center'
              
              
              
              
              
              
              },       children:(0,       y.jsx)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'700',       color:e.text,       fontSize:13
                
                
                
                
                
                
                },       children:Q
              
              
              
              
              
              
              })
            
            
            
            
            
            
            }),       (0,       y.jsx)(l.default,              {
              
              
              
              
              
              
              disabled:0===I,       onPress:()=>z(e=>Math.max(0,       e-1)),       style:       {
                
                
                
                
                
                
                width:34,       height:34,       borderRadius:17,       backgroundColor:e.card,       borderWidth:1,       borderColor:e.border,       alignItems:'center',       justifyContent:'center',       opacity:0===I?.4:1
              
              
              
              
              
              
              },       children:(0,       y.jsx)(h.Ionicons,              {
                
                
                
                
                
                
                name:"chevron-forward",       size:17,       color:e.sub
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            padding:14
          
          
          
          
          
          
          },       children:(0,       y.jsxs)(p.Row,              {
            
            
            
            
            
            
            children:[(0,       y.jsx)(p.StatPill,              {
              
              
              
              
              
              
              label:"Received",       value:(0,       b.inr)(U.revenue+U.otherIncome),       color:e.green
            
            
            
            
            
            
            }),       (0,       y.jsx)(p.StatPill,              {
              
              
              
              
              
              
              label:"Paid Out",       value:(0,       b.inr)(U.expenses),       color:e.red
            
            
            
            
            
            
            }),       (0,       y.jsx)(p.StatPill,              {
              
              
              
              
              
              
              label:"Cash in Hand",       value:(0,       b.inr)(q)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginTop:12,       gap:0
          
          
          
          
          
          
          },       children:(0,       y.jsxs)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1,       flexDirection:'row',       alignItems:'center',       backgroundColor:e.card,       borderRadius:12,       borderWidth:1,       borderColor:e.border,       paddingHorizontal:12
            
            
            
            
            
            
            },       children:[(0,       y.jsx)(h.Ionicons,              {
              
              
              
              
              
              
              name:"search",       size:16,       color:e.faint
            
            
            
            
            
            
            }),       (0,       y.jsx)(s.default,              {
              
              
              
              
              
              
              value:k,       onChangeText:S,       placeholder:"Search entries...",       placeholderTextColor:e.faint,       style:       {
                
                
                
                
                
                
                flex:1,       paddingVertical:9,       paddingHorizontal:8,       color:e.text,       fontSize:14
              
              
              
              
              
              
              },       returnKeyType:"search"
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       y.jsxs)(p.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginTop:10
          
          
          
          
          
          
          },       children:[(0,       y.jsx)(p.Chip,              {
            
            
            
            
            
            
            label:"All",       active:'all'===P,       onPress:()=>R('all')
          
          
          
          
          
          
          }),       (0,       y.jsx)(p.Chip,              {
            
            
            
            
            
            
            label:"Money In",       active:'in'===P,       onPress:()=>R('in'),       color:e.green
          
          
          
          
          
          
          }),       (0,       y.jsx)(p.Chip,              {
            
            
            
            
            
            
            label:"Money Out",       active:'out'===P,       onPress:()=>R('out'),       color:e.red
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       y.jsx)(a.default,              {
        
        
        
        
        
        
        data:X,       keyExtractor:e=>e.id,       contentContainerStyle:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingBottom:100
        
        
        
        
        
        
        },       ListEmptyComponent:(0,       y.jsx)(p.EmptyState,              {
          
          
          
          
          
          
          icon:"book-outline",       text:"No entries for this day"
        
        
        
        
        
        
        }),       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>(0,       y.jsxs)(p.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginBottom:8,       padding:13,       flexDirection:'row',       alignItems:'center',       gap:12
          
          
          
          
          
          
          },       children:[(0,       y.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              width:38,       height:38,       borderRadius:12,       backgroundColor:t.positive?e.greenSoft:e.redSoft,       alignItems:'center',       justifyContent:'center'
            
            
            
            
            
            
            },       children:(0,       y.jsx)(h.Ionicons,              {
              
              
              
              
              
              
              name:t.icon,       size:19,       color:t.positive?e.green:e.red
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       (0,       y.jsxs)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:[(0,       y.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'700',       color:e.text,       fontSize:14
              
              
              
              
              
              
              },       numberOfLines:1,       children:t.title
            
            
            
            
            
            
            }),       (0,       y.jsxs)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                gap:6,       marginTop:3
              
              
              
              
              
              
              },       children:[(0,       y.jsxs)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.faint,       fontSize:11
                
                
                
                
                
                
                },       children:[t.sub,       " \xb7 ",       (0,       b.fmtDateTime)(t.date).split(', ')[1]]
              
              
              
              
              
              
              }),       t.hasBill&&(0,       y.jsx)(h.Ionicons,              {
                
                
                
                
                
                
                name:"attach",       size:12,       color:e.blue
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (t.attachments?.length||0)>0&&(0,       y.jsx)(p.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                gap:6,       marginTop:7,       flexWrap:'wrap'
              
              
              
              
              
              
              },       children:t.attachments.map(t=>(0,       y.jsx)(l.default,              {
                
                
                
                
                
                
                onPress:()=>J(t),       children:'image'===t.kind?(0,       y.jsx)(d.default,              {
                  
                  
                  
                  
                  
                  
                  source:       {
                    
                    
                    
                    
                    
                    
                    uri:t.uri
                  
                  
                  
                  
                  
                  
                  },       style:       {
                    
                    
                    
                    
                    
                    
                    width:44,       height:44,       borderRadius:8,       borderWidth:1,       borderColor:e.border
                  
                  
                  
                  
                  
                  
                  }
                
                
                
                
                
                
                }):(0,       y.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    width:44,       height:44,       borderRadius:8,       backgroundColor:e.redSoft,       borderWidth:1,       borderColor:e.border,       alignItems:'center',       justifyContent:'center'
                  
                  
                  
                  
                  
                  
                  },       children:(0,       y.jsx)(h.Ionicons,              {
                    
                    
                    
                    
                    
                    
                    name:"document-text",       size:18,       color:e.red
                  
                  
                  
                  
                  
                  
                  })
                
                
                
                
                
                
                })
              
              
              
              
              
              
              },       t.id))
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       y.jsxs)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              alignItems:'flex-end'
            
            
            
            
            
            
            },       children:[(0,       y.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'800',       fontSize:15,       color:t.positive?e.green:e.red
              
              
              
              
              
              
              },       children:[t.positive?'+':'-',       (0,       b.inr)(t.amount)]
            
            
            
            
            
            
            }),       (0,       y.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:10,       marginTop:2,       textTransform:'uppercase'
              
              
              
              
              
              
              },       children:t.mode
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       y.jsx)(l.default,              {
        
        
        
        
        
        
        onPress:()=>W(!0),       style:       {
          
          
          
          
          
          
          position:'absolute',       right:20,       bottom:24,       width:58,       height:58,       borderRadius:29,       backgroundColor:e.primary,       alignItems:'center',       justifyContent:'center',       shadowColor:'#000',       shadowOpacity:.3,       shadowRadius:8,       shadowOffset:       {
            
            
            
            
            
            
            width:0,       height:4
          
          
          
          
          
          
          },       elevation:6
        
        
        
        
        
        
        },       children:(0,       y.jsx)(h.Ionicons,              {
          
          
          
          
          
          
          name:"add",       size:30,       color:"#fff"
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       y.jsxs)(p.Sheet,              {
        
        
        
        
        
        
        visible:T,       onClose:()=>W(!1),       title:"New Day Book Entry",       children:[(0,       y.jsx)(p.Segmented,              {
          
          
          
          
          
          
          options:[       {
            
            
            
            
            
            
            key:'expense',       label:'Expense / Paid'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'income',       label:'Income / Received'
          
          
          
          
          
          
          }],       value:B,       onChange:e=>       {
            
            
            
            
            
            
            D(e),       M('expense'===e?'Provisions':'Other Income')
          
          
          
          
          
          
          }
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Select,              {
          
          
          
          
          
          
          label:"Category",       value:O,       onChange:M,       options:'expense'===B?j:v
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"Description",       value:A,       onChangeText:L,       placeholder:"e.g. Vegetables from market"
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"Amount (\u20b9)",       value:E,       onChangeText:F,       keyboardType:"numeric",       placeholder:"0"
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Segmented,              {
          
          
          
          
          
          
          options:[       {
            
            
            
            
            
            
            key:'cash',       label:'Cash'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'bank',       label:'Bank / UPI'
          
          
          
          
          
          
          }],       value:N,       onChange:V
        
        
        
        
        
        
        }),       (0,       y.jsx)(n.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:13,       fontWeight:'600',       color:e.sub,       marginBottom:8
          
          
          
          
          
          
          },       children:"Supporting Documents (bill / receipt)"
        
        
        
        
        
        
        }),       (0,       y.jsxs)(p.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            gap:8,       marginBottom:10
          
          
          
          
          
          
          },       children:[!1,       (0,       y.jsxs)(l.default,              {
            
            
            
            
            
            
            onPress:()=>Y('gallery'),       style:       {
              
              
              
              
              
              
              flex:1,       paddingVertical:11,       borderRadius:12,       alignItems:'center',       gap:4,       backgroundColor:e.card,       borderWidth:1,       borderColor:e.border
            
            
            
            
            
            
            },       children:[(0,       y.jsx)(h.Ionicons,              {
              
              
              
              
              
              
              name:"image-outline",       size:19,       color:e.primary
            
            
            
            
            
            
            }),       (0,       y.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:12,       fontWeight:'600'
              
              
              
              
              
              
              },       children:'Image'
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       y.jsxs)(l.default,              {
            
            
            
            
            
            
            onPress:()=>Y('document'),       style:       {
              
              
              
              
              
              
              flex:1,       paddingVertical:11,       borderRadius:12,       alignItems:'center',       gap:4,       backgroundColor:e.card,       borderWidth:1,       borderColor:e.border
            
            
            
            
            
            
            },       children:[(0,       y.jsx)(h.Ionicons,              {
              
              
              
              
              
              
              name:"document-attach-outline",       size:19,       color:e.primary
            
            
            
            
            
            
            }),       (0,       y.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:12,       fontWeight:'600'
              
              
              
              
              
              
              },       children:"PDF / File"
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       _.length>0&&(0,       y.jsx)(p.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            gap:8,       marginBottom:12,       flexWrap:'wrap'
          
          
          
          
          
          
          },       children:_.map(t=>(0,       y.jsxs)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              position:'relative'
            
            
            
            
            
            
            },       children:['image'===t.kind?(0,       y.jsx)(d.default,              {
              
              
              
              
              
              
              source:       {
                
                
                
                
                
                
                uri:t.uri
              
              
              
              
              
              
              },       style:       {
                
                
                
                
                
                
                width:68,       height:68,       borderRadius:10,       borderWidth:1,       borderColor:e.border
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }):(0,       y.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                width:68,       height:68,       borderRadius:10,       backgroundColor:e.redSoft,       borderWidth:1,       borderColor:e.border,       alignItems:'center',       justifyContent:'center',       padding:4
              
              
              
              
              
              
              },       children:[(0,       y.jsx)(h.Ionicons,              {
                
                
                
                
                
                
                name:"document-text",       size:22,       color:e.red
              
              
              
              
              
              
              }),       (0,       y.jsx)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontSize:8,       color:e.sub,       marginTop:3
                
                
                
                
                
                
                },       numberOfLines:1,       children:t.name
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       y.jsx)(l.default,              {
              
              
              
              
              
              
              onPress:()=>H(e=>e.filter(e=>e.id!==t.id)),       style:       {
                
                
                
                
                
                
                position:'absolute',       top:-7,       right:-7,       width:22,       height:22,       borderRadius:11,       backgroundColor:e.red,       alignItems:'center',       justifyContent:'center'
              
              
              
              
              
              
              },       children:(0,       y.jsx)(h.Ionicons,              {
                
                
                
                
                
                
                name:"close",       size:13,       color:"#fff"
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          },       t.id))
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.PrimaryButton,              {
          
          
          
          
          
          
          title:"Save Entry",       onPress:()=>       {
            
            
            
            
            
            
            const e=(0,       b.parseNum)(E);
            
            
            
            
            
            
            if(!e||!A.trim())return;
            
            
            
            
            
            
            const t=       {
              
              
              
              
              
              
              id:(0,       b.uid)(),       date:(new Date).toISOString(),       kind:B,       category:O,       description:A.trim(),       amount:e,       mode:N,       bankId:'bank'===N?C.settings.defaultBankId:void 0,       hasBill:_.length>0,       attachments:_.length?_:void 0
            
            
            
            
            
            
            };
            
            
            
            
            
            
            w(       {
              
              
              
              
              
              
              type:'ADD_TXN',       txn:t
            
            
            
            
            
            
            }),       W(!1),       L(''),       F(''),       H([])
          
          
          
          
          
          
          },       icon:"checkmark"
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       y.jsx)(c.default,              {
        
        
        
        
        
        
        visible:!!$,       transparent:!0,       animationType:"fade",       onRequestClose:()=>K(null),       children:(0,       y.jsxs)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1,       backgroundColor:'rgba(0,0,0,0.92)',       justifyContent:'center'
          
          
          
          
          
          
          },       children:[(0,       y.jsx)(l.default,              {
            
            
            
            
            
            
            onPress:()=>K(null),       style:       {
              
              
              
              
              
              
              position:'absolute',       top:48,       right:20,       zIndex:10,       width:40,       height:40,       borderRadius:20,       backgroundColor:'rgba(255,255,255,0.15)',       alignItems:'center',       justifyContent:'center'
            
            
            
            
            
            
            },       children:(0,       y.jsx)(h.Ionicons,              {
              
              
              
              
              
              
              name:"close",       size:24,       color:"#fff"
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       'image'===$?.kind?(0,       y.jsx)(d.default,              {
            
            
            
            
            
            
            source:       {
              
              
              
              
              
              
              uri:$.uri
            
            
            
            
            
            
            },       style:       {
              
              
              
              
              
              
              width:'100%',       height:'78%'
            
            
            
            
            
            
            },       resizeMode:"contain"
          
          
          
          
          
          
          }):(0,       y.jsxs)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              alignItems:'center',       padding:30
            
            
            
            
            
            
            },       children:[(0,       y.jsx)(h.Ionicons,              {
              
              
              
              
              
              
              name:"document-text",       size:64,       color:"#fff"
            
            
            
            
            
            
            }),       (0,       y.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:'#fff',       fontSize:16,       fontWeight:'700',       marginTop:14,       textAlign:'center'
              
              
              
              
              
              
              },       children:$?.name
            
            
            
            
            
            
            }),       (0,       y.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:'rgba(255,255,255,0.6)',       fontSize:13,       marginTop:8,       textAlign:'center'
              
              
              
              
              
              
              },       children:["PDF attached to this entry.",       '\n',       "On Android it opens with your PDF viewer via share."]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       y.jsx)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              position:'absolute',       bottom:40,       alignSelf:'center',       color:'rgba(255,255,255,0.7)',       fontSize:13
            
            
            
            
            
            
            },       children:$?.name
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       920,       [51,       1108,       1153,       1171,       1290,       1256,       1219,       1292,       1095,       1249,       1291,       860,       853,       859,       918,       921,       229])