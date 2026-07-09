__d(function(g,       r,       i,       a,       m,       e,       _d)       {
  
  
  
  
  
  
  "use strict";
  
  
  
  
  
  
  Object.defineProperty(e,       '__esModule',              {
    
    
    
    
    
    
    value:!0
  
  
  
  
  
  
  }),       Object.defineProperty(e,       "lightTheme",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return E
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       Object.defineProperty(e,       "darkTheme",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return n
    
    
    
    
    
    
    }
  
  
  
  
  
  
  }),       e.ThemeProvider=function(       {
    
    
    
    
    
    
    children:F
  
  
  
  
  
  
  })       {
    
    
    
    
    
    
    const[f,       l]=(0,       t.useState)(!1);
    
    
    
    
    
    
    return(0,       o.jsx)(u.Provider,              {
      
      
      
      
      
      
      value:       {
        
        
        
        
        
        
        theme:f?n:E,       toggle:()=>l(t=>!t)
      
      
      
      
      
      
      },       children:F
    
    
    
    
    
    
    })
  
  
  
  
  
  
  },       Object.defineProperty(e,       "useTheme",              {
    
    
    
    
    
    
    enumerable:!0,       get:function()       {
      
      
      
      
      
      
      return F
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  var t=r(_d[0]),       o=r(_d[1]);
  
  
  
  
  
  
  const E=       {
    
    
    
    
    
    
    dark:!1,       bg:'#F4F2EE',       card:'#FFFFFF',       cardAlt:'#FAF8F5',       border:'#E8E4DD',       text:'#1C1917',       sub:'#6B6459',       faint:'#A39B8E',       primary:'#8B2E2E',       primarySoft:'#F7E8E6',       green:'#1E7E4E',       greenSoft:'#E3F3EA',       red:'#C43A3A',       redSoft:'#FBE9E9',       amber:'#B07414',       amberSoft:'#FBF0DC',       blue:'#2B5FA8',       blueSoft:'#E5EDF9',       purple:'#6B4BA3',       purpleSoft:'#EFE9F8',       teal:'#0E7A74',       tealSoft:'#E0F2F1'
  
  
  
  
  
  
  },       n=       {
    
    
    
    
    
    
    dark:!0,       bg:'#141210',       card:'#1F1C19',       cardAlt:'#26221E',       border:'#332E28',       text:'#F0EBE3',       sub:'#A89F92',       faint:'#6E675C',       primary:'#E07856',       primarySoft:'#3A2521',       green:'#4FBF87',       greenSoft:'#1B322A',       red:'#E66A6A',       redSoft:'#3A2222',       amber:'#E0A94E',       amberSoft:'#38301F',       blue:'#6D9EE0',       blueSoft:'#20293A',       purple:'#A98BE0',       purpleSoft:'#2C2438',       teal:'#4EC2BA',       tealSoft:'#1B3230'
  
  
  
  
  
  
  },       u=(0,       t.createContext)(       {
    
    
    
    
    
    
    theme:E,       toggle:()=>       {
      
      
      
      
      
      
      
    
    
    
    
    
    
    }
  
  
  
  
  
  
  });
  
  
  
  
  
  
  const F=()=>(0,       t.useContext)(u)






},       860,       [51,       229])