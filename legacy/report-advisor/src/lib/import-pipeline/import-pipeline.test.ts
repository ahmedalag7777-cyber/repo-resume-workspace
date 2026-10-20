import {describe,expect,it} from 'vitest';
import {classifyReportFile,isSupportedReportExtension} from './report-file-contract';
import {normalizeHeader} from './report-header-normalization';
import {decideIncrementalImport,changedRows} from './incremental-import-ledger';
import {normalizeWatchConfig,shouldQueue} from './folder-watch-contract';

describe('import pipeline foundations',()=>{
 it('recognizes supported report formats and rejects unsupported ones',()=>{expect(isSupportedReportExtension('x.xlsx')).toBe(true);expect(isSupportedReportExtension('x.pdf')).toBe(true);expect(isSupportedReportExtension('x.exe')).toBe(false);expect(classifyReportFile('C:\\Reports\\x.xlsx').state).toBe('discovered');});
 it('maps common Arabic and English accounting headers',()=>{expect(normalizeHeader('رقم الصنف')).toBe('sku');expect(normalizeHeader('السعر')).toBe('price');expect(normalizeHeader('رصيد المخزون')).toBe('quantity');expect(normalizeHeader('Customer Number')).toBe('customer_id');});
 it('skips unchanged files and isolates changed rows',()=>{const f={sourceKey:'a',contentHash:'h',sizeBytes:10,modifiedAt:'2026-08-23'};expect(decideIncrementalImport(f,f).action).toBe('skip_unchanged');expect(changedRows([{stableKey:'1',rowHash:'a'},{stableKey:'2',rowHash:'b'}],[{stableKey:'1',rowHash:'a'},{stableKey:'2',rowHash:'old'}])).toEqual([{stableKey:'2',rowHash:'b'}]);});
 it('queues only supported created/changed files',()=>{const c=normalizeWatchConfig({id:'f1',path:'C:\\Reports'});expect(shouldQueue({folderId:'f1',path:'C:\\Reports\\a.xlsx',event:'created',observedAt:'2026-08-23'},c)).toBe(true);expect(shouldQueue({folderId:'f1',path:'C:\\Reports\\a.exe',event:'created',observedAt:'2026-08-23'},c)).toBe(false);});
});
