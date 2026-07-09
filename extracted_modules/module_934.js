__d(function(g,       r,       i,       _a,       m,       _e,       _d)       {
  
  
  
  
  
  
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
      
      
      
      
      
      
      return w
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var t=r(_d[0]),       a=e(r(_d[1])),       l=e(r(_d[2])),       o=e(r(_d[3])),       n=e(r(_d[4])),       s=r(_d[5]),       d=r(_d[6]),       u=r(_d[7]),       c=r(_d[8]),       b=r(_d[9]),       h=r(_d[10]),       y=r(_d[11]);
  
  
  
  
  
  
  const f=[       {
    
    
    
    
    
    
    key:'all',       label:'All'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'restaurant',       label:'Restaurant'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'bar',       label:'Bar'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'rooms',       label:'Rooms'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'takeaway',       label:'Takeaway'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'online',       label:'Online'
  
  
  
  
  
  
  }],       p=       {
    
    
    
    
    
    
    restaurant:5,       takeaway:5,       online:5,       rooms:5,       bar:0
  
  
  
  
  
  
  },       x=[       {
    
    
    
    
    
    
    value:'restaurant',       label:'Restaurant',       icon:'restaurant-outline',       sub:'Dine-in \xb7 GST 5%'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'bar',       label:'Bar',       icon:'wine-outline',       sub:'Liquor \xb7 outside GST'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'rooms',       label:'Rooms',       icon:'bed-outline',       sub:'Lodging \xb7 GST 5%'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'takeaway',       label:'Takeaway',       icon:'bag-handle-outline',       sub:'Parcel counter \xb7 GST 5%'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'online',       label:'Online',       icon:'phone-portrait-outline',       sub:'Swiggy / Zomato \xb7 GST 5%'
  
  
  
  
  
  
  }],       S=[       {
    
    
    
    
    
    
    value:'cash',       label:'Cash',       icon:'cash-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'upi',       label:'UPI',       icon:'qr-code-outline',       sub:'GPay / PhonePe'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'card',       label:'Card',       icon:'card-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'bank',       label:'Bank Transfer',       icon:'business-outline',       sub:'NEFT / online settlement'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'credit',       label:'Credit',       icon:'time-outline',       sub:'Pay later - add to customer credit'
  
  
  
  
  
  
  }],       j=       {
    
    
    
    
    
    
    restaurant:['Lunch meals',       'Biriyani orders',       'Breakfast & tea',       'Dinner service',       'Evening snacks',       'Family party'],       bar:['Bar counter sales',       'Peg sales - evening',       'Beer & pegs',       'Bar table service'],       rooms:['Room advance',       'Extra bed charge',       'Late checkout charge'],       takeaway:['Parcel biriyani',       'Takeaway meals',       'Parcel counter'],       online:['Swiggy orders',       'Zomato orders']
  
  
  
  
  
  
  },       k=[       {
    
    
    
    
    
    
    key:'day',       label:'Today'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'week',       label:'Week'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'month',       label:'Month'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'year',       label:'Year'
  
  
  
  
  
  
  }];
  
  
  
  
  
  
  function w()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e
    
    
    
    
    
    
    }
    
    =(0,       u.useTheme)(),              {
      
      
      
      
      
      
      state:w,       dispatch:v
    
    
    
    
    
    
    }
    
    =(0,       c.useStore)(),       [C,       T]=(0,       t.useState)('all'),       [P,       B]=(0,       t.useState)('day'),       [R,       z]=(0,       t.useState)(!1),       [G,       I]=(0,       t.useState)('restaurant'),       [A,       D]=(0,       t.useState)(''),       [N,       O]=(0,       t.useState)(''),       [W,       E]=(0,       t.useState)('cash'),       [L,       M]=(0,       t.useState)(''),       _=e=>       {
      
      
      
      
      
      
      const t=(0,       b.keyOf)(e);
      
      
      
      
      
      
      return'day'===P?t===(0,       b.todayKey)():'week'===P?(0,       b.lastNDays)(7).includes(t):'month'===P?t.slice(0,       7)===(0,       b.todayKey)().slice(0,       7):t.slice(0,       4)===(0,       b.todayKey)().slice(0,       4)
    
    
    
    
    
    
    },       F=(0,       t.useMemo)(()=>w.sales.filter(e=>_(e.date)).filter(e=>'all'===C||e.dept===C).sort((e,       t)=>t.date.localeCompare(e.date)),       [w.sales,       C,       P]),       q=(0,       t.useMemo)(()=>       {
      
      
      
      
      
      
      let e=0,       t=0,       a=0,       l=0;
      
      
      
      
      
      
      for(const o of F)e+=o.total,       t+=o.gstAmount,       'cash'===o.mode?a+=o.total:'credit'!==o.mode&&(l+=o.total);
      
      
      
      
      
      
      return       {
        
        
        
        
        
        
        total:e,       gst:t,       cashAmt:a,       digital:l,       count:F.length
      
      
      
      
      
      
      }
    
    
    
    
    
    
    },       [F]),       H=       {
      
      
      
      
      
      
      restaurant:e.primary,       bar:e.amber,       rooms:e.blue,       takeaway:e.teal,       online:e.purple
    
    
    
    
    
    
    },       K=       {
      
      
      
      
      
      
      restaurant:e.primarySoft,       bar:e.amberSoft,       rooms:e.blueSoft,       takeaway:e.tealSoft,       online:e.purpleSoft
    
    
    
    
    
    
    },       V=p[G],       U=(0,       b.parseNum)(N),       Z=Math.round(U*V/100);
    
    
    
    
    
    
    return(0,       y.jsxs)(s.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg
      
      
      
      
      
      
      },       edges:['top'],       children:[(0,       y.jsxs)(a.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          padding:16,       paddingBottom:8
        
        
        
        
        
        
        },       children:[(0,       y.jsx)(l.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:22,       fontWeight:'800',       color:e.text,       marginBottom:12
          
          
          
          
          
          
          },       children:"Sales Register"
        
        
        
        
        
        
        }),       (0,       y.jsx)(h.Segmented,              {
          
          
          
          
          
          
          options:k,       value:P,       onChange:B
        
        
        
        
        
        
        }),       (0,       y.jsxs)(h.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            padding:14
          
          
          
          
          
          
          },       children:[(0,       y.jsxs)(h.Row,              {
            
            
            
            
            
            
            children:[(0,       y.jsx)(h.StatPill,              {
              
              
              
              
              
              
              label:"Total Sales",       value:(0,       b.inr)(q.total),       color:e.green
            
            
            
            
            
            
            }),       (0,       y.jsx)(h.StatPill,              {
              
              
              
              
              
              
              label:"GST Collected",       value:(0,       b.inr)(q.gst),       color:e.purple
            
            
            
            
            
            
            }),       (0,       y.jsx)(h.StatPill,              {
              
              
              
              
              
              
              label:"Bills",       value:String(q.count)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       y.jsx)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              height:1,       backgroundColor:e.border,       marginVertical:10
            
            
            
            
            
            
            }
          
          
          
          
          
          
          }),       (0,       y.jsxs)(h.Row,              {
            
            
            
            
            
            
            children:[(0,       y.jsx)(h.StatPill,              {
              
              
              
              
              
              
              label:"Cash",       value:(0,       b.inr)(q.cashAmt)
            
            
            
            
            
            
            }),       (0,       y.jsx)(h.StatPill,              {
              
              
              
              
              
              
              label:"UPI / Card / Bank",       value:(0,       b.inr)(q.digital)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       y.jsx)(o.default,              {
          
          
          
          
          
          
          horizontal:!0,       showsHorizontalScrollIndicator:!1,       data:f,       keyExtractor:e=>e.key,       style:       {
            
            
            
            
            
            
            marginTop:12,       flexGrow:0
          
          
          
          
          
          
          },       renderItem:(       {
            
            
            
            
            
            
            item:e
          
          
          
          
          
          
          })=>(0,       y.jsx)(h.Chip,              {
            
            
            
            
            
            
            label:e.label,       active:C===e.key,       onPress:()=>T(e.key)
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       y.jsx)(o.default,              {
        
        
        
        
        
        
        data:F,       keyExtractor:e=>e.id,       contentContainerStyle:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingBottom:100
        
        
        
        
        
        
        },       ListEmptyComponent:(0,       y.jsx)(h.EmptyState,              {
          
          
          
          
          
          
          icon:"receipt-outline",       text:"No sales in this period"
        
        
        
        
        
        
        }),       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>(0,       y.jsxs)(h.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginBottom:8,       padding:13,       flexDirection:'row',       alignItems:'center',       gap:12
          
          
          
          
          
          
          },       children:[(0,       y.jsx)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              width:38,       height:38,       borderRadius:12,       backgroundColor:K[t.dept],       alignItems:'center',       justifyContent:'center'
            
            
            
            
            
            
            },       children:(0,       y.jsx)(d.Ionicons,              {
              
              
              
              
              
              
              name:'bar'===t.dept?'wine-outline':'rooms'===t.dept?'bed-outline':'online'===t.dept?'phone-portrait-outline':'takeaway'===t.dept?'bag-handle-outline':'restaurant-outline',       size:18,       color:H[t.dept]
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       (0,       y.jsxs)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:[(0,       y.jsx)(l.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'700',       color:e.text,       fontSize:14
              
              
              
              
              
              
              },       numberOfLines:1,       children:t.description
            
            
            
            
            
            
            }),       (0,       y.jsxs)(l.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:11,       marginTop:3
              
              
              
              
              
              
              },       children:[(0,       b.fmtDateTime)(t.date),       t.billNo?' \xb7 '+t.billNo:'',       t.gstRate?` \xb7 GST ${t.gstRate}%`:' \xb7 No GST']
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       y.jsxs)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              alignItems:'flex-end'
            
            
            
            
            
            
            },       children:[(0,       y.jsx)(l.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'800',       fontSize:15,       color:e.text
              
              
              
              
              
              
              },       children:(0,       b.inr)(t.total)
            
            
            
            
            
            
            }),       (0,       y.jsx)(l.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:10,       marginTop:2,       textTransform:'uppercase'
              
              
              
              
              
              
              },       children:t.mode
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       y.jsx)(n.default,              {
        
        
        
        
        
        
        onPress:()=>z(!0),       style:       {
          
          
          
          
          
          
          position:'absolute',       right:20,       bottom:24,       width:58,       height:58,       borderRadius:29,       backgroundColor:e.primary,       alignItems:'center',       justifyContent:'center',       shadowColor:'#000',       shadowOpacity:.3,       shadowRadius:8,       shadowOffset:       {
            
            
            
            
            
            
            width:0,       height:4
          
          
          
          
          
          
          },       elevation:6
        
        
        
        
        
        
        },       children:(0,       y.jsx)(d.Ionicons,              {
          
          
          
          
          
          
          name:"add",       size:30,       color:"#fff"
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       y.jsxs)(h.Sheet,              {
        
        
        
        
        
        
        visible:R,       onClose:()=>z(!1),       title:"Record Sale",       children:[(0,       y.jsx)(h.Select,              {
          
          
          
          
          
          
          label:"Department",       value:G,       onChange:e=>I(e),       options:x
        
        
        
        
        
        
        }),       (0,       y.jsx)(h.Field,              {
          
          
          
          
          
          
          label:"Description",       value:A,       onChangeText:D,       placeholder:"e.g. Lunch meals x 8"
        
        
        
        
        
        
        }),       (0,       y.jsx)(a.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flexDirection:'row',       flexWrap:'wrap',       gap:6,       marginTop:-6,       marginBottom:14
          
          
          
          
          
          
          },       children:j[G].map(t=>(0,       y.jsx)(n.default,              {
            
            
            
            
            
            
            onPress:()=>D(t),       style:       {
              
              
              
              
              
              
              paddingHorizontal:10,       paddingVertical:5,       borderRadius:12,       backgroundColor:e.cardAlt,       borderWidth:1,       borderColor:e.border
            
            
            
            
            
            
            },       children:(0,       y.jsx)(l.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:11,       fontWeight:'600'
              
              
              
              
              
              
              },       children:t
            
            
            
            
            
            
            })
          
          
          
          
          
          
          },       t))
        
        
        
        
        
        
        }),       (0,       y.jsx)(h.Field,              {
          
          
          
          
          
          
          label:"Amount before GST (\u20b9)",       value:N,       onChangeText:O,       keyboardType:"numeric",       placeholder:"0"
        
        
        
        
        
        
        }),       (0,       y.jsx)(h.Field,              {
          
          
          
          
          
          
          label:"Bill No (optional)",       value:L,       onChangeText:M,       placeholder:"R3450"
        
        
        
        
        
        
        }),       (0,       y.jsx)(h.Select,              {
          
          
          
          
          
          
          label:"Payment Mode",       value:W,       onChange:e=>E(e),       options:S
        
        
        
        
        
        
        }),       (0,       y.jsxs)(h.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            backgroundColor:e.cardAlt,       marginBottom:16,       padding:13
          
          
          
          
          
          
          },       children:[(0,       y.jsxs)(h.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between'
            
            
            
            
            
            
            },       children:[(0,       y.jsxs)(l.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:13
              
              
              
              
              
              
              },       children:["GST @ ",       V,       "%",       'bar'===G?' (liquor - outside GST)':'']
            
            
            
            
            
            
            }),       (0,       y.jsx)(l.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.text,       fontWeight:'700'
              
              
              
              
              
              
              },       children:(0,       b.inr)(Z)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       y.jsxs)(h.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between',       marginTop:6
            
            
            
            
            
            
            },       children:[(0,       y.jsx)(l.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:13
              
              
              
              
              
              
              },       children:"Bill Total"
            
            
            
            
            
            
            }),       (0,       y.jsx)(l.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.green,       fontWeight:'800',       fontSize:17
              
              
              
              
              
              
              },       children:(0,       b.inr)(U+Z)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       y.jsx)(h.PrimaryButton,              {
          
          
          
          
          
          
          title:"Save Sale",       onPress:()=>       {
            
            
            
            
            
            
            const e=(0,       b.parseNum)(N);
            
            
            
            
            
            
            if(!e||!A.trim())return;
            
            
            
            
            
            
            const t=p[G],       a=Math.round(e*t/100),       l=       {
              
              
              
              
              
              
              id:(0,       b.uid)(),       date:(new Date).toISOString(),       dept:G,       description:A.trim(),       amount:e,       gstRate:t,       gstAmount:a,       total:e+a,       mode:W,       billNo:L.trim()||void 0
            
            
            
            
            
            
            };
            
            
            
            
            
            
            v(       {
              
              
              
              
              
              
              type:'ADD_SALE',       sale:l
            
            
            
            
            
            
            }),       z(!1),       D(''),       O(''),       M('')
          
          
          
          
          
          
          },       icon:"checkmark"
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       934,       [51,       1108,       1153,       1171,       1290,       1249,       1291,       860,       853,       859,       918,       229])