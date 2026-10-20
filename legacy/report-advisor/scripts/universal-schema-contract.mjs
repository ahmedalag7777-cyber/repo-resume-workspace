const aliases={
  'رقم الصنف':['رقم الصنف','sku','item code','item_code','product code','كود الصنف'],
  'اسم الصنف':['اسم الصنف','item name','product name','name'],
  'الوحدة':['الوحدة','unit','uom'],
  'المخزن':['المخزن','warehouse','store'],
  'التاريخ':['التاريخ','date','transaction date','تاريخ الحركة'],
  'مدين':['مدين','debit','debits'],
  'دائن':['دائن','credit','credits'],
  'الرصيد':['الرصيد','balance','closing balance']
};
function norm(v){return String(v??'').trim().toLowerCase().replace(/[\s_\-]+/g,' ');}
export function detectSchema(headers=[]){const mapping={};const unmatched=[];for(const h of headers){const n=norm(h);let found=null;for(const [canonical,terms] of Object.entries(aliases)){if(terms.some(t=>norm(t)===n)){found=canonical;break;}}if(found)mapping[h]=found;else unmatched.push(h);}const mapped=Object.keys(mapping).length;const confidence=headers.length?mapped/headers.length:0;return{mapping,unmatched,confidence};}
export function shouldQuarantine({confidence,unmatched,threshold=.6}){return confidence<threshold||unmatched.length>Math.max(3,Math.ceil((unmatched.length+1)*.5));}
