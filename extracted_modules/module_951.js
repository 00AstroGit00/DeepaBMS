__d(function(g,       r,       i,       a,       _m,       _e,       d)       {
  
  
  
  
  
  
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
      
      
      
      
      
      
      return x
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var t=r(d[0]),       n=e(r(d[1])),       o=e(r(d[2])),       s=e(r(d[3])),       l=e(r(d[4]));
  
  
  
  
  
  
  r(d[5]),       r(d[6]);
  
  
  
  
  
  
  var c=r(d[7]),       u=r(d[8]),       f=r(d[9]),       h=r(d[10]),       b=r(d[11]),       m=r(d[12]),       p=r(d[13]);
  
  
  
  
  
  
  function x()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e
    
    
    
    
    
    
    }
    
    =(0,       f.useTheme)(),              {
      
      
      
      
      
      
      state:x,       dispatch:k
    
    
    
    
    
    
    }
    
    =(0,       h.useStore)(),       [w,       j]=(0,       t.useState)(!1),       [y,       S]=(0,       t.useState)('deposit'),       [C,       v]=(0,       t.useState)(x.banks[0]?.id||''),       [B,       I]=(0,       t.useState)(x.banks[1]?.id||''),       [z,       T]=(0,       t.useState)(''),       [$,       N]=(0,       t.useState)(''),       D=(0,       t.useMemo)(()=>(0,       h.cashInHand)(x),       [x]),       P=(0,       t.useMemo)(()=>(0,       h.bankBalance)(x),       [x]),       _=(e,       t)=>       {
      
      
      
      
      
      
      window.alert(`${e}\n\n${t}`)
    
    
    
    
    
    
    },       A=e=>x.banks.find(t=>t.id===e)?.name.split(' \xb7 ')[0]||'';
    
    
    
    
    
    
    return(0,       p.jsxs)(c.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg
      
      
      
      
      
      
      },       edges:['bottom'],       children:[(0,       p.jsxs)(n.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          padding:16,       paddingBottom:8
        
        
        
        
        
        
        },       children:[(0,       p.jsx)(m.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            padding:14,       marginBottom:12
          
          
          
          
          
          
          },       children:(0,       p.jsxs)(m.Row,              {
            
            
            
            
            
            
            children:[(0,       p.jsx)(m.StatPill,              {
              
              
              
              
              
              
              label:"Cash in Hand",       value:(0,       b.inr)(D),       color:e.green
            
            
            
            
            
            
            }),       (0,       p.jsx)(m.StatPill,              {
              
              
              
              
              
              
              label:"Total Bank Balance",       value:(0,       b.inr)(P),       color:e.blue
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       x.banks.map(t=>(0,       p.jsxs)(m.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginBottom:8,       padding:13,       flexDirection:'row',       alignItems:'center',       gap:12
          
          
          
          
          
          
          },       children:[(0,       p.jsx)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              width:40,       height:40,       borderRadius:12,       backgroundColor:e.blueSoft,       alignItems:'center',       justifyContent:'center'
            
            
            
            
            
            
            },       children:(0,       p.jsx)(u.Ionicons,              {
              
              
              
              
              
              
              name:"business-outline",       size:19,       color:e.blue
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       (0,       p.jsxs)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:[(0,       p.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'700',       color:e.text,       fontSize:14
              
              
              
              
              
              
              },       children:t.name
            
            
            
            
            
            
            }),       (0,       p.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:11,       marginTop:2
              
              
              
              
              
              
              },       children:[t.accountNo,       t.id===x.settings.defaultBankId?' \xb7 Default for UPI/Card':'']
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       p.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              fontWeight:'800',       fontSize:15,       color:e.blue
            
            
            
            
            
            
            },       children:(0,       b.inr)((0,       h.bankBalance)(x,       t.id))
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        },       t.id))]
      
      
      
      
      
      
      }),       (0,       p.jsx)(o.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          fontSize:13,       fontWeight:'700',       color:e.sub,       textTransform:'uppercase',       letterSpacing:.5,       paddingHorizontal:16,       marginTop:8,       marginBottom:8
        
        
        
        
        
        
        },       children:"Recent Movements"
      
      
      
      
      
      
      }),       (0,       p.jsx)(s.default,              {
        
        
        
        
        
        
        data:x.bankMoves,       keyExtractor:e=>e.id,       contentContainerStyle:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingBottom:100
        
        
        
        
        
        
        },       ListEmptyComponent:(0,       p.jsx)(m.EmptyState,              {
          
          
          
          
          
          
          icon:"swap-horizontal-outline",       text:"No bank movements yet"
        
        
        
        
        
        
        }),       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>(0,       p.jsxs)(m.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginBottom:8,       padding:13,       flexDirection:'row',       alignItems:'center',       gap:12
          
          
          
          
          
          
          },       children:[(0,       p.jsx)(u.Ionicons,              {
            
            
            
            
            
            
            name:'deposit'===t.kind?'arrow-down-circle-outline':'withdraw'===t.kind?'arrow-up-circle-outline':'swap-horizontal-outline',       size:22,       color:'deposit'===t.kind?e.green:'withdraw'===t.kind?e.amber:e.blue
          
          
          
          
          
          
          }),       (0,       p.jsxs)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:[(0,       p.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'700',       color:e.text,       fontSize:14
              
              
              
              
              
              
              },       children:t.note
            
            
            
            
            
            
            }),       (0,       p.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:11,       marginTop:2
              
              
              
              
              
              
              },       children:['transfer'===t.kind?`${A(t.bankId)} \u2192 ${A(t.toBankId)}`:A(t.bankId),       " \xb7 ",       (0,       b.fmtDateTime)(t.date)]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       p.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              fontWeight:'800',       fontSize:15,       color:e.text
            
            
            
            
            
            
            },       children:(0,       b.inr)(t.amount)
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       p.jsx)(l.default,              {
        
        
        
        
        
        
        onPress:()=>j(!0),       style:       {
          
          
          
          
          
          
          position:'absolute',       right:20,       bottom:24,       width:58,       height:58,       borderRadius:29,       backgroundColor:e.blue,       alignItems:'center',       justifyContent:'center',       elevation:6,       shadowColor:'#000',       shadowOpacity:.3,       shadowRadius:8,       shadowOffset:       {
            
            
            
            
            
            
            width:0,       height:4
          
          
          
          
          
          
          }
        
        
        
        
        
        
        },       children:(0,       p.jsx)(u.Ionicons,              {
          
          
          
          
          
          
          name:"swap-horizontal",       size:26,       color:"#fff"
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       p.jsxs)(m.Sheet,              {
        
        
        
        
        
        
        visible:w,       onClose:()=>j(!1),       title:"Bank Transaction",       children:[(0,       p.jsx)(m.Segmented,              {
          
          
          
          
          
          
          options:[       {
            
            
            
            
            
            
            key:'deposit',       label:'Deposit'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'withdraw',       label:'Withdraw'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'transfer',       label:'Transfer'
          
          
          
          
          
          
          }],       value:y,       onChange:S
        
        
        
        
        
        
        }),       (0,       p.jsx)(m.Select,              {
          
          
          
          
          
          
          label:'transfer'===y?'From Account':'Account',       value:C,       onChange:v,       color:e.blue,       options:x.banks.map(e=>(       {
            
            
            
            
            
            
            value:e.id,       label:e.name,       icon:'business-outline',       sub:`${e.accountNo} \xb7 balance ${(0,b.inr)((0,h.bankBalance)(x,e.id))}`
          
          
          
          
          
          
          }))
        
        
        
        
        
        
        }),       'transfer'===y&&(0,       p.jsx)(m.Select,              {
          
          
          
          
          
          
          label:"To Account",       value:B,       onChange:I,       color:e.purple,       options:x.banks.filter(e=>e.id!==C).map(e=>(       {
            
            
            
            
            
            
            value:e.id,       label:e.name,       icon:'business-outline',       sub:e.accountNo
          
          
          
          
          
          
          }))
        
        
        
        
        
        
        }),       (0,       p.jsx)(m.Field,              {
          
          
          
          
          
          
          label:"Amount (\u20b9)",       value:z,       onChangeText:T,       keyboardType:"numeric",       placeholder:"0"
        
        
        
        
        
        
        }),       (0,       p.jsx)(m.Field,              {
          
          
          
          
          
          
          label:"Note",       value:$,       onChangeText:N,       placeholder:"e.g. Weekly cash deposit"
        
        
        
        
        
        
        }),       'transfer'!==y&&(0,       p.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            color:e.faint,       fontSize:12,       marginBottom:14
          
          
          
          
          
          
          },       children:'deposit'===y?'Cash in hand will decrease, bank will increase.':'Bank will decrease, cash in hand will increase.'
        
        
        
        
        
        
        }),       (0,       p.jsx)(m.PrimaryButton,              {
          
          
          
          
          
          
          title:"Save Transaction",       onPress:()=>       {
            
            
            
            
            
            
            const e=(0,       b.parseNum)(z);
            
            
            
            
            
            
            if(!e)return;
            
            
            
            
            
            
            if('deposit'===y&&e>D)return void _('Not Enough Cash',       `Cash in hand is ${(0,b.inr)(D)}. Cannot deposit ${(0,b.inr)(e)}.`);
            
            
            
            
            
            
            const t=(0,       h.bankBalance)(x,       C);
            
            
            
            
            
            
            if(('withdraw'===y||'transfer'===y)&&e>t)return void _('Insufficient Bank Balance',       `${A(C)} balance is ${(0,b.inr)(t)}. Cannot move ${(0,b.inr)(e)}.`);
            
            
            
            
            
            
            const n='transfer'===y?B!==C?B:x.banks.find(e=>e.id!==C)?.id:void 0;
            
            
            
            
            
            
            'transfer'!==y||n?(k(       {
              
              
              
              
              
              
              type:'ADD_BANK_MOVE',       move:       {
                
                
                
                
                
                
                id:(0,       b.uid)(),       date:(new Date).toISOString(),       kind:y,       amount:e,       bankId:C,       toBankId:n,       note:$.trim()||('deposit'===y?'Cash deposit':'withdraw'===y?'Cash withdrawal':'Inter-bank transfer')
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       j(!1),       T(''),       N('')):_('Transfer Error',       'Need a second bank account to transfer to.')
          
          
          
          
          
          
          },       icon:"checkmark",       color:e.blue
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       951,       [51,       1108,       1153,       1171,       1290,       1298,       1095,       1249,       1291,       860,       853,       859,       918,       229])