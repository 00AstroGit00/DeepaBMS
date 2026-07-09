__d(function(g,       r,       i,       a,       m,       _e,       d)       {
  
  
  
  
  
  
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
      
      
      
      
      
      
      return O
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var t=r(d[0]),       o=e(r(d[1])),       n=e(r(d[2])),       l=e(r(d[3])),       s=e(r(d[4])),       c=r(d[5]),       u=r(d[6]),       f=r(d[7]),       y=r(d[8]),       b=r(d[9]),       h=e(r(d[10])),       p=e(r(d[11])),       k=e(r(d[12])),       x=e(r(d[13])),       j=e(r(d[14])),       S=e(r(d[15])),       I=e(r(d[16])),       C=e(r(d[17])),       B=e(r(d[18])),       D=e(r(d[19])),       z=e(r(d[20])),       R=e(r(d[21])),       T=r(d[22]);
  
  
  
  
  
  
  const W=[       {
    
    
    
    
    
    
    key:'Dashboard',       label:'Dashboard',       icon:'grid-outline',       section:'OVERVIEW',       perm:'dashboard'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'DayBook',       label:'Day Book',       icon:'book-outline',       section:'DAILY OPERATIONS',       perm:'daybook'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'Sales',       label:'Sales Register',       icon:'receipt-outline',       perm:'sales'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'Hotel',       label:'Hotel & Rooms',       icon:'bed-outline',       perm:'hotel'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'Bar',       label:'Bar Management',       icon:'wine-outline',       perm:'bar'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'Inventory',       label:'Inventory',       icon:'cube-outline',       section:'BACK OFFICE',       perm:'inventory'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'Credits',       label:'Credits & Payables',       icon:'people-outline',       perm:'credits'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'Banking',       label:'Banking',       icon:'business-outline',       perm:'banking'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'Employees',       label:'Employees',       icon:'id-card-outline',       perm:'employees'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'Reports',       label:'Reports & GST',       icon:'stats-chart-outline',       section:'ANALYSIS',       perm:'reports'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'Users',       label:'Users & Access',       icon:'shield-checkmark-outline',       perm:'users'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'Settings',       label:'Settings & More',       icon:'settings-outline',       perm:null
  
  
  
  
  
  
  }],       A=       {
    
    
    
    
    
    
    Dashboard:h.default,       DayBook:p.default,       Sales:k.default,       Hotel:x.default,       Bar:j.default,       Inventory:S.default,       Credits:I.default,       Banking:C.default,       Employees:B.default,       Reports:D.default,       Users:R.default,       Settings:z.default
  
  
  
  
  
  
  };
  
  
  
  
  
  
  function H(e,       t)       {
    
    
    
    
    
    
    const o=       {
      
      
      
      
      
      
      HomeTab:'Dashboard',       DayBookTab:'DayBook',       SalesTab:'Sales',       HotelTab:'Hotel',       BarTab:'Bar',       ReportsTab:'Reports',       MoreTab:'Settings',       Inventory:'Inventory',       Credits:'Credits',       Banking:'Banking',       Employees:'Employees',       Users:'Users'
    
    
    
    
    
    
    };
    
    
    
    
    
    
    return'MoreTab'===e&&t?.screen&&o[t.screen]?o[t.screen]:o[e]||'Dashboard'
  
  
  
  
  
  
  }
  
  
  function O()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e,       toggle:h
    
    
    
    
    
    
    }
    
    =(0,       u.useTheme)(),              {
      
      
      
      
      
      
      state:p,       dispatch:k
    
    
    
    
    
    
    }
    
    =(0,       f.useStore)(),              {
      
      
      
      
      
      
      currentUser:x,       logout:j,       can:S
    
    
    
    
    
    
    }
    
    =(0,       y.useAuth)(),       I=W.filter(e=>null===e.perm||S(e.perm)),       C=I[0]?.key||'Settings',       [B,       D]=(0,       t.useState)(C),       z=I.some(e=>e.key===B)?B:C,       R=A[z],       O=       {
      
      
      
      
      
      
      navigate:(e,       t)=>       {
        
        
        
        
        
        
        const o=H(e,       t);
        
        
        
        
        
        
        I.some(e=>e.key===o)&&D(o)
      
      
      
      
      
      
      }
    
    
    
    
    
    
    },       v=(0,       f.cashInHand)(p);
    
    
    
    
    
    
    return(0,       T.jsxs)(o.default,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       flexDirection:'row',       backgroundColor:e.bg
      
      
      
      
      
      
      },       children:[(0,       T.jsxs)(o.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          width:248,       backgroundColor:e.card,       borderRightWidth:1,       borderRightColor:e.border
        
        
        
        
        
        
        },       children:[(0,       T.jsxs)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            padding:18,       paddingBottom:12,       flexDirection:'row',       alignItems:'center',       gap:11
          
          
          
          
          
          
          },       children:[(0,       T.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              width:40,       height:40,       borderRadius:12,       backgroundColor:e.primary,       alignItems:'center',       justifyContent:'center'
            
            
            
            
            
            
            },       children:(0,       T.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:"restaurant",       size:20,       color:"#fff"
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       (0,       T.jsxs)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:[(0,       T.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'900',       color:e.text,       fontSize:16
              
              
              
              
              
              
              },       children:"Deepa BMS"
            
            
            
            
            
            
            }),       (0,       T.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:11
              
              
              
              
              
              
              },       children:"Cherpulassery"
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       x&&(0,       T.jsxs)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginHorizontal:10,       marginBottom:6,       backgroundColor:e.cardAlt,       borderRadius:12,       padding:11,       flexDirection:'row',       alignItems:'center',       gap:10,       borderWidth:1,       borderColor:e.border
          
          
          
          
          
          
          },       children:[(0,       T.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              width:34,       height:34,       borderRadius:17,       backgroundColor:e.primarySoft,       alignItems:'center',       justifyContent:'center'
            
            
            
            
            
            
            },       children:(0,       T.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'800',       color:e.primary,       fontSize:14
              
              
              
              
              
              
              },       children:x.name.charAt(0)
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       (0,       T.jsxs)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:[(0,       T.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'800',       color:e.text,       fontSize:12.5
              
              
              
              
              
              
              },       numberOfLines:1,       children:x.name
            
            
            
            
            
            
            }),       (0,       T.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:10.5
              
              
              
              
              
              
              },       children:y.ROLE_INFO[x.role].label
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       T.jsx)(l.default,              {
            
            
            
            
            
            
            onPress:()=>       {
              
              
              
              
              
              
              x&&k(       {
                
                
                
                
                
                
                type:'AUDIT',       event:       {
                  
                  
                  
                  
                  
                  
                  id:(0,       b.uid)(),       date:(new Date).toISOString(),       userId:x.id,       userName:x.name,       action:'LOGOUT'
                
                
                
                
                
                
                }
              
              
              
              
              
              
              }),       j()
            
            
            
            
            
            
            },       style:       {
              
              
              
              
              
              
              padding:5
            
            
            
            
            
            
            },       children:(0,       T.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:"log-out-outline",       size:18,       color:e.red
            
            
            
            
            
            
            })
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       T.jsx)(s.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1
          
          
          
          
          
          
          },       contentContainerStyle:       {
            
            
            
            
            
            
            paddingHorizontal:10,       paddingBottom:12
          
          
          
          
          
          
          },       children:I.map(t=>(0,       T.jsxs)(o.default,              {
            
            
            
            
            
            
            children:[t.section&&(0,       T.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:10,       fontWeight:'800',       letterSpacing:1,       marginTop:14,       marginBottom:6,       marginLeft:12
              
              
              
              
              
              
              },       children:t.section
            
            
            
            
            
            
            }),       (0,       T.jsxs)(l.default,              {
              
              
              
              
              
              
              onPress:()=>D(t.key),       style:       {
                
                
                
                
                
                
                flexDirection:'row',       alignItems:'center',       gap:11,       paddingVertical:10,       paddingHorizontal:12,       borderRadius:10,       marginBottom:2,       backgroundColor:z===t.key?e.primarySoft:'transparent'
              
              
              
              
              
              
              },       children:[(0,       T.jsx)(c.Ionicons,              {
                
                
                
                
                
                
                name:t.icon,       size:18,       color:z===t.key?e.primary:e.sub
              
              
              
              
              
              
              }),       (0,       T.jsx)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:z===t.key?e.primary:e.sub,       fontWeight:z===t.key?'800':'600',       fontSize:13.5
                
                
                
                
                
                
                },       children:t.label
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          },       t.key))
        
        
        
        
        
        
        }),       (0,       T.jsxs)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            padding:14,       borderTopWidth:1,       borderTopColor:e.border,       gap:10
          
          
          
          
          
          
          },       children:[(S('dashboard')||S('banking'))&&(0,       T.jsxs)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              backgroundColor:e.greenSoft,       borderRadius:12,       padding:11
            
            
            
            
            
            
            },       children:[(0,       T.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:11,       fontWeight:'600'
              
              
              
              
              
              
              },       children:"CASH IN HAND"
            
            
            
            
            
            
            }),       (0,       T.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.green,       fontSize:18,       fontWeight:'900',       marginTop:2
              
              
              
              
              
              
              },       children:(0,       b.inr)(v)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       T.jsxs)(l.default,              {
            
            
            
            
            
            
            onPress:h,       style:       {
              
              
              
              
              
              
              flexDirection:'row',       alignItems:'center',       gap:9,       paddingVertical:8,       paddingHorizontal:12,       borderRadius:10,       backgroundColor:e.cardAlt,       borderWidth:1,       borderColor:e.border
            
            
            
            
            
            
            },       children:[(0,       T.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:e.dark?'sunny-outline':'moon-outline',       size:16,       color:e.sub
            
            
            
            
            
            
            }),       (0,       T.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontWeight:'600',       fontSize:13
              
              
              
              
              
              
              },       children:e.dark?'Light Mode':'Dark Mode'
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       T.jsx)(o.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          flex:1,       alignItems:'center'
        
        
        
        
        
        
        },       children:(0,       T.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1,       width:'100%',       maxWidth:1100
          
          
          
          
          
          
          },       children:(0,       T.jsx)(R,              {
            
            
            
            
            
            
            navigation:O
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       956,       [51,       1108,       1153,       1290,       1179,       1291,       860,       853,       861,       859,       862,       920,       934,       935,       936,       949,       950,       951,       952,       937,       948,       954,       229])