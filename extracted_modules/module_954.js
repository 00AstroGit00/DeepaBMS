__d(function(g,       _r,       i,       a,       _m,       _e,       d)       {
  
  
  
  
  
  
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
  
  
  
  
  
  
  var t=_r(d[0]),       n=e(_r(d[1])),       r=e(_r(d[2])),       o=e(_r(d[3])),       s=e(_r(d[4]));
  
  
  
  
  
  
  _r(d[5]),       _r(d[6]);
  
  
  
  
  
  
  var l=_r(d[7]),       c=_r(d[8]),       u=_r(d[9]),       f=_r(d[10]),       h=_r(d[11]),       m=_r(d[12]),       p=_r(d[13]),       y=_r(d[14]);
  
  
  
  
  
  
  const x=Object.keys(h.ROLE_INFO).map(e=>(       {
    
    
    
    
    
    
    value:e,       label:h.ROLE_INFO[e].label,       sub:h.ROLE_INFO[e].desc,       icon:'owner'===e?'key-outline':'manager'===e?'briefcase-outline':'cashier'===e?'cash-outline':'reception'===e?'desktop-outline':'fnb'===e?'restaurant-outline':'barstaff'===e?'wine-outline':'calculator-outline'
  
  
  
  
  
  
  }));
  
  
  
  
  
  
  function j()       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:e
    
    
    
    
    
    
    }
    
    =(0,       u.useTheme)(),              {
      
      
      
      
      
      
      state:j,       dispatch:I
    
    
    
    
    
    
    }
    
    =(0,       f.useStore)(),              {
      
      
      
      
      
      
      currentUser:b
    
    
    
    
    
    
    }
    
    =(0,       h.useAuth)(),       [v,       S]=(0,       t.useState)(null),       [w,       O]=(0,       t.useState)(!1),       [C,       N]=(0,       t.useState)('users'),       [D,       R]=(0,       t.useState)(''),       [A,       E]=(0,       t.useState)('cashier'),       [P,       U]=(0,       t.useState)(''),       T=(e,       t)=>       {
      
      
      
      
      
      
      window.alert(`${e}\n\n${t}`)
    
    
    
    
    
    
    },       z=e=>/^\d       {
      
      
      
      
      
      
      4
    
    
    
    
    
    
    }
    
    $/.test(e),       L=e=>       {
      
      
      
      
      
      
      if(e.id===b?.id)return void T('Not Allowed',       'You cannot delete your own account while signed in.');
      
      
      
      
      
      
      if('owner'===e.role&&1===j.users.filter(e=>'owner'===e.role).length)return void T('Cannot Delete',       'At least one Owner account must exist.');
      
      
      
      
      
      
      window.confirm(`Delete user ${e.name}? Their past audit entries are retained.`)&&(I(       {
        
        
        
        
        
        
        type:'REMOVE_USER',       userId:e.id
      
      
      
      
      
      
      }),       I(       {
        
        
        
        
        
        
        type:'AUDIT',       event:       {
          
          
          
          
          
          
          id:(0,       m.uid)(),       date:(new Date).toISOString(),       userId:b?.id||'',       userName:b?.name||'',       action:`Deleted user ${e.name}`
        
        
        
        
        
        
        }
      
      
      
      
      
      
      }),       S(null))
    
    
    
    
    
    
    };
    
    
    
    
    
    
    return(0,       y.jsxs)(l.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:e.bg
      
      
      
      
      
      
      },       edges:['bottom'],       children:[(0,       y.jsxs)(n.default,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          padding:16,       paddingBottom:8
        
        
        
        
        
        
        },       children:[(0,       y.jsx)(p.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            padding:14,       marginBottom:12
          
          
          
          
          
          
          },       children:(0,       y.jsxs)(p.Row,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              justifyContent:'space-between'
            
            
            
            
            
            
            },       children:[(0,       y.jsxs)(n.default,              {
              
              
              
              
              
              
              children:[(0,       y.jsx)(r.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  fontWeight:'800',       color:e.text,       fontSize:15
                
                
                
                
                
                
                },       children:"User Accounts & Roles"
              
              
              
              
              
              
              }),       (0,       y.jsxs)(r.default,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  color:e.sub,       fontSize:12,       marginTop:3
                
                
                
                
                
                
                },       children:[j.users.filter(e=>e.active).length,       " active \xb7 ",       j.users.length,       " total \xb7 each role sees only its permitted modules"]
              
              
              
              
              
              
              })]
            
            
            
            
            
            
            }),       (0,       y.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:"shield-checkmark-outline",       size:26,       color:e.green
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Row,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            gap:8,       marginBottom:4
          
          
          
          
          
          
          },       children:['users',       'audit'].map(t=>(0,       y.jsx)(s.default,              {
            
            
            
            
            
            
            onPress:()=>N(t),       style:       {
              
              
              
              
              
              
              flex:1,       paddingVertical:9,       borderRadius:10,       alignItems:'center',       backgroundColor:C===t?e.primary:e.card,       borderWidth:1,       borderColor:C===t?e.primary:e.border
            
            
            
            
            
            
            },       children:(0,       y.jsx)(r.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:C===t?'#fff':e.sub,       fontWeight:'700',       fontSize:13
              
              
              
              
              
              
              },       children:'users'===t?'Users':'Audit Log'
            
            
            
            
            
            
            })
          
          
          
          
          
          
          },       t))
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       'users'===C?(0,       y.jsx)(o.default,              {
        
        
        
        
        
        
        data:j.users,       keyExtractor:e=>e.id,       contentContainerStyle:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingBottom:100
        
        
        
        
        
        
        },       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>       {
          
          
          
          
          
          
          const o=h.ROLE_INFO[t.role];
          
          
          
          
          
          
          return(0,       y.jsx)(s.default,              {
            
            
            
            
            
            
            onPress:()=>       {
              
              
              
              
              
              
              return S(e=t),       R(e.name),       E(e.role),       void U(e.pin);
              
              
              
              
              
              
              var e
            
            
            
            
            
            
            },       children:(0,       y.jsx)(p.Card,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                marginBottom:8,       padding:13,       opacity:t.active?1:.55
              
              
              
              
              
              
              },       children:(0,       y.jsxs)(p.Row,              {
                
                
                
                
                
                
                style:       {
                  
                  
                  
                  
                  
                  
                  gap:12
                
                
                
                
                
                
                },       children:[(0,       y.jsx)(n.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    width:42,       height:42,       borderRadius:21,       backgroundColor:e.primarySoft,       alignItems:'center',       justifyContent:'center'
                  
                  
                  
                  
                  
                  
                  },       children:(0,       y.jsx)(r.default,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      fontWeight:'800',       color:e.primary,       fontSize:16
                    
                    
                    
                    
                    
                    
                    },       children:t.name.charAt(0)
                  
                  
                  
                  
                  
                  
                  })
                
                
                
                
                
                
                }),       (0,       y.jsxs)(n.default,              {
                  
                  
                  
                  
                  
                  
                  style:       {
                    
                    
                    
                    
                    
                    
                    flex:1
                  
                  
                  
                  
                  
                  
                  },       children:[(0,       y.jsxs)(p.Row,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      gap:8
                    
                    
                    
                    
                    
                    
                    },       children:[(0,       y.jsx)(r.default,              {
                      
                      
                      
                      
                      
                      
                      style:       {
                        
                        
                        
                        
                        
                        
                        fontWeight:'800',       color:e.text,       fontSize:14
                      
                      
                      
                      
                      
                      
                      },       children:t.name
                    
                    
                    
                    
                    
                    
                    }),       t.id===b?.id&&(0,       y.jsx)(p.Badge,              {
                      
                      
                      
                      
                      
                      
                      text:"YOU",       color:e.green,       soft:e.greenSoft
                    
                    
                    
                    
                    
                    
                    }),       !t.active&&(0,       y.jsx)(p.Badge,              {
                      
                      
                      
                      
                      
                      
                      text:"DISABLED",       color:e.red,       soft:e.redSoft
                    
                    
                    
                    
                    
                    
                    })]
                  
                  
                  
                  
                  
                  
                  }),       (0,       y.jsx)(r.default,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      color:e.sub,       fontSize:12,       marginTop:2
                    
                    
                    
                    
                    
                    
                    },       children:o.label
                  
                  
                  
                  
                  
                  
                  }),       (0,       y.jsxs)(r.default,              {
                    
                    
                    
                    
                    
                    
                    style:       {
                      
                      
                      
                      
                      
                      
                      color:e.faint,       fontSize:11,       marginTop:2
                    
                    
                    
                    
                    
                    
                    },       children:["Modules: ",       o.perms.filter(e=>'settings'!==e).join(', ')]
                  
                  
                  
                  
                  
                  
                  })]
                
                
                
                
                
                
                }),       (0,       y.jsx)(s.default,              {
                  
                  
                  
                  
                  
                  
                  onPress:()=>       {
                    
                    
                    
                    
                    
                    
                    var e;
                    
                    
                    
                    
                    
                    
                    'owner'===(e=t).role&&1===j.users.filter(e=>'owner'===e.role&&e.active).length&&e.active?T('Cannot Deactivate',       'At least one active Owner account is required.'):(I(       {
                      
                      
                      
                      
                      
                      
                      type:'UPDATE_USER',       user:Object.assign(       {
                        
                        
                        
                        
                        
                        
                        
                      
                      
                      
                      
                      
                      
                      },       e,              {
                        
                        
                        
                        
                        
                        
                        active:!e.active
                      
                      
                      
                      
                      
                      
                      })
                    
                    
                    
                    
                    
                    
                    }),       I(       {
                      
                      
                      
                      
                      
                      
                      type:'AUDIT',       event:       {
                        
                        
                        
                        
                        
                        
                        id:(0,       m.uid)(),       date:(new Date).toISOString(),       userId:b?.id||'',       userName:b?.name||'',       action:`${e.active?'Deactivated':'Activated'} user ${e.name}`
                      
                      
                      
                      
                      
                      
                      }
                    
                    
                    
                    
                    
                    
                    }))
                  
                  
                  
                  
                  
                  
                  },       style:       {
                    
                    
                    
                    
                    
                    
                    padding:6
                  
                  
                  
                  
                  
                  
                  },       children:(0,       y.jsx)(c.Ionicons,              {
                    
                    
                    
                    
                    
                    
                    name:t.active?'toggle':'toggle-outline',       size:30,       color:t.active?e.green:e.faint
                  
                  
                  
                  
                  
                  
                  })
                
                
                
                
                
                
                })]
              
              
              
              
              
              
              })
            
            
            
            
            
            
            })
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }
      
      
      
      
      
      
      }):(0,       y.jsx)(o.default,              {
        
        
        
        
        
        
        data:j.auditLog,       keyExtractor:e=>e.id,       contentContainerStyle:       {
          
          
          
          
          
          
          paddingHorizontal:16,       paddingBottom:100
        
        
        
        
        
        
        },       ListEmptyComponent:(0,       y.jsx)(p.EmptyState,              {
          
          
          
          
          
          
          icon:"shield-outline",       text:"No audit events yet"
        
        
        
        
        
        
        }),       renderItem:(       {
          
          
          
          
          
          
          item:t
        
        
        
        
        
        
        })=>(0,       y.jsxs)(p.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginBottom:6,       padding:12,       flexDirection:'row',       alignItems:'center',       gap:11
          
          
          
          
          
          
          },       children:[(0,       y.jsx)(c.Ionicons,              {
            
            
            
            
            
            
            name:t.action.startsWith('LOGIN FAILED')?'warning-outline':'LOGIN'===t.action?'log-in-outline':'LOGOUT'===t.action?'log-out-outline':'create-outline',       size:18,       color:t.action.startsWith('LOGIN FAILED')?e.red:e.sub
          
          
          
          
          
          
          }),       (0,       y.jsxs)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:[(0,       y.jsxs)(r.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.text,       fontSize:13,       fontWeight:'600'
              
              
              
              
              
              
              },       children:[t.userName,       " \xb7 ",       t.action]
            
            
            
            
            
            
            }),       (0,       y.jsx)(r.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:e.faint,       fontSize:11,       marginTop:2
              
              
              
              
              
              
              },       children:new Date(t.date).toLocaleString('en-IN')
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       y.jsx)(s.default,              {
        
        
        
        
        
        
        onPress:()=>       {
          
          
          
          
          
          
          R(''),       U(''),       E('cashier'),       O(!0)
        
        
        
        
        
        
        },       style:       {
          
          
          
          
          
          
          position:'absolute',       right:20,       bottom:24,       width:58,       height:58,       borderRadius:29,       backgroundColor:e.primary,       alignItems:'center',       justifyContent:'center',       elevation:6,       shadowColor:'#000',       shadowOpacity:.3,       shadowRadius:8,       shadowOffset:       {
            
            
            
            
            
            
            width:0,       height:4
          
          
          
          
          
          
          }
        
        
        
        
        
        
        },       children:(0,       y.jsx)(c.Ionicons,              {
          
          
          
          
          
          
          name:"person-add-outline",       size:24,       color:"#fff"
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       (0,       y.jsxs)(p.Sheet,              {
        
        
        
        
        
        
        visible:w,       onClose:()=>O(!1),       title:"New User Account",       children:[(0,       y.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"Staff Name",       value:D,       onChangeText:R,       placeholder:"e.g. Priya K"
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Select,              {
          
          
          
          
          
          
          label:"Role",       value:A,       onChange:e=>E(e),       options:x
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            backgroundColor:e.cardAlt,       marginBottom:14,       padding:12
          
          
          
          
          
          
          },       children:(0,       y.jsxs)(r.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.sub,       fontSize:12,       lineHeight:17
            
            
            
            
            
            
            },       children:[h.ROLE_INFO[A].label,       " can access: ",       h.ROLE_INFO[A].perms.filter(e=>'settings'!==e&&'users'!==e).map(e=>e.charAt(0).toUpperCase()+e.slice(1)).join(' \xb7 ')]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"4-digit PIN",       value:P,       onChangeText:e=>U(e.replace(/\D/g,       '').slice(0,       4)),       keyboardType:"numeric",       placeholder:"\u2022\u2022\u2022\u2022"
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.PrimaryButton,              {
          
          
          
          
          
          
          title:"Create User",       onPress:()=>       {
            
            
            
            
            
            
            if(!D.trim())return void T('Name Required',       'Enter the staff member\u2019s name.');
            
            
            
            
            
            
            if(!z(P))return void T('Invalid PIN',       'PIN must be exactly 4 digits.');
            
            
            
            
            
            
            if(j.users.some(e=>e.active&&e.pin===P))return void T('PIN In Use',       'Another active user already has this PIN. Choose a different one.');
            
            
            
            
            
            
            const e=       {
              
              
              
              
              
              
              id:(0,       m.uid)(),       name:D.trim(),       role:A,       pin:P,       active:!0,       createdAt:(new Date).toISOString()
            
            
            
            
            
            
            };
            
            
            
            
            
            
            I(       {
              
              
              
              
              
              
              type:'ADD_USER',       user:e
            
            
            
            
            
            
            }),       I(       {
              
              
              
              
              
              
              type:'AUDIT',       event:       {
                
                
                
                
                
                
                id:(0,       m.uid)(),       date:(new Date).toISOString(),       userId:b?.id||'',       userName:b?.name||'',       action:`Created user ${e.name} (${h.ROLE_INFO[A].label})`
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       O(!1),       R(''),       U(''),       E('cashier')
          
          
          
          
          
          
          },       icon:"person-add-outline"
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      }),       (0,       y.jsxs)(p.Sheet,              {
        
        
        
        
        
        
        visible:!!v,       onClose:()=>S(null),       title:v?`Edit \xb7 ${v.name}`:'',       children:[(0,       y.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"Staff Name",       value:D,       onChangeText:R
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Select,              {
          
          
          
          
          
          
          label:"Role",       value:A,       onChange:e=>E(e),       options:x
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.Field,              {
          
          
          
          
          
          
          label:"4-digit PIN",       value:P,       onChangeText:e=>U(e.replace(/\D/g,       '').slice(0,       4)),       keyboardType:"numeric"
        
        
        
        
        
        
        }),       (0,       y.jsx)(p.PrimaryButton,              {
          
          
          
          
          
          
          title:"Save Changes",       onPress:()=>       {
            
            
            
            
            
            
            if(!v)return;
            
            
            
            
            
            
            if(!D.trim())return void T('Name Required',       'Name cannot be empty.');
            
            
            
            
            
            
            if(!z(P))return void T('Invalid PIN',       'PIN must be exactly 4 digits.');
            
            
            
            
            
            
            if(j.users.some(e=>e.active&&e.id!==v.id&&e.pin===P))return void T('PIN In Use',       'Another active user already has this PIN.');
            
            
            
            
            
            
            const e=Object.assign(       {
              
              
              
              
              
              
              
            
            
            
            
            
            
            },       v,              {
              
              
              
              
              
              
              name:D.trim(),       role:A,       pin:P
            
            
            
            
            
            
            });
            
            
            
            
            
            
            I(       {
              
              
              
              
              
              
              type:'UPDATE_USER',       user:e
            
            
            
            
            
            
            }),       I(       {
              
              
              
              
              
              
              type:'AUDIT',       event:       {
                
                
                
                
                
                
                id:(0,       m.uid)(),       date:(new Date).toISOString(),       userId:b?.id||'',       userName:b?.name||'',       action:`Updated user ${e.name}`
              
              
              
              
              
              
              }
            
            
            
            
            
            
            }),       S(null)
          
          
          
          
          
          
          },       icon:"save-outline"
        
        
        
        
        
        
        }),       (0,       y.jsx)(n.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            height:10
          
          
          
          
          
          
          }
        
        
        
        
        
        
        }),       v&&(0,       y.jsxs)(s.default,              {
          
          
          
          
          
          
          onPress:()=>L(v),       style:       {
            
            
            
            
            
            
            borderRadius:14,       paddingVertical:14,       alignItems:'center',       flexDirection:'row',       justifyContent:'center',       gap:8,       borderWidth:1,       borderColor:e.red
          
          
          
          
          
          
          },       children:[(0,       y.jsx)(c.Ionicons,              {
            
            
            
            
            
            
            name:"trash-outline",       size:17,       color:e.red
          
          
          
          
          
          
          }),       (0,       y.jsx)(r.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:e.red,       fontWeight:'700',       fontSize:15
            
            
            
            
            
            
            },       children:"Delete User"
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })]
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       954,       [51,       1108,       1153,       1171,       1290,       1298,       1095,       1249,       1291,       860,       853,       861,       859,       918,       229])