# Planet ExCode - first prototype

This package contains the mission map, Day/Night toggle, and activity chooser. It is separate from CoordinatePlaneLearningActivity. No game or lesson has been copied into it.

## GitHub repository

Prepared target: `lolab413/planet-excode-mission-map`, branch `main`.
This repository has NOT been created or uploaded by this preparation task. No existing matching repository was found among the accessible GitHub repositories. Do not import `CoordinatePlaneLearningActivity` for this map.

Create a new repository with that name (private is fine), and put the CONTENTS of this folder at its root. Include `public/`, `scripts/`, `package.json`, `package-lock.json`, `vercel.json`, `.gitignore`, and this README. Do not upload the parent folder or generated `dist/` as a nested project. The GitHub account connecting to Vercel must have access to the repository.

## Exact Vercel import settings

| Setting | Value |
| --- | --- |
| Repository | `lolab413/planet-excode-mission-map` (create/upload first) |
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
