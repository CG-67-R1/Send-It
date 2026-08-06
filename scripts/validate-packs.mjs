/**
 * Validate regional packs: manifests, hierarchy parent links, contentIndex files.
 * Usage: node scripts/validate-packs.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const PACKS = path.join(ROOT, 'packs');

const errors = [];
const warnings = [];

function err(msg) {
  errors.push(msg);
}
function warn(msg) {
  warnings.push(msg);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (e) {
    err(`Invalid JSON: ${filePath}: ${e.message}`);
    return null;
  }
}

const registry = readJson(path.join(PACKS, 'registry.json'));
const active = readJson(path.join(PACKS, 'active.json'));
if (!registry?.nodes?.length) err('registry.json missing or empty nodes');
if (!active?.packs?.length) err('active.json must list at least one pack');

const nodeById = new Map();
if (registry?.nodes) {
  for (const n of registry.nodes) {
    if (!n.id) {
      err('registry node missing id');
      continue;
    }
    if (nodeById.has(n.id)) err(`Duplicate registry node id: ${n.id}`);
    nodeById.set(n.id, n);
  }
  for (const n of registry.nodes) {
    if (n.parentId != null && !nodeById.has(n.parentId)) {
      err(`Orphan parentId '${n.parentId}' on node '${n.id}'`);
    }
    if (!n.packId) err(`Node '${n.id}' missing packId`);
    if (!['region', 'country', 'subdivision', 'coverage_area'].includes(n.kind)) {
      err(`Node '${n.id}' invalid kind '${n.kind}'`);
    }
    if (!['active', 'seed', 'scaffold'].includes(n.status)) {
      err(`Node '${n.id}' invalid status '${n.status}'`);
    }
  }
}

if (active?.packs) {
  for (const packId of active.packs) {
    const dir = path.join(PACKS, 'regions', packId);
    if (!fs.existsSync(dir)) err(`active pack folder missing: ${packId}`);
  }
}

const regionsDir = path.join(PACKS, 'regions');
if (!fs.existsSync(regionsDir)) {
  err('packs/regions missing');
} else {
  for (const packId of fs.readdirSync(regionsDir)) {
    const packDir = path.join(regionsDir, packId);
    if (!fs.statSync(packDir).isDirectory()) continue;

    const manifestPath = path.join(packDir, 'manifest.json');
    const hierarchyPath = path.join(packDir, 'hierarchy.json');
    if (!fs.existsSync(manifestPath)) {
      err(`${packId}: missing manifest.json`);
      continue;
    }
    const manifest = readJson(manifestPath);
    if (!manifest) continue;

    for (const req of ['id', 'displayName', 'status', 'contentIndex']) {
      if (manifest[req] == null) err(`${packId}: manifest missing ${req}`);
    }
    if (manifest.id !== packId) err(`${packId}: manifest.id '${manifest.id}' != folder`);
    if (!['active', 'seed', 'scaffold'].includes(manifest.status)) {
      err(`${packId}: invalid manifest.status`);
    }
    if (!Array.isArray(manifest.contentIndex)) {
      err(`${packId}: contentIndex must be array`);
    } else {
      for (const rel of manifest.contentIndex) {
        const fp = path.join(packDir, rel);
        if (!fs.existsSync(fp)) err(`${packId}: contentIndex file missing: ${rel}`);
      }
    }

    if (!fs.existsSync(hierarchyPath)) {
      err(`${packId}: missing hierarchy.json`);
    } else {
      const hierarchy = readJson(hierarchyPath);
      if (hierarchy) {
        if (hierarchy.packId !== packId) {
          err(`${packId}: hierarchy.packId mismatch`);
        }
        const hIds = new Set();
        for (const n of hierarchy.nodes || []) {
          if (hIds.has(n.id)) err(`${packId}: duplicate hierarchy id ${n.id}`);
          hIds.add(n.id);
          if (n.parentId != null && !hIds.has(n.parentId) && !(hierarchy.nodes || []).some((x) => x.id === n.parentId)) {
            // parent may appear later — second pass
          }
        }
        for (const n of hierarchy.nodes || []) {
          if (n.parentId != null && !hIds.has(n.parentId)) {
            err(`${packId}: hierarchy orphan parentId ${n.parentId} on ${n.id}`);
          }
        }
        const root = (hierarchy.nodes || []).find((n) => n.parentId == null);
        if (!root) warn(`${packId}: hierarchy has no root node`);
      }
    }

    const regRoot = registry?.nodes?.find((n) => n.id === packId && n.parentId == null);
    if (!regRoot) warn(`${packId}: no root entry in registry.json`);
  }
}

if (warnings.length) {
  console.log('Warnings:');
  for (const w of warnings) console.log(`  - ${w}`);
}
if (errors.length) {
  console.error('validate-packs FAILED:');
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
console.log(`validate-packs OK (${nodeById.size} registry nodes, active=[${(active?.packs || []).join(',')}])`);
