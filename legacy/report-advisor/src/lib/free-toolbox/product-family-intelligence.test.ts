import {describe,expect,it} from 'vitest';
import {applyProductFamilyOverride,extractProductFamilyAttributes,suggestProductFamilies,validateFamilyOverride} from './product-family-intelligence';

describe('product family intelligence',()=>{
  it('normalizes Arabic digits and units',()=>{
    const a=extractProductFamilyAttributes({sku:'F1',name:'دقيق ابو ٢٥',unit:'كجم'});
    expect(a.quantity).toBe(25); expect(a.unit).toBe('kg');
  });
  it('suggests families from normalized commercial attributes',()=>{
    const r=suggestProductFamilies([
      {sku:'1',name:'دقيق ابو 25',unit:'كجم'},
      {sku:'2',name:'دقيق أبيض 25 كيلو',unit:'كجم'},
      {sku:'3',name:'ارز ابو 25',unit:'كجم'},
    ]);
    expect(r.some(x=>x.memberSkus.includes('1')&&x.memberSkus.includes('2'))).toBe(true);
    expect(r.some(x=>x.memberSkus.includes('3')&&x.memberSkus.includes('1'))).toBe(false);
  });
  it('requires explicit merchant approval for override',()=>{
    const base=suggestProductFamilies([{sku:'1',name:'زيت ابو 20 لتر'},{sku:'2',name:'زيت شركة ب 20 لتر'}]);
    const override={familyKey:'oil20',name:'زيت 20 لتر تجاري',memberSkus:['1','2'],state:'locked' as const};
    validateFamilyOverride(override,new Set(['1','2']));
    const out=applyProductFamilyOverride(base,override);
    expect(out.some(x=>x.familyKey==='oil20'&&x.state==='locked'&&x.memberSkus.length===2)).toBe(true);
  });
  it('rejects unknown or duplicate SKU overrides',()=>{
    expect(()=>validateFamilyOverride({familyKey:'x',name:'X',memberSkus:['1','1'],state:'approved'},new Set(['1']))).toThrow('PRODUCT_FAMILY_DUPLICATE_SKU');
    expect(()=>validateFamilyOverride({familyKey:'x',name:'X',memberSkus:['9'],state:'approved'},new Set(['1']))).toThrow('PRODUCT_FAMILY_UNKNOWN_SKU');
  });
});
