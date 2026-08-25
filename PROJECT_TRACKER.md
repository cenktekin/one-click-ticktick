# One-Click TickTick — Project Tracker

> Firefox portu: `cenktekin/one-click-ticktick` (fork of `chrschorn/one-click-ticktick`)
> AMO: `dfa1d7a4da5b4079b8bf` (unlisted, `one-click-ticktick@cenk-fix.local`)

## Aktif Durum — 2026-08-26

- **Versiyon:** `1.4.6` (`src/manifest.json`, `fix/firefox-compat` @ `0b4d524`)
- **Kanal:** AMO unlisted, `strict_min_version: 142.0`
- **Son AMO upload:** `17846b50fd8a4ae79f3e8a5572e5c5ea` (1.4.6, unlisted) — `32dbca1c` (1.4.5) supersede edildi
- **Sağlık:** web-ext lint `0 errors / 12 warnings` (BACKGROUND_SERVICE_WORKER_IGNORED beklenen hybrid warning), build `one-click_ticktick-1.4.6.zip` (701KB) ready
- **Durum:** ✅ Kullanıcı onayı: remove & reinstall + token re-enter sonrası sağ tık + toolbar + autoClose sorunsuz çalışıyor (2026-08-26)

---

## Yapıldı (Done)

### 1.4.6 — fix: make login persistence robust + fix autoClose losing tab
- **Branch/PR:** `fix/login-persistence-1.4.6` → #2 MERGED `0b4d524` → `fix/firefox-compat`
- **Commit:** `1037d4c`
- **Sorun:** Sağ tık login sayfasına atıyor + `autoClose` açıkken tab kapanıyor ama TickTick’te kayıt yok (401 early-return, tab restore çalışmıyor)
- **Kök neden:**
  - `storage` sadece `chrome.storage.sync` → Firefox sync kapalı/hesapsızsa token kayboluyor → `authorized()` false → 401 → `openOptionsPage()`
  - `oneClickTickTick` optimistic `tabs.remove()` hemen kapanıyor, 401’de `return` ile catch’e düşmüyor → tab geri gelmiyor, bildirim sessiz
- **Çözüm:**
  - `src/js/store.js` + `src/background-ff.js`: dual `sync+local` storage — `_syncGet/_localGet`, `set` dual-write, `get` fallback+merge, `remove` dual, `loadOptions` merge
  - `src/js/ticktickapi.js` (her iki yerde): `authorized()` resilient trim>10 check, `rest()` dual lookup, `setManualToken()` `/open/v1/project` ile doğrular, başarısızsa token siler
  - `src/js/options.js`: Firefox’ta `manualTokenSection` direkt gösterilir, `isLoggedIn` error objesini `true` sanma bug’ı düzeltildi
  - `src/js/oneclickticktick.js` + `background-ff.js`: `taskPromise` → `await response` → sadece `response.ok` ise `tabs.remove()`, 401 artık `throw` + notification
- **AMO:** `17846b50fd8a4ae79f3e8a5572e5c5ea` submitted (ETIMEDOUT sonrası duplicate ile onaylandı)

### 1.4.5 — fix: restore right-click context menu on Firefox
- **Branch/PR:** `fix/context-menu-1.4.5` → #1 MERGED `b7f4ab1` → `fix/firefox-compat`
- **Commit:** `6201615` + merge `b7f4ab1`
- **Sorun:** Sağ tık context menu gelmiyor (AMO 1.4.4, sayfa boş, seçim menüsü sadece bazen görünüyor)
- **Kök neden (3 hata):**
  - Sadece `onInstalled` ile `contextMenus.create` → MV3 service worker ephemeral + Firefox `background.service_worker` yok sayılıyor → restart/wake-up sonrası menü kayboluyor
  - Geçersiz `contexts: ["action"]` → Firefox MDN listesinde yok, `create` tamamen reddediliyor → `Send page to TickTick` hiç oluşmuyor
  - `getSelectionInfo` bug: `executeScript` sonucu `info.selectionText` ile eziliyor, `function:` yerine `func:` kullanılmalı
- **Çözüm:**
  - Ortak `setupContextMenus()`: `removeAll` + uyumlu `contexts: [page,frame,link,editable,image,video,audio,selection]` + `onInstalled/onStartup/immediate` 3 tetikleyici
  - `getSelectionInfo`: `func` + doğru `response[0].result` propagation
  - `manifest`: `menus` izni eklendi, `strict_min_version 126→142`
  - Bump `1.4.4 → 1.4.5`
- **AMO:** `32dbca1c7116412bb4821c6d5b5dcadf` submitted (1.4.5, unlisted)

### 1.4.4 — chore: bump to 1.4.4 for re-sign after Copilot fixes
- **Commit:** `e7b0285`
- **Not:** Copilot XSS / secret log / unhandled rejection fixleri sonrası re-sign, AMO `dfa1d7a4da5b4079b8bf-1.4.4.xpi`

