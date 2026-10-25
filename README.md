<img align="left" height=128 src="src/icons/icon256.png"> 

# One-Click TickTick

*One-Click TickTick* is an open source Chrome extension that simplifies creating a TickTick tasks from a website. It's available on the [Chrome Web Store](https://chrome.google.com/webstore/detail/one-click-ticktick/nbmkldaonngpkjagofgclbioanahipdp). 

If you frequently create TickTick tasks linking to a website you visit - maybe to visit again later or to remember something - One-Click TickTick is for you! Login once and saving a link to the current page is just one click away. 

## Installation

1. Go to the [Chrome Web Store Page](https://chrome.google.com/webstore/detail/one-click-ticktick/nbmkldaonngpkjagofgclbioanahipdp)
2. Install the extension
3. Click the extension button, which will take you to the options page, which explains the login+authentication procedure.

## Firefox port

This repository is a fork of [chrschorn/one-click-ticktick](https://github.com/chrschorn/one-click-ticktick) that adds Firefox support. Firefox ignores `background.service_worker`, so the manifest also declares a classic background script:

```json
"background": {
  "service_worker": "/service-worker.js",
  "type": "module",
  "scripts": ["/background-ff.js"]
}
```

`src/background-ff.js` is **generated** from `src/js/store.js`, `src/js/ticktickapi.js`, `src/js/oneclickticktick.js` and `src/service-worker.js` (imports stripped, exports removed). Never edit it by hand:

```bash
npm install --include=dev
npm run bundle   # regenerate src/background-ff.js
npm run check    # syntax + bundle freshness + privacy scan
npm run lint     # web-ext lint
npm run build    # web-ext build -> web-ext-artifacts/
```

To try it: open `about:debugging#/runtime/this-firefox` → *Load Temporary Add-on* → pick `src/manifest.json`.

### Login on Firefox

`chrome.identity.getRedirectURL()` returns `https://<extension-uuid>.extensions.allizom.org/` on Firefox and TickTick may reject that redirect URI. In that case the options page shows a **manual token** field: paste a TickTick Open API access token and it is validated against `api.ticktick.com/open/v1/project` before being stored. Storage writes to both `chrome.storage.sync` and `chrome.storage.local`, so the session survives when Firefox Sync is disabled.

### Self-distribution

The Firefox build is distributed unlisted. Sign it yourself with your own AMO credentials:

```bash
WEB_EXT_API_KEY=user:xxxxx:yyy WEB_EXT_API_SECRET=xxxxx \
  npx web-ext sign --source-dir=src --channel=unlisted
```

## About

User feedback upon clicking the extension button is immediate, even though the actual TickTick task creation can take a few seconds. Task creation is handled in the background and in the rare case of an error, the user is notified.

Several settings based on user feedback (see Chrome Store) and common use cases are available (see screenshots).

This extension is self-contained (i.e. includes all dependencies directly). It uses bulma and jQuery for the settings page, but is otherwise written in pure JavaScript with a thin wrapper around the [TickTick Open API](https://developer.ticktick.com/docs#/openapi).


### Contributing

Contributions are welcome

### Screenshots

<p align="center">
  <img src="assets/screenshot_extensionbutton.png"> 
  <br><br>
  <img src="assets/screenshot_contextmenu.png"> 
  <br><br>
  <img src="assets/screenshot_settings.png"> 
</p>