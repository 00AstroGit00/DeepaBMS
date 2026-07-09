__d(function(g,     r,     _i,     _a,     m,     _e,     _d)     {
  
  
  
  
  "use strict";
  
  
  
  
  function e(e)     {
    
    
    
    
    if(e&&e.__esModule)return e;
    
    
    
    
    var t=     {
      
      
      
      
      
    
    
    
    
    };
    
    
    
    
    return e&&Object.keys(e).forEach(function(n)     {
      
      
      
      
      var a=Object.getOwnPropertyDescriptor(e,     n);
      
      
      
      
      Object.defineProperty(t,     n,     a.get?a:     {
        
        
        
        
        enumerable:!0,     get:function()     {
          
          
          
          
          return e[n]
        
        
        
        
        }
      
      
      
      
      })
    
    
    
    
    }),     t.default=e,     t
  
  
  
  
  }
  
  
  Object.defineProperty(_e,     '__esModule',          {
    
    
    
    
    value:!0
  
  
  
  
  }),     _e.warnUser=o,     _e.captureBillPhoto=async function()     {
    
    
    
    
    return c()
  
  
  
  
  },     _e.pickBillImage=c,     _e.pickBillDocument=async function()     {
    
    
    
    
    const e=await n.getDocumentAsync(     {
      
      
      
      
      type:['application/pdf',     'image/*'],     copyToCacheDirectory:!0,     multiple:!1
    
    
    
    
    });
    
    
    
    
    if(e.canceled||!e.assets?.length)return null;
    
    
    
    
    const t=e.assets[0];
    
    
    
    
    if((t.size||0)>a)return o('File Too Large',     'Maximum attachment size is 1.5 MB. Please attach a compressed scan.'),     null;
    
    
    
    
    let s=t.uri;
    
    
    
    
    const c=(t.mimeType||'').includes('pdf')||t.name.toLowerCase().endsWith('.pdf');
    
    
    
    
    return     {
      
      
      
      
      id:i(),     name:t.name,     kind:c?'pdf':'image',     uri:s,     size:t.size
    
    
    
    
    }
  
  
  
  
  },     r(_d[0]),     r(_d[1]);
  
  
  
  
  var t=e(r(_d[2])),     n=e(r(_d[3]));
  
  
  
  
  const a=1572864,     i=()=>Math.random().toString(36).slice(2,     10)+Date.now().toString(36).slice(-4);
  
  
  
  
  function s(e)     {
    
    
    
    
    const t=e.indexOf('base64,');
    
    
    
    
    return t<0?e.length:Math.floor(3*(e.length-t-7)/4)
  
  
  
  
  }
  
  
  function o(e,     t)     {
    
    
    
    
    window.alert(`${e}\n\n${t}`)
  
  
  
  
  }
  
  
  async function c()     {
    
    
    
    
    return l(await t.launchImageLibraryAsync(     {
      
      
      
      
      mediaTypes:['images'],     quality:.35,     base64:!0
    
    
    
    
    }))
  
  
  
  
  }
  
  
  function l(e)     {
    
    
    
    
    if(e.canceled||!e.assets?.length)return null;
    
    
    
    
    const t=e.assets[0];
    
    
    
    
    let n=t.uri;
    
    
    
    
    if(t.base64&&(n=`data:${t.mimeType||'image/jpeg'};base64,${t.base64}`),     s(n)>a)return o('Image Too Large',     'Please attach a smaller photo (bill photos compress automatically; very large originals are rejected to protect storage).'),     null;
    
    
    
    
    const c=t.fileName||`bill-${(new Date).toISOString().slice(0,10)}.jpg`;
    
    
    
    
    return     {
      
      
      
      
      id:i(),     name:c,     kind:'image',     uri:n,     size:s(n)
    
    
    
    
    }
  
  
  
  
  }




},     921,     [1095,     1298,     922,     926])