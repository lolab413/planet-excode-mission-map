# Planet ExCode - first prototype

This package contains the mission map, Day/Night toggle, and activity chooser. It includes the native System Reboot word search and remains separate from CoordinatePlaneLearningActivity.

## GitHub repository

Repository: `https://github.com/lolab413/planet-excode-mission-map`, production branch `main`.

Edit the source files in `public/`, including `accessibility.js` and `accessibility.css` shared by the map and native word search. These are the exact source files copied into `dist/` by `npm run build` and served by Vercel. Do not edit generated `dist/` or the older Sites/export copies. Commit source and configuration; generated output is ignored.

This checkout tracks `origin/main`. Use `git pull --ff-only` before changes, run `npm run build`, commit, and push to `origin main`. Keep `vercel.json`, package files, and the build script intact unless intentionally changing deployment. The GitHub integration in Codex is already connected; its write API can commit updates. A terminal Git push uses separate local credentials: if Git Credential Manager prompts, choose browser sign-in and authenticate as `lolab413`. Never put a token in the remote URL. GitHub sign-in for editing does not add a visitor login requirement to the website.

## Exact Vercel import settings

| Setting | Value |
| --- | --- |
| Repository | `lolab413/planet-excode-mission-map` |
| Production branch | `main` |
| Project name | `planet-excode-mission-map` |
| Framework preset | Other |
| Root directory | `.` (repository root) |
| Build command | `npm run build` |
| Output directory | `dist` |
| Install command | `npm ci` |
| Node.js version | 24.x |
| Environment variables | None |

The checked-in vercel.json supplies the build, install, framework, and output settings. There are no npm dependencies. The build validates source files and copies public/ to dist/ without transforming the existing UI.

To make the prototype accessible without signing in, open Vercel Project Settings > Deployment Protection and ensure Vercel Authentication and Password Protection do not protect the production domain. For this fully public prototype, use no deployment protection. Share the stable production domain assigned by Vercel, not a protected preview URL. Confirm in an incognito window after deployment. This is a dashboard setting, not an application authentication change.

## Hosting audit

- No ChatGPT/OpenAI SDK, authentication, session cookies, API requests, environment variables, server functions, database, or hosted storage.
- The original `.openai/hosting.json` only identified the previous Sites deployment. It is intentionally absent from this standalone package, along with its Git history and hosting metadata.
- All application files and the mountain image are local static assets using relative paths.
- Google Fonts is an optional external stylesheet; fallback fonts are supplied.
- Day/Night, accessibility settings, and word-search progress use optional browser localStorage. There are no user accounts. Preferences are scoped to the origin; the separate coordinate website has its own settings.
- Word search opens the native `./word-search.html` activity. Previous Genially URL (reference only): https://view.genially.com/696fd4180faa26d59386f646.
- Coordinate activity uses its separately published URL and retains independent completion and return tracking.
- No runtime rewrite or authentication removal is needed. Vercel serves only dist/, not project metadata.

## Activity configuration

Edit `public/mission-config.js`, then rebuild/redeploy:

- `coordinateActivityUrl`: `https://coordinate-plane-learning-activity.vercel.app/` (separate activity).
- `wordSearchUrl`: `./word-search.html` (native activity).
- Previous word search: https://view.genially.com/696fd4180faa26d59386f646 (reference only; no longer launched).

The word search saves its board and discoveries under `planet-excode-system-reboot-core-concepts-progress-v1` and earned completion under `planet-excode-word-search-completed-v1`. Replay creates a fresh board without clearing earned completion. Coordinate Plane storage is independent.

## Local verification

Use Node.js 24, then run:

```sh
npm run build
node scripts/test-word-search.mjs
node scripts/test-mission-launch.mjs
node scripts/test-accessibility.mjs
python -m http.server 4173 --bind 127.0.0.1 --directory dist
```

Open http://127.0.0.1:4173/ and launch Mission 1 > System Reboot. Check desktop and phone layouts, tap/drag/keyboard selection, hints, definitions, completion, replay, and return to map. Confirm Coordinate Plane remains a separate destination. Saved progress is scoped to the browser origin, so use the same hostname and port when resuming.

The build checks local asset references, JavaScript syntax, output byte parity, and activity URL format (including the native word-search path). It rejects ChatGPT runtime URLs, localhost runtime URLs, and replacement characters. Fixture tests cover game logic and simulated controller lifecycle behavior.

For isolated browser journeys, install Playwright outside the production package and target a running local preview:

```powershell
npm.cmd install --prefix .qa-runtime --no-package-lock --no-save playwright
$env:QA_BASE_URL = 'http://127.0.0.1:4173'
node scripts/test-browser-journey.mjs
node scripts/test-browser-gamepad.mjs
```

The browser scripts use fresh profiles/contexts and write evidence to `qa-results/`. They use installed Chrome; they do not open personal browser sessions. `test-coordinate-keyboard.mjs` is an optional regression check requiring the separate CoordinatePlaneLearningActivity checkout and its TypeScript dependency. It does not deploy that project.

See [QA-REPORT.md](QA-REPORT.md) for results and limits. Browser-emulated touch and mocked Gamepad API checks are simulations. Physical controller and screen-reader testing remain pending; these checks are not a full accessibility-compliance assessment. No deployment is implied by a local build.

References: https://vercel.com/docs/builds/configure-a-build and https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication
