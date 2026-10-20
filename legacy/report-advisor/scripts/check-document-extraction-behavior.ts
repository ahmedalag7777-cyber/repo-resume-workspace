import { canAnalyzeAfterExtraction, finalizeExtraction, hashText, normalizeExtractedText } from '../src/lib/import-pipeline/canonical-text-orchestrator.ts';

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(`Document extraction regression failed: ${message}`);
}

const normalized = normalizeExtractedText('\uFEFF  Sales  \r\n\r\n\r\n  2026  \t\r\n');
assert(normalized === '  Sales\n\n  2026', 'normalization must remove BOM, normalize newlines, trim trailing whitespace, and collapse blank runs');

const hashA = await hashText('canonical report');
const hashB = await hashText('canonical report');
const hashC = await hashText('different report');
assert(hashA === hashB && hashA !== hashC, 'text hashing must be deterministic and content-sensitive');
assert(hashA.length === 64 && /^[0-9a-f]+$/.test(hashA), 'text hash must be SHA-256 hex');

const success = await finalizeExtraction('source-1', 'text/plain', 'Revenue\n2026');
assert(success.status === 'succeeded', 'non-empty extraction must succeed');
assert(!success.continueWithFallback && success.analysisInputMode === 'canonical_text', 'successful extraction must use canonical text');
assert(success.artifact?.textHash && success.artifact.text === 'Revenue\n2026', 'successful extraction must retain hashed canonical artifact');
assert(canAnalyzeAfterExtraction(success), 'successful extraction must be analyzable');

const partial = await finalizeExtraction('source-2', 'pdf', 'Revenue', new Error('secondary parser warning'));
assert(partial.status === 'partial', 'non-empty extraction with an error must be partial');
assert(!partial.continueWithFallback && partial.analysisInputMode === 'canonical_text', 'partial extraction with text must retain canonical text');
assert(partial.artifact?.warnings.includes('EXTRACTION_PARTIAL_FALLBACK_USED'), 'partial extraction must preserve warning provenance');
assert(canAnalyzeAfterExtraction(partial), 'partial extraction must remain analyzable');

const failed = await finalizeExtraction('source-3', 'pdf', '', new Error('parser failed'));
assert(failed.status === 'failed' && failed.continueWithFallback, 'empty extraction must activate structured fallback');
assert(failed.analysisInputMode === 'structured_source_fallback', 'failed extraction must declare fallback input mode');
assert(failed.warnings.includes('CANONICAL_TEXT_UNAVAILABLE_ANALYSIS_CONTINUES'), 'fallback must preserve explicit failure-isolation evidence');
assert(canAnalyzeAfterExtraction(failed), 'structured fallback must remain analyzable');

console.log('Document extraction behavior: PASS');
