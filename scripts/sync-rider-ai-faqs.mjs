#!/usr/bin/env node
/**
 * Copy rider AI FAQs from api/data to app bundle.
 * Usage: node scripts/sync-rider-ai-faqs.mjs [path-to-source.json]
 *
 * Default source: api/data/rider_ai_faqs.json
 * Example with your Downloads file:
 *   node scripts/sync-rider-ai-faqs.mjs "C:\Users\cgreene\Downloads\rider_ai_faqs.json"
 */
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const DEFAULT_SOURCE = path.join(ROOT, 'api', 'data', 'rider_ai_faqs.json');
const API_TARGET = path.join(ROOT, 'api', 'data', 'rider_ai_faqs.json');
const APP_TARGET = path.join(ROOT, 'app', 'src', 'data', 'rider_ai_faqs.json');

const source = process.argv[2] ? path.resolve(process.argv[2]) : DEFAULT_SOURCE;

const raw = await fs.readFile(source, 'utf-8');
JSON.parse(raw);
await fs.writeFile(API_TARGET, `${raw.trim()}\n`, 'utf-8');
await fs.writeFile(APP_TARGET, `${raw.trim()}\n`, 'utf-8');
console.log(`Synced rider AI FAQs:\n  from ${source}\n  to   ${API_TARGET}\n  and  ${APP_TARGET}`);
