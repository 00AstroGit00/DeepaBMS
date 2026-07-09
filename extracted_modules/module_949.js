__d(function(g,       r,       _i,       a,       _m,       _e,       d)       {
  
  
  
  
  
  
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
  
  
  
  
  
  
  var t=r(d[0]),       l=e(r(d[1])),       o=e(r(d[2])),       n=e(r(d[3])),       i=e(r(d[4]));
  
  
  
  
  
  
  r(d[5]),       r(d[6]);
  
  
  
  
  
  
  var s=r(d[7]),       u=r(d[8]),       c=r(d[9]),       m=r(d[10]),       b=r(d[11]),       f=r(d[12]),       x=r(d[13]);
  
  
  
  
  
  
  const h=[       {
    
    
    
    
    
    
    value:'food',       label:'Food',       icon:'basket-outline',       sub:'Rice, meat, vegetables, oil'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'softdrink',       label:'Soft Drinks',       icon:'pint-outline',       sub:'Sodas, water, juices'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'kitchen',       label:'Kitchen',       icon:'flame-outline',       sub:'LPG, utensils, equipment'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'housekeeping',       label:'Housekeeping',       icon:'bed-outline',       sub:'Linen, towels, toiletries'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'consumable',       label:'Consumables',       icon:'trash-bin-outline',       sub:'Cleaning, tissues, disposables'
  
  
  
  
  
  
  }],       y=[       {
    
    
    
    
    
    
    value:'kg',       label:'kg \xb7 kilogram'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'g',       label:'g \xb7 gram'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'L',       label:'L \xb7 litre'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'ml',       label:'ml \xb7 millilitre'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'pc',       label:'pc \xb7 piece'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'btl',       label:'btl \xb7 bottle'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'pkt',       label:'pkt \xb7 packet'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'box',       label:'box'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'set',       label:'set'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'cyl',       label:'cyl \xb7 cylinder'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'can',       label:'can'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    value:'roll',       label:'roll'
  
  
  
  
  
  
  }],       k=[       {
    
    
    
    
    
    
    key:'all',       label:'All'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'food',       label:'Food'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'softdrink',       label:'Soft Drinks'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'kitchen',       label:'Kitchen'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'housekeeping',       label:'Housekeeping'
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    key:'consumable',       label:'Consumables'
  
  
  
  
  
  
  }];
  
  
  
  
  
  
  function p()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e
    
    
    
    
    
    
    }
    
    =(0,       c.useTheme)(),              {
      
      
      
      
      
      
      state:p,       dispatch:S
    
    
    
    
    
    
    }
    
    =(0,       m.useStore)(),       [j,       v]=(0,       t.useState)('all'),       [w,       C]=(0,       t.useState)('items'),       [I,       T]=(0,       t.useState)(null),       [P,       R]=(0,       t.useState)(!1),       [z,       N]=(0,       t.useState)('in'),       [B,       E]=(0,       t.useState)(''),       [O,       D]=(0,       t.useState)(''),       [L,       M]=(0,       t.useState)(''),       [_,       F]=(0,       t.useState)('food'),       [$,       W]=(0,       t.useState)('kg'),       [A,       H]=(0,       t.useState)(''),       [V,       K]=(0,       t.useState)(''),       [q,       G]=(0,       t.useState)(''),       U=(0,       t.useMemo)(()=>p.inventory.filter(e=>'all'===j||e.category===j),       [p.inventory,       j]),       Q=(0,       t.useMemo)(()=>(0,       m.inventoryValue)(p),       [p]),       J=(0,       t.useMemo)(()=>(0,       m.lowStockItems)(p),       [p]);
    
    
    
    
    
    
    return(0,       x.jsxs)(s.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg
      
      
      
      
      
      
      },       edges:['bottom'],       children:[(0,       x.jsxs)(l.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          padding:16,       paddingBottom:8
        
        
        
        
        
        
        },       children:[(0,       x.jsx)(f.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            padding:14,       marginBottom:12
          
          
          
          
          
          
          },       children:(0,       x.jsxs)(f.Row,              {
            
            
            
            
            
            
            children:[(0,       x.jsx)(f.StatPill,              {
              
              
              
              
              
              
              label:"Stock Value",       value:(0,       b.inr)(Q),       color:e.teal
            
            
            
            
            
            
            }),       (0,       x.jsx)(f.StatPill,              {
              
              
              
              
              
              
              label:"Items",       value:String(p.inventory.length)
            
            
            
            
            
            
            }),       (0,       x.jsx)(f.StatPill,              {
              
              
              
              
              
              
              label:"Low Stock",       value:String(J.length),       color:J.length?e.red:e.green
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       x.jsx)(f.Segmented,              {
          
          
          
          
          
          
          options:[       {
            
            
            
            
            
            
            key:'items',       label:'Stock Items'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'moves',       label:'Movement Log'
          
          
          
          
          
          
          }],       value:w,       onChange:C
        
        
        
        
        
        
        }),       'items'===w&&(0,       x.jsx)(n.default,              {
          
          
          
          
          
          
          horizontal:!0,       showsHorizontalScrollIndicator:!1,       data:k,       keyExtractor:e=>e.key,       style:       {
            
            
            
            
            
            
            flexGrow:0
          
          
          
          
          
          
          },       renderItem:(       {
            
            
            
            
            
            
            item:t
          
          
          
          
          
          
          })=>(0,       x.jsx)(f.Chip,              {
            
            
            
            
            
            
            label:t.label,       active:j===t.key,       onPress:()=>v(t.key),       color:e.teal
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       'items'===w?(0,       x.jsx)(n.default,              {
        
        
        
        
        
        
        data:U,       keyExtractor:e=>e.id,       contentContainerStyle:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingBottom:100
        
        
        
        
        
        
        },       ListEmptyComponent:(0,       x.jsx)(f.EmptyState,              {
          
          
          
          
          
          
          icon:"cube-outline",       text:"No items in this category"
        
        
        
        
        
        
        }),       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>       {
          
          
          
          
          
          
          const n=t.stock<=t.reorder;
          
          
          
          
          
          
          return(0,       x.jsx)(i.default,              {
            
            
            
            
            
            
            onPress:()=>T(t),       children:(0,       x.jsxs)(f.Card,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                marginBottom:8,       padding:13,       flexDirection:'row',       alignItems:'center',       gap:12
              
              
              
              
              
              
              },       children:[(0,       x.jsx)(l.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  width:38,       height:38,       borderRadius:12,       backgroundColor:n?e.redSoft:e.tealSoft,       alignItems:'center',       justifyContent:'center'
                
                
                
                
                
                
                },       children:(0,       x.jsx)(u.Ionicons,              {
                  
                  
                  
                  
                  
                  
                  name:"cube-outline",       size:18,       color:n?e.red:e.teal
                
                
                
                
                
                
                })
              
              
              
              
              
              
              }),       (0,       x.jsxs)(l.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  flex:1
                
                
                
                
                
                
                },       children:[(0,       x.jsx)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    fontWeight:'700',       color:e.text,       fontSize:14
                  
                  
                  
                  
                  
                  
                  },       children:t.name
                
                
                
                
                
                
                }),       (0,       x.jsxs)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    color:e.faint,       fontSize:11,       marginTop:2
                  
                  
                  
                  
                  
                  
                  },       children:["Reorder at ",       t.reorder,       " ",       t.unit,       " \xb7 ",       (0,       b.inr)(t.cost),       "/",       t.unit]
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              }),       (0,       x.jsxs)(l.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  alignItems:'flex-end'
                
                
                
                
                
                
                },       children:[(0,       x.jsxs)(o.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    fontWeight:'800',       fontSize:15,       color:n?e.red:e.text
                  
                  
                  
                  
                  
                  
                  },       children:[t.stock,       " ",       t.unit]
                
                
                
                
                
                
                }),       n&&(0,       x.jsx)(f.Badge,              {
                  
                  
                  
                  
                  
                  
                  text:"REORDER",       color:e.red,       soft:e.redSoft
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            })
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }
      
      
      
      
      
      
      }):(0,       x.jsx)(n.default,              {
        
        
        
        
        
        
        data:p.stockMoves,       keyExtractor:e=>e.id,       contentContainerStyle:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingBottom:100
        
        
        
        
        
        
        },       ListEmptyComponent:(0,       x.jsx)(f.EmptyState,              {
          
          
          
          
          
          
          icon:"swap-vertical-outline",       text:"No stock movements yet"
        
        
        
        
        
        
        }),       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>(0,       x.jsxs)(f.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginBottom:8,       padding:13,       flexDirection:'row',       alignItems:'center',       gap:12
          
          
          
          
          
          
          },       children:[(0,       x.jsx)(u.Ionicons,              {
            
            
            
            
            
            
            name:'in'===t.kind?'arrow-down-circle-outline':'wastage'===t.kind?'trash-outline':'arrow-up-circle-outline',       size:22,       color:'in'===t.kind?e.green:'wastage'===t.kind?e.red:e.amber
          
          
          
          
          
          
          }),       (0,       x.jsxs)(l.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:[(0,       x.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'700',       color:e.text,       fontSize:14
              
              
              
              
              
              
              },       children:[t.itemName,       " \xb7 ",       'in'===t.kind?'+':'-',       t.qty]
            
            
            
            
            
            
            }),       (0,       x.jsxs)(o.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:11,       marginTop:2
              
              
              
              
              
              
              },       children:[t.note,       " \xb7 ",       (0,       b.fmtDateTime)(t.date)]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       x.jsx)(f.Badge,              {
            
            
            
            
            
            
            text:t.kind.toUpperCase(),       color:'in'===t.kind?e.green:'wastage'===t.kind?e.red:e.amber,       soft:'in'===t.kind?e.greenSoft:'wastage'===t.kind?e.redSoft:e.amberSoft
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       x.jsx)(i.default,              {
        
        
        
        
        
        
        onPress:()=>R(!0),       style:       {
          
          
          
          
          
          
          position:'absolute',       right:20,       bottom:24,       width:58,       height:58,       borderRadius:29,       backgroundColor:e.teal,       alignItems:'center',       justifyContent:'center',       elevation:6,       shadowColor:'#000',       shadowOpacity:.3,       shadowRadius:8,       shadowOffset:       {
            
            
            
            
            
            
            width:0,       height:4
          
          
          
          
          
          
          }
        
        
        
        
        
        
        },       children:(0,       x.jsx)(u.Ionicons,              {
          
          
          
          
          
          
          name:"add",       size:30,       color:"#fff"
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       x.jsxs)(f.Sheet,              {
        
        
        
        
        
        
        visible:!!I,       onClose:()=>T(null),       title:I?.name||'',       children:[(0,       x.jsx)(f.Segmented,              {
          
          
          
          
          
          
          options:[       {
            
            
            
            
            
            
            key:'in',       label:'Stock In'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'out',       label:'Stock Out'
          
          
          
          
          
          
          },              {
            
            
            
            
            
            
            key:'wastage',       label:'Wastage'
          
          
          
          
          
          
          }],       value:z,       onChange:N
        
        
        
        
        
        
        }),       (0,       x.jsx)(f.Field,              {
          
          
          
          
          
          
          label:`Quantity (${I?.unit||''})`,       value:B,       onChangeText:E,       keyboardType:"numeric",       placeholder:"0"
        
        
        
        
        
        
        }),       (0,       x.jsx)(f.Field,              {
          
          
          
          
          
          
          label:"Note",       value:O,       onChangeText:D,       placeholder:'in'===z?'Purchase from...':'out'===z?'Issued to kitchen':'Reason for wastage'
        
        
        
        
        
        
        }),       (0,       x.jsx)(f.PrimaryButton,              {
          
          
          
          
          
          
          title:'in'===z?'Add Stock':'out'===z?'Issue Stock':'Record Wastage',       onPress:()=>       {
            
            
            
            
            
            
            if(!I)return;
            
            
            
            
            
            
            const e=(0,       b.parseNum)(B);
            
            
            
            
            
            
            if(e)       {
              
              
              
              
              
              
              if('in'!==z&&e>I.stock)       {
                
                
                
                
                
                
                const t=`Only ${I.stock} ${I.unit} of ${I.name} in stock. Cannot issue ${e} ${I.unit}.`;
                
                
                
                
                
                
                return void window.alert(`Insufficient Stock\n\n${t}`)
              
              
              
              
              
              
              }
              S(       {
                
                
                
                
                
                
                type:'STOCK_MOVE',       move:       {
                  
                  
                  
                  
                  
                  
                  id:(0,       b.uid)(),       date:(new Date).toISOString(),       itemId:I.id,       itemName:I.name,       kind:z,       qty:e,       note:O.trim()||('in'===z?'Purchase / stock in':'out'===z?'Kitchen issue':'Wastage')
                
                
                
                
                
                
                }
              
              
              
              
              
              
              }),       T(null),       E(''),       D('')
            
            
            
            
            
            
            }
          
          
          
          
          
          
          },       icon:"checkmark",       color:'wastage'===z?e.red:e.teal
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       x.jsxs)(f.Sheet,              {
        
        
        
        
        
        
        visible:P,       onClose:()=>R(!1),       title:"New Inventory Item",       children:[(0,       x.jsx)(f.Field,              {
          
          
          
          
          
          
          label:"Item Name",       value:L,       onChangeText:M,       placeholder:"e.g. Basmati Rice"
        
        
        
        
        
        
        }),       (0,       x.jsx)(f.Select,              {
          
          
          
          
          
          
          label:"Category",       value:_,       onChange:e=>F(e),       options:h,       color:e.teal
        
        
        
        
        
        
        }),       (0,       x.jsxs)(f.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            gap:12,       alignItems:'flex-start'
          
          
          
          
          
          
          },       children:[(0,       x.jsx)(l.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:(0,       x.jsx)(f.Select,              {
              
              
              
              
              
              
              label:"Unit",       value:$,       onChange:W,       options:y,       color:e.teal
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       (0,       x.jsx)(l.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:(0,       x.jsx)(f.Field,              {
              
              
              
              
              
              
              label:"Opening Stock",       value:A,       onChangeText:H,       keyboardType:"numeric"
            
            
            
            
            
            
            })
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       x.jsxs)(f.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            gap:12
          
          
          
          
          
          
          },       children:[(0,       x.jsx)(l.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:(0,       x.jsx)(f.Field,              {
              
              
              
              
              
              
              label:"Reorder Level",       value:V,       onChangeText:K,       keyboardType:"numeric"
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       (0,       x.jsx)(l.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:(0,       x.jsx)(f.Field,              {
              
              
              
              
              
              
              label:"Cost / unit (\u20b9)",       value:q,       onChangeText:G,       keyboardType:"numeric"
            
            
            
            
            
            
            })
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       x.jsx)(f.PrimaryButton,              {
          
          
          
          
          
          
          title:"Add Item",       onPress:()=>       {
            
            
            
            
            
            
            L.trim()&&(S(       {
              
              
              
              
              
              
              type:'ADD_INV_ITEM',       item:       {
                
                
                
                
                
                
                id:(0,       b.uid)(),       name:L.trim(),       category:_,       unit:$.trim()||'pc',       stock:(0,       b.parseNum)(A),       reorder:(0,       b.parseNum)(V),       cost:(0,       b.parseNum)(q)
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       R(!1),       M(''),       H(''),       K(''),       G(''))
          
          
          
          
          
          
          },       icon:"add",       color:e.teal
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       949,       [51,       1108,       1153,       1171,       1290,       1298,       1095,       1249,       1291,       860,       853,       859,       918,       229])