__d(function(g,       _r,       _i,       _a,       _m,       _e,       _d)       {
  
  
  
  
  
  
  "use strict";
  
  
  
  
  
  
  Object.defineProperty(_e,       '__esModule',              {
    
    
    
    
    
    
    value:!0
  
  
  
  
  
  
  }),       _e.StoreProvider=function(       {
    
    
    
    
    
    
    children:e
  
  
  
  
  
  
  })       {
    
    
    
    
    
    
    const[s,       r]=(0,       t.useReducer)(i,       u),       l=(0,       t.useRef)(!1);
    
    
    
    
    
    
    return(0,       t.useEffect)(()=>       {
      
      
      
      
      
      
      (async()=>       {
        
        
        
        
        
        
        try       {
          
          
          
          
          
          
          const e=await n.default.getItem(c);
          
          
          
          
          
          
          if(e)       {
            
            
            
            
            
            
            const t=JSON.parse(e),       s=(0,       a.buildSeed)();
            
            
            
            
            
            
            t.users&&0!==t.users.length||(t.users=s.users),       t.auditLog=t.auditLog||[],       t.leaves=t.leaves||s.leaves,       t.announcements=t.announcements||s.announcements,       t.employees=(t.employees||s.employees).map(e=>Object.assign(       {
              
              
              
              
              
              
              
            
            
            
            
            
            
            },       e,              {
              
              
              
              
              
              
              status:e.status??'active',       joinDate:e.joinDate??'2022-01-01',       access:e.access??'staff',       leaveBalance:e.leaveBalance??       {
                
                
                
                
                
                
                casual:6,       sick:6
              
              
              
              
              
              
              },       reviews:e.reviews??[],       documents:e.documents??[]
            
            
            
            
            
            
            })),       r(       {
              
              
              
              
              
              
              type:'HYDRATE',       state:t
            
            
            
            
            
            
            })
          
          
          
          
          
          
          }else r(       {
            
            
            
            
            
            
            type:'HYDRATE',       state:(0,       a.buildSeed)()
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }catch       {
          
          
          
          
          
          
          r(       {
            
            
            
            
            
            
            type:'HYDRATE',       state:(0,       a.buildSeed)()
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }
        l.current=!0
      
      
      
      
      
      
      })()
    
    
    
    
    
    
    },       []),       (0,       t.useEffect)(()=>       {
      
      
      
      
      
      
      l.current&&s.ready&&n.default.setItem(c,       JSON.stringify(s)).catch(()=>       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      })
    
    
    
    
    
    
    },       [s]),       (0,       o.jsx)(d.Provider,              {
      
      
      
      
      
      
      value:       {
        
        
        
        
        
        
        state:s,       dispatch:r
      
      
      
      
      
      
      },       children:e
    
    
    
    
    
    
    })
  
  
  
  
  
  
  },       Object.defineProperty(_e,       "useStore",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return l
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       _e.financeForDay=function(e,       t)       {
    
    
    
    
    
    
    const s=       {
      
      
      
      
      
      
      revenue:0,       restaurant:0,       bar:0,       rooms:0,       takeaway:0,       online:0,       expenses:0,       purchases:0,       otherIncome:0,       profit:0,       gstCollected:0
    
    
    
    
    
    
    };
    
    
    
    
    
    
    for(const n of e.sales)(0,       r.keyOf)(n.date)===t&&(s.revenue+=n.total,       s.gstCollected+=n.gstAmount,       s[n.dept]+=n.total);
    
    
    
    
    
    
    for(const n of e.txns)(0,       r.keyOf)(n.date)===t&&('expense'===n.kind?(s.expenses+=n.amount,       ['Provisions',       'Meat & Fish',       'Liquor Purchase',       'Soft Drinks Purchase'].includes(n.category)&&(s.purchases+=n.amount)):s.otherIncome+=n.amount);
    
    
    
    
    
    
    return s.profit=s.revenue+s.otherIncome-s.expenses,       s
  
  
  
  
  
  
  },       _e.financeForMonth=function(e)       {
    
    
    
    
    
    
    const t=(0,       r.todayKey)().slice(0,       7),       s=       {
      
      
      
      
      
      
      revenue:0,       restaurant:0,       bar:0,       rooms:0,       takeaway:0,       online:0,       expenses:0,       purchases:0,       otherIncome:0,       profit:0,       gstCollected:0
    
    
    
    
    
    
    };
    
    
    
    
    
    
    for(const n of e.sales)(0,       r.keyOf)(n.date).startsWith(t)&&(s.revenue+=n.total,       s.gstCollected+=n.gstAmount,       s[n.dept]+=n.total);
    
    
    
    
    
    
    for(const n of e.txns)(0,       r.keyOf)(n.date).startsWith(t)&&('expense'===n.kind?s.expenses+=n.amount:s.otherIncome+=n.amount);
    
    
    
    
    
    
    return s.profit=s.revenue+s.otherIncome-s.expenses,       s
  
  
  
  
  
  
  },       _e.cashInHand=function(e)       {
    
    
    
    
    
    
    let t=e.settings.openingCash;
    
    
    
    
    
    
    for(const s of e.sales)'cash'===s.mode&&(t+=s.total);
    
    
    
    
    
    
    for(const s of e.txns)'cash'===s.mode&&(t+='income'===s.kind?s.amount:-s.amount);
    
    
    
    
    
    
    for(const s of e.bankMoves)'deposit'===s.kind&&(t-=s.amount),       'withdraw'===s.kind&&(t+=s.amount);
    
    
    
    
    
    
    return t
  
  
  
  
  
  
  },       _e.bankBalance=function(e,       t)       {
    
    
    
    
    
    
    let s=0;
    
    
    
    
    
    
    for(const n of e.banks)t&&n.id!==t||(s+=n.baseBalance);
    
    
    
    
    
    
    const n=e=>!t||e===t;
    
    
    
    
    
    
    for(const t of e.sales)'upi'!==t.mode&&'card'!==t.mode&&'bank'!==t.mode||!n(e.settings.defaultBankId)||(s+=t.total);
    
    
    
    
    
    
    for(const t of e.txns)'bank'===t.mode&&n(t.bankId||e.settings.defaultBankId)&&(s+='income'===t.kind?t.amount:-t.amount);
    
    
    
    
    
    
    for(const t of e.bankMoves)'deposit'===t.kind&&n(t.bankId)&&(s+=t.amount),       'withdraw'===t.kind&&n(t.bankId)&&(s-=t.amount),       'transfer'===t.kind&&(n(t.bankId)&&(s-=t.amount),       n(t.toBankId)&&(s+=t.amount));
    
    
    
    
    
    
    return s
  
  
  
  
  
  
  },       Object.defineProperty(_e,       "customerOutstanding",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return m
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       Object.defineProperty(_e,       "vendorPayables",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return p
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       Object.defineProperty(_e,       "lowStockItems",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return b
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       Object.defineProperty(_e,       "occupancy",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return f
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       Object.defineProperty(_e,       "liquorStockValue",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return O
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       Object.defineProperty(_e,       "inventoryValue",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return y
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var e,       t=_r(_d[0]),       s=_r(_d[1]),       n=(e=s)&&e.__esModule?e:       {
    
    
    
    
    
    
    default:e
  
  
  
  
  
  
  },       a=_r(_d[2]),       r=_r(_d[3]),       o=_r(_d[4]);
  
  
  
  
  
  
  const c='deepa-bms-v4';
  
  
  
  
  
  
  function i(e,       t)       {
    
    
    
    
    
    
    switch(t.type)       {
      
      
      
      
      
      
      case'HYDRATE':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       t.state,              {
        
        
        
        
        
        
        ready:!0
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'ADD_SALE':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        sales:[t.sale,       ...e.sales]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'ADD_TXN':case'PAY_SALARIES':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        txns:[t.txn,       ...e.txns]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'ADD_BANK_MOVE':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        bankMoves:[t.move,       ...e.bankMoves]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'CHECK_IN':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        rooms:e.rooms.map(e=>e.id===t.roomId?Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          status:'occupied',       guest:t.guest
        
        
        
        
        
        
        }):e)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'CHECK_OUT':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        rooms:e.rooms.map(e=>e.id===t.roomId?Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          status:'cleaning',       guest:void 0
        
        
        
        
        
        
        }):e),       stays:[t.stay,       ...e.stays],       sales:[t.sale,       ...e.sales]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'SET_ROOM_STATUS':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        rooms:e.rooms.map(e=>e.id===t.roomId?Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          status:t.status
        
        
        
        
        
        
        }):e)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'ADD_INV_ITEM':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        inventory:[t.item,       ...e.inventory]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'STOCK_MOVE':       {
        
        
        
        
        
        
        const s=e.inventory.map(e=>       {
          
          
          
          
          
          
          if(e.id!==t.move.itemId)return e;
          
          
          
          
          
          
          const s='in'===t.move.kind?t.move.qty:-t.move.qty;
          
          
          
          
          
          
          return Object.assign(       {
            
            
            
            
            
            
            
          
          
          
          
          
          
          },       e,              {
            
            
            
            
            
            
            stock:Math.max(0,       e.stock+s)
          
          
          
          
          
          
          })
        
        
        
        
        
        
        });
        
        
        
        
        
        
        return Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          inventory:s,       stockMoves:[t.move,       ...e.stockMoves]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }
      
      case'SELL_LIQUOR':       {
        
        
        
        
        
        
        const s=e.liquor.map(e=>       {
          
          
          
          
          
          
          if(e.id!==t.itemId)return e;
          
          
          
          
          
          
          let s=e.fullBottles*e.sizeML+e.looseML-t.ml;
          
          
          
          
          
          
          return s<0&&(s=0),       Object.assign(       {
            
            
            
            
            
            
            
          
          
          
          
          
          
          },       e,              {
            
            
            
            
            
            
            fullBottles:Math.floor(s/e.sizeML),       looseML:s%e.sizeML
          
          
          
          
          
          
          })
        
        
        
        
        
        
        });
        
        
        
        
        
        
        return Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          liquor:s,       sales:[t.sale,       ...e.sales]
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }
      
      case'LIQUOR_PURCHASE':       {
        
        
        
        
        
        
        const s=e.liquor.map(e=>e.id===t.itemId?Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          fullBottles:e.fullBottles+t.bottles
        
        
        
        
        
        
        }):e);
        
        
        
        
        
        
        return Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          liquor:s,       txns:t.txn?[t.txn,       ...e.txns]:e.txns
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }
      
      case'LIQUOR_AUDIT':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        liquorAudits:[t.audit,       ...e.liquorAudits]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'ADD_LIQUOR_ITEM':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        liquor:[t.item,       ...e.liquor]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'UPDATE_LIQUOR_ITEM':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        liquor:e.liquor.map(e=>e.id===t.item.id?t.item:e)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'REMOVE_LIQUOR_ITEM':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        liquor:e.liquor.filter(e=>e.id!==t.itemId)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'ADD_CREDIT_ACCOUNT':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        credits:[t.account,       ...e.credits]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'CREDIT_ENTRY':       {
        
        
        
        
        
        
        const s=e.credits.map(e=>       {
          
          
          
          
          
          
          if(e.id!==t.accountId)return e;
          
          
          
          
          
          
          const s='credit'===t.entry.kind?t.entry.amount:-t.entry.amount;
          
          
          
          
          
          
          return Object.assign(       {
            
            
            
            
            
            
            
          
          
          
          
          
          
          },       e,              {
            
            
            
            
            
            
            balance:Math.max(0,       e.balance+s),       history:[t.entry,       ...e.history]
          
          
          
          
          
          
          })
        
        
        
        
        
        
        });
        
        
        
        
        
        
        return Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          credits:s,       txns:t.cashEffect?[t.cashEffect,       ...e.txns]:e.txns
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }
      
      case'ADD_EMPLOYEE':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        employees:[t.emp,       ...e.employees]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'UPDATE_EMPLOYEE':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        employees:e.employees.map(e=>e.id===t.emp.id?t.emp:e)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'MARK_ATTENDANCE':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        employees:e.employees.map(e=>e.id===t.empId?Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          attendance:Object.assign(       {
            
            
            
            
            
            
            
          
          
          
          
          
          
          },       e.attendance,              {
            
            
            
            
            
            
            [t.day]:t.status
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }):e)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'BULK_ATTENDANCE':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        employees:e.employees.map(e=>t.empIds.includes(e.id)?Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          attendance:Object.assign(       {
            
            
            
            
            
            
            
          
          
          
          
          
          
          },       e.attendance,              {
            
            
            
            
            
            
            [t.day]:t.status
          
          
          
          
          
          
          })
        
        
        
        
        
        
        }):e)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'ADD_ADVANCE':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        employees:e.employees.map(e=>e.id===t.empId?Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          advances:[       {
            
            
            
            
            
            
            id:(0,       r.uid)(),       date:t.txn.date,       amount:t.amount
          
          
          
          
          
          
          },       ...e.advances]
        
        
        
        
        
        
        }):e),       txns:[t.txn,       ...e.txns]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'REQUEST_LEAVE':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        leaves:[t.leave,       ...e.leaves]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'DECIDE_LEAVE':       {
        
        
        
        
        
        
        const s=e.leaves.find(e=>e.id===t.leaveId);
        
        
        
        
        
        
        let n=e.employees;
        
        
        
        
        
        
        return s&&'approved'===t.status&&(n=e.employees.map(e=>       {
          
          
          
          
          
          
          if(e.id!==s.empId)return e;
          
          
          
          
          
          
          const t=Object.assign(       {
            
            
            
            
            
            
            
          
          
          
          
          
          
          },       e.attendance),       n=new Date(s.from+'T12:00:00'),       a=new Date(s.to+'T12:00:00');
          
          
          
          
          
          
          let r=0;
          
          
          
          
          
          
          for(;
          
          
          
          
          
          
          n<=a&&r<62;
          
          
          
          
          
          
          )       {
            
            
            
            
            
            
            t[`${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,'0')}-${String(n.getDate()).padStart(2,'0')}`]='L',       n.setDate(n.getDate()+1),       r++
          
          
          
          
          
          
          }
          const o=Object.assign(       {
            
            
            
            
            
            
            
          
          
          
          
          
          
          },       e.leaveBalance);
          
          
          
          
          
          
          return'casual'===s.type&&(o.casual=Math.max(0,       o.casual-s.days)),       'sick'===s.type&&(o.sick=Math.max(0,       o.sick-s.days)),       Object.assign(       {
            
            
            
            
            
            
            
          
          
          
          
          
          
          },       e,              {
            
            
            
            
            
            
            attendance:t,       leaveBalance:o
          
          
          
          
          
          
          })
        
        
        
        
        
        
        })),       Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          employees:n,       leaves:e.leaves.map(e=>e.id===t.leaveId?Object.assign(       {
            
            
            
            
            
            
            
          
          
          
          
          
          
          },       e,              {
            
            
            
            
            
            
            status:t.status
          
          
          
          
          
          
          }):e)
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }
      
      case'ADD_REVIEW':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        employees:e.employees.map(e=>e.id===t.empId?Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          reviews:[t.review,       ...e.reviews]
        
        
        
        
        
        
        }):e)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'ADD_EMP_DOC':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        employees:e.employees.map(e=>e.id===t.empId?Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          documents:[t.doc,       ...e.documents]
        
        
        
        
        
        
        }):e)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'REMOVE_EMP_DOC':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        employees:e.employees.map(e=>e.id===t.empId?Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e,              {
          
          
          
          
          
          
          documents:e.documents.filter(e=>e.id!==t.docId)
        
        
        
        
        
        
        }):e)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'ADD_ANNOUNCEMENT':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        announcements:[t.announcement,       ...e.announcements]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'REMOVE_ANNOUNCEMENT':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        announcements:e.announcements.filter(e=>e.id!==t.id)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'SET_PIN':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        settings:Object.assign(       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        },       e.settings,              {
          
          
          
          
          
          
          pin:t.pin
        
        
        
        
        
        
        })
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'ADD_USER':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        users:[...e.users,       t.user]
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'UPDATE_USER':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        users:e.users.map(e=>e.id===t.user.id?t.user:e)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'REMOVE_USER':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        users:e.users.filter(e=>e.id!==t.userId)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'AUDIT':return Object.assign(       {
        
        
        
        
        
        
        
      
      
      
      
      
      
      },       e,              {
        
        
        
        
        
        
        auditLog:[t.event,       ...e.auditLog].slice(0,       500)
      
      
      
      
      
      
      });
      
      
      
      
      
      
      case'RESET_DEMO':return(0,       a.buildSeed)();
      
      
      
      
      
      
      default:return e
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }
  
  
  const u=Object.assign(       {
    
    
    
    
    
    
    
  
  
  
  
  
  
  },       (0,       a.buildSeed)(),              {
    
    
    
    
    
    
    ready:!1
  
  
  
  
  
  
  }),       d=(0,       t.createContext)(       {
    
    
    
    
    
    
    state:u,       dispatch:()=>       {
      
      
      
      
      
      
      
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  const l=()=>(0,       t.useContext)(d);
  
  
  
  
  
  
  const m=e=>e.credits.filter(e=>'customer'===e.type).reduce((e,       t)=>e+t.balance,       0),       p=e=>e.credits.filter(e=>'vendor'===e.type).reduce((e,       t)=>e+t.balance,       0),       b=e=>e.inventory.filter(e=>e.stock<=e.reorder),       f=e=>       {
    
    
    
    
    
    
    const t=e.rooms.filter(e=>'occupied'===e.status).length;
    
    
    
    
    
    
    return       {
      
      
      
      
      
      
      occupied:t,       total:e.rooms.length,       pct:e.rooms.length?Math.round(t/e.rooms.length*100):0
    
    
    
    
    
    
    }
  
  
  
  
  
  
  },       O=e=>e.liquor.reduce((e,       t)=>e+(t.fullBottles+t.looseML/t.sizeML)*t.costPerBottle,       0),       y=e=>e.inventory.reduce((e,       t)=>e+t.stock*t.cost,       0)






},       853,       [51,       854,       858,       859,       229])