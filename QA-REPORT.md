# Journey QA - 2026-10-30

Scope: accessibility release prepared on `feature/accessibility-navigation` for `lolab413/planet-excode-mission-map`. The user authorized committing, merging, pushing, and production deployment. Existing work is preserved. This report records pre-release QA; production verification is reported separately.

## Outcome

**6 of 6 complete browser journeys passed**, plus the browser-integrated simulated gamepad/mixed-input test. The final runs report no uncaught page JavaScript errors.

A real mobile focus obstruction was found and fixed: the floating accessibility icon covered focused word-search letters near the bottom of a 320px viewport. Added scroll clearance in `public/word-search.css`; subsequent checks covered every cell under default settings and maximum letter/text/spacing settings in all six scenarios: **1,200 cell checks passed**.

## Environment and isolation

- Target: `http://127.0.0.1:4173`, serving the current local `public/` source.
- Chrome `156.0.8078.48`, Playwright `1.64.1` on Windows, headless.
- Fresh browser contexts for each journey; separate newly created profiles for native browser zoom. Personal browser profiles, sessions, cookies and progress were not accessed.
- Playwright was installed only in ignored `.qa-runtime/`. Production package manifests and lockfile were not changed.
- Actual 200% Chrome page zoom was configured in an isolated profile and verified with `devicePixelRatio=2`, CSS zoom `1`, visual viewport scale `1`, and a reduced CSS viewport of approximately 628 x 400. Profile zoom setup follows [Chromium's zoom preference implementation](https://chromium.googlesource.com/chromium/src/+/lkgr/chrome/browser/ui/zoom/chrome_zoom_level_prefs.cc).

## Complete journeys

| Scenario | Result | Focused cells checked |
| --- | --- | --- |
| desktop | PASSED | 200 |
| mobile-320 | PASSED | 200 |
| mobile-390 | PASSED | 200 |
| browser-zoom-200 | PASSED | 200 |
| optional-reduced-motion | PASSED | 200 |
| reduced-motion | PASSED | 200 |

Desktop: 1280 x 900. Mobile emulation: 320 x 740 and 390 x 844. Native zoom: a 1280 x 900 Chrome window at 200%. Reduced-motion scenarios separately cover the app setting and a browser-emulated device preference.

Each journey used keyboard actions for interaction. The saved generated solution was read as a test oracle; the actual activity still validated the selected endpoints. Each journey checked:

1. Reach Mission 1 using Tab, open its dialog, verify page focus stays off background controls, Escape, and return focus to the trigger.
2. Launch System Reboot and start the puzzle. Reach all 100 letters with visible, unobscured focus.
3. Recover a word using arrows and Enter/Space. Open Help and New board, cancel with Escape, and verify focus returns and progress survives.
4. Open Accessibility settings, cancel and reopen, enable larger letters/text, high contrast, selected-letter announcements and Wide spacing. Verify dialog reflow and keyboard access to its controls.
5. Close settings and verify unchanged letters, solution and recovered words. Reload and verify settings/progress persist.
6. Reach the last grid cell, cancel selection, leave the grid with Tab, and check all 100 cells again with enlarged settings.
7. Recover the remaining words, verify the completion overlay and focus, then Play again. Verify a fresh round with earned achievement retained.
8. Reset accessibility settings and verify default controls, preserved replay board and achievement.
9. Return to the map and verify Completed / Play again. Launch the replay round, finish it, and return using the completion dialog's explicit map link.

Layout assertions found no document horizontal overflow or dialog clipping in these final six scenarios. Focused actionable controls and grid-cell centers were checked against viewport bounds and browser hit testing. The settings dialog can scroll vertically; Done and Reset remain reachable. Screenshots of selected desktop, phone-emulated and zoomed states were visually reviewed.

Both reduced-motion scenarios suppressed the actual computed completion and cell animations. Device preference still applied after Reset.

## Simulated gamepad checks - not physical hardware

**Browser-integrated simulation: PASSED.** The Gamepad API was deliberately mocked with one standard-mapped controller. No physical-controller test was performed and no particular controller model is certified.

The browser test exercised real app handlers and DOM focus: D-pad navigation, primary selection, Back cancellation, explicit controller focus, controller-to-keyboard completion of one word, then touch and mouse recovery on the same board. It recovered SYSTEM, LOGIC and DATA without changing letters or solutions. Disconnect/reconnect preserved a pending selection. Controller reads stopped while disabled, disconnected and unfocused.

For the unfocused-page test, Playwright's forced-focus emulation was disabled. The observed state was `document.hasFocus()=false` and `document.hidden=false`; browser-hidden behavior is therefore covered by the separate fixture simulation, not claimed as a real hidden-tab test.

Additional fixture tests passed for hidden-page pause/resume, dead-zone and release thresholds, repeat timing, button latch, neutral gating, denied/unsupported API cases, and unchanged progress/completion storage.

Mobile touchscreen events were browser-emulated, not physical-phone testing. Keyboard actions were Playwright-generated browser inputs, not a manual assistive-technology session.

## Failures and corrections

| Finding | Disposition |
| --- | --- |
| Floating icon obscured focused letters 70, 80 and 90 (zero-based) at 320px with enlarged settings | **Fixed** with extra focus scroll clearance; all 1,200 final cell checks pass |
| Initial modal assertion rejected Tab reaching Chrome browser chrome | **Test corrected**: native dialogs prevent focus on background page controls but can allow browser chrome; Escape restoration passes |
| Initial gamepad background-page test kept polling while Playwright forced the page to report focused | **Test corrected** by disabling forced-focus emulation; real unfocused-page polling stops |
| Native-zoom screenshots were clipped by Playwright's screenshot DPR assumption | **Capture corrected** using a complete DevTools viewport capture; layout assertions and keyboard journey also pass |
| Supplementary `html { zoom: 2 }` stress diagnostic at 1280px showed map header horizontal overflow | **Retained diagnostic failure**, not a native-browser-zoom test; see `css-zoom-200-failure.png` and `initial-results.json`. The actual 200% Chrome zoom journey passes. No general CSS-zoom support claim is made |

## Artifacts and rerun

- [Final journey results](qa-results/journey-results.json)
- [Browser simulated-gamepad results](qa-results/gamepad-browser-results.json)
- [Initial run including CSS-zoom diagnostic](qa-results/initial-results.json)
- [320px completion screenshot](qa-results/mobile-320-completion.png)
- [200% native browser zoom completion screenshot](qa-results/browser-zoom-200-completion.png)

```powershell
npm.cmd install --prefix .qa-runtime --no-package-lock --no-save playwright
$env:QA_BASE_URL = 'http://127.0.0.1:4173'
node scripts/test-browser-journey.mjs
node scripts/test-browser-gamepad.mjs
node scripts/test-accessibility.mjs
node scripts/test-word-search.mjs
node scripts/test-mission-launch.mjs
node scripts/test-coordinate-keyboard.mjs
npm.cmd run build
```

All listed simulation/regression checks and the production build passed after the scrolling fix. Coordinate checks in this run are React-handler regressions; its complete rendered activity journey was not part of this word-search suite.

## Remaining limits

Screen-reader speech/output, physical controllers, physical phones, other browser engines and other zoom levels remain untested. These results are not universal controller compatibility or full accessibility-compliance certification. Production verification does not replace the pending physical-controller and screen-reader checks.
