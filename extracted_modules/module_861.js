__d(function(g,       r,       i,       a,       m,       e,       d)       {
  
  
  
  
  
  
  "use strict";
  
  
  
  
  
  
  Object.defineProperty(e,       '__esModule',              {
    
    
    
    
    
    
    value:!0
  
  
  
  
  
  
  }),       Object.defineProperty(e,       "ROLE_INFO",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return o
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       Object.defineProperty(e,       "DEFAULT_USERS",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return s
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       Object.defineProperty(e,       "hasPerm",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return c
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       e.AuthProvider=function(       {
    
    
    
    
    
    
    children:o
  
  
  
  
  
  
  })       {
    
    
    
    
    
    
    const[s,       u]=(0,       n.useState)(null);
    
    
    
    
    
    
    return(0,       t.jsx)(l.Provider,              {
      
      
      
      
      
      
      value:       {
        
        
        
        
        
        
        currentUser:s,       login:u,       logout:()=>u(null),       can:n=>c(s,       n)
      
      
      
      
      
      
      },       children:o
    
    
    
    
    
    
    })
  
  
  
  
  
  
  },       Object.defineProperty(e,       "useAuth",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return u
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var n=r(d[0]),       t=r(d[1]);
  
  
  
  
  
  
  const o=       {
    
    
    
    
    
    
    owner:       {
      
      
      
      
      
      
      label:'Owner',       desc:'Full access to every module and user management',       perms:['dashboard',       'daybook',       'sales',       'hotel',       'bar',       'inventory',       'credits',       'banking',       'employees',       'reports',       'users',       'settings']
    
    
    
    
    
    
    },       manager:       {
      
      
      
      
      
      
      label:'Manager',       desc:'Runs daily operations - everything except user management',       perms:['dashboard',       'daybook',       'sales',       'hotel',       'bar',       'inventory',       'credits',       'banking',       'employees',       'reports',       'settings']
    
    
    
    
    
    
    },       cashier:       {
      
      
      
      
      
      
      label:'Cashier (Billing Counter)',       desc:'Records sales and day book entries; no P&L or bank visibility',       perms:['daybook',       'sales']
    
    
    
    
    
    
    },       reception:       {
      
      
      
      
      
      
      label:'Receptionist',       desc:'Hotel check-in/out, guest register and room sales',       perms:['hotel',       'sales']
    
    
    
    
    
    
    },       fnb:       {
      
      
      
      
      
      
      label:'F&B Manager',       desc:'Restaurant sales, food inventory and customer credits',       perms:['sales',       'inventory',       'credits']
    
    
    
    
    
    
    },       barstaff:       {
      
      
      
      
      
      
      label:'Bar Counter Staff',       desc:'Bar sales, liquor stock and audits only',       perms:['bar']
    
    
    
    
    
    
    },       accountant:       {
      
      
      
      
      
      
      label:'Accountant',       desc:'Read/verify money flows: day book, banking, credits, reports',       perms:['dashboard',       'daybook',       'credits',       'banking',       'reports']
    
    
    
    
    
    
    }
  
  
  
  
  
  
  },       s=[       {
    
    
    
    
    
    
    id:'u-owner',       name:'Deepa (Owner)',       role:'owner',       pin:'1234',       active:!0,       createdAt:(new Date).toISOString()
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    id:'u-manager',       name:'Rajan (Manager)',       role:'manager',       pin:'2345',       active:!0,       createdAt:(new Date).toISOString()
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    id:'u-cashier',       name:'Sreeja (Cashier)',       role:'cashier',       pin:'3456',       active:!0,       createdAt:(new Date).toISOString()
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    id:'u-reception',       name:'Anitha (Reception)',       role:'reception',       pin:'4567',       active:!0,       createdAt:(new Date).toISOString()
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    id:'u-fnb',       name:'Vinod (F&B Manager)',       role:'fnb',       pin:'5678',       active:!0,       createdAt:(new Date).toISOString()
  
  
  
  
  
  
  },              {
    
    
    
    
    
    
    id:'u-bar',       name:'Manoj (Bar Counter)',       role:'barstaff',       pin:'6789',       active:!0,       createdAt:(new Date).toISOString()
  
  
  
  
  
  
  }],       c=(n,       t)=>!!n&&o[n.role].perms.includes(t),       l=(0,       n.createContext)(       {
    
    
    
    
    
    
    currentUser:null,       login:()=>       {
      
      
      
      
      
      
      
    
    
    
    
    
    
    },       logout:()=>       {
      
      
      
      
      
      
      
    
    
    
    
    
    
    },       can:()=>!1
  
  
  
  
  
  
  });
  
  
  
  
  
  
  const u=()=>(0,       n.useContext)(l)






},       861,       [51,       229])