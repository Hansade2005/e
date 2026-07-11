# pipilot.dev Playwright demo harness

Reusable scripts for driving the live **pipilot.dev/app** with Playwright — used
here to test the **Agent Teams** feature (give the builder a multi-feature prompt
and it spins up a task board of parallel workers you watch live).

## Files

| File | Purpose |
|------|---------|
| `lib.mjs` | Shared launch + auth helpers (proxy, Chromium path, session injection) |
| `recon.mjs` | Load the logged-out site, dump localStorage keys + network |
| `auth-check.mjs` | Inject the session and confirm you're logged in |
| `probe.mjs` | Dump the chat input / button selectors |
| `run-agent-teams.mjs` | Submit a build prompt and record the Agent Teams run to `videos/` |

## Providing the auth session (secret — never committed)

The scripts read the Supabase session (the object stored in `localStorage` under
`sb-<project-ref>-auth-token`) from either:

- env var `PIPILOT_SESSION_JSON`, or
- `session.local.json` in this folder (gitignored).

```json
{ "access_token": "...", "token_type": "bearer", "expires_at": 0,
  "refresh_token": "...", "user": { "id": "...", "email": "..." } }
```

An expired `access_token` is fine — supabase-js auto-refreshes it on load via the
`refresh_token`.

## Run

```bash
npm install playwright        # 1.61.x
node auth-check.mjs           # verify login
node run-agent-teams.mjs      # runs until the build is reasonably complete
```

`run-agent-teams.mjs` polls until all three workers finish and the builder goes
idle (past any transient auto-fix), recording to `videos/`. A safety ceiling caps
the wait — override it with `MAX_MS` (milliseconds; `RUN_MS` is accepted as an
alias), e.g. `MAX_MS=1800000 node run-agent-teams.mjs`.

## Environment gotchas (why a naive local run fails)

Two issues bit us and are worked around in `lib.mjs`:

1. **Browser download / version mismatch.** Don't run `playwright install`. Point
   Playwright at a pre-installed Chromium via `executablePath` (env `PW_CHROMIUM`).

2. **TLS reset through a MITM/egress proxy.** Chromium's TLS 1.3 ClientHello gets
   RST'd immediately (net-log shows `SOCKET_READ_ERROR -101`, no ServerHello),
   while curl to the same host succeeds. Launching with **`--ssl-version-max=tls1.2`**
   fixes it. Also pass the proxy via `proxy: { server: HTTPS_PROXY }` and
   `ignoreHTTPSErrors: true`.

## Recording → mp4

Playwright records `.webm`. Its bundled ffmpeg only encodes VP8, so convert with a
full ffmpeg (e.g. the one bundled in the `imageio-ffmpeg` PyPI wheel):

```bash
ffmpeg -i videos/<file>.webm -c:v libx264 -preset slow -crf 24 \
  -pix_fmt yuv420p -movflags +faststart -an agent-teams-demo.mp4
```

Screen content compresses well — a 5-minute 1440×900 capture lands under ~10 MB.
