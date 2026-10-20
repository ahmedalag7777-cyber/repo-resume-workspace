const TEXT_EXT=new Set(['txt','md','csv','tsv','json','xml','html','htm']);
const STRUCTURED_EXT=new Set(['xlsx','xls','xlsm','ods','docx','pptx','pdf','png','jpg','jpeg','webp','tif','tiff']);
export function planExtraction(filename=''){const ext=String(filename).split('.').pop()?.toLowerCase()||'';if(TEXT_EXT.has(ext))return{mode:'direct_text',ext,required:true};if(STRUCTURED_EXT.has(ext))return{mode:'extract_to_canonical_text',ext,required:true};return{mode:'fallback_probe',ext,required:true};}
export function validateTextArtifact({sourceHash,text,artifactHash,sourceType}){const errors=[];if(!sourceHash)errors.push('SOURCE_HASH_MISSING');if(!artifactHash)errors.push('TEXT_ARTIFACT_HASH_MISSING');if(typeof text!=='string'||!text.trim())errors.push('TEXT_ARTIFACT_EMPTY');if(!sourceType)errors.push('SOURCE_TYPE_MISSING');return{valid:errors.length===0,errors};}
export function gateForAnalysis(result){return result.valid?'ANALYZE_CANONICAL_TEXT':'QUARANTINE_EXTRACTION';}
