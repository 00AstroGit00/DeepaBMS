__d(function(g,       r,       i,       _a,       m,       _e,       d)       {
  
  
  
  
  
  
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
      
      
      
      
      
      
      return b
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var t=r(d[0]),       n=e(r(d[1])),       o=e(r(d[2])),       a=e(r(d[3])),       l=e(r(d[4]));
  
  
  
  
  
  
  r(d[5]),       r(d[6]);
  
  
  
  
  
  
  var s=r(d[7]),       c=r(d[8]),       u=r(d[9]),       h=r(d[10]),       f=r(d[11]),       y=r(d[12]),       p=r(d[13]);
  
  
  
  
  
  
  function b()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e
    
    
    
    
    
    
    }
    
    =(0,       u.useTheme)(),              {
      
      
      
      
      
      
      state:b,       dispatch:x
    
    
    
    
    
    
    }
    
    =(0,       h.useStore)(),       [j,       S]=(0,       t.useState)('customer'),       [C,       v]=(0,       t.useState)(null),       [T,       w]=(0,       t.useState)(!1),       [P,       k]=(0,       t.useState)('payment'),       [I,       O]=(0,       t.useState)(''),       [X,       z]=(0,       t.useState)(''),       [N,       R]=(0,       t.useState)(''),       [B,       D]=(0,       t.useState)(''),       [A,       E]=(0,       t.useState)(''),       W=(0,       t.useMemo)(()=>(0,       h.customerOutstanding)(b),       [b]),       _=(0,       t.useMemo)(()=>(0,       h.vendorPayables)(b),       [b]),       V=(0,       t.useMemo)(()=>b.credits.filter(e=>e.type===j).sort((e,       t)=>t.balance-e.balance),       [b.credits,       j]),       M=(0,       t.useMemo)(()=>b.credits.find(e=>e.id===C?.id)||null,       [b.credits,       C]);
    
    
    
    
    
    
    return(0,       p.jsxs)(s.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg
      
      
      
      
      
      
      },       edges:['bottom'],       children:[(0,       p.jsxs)(n.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          padding:16,       paddingBottom:8
        
        
        
        
        
        
        },       children:[(0,       p.jsx)(y.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            padding:14,       marginBottom:12
          
          
          
          
          
          
          },       children:(0,       p.jsxs)(y.Row,              {
            
            
            
            
            
            
            children:[(0,       p.jsx)(y.StatPill,              {
              
              
              
              
              
              
              label:"Customers Owe Us",       value:(0,       f.inr)(W),       color:e.amber
            
            
            
            
            
            
            }),       (0,       p.jsx)(y.StatPill,              {
              
              
              
              
              
              
              label:"We Owe Vendors",       value:(0,       f.inr)(_),       color:e.red
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       p.jsx)(y.Segmented,              {
          
          
          
          
          
          
          options:[       {
            
            
            
            
            
            
            key:'customer',       label:'Customer Credits'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'vendor',       label:'Vendor Payables'
          
          
          
          
          
          
          }],       value:j,       onChange:S
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       p.jsx)(a.default,              {
        
        
        
        
        
        
        data:V,       keyExtractor:e=>e.id,       contentContainerStyle:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingBottom:100
        
        
        
        
        
        
        },       ListEmptyComponent:(0,       p.jsx)(y.EmptyState,              {
          
          
          
          
          
          
          icon:"people-outline",       text:`No ${j} accounts yet`
        
        
        
        
        
        
        }),       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>(0,       p.jsx)(l.default,              {
          
          
          
          
          
          
          onPress:()=>       {
            
            
            
            
            
            
            v(t),       k('payment')
          
          
          
          
          
          
          },       children:(0,       p.jsxs)(y.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              marginBottom:8,       padding:13,       flexDirection:'row',       alignItems:'center',       gap:12
            
            
            
            
            
            
            },       children:[(0,       p.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                width:40,       height:40,       borderRadius:20,       backgroundColor:'customer'===j?e.amberSoft:e.redSoft,       alignItems:'center',       justifyContent:'center'
              
              
              
              
              
              
              },       children:(0,       p.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'800',       color:'customer'===j?e.amber:e.red,       fontSize:15
                
                
                
                
                
                
                },       children:t.name.charAt(0)
              
              
              
              
              
              
              })
            
            
            
            
            
            
            }),       (0,       p.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                flex:1
              
              
              
              
              
              
              },       children:[(0,       p.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'700',       color:e.text,       fontSize:14
                
                
                
                
                
                
                },       numberOfLines:1,       children:t.name
              
              
              
              
              
              
              }),       (0,       p.jsxs)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.faint,       fontSize:11,       marginTop:2
                
                
                
                
                
                
                },       children:[t.phone,       t.gstin?' \xb7 GSTIN '+t.gstin:'']
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       p.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                alignItems:'flex-end'
              
              
              
              
              
              
              },       children:[(0,       p.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'800',       fontSize:15,       color:t.balance>0?'customer'===j?e.amber:e.red:e.green
                
                
                
                
                
                
                },       children:(0,       f.inr)(t.balance)
              
              
              
              
              
              
              }),       (0,       p.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.faint,       fontSize:10,       marginTop:2
                
                
                
                
                
                
                },       children:t.balance>0?'OUTSTANDING':'SETTLED'
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       p.jsx)(l.default,              {
        
        
        
        
        
        
        onPress:()=>w(!0),       style:       {
          
          
          
          
          
          
          position:'absolute',       right:20,       bottom:24,       width:58,       height:58,       borderRadius:29,       backgroundColor:e.amber,       alignItems:'center',       justifyContent:'center',       elevation:6,       shadowColor:'#000',       shadowOpacity:.3,       shadowRadius:8,       shadowOffset:       {
            
            
            
            
            
            
            width:0,       height:4
          
          
          
          
          
          
          }
        
        
        
        
        
        
        },       children:(0,       p.jsx)(c.Ionicons,              {
          
          
          
          
          
          
          name:"person-add-outline",       size:24,       color:"#fff"
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       p.jsx)(y.Sheet,              {
        
        
        
        
        
        
        visible:!!M,       onClose:()=>v(null),       title:M?.name||'',       children:M&&(0,       p.jsxs)(n.default,              {
          
          
          
          
          
          
          children:[(0,       p.jsxs)(y.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              backgroundColor:M.balance>0?e.amberSoft:e.greenSoft,       borderColor:M.balance>0?e.amber:e.green,       marginBottom:16
            
            
            
            
            
            
            },       children:[(0,       p.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:13
              
              
              
              
              
              
              },       children:"Outstanding Balance"
            
            
            
            
            
            
            }),       (0,       p.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontSize:28,       fontWeight:'900',       color:M.balance>0?e.amber:e.green,       marginTop:2
              
              
              
              
              
              
              },       children:(0,       f.inr)(M.balance)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       p.jsx)(y.Segmented,              {
            
            
            
            
            
            
            options:[       {
              
              
              
              
              
              
              key:'payment',       label:'customer'===M.type?'Receive Payment':'Pay Vendor'
            
            
            
            
            
            
            },              {
              
              
              
              
              
              
              key:'credit',       label:'Add Credit'
            
            
            
            
            
            
            }],       value:P,       onChange:k
          
          
          
          
          
          
          }),       (0,       p.jsx)(y.Field,              {
            
            
            
            
            
            
            label:"Amount (\u20b9)",       value:I,       onChangeText:O,       keyboardType:"numeric",       placeholder:"0"
          
          
          
          
          
          
          }),       (0,       p.jsx)(y.Field,              {
            
            
            
            
            
            
            label:"Note",       value:X,       onChangeText:z,       placeholder:"e.g. Part payment - cash"
          
          
          
          
          
          
          }),       (0,       p.jsx)(y.PrimaryButton,              {
            
            
            
            
            
            
            title:'payment'===P?'Record Settlement':'Record Credit',       onPress:()=>       {
              
              
              
              
              
              
              if(!M)return;
              
              
              
              
              
              
              const e=(0,       f.parseNum)(I);
              
              
              
              
              
              
              if(!e)return;
              
              
              
              
              
              
              if('payment'===P&&e>M.balance)       {
                
                
                
                
                
                
                const e=`Outstanding is ${(0,f.inr)(M.balance)}. Payment cannot exceed the balance.`;
                
                
                
                
                
                
                return void window.alert(e)
              
              
              
              
              
              
              }
              let t;
              
              
              
              
              
              
              'payment'===P&&(t='customer'===M.type?       {
                
                
                
                
                
                
                id:(0,       f.uid)(),       date:(new Date).toISOString(),       kind:'income',       category:'Credit Recovery',       description:`Credit received - ${M.name}`,       amount:e,       mode:'cash'
              
              
              
              
              
              
              }
              :       {
                
                
                
                
                
                
                id:(0,       f.uid)(),       date:(new Date).toISOString(),       kind:'expense',       category:'Vendor Payment',       description:`Paid to ${M.name}`,       amount:e,       mode:'cash'
              
              
              
              
              
              
              }),       x(       {
                
                
                
                
                
                
                type:'CREDIT_ENTRY',       accountId:M.id,       entry:       {
                  
                  
                  
                  
                  
                  
                  id:(0,       f.uid)(),       date:(new Date).toISOString(),       kind:P,       amount:e,       note:X.trim()||('credit'===P?'Credit given':'Payment')
                
                
                
                
                
                
                },       cashEffect:t
              
              
              
              
              
              
              }),       O(''),       z('')
            
            
            
            
            
            
            },       icon:"checkmark",       color:'payment'===P?e.green:e.amber
          
          
          
          
          
          
          }),       (0,       p.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              fontSize:13,       fontWeight:'700',       color:e.sub,       marginTop:22,       marginBottom:8,       textTransform:'uppercase',       letterSpacing:.5
            
            
            
            
            
            
            },       children:"Ledger History"
          
          
          
          
          
          
          }),       0===M.history.length&&(0,       p.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.faint
            
            
            
            
            
            
            },       children:"No entries yet."
          
          
          
          
          
          
          }),       M.history.map(t=>(0,       p.jsxs)(y.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between',       paddingVertical:9,       borderBottomWidth:1,       borderBottomColor:e.border
            
            
            
            
            
            
            },       children:[(0,       p.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                flex:1
              
              
              
              
              
              
              },       children:[(0,       p.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.text,       fontSize:13,       fontWeight:'600'
                
                
                
                
                
                
                },       children:t.note
              
              
              
              
              
              
              }),       (0,       p.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.faint,       fontSize:11,       marginTop:2
                
                
                
                
                
                
                },       children:(0,       f.fmtDate)(t.date)
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       p.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'700',       color:'credit'===t.kind?e.amber:e.green
              
              
              
              
              
              
              },       children:['credit'===t.kind?'+':'-',       (0,       f.inr)(t.amount)]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          },       t.id))]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       p.jsxs)(y.Sheet,              {
        
        
        
        
        
        
        visible:T,       onClose:()=>w(!1),       title:`New ${'customer'===j?'Customer':'Vendor'} Account`,       children:[(0,       p.jsx)(y.Field,              {
          
          
          
          
          
          
          label:"Name",       value:N,       onChangeText:R,       placeholder:'customer'===j?'Customer name':'Vendor / supplier name'
        
        
        
        
        
        
        }),       (0,       p.jsx)(y.Field,              {
          
          
          
          
          
          
          label:"Phone",       value:B,       onChangeText:D,       keyboardType:"phone-pad"
        
        
        
        
        
        
        }),       'vendor'===j&&(0,       p.jsx)(y.Field,              {
          
          
          
          
          
          
          label:"GSTIN (optional)",       value:A,       onChangeText:E,       placeholder:"32XXXXXXXXXXXXX"
        
        
        
        
        
        
        }),       (0,       p.jsx)(y.PrimaryButton,              {
          
          
          
          
          
          
          title:"Create Account",       onPress:()=>       {
            
            
            
            
            
            
            N.trim()&&(x(       {
              
              
              
              
              
              
              type:'ADD_CREDIT_ACCOUNT',       account:       {
                
                
                
                
                
                
                id:(0,       f.uid)(),       name:N.trim(),       phone:B.trim(),       type:j,       gstin:A.trim()||void 0,       balance:0,       history:[]
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       w(!1),       R(''),       D(''),       E(''))
          
          
          
          
          
          
          },       icon:"person-add-outline",       color:e.amber
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       950,       [51,       1108,       1153,       1171,       1290,       1298,       1095,       1249,       1291,       860,       853,       859,       918,       229])