export const goldenScenarios={
  onyx_inventory:{required:['رقم الصنف','اسم الصنف','الوحدة','المخزن','الرصيد الحالي'],invariants:['sku-stability','quantity-numeric','no-silent-zero']},
  exchange_statement:{required:['التاريخ','مدين','دائن','الرصيد'],invariants:['debit-credit-exclusive','balance-continuity','currency-isolation']},
  unknown_schema:{required:[],invariants:['schema-discovery','confidence-required','quarantine-on-ambiguity']},
  corrupt_document:{required:[],invariants:['safe-failure','no-partial-write','evidence-required']}
};
export function evaluateGoldenScenario(id,actual={}){const spec=goldenScenarios[id];if(!spec)return{approved:false,reason:'unknown-scenario'};const missing=spec.required.filter(x=>!actual.fields?.includes(x));const failed=spec.invariants.filter(x=>actual.invariants?.[x]!==true);return{approved:missing.length===0&&failed.length===0,missing,failed};}
