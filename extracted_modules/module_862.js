__d(function(g,       r,       _i,       _a,       _m,       _e,       d)       {
  
  
  
  
  
  
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
      
      
      
      
      
      
      return j
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var t=r(d[0]),       n=e(r(d[1])),       o=e(r(d[2])),       l=e(r(d[3])),       s=e(r(d[4])),       a=e(r(d[5])),       i=r(d[6]),       c=r(d[7]),       u=r(d[8]),       f=r(d[9]),       h=r(d[10]),       x=r(d[11]),       y=r(d[12]),       m=r(d[13]);
  
  
  
  
  
  
  function j(       {
    
    
    
    
    
    
    navigation:e
  
  
  
  
  
  
  })       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:j,       toggle:b
    
    
    
    
    
    
    }
    
    =(0,       u.useTheme)(),              {
      
      
      
      
      
      
      state:p
    
    
    
    
    
    
    }
    
    =(0,       f.useStore)(),       [S,       C]=(0,       t.useState)(!1),       w=(0,       t.useMemo)(()=>(0,       f.financeForDay)(p,       (0,       h.todayKey)()),       [p]),       T=(0,       t.useMemo)(()=>(0,       f.financeForMonth)(p),       [p]),       v=(0,       t.useMemo)(()=>(0,       f.cashInHand)(p),       [p]),       z=(0,       t.useMemo)(()=>(0,       f.bankBalance)(p),       [p]),       M=(0,       t.useMemo)(()=>(0,       f.customerOutstanding)(p),       [p]),       k=(0,       t.useMemo)(()=>(0,       f.vendorPayables)(p),       [p]),       I=(0,       t.useMemo)(()=>(0,       f.lowStockItems)(p),       [p]),       R=(0,       t.useMemo)(()=>(0,       f.occupancy)(p),       [p]),       D=(0,       t.useMemo)(()=>(0,       h.lastNDays)(7).map(e=>       {
      
      
      
      
      
      
      const t=(0,       f.financeForDay)(p,       e);
      
      
      
      
      
      
      return       {
        
        
        
        
        
        
        label:(0,       h.dayLabel)(e),       value:t.revenue
      
      
      
      
      
      
      }
    
    
    
    
    
    
    }),       [p]),       W=(0,       t.useMemo)(()=>       {
      
      
      
      
      
      
      const e=(0,       h.todayKey)().slice(0,       7),       t=new Map;
      
      
      
      
      
      
      for(const n of p.txns)'expense'===n.kind&&(0,       h.keyOf)(n.date).startsWith(e)&&t.set(n.category,       (t.get(n.category)||0)+n.amount);
      
      
      
      
      
      
      const n=[j.red,       j.amber,       j.blue,       j.purple,       j.teal];
      
      
      
      
      
      
      return Array.from(t.entries()).sort((e,       t)=>t[1]-e[1]).slice(0,       5).map(([e,       t],       o)=>(       {
        
        
        
        
        
        
        label:e,       value:t,       color:n[o%n.length]
      
      
      
      
      
      
      }))
    
    
    
    
    
    
    },       [p,       j]),       B=[       {
      
      
      
      
      
      
      label:'Restaurant',       value:T.restaurant,       color:j.primary
    
    
    
    
    
    
    },              {
      
      
      
      
      
      
      label:'Bar',       value:T.bar,       color:j.amber
    
    
    
    
    
    
    },              {
      
      
      
      
      
      
      label:'Rooms',       value:T.rooms,       color:j.blue
    
    
    
    
    
    
    },              {
      
      
      
      
      
      
      label:'Takeaway',       value:T.takeaway+T.online,       color:j.teal
    
    
    
    
    
    
    }],       P=(new Date).toLocaleDateString('en-IN',              {
      
      
      
      
      
      
      weekday:'long',       day:'numeric',       month:'long'
    
    
    
    
    
    
    }),       O=(e,       t,       l,       a,       i,       u)=>(0,       m.jsx)(s.default,              {
      
      
      
      
      
      
      disabled:!u,       onPress:u,       style:       {
        
        
        
        
        
        
        width:'48.5%'
      
      
      
      
      
      
      },       children:(0,       m.jsxs)(x.Card,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          padding:14
        
        
        
        
        
        
        },       children:[(0,       m.jsxs)(x.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            justifyContent:'space-between'
          
          
          
          
          
          
          },       children:[(0,       m.jsx)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              width:34,       height:34,       borderRadius:10,       backgroundColor:i,       alignItems:'center',       justifyContent:'center'
            
            
            
            
            
            
            },       children:(0,       m.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:l,       size:18,       color:a
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       u&&(0,       m.jsx)(c.Ionicons,              {
            
            
            
            
            
            
            name:"chevron-forward",       size:15,       color:j.faint
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       m.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:12,       color:j.sub,       marginTop:10
          
          
          
          
          
          
          },       children:e
        
        
        
        
        
        
        }),       (0,       m.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:18,       fontWeight:'800',       color:j.text,       marginTop:2
          
          
          
          
          
          
          },       children:t
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })
    
    
    
    
    
    
    },       e);
    
    
    
    
    
    
    return(0,       m.jsx)(i.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:j.bg
      
      
      
      
      
      
      },       edges:['top'],       children:(0,       m.jsxs)(l.default,              {
        
        
        
        
        
        
        contentContainerStyle:       {
          
          
          
          
          
          
          padding:16,       paddingBottom:32
        
        
        
        
        
        
        },       refreshControl:(0,       m.jsx)(a.default,              {
          
          
          
          
          
          
          refreshing:S,       onRefresh:()=>       {
            
            
            
            
            
            
            C(!0),       setTimeout(()=>C(!1),       600)
          
          
          
          
          
          
          },       tintColor:j.primary
        
        
        
        
        
        
        }),       children:[(0,       m.jsxs)(x.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            justifyContent:'space-between',       marginBottom:16
          
          
          
          
          
          
          },       children:[(0,       m.jsxs)(n.default,              {
            
            
            
            
            
            
            children:[(0,       m.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontSize:22,       fontWeight:'800',       color:j.text
              
              
              
              
              
              
              },       children:"Deepa BMS"
            
            
            
            
            
            
            }),       (0,       m.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontSize:13,       color:j.sub,       marginTop:2
              
              
              
              
              
              
              },       children:[P,       " \xb7 Cherpulassery"]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       m.jsx)(s.default,              {
            
            
            
            
            
            
            onPress:b,       style:       {
              
              
              
              
              
              
              width:40,       height:40,       borderRadius:20,       backgroundColor:j.card,       borderWidth:1,       borderColor:j.border,       alignItems:'center',       justifyContent:'center'
            
            
            
            
            
            
            },       children:(0,       m.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:j.dark?'sunny-outline':'moon-outline',       size:19,       color:j.sub
            
            
            
            
            
            
            })
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       m.jsxs)(x.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            backgroundColor:j.primary,       borderColor:j.primary
          
          
          
          
          
          
          },       children:[(0,       m.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:'rgba(255,255,255,0.85)',       fontSize:13,       fontWeight:'600'
            
            
            
            
            
            
            },       children:"TODAY'S REVENUE"
          
          
          
          
          
          
          }),       (0,       m.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:'#fff',       fontSize:36,       fontWeight:'900',       marginTop:4
            
            
            
            
            
            
            },       children:(0,       h.inr)(w.revenue)
          
          
          
          
          
          
          }),       (0,       m.jsx)(x.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              marginTop:14,       gap:0
            
            
            
            
            
            
            },       children:[['Restaurant',       w.restaurant],       ['Bar',       w.bar],       ['Rooms',       w.rooms],       ['Other',       w.takeaway+w.online]].map(([e,       t],       l)=>(0,       m.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                flex:1
              
              
              
              
              
              
              },       children:[(0,       m.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:'rgba(255,255,255,0.75)',       fontSize:11
                
                
                
                
                
                
                },       children:e
              
              
              
              
              
              
              }),       (0,       m.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:'#fff',       fontSize:15,       fontWeight:'700',       marginTop:2
                
                
                
                
                
                
                },       children:(0,       h.inr)(t)
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            },       l))
          
          
          
          
          
          
          }),       (0,       m.jsx)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              height:1,       backgroundColor:'rgba(255,255,255,0.2)',       marginVertical:12
            
            
            
            
            
            
            }
          
          
          
          
          
          
          }),       (0,       m.jsxs)(x.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between'
            
            
            
            
            
            
            },       children:[(0,       m.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:'rgba(255,255,255,0.85)',       fontSize:13
              
              
              
              
              
              
              },       children:["Expenses ",       (0,       h.inr)(w.expenses)]
            
            
            
            
            
            
            }),       (0,       m.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:'#fff',       fontSize:14,       fontWeight:'800'
              
              
              
              
              
              
              },       children:["Day P/L ",       w.profit>=0?'+':'',       (0,       h.inr)(w.profit)]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       m.jsx)(x.SectionTitle,              {
          
          
          
          
          
          
          children:"Money Position"
        
        
        
        
        
        
        }),       (0,       m.jsxs)(n.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flexDirection:'row',       flexWrap:'wrap',       gap:10
          
          
          
          
          
          
          },       children:[O('Cash in Hand',       (0,       h.inr)(v),       'cash-outline',       j.green,       j.greenSoft,       ()=>e.navigate('DayBookTab')),       O('Bank Balance',       (0,       h.inr)(z),       'business-outline',       j.blue,       j.blueSoft,       ()=>e.navigate('MoreTab',              {
            
            
            
            
            
            
            screen:'Banking'
          
          
          
          
          
          
          })),       O('Customer Credits',       (0,       h.inr)(M),       'people-outline',       j.amber,       j.amberSoft,       ()=>e.navigate('MoreTab',              {
            
            
            
            
            
            
            screen:'Credits'
          
          
          
          
          
          
          })),       O('Vendor Payables',       (0,       h.inr)(k),       'cart-outline',       j.red,       j.redSoft,       ()=>e.navigate('MoreTab',              {
            
            
            
            
            
            
            screen:'Credits'
          
          
          
          
          
          
          })),       O("Today's Purchases",       (0,       h.inr)(w.purchases),       'bag-add-outline',       j.purple,       j.purpleSoft,       ()=>e.navigate('DayBookTab')),       O('Month Expenses',       (0,       h.inr)(T.expenses),       'trending-down-outline',       j.teal,       j.tealSoft,       ()=>e.navigate('ReportsTab'))]
        
        
        
        
        
        
        }),       I.length>0&&(0,       m.jsx)(s.default,              {
          
          
          
          
          
          
          onPress:()=>e.navigate('MoreTab',              {
            
            
            
            
            
            
            screen:'Inventory'
          
          
          
          
          
          
          }),       children:(0,       m.jsxs)(x.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              marginTop:14,       backgroundColor:j.amberSoft,       borderColor:j.amber,       flexDirection:'row',       alignItems:'center',       gap:12
            
            
            
            
            
            
            },       children:[(0,       m.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:"warning-outline",       size:22,       color:j.amber
            
            
            
            
            
            
            }),       (0,       m.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                flex:1
              
              
              
              
              
              
              },       children:[(0,       m.jsxs)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'700',       color:j.text,       fontSize:14
                
                
                
                
                
                
                },       children:[I.length,       " item",       I.length>1?'s':'',       " below reorder level"]
              
              
              
              
              
              
              }),       (0,       m.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:j.sub,       fontSize:12,       marginTop:2
                
                
                
                
                
                
                },       numberOfLines:1,       children:I.map(e=>e.name).join(', ')
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       m.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:"chevron-forward",       size:16,       color:j.amber
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       m.jsx)(s.default,              {
          
          
          
          
          
          
          onPress:()=>e.navigate('HotelTab'),       children:(0,       m.jsxs)(x.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              marginTop:14,       flexDirection:'row',       alignItems:'center',       gap:14
            
            
            
            
            
            
            },       children:[(0,       m.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                width:46,       height:46,       borderRadius:14,       backgroundColor:j.blueSoft,       alignItems:'center',       justifyContent:'center'
              
              
              
              
              
              
              },       children:(0,       m.jsx)(c.Ionicons,              {
                
                
                
                
                
                
                name:"bed-outline",       size:22,       color:j.blue
              
              
              
              
              
              
              })
            
            
            
            
            
            
            }),       (0,       m.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                flex:1
              
              
              
              
              
              
              },       children:[(0,       m.jsxs)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'700',       color:j.text,       fontSize:15
                
                
                
                
                
                
                },       children:["Occupancy ",       R.pct,       "%"]
              
              
              
              
              
              
              }),       (0,       m.jsxs)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:j.sub,       fontSize:12,       marginTop:2
                
                
                
                
                
                
                },       children:[R.occupied,       " of ",       R.total,       " rooms occupied"]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       m.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                width:80
              
              
              
              
              
              
              },       children:(0,       m.jsx)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  height:8,       backgroundColor:j.cardAlt,       borderRadius:4,       overflow:'hidden'
                
                
                
                
                
                
                },       children:(0,       m.jsx)(n.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    width:`${R.pct}%`,       height:8,       backgroundColor:j.blue
                  
                  
                  
                  
                  
                  
                  }
                
                
                
                
                
                
                })
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       m.jsx)(x.SectionTitle,              {
          
          
          
          
          
          
          children:"Revenue \xb7 Last 7 Days"
        
        
        
        
        
        
        }),       (0,       m.jsx)(x.Card,              {
          
          
          
          
          
          
          children:(0,       m.jsx)(y.BarChart,              {
            
            
            
            
            
            
            data:D
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       m.jsx)(x.SectionTitle,              {
          
          
          
          
          
          
          children:"This Month \xb7 Department Split"
        
        
        
        
        
        
        }),       (0,       m.jsxs)(x.Card,              {
          
          
          
          
          
          
          children:[(0,       m.jsxs)(x.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between',       marginBottom:14
            
            
            
            
            
            
            },       children:[(0,       m.jsxs)(n.default,              {
              
              
              
              
              
              
              children:[(0,       m.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontSize:12,       color:j.sub
                
                
                
                
                
                
                },       children:"Month Revenue"
              
              
              
              
              
              
              }),       (0,       m.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontSize:22,       fontWeight:'800',       color:j.text
                
                
                
                
                
                
                },       children:(0,       h.inr)(T.revenue)
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       m.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                alignItems:'flex-end'
              
              
              
              
              
              
              },       children:[(0,       m.jsx)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontSize:12,       color:j.sub
                
                
                
                
                
                
                },       children:"Month P/L"
              
              
              
              
              
              
              }),       (0,       m.jsxs)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontSize:22,       fontWeight:'800',       color:T.profit>=0?j.green:j.red
                
                
                
                
                
                
                },       children:[T.profit>=0?'+':'',       (0,       h.inr)(T.profit)]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       m.jsx)(y.DonutLegend,              {
            
            
            
            
            
            
            data:B,       total:T.revenue
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       m.jsx)(x.SectionTitle,              {
          
          
          
          
          
          
          children:"Top Expenses \xb7 This Month"
        
        
        
        
        
        
        }),       (0,       m.jsx)(x.Card,              {
          
          
          
          
          
          
          children:W.length>0?(0,       m.jsx)(y.HBarChart,              {
            
            
            
            
            
            
            data:W
          
          
          
          
          
          
          }):(0,       m.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:j.faint
            
            
            
            
            
            
            },       children:"No expenses recorded this month."
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       m.jsxs)(x.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginTop:14,       flexDirection:'row',       alignItems:'center',       gap:14
          
          
          
          
          
          
          },       children:[(0,       m.jsx)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              width:46,       height:46,       borderRadius:14,       backgroundColor:j.purpleSoft,       alignItems:'center',       justifyContent:'center'
            
            
            
            
            
            
            },       children:(0,       m.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:"document-text-outline",       size:22,       color:j.purple
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       (0,       m.jsxs)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:[(0,       m.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'700',       color:j.text,       fontSize:15
              
              
              
              
              
              
              },       children:"GST collected this month"
            
            
            
            
            
            
            }),       (0,       m.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:j.sub,       fontSize:12,       marginTop:2
              
              
              
              
              
              
              },       children:"GST 2.0 \xb7 restaurant 5% \xb7 rooms 5% (no ITC)"
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       m.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              fontSize:17,       fontWeight:'800',       color:j.purple
            
            
            
            
            
            
            },       children:(0,       h.inr)(T.gstCollected)
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       862,       [51,       1108,       1153,       1179,       1290,       1178,       1249,       1291,       860,       853,       859,       918,       919,       229])