#!/usr/bin/env node
/**
 * One-off: apply a .sql migration to Supabase via the project's exec_sql RPC,
 * then verify with the read-only exec RPC. Usage:
 *   node scripts/run_migration.mjs supabase/migrations/0002_chat_presence.sql
 */
import { readFileSync } from 'node:fs';

const URL = process.env.SUPABASE_URL || 'https://xgekhomwstiqjjazvpgy.supabase.co';
const ANON = process.env.SUPABASE_ANON_KEY || 'sb_publishable_uS2VcJwLbqWkYUDUY5Emxg_bW24INwm';
const file = process.argv[2] || 'supabase/migrations/0002_chat_presence.sql';

const headers = { apikey: ANON, Authorization: `Bearer ${ANON}`, 'Content-Type': 'application/json' };

async function rpc(fn, query_text) {
  const res = await fetch(`${URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ query_text }),
  });
  const text = await res.text();
  let json;
  try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}

const sql = readFileSync(file, 'utf8');
const EXEC_FN = process.env.EXEC_FN || 'exec_claudecode_query';
console.log(`→ Applying ${file} (${sql.length} bytes) via ${EXEC_FN} …`);

// Run statement-by-statement so a single failure is pinpointed. 0002 has no
// dollar-quoted bodies or in-string semicolons, so splitting on ';' is safe.
const statements = sql
  .split(/;\s*\n/)
  .map((s) => s.replace(/^\s*--.*$/gm, '').trim())
  .filter((s) => s.length > 0);

let ok = 0;
for (const stmt of statements) {
  const { status, json } = await rpc(EXEC_FN, stmt + ';');
  const err = json && typeof json === 'object' && json.error;
  const head = stmt.replace(/\s+/g, ' ').slice(0, 60);
  if (err || status >= 400) {
    console.log(`✗ ${head}…\n   ${err || status}`);
  } else {
    ok++;
    console.log(`✓ ${head}…`);
  }
}
console.log(`\nApplied ${ok}/${statements.length} statements.`);

// Verify
const check = await rpc(
  'exec_claudecode_query',
  "SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name",
);
console.log('\nPublic tables now:', JSON.stringify(check.json));
process.exit(0);
