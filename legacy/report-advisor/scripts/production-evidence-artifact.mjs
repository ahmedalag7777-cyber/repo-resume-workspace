import crypto from 'node:crypto';
export function createEvidenceArtifact({capability,commit,stage,result,details={}}){if(!capability||!commit||!stage)throw new Error('evidence identity required');const payload={capability,commit,stage,result,details};return{...payload,evidenceId:crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')}}
export function verifyEvidenceArtifact(a){if(!a?.evidenceId)return false;const {evidenceId,...payload}=a;return crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex')===evidenceId}
