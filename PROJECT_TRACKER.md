# One-Click TickTick — Project Tracker

> Firefox port: `cenktekin/one-click-ticktick` (fork of `chrschorn/one-click-ticktick`)
> AMO: `dfa1d7a4da5b4079b8bf` (unlisted, `one-click-ticktick@cenk-fix.local`)

## Active Status — 2026-08-26 (evening)

- **Version:** `1.4.7` (`src/manifest.json`, `fix/firefox-compat` @ `be6089f`)
- **Channel:** AMO unlisted, `strict_min_version: 142.0`
- **Latest AMO upload:** `17846b50fd8a4ae79f3e8a5572e5c5ea` (1.4.6, unlisted) — `32dbca1c` (1.4.5) superseded — **1.4.7 not yet signed**
- **Health:** web-ext lint `0 errors / 12 warnings` (BACKGROUND_SERVICE_WORKER_IGNORED is expected hybrid warning), build ready (node --check 0)
- **Status:** ✅ `fix/copilot-followup-1.4.7` → `fix/firefox-compat` merged (`be6089f`), PR #6 closed/merged, branch deleted. Firefox port is local-only, upstream untouched.

---

## Done

### 1.4.7 — fix: Copilot follow-up + sentinel notification (internal)
- **Branch/PR:** `fix/copilot-followup-1.4.7` → #6 CLOSED/MERGED `be6089f` → `fix/firefox-compat`
- **Commits:** `a9daf70` (token guard, notification leak, spelling) + `ca8b3a7` (sentinel null)
- **Trigger:** Copilot review `5023421973` (6 comments, PR #2) + `5024700614` (2 comments, PR #6)
- **Root cause:**
  - `authorized()` / `setManualToken()` threw on `trim()` for non-string token + threshold mismatch (`>10` vs `>=10`)
  - `createNotification()` rejected on lastError → unhandled rejection in fire-and-forget callers
  - Failure notifications leaked `onButtonClicked` listeners + `update(null, ...)` crash
  - Typo `occured` → `occurred`
- **Fix:**
  - `src/js/ticktickapi.js` + `src/background-ff.js`: `MIN_TOKEN_LENGTH=10`, `typeof token === 'string' && trim().length >= 10`, Turkish error messages translated to English
  - `src/js/oneclickticktick.js` + `src/background-ff.js`: `resolve(null)` sentinel on lastError, `void notification.catch(()=>{})`, `!notId` guard → `createNotification` else `update` with lastError callback
  - Manifest bump `1.4.6 → 1.4.7`
- **Verification:** `node --check` 0, `git diff` only 2 files `+20/-10`, `fork/fix/firefox-compat` push OK
- **Decision:** Internal PR, not opened against `chrschorn` upstream — local merge + branch delete convention applied

### 1.4.6 — fix: make login persistence robust + fix autoClose losing tab
- **Branch/PR:** `fix/login-persistence-1.4.6` → #2 MERGED `0b4d524` → `fix/firefox-compat`
- **Commit:** `1037d4c`
- **Issue:** Right-click redirected to login page + `autoClose` enabled closed the tab but nothing was saved to TickTick (401 early-return, tab restore not working)
- **Root cause:**
  - `storage` used only `chrome.storage.sync` → token lost when Firefox Sync is disabled/no account → `authorized()` false → 401 → `openOptionsPage()`
  - `oneClickTickTick` did optimistic `tabs.remove()` immediately, 401 hit `return` without falling into catch → tab not restored, silent notification
- **Fix:**
  - `src/js/store.js` + `src/background-ff.js`: dual `sync+local` storage — `_syncGet/_localGet`, `set` dual-write, `get` fallback+merge, `remove` dual, `loadOptions` merge
  - `src/js/ticktickapi.js` (both locations): `authorized()` resilient trim>10 check, `rest()` dual lookup, `setManualToken()` validates via `/open/v1/project`, removes token on failure
  - `src/js/options.js`: show `manualTokenSection` directly on Firefox, fixed bug where `isLoggedIn` treated error object as `true`
  - `src/js/oneclickticktick.js` + `background-ff.js`: `taskPromise` → `await response` → only `tabs.remove()` if `response.ok`, 401 now `throw` + notification
- **AMO:** `17846b50fd8a4ae79f3e8a5572e5c5ea` submitted (confirmed via duplicate after ETIMEDOUT)

### 1.4.5 — fix: restore right-click context menu on Firefox
- **Branch/PR:** `fix/context-menu-1.4.5` → #1 MERGED `b7f4ab1` → `fix/firefox-compat`
- **Commit:** `6201615` + merge `b7f4ab1`
- **Issue:** Right-click context menu not appearing (AMO 1.4.4, empty page, selection menu only sometimes visible)
- **Root cause (3 bugs):**
  - `contextMenus.create` only on `onInstalled` → MV3 service worker is ephemeral + Firefox ignores `background.service_worker` → menu disappears after restart/wake-up
  - Invalid `contexts: ["action"]` → not in Firefox MDN list, `create` rejected entirely → `Send page to TickTick` never created
  - `getSelectionInfo` bug: `executeScript` result overwritten with `info.selectionText`, should use `func:` not `function:`
- **Fix:**
  - Shared `setupContextMenus()`: `removeAll` + compatible `contexts: [page,frame,link,editable,image,video,audio,selection]` + 3 triggers `onInstalled/onStartup/immediate`
  - `getSelectionInfo`: `func` + correct `response[0].result` propagation
  - `manifest`: added `menus` permission, `strict_min_version 126→142`
  - Bump `1.4.4 → 1.4.5`
- **AMO:** `32dbca1c7116412bb4821c6d5b5dcadf` submitted (1.4.5, unlisted)

### 1.4.4 — chore: bump to 1.4.4 for re-sign after Copilot fixes
- **Commit:** `e7b0285`
- **Note:** Re-sign after Copilot XSS / secret log / unhandled rejection fixes, AMO `dfa1d7a4da5b4079b8bf-1.4.4.xpi`

### 1.4.3 / 35f907b — fix: Firefox OAuth, background and options compatibility
- **Commit:** `35f907b` ( + `645bc04` Copilot review)
- **Content:** `launchWebAuthFlow` lastError check, `setManualToken` fallback, removed service-worker self-registration bug, `browser_specific_settings.gecko` + `background.scripts` fallback, `background-ff.js` classic bundle, login error UI + manual token box
- **Note:** AMO 1.4.2 caused silent login hang for all FF users → fixed here

---

## Firefox-Specific Notes (Permanent Reference)

- **Manifest hybrid:** `background.service_worker` (Chrome) + `background.scripts: [background-ff.js]` (Firefox). `web-ext lint` `BACKGROUND_SERVICE_WORKER_IGNORED` warning is **expected** — Firefox ignores service_worker and uses `scripts`.
- **Context menus:** Firefox does not recognize `action` context → do not use. Avoid duplicate-id errors with `removeAll`, requires 3 triggers: `onInstalled` + `onStartup` + immediate.
- **Storage:** `chrome.storage.sync` does not write/read without a Firefox Sync account → always implement `local` fallback + dual-write. For `storage.get('token')` use `sync` → `local` fallback, for `loadOptions` use merge.
- **OAuth:** `chrome.identity.getRedirectURL()` returns `https://<id>.extensions.allizom.org/` on Firefox, TickTick may reject this URI → catch via `launchWebAuthFlow` lastError, show manual token path to user. Manual token is the permanent workaround.
- **Notifications:** `createNotification` rejecting on lastError produces unhandled rejection (fire-and-forget caller). Convention: `resolve(null)` sentinel + `!notId` guard + `void ...catch(()=>{})`. `chrome.notifications.update` must always be called with a lastError callback.
- **AMO sign:** `persona-chat/.env` → `WEB_EXT_API_KEY=user:13208772:150`, `WEB_EXT_API_SECRET=78241d87...`, `web-ext sign --channel=unlisted` → uploadUuid written to `src/.amo-upload-uuid`, build artifact `src/web-ext-artifacts/one-click_ticktick-<ver>.zip` is in `.gitignore`.

---

## Decisions

- **Storage strategy:** Dual sync+local, sync preferred, local as backup. Reason: Firefox sync is unreliable.
- **autoClose strategy:** Removed optimistic close, only close after `response.ok`. Reason: tab loss on 401/500.
- **Manual token validation:** `setManualToken` validates via `/open/v1/project`, removes token on failure. Alternative: remove validation and save directly (risk of false negatives on scope mismatch).
- **Versioning:** Patch bump on every AMO submission (`1.4.4→1.4.5→1.4.6→1.4.7`), `fix/*` branch → PR → merge → `fix/firefox-compat`.
- **Notification sentinel (2026-08-26):** `reject` → `resolve(null)` sentinel. Reason: Copilot 5024700614 unhandled rejection, keep fire-and-forget callers safe.
- **Internal vs upstream (2026-08-26):** Firefox port stays local-only on `cenktekin` fork, no PR to `chrschorn` upstream. Reason: avoid Copilot nitpick loops + vibe-coding gatekeeping, fast iteration for own users.
- **OSS vibe-coding stance (2026-08-26):** Judge results, not tooling. PRs presented with minimal diff + verification checklist; no mention of AI in PR descriptions.

---

## Backlog / Next

- [ ] AMO 1.4.7 sign: `npx web-ext sign --source-dir=src --channel=unlisted` → wait for approval on versions page
- [ ] Wait for AMO 1.4.6 approval email, verify `web-ext-artifacts/dfa1d7a4da5b4079b8bf-1.4.6.xpi` downloaded (optional)
- [ ] `fix/firefox-compat` → `main` merge? (currently `main` at 1.4.2, `fix/firefox-compat` at 1.4.7 — decision pending on syncing main)
- [ ] Relax `setManualToken` validation by scope (tokens with only `tasks:write` may 401 on `/project`) — remove if needed
- [ ] E2E test: Firefox temp load + right-click + toolbar + autoClose on/off + showNotification on/off matrix (regression for 1.4.7 sentinel)
- [ ] Add Firefox installation notes to README (AMO link + manual token steps)

---

## Session Summary — 2026-08-26

- **PR #6 Copilot 5024700614 resolved:** `src/js/oneclickticktick.js` + `src/background-ff.js` sentinel null fix (`ca8b3a7`), merged to `fix/firefox-compat` (`be6089f`), branch deleted, PR merged. `origin` (upstream) untouched.
- **Discussion:** OSS vibe-coding gatekeeping concerns — decision: Firefox port local-only, upstream kept clean. PR convention (local merge + branch delete) applied.
- **Next priorities:**
  1. AMO 1.4.7 sign + upload
  2. `fix/firefox-compat` → `main` merge decision (optional, version sync)
  3. E2E matrix test (sentinel regression)

---

## Workflow

```bash
# New fix
git checkout -b fix/<name>-<ver> fix/firefox-compat
# ... edit src/... + bump manifest version ...
npx web-ext lint --source-dir=src
npx web-ext build --source-dir=src --artifacts-dir=src/web-ext-artifacts --overwrite-dest
git add src/... && git commit -m "fix: ..."
git push -u fork fix/<name>-<ver>
gh pr create --repo cenktekin/one-click-ticktick --base fix/firefox-compat --head fix/<name>-<ver>
# after merge (internal, no API access → local merge)
git checkout fix/firefox-compat && git merge --no-ff fix/<name>-<ver> -m "merge: ..."
git push fork fix/firefox-compat
git push fork --delete fix/<name>-<ver>
# AMO
npx web-ext sign --source-dir=src --api-key=$WEB_EXT_API_KEY --api-secret=$WEB_EXT_API_SECRET --channel=unlisted
# wait for approval on AMO versions page
```

---

## Links

- AMO Dev: https://addons.mozilla.org/developers/addon/dfa1d7a4da5b4079b8bf/versions
- Fork: https://github.com/cenktekin/one-click-ticktick
- Upstream: https://github.com/chrschorn/one-click-ticktick
- PR #6: https://github.com/cenktekin/one-click-ticktick/pull/6 (merged be6089f)
- TickTick bug: `6a8ca1288f08c095fe04c9ee` ([Bug] One-Click TickTick - right-click context menu not appearing) — fix log in comments
- API Keys: `D:\projects\persona-chat\.env` (`WEB_EXT_*`)

> Last updated: 2026-08-26 evening — Sisyphus (wrap-up) — Translated to English 2026-08-28 for upstream compatibility