### 1.4.3 / 35f907b — fix: Firefox OAuth, background and options compatibility
- **Commit:** `35f907b` ( + `645bc04` Copilot review)
- **İçerik:** `launchWebAuthFlow` lastError check, `setManualToken` fallback, service-worker self-registration bug kaldırıldı, `browser_specific_settings.gecko` + `background.scripts` fallback, `background-ff.js` classic bundle, login error UI + manual token box
- **Not:** AMO 1.4.2 tüm FF kullanıcıları için login hang (silent) → bu fix ile çözüldü

---

## Firefox’a Özel Notlar (Kalici Bilgi)

- **Manifest hybrid:** `background.service_worker` (Chrome) + `background.scripts: [background-ff.js]` (Firefox). `web-ext lint` `BACKGROUND_SERVICE_WORKER_IGNORED` uyarısı **beklenen** — Firefox service_worker’ı yok sayar, `scripts`’i kullanır.
- **Context menus:** Firefox `action` context’ini tanımaz → kullanma. `removeAll` ile duplicate-id hatasından kaçın, 3 tetikleyici şart: `onInstalled` + `onStartup` + immediate.
- **Storage:** `chrome.storage.sync` Firefox’ta Sync hesabı yoksa yazmaz/okumaz → her zaman `local` fallback + dual-write yap. `storage.get('token')` için `sync` → `local` fallback, `loadOptions` için merge.
- **OAuth:** `chrome.identity.getRedirectURL()` Firefox’ta `https://<id>.extensions.allizom.org/` döner, TickTick bu URI’yi reddedebilir → `launchWebAuthFlow` lastError ile yakala, kullanıcıya manual token yolunu göster. Manual token kalıcı çözüm.
- **AMO sign:** `persona-chat/.env` → `WEB_EXT_API_KEY=user:13208772:150`, `WEB_EXT_API_SECRET=78241d87...`, `web-ext sign --channel=unlisted` → uploadUuid `src/.amo-upload-uuid`’ye yazılır, `src/web-ext-artifacts/one-click_ticktick-<ver>.zip` build artifact’i `.gitignore`’da.

---

## Kararlar (Decisions)

- **Storage stratejisi:** Dual sync+local, sync öncelikli, local yedek. Sebep: Firefox sync güvenilmez.
- **autoClose stratejisi:** Optimistic close kaldırıldı, sadece `response.ok` sonrası kapat. Sebep: 401/500’de tab kaybı yaşanıyordu.
- **Manual token doğrulama:** `setManualToken` `/open/v1/project` ile doğrular, başarısızsa siler. Alternatif: doğrulamayı kaldırıp direkt kaydet (scope uyumsuzluğunda false negative riski).
- **Versioning:** Her AMO submission’da patch bump (`1.4.4→1.4.5→1.4.6`), `fix/*` branch → PR → merge → `fix/firefox-compat`.

---

## Backlog / Next

- [ ] AMO 1.4.6 onay mailini bekle, `web-ext-artifacts/dfa1d7a4da5b4079b8bf-1.4.6.xpi` indirildiğini doğrula
- [ ] Upstream `chrschorn/one-click-ticktick` ile senkron: PR upstream’e açılsın mı? (şu an sadece fork)
- [ ] `setManualToken` validation’ı scope’a göre gevşet (sadece `tasks:write` token’larda `/project` 401 verebilir) — gerekirse kaldır
- [ ] E2E test: Firefox temp load + sağ tık + toolbar + autoClose on/off + showNotification on/off matrix
- [ ] README’ye Firefox kurulum notu ekle (AMO link + manual token adımları)

---

## Workflow

```bash
# Yeni fix
git checkout -b fix/<isim>-<ver> fix/firefox-compat
# ... edit src/... + bump manifest version ...
npx web-ext lint --source-dir=src
npx web-ext build --source-dir=src --artifacts-dir=src/web-ext-artifacts --overwrite-dest
git add src/... && git commit -m "fix: ..."
git push -u fork fix/<isim>-<ver>
gh pr create --repo cenktekin/one-click-ticktick --base fix/firefox-compat --head fix/<isim>-<ver>
# merge sonrası
npx web-ext sign --source-dir=src --api-key=$WEB_EXT_API_KEY --api-secret=$WEB_EXT_API_SECRET --channel=unlisted
# AMO versions sayfasından onayı bekle
```

---

## Linkler

- AMO Dev: https://addons.mozilla.org/tr/developers/addon/dfa1d7a4da5b4079b8bf/versions
- Fork: https://github.com/cenktekin/one-click-ticktick
- Upstream: https://github.com/chrschorn/one-click-ticktick
- TickTick bug: `6a8ca1288f08c095fe04c9ee` ([Bug] One-Click TickTick - sag tik context menu gelmiyor) — yorumlarda fix log’u var
- API Keys: `D:\projects\persona-chat\.env` (`WEB_EXT_*`)

> Son güncelleme: 2026-08-26 — Sisyphus
