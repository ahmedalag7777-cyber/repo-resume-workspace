import assert from 'node:assert/strict';
const arabic='٠١٢٣٤٥٦٧٨٩', latin='0123456789';
const normalize=s=>{s=s.normalize('NFKC').trim().replace(/[إأآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g,'').replace(/ـ/g,'');for(let i=0;i<10;i++)s=s.replace(new RegExp(arabic[i],'g'),latin[i]);return s.replace(/\s+/g,' ').trim()};
const percent=s=>Number(normalize(s).replace(/[%٪]/g,''))/100;
for(const [x,y] of [['25%',.25],['٢٥٪',.25],['-12.5%',-.125]])assert.equal(percent(x),y);
assert.equal(normalize('إختبار ١٢'),'اختبار 12');
console.log('document intelligence normalization regression: PASS');
