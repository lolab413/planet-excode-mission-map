# Planet ExCode - first prototype

This package contains the mission map, Day/Night toggle, and activity chooser. It is separate from CoordinatePlaneLearningActivity. No game or lesson has been copied into it.

## GitHub repository

Repository: `https://github.com/lolab413/planet-excode-mission-map`, production branch `main`.

Edit `public/index.html`, `public/styles.css`, `public/app.js`, `public/theme.js`, and `public/mission-config.js`. These are the exact source files copied into `dist/` by `npm run build` and served by Vercel. Do not edit generated `dist/` or the older Sites/export copies. Commit source and configuration; generated output is ignored.

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
- The Day/Night preference uses optional browser localStorage. There are no user accounts. Preferences are scoped to the new origin, so the old domain's saved choice does not transfer.
- Word search opens the existing external Genially URL. Its availability remains controlled by Genially; this package does not recreate it.
- Coordinate activity remains disabled until a published playable URL is supplied. No localhost link is included.
- No runtime rewrite or authentication removal is needed. Vercel serves only dist/, not project metadata.

## Activity configuration

Edit `public/mission-config.js`, then rebuild/redeploy:

- `coordinateActivityUrl`: empty; Play remains disabled with “Activity link coming soon”.
- `wordSearchUrl`: `https://view.genially.com/696fd4180faa26d59386f646`.

## Local verification

Use Node.js 24, then run `npm ci` and `npm run build`. Serve `dist/` using a static HTTP server. Verify the landing page loads without login, toggle Day/Night and reload, open Mission 1 from either control, confirm coordinate Play is disabled and word-search Play is enabled, and close with Close/Escape. Check desktop and mobile layouts.

The build checks local asset references, JavaScript syntax, output byte parity, and public activity URL format, and rejects ChatGPT runtime URLs, localhost URLs, and replacement characters. It does not claim remote Genially availability or verify a Vercel deployment before one exists.

References: https://vercel.com/docs/builds/configure-a-build and https://vercel.com/docs/deployment-protection/methods-to-protect-deployments/vercel-authentication
