#!/usr/bin/env node
/**
 * Mark a URL as having been submitted to "Request Indexing" today. (Marcyan)
 * Called by the daily cron orchestrator after each successful Chrome MCP click
 * in GSC's URL Inspection → Request Indexing flow.
 *
 * Usage: node scripts/mark-indexing-requested.mjs <url>
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const STATUS_FILE = path.join(__dirname, '..', 'data', 'indexing-status.json');

const url = process.argv[2];
if (!url) {
  console.error('Usage: mark-indexing-requested.mjs <url>');
  process.exit(1);
}

const now = new Date().toISOString();
const status = JSON.parse(await fs.readFile(STATUS_FILE, 'utf8'));
const s = status.urls[url] || {};
s.lastIndexRequestAt = now;
s.indexRequestHistory = [...(s.indexRequestHistory || []), now];
status.urls[url] = s;
await fs.writeFile(STATUS_FILE, JSON.stringify(status, null, 2) + '\n', 'utf8');
console.log(`✓ ${url}`);
console.log(`  marked requested at ${now} (lifetime requests: ${s.indexRequestHistory.length})`);
