export const corpus=[
{id:'exchange-arabic',kind:'exchange_statement',source:'pdf',expect:'PASS',features:['arabic_numbers','debit_credit','balance','currency']},
{id:'exchange-ocr',kind:'exchange_statement',source:'scanned_pdf',expect:'REVIEW',features:['ocr','arabic_numbers','layout']},
{id:'inventory-excel',kind:'inventory',source:'xlsx',expect:'PASS',features:['sku','quantity','price','arabic_headers']},
{id:'unknown-layout',kind:'unknown',source:'pdf',expect:'REVIEW',features:['headerless','semantic_inference']},
{id:'corrupt-extraction',kind:'unknown',source:'binary',expect:'QUARANTINE',features:['empty_text','no_reliable_extractor']},
{id:'arithmetic-mismatch',kind:'sales',source:'xlsx',expect:'QUARANTINE',features:['qty_price_total_mismatch']},
{id:'reconciliation-mismatch',kind:'ledger',source:'pdf',expect:'QUARANTINE',features:['opening_debit_credit_balance']}
];
export function getCorpus(){return corpus.map(x=>({...x,requiredGates:['extraction','fidelity','quality','schema','mapping','semantic','arithmetic','reconciliation','evidence']}));}
