// Shared launch + auth helpers for driving pipilot.dev with Playwright.
//
// The Supabase session (access_token / refresh_token) is a SECRET and is never
// committed. Provide it at runtime one of two ways:
//   1) env var:   PIPILOT_SESSION_JSON='{"access_token":"...","refresh_token":"...",...}'
//   2) local file: pipilot-demo/session.local.json   (gitignored)
// The JSON is the object Supabase stores under its auth-token localStorage key.
import { chromium } from 'playwright';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dir = dirname(fileURLToPath(import.meta.url));

export const PROXY = process.env.HTTPS_PROXY || 'http://127.0.0.1:35921';
// Point Playwright at a pre-installed Chromium instead of downloading one.
export const EXE =
  process.env.PW_CHROMIUM || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
// Supabase default storage key = sb-<project-ref>-auth-token
export const STORAGE_KEY =
  process.env.PIPILOT_STORAGE_KEY || 'sb-idftbwgsbypgcqhyrqgn-auth-token';

export function loadSession() {
  if (process.env.PIPILOT_SESSION_JSON) {
    try {
      return JSON.parse(process.env.PIPILOT_SESSION_JSON);
    } catch (e) {
      throw new Error('PIPILOT_SESSION_JSON is not valid JSON: ' + e.message);
    }
  }
  let content;
  try {
    content = readFileSync(join(__dir, 'session.local.json'), 'utf8');
  } catch (e) {
    if (e.code === 'ENOENT') {
      throw new Error(
        'No session found. Set PIPILOT_SESSION_JSON or create pipilot-demo/session.local.json ' +
          '(the object Supabase stores in localStorage under ' + STORAGE_KEY + ').'
      );
    }
    throw e;
  }
  try {
    return JSON.parse(content);
  } catch (e) {
    throw new Error('pipilot-demo/session.local.json is not valid JSON: ' + e.message);
  }
}

export async function launch() {
  const browser = await chromium.launch({
    headless: true,
    executablePath: EXE,
    proxy: { server: PROXY },
    // The egress proxy resets Chromium's TLS 1.3 ClientHello (RST right after
    // ClientHello, no ServerHello). Capping at TLS 1.2 makes the handshake pass.
    args: ['--no-sandbox', '--disable-dev-shm-usage', '--ssl-version-max=tls1.2'],
  });
  const ctx = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    ignoreHTTPSErrors: true,
  });
  return { browser, ctx };
}

// Seed the Supabase session into localStorage on the pipilot origin, before app JS runs.
export async function authenticate(ctx) {
  const session = loadSession();
  await ctx.addInitScript(
    ([key, val]) => {
      try {
        window.localStorage.setItem(key, val);
      } catch {}
    },
    [STORAGE_KEY, JSON.stringify(session)]
  );
}
