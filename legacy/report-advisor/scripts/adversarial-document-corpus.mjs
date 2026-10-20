export const adversarialCorpus=[
{id:'truncated-pdf',failure:'truncated_source',expected:'QUARANTINE'},
{id:'empty-sheet',failure:'empty_table',expected:'REVIEW'},
{id:'merged-header',failure:'merged_headers',expected:'REVIEW'},
{id:'duplicate-header',failure:'duplicate_headers',expected:'REVIEW'},
{id:'arabic-ocr-noise',failure:'ocr_noise',expected:'FALLBACK_OR_REVIEW'},
{id:'numeric-separator-chaos',failure:'numeric_format_variants',expected:'PASS'},
{id:'hidden-rows',failure:'hidden_rows',expected:'REVIEW'},
{id:'formula-values',failure:'formula_cells',expected:'PASS'},
{id:'wrong-extension',failure:'content_extension_mismatch',expected:'FALLBACK_OR_REVIEW'},
{id:'binary-garbage',failure:'unreadable_binary',expected:'QUARANTINE'}
];
