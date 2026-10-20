function isRepositoryFixturePath(value) {
  const candidate = String(value ?? '').trim().replaceAll(String.fromCharCode(92), '/');
  return /(?:^|\/)(?:tests?|__tests__|fixtures?|__fixtures__|mocks?|samples?|examples?)(?:\/|$)/i.test(candidate);
}

/** Corpus metadata alone is insufficient proof that a source is a real upload. */
export function isGovernedRealFileRecord(record, sourcePath = null) {
  const metadata = record?.metadata && typeof record.metadata === 'object' ? record.metadata : {};
  const reportCorpus = metadata.report_corpus === true || String(metadata.report_corpus ?? '').toLowerCase() === 'true';
  const fixtureType = String(metadata.fixture_type ?? '').trim().toLowerCase();
  const catalogId = String(metadata.catalog_id ?? '').trim().toLowerCase();
  const provenancePaths = [
    record?.file_name, record?.storage_path, record?.source_path, sourcePath,
    metadata.source_path, metadata.sourcePath, metadata.original_path, metadata.upload_path,
    metadata.repo_path, metadata.fixture_path, metadata.origin_path,
  ];
  const carriesFixturePath = provenancePaths.some(isRepositoryFixturePath);
  const explicitFixture = /(?:synthetic|fixture|e2e|test|mock)/i.test(fixtureType)
    || catalogId === 'report-intelligence.48';
  return reportCorpus && !explicitFixture && !carriesFixturePath;
}

/**
 * Returns real canonical row anchors from a persisted canonical-import commit.
 * Never trusts a commit count alone: the row IDs must be present and non-empty.
 */
export function committedCanonicalRecordIds(commit, limit = 8) {
  if (!commit || !Array.isArray(commit.committed_ids)) return [];
  if (!Number.isFinite(Number(commit.committed_count)) || Number(commit.committed_count) <= 0) return [];
  const maximum = Number.isInteger(limit) && limit > 0 ? limit : 8;
  return [...new Set(commit.committed_ids.map((value) => String(value ?? '').trim()).filter(Boolean))].slice(0, maximum);
}

/**
 * Resolve the owning import only after an exact tenant, source hash and anchor-ID
 * readback. A same-hash row from another tenant must never become an anchor.
 */
export function resolveCanonicalImportIdFromAnchor(anchor, expected) {
  if (!anchor || !expected) return null;
  if (String(anchor.id ?? '').trim() !== String(expected.recordId ?? '').trim()) return null;
  if (String(anchor.company_id ?? '').trim() !== String(expected.companyId ?? '').trim()) return null;
  if (String(anchor.source_hash ?? '').trim() !== String(expected.sourceHash ?? '').trim()) return null;
  const importId = String(anchor.import_job_id ?? '').trim();
  return importId || null;
}

