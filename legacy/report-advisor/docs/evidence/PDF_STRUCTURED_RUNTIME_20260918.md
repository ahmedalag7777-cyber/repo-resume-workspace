# Structured PDF Runtime Evidence — 2026-09-18

## Exact source

- Repository: `Report-Engainall/Report-Advisor`
- Branch: `fix/pdf-structured-rebased-20260918`
- Exact runtime SHA: `0b04e3584021787473045a92a325030f35fee924`
- Verification device: `PC01`
- Verification worktree: `C:\Users\Report-Advisor-pdf-runtime`
- Supabase target: staging project `fnqbvfuwbdpwvhcgzksl`

## Runtime evidence

The connected Windows device executed the structured PDF regression with real Staging Supabase configuration supplied from the connected Supabase project.

### Results

- `scripts/check-file-engine-contract.mjs` — **PASS**
- `scripts/check-pdf-structured-regression.ts` — **PASS**
- `npm run test:file-engine-regressions` — **PASS**
- `npm run build` — **PASS**
- Windows x64 NSIS packaging — **PASS**

The structured PDF behavioral regression covered:

- English structured invoice parsing;
- invoice number extraction without leaking into the date label;
- invoice date extraction;
- customer extraction;
- subtotal/tax/total/currency extraction;
- structured quality threshold;
- Arabic digit normalization;
- OCR confidence boundary assertions (49 reject, 50/74 review, 75/100 trusted);
- rejection of generic text-row fallback for a valid structured PDF.

## Root causes fixed during this evidence batch

1. The PDF regression fixture used one large text operator that caused PDF.js to truncate extracted text. The generator was changed to emit bounded text chunks.
2. The structured `total` matcher could match the substring `total` inside `subtotal`, producing the wrong value. The matcher is now word-boundary constrained.
3. PDF text extraction can insert spaces around date separators. The structured date parser now tolerates spaced separators and normalizes them.
4. PDF text extraction can insert spaces inside numeric values. Structured numeric field patterns now tolerate internal whitespace before numeric normalization.

No acceptance threshold was weakened and no failing scenario was deleted.

## Desktop artifact

Fresh Windows installer produced from the same verified worktree:

`desktop/release/Report-Advisor-Setup-0.1.0.exe`

- Size: 110,776,617 bytes
- SHA-256: `07444545EFA48ED6F26910D6DA090B82C79B246B63E113CF4D7B3A2F25C486F8`

## Remaining boundary

This evidence proves the structured PDF/file-engine path at the exact SHA above.

It does **not** by itself certify full production release, authenticated business persistence, worker recovery, or Arabic RTL OCR corpus behavior.
