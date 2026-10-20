import assert from 'node:assert/strict';
const members=[{tenantId:'t1',sku:'A',groupId:'g1'},{tenantId:'t1',sku:'A',groupId:'g2'},{tenantId:'t2',sku:'A',groupId:'g9'},{tenantId:'',sku:'B',groupId:'g1'}];
assert.equal(members.filter(x=>x.tenantId==='t1').length,2);
assert.equal(new Set(members.filter(x=>x.tenantId==='t1').map(x=>x.sku)).size,1);
assert.equal(members.some(x=>x.tenantId==='t1'&&x.sku==='A'&&x.groupId==='g2'),true);
assert.equal(members.some(x=>!x.tenantId),true);
console.log('alternative-group security fixture: PASS');
