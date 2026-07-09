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
      
      
      
      
      
      
      return S
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var t=r(d[0]),       l=e(r(d[1])),       a=e(r(d[2])),       o=e(r(d[3])),       n=e(r(d[4]));
  
  
  
  
  
  
  r(d[5]),       r(d[6]);
  
  
  
  
  
  
  var s=r(d[7]),       c=r(d[8]),       u=r(d[9]),       h=r(d[10]),       p=r(d[11]),       y=r(d[12]),       x=r(d[13]);
  
  
  
  
  
  
  const f=[       {
    
    
    
    
    
    
    value:'Whisky',       icon:'wine-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Rum',       icon:'wine-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Brandy',       icon:'wine-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Vodka',       icon:'wine-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Beer',       icon:'beer-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'Wine',       icon:'wine-outline'
  
  
  
  
  
  
  }],       b=[       {
    
    
    
    
    
    
    value:'180',       label:'180 ml \xb7 Quarter'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'375',       label:'375 ml \xb7 Half (Pint)'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'500',       label:'500 ml \xb7 Beer can'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'650',       label:'650 ml \xb7 Beer bottle'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'750',       label:'750 ml \xb7 Full bottle'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'1000',       label:'1000 ml \xb7 Litre'
  
  
  
  
  
  
  }],       j=[       {
    
    
    
    
    
    
    value:'cash',       label:'Cash',       icon:'cash-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'upi',       label:'UPI',       icon:'qr-code-outline'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'card',       label:'Card',       icon:'card-outline'
  
  
  
  
  
  
  }];
  
  
  
  
  
  
  function S()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e
    
    
    
    
    
    
    }
    
    =(0,       u.useTheme)(),              {
      
      
      
      
      
      
      state:S,       dispatch:B
    
    
    
    
    
    
    }
    
    =(0,       h.useStore)(),       [P,       k]=(0,       t.useState)('stock'),       [v,       C]=(0,       t.useState)(null),       [M,       L]=(0,       t.useState)('sell'),       [w,       T]=(0,       t.useState)(!1),       [R,       I]=(0,       t.useState)(''),       [z,       O]=(0,       t.useState)('peg'),       [$,       E]=(0,       t.useState)('cash'),       [A,       W]=(0,       t.useState)(''),       [_,       q]=(0,       t.useState)(''),       [F,       N]=(0,       t.useState)('Whisky'),       [U,       V]=(0,       t.useState)('750'),       [D,       Q]=(0,       t.useState)(''),       [H,       G]=(0,       t.useState)(''),       [K,       J]=(0,       t.useState)(''),       [X,       Y]=(0,       t.useState)(''),       [Z,       ee]=(0,       t.useState)(''),       te=(0,       t.useMemo)(()=>S.liquor.find(e=>e.id===v)||null,       [S.liquor,       v]),       le=(0,       t.useMemo)(()=>S.sales.filter(e=>'bar'===e.dept&&(0,       p.isToday)(e.date)).reduce((e,       t)=>e+t.total,       0),       [S]),       ae=(0,       t.useMemo)(()=>(0,       h.liquorStockValue)(S),       [S]),       oe=e=>e.fullBottles*e.sizeML+e.looseML,       re=(e,       t)=>       {
      
      
      
      
      
      
      window.alert(`${e}\n\n${t}`)
    
    
    
    
    
    
    },       ne=()=>       {
      
      
      
      
      
      
      if(!_.trim())return re('Brand Required',       'Enter the brand name.'),       null;
      
      
      
      
      
      
      const e=Math.max(50,       Math.round((0,       p.parseNum)(U)||750)),       t=Math.max(0,       Math.round((0,       p.parseNum)(H)));
      
      
      
      
      
      
      return       {
        
        
        
        
        
        
        brand:_.trim(),       type:F,       sizeML:e,       fullBottles:Math.max(0,       Math.round((0,       p.parseNum)(D))),       looseML:Math.min(t,       e-1),       costPerBottle:(0,       p.parseNum)(K),       pricePerPeg:(0,       p.parseNum)(X),       pricePerBottle:(0,       p.parseNum)(Z)
      
      
      
      
      
      
      }
    
    
    
    
    
    
    },       ie=(0,       x.jsxs)(l.default,              {
      
      
      
      
      
      
      children:[(0,       x.jsx)(y.Field,              {
        
        
        
        
        
        
        label:"Brand Name",       value:_,       onChangeText:q,       placeholder:"e.g. Royal Stag"
      
      
      
      
      
      
      }),       (0,       x.jsxs)(y.Row,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          gap:12,       alignItems:'flex-start'
        
        
        
        
        
        
        },       children:[(0,       x.jsx)(l.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1
          
          
          
          
          
          
          },       children:(0,       x.jsx)(y.Select,              {
            
            
            
            
            
            
            label:"Type",       value:F,       onChange:e=>       {
              
              
              
              
              
              
              N(e),       'Beer'===e&&'750'===U&&V('650')
            
            
            
            
            
            
            },       options:f,       color:e.amber
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       x.jsx)(l.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1
          
          
          
          
          
          
          },       children:(0,       x.jsx)(y.Select,              {
            
            
            
            
            
            
            label:"Bottle Size",       value:U,       onChange:V,       options:b,       color:e.amber
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       x.jsxs)(y.Row,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          gap:12
        
        
        
        
        
        
        },       children:[(0,       x.jsx)(l.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1
          
          
          
          
          
          
          },       children:(0,       x.jsx)(y.Field,              {
            
            
            
            
            
            
            label:"Full Bottles",       value:D,       onChangeText:Q,       keyboardType:"numeric",       placeholder:"0"
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       x.jsx)(l.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1
          
          
          
          
          
          
          }
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       x.jsxs)(y.Row,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          gap:12
        
        
        
        
        
        
        },       children:[(0,       x.jsx)(l.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1
          
          
          
          
          
          
          },       children:(0,       x.jsx)(y.Field,              {
            
            
            
            
            
            
            label:'Beer'===F?'Loose ml (n/a for beer)':'Loose / Open Bottle (ml)',       value:H,       onChangeText:G,       keyboardType:"numeric",       placeholder:"0"
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       x.jsx)(l.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1
          
          
          
          
          
          
          },       children:(0,       x.jsx)(y.Field,              {
            
            
            
            
            
            
            label:"Cost / Bottle (\u20b9)",       value:K,       onChangeText:J,       keyboardType:"numeric",       placeholder:"0"
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       x.jsxs)(y.Row,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          gap:12
        
        
        
        
        
        
        },       children:[(0,       x.jsx)(l.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1
          
          
          
          
          
          
          },       children:(0,       x.jsx)(y.Field,              {
            
            
            
            
            
            
            label:"Selling Price / Peg 60ml (\u20b9)",       value:X,       onChangeText:Y,       keyboardType:"numeric",       placeholder:"0"
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       x.jsx)(l.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1
          
          
          
          
          
          
          },       children:(0,       x.jsx)(y.Field,              {
            
            
            
            
            
            
            label:"Selling Price / Bottle (\u20b9)",       value:Z,       onChangeText:ee,       keyboardType:"numeric",       placeholder:"0"
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    }),       se=       {
      
      
      
      
      
      
      Whisky:e.amber,       Rum:e.primary,       Brandy:e.purple,       Vodka:e.blue,       Beer:e.teal,       Wine:e.red
    
    
    
    
    
    
    };
    
    
    
    
    
    
    return(0,       x.jsxs)(s.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg
      
      
      
      
      
      
      },       edges:['top'],       children:[(0,       x.jsxs)(l.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          padding:16,       paddingBottom:8
        
        
        
        
        
        
        },       children:[(0,       x.jsx)(a.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:22,       fontWeight:'800',       color:e.text,       marginBottom:12
          
          
          
          
          
          
          },       children:"Bar Management"
        
        
        
        
        
        
        }),       (0,       x.jsx)(y.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            padding:14,       marginBottom:12
          
          
          
          
          
          
          },       children:(0,       x.jsxs)(y.Row,              {
            
            
            
            
            
            
            children:[(0,       x.jsx)(y.StatPill,              {
              
              
              
              
              
              
              label:"Today's Bar Sales",       value:(0,       p.inr)(le),       color:e.amber
            
            
            
            
            
            
            }),       (0,       x.jsx)(y.StatPill,              {
              
              
              
              
              
              
              label:"Stock Value",       value:(0,       p.inr)(ae)
            
            
            
            
            
            
            }),       (0,       x.jsx)(y.StatPill,              {
              
              
              
              
              
              
              label:"Brands",       value:String(S.liquor.length)
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       x.jsx)(y.Segmented,              {
          
          
          
          
          
          
          options:[       {
            
            
            
            
            
            
            key:'stock',       label:'Liquor Stock'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'variance',       label:'Variance Log'
          
          
          
          
          
          
          }],       value:P,       onChange:k
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       'stock'===P?(0,       x.jsx)(o.default,              {
        
        
        
        
        
        
        data:S.liquor,       keyExtractor:e=>e.id,       contentContainerStyle:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingBottom:100
        
        
        
        
        
        
        },       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>       {
          
          
          
          
          
          
          const o=t.fullBottles<=8;
          
          
          
          
          
          
          return(0,       x.jsx)(n.default,              {
            
            
            
            
            
            
            onPress:()=>       {
              
              
              
              
              
              
              var e;
              
              
              
              
              
              
              C(t.id),       L('sell'),       O('Beer'===t.type?'bottle':'peg'),       q((e=t).brand),       N(e.type),       V(String(e.sizeML)),       Q(String(e.fullBottles)),       G(String(e.looseML)),       J(String(e.costPerBottle)),       Y(String(e.pricePerPeg)),       ee(String(e.pricePerBottle))
            
            
            
            
            
            
            },       children:(0,       x.jsxs)(y.Card,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                marginBottom:8,       padding:13
              
              
              
              
              
              
              },       children:[(0,       x.jsxs)(y.Row,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  justifyContent:'space-between'
                
                
                
                
                
                
                },       children:[(0,       x.jsxs)(y.Row,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    gap:10,       flex:1
                  
                  
                  
                  
                  
                  
                  },       children:[(0,       x.jsx)(l.default,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      width:38,       height:38,       borderRadius:12,       backgroundColor:e.cardAlt,       alignItems:'center',       justifyContent:'center'
                    
                    
                    
                    
                    
                    
                    },       children:(0,       x.jsx)(c.Ionicons,              {
                      
                      
                      
                      
                      
                      
                      name:'Beer'===t.type?'beer-outline':'wine-outline',       size:19,       color:se[t.type]||e.amber
                    
                    
                    
                    
                    
                    
                    })
                  
                  
                  
                  
                  
                  
                  }),       (0,       x.jsxs)(l.default,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      flex:1
                    
                    
                    
                    
                    
                    
                    },       children:[(0,       x.jsx)(a.default,              {
                      
                      
                      
                      
                      
                      
                      style:       {
                        
                        
                        
                        
                        
                        
                        fontWeight:'700',       color:e.text,       fontSize:14
                      
                      
                      
                      
                      
                      
                      },       numberOfLines:1,       children:t.brand
                    
                    
                    
                    
                    
                    
                    }),       (0,       x.jsxs)(a.default,              {
                      
                      
                      
                      
                      
                      
                      style:       {
                        
                        
                        
                        
                        
                        
                        color:e.faint,       fontSize:11,       marginTop:2
                      
                      
                      
                      
                      
                      
                      },       children:[t.type,       " \xb7 ",       t.sizeML,       "ml \xb7 cost ",       (0,       p.inr)(t.costPerBottle),       "/btl"]
                    
                    
                    
                    
                    
                    
                    })]
                  
                  
                  
                  
                  
                  
                  })]
                
                
                
                
                
                
                }),       o&&(0,       x.jsx)(y.Badge,              {
                  
                  
                  
                  
                  
                  
                  text:"LOW",       color:e.red,       soft:e.redSoft
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              }),       (0,       x.jsxs)(y.Row,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  marginTop:10,       gap:0
                
                
                
                
                
                
                },       children:[(0,       x.jsx)(y.StatPill,              {
                  
                  
                  
                  
                  
                  
                  label:"Full bottles",       value:String(t.fullBottles)
                
                
                
                
                
                
                }),       (0,       x.jsx)(y.StatPill,              {
                  
                  
                  
                  
                  
                  
                  label:"Loose",       value:'Beer'===t.type?'\u2014':`${t.looseML} ml`
                
                
                
                
                
                
                }),       (0,       x.jsx)(y.StatPill,              {
                  
                  
                  
                  
                  
                  
                  label:'Beer'===t.type?'Price/btl':'Peg / Bottle',       value:'Beer'===t.type?(0,       p.inr)(t.pricePerBottle):`${(0,p.inr)(t.pricePerPeg)} / ${(0,p.inr)(t.pricePerBottle)}`
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }
      
      
      
      
      
      
      }):(0,       x.jsx)(o.default,              {
        
        
        
        
        
        
        data:S.liquorAudits,       keyExtractor:e=>e.id,       contentContainerStyle:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingBottom:100
        
        
        
        
        
        
        },       ListEmptyComponent:(0,       x.jsx)(y.EmptyState,              {
          
          
          
          
          
          
          icon:"analytics-outline",       text:"No stock audits yet. Tap a brand \u2192 Audit to record physical stock."
        
        
        
        
        
        
        }),       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>(0,       x.jsxs)(y.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginBottom:8,       padding:13
          
          
          
          
          
          
          },       children:[(0,       x.jsxs)(y.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between'
            
            
            
            
            
            
            },       children:[(0,       x.jsx)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'700',       color:e.text,       fontSize:14
              
              
              
              
              
              
              },       children:t.brand
            
            
            
            
            
            
            }),       (0,       x.jsx)(y.Badge,              {
              
              
              
              
              
              
              text:`${t.varianceML>=0?'+':''}${t.varianceML} ml`,       color:t.varianceML<0?e.red:e.green,       soft:t.varianceML<0?e.redSoft:e.greenSoft
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       x.jsxs)(a.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.faint,       fontSize:12,       marginTop:4
            
            
            
            
            
            
            },       children:[(0,       p.fmtDate)(t.date),       " \xb7 Book: ",       t.expectedML,       "ml \xb7 Physical: ",       t.physicalML,       "ml"]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       x.jsxs)(y.Sheet,              {
        
        
        
        
        
        
        visible:!!te,       onClose:()=>C(null),       title:te?.brand||'',       children:[(0,       x.jsx)(y.Segmented,              {
          
          
          
          
          
          
          options:[       {
            
            
            
            
            
            
            key:'sell',       label:'Sell'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'purchase',       label:'Purchase'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'audit',       label:'Audit'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'edit',       label:'Update'
          
          
          
          
          
          
          }],       value:M,       onChange:L
        
        
        
        
        
        
        }),       'sell'===M&&te&&(0,       x.jsxs)(l.default,              {
          
          
          
          
          
          
          children:['Beer'!==te.type&&(0,       x.jsx)(y.Segmented,              {
            
            
            
            
            
            
            options:[       {
              
              
              
              
              
              
              key:'peg',       label:`Peg 60ml \xb7 ${(0,p.inr)(te.pricePerPeg)}`
            
            
            
            
            
            
            },              {
              
              
              
              
              
              
              key:'bottle',       label:`Bottle \xb7 ${(0,p.inr)(te.pricePerBottle)}`
            
            
            
            
            
            
            }],       value:z,       onChange:O
          
          
          
          
          
          
          }),       (0,       x.jsx)(y.Field,              {
            
            
            
            
            
            
            label:`Quantity (${'Beer'===te.type||'bottle'===z?'bottles':'pegs'})`,       value:R,       onChangeText:I,       keyboardType:"numeric",       placeholder:"1"
          
          
          
          
          
          
          }),       (0,       x.jsx)(y.Select,              {
            
            
            
            
            
            
            label:"Payment",       value:$,       onChange:e=>E(e),       options:j,       color:e.amber
          
          
          
          
          
          
          }),       (0,       x.jsxs)(y.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              backgroundColor:e.cardAlt,       marginBottom:16,       padding:13
            
            
            
            
            
            
            },       children:[(0,       x.jsxs)(y.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                justifyContent:'space-between'
              
              
              
              
              
              
              },       children:[(0,       x.jsx)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.sub
                
                
                
                
                
                
                },       children:"Sale amount"
              
              
              
              
              
              
              }),       (0,       x.jsx)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.green,       fontWeight:'800',       fontSize:17
                
                
                
                
                
                
                },       children:(0,       p.inr)(('Beer'!==te.type&&'peg'===z?te.pricePerPeg:te.pricePerBottle)*Math.max(1,       Math.round((0,       p.parseNum)(R)||1)))
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       x.jsx)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:11,       marginTop:4
              
              
              
              
              
              
              },       children:"Liquor outside GST \xb7 10% Kerala TOT applies \xb7 stock auto-deducted in ml"
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       x.jsx)(y.PrimaryButton,              {
            
            
            
            
            
            
            title:"Record Bar Sale",       onPress:()=>       {
              
              
              
              
              
              
              if(!te)return;
              
              
              
              
              
              
              const e=Math.max(1,       Math.round((0,       p.parseNum)(R)||1)),       t='Beer'===te.type,       l=e*('peg'!==z||t?te.sizeML:60),       a=oe(te);
              
              
              
              
              
              
              if(l>a)return void re('Insufficient Stock',       `Only ${te.fullBottles} bottle(s) + ${te.looseML}ml of ${te.brand} in stock (${a}ml). Cannot sell ${l}ml.`);
              
              
              
              
              
              
              const o='peg'!==z||t?te.pricePerBottle*e:te.pricePerPeg*e,       n=t||'bottle'===z?`${e} btl`:`${e} peg`,       s=       {
                
                
                
                
                
                
                id:(0,       p.uid)(),       date:(new Date).toISOString(),       dept:'bar',       description:`${te.brand} \xb7 ${n}`,       amount:o,       gstRate:0,       gstAmount:0,       total:o,       mode:$
              
              
              
              
              
              
              };
              
              
              
              
              
              
              B(       {
                
                
                
                
                
                
                type:'SELL_LIQUOR',       itemId:te.id,       ml:l,       sale:s
              
              
              
              
              
              
              }),       C(null),       I('')
            
            
            
            
            
            
            },       icon:"checkmark",       color:e.amber
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       'purchase'===M&&te&&(0,       x.jsxs)(l.default,              {
          
          
          
          
          
          
          children:[(0,       x.jsx)(y.Field,              {
            
            
            
            
            
            
            label:"Bottles purchased (BEVCO)",       value:R,       onChangeText:I,       keyboardType:"numeric",       placeholder:"12"
          
          
          
          
          
          
          }),       (0,       x.jsxs)(y.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              backgroundColor:e.cardAlt,       marginBottom:16,       padding:13
            
            
            
            
            
            
            },       children:[(0,       x.jsxs)(y.Row,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                justifyContent:'space-between'
              
              
              
              
              
              
              },       children:[(0,       x.jsxs)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.sub
                
                
                
                
                
                
                },       children:["Cost @ ",       (0,       p.inr)(te.costPerBottle),       "/btl"]
              
              
              
              
              
              
              }),       (0,       x.jsx)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.red,       fontWeight:'800',       fontSize:17
                
                
                
                
                
                
                },       children:(0,       p.inr)(te.costPerBottle*Math.max(1,       Math.round((0,       p.parseNum)(R)||1)))
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       x.jsx)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:11,       marginTop:4
              
              
              
              
              
              
              },       children:"Paid via bank \xb7 auto-posted to expense register"
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       x.jsx)(y.PrimaryButton,              {
            
            
            
            
            
            
            title:"Record Purchase",       onPress:()=>       {
              
              
              
              
              
              
              if(!te)return;
              
              
              
              
              
              
              const e=Math.max(1,       Math.round((0,       p.parseNum)(R)||1)),       t=e*te.costPerBottle,       l=       {
                
                
                
                
                
                
                id:(0,       p.uid)(),       date:(new Date).toISOString(),       kind:'expense',       category:'Liquor Purchase',       description:`BEVCO \xb7 ${te.brand} x${e}`,       amount:t,       mode:'bank',       bankId:S.settings.defaultBankId,       hasBill:!0
              
              
              
              
              
              
              };
              
              
              
              
              
              
              B(       {
                
                
                
                
                
                
                type:'LIQUOR_PURCHASE',       itemId:te.id,       bottles:e,       txn:l
              
              
              
              
              
              
              }),       C(null),       I('')
            
            
            
            
            
            
            },       icon:"cart-outline"
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       'audit'===M&&te&&(0,       x.jsxs)(l.default,              {
          
          
          
          
          
          
          children:[(0,       x.jsxs)(y.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              backgroundColor:e.cardAlt,       marginBottom:16,       padding:13
            
            
            
            
            
            
            },       children:[(0,       x.jsx)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.sub,       fontSize:13
              
              
              
              
              
              
              },       children:"Book stock (expected)"
            
            
            
            
            
            
            }),       (0,       x.jsxs)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.text,       fontWeight:'800',       fontSize:18,       marginTop:2
              
              
              
              
              
              
              },       children:[oe(te),       " ml ",       (0,       x.jsxs)(a.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontSize:13,       color:e.faint
                
                
                
                
                
                
                },       children:["(",       te.fullBottles,       " btl + ",       te.looseML,       " ml)"]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       x.jsx)(y.Field,              {
            
            
            
            
            
            
            label:"Physical stock counted (ml)",       value:A,       onChangeText:W,       keyboardType:"numeric",       placeholder:"e.g. 10980"
          
          
          
          
          
          
          }),       (0,       x.jsx)(y.PrimaryButton,              {
            
            
            
            
            
            
            title:"Save Audit & Variance",       onPress:()=>       {
              
              
              
              
              
              
              if(!te)return;
              
              
              
              
              
              
              if(!A.trim())return void re('Physical Count Required',       'Enter the physically counted stock in ml before saving the audit.');
              
              
              
              
              
              
              const e=(0,       p.parseNum)(A),       t=oe(te);
              
              
              
              
              
              
              B(       {
                
                
                
                
                
                
                type:'LIQUOR_AUDIT',       audit:       {
                  
                  
                  
                  
                  
                  
                  id:(0,       p.uid)(),       date:(new Date).toISOString(),       itemId:te.id,       brand:te.brand,       expectedML:t,       physicalML:e,       varianceML:e-t
                
                
                
                
                
                
                }
              
              
              
              
              
              
              }),       C(null),       W('')
            
            
            
            
            
            
            },       icon:"analytics-outline",       color:e.purple
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       'edit'===M&&te&&(0,       x.jsxs)(l.default,              {
          
          
          
          
          
          
          children:[(0,       x.jsx)(y.Card,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              backgroundColor:e.amberSoft,       borderColor:e.amber,       marginBottom:16,       padding:12
            
            
            
            
            
            
            },       children:(0,       x.jsx)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.text,       fontSize:12
              
              
              
              
              
              
              },       children:"Correct stock counts, BEVCO cost and selling prices here. For regular stock-in use the Purchase tab (it posts the expense automatically); use Update for opening stock, price revisions and physical corrections."
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       ie,       (0,       x.jsx)(y.PrimaryButton,              {
            
            
            
            
            
            
            title:"Save Changes",       onPress:()=>       {
              
              
              
              
              
              
              if(!te)return;
              
              
              
              
              
              
              const e=ne();
              
              
              
              
              
              
              e&&(B(       {
                
                
                
                
                
                
                type:'UPDATE_LIQUOR_ITEM',       item:Object.assign(       {
                  
                  
                  
                  
                  
                  
                  
                
                
                
                
                
                
                },       e,              {
                  
                  
                  
                  
                  
                  
                  id:te.id
                
                
                
                
                
                
                })
              
              
              
              
              
              
              }),       C(null))
            
            
            
            
            
            
            },       icon:"save-outline",       color:e.amber
          
          
          
          
          
          
          }),       (0,       x.jsx)(l.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              height:10
            
            
            
            
            
            
            }
          
          
          
          
          
          
          }),       (0,       x.jsxs)(n.default,              {
            
            
            
            
            
            
            onPress:()=>       {
              
              
              
              
              
              
              if(!te)return;
              
              
              
              
              
              
              window.confirm(`Remove ${te.brand} from the bar stock register? Past sales records are kept.`)&&(B(       {
                
                
                
                
                
                
                type:'REMOVE_LIQUOR_ITEM',       itemId:te.id
              
              
              
              
              
              
              }),       C(null))
            
            
            
            
            
            
            },       style:       {
              
              
              
              
              
              
              borderRadius:14,       paddingVertical:14,       alignItems:'center',       flexDirection:'row',       justifyContent:'center',       gap:8,       borderWidth:1,       borderColor:e.red
            
            
            
            
            
            
            },       children:[(0,       x.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:"trash-outline",       size:17,       color:e.red
            
            
            
            
            
            
            }),       (0,       x.jsx)(a.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.red,       fontWeight:'700',       fontSize:15
              
              
              
              
              
              
              },       children:"Remove Brand from Register"
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       x.jsxs)(y.Sheet,              {
        
        
        
        
        
        
        visible:w,       onClose:()=>T(!1),       title:"Add Liquor Brand",       children:[ie,       (0,       x.jsx)(y.PrimaryButton,              {
          
          
          
          
          
          
          title:"Add to Bar Stock",       onPress:()=>       {
            
            
            
            
            
            
            const e=ne();
            
            
            
            
            
            
            e&&(B(       {
              
              
              
              
              
              
              type:'ADD_LIQUOR_ITEM',       item:Object.assign(       {
                
                
                
                
                
                
                
              
              
              
              
              
              
              },       e,              {
                
                
                
                
                
                
                id:(0,       p.uid)()
              
              
              
              
              
              
              })
            
            
            
            
            
            
            }),       T(!1))
          
          
          
          
          
          
          },       icon:"add",       color:e.amber
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       x.jsx)(n.default,              {
        
        
        
        
        
        
        onPress:()=>       {
          
          
          
          
          
          
          q(''),       N('Whisky'),       V('750'),       Q(''),       G(''),       J(''),       Y(''),       ee(''),       T(!0)
        
        
        
        
        
        
        },       style:       {
          
          
          
          
          
          
          position:'absolute',       right:20,       bottom:24,       width:58,       height:58,       borderRadius:29,       backgroundColor:e.amber,       alignItems:'center',       justifyContent:'center',       elevation:6,       shadowColor:'#000',       shadowOpacity:.3,       shadowRadius:8,       shadowOffset:       {
            
            
            
            
            
            
            width:0,       height:4
          
          
          
          
          
          
          }
        
        
        
        
        
        
        },       children:(0,       x.jsx)(c.Ionicons,              {
          
          
          
          
          
          
          name:"add",       size:30,       color:"#fff"
        
        
        
        
        
        
        })
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       936,       [51,       1108,       1153,       1171,       1290,       1298,       1095,       1249,       1291,       860,       853,       859,       918,       229])