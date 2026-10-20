import fs from 'node:fs';

const path = 'src/lib/report-intelligence/outcome-learning-binding.ts';
const source = fs.readFileSync(path, 'utf8');

if (/generic\.report/.test(source)) throw new Error('GENERIC_ARCHETYPE_FALLBACK_FORBIDDEN');
if (!source.includes('OUTCOME_LEARNING_ARCHETYPE_ID_REQUIRED')) throw new Error('ARCHETYPE_REQUIRED_GUARD_MISSING');
if (!source.includes('OUTCOME_LEARNING_PROFILE_VERSION_REQUIRED')) throw new Error('PROFILE_VERSION_GUARD_MISSING');
if (!source.includes('const archetypeId = input.archetypeId?.trim();')) throw new Error('ARCHETYPE_NORMALIZATION_MISSING');

console.log('OUTCOME_LEARNING_ARCHETYPE_CONTRACT=PASS');
