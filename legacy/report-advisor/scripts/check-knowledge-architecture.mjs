#!/usr/bin/env node
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();

const required = [
  "docs/SYSTEM_HEART.md",
  "ONE-PROGRAMMER-SESSION-MEMORY.md",
  "docs/MASTER_EXECUTION_INDEX.md",
  "docs/MASTER_PRODUCT_REFERENCE.md",
  "docs/MASTER_UI_UX_REFERENCE.md",
  "docs/MASTER_ENGINEERING_ARCHITECTURE.md",
  "docs/MASTER_DATA_TRUTH_SECURITY.md",
  "docs/MASTER_RUNTIME_CERTIFICATION.md",
  "docs/MASTER_COMMERCIAL_REFERENCE.md",
  "docs/PROJECT_KNOWLEDGE_MANIFEST.md",
];

const missing = required.filter((p) => !existsSync(join(root, p)));
if (missing.length) {
  console.error("KNOWLEDGE ARCHITECTURE FAIL: missing canonical files");
  for (const p of missing) console.error(" -", p);
  process.exit(1);
}

const heart = readFileSync(join(root, "docs/SYSTEM_HEART.md"), "utf8");
const memory = readFileSync(join(root, "ONE-PROGRAMMER-SESSION-MEMORY.md"), "utf8");
const manifest = readFileSync(join(root, "docs/PROJECT_KNOWLEDGE_MANIFEST.md"), "utf8");

const requiredTokens = [
  ["SYSTEM_HEART", heart, "CANONICAL CONTROL PLANE"],
  ["50/50 allocation", heart, "Lane A — 50%"],
  ["resume protection", heart, "Resume-position protection"],
  ["live state", heart, "ONE-PROGRAMMER-SESSION-MEMORY.md"],
  ["manifest deletion gate", manifest, "Deletion gate"],
  ["resume pointer", memory, "CURRENT RESUME POINTER"],
  ["next action", memory, "NEXT"],
];

const tokenFailures = requiredTokens
  .filter(([, body, token]) => !body.includes(token))
  .map(([name]) => name);

if (tokenFailures.length) {
  console.error("KNOWLEDGE ARCHITECTURE FAIL: required governance token missing");
  for (const n of tokenFailures) console.error(" -", n);
  process.exit(1);
}

const docsRoot = join(root, "docs");
const files = [];
function walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else files.push(full.slice(root.length + 1).replaceAll("\\", "/"));
  }
}
walk(docsRoot);

const legacyMasterNames = files.filter((p) =>
  /MASTER_(?!UI_UX_REFERENCE|ENGINEERING_ARCHITECTURE|DATA_TRUTH_SECURITY|RUNTIME_CERTIFICATION|COMMERCIAL_REFERENCE|PRODUCT_REFERENCE|EXECUTION_INDEX)/.test(p.split("/").pop() ?? "")
);

console.log("KNOWLEDGE ARCHITECTURE PASS: canonical control-plane files exist and required governance invariants are present.");
console.log(`Documentation inventory scanned: ${files.length} files under docs/.`);
if (legacyMasterNames.length) {
  console.log("NOTICE: legacy/parallel-looking master documents still exist; removal requires Manifest absorption proof.");
  for (const p of legacyMasterNames.slice(0, 20)) console.log(" -", p);
  if (legacyMasterNames.length > 20) console.log(` - ... ${legacyMasterNames.length - 20} more`);
}
