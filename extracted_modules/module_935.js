__d(function(_g,       _r,       _i,       _a,       m,       _e,       d)       {
  
  
  
  
  
  
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
  
  
  
  
  
  
  var t=_r(d[0]),       o=e(_r(d[1])),       n=e(_r(d[2])),       a=e(_r(d[3])),       l=e(_r(d[4])),       s=_r(d[5]),       r=_r(d[6]),       i=_r(d[7]),       c=_r(d[8]),       u=_r(d[9]),       h=_r(d[10]);
  
  
  
  
  
  
  const g=[       {
    
    
    
    
    
    
    value:'Aadhaar',       icon:'finger-print-outline',       sub:'Aadhaar card'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Driving License',       icon:'car-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Passport',       icon:'airplane-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Voter ID',       icon:'checkbox-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'PAN Card',       icon:'card-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Other Govt ID',       icon:'document-outline'
  
  
  
  
  
  
  }],       f=['1',       '2',       '3',       '4',       '5',       '6'].map(e=>(       {
    
    
    
    
    
    
    value:e,       label:`${e} adult${'1'===e?'':'s'}`
  
  
  
  
  
  
  })),       x=[       {
    
    
    
    
    
    
    value:'cash',       label:'Cash',       icon:'cash-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'upi',       label:'UPI',       icon:'qr-code-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'card',       label:'Card',       icon:'card-outline'
  
  
  
  
  
  
  }];
  
  
  
  
  
  
  function p()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e
    
    
    
    
    
    
    }
    
    =(0,       r.useTheme)(),              {
      
      
      
      
      
      
      state:p,       dispatch:y
    
    
    
    
    
    
    }
    
    =(0,       i.useStore)(),       [j,       S]=(0,       t.useState)('rooms'),       [b,       C]=(0,       t.useState)(null),       [v,       k]=(0,       t.useState)(''),       [T,       I]=(0,       t.useState)(''),       [w,       P]=(0,       t.useState)('Aadhaar'),       [R,       z]=(0,       t.useState)(''),       [D,       M]=(0,       t.useState)('2'),       [B,       O]=(0,       t.useState)(''),       [N,       $]=(0,       t.useState)('cash'),       A=(0,       t.useMemo)(()=>(0,       i.occupancy)(p),       [p]),       W=(0,       t.useMemo)(()=>p.sales.filter(e=>'rooms'===e.dept&&(0,       c.isThisMonth)(e.date)).reduce((e,       t)=>e+t.total,       0),       [p]),       _=t=>'occupied'===t?e.redSoft:'cleaning'===t?e.amberSoft:e.greenSoft,       E=(0,       t.useMemo)(()=>       {
      
      
      
      
      
      
      if(!b?.guest)return null;
      
      
      
      
      
      
      const e=Math.max(1,       Math.ceil((Date.now()-new Date(b.guest.checkIn).getTime())/864e5)),       t=b.rate*e,       o=Math.round(.05*t);
      
      
      
      
      
      
      return       {
        
        
        
        
        
        
        nights:e,       net:t,       gst:o,       total:t+o,       due:Math.max(0,       t+o-b.guest.advance)
      
      
      
      
      
      
      }
    
    
    
    
    
    
    },       [b]);
    
    
    
    
    
    
    return(0,       h.jsxs)(s.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg
      
      
      
      
      
      
      },       edges:['top'],       children:[(0,       h.jsxs)(o.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          padding:16,       paddingBottom:8
        
        
        
        
        
        
        },       children:[(0,       h.jsx)(n.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:22,       fontWeight:'800',       color:e.text,       marginBottom:12
          
          
          
          
          
          
          },       children:"Hotel"
        
        
        
        
        
        
        }),       (0,       h.jsx)(u.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            padding:14,       marginBottom:12
          
          
          
          
          
          
          },       children:(0,       h.jsxs)(u.Row,              {
            
            
            
            
            
            
            children:[(0,       h.jsx)(u.StatPill,              {
              
              
              
              
              
              
              label:"Occupancy",       value:`${A.pct}%`,       color:e.blue
            
            
            
            
            
            
            }),       (0,       h.jsx)(u.StatPill,              {
              
              
              
              
              
              
              label:"Occupied",       value:`${A.occupied}/${A.total}`
            
            
            
            
            
            
            }),       (0,       h.jsx)(u.StatPill,              {
              
              
              
              
              
              
              label:"Room Rev (month)",       value:(0,       c.inr)(W),       color:e.green
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       h.jsx)(u.Segmented,              {
          
          
          
          
          
          
          options:[       {
            
            
            
            
            
            
            key:'rooms',       label:'Room Board'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'register',       label:'Guest Register'
          
          
          
          
          
          
          }],       value:j,       onChange:S
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       'rooms'===j?(0,       h.jsx)(a.default,              {
        
        
        
        
        
        
        data:p.rooms,       keyExtractor:e=>e.id,       numColumns:2,       columnWrapperStyle:       {
          
          
          
          
          
          
          gap:10,       paddingHorizontal:16
        
        
        
        
        
        
        },       contentContainerStyle:       {
          
          
          
          
          
          
          paddingBottom:32,       gap:10
        
        
        
        
        
        
        },       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>       {
          
          
          
          
          
          
          return(0,       h.jsx)(l.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       onPress:()=>C(t),       children:(0,       h.jsxs)(u.Card,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                padding:14
              
              
              
              
              
              
              },       children:[(0,       h.jsxs)(u.Row,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  justifyContent:'space-between'
                
                
                
                
                
                
                },       children:[(0,       h.jsx)(n.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    fontSize:20,       fontWeight:'900',       color:e.text
                  
                  
                  
                  
                  
                  
                  },       children:t.no
                
                
                
                
                
                
                }),       (0,       h.jsx)(u.Badge,              {
                  
                  
                  
                  
                  
                  
                  text:t.status.toUpperCase(),       color:(a=t.status,       'occupied'===a?e.red:'cleaning'===a?e.amber:e.green),       soft:_(t.status)
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              }),       (0,       h.jsx)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.sub,       fontSize:12,       marginTop:6
                
                
                
                
                
                
                },       children:t.category
              
              
              
              
              
              
              }),       (0,       h.jsxs)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.text,       fontWeight:'700',       fontSize:13,       marginTop:2
                
                
                
                
                
                
                },       children:[(0,       c.inr)(t.rate),       "/night"]
              
              
              
              
              
              
              }),       t.guest&&(0,       h.jsxs)(o.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  marginTop:8,       paddingTop:8,       borderTopWidth:1,       borderTopColor:e.border
                
                
                
                
                
                
                },       children:[(0,       h.jsx)(n.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.text,       fontSize:12,       fontWeight:'600'
                  
                  
                  
                  
                  
                  
                  },       numberOfLines:1,       children:t.guest.name
                
                
                
                
                
                
                }),       (0,       h.jsxs)(n.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.faint,       fontSize:11,       marginTop:2
                  
                  
                  
                  
                  
                  
                  },       children:["Since ",       (0,       c.fmtDate)(t.guest.checkIn)]
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })
          
          
          
          
          
          
          });
          
          
          
          
          
          
          var a
        
        
        
        
        
        
        }
      
      
      
      
      
      
      },       "room-board"):(0,       h.jsx)(a.default,              {
        
        
        
        
        
        
        data:p.stays,       keyExtractor:e=>e.id,       contentContainerStyle:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingBottom:32
        
        
        
        
        
        
        },       ListEmptyComponent:(0,       h.jsx)(u.EmptyState,              {
          
          
          
          
          
          
          icon:"people-outline",       text:"No past stays yet"
        
        
        
        
        
        
        }),       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>(0,       h.jsxs)(u.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginBottom:8,       padding:13
          
          
          
          
          
          
          },       children:[(0,       h.jsxs)(u.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between'
            
            
            
            
            
            
            },       children:[(0,       h.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'700',       color:e.text,       fontSize:14
              
              
              
              
              
              
              },       children:t.guestName
            
            
            
            
            
            
            }),       (0,       h.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'800',       color:e.green,       fontSize:14
              
              
              
              
              
              
              },       children:(0,       c.inr)(t.amount)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       h.jsxs)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.faint,       fontSize:12,       marginTop:4
            
            
            
            
            
            
            },       children:["Room ",       t.roomNo,       " \xb7 ",       t.nights,       "N \xb7 ",       (0,       c.fmtDate)(t.checkIn),       " \u2192 ",       (0,       c.fmtDate)(t.checkOut),       " \xb7 ",       t.mode.toUpperCase()]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      },       "guest-register"),       (0,       h.jsxs)(u.Sheet,              {
        
        
        
        
        
        
        visible:!!b,       onClose:()=>C(null),       title:b?`Room ${b.no} \xb7 ${b.category}`:'',       children:['vacant'===b?.status&&(0,       h.jsxs)(o.default,              {
          
          
          
          
          
          
          children:[(0,       h.jsx)(u.Field,              {
            
            
            
            
            
            
            label:"Guest Name",       value:v,       onChangeText:k,       placeholder:"Full name"
          
          
          
          
          
          
          }),       (0,       h.jsx)(u.Field,              {
            
            
            
            
            
            
            label:"Phone",       value:T,       onChangeText:I,       keyboardType:"phone-pad",       placeholder:"98470 12345"
          
          
          
          
          
          
          }),       (0,       h.jsxs)(u.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              gap:12,       alignItems:'flex-start'
            
            
            
            
            
            
            },       children:[(0,       h.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                flex:1
              
              
              
              
              
              
              },       children:(0,       h.jsx)(u.Select,              {
                
                
                
                
                
                
                label:"ID Proof Type",       value:w,       onChange:P,       options:g,       color:e.blue
              
              
              
              
              
              
              })
            
            
            
            
            
            
            }),       (0,       h.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                flex:1
              
              
              
              
              
              
              },       children:(0,       h.jsx)(u.Field,              {
                
                
                
                
                
                
                label:"ID Number (last digits)",       value:R,       onChangeText:z,       placeholder:"e.g. 4432"
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       h.jsxs)(u.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              gap:12,       alignItems:'flex-start'
            
            
            
            
            
            
            },       children:[(0,       h.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                flex:1
              
              
              
              
              
              
              },       children:(0,       h.jsx)(u.Select,              {
                
                
                
                
                
                
                label:"Adults",       value:D,       onChange:M,       options:f,       color:e.blue
              
              
              
              
              
              
              })
            
            
            
            
            
            
            }),       (0,       h.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                flex:1
              
              
              
              
              
              
              },       children:(0,       h.jsx)(u.Field,              {
                
                
                
                
                
                
                label:"Advance (\u20b9)",       value:B,       onChangeText:O,       keyboardType:"numeric",       placeholder:"0"
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       h.jsx)(u.PrimaryButton,              {
            
            
            
            
            
            
            title:"Check In Guest",       onPress:()=>       {
              
              
              
              
              
              
              if(!b||!v.trim())return;
              
              
              
              
              
              
              const e=R.trim()?`${w} ${R.trim()}`:w;
              
              
              
              
              
              
              y(       {
                
                
                
                
                
                
                type:'CHECK_IN',       roomId:b.id,       guest:       {
                  
                  
                  
                  
                  
                  
                  name:v.trim(),       phone:T.trim(),       idProof:e,       adults:Math.max(1,       Math.round((0,       c.parseNum)(D)||1)),       checkIn:(new Date).toISOString(),       advance:(0,       c.parseNum)(B)
                
                
                
                
                
                
                }
              
              
              
              
              
              
              }),       C(null),       k(''),       I(''),       z(''),       P('Aadhaar'),       M('2'),       O('')
            
            
            
            
            
            
            },       icon:"log-in-outline",       color:e.green
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       'occupied'===b?.status&&b.guest&&E&&(0,       h.jsxs)(o.default,              {
          
          
          
          
          
          
          children:[(0,       h.jsxs)(u.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              backgroundColor:e.cardAlt,       marginBottom:16
            
            
            
            
            
            
            },       children:[(0,       h.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'800',       fontSize:16,       color:e.text
              
              
              
              
              
              
              },       children:b.guest.name
            
            
            
            
            
            
            }),       (0,       h.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:13,       marginTop:4
              
              
              
              
              
              
              },       children:[b.guest.phone,       " \xb7 ",       b.guest.idProof,       " \xb7 ",       b.guest.adults,       " adult(s)"]
            
            
            
            
            
            
            }),       (0,       h.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:12,       marginTop:4
              
              
              
              
              
              
              },       children:["Checked in ",       (0,       c.fmtDateTime)(b.guest.checkIn)]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       h.jsxs)(u.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              marginBottom:16
            
            
            
            
            
            
            },       children:[[[`Room charge \xb7 ${E.nights} night(s)`,       (0,       c.inr)(E.net)],       ['GST @ 5% (tariff \u2264 \u20b97,500)',       (0,       c.inr)(E.gst)],       ['Bill total',       (0,       c.inr)(E.total)],       ['Advance paid',       '-'+(0,       c.inr)(b.guest.advance)]].map(([t,       o],       a)=>(0,       h.jsxs)(u.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                justifyContent:'space-between',       marginBottom:6
              
              
              
              
              
              
              },       children:[(0,       h.jsx)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.sub,       fontSize:14
                
                
                
                
                
                
                },       children:t
              
              
              
              
              
              
              }),       (0,       h.jsx)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.text,       fontWeight:'600'
                
                
                
                
                
                
                },       children:o
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            },       a)),       (0,       h.jsx)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                height:1,       backgroundColor:e.border,       marginVertical:8
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       (0,       h.jsxs)(u.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                justifyContent:'space-between'
              
              
              
              
              
              
              },       children:[(0,       h.jsx)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.text,       fontWeight:'800',       fontSize:16
                
                
                
                
                
                
                },       children:"Balance Due"
              
              
              
              
              
              
              }),       (0,       h.jsx)(n.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.green,       fontWeight:'900',       fontSize:20
                
                
                
                
                
                
                },       children:(0,       c.inr)(E.due)
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       h.jsx)(u.Select,              {
            
            
            
            
            
            
            label:"Settle via",       value:N,       onChange:e=>$(e),       options:x,       color:e.blue
          
          
          
          
          
          
          }),       (0,       h.jsx)(u.PrimaryButton,              {
            
            
            
            
            
            
            title:"Check Out & Settle",       onPress:()=>       {
              
              
              
              
              
              
              if(!b||!b.guest)return;
              
              
              
              
              
              
              const e=b.guest,       t=Math.max(1,       Math.ceil((Date.now()-new Date(e.checkIn).getTime())/864e5)),       o=b.rate*t,       n=Math.round(.05*o),       a=o+n,       l=       {
                
                
                
                
                
                
                id:(0,       c.uid)(),       roomNo:b.no,       category:b.category,       guestName:e.name,       phone:e.phone,       checkIn:e.checkIn,       checkOut:(new Date).toISOString(),       nights:t,       amount:a,       mode:N
              
              
              
              
              
              
              },       s=       {
                
                
                
                
                
                
                id:(0,       c.uid)(),       date:(new Date).toISOString(),       dept:'rooms',       description:`Room ${b.no} - ${e.name} - ${t}N`,       amount:o,       gstRate:5,       gstAmount:n,       total:a,       mode:N
              
              
              
              
              
              
              };
              
              
              
              
              
              
              y(       {
                
                
                
                
                
                
                type:'CHECK_OUT',       roomId:b.id,       stay:l,       sale:s
              
              
              
              
              
              
              }),       C(null)
            
            
            
            
            
            
            },       icon:"log-out-outline",       color:e.red
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       'cleaning'===b?.status&&(0,       h.jsxs)(o.default,              {
          
          
          
          
          
          
          children:[(0,       h.jsx)(u.EmptyState,              {
            
            
            
            
            
            
            icon:"sparkles-outline",       text:"Room is being cleaned"
          
          
          
          
          
          
          }),       (0,       h.jsx)(u.PrimaryButton,              {
            
            
            
            
            
            
            title:"Mark Ready / Vacant",       onPress:()=>       {
              
              
              
              
              
              
              y(       {
                
                
                
                
                
                
                type:'SET_ROOM_STATUS',       roomId:b.id,       status:'vacant'
              
              
              
              
              
              
              }),       C(null)
            
            
            
            
            
            
            },       icon:"checkmark-circle-outline",       color:e.green
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       935,       [51,       1108,       1153,       1171,       1290,       1249,       860,       853,       859,       918,       229])