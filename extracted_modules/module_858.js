__d(function(g,       _r,       _i,       _a,       m,       _e,       _d)       {
  
  
  
  
  
  
  "use strict";
  
  
  
  
  
  
  Object.defineProperty(_e,       '__esModule',              {
    
    
    
    
    
    
    value:!0
  
  
  
  
  
  
  }),       _e.buildSeed=function()       {
    
    
    
    
    
    
    t=42;
    
    
    
    
    
    
    const d='bank-hdfc',       r=[],       s=[],       c=['Lunch meals x12',       'Biriyani orders',       'Dinner service',       'Breakfast + tea',       'Family lunch party',       'Evening snacks & tea'],       u=['Bar counter sales',       'Peg sales - evening',       'Beer & pegs',       'Bar table service'],       l=['Parcel biriyani',       'Takeaway meals',       'Parcel counter'],       p=['Swiggy orders',       'Zomato orders'],       h=['cash',       'cash',       'cash',       'upi',       'upi',       'card'];
    
    
    
    
    
    
    for(let t=34;
    
    
    
    
    
    
    t>=0;
    
    
    
    
    
    
    t--)       {
      
      
      
      
      
      
      const y=new Date(Date.now()-864e5*t).getDay()%6==0?1.35:1,       k=0===t?2:o(2,       3);
      
      
      
      
      
      
      for(let a=0;
      
      
      
      
      
      
      a<k;
      
      
      
      
      
      
      a++)       {
        
        
        
        
        
        
        const d=o(2200,       5200)*y,       s=Math.round(d),       u=Math.round(.05*s);
        
        
        
        
        
        
        r.push(       {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(t,       9+4*a,       o(0,       55)),       dept:'restaurant',       description:n(c),       amount:s,       gstRate:5,       gstAmount:u,       total:s+u,       mode:n(h),       billNo:`R${3400+7*t+a}`
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }
      
      const v=0===t?1:2;
      
      
      
      
      
      
      for(let a=0;
      
      
      
      
      
      
      a<v;
      
      
      
      
      
      
      a++)       {
        
        
        
        
        
        
        const d=Math.round(o(3e3,       7200)*y);
        
        
        
        
        
        
        r.push(       {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(t,       17+3*a,       o(0,       55)),       dept:'bar',       description:n(u),       amount:d,       gstRate:0,       gstAmount:0,       total:d,       mode:n(['cash',       'cash',       'upi']),       billNo:`B${2100+4*t+a}`
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }
      
      if(a()>.25)       {
        
        
        
        
        
        
        const a=o(700,       2100),       d=Math.round(.05*a);
        
        
        
        
        
        
        r.push(       {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(t,       13,       o(0,       55)),       dept:'takeaway',       description:n(l),       amount:a,       gstRate:5,       gstAmount:d,       total:a+d,       mode:n(h)
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }
      
      if(a()>.35)       {
        
        
        
        
        
        
        const a=o(600,       1900),       d=Math.round(.05*a);
        
        
        
        
        
        
        r.push(       {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(t,       20,       o(0,       55)),       dept:'online',       description:n(p),       amount:a,       gstRate:5,       gstAmount:d,       total:a+d,       mode:'bank'
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }
      
      if(a()>.3&&t>0)       {
        
        
        
        
        
        
        const a=o(1,       3),       d=n([1200,       1800,       2800])*a,       s=Math.round(.05*d);
        
        
        
        
        
        
        r.push(       {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(t,       11,       o(0,       40)),       dept:'rooms',       description:`Room checkout \xb7 ${a}N`,       amount:d,       gstRate:5,       gstAmount:s,       total:d+s,       mode:n(['cash',       'upi',       'card'])
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }
      
      const b=[['Provisions',       'Vegetables & provisions - market',       800,       2600],       ['Meat & Fish',       'Chicken / fish purchase',       1200,       3500],       ['LPG & Fuel',       'Commercial LPG cylinder',       0,       0],       ['Electricity',       'KSEB bill',       0,       0],       ['Maintenance',       'Plumbing / repairs',       300,       1500],       ['Staff Welfare',       'Staff tea & food',       150,       450]],       f=[b[0],       b[1]];
      
      
      
      
      
      
      a()>.6&&f.push(b[4]),       a()>.7&&f.push(b[5]),       f.forEach((n,       r)=>       {
        
        
        
        
        
        
        0!==n[3]&&s.push(       {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(t,       8+2*r,       o(0,       50)),       kind:'expense',       category:n[0],       description:n[1],       amount:o(n[2],       n[3]),       mode:a()>.75?'bank':'cash',       bankId:d,       hasBill:a()>.4
        
        
        
        
        
        
        })
      
      
      
      
      
      
      }),       t%12==3&&s.push(       {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(t,       10),       kind:'expense',       category:'LPG & Fuel',       description:'Commercial LPG cylinder x2',       amount:3800,       mode:'cash',       hasBill:!0
      
      
      
      
      
      
      }),       20===t&&s.push(       {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(t,       10),       kind:'expense',       category:'Electricity',       description:'KSEB bi-monthly bill',       amount:18450,       mode:'bank',       bankId:d,       hasBill:!0
      
      
      
      
      
      
      }),       15===t&&s.push(       {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(t,       11),       kind:'expense',       category:'Liquor Purchase',       description:'BEVCO invoice #KL8821 \xb7 24 bottles',       amount:28600,       mode:'bank',       bankId:d,       hasBill:!0
      
      
      
      
      
      
      }),       28===t&&s.push(       {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(t,       11),       kind:'expense',       category:'Salaries',       description:'Staff salaries - monthly',       amount:96500,       mode:'bank',       bankId:d
      
      
      
      
      
      
      }),       6===t&&s.push(       {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(t,       12),       kind:'income',       category:'Other Income',       description:'Function hall advance - Nair family',       amount:5e3,       mode:'cash'
      
      
      
      
      
      
      })
    
    
    
    
    
    
    }
    
    (0,       e.dateKey)(),       (0,       e.dateKey)(new Date(Date.now()-864e5));
    
    
    
    
    
    
    return       {
      
      
      
      
      
      
      ready:!0,       users:[       {
        
        
        
        
        
        
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
      
      
      
      
      
      
      }],       auditLog:[],       sales:r,       txns:s,       bankMoves:[       {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(8,       16),       kind:'deposit',       amount:25e3,       bankId:d,       note:'Weekly cash deposit'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(3,       16),       kind:'deposit',       amount:3e4,       bankId:d,       note:'Cash deposit'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(12,       11),       kind:'withdraw',       amount:1e4,       bankId:'bank-sbi',       note:'Petty cash withdrawal'
      
      
      
      
      
      
      }],       rooms:[       {
        
        
        
        
        
        
        id:'r101',       no:'101',       category:'Standard Non-AC',       rate:1200,       status:'occupied',       guest:       {
          
          
          
          
          
          
          name:'Suresh Menon',       phone:'9847012345',       idProof:'Aadhaar 4432',       adults:2,       checkIn:i(1,       14),       advance:1e3
        
        
        
        
        
        
        }
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'r102',       no:'102',       category:'Standard Non-AC',       rate:1200,       status:'vacant'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'r103',       no:'103',       category:'Standard Non-AC',       rate:1200,       status:'cleaning'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'r104',       no:'104',       category:'Standard Non-AC',       rate:1200,       status:'vacant'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'r201',       no:'201',       category:'Deluxe AC',       rate:1800,       status:'occupied',       guest:       {
          
          
          
          
          
          
          name:'Anand Krishnan',       phone:'9995512340',       idProof:'DL KL-09',       adults:1,       checkIn:i(0,       10),       advance:1800
        
        
        
        
        
        
        }
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'r202',       no:'202',       category:'Deluxe AC',       rate:1800,       status:'vacant'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'r203',       no:'203',       category:'Deluxe AC',       rate:1800,       status:'occupied',       guest:       {
          
          
          
          
          
          
          name:'Fathima Rasheed',       phone:'9744887766',       idProof:'Aadhaar 8811',       adults:3,       checkIn:i(2,       12),       advance:2e3
        
        
        
        
        
        
        }
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'r204',       no:'204',       category:'Deluxe AC',       rate:1800,       status:'vacant'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'r301',       no:'301',       category:'Suite AC',       rate:2800,       status:'vacant'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'r302',       no:'302',       category:'Suite AC',       rate:2800,       status:'occupied',       guest:       {
          
          
          
          
          
          
          name:'Rajesh & family',       phone:'9633445566',       idProof:'Aadhaar 2210',       adults:4,       checkIn:i(1,       13),       advance:3e3
        
        
        
        
        
        
        }
      
      
      
      
      
      
      }],       stays:[       {
        
        
        
        
        
        
        id:(0,       e.uid)(),       roomNo:'201',       category:'Deluxe AC',       guestName:'Vipin Das',       phone:'9856012233',       checkIn:i(5,       13),       checkOut:i(3,       11),       nights:2,       amount:4032,       mode:'upi'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       roomNo:'104',       category:'Standard Non-AC',       guestName:'Mary Joseph',       phone:'9447110022',       checkIn:i(4,       15),       checkOut:i(2,       10),       nights:2,       amount:2688,       mode:'cash'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       roomNo:'301',       category:'Suite AC',       guestName:'Dr. Hameed',       phone:'9895667788',       checkIn:i(3,       12),       checkOut:i(1,       11),       nights:2,       amount:6272,       mode:'card'
      
      
      
      
      
      
      }],       inventory:[       {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Rice (Matta)',       category:'food',       unit:'kg',       stock:85,       reorder:50,       cost:55
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Chicken',       category:'food',       unit:'kg',       stock:12,       reorder:15,       cost:210
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Cooking Oil',       category:'food',       unit:'L',       stock:28,       reorder:20,       cost:140
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Onion',       category:'food',       unit:'kg',       stock:22,       reorder:25,       cost:38
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Coconut',       category:'food',       unit:'pc',       stock:60,       reorder:40,       cost:32
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Pepsi 750ml',       category:'softdrink',       unit:'btl',       stock:48,       reorder:24,       cost:35
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Soda 300ml',       category:'softdrink',       unit:'btl',       stock:96,       reorder:48,       cost:12
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Mineral Water 1L',       category:'softdrink',       unit:'btl',       stock:18,       reorder:36,       cost:15
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'LPG Cylinder 19kg',       category:'kitchen',       unit:'cyl',       stock:3,       reorder:2,       cost:1900
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Bath Towels',       category:'housekeeping',       unit:'pc',       stock:34,       reorder:20,       cost:180
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Bedsheets',       category:'housekeeping',       unit:'set',       stock:26,       reorder:15,       cost:420
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Toilet Soap',       category:'housekeeping',       unit:'pc',       stock:14,       reorder:30,       cost:8
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Phenyl 5L',       category:'consumable',       unit:'can',       stock:6,       reorder:4,       cost:260
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       name:'Tissue Rolls',       category:'consumable',       unit:'pc',       stock:40,       reorder:24,       cost:22
      
      
      
      
      
      
      }],       stockMoves:[       {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(1,       9),       itemId:'',       itemName:'Chicken',       kind:'in',       qty:20,       note:'Market purchase'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(0,       9),       itemId:'',       itemName:'Chicken',       kind:'out',       qty:8,       note:'Kitchen issue'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(0,       10),       itemId:'',       itemName:'Onion',       kind:'wastage',       qty:2,       note:'Spoiled stock'
      
      
      
      
      
      
      }],       liquor:[       {
        
        
        
        
        
        
        id:(0,       e.uid)(),       brand:"McDowell's No.1",       type:'Whisky',       sizeML:750,       fullBottles:14,       looseML:480,       costPerBottle:780,       pricePerPeg:140,       pricePerBottle:1450
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       brand:'Old Monk',       type:'Rum',       sizeML:750,       fullBottles:18,       looseML:300,       costPerBottle:520,       pricePerPeg:100,       pricePerBottle:980
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       brand:'Honey Bee',       type:'Brandy',       sizeML:750,       fullBottles:11,       looseML:620,       costPerBottle:560,       pricePerPeg:110,       pricePerBottle:1050
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       brand:'Magic Moments',       type:'Vodka',       sizeML:750,       fullBottles:6,       looseML:150,       costPerBottle:650,       pricePerPeg:120,       pricePerBottle:1200
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       brand:'Kingfisher Premium',       type:'Beer',       sizeML:650,       fullBottles:52,       looseML:0,       costPerBottle:130,       pricePerPeg:0,       pricePerBottle:220
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       brand:'Tuborg Strong',       type:'Beer',       sizeML:650,       fullBottles:8,       looseML:0,       costPerBottle:125,       pricePerPeg:0,       pricePerBottle:210
      
      
      
      
      
      
      }],       liquorAudits:[],       credits:[       {
        
        
        
        
        
        
        id:'c1',       name:'Basheer (Auto Stand)',       phone:'9847556677',       type:'customer',       balance:3450,       history:[       {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(9,       13),       kind:'credit',       amount:1850,       note:'Lunch parcels - stand'
        
        
        
        
        
        
        },              {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(4,       13),       kind:'credit',       amount:2600,       note:'Meals credit'
        
        
        
        
        
        
        },              {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(2,       18),       kind:'payment',       amount:1e3,       note:'Part payment - cash'
        
        
        
        
        
        
        }]
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'c2',       name:'PWD Site Contractor',       phone:'9995001122',       type:'customer',       balance:8200,       history:[       {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(12,       13),       kind:'credit',       amount:5200,       note:'Workers lunch - 15 days'
        
        
        
        
        
        
        },              {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(5,       13),       kind:'credit',       amount:3e3,       note:'Meals credit'
        
        
        
        
        
        
        }]
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'v1',       name:'Kerala Beverages Co (BEVCO)',       phone:'04662280000',       type:'vendor',       gstin:'32AABCK1234F1Z5',       balance:0,       history:[       {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(15,       11),       kind:'credit',       amount:28600,       note:'Invoice #KL8821'
        
        
        
        
        
        
        },              {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(15,       11),       kind:'payment',       amount:28600,       note:'Paid via bank'
        
        
        
        
        
        
        }]
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'v2',       name:'Palakkad Poultry Farm',       phone:'9447889900',       type:'vendor',       balance:12400,       history:[       {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(10,       9),       kind:'credit',       amount:8400,       note:'Chicken supply - weekly'
        
        
        
        
        
        
        },              {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(3,       9),       kind:'credit',       amount:6e3,       note:'Chicken supply'
        
        
        
        
        
        
        },              {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(1,       17),       kind:'payment',       amount:2e3,       note:'Part payment'
        
        
        
        
        
        
        }]
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'v3',       name:'Cherpulassery Provision Store',       phone:'9605334455',       type:'vendor',       gstin:'32AAGFC9988B1ZQ',       balance:5750,       history:[       {
          
          
          
          
          
          
          id:(0,       e.uid)(),       date:i(7,       10),       kind:'credit',       amount:5750,       note:'Monthly provisions bill'
        
        
        
        
        
        
        }]
      
      
      
      
      
      
      }],       employees:(()=>       {
        
        
        
        
        
        
        const t=t=>       {
          
          
          
          
          
          
          const n=       {
            
            
            
            
            
            
            
          
          
          
          
          
          
          };
          
          
          
          
          
          
          for(let o=20;
          
          
          
          
          
          
          o>=0;
          
          
          
          
          
          
          o--)       {
            
            
            
            
            
            
            const i=(0,       e.dateKey)(new Date(Date.now()-864e5*o)),       d=a();
            
            
            
            
            
            
            n[i]='good'===t?d>.94?'H':'P':'avg'===t?d>.9?'A':d>.82?'H':'P':d>.82?'A':d>.72?'H':'P'
          
          
          
          
          
          
          }
          return n
        
        
        
        
        
        
        },       n=       {
          
          
          
          
          
          
          status:'active',       leaveBalance:       {
            
            
            
            
            
            
            casual:6,       sick:6
          
          
          
          
          
          
          },       reviews:[],       documents:[]
        
        
        
        
        
        
        };
        
        
        
        
        
        
        return[Object.assign(       {
          
          
          
          
          
          
          id:'e-ravi',       name:'Ravi Kumar',       role:'Head Cook',       phone:'9847223344',       salary:22e3,       attendance:t('good'),       advances:[       {
            
            
            
            
            
            
            id:(0,       e.uid)(),       date:i(6,       12),       amount:3e3
          
          
          
          
          
          
          }]
        
        
        
        
        
        
        },       n,              {
          
          
          
          
          
          
          joinDate:'2019-04-01',       access:'staff',       reviews:[       {
            
            
            
            
            
            
            id:(0,       e.uid)(),       date:i(30,       10),       rating:5,       strengths:'Consistent food quality; leads the kitchen well during rush hours',       improvements:'Delegate prep work more to reduce overtime',       reviewer:'Rajan (Manager)'
          
          
          
          
          
          
          }]
        
        
        
        
        
        
        }),       Object.assign(       {
          
          
          
          
          
          
          id:'e-shaji',       name:'Shaji P',       role:'Cook',       phone:'9946112233',       salary:16e3,       attendance:t('good'),       advances:[]
        
        
        
        
        
        
        },       n,              {
          
          
          
          
          
          
          joinDate:'2021-08-15',       access:'staff'
        
        
        
        
        
        
        }),       Object.assign(       {
          
          
          
          
          
          
          id:'e-manoj',       name:'Manoj V',       role:'Bar Man',       phone:'9605998877',       salary:15e3,       attendance:t('avg'),       advances:[       {
            
            
            
            
            
            
            id:(0,       e.uid)(),       date:i(12,       12),       amount:2e3
          
          
          
          
          
          
          }]
        
        
        
        
        
        
        },       n,              {
          
          
          
          
          
          
          joinDate:'2020-11-01',       access:'staff',       reviews:[       {
            
            
            
            
            
            
            id:(0,       e.uid)(),       date:i(45,       10),       rating:4,       strengths:'Accurate stock handling, good with regulars',       improvements:'Evening billing speed',       reviewer:'Deepa (Owner)'
          
          
          
          
          
          
          }]
        
        
        
        
        
        
        }),       Object.assign(       {
          
          
          
          
          
          
          id:'e-bindhu',       name:'Bindhu K',       role:'Housekeeping',       phone:'9744001122',       salary:11e3,       attendance:t('avg'),       advances:[]
        
        
        
        
        
        
        },       n,              {
          
          
          
          
          
          
          joinDate:'2022-02-10',       access:'staff',       leaveBalance:       {
            
            
            
            
            
            
            casual:4,       sick:5
          
          
          
          
          
          
          }
        
        
        
        
        
        
        }),       Object.assign(       {
          
          
          
          
          
          
          id:'e-ajith',       name:'Ajith Kumar',       role:'Waiter',       phone:'9895443322',       salary:12e3,       attendance:t('poor'),       advances:[]
        
        
        
        
        
        
        },       n,              {
          
          
          
          
          
          
          joinDate:'2023-06-01',       access:'staff',       reviews:[       {
            
            
            
            
            
            
            id:(0,       e.uid)(),       date:i(20,       10),       rating:3,       strengths:'Friendly with customers',       improvements:'Punctuality - repeated late arrivals this quarter',       reviewer:'Rajan (Manager)'
          
          
          
          
          
          
          }]
        
        
        
        
        
        
        }),       Object.assign(       {
          
          
          
          
          
          
          id:'e-sreeja',       name:'Sreeja M',       role:'Reception',       phone:'9633778899',       salary:14e3,       attendance:t('good'),       advances:[]
        
        
        
        
        
        
        },       n,              {
          
          
          
          
          
          
          joinDate:'2020-01-20',       access:'manager'
        
        
        
        
        
        
        }),       Object.assign(       {
          
          
          
          
          
          
          id:'e-kannan',       name:'Kannan T',       role:'Cleaner',       phone:'9447665544',       salary:1e4,       attendance:t('avg'),       advances:[       {
            
            
            
            
            
            
            id:(0,       e.uid)(),       date:i(2,       12),       amount:1500
          
          
          
          
          
          
          }]
        
        
        
        
        
        
        },       n,              {
          
          
          
          
          
          
          joinDate:'2023-01-05',       access:'staff'
        
        
        
        
        
        
        })]
      
      
      
      
      
      
      })(),       leaves:[       {
        
        
        
        
        
        
        id:'lv1',       empId:'e-bindhu',       from:(0,       e.dateKey)(new Date(Date.now()+1728e5)),       to:(0,       e.dateKey)(new Date(Date.now()+2592e5)),       days:2,       type:'casual',       reason:'Daughter school admission',       status:'pending',       requestedOn:i(0,       9)
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'lv2',       empId:'e-ajith',       from:(0,       e.dateKey)(new Date(Date.now()+432e6)),       to:(0,       e.dateKey)(new Date(Date.now()+432e6)),       days:1,       type:'sick',       reason:'Dentist appointment',       status:'pending',       requestedOn:i(1,       15)
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'lv3',       empId:'e-shaji',       from:(0,       e.dateKey)(new Date(Date.now()-6912e5)),       to:(0,       e.dateKey)(new Date(Date.now()-6048e5)),       days:2,       type:'casual',       reason:'Family function at native place',       status:'approved',       requestedOn:i(12,       10)
      
      
      
      
      
      
      }],       announcements:[       {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(1,       9),       title:'Sabarimala season prep',       body:'Expect higher weekend occupancy from next week. Housekeeping to deep-clean all rooms by Friday; kitchen to stock extra provisions.',       priority:'important',       author:'Deepa (Owner)'
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:(0,       e.uid)(),       date:i(3,       17),       title:'Staff meal timing change',       body:'Staff dinner moved to 6:30 PM so counters stay covered during evening rush.',       priority:'normal',       author:'Rajan (Manager)'
      
      
      
      
      
      
      }],       banks:[       {
        
        
        
        
        
        
        id:'bank-hdfc',       name:'HDFC Bank \xb7 Current A/c',       accountNo:'XXXX 4521',       baseBalance:185e3
      
      
      
      
      
      
      },              {
        
        
        
        
        
        
        id:'bank-sbi',       name:'SBI \xb7 Savings A/c',       accountNo:'XXXX 8890',       baseBalance:92e3
      
      
      
      
      
      
      }],       settings:       {
        
        
        
        
        
        
        businessName:'Deepa Restaurant & Tourist Home',       place:'Cherpulassery, Palakkad',       gstin:'32AAXPD1234K1ZR',       openingCash:42e3,       pin:'1234',       defaultBankId:'bank-hdfc'
      
      
      
      
      
      
      }
    
    
    
    
    
    
    }
  
  
  
  
  
  
  };
  
  
  
  
  
  
  var e=_r(_d[0]);
  
  
  
  
  
  
  let t=42;
  
  
  
  
  
  
  const a=()=>(t=16807*t%2147483647,       t/2147483647),       n=e=>e[Math.floor(a()*e.length)],       o=(e,       t)=>Math.round(e+a()*(t-e)),       i=(e,       t,       a=0)=>       {
    
    
    
    
    
    
    const n=new Date;
    
    
    
    
    
    
    return n.setDate(n.getDate()-e),       n.setHours(t,       a,       0,       0),       n.toISOString()
  
  
  
  
  
  
  }






},       858,       [859])