__d(function(g,       r,       _i,       a,       m,       _e,       _d)       {
  
  
  
  
  
  
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
      
      
      
      
      
      
      return p
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var t=r(_d[0]),       n=e(r(_d[1])),       o=e(r(_d[2])),       i=e(r(_d[3])),       l=e(r(_d[4])),       s=e(r(_d[5])),       d=r(_d[6]),       c=r(_d[7]),       u=r(_d[8]),       f=r(_d[9]),       h=r(_d[10]),       x=r(_d[11]),       y=r(_d[12]);
  
  
  
  
  
  
  const b=       {
    
    
    
    
    
    
    owner:'key',       manager:'briefcase',       cashier:'cash',       reception:'desktop',       fnb:'restaurant',       barstaff:'wine',       accountant:'calculator'
  
  
  
  
  
  
  };
  
  
  
  
  
  
  function p()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e
    
    
    
    
    
    
    }
    
    =(0,       u.useTheme)(),              {
      
      
      
      
      
      
      state:p,       dispatch:j
    
    
    
    
    
    
    }
    
    =(0,       f.useStore)(),              {
      
      
      
      
      
      
      login:I
    
    
    
    
    
    
    }
    
    =(0,       h.useAuth)(),              {
      
      
      
      
      
      
      width:S
    
    
    
    
    
    
    }
    
    =(0,       s.default)(),       [w,       C]=(0,       t.useState)(null),       [z,       W]=(0,       t.useState)(''),       [O,       k]=(0,       t.useState)(!1),       N=p.users.filter(e=>e.active),       T=S>=700,       D=e=>       {
      
      
      
      
      
      
      if(!w)return;
      
      
      
      
      
      
      if('del'===e)return W(e=>e.slice(0,       -1)),       void k(!1);
      
      
      
      
      
      
      const t=(z+e).slice(0,       4);
      
      
      
      
      
      
      W(t),       k(!1),       4===t.length&&(t===w.pin?(j(       {
        
        
        
        
        
        
        type:'AUDIT',       event:       {
          
          
          
          
          
          
          id:(0,       x.uid)(),       date:(new Date).toISOString(),       userId:w.id,       userName:w.name,       action:'LOGIN'
        
        
        
        
        
        
        }
      
      
      
      
      
      
      }),       I(Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       w))):(k(!0),       j(       {
        
        
        
        
        
        
        type:'AUDIT',       event:       {
          
          
          
          
          
          
          id:(0,       x.uid)(),       date:(new Date).toISOString(),       userId:w.id,       userName:w.name,       action:'LOGIN FAILED (wrong PIN)'
        
        
        
        
        
        
        }
      
      
      
      
      
      
      }),       setTimeout(()=>W(''),       350)))
    
    
    
    
    
    
    };
    
    
    
    
    
    
    return w?(0,       y.jsxs)(d.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg,       alignItems:'center',       justifyContent:'center',       padding:24
      
      
      
      
      
      
      },       children:[(0,       y.jsxs)(i.default,              {
        
        
        
        
        
        
        onPress:()=>C(null),       style:       {
          
          
          
          
          
          
          position:'absolute',       top:54,       left:20,       flexDirection:'row',       alignItems:'center',       gap:5
        
        
        
        
        
        
        },       children:[(0,       y.jsx)(c.Ionicons,              {
          
          
          
          
          
          
          name:"arrow-back",       size:19,       color:e.sub
        
        
        
        
        
        
        }),       (0,       y.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            color:e.sub,       fontWeight:'600'
          
          
          
          
          
          
          },       children:"All users"
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       y.jsx)(n.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          width:60,       height:60,       borderRadius:18,       backgroundColor:e.primarySoft,       alignItems:'center',       justifyContent:'center',       marginBottom:12
        
        
        
        
        
        
        },       children:(0,       y.jsx)(c.Ionicons,              {
          
          
          
          
          
          
          name:b[w.role],       size:27,       color:e.primary
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       y.jsx)(o.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          fontSize:19,       fontWeight:'800',       color:e.text
        
        
        
        
        
        
        },       children:w.name
      
      
      
      
      
      
      }),       (0,       y.jsx)(o.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          fontSize:13,       color:e.sub,       marginTop:3
        
        
        
        
        
        
        },       children:h.ROLE_INFO[w.role].label
      
      
      
      
      
      
      }),       (0,       y.jsx)(o.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          fontSize:14,       color:O?e.red:e.sub,       marginTop:24,       fontWeight:'600'
        
        
        
        
        
        
        },       children:O?'Wrong PIN \u2014 try again':'Enter your 4-digit PIN'
      
      
      
      
      
      
      }),       (0,       y.jsx)(n.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          flexDirection:'row',       gap:14,       marginTop:16,       marginBottom:26
        
        
        
        
        
        
        },       children:[0,       1,       2,       3].map(t=>(0,       y.jsx)(n.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            width:15,       height:15,       borderRadius:8,       backgroundColor:t<z.length?O?e.red:e.primary:e.border
          
          
          
          
          
          
          }
        
        
        
        
        
        
        },       t))
      
      
      
      
      
      
      }),       (0,       y.jsx)(n.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          flexDirection:'row',       flexWrap:'wrap',       width:272,       justifyContent:'center'
        
        
        
        
        
        
        },       children:['1',       '2',       '3',       '4',       '5',       '6',       '7',       '8',       '9',       '',       '0',       'del'].map((t,       l)=>''===t?(0,       y.jsx)(n.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            width:74,       height:74,       margin:8
          
          
          
          
          
          
          }
        
        
        
        
        
        
        },       l):(0,       y.jsx)(i.default,              {
          
          
          
          
          
          
          onPress:()=>D(t),       style:       {
            
            
            
            
            
            
            width:74,       height:74,       margin:8,       borderRadius:37,       backgroundColor:e.card,       borderWidth:1,       borderColor:e.border,       alignItems:'center',       justifyContent:'center'
          
          
          
          
          
          
          },       children:'del'===t?(0,       y.jsx)(c.Ionicons,              {
            
            
            
            
            
            
            name:"backspace-outline",       size:23,       color:e.sub
          
          
          
          
          
          
          }):(0,       y.jsx)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              fontSize:25,       fontWeight:'700',       color:e.text
            
            
            
            
            
            
            },       children:t
          
          
          
          
          
          
          })
        
        
        
        
        
        
        },       l))
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    }):(0,       y.jsx)(d.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg
      
      
      
      
      
      
      },       children:(0,       y.jsxs)(l.default,              {
        
        
        
        
        
        
        contentContainerStyle:       {
          
          
          
          
          
          
          padding:24,       alignItems:'center'
        
        
        
        
        
        
        },       children:[(0,       y.jsx)(n.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            width:68,       height:68,       borderRadius:20,       backgroundColor:e.primary,       alignItems:'center',       justifyContent:'center',       marginTop:24,       marginBottom:14
          
          
          
          
          
          
          },       children:(0,       y.jsx)(c.Ionicons,              {
            
            
            
            
            
            
            name:"restaurant",       size:32,       color:"#fff"
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       y.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:22,       fontWeight:'800',       color:e.text
          
          
          
          
          
          
          },       children:"Deepa BMS"
        
        
        
        
        
        
        }),       (0,       y.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:13,       color:e.sub,       marginTop:4,       marginBottom:26
          
          
          
          
          
          
          },       children:"Restaurant & Tourist Home \xb7 Cherpulassery"
        
        
        
        
        
        
        }),       (0,       y.jsx)(o.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:14,       fontWeight:'700',       color:e.sub,       marginBottom:14,       letterSpacing:.5
          
          
          
          
          
          
          },       children:"WHO IS SIGNING IN?"
        
        
        
        
        
        
        }),       (0,       y.jsx)(n.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            width:'100%',       maxWidth:720,       flexDirection:T?'row':'column',       flexWrap:'wrap',       gap:10,       justifyContent:'center'
          
          
          
          
          
          
          },       children:N.map(t=>       {
            
            
            
            
            
            
            const l=h.ROLE_INFO[t.role];
            
            
            
            
            
            
            return(0,       y.jsxs)(i.default,              {
              
              
              
              
              
              
              onPress:()=>       {
                
                
                
                
                
                
                C(t),       W(''),       k(!1)
              
              
              
              
              
              
              },       style:       {
                
                
                
                
                
                
                width:T?340:'100%',       backgroundColor:e.card,       borderWidth:1,       borderColor:e.border,       borderRadius:16,       padding:14,       flexDirection:'row',       alignItems:'center',       gap:13
              
              
              
              
              
              
              },       children:[(0,       y.jsx)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  width:46,       height:46,       borderRadius:14,       backgroundColor:e.primarySoft,       alignItems:'center',       justifyContent:'center'
                
                
                
                
                
                
                },       children:(0,       y.jsx)(c.Ionicons,              {
                  
                  
                  
                  
                  
                  
                  name:b[t.role],       size:21,       color:e.primary
                
                
                
                
                
                
                })
              
              
              
              
              
              
              }),       (0,       y.jsxs)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  flex:1
                
                
                
                
                
                
                },       children:[(0,       y.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    fontWeight:'800',       color:e.text,       fontSize:15
                  
                  
                  
                  
                  
                  
                  },       children:t.name
                
                
                
                
                
                
                }),       (0,       y.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.sub,       fontSize:12,       marginTop:2
                  
                  
                  
                  
                  
                  
                  },       children:l.label
                
                
                
                
                
                
                }),       (0,       y.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.faint,       fontSize:11,       marginTop:2
                  
                  
                  
                  
                  
                  
                  },       numberOfLines:1,       children:l.desc
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              }),       (0,       y.jsx)(c.Ionicons,              {
                
                
                
                
                
                
                name:"chevron-forward",       size:17,       color:e.faint
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            },       t.id)
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       y.jsx)(n.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginTop:26,       backgroundColor:e.cardAlt,       borderRadius:12,       padding:14,       maxWidth:720
          
          
          
          
          
          
          },       children:(0,       y.jsxs)(o.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.faint,       fontSize:12,       textAlign:'center',       lineHeight:18
            
            
            
            
            
            
            },       children:["Demo PINs \u2014 Owner 1234 \xb7 Manager 2345 \xb7 Cashier 3456 \xb7 Reception 4567 \xb7 F&B 5678 \xb7 Bar 6789",       '\n',       "Each role sees only the modules it is permitted to use."]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       955,       [51,       1108,       1153,       1290,       1179,       1305,       1249,       1291,       860,       853,       861,       859,       229])