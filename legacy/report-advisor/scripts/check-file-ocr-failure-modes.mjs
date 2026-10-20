import assert from 'node:assert/strict';

const ALLOWED=['pdf','docx','image'];
function ingest(input){
  assert.ok(input?.tenant_id,'TENANT_REQUIRED');
  assert.ok(input?.name,'FILE_NAME_REQUIRED');
  assert(ALLOWED.includes(input.type),'UNSUPPORTED_FILE_TYPE');
  assert.ok(input.size>0,'EMPTY_FILE');
  assert.ok(input.hash,'CONTENT_HASH_REQUIRED');
  return {...input,status:'INGESTED'};
}
function extract(file,result){
  assert.equal(file.status,'INGESTED','INGESTION_REQUIRED');
  assert.ok(result?.engine,'EXTRACTION_ENGINE_REQUIRED');
  assert.ok(result.text || result.pages>0,'EXTRACTION_EMPTY');
  if(result.ocr && !result.language) throw new Error('OCR_LANGUAGE_REQUIRED');
  return {...file,status:'EXTRACTED',extraction_engine:result.engine};
}
assert.equal(extract(ingest({tenant_id:'tenant-a',name:'invoice.pdf',type:'pdf',size:100,hash:'sha256:x'}),{engine:'tesseract',text:'نص',ocr:true,language:'ara'}).status,'EXTRACTED');
assert.throws(()=>ingest({tenant_id:'tenant-a',name:'x.exe',type:'exe',size:10,hash:'x'}),/UNSUPPORTED_FILE_TYPE/);
assert.throws(()=>ingest({tenant_id:'tenant-a',name:'x.pdf',type:'pdf',size:0,hash:'x'}),/EMPTY_FILE/);
assert.throws(()=>ingest({tenant_id:'tenant-a',name:'x.pdf',type:'pdf',size:10}),/CONTENT_HASH_REQUIRED/);
assert.throws(()=>extract({status:'NEW'},{engine:'tesseract',text:'x'}),/INGESTION_REQUIRED/);
assert.throws(()=>extract({status:'INGESTED'},{engine:'tesseract',ocr:true,text:'x'}),/OCR_LANGUAGE_REQUIRED/);
assert.throws(()=>extract({status:'INGESTED'},{engine:'tesseract',text:''}),/EXTRACTION_EMPTY/);
console.log('file/ocr failure modes: PASS');