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
      
      
      
      
      
      
      return x
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       r(d[0]);
  
  
  
  
  
  
  var t=e(r(d[1])),       n=e(r(d[2])),       o=e(r(d[3])),       s=e(r(d[4]));
  
  
  
  
  
  
  r(d[5]),       r(d[6]);
  
  
  
  
  
  
  var l=r(d[7]),       c=r(d[8]),       u=r(d[9]),       f=r(d[10]),       h=r(d[11]),       p=r(d[12]),       y=r(d[13]),       b=r(d[14]);
  
  
  
  
  
  
  function x(       {
    
    
    
    
    
    
    navigation:e
  
  
  
  
  
  
  })       {
    
    
    
    
    
    
    const       {
      
      
      
      
      
      
      theme:x,       toggle:S
    
    
    
    
    
    
    }
    
    =(0,       u.useTheme)(),              {
      
      
      
      
      
      
      state:j,       dispatch:v
    
    
    
    
    
    
    }
    
    =(0,       f.useStore)(),              {
      
      
      
      
      
      
      currentUser:k,       logout:w,       can:I
    
    
    
    
    
    
    }
    
    =(0,       h.useAuth)(),       C=(e,       o,       l,       u,       f,       h)=>(0,       b.jsx)(s.default,              {
      
      
      
      
      
      
      onPress:h,       children:(0,       b.jsxs)(y.Card,              {
        
        
        
        
        
        
        style:       {
          
          
          
          
          
          
          marginBottom:8,       padding:14,       flexDirection:'row',       alignItems:'center',       gap:13
        
        
        
        
        
        
        },       children:[(0,       b.jsx)(t.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            width:42,       height:42,       borderRadius:13,       backgroundColor:f,       alignItems:'center',       justifyContent:'center'
          
          
          
          
          
          
          },       children:(0,       b.jsx)(c.Ionicons,              {
            
            
            
            
            
            
            name:l,       size:21,       color:u
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       b.jsxs)(t.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            flex:1
          
          
          
          
          
          
          },       children:[(0,       b.jsx)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              fontWeight:'700',       color:x.text,       fontSize:15
            
            
            
            
            
            
            },       children:e
          
          
          
          
          
          
          }),       (0,       b.jsx)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:x.faint,       fontSize:12,       marginTop:2
            
            
            
            
            
            
            },       children:o
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (0,       b.jsx)(c.Ionicons,              {
          
          
          
          
          
          
          name:"chevron-forward",       size:17,       color:x.faint
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })
    
    
    
    
    
    
    },       e),       T=(e,       t)=>       {
      
      
      
      
      
      
      window.alert(`${e}\n\n${t}`)
    
    
    
    
    
    
    };
    
    
    
    
    
    
    return(0,       b.jsx)(l.SafeAreaView,              {
      
      
      
      
      
      
      style:       {
        
        
        
        
        
        
        flex:1,       backgroundColor:x.bg
      
      
      
      
      
      
      },       edges:['top'],       children:(0,       b.jsxs)(o.default,              {
        
        
        
        
        
        
        contentContainerStyle:       {
          
          
          
          
          
          
          padding:16,       paddingBottom:40
        
        
        
        
        
        
        },       children:[(0,       b.jsx)(n.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            fontSize:22,       fontWeight:'800',       color:x.text
          
          
          
          
          
          
          },       children:"More"
        
        
        
        
        
        
        }),       (0,       b.jsx)(n.default,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            color:x.sub,       fontSize:13,       marginTop:2,       marginBottom:14
          
          
          
          
          
          
          },       children:j.settings.businessName
        
        
        
        
        
        
        }),       k&&(0,       b.jsxs)(y.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginBottom:4,       padding:14,       flexDirection:'row',       alignItems:'center',       gap:13
          
          
          
          
          
          
          },       children:[(0,       b.jsx)(t.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              width:46,       height:46,       borderRadius:23,       backgroundColor:x.primarySoft,       alignItems:'center',       justifyContent:'center'
            
            
            
            
            
            
            },       children:(0,       b.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'800',       color:x.primary,       fontSize:17
              
              
              
              
              
              
              },       children:k.name.charAt(0)
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }),       (0,       b.jsxs)(t.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              flex:1
            
            
            
            
            
            
            },       children:[(0,       b.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                fontWeight:'800',       color:x.text,       fontSize:15
              
              
              
              
              
              
              },       children:k.name
            
            
            
            
            
            
            }),       (0,       b.jsxs)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:x.sub,       fontSize:12,       marginTop:2
              
              
              
              
              
              
              },       children:[h.ROLE_INFO[k.role].label,       " \xb7 signed in"]
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          }),       (0,       b.jsxs)(s.default,              {
            
            
            
            
            
            
            onPress:()=>       {
              
              
              
              
              
              
              k&&v(       {
                
                
                
                
                
                
                type:'AUDIT',       event:       {
                  
                  
                  
                  
                  
                  
                  id:(0,       p.uid)(),       date:(new Date).toISOString(),       userId:k.id,       userName:k.name,       action:'LOGOUT'
                
                
                
                
                
                
                }
              
              
              
              
              
              
              }),       w()
            
            
            
            
            
            
            },       style:       {
              
              
              
              
              
              
              flexDirection:'row',       alignItems:'center',       gap:6,       backgroundColor:x.redSoft,       paddingHorizontal:13,       paddingVertical:9,       borderRadius:11
            
            
            
            
            
            
            },       children:[(0,       b.jsx)(c.Ionicons,              {
              
              
              
              
              
              
              name:"log-out-outline",       size:16,       color:x.red
            
            
            
            
            
            
            }),       (0,       b.jsx)(n.default,              {
              
              
              
              
              
              
              style:       {
                
                
                
                
                
                
                color:x.red,       fontWeight:'700',       fontSize:13
              
              
              
              
              
              
              },       children:"Sign Out"
            
            
            
            
            
            
            })]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        }),       (I('inventory')||I('credits')||I('banking')||I('employees'))&&(0,       b.jsx)(y.SectionTitle,              {
          
          
          
          
          
          
          children:"Operations"
        
        
        
        
        
        
        }),       I('inventory')&&C('Inventory',       'Food, soft drinks, kitchen, housekeeping stock',       'cube-outline',       x.teal,       x.tealSoft,       ()=>e.navigate('Inventory')),       I('credits')&&C('Credits & Payables',       'Customer credit book and vendor outstanding',       'people-outline',       x.amber,       x.amberSoft,       ()=>e.navigate('Credits')),       I('banking')&&C('Banking',       'Deposits, withdrawals, transfers, reconciliation',       'business-outline',       x.blue,       x.blueSoft,       ()=>e.navigate('Banking')),       I('employees')&&C('Employees',       'Attendance, salary, advances',       'id-card-outline',       x.primary,       x.primarySoft,       ()=>e.navigate('Employees')),       (0,       b.jsx)(y.SectionTitle,              {
          
          
          
          
          
          
          children:"Data & Security"
        
        
        
        
        
        
        }),       I('users')&&C('Users & Access Control',       `${j.users.filter(e=>e.active).length} active users \xb7 roles, PINs, audit log`,       'shield-checkmark-outline',       x.green,       x.greenSoft,       ()=>e.navigate('Users')),       C('Backup Now',       'Encrypted local backup + cloud sync when online',       'cloud-upload-outline',       x.green,       x.greenSoft,       ()=>T('Backup Complete',       'All data is stored offline-first on this device and auto-saved on every entry. An encrypted snapshot has been created. When internet is available, it syncs to Firebase automatically.')),       C('Audit Log',       `${j.auditLog.length} security events \xb7 logins & user changes tracked`,       'document-lock-outline',       x.purple,       x.purpleSoft,       ()=>I('users')?e.navigate('Users'):T('Audit Trail Active',       `${j.auditLog.length} security events and ${j.sales.length+j.txns.length+j.bankMoves.length} business entries are timestamped. The full log is visible to the Owner.`)),       C('Language / \u0d2d\u0d3e\u0d37',       'English \xb7 \u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02',       'language-outline',       x.blue,       x.blueSoft,       ()=>T('\u0d2d\u0d3e\u0d37 \u0d24\u0d3f\u0d30\u0d1e\u0d4d\u0d1e\u0d46\u0d1f\u0d41\u0d15\u0d4d\u0d15\u0d41\u0d15',       'Malayalam UI pack ships in the production build - all labels, categories and reports render in \u0d2e\u0d32\u0d2f\u0d3e\u0d33\u0d02 with Indian number formatting.')),       C('Theme',       x.dark?'Dark mode on - tap to switch':'Light mode on - tap to switch',       x.dark?'moon-outline':'sunny-outline',       x.amber,       x.amberSoft,       S),       I('users')&&C('Reset Demo Data',       'Restore fresh sample data set (Owner only)',       'refresh-outline',       x.red,       x.redSoft,       ()=>       {
          
          
          
          
          
          
          window.confirm('Reset all data to fresh demo data?')&&v(       {
            
            
            
            
            
            
            type:'RESET_DEMO'
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }),       (0,       b.jsxs)(y.Card,              {
          
          
          
          
          
          
          style:       {
            
            
            
            
            
            
            marginTop:18,       backgroundColor:x.cardAlt,       alignItems:'center',       padding:18
          
          
          
          
          
          
          },       children:[(0,       b.jsx)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              fontWeight:'800',       color:x.text,       fontSize:15
            
            
            
            
            
            
            },       children:"Deepa BMS v1.0"
          
          
          
          
          
          
          }),       (0,       b.jsxs)(n.default,              {
            
            
            
            
            
            
            style:       {
              
              
              
              
              
              
              color:x.faint,       fontSize:12,       marginTop:4,       textAlign:'center'
            
            
            
            
            
            
            },       children:["Offline-first Business Management System",       '\n',       "Deepa Restaurant & Tourist Home, Cherpulassery",       '\n',       "GSTIN ",       j.settings.gstin]
          
          
          
          
          
          
          })]
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })
    
    
    
    
    
    
    })
  
  
  
  
  
  
  }






},       948,       [51,       1108,       1153,       1179,       1290,       1298,       1095,       1249,       1291,       860,       853,       861,       859,       918,       229])