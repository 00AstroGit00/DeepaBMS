__d(function(g,    _r,    i,    _a,    m,    _e,    d)    {
  
  
  
  "use strict";
  
  
  
  Object.defineProperty(_e,    '__esModule',        {
    
    
    
    value:!0
  
  
  
  }),    _e.computePayroll=function(a,    t,    s)    {
    
    
    
    return a.filter(e=>'active'===e.status).map(a=>    {
      
      
      
      let n=0,    r=0,    o=0,    c=0,    u=0;
      
      
      
      for(const[e,    l]of Object.entries(a.attendance))if(e.startsWith(s))if('P'===l)n++;
      
      
      
      else if('H'===l)r++;
      
      
      
      else if('A'===l)o++;
      
      
      
      else if('L'===l)    {
        
        
        
        c++;
        
        
        
        const s=t.find(t=>t.empId===a.id&&'approved'===t.status&&t.from<=e&&e<=t.to);
        
        
        
        s&&'unpaid'===s.type&&u++
      
      
      
      }
      
      const l=a.salary/26,    f=a.advances.filter(a=>(0,    e.keyOf)(a.date).startsWith(s)).reduce((e,    a)=>e+a.amount,    0),    y=Math.round(l*(o+u)+l/2*r),    p=Math.max(0,    Math.round(a.salary-f-y));
      
      
      
      return    {
        
        
        
        empId:a.id,    name:a.name,    role:a.role,    salary:a.salary,    presentDays:n,    halfDays:r,    absentDays:o,    leaveDays:c,    unpaidLeaveDays:u,    advances:f,    deductions:y,    net:p
      
      
      
      }
    
    
    
    })
  
  
  
  },    Object.defineProperty(_e,    "payrollTotals",        {
    
    
    
    enumerable:!0,    get:function()    {
      
      
      
      return a
    
    
    
    }
  
  
  
  });
  
  
  
  var e=_r(d[0]);
  
  
  
  const a=e=>(    {
    
    
    
    gross:e.reduce((e,    a)=>e+a.salary,    0),    advances:e.reduce((e,    a)=>e+a.advances,    0),    deductions:e.reduce((e,    a)=>e+a.deductions,    0),    net:e.reduce((e,    a)=>e+a.net,    0)
  
  
  
  })



},    953,    [859])