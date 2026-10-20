import { describe,expect,it } from 'vitest';
import { analyzeCustomerProductContinuity } from './customer-product-intelligence';
describe('customer-product-intelligence',()=>{
 it('detects lost demand and lapse',()=>{const r=analyzeCustomerProductContinuity([
  {customerId:'c1',productKey:'p1',period:'2026-06',requestedUnits:100,fulfilledUnits:100},
  {customerId:'c1',productKey:'p1',period:'2026-07',requestedUnits:80,fulfilledUnits:60},
  {customerId:'c1',productKey:'p1',period:'2026-08',requestedUnits:0,fulfilledUnits:0},
 ]);expect(r[0].continuity).toBe('lapsed');expect(r[0].lostUnits).toBe(20);expect(r[0].fillRate).toBeCloseTo(160/180);});
 it('keeps customer and product identities isolated',()=>{const r=analyzeCustomerProductContinuity([{customerId:'c1',productKey:'p1',period:'2026-08',requestedUnits:10,fulfilledUnits:10},{customerId:'c2',productKey:'p1',period:'2026-08',requestedUnits:20,fulfilledUnits:20}]);expect(r).toHaveLength(2);expect(r.map(x=>x.customerId)).toEqual(['c1','c2']);});
});
