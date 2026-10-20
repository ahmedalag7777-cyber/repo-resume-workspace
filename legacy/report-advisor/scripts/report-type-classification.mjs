const profiles={
 inventory:{signals:['رصيد','المخزن','warehouse','quantity','كمية','متوسط التكلفة'],required:['item','inventory']},
 sales:{signals:['المبيعات','sales','صافي المبيعات','الكمية المباعة','gross profit','إجمالي الربح'],required:['item','sales']},
 purchases:{signals:['المشتريات','purchases','المورد','supplier','invoice','فاتورة'],required:['supplier','purchases']},
 exchange_statement:{signals:['مدين','دائن','الرصيد','debit','credit','balance','عملة','currency'],required:['debit','credit','balance']},
 customer_ledger:{signals:['العميل','customer','المبلغ المحصل','الرصيد','آخر تاريخ سداد'],required:['customer','balance']},
 transfer:{signals:['التحويل','transfer','المستودع المحول منه','المستودع المحول إليه'],required:['transfer']},
 profit_loss:{signals:['الأرباح','الخسائر','profit','loss','الحركة المدينة','الحركة الدائنة'],required:['profit','loss']}
};
const n=v=>String(v??'').trim().toLowerCase();
export function classifyReport({headers=[],sampleValues=[]}){const text=[...headers,...sampleValues.flat?.()??[]].map(n).join(' ');const scores=Object.fromEntries(Object.entries(profiles).map(([type,p])=>[type,p.signals.reduce((s,x)=>s+(text.includes(n(x))?1:0),0)]));const ranked=Object.entries(scores).sort((a,b)=>b[1]-a[1]);const best=ranked[0]??['unknown',0];const second=ranked[1]?.[1]??0;const total=Math.max(1,profiles[best[0]]?.signals.length??1);const confidence=Math.min(1,(best[1]/total)*.8+(best[1]>second?.0:.0));return{type:best[1]===0?'unknown':best[0],confidence,ranking:ranked};}
export function requireReportTypeConfidence(result,threshold=.55){return{accepted:result.type!=='unknown'&&result.confidence>=threshold,quarantine:result.type==='unknown'||result.confidence<threshold};}
