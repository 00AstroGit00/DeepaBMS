__d(function(g,       r,       i,       a,       m,       e,       d)       {
  
  
  
  
  
  
  "use strict";
  
  
  
  
  
  
  Object.defineProperty(e,       '__esModule',              {
    
    
    
    
    
    
    value:!0
  
  
  
  
  
  
  }),       e.setupPWA=function()       {
    
    
    
    
    
    
    if('undefined'==typeof document)return;
    
    
    
    
    
    
    try       {
      
      
      
      
      
      
      if(document.title='Deepa BMS \xb7 Business Management',       !document.querySelector('link[rel="manifest"]'))       {
        
        
        
        
        
        
        const t=document.createElement('link');
        
        
        
        
        
        
        t.rel='manifest',       t.href='/manifest.json',       document.head.appendChild(t)
      
      
      
      
      
      
      }
      
      if(!document.querySelector('meta[name="theme-color"]'))       {
        
        
        
        
        
        
        const t=document.createElement('meta');
        
        
        
        
        
        
        t.name='theme-color',       t.content='#8B2E2E',       document.head.appendChild(t)
      
      
      
      
      
      
      }
      
      'serviceWorker'in navigator&&window.addEventListener('load',       ()=>       {
        
        
        
        
        
        
        navigator.serviceWorker.register('/sw.js').catch(()=>       {
          
          
          
          
          
          
          
        
        
        
        
        
        
        })
      
      
      
      
      
      
      })
    
    
    
    
    
    
    }catch       {
      
      
      
      
      
      
      
    
    
    
    
    
    
    }
  
  
  
  
  
  
  },       r(d[0])






},       958,       [1095])