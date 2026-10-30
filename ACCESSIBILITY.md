# Accessibility rollout and keyboard review

Branch: `feature/accessibility-navigation`. Existing work is retained. The user authorized this release to the existing Planet ExCode production project; deployment is verified separately.

## Audit and first implementation

| Surface | Existing behavior | First version |
| --- | --- | --- |
| Mission map | Native links and buttons; decorative future missions are not interactive | Skip link, consistent visible focus, optional shared settings, standard controller traversal |
| Mission chooser | Native modal with Escape, contained Tab navigation, and focus returned to opener | Controller traversal limited to the open dialog; B closes it |
| Settings | Map theme and word-search sound were separate native buttons | Native dialog grouped into Reading, Puzzle layout, Appearance, Navigation; saved preferences, Reset to defaults, device-motion explanation, and storage failure feedback |
| Word search | Roving Tab stop, arrows, Enter/Space endpoints, Escape, pointer drag/taps, live feedback | Home/End and Ctrl+Home/End; hint moves focus to the starting letter; controller input reuses existing selection and grid handlers |
| Help | Nonmodal disclosure; close button and local Escape restore focus | Shared keyboard/controller guide; controller can enter and leave help using shoulder buttons |
| Completion | Local edits added a modal, but closing tag and description reference were invalid | Correct dialog markup, review-board action, grid focus after dismissal; replay still preserves achievement |
| Coordinate plane | Practice placement required pointing; editor captured Tab; mission toggle was a custom button role | Enabled native x/y selection on all practice steps; Tab/Shift+Tab exits editor; Ctrl/Command+] indents; semantic mission toggle; named zoom/expand controls; labelled scroll regions and mission landmark |

No changes to the generator, word set, board dimensions, directions, hint rules, scoring, or completion storage. All new visual preferences default off; operating-system reduced motion is also respected. Accessibility is available from both headers and a shared floating person icon at the lower left. The icon has a 54px target, a visible focus ring, safe-area spacing, an accessible name, and a hover/focus label. The word-search help button stays on the opposite side.

The separate CoordinatePlaneLearningActivity checkout has the same shared settings and floating icon on branch `feature/floating-accessibility`, through its HTML shell so it persists across preflight and mission transitions. Build and TypeScript pass. This is local only; the mission map still launches the existing published coordinate URL. Preferences are stored separately for each website origin. The native map and word search share preferences; the separate coordinate website has its own settings.

## Requested checklist

| Requirement | Implementation / verification |
| --- | --- |
| Semantic controls and accessible names | Native buttons, checkboxes, selects, labels, fieldsets and legends; explicit names for coordinate zoom/expand buttons; no custom mission-toggle keyboard handler |
| Actions without mouse or dragging | Word search supports endpoints by keyboard or two taps; all preflight coordinates have enabled native selectors; mission code can be typed; Toolkit and Launch remain keyboard controls |
| Visible focus and no traps | Global focus rule also overrides the editor's inline outline reset; word-search and editor handlers allow both Tab and Shift+Tab; native settings controls use browser keyboard behavior |
| Dialog entry and exit | Native showModal with focused title or action; explicit close actions; settings and map restore the trigger; completion returns to the grid or replay |
| Clear settings and reset | Reading, Puzzle layout, Appearance and Navigation fieldsets; Reset to defaults and Done; expanded instructions are optional |
| Larger letters | Independent checkbox increases word-search letters and coordinate diagram labels without changing interface-text preference |
| Adjustable spacing | Default, Comfortable and Wide; changes cell gaps or rendered coordinate-diagram size, preserving the puzzle's data and rules |
| High contrast / reduced motion | Existing optional controls retained; media query always respects device reduced motion; device preference described in panel and rechecked when it changes |
| Local settings | Same storage key retained; existing Boolean preferences migrate; invalid/corrupt values fall back safely; storage errors allow visit-only use |
| Difficulty kept separate | No difficulty settings in this panel; no edits to board generator, target coordinates, mission unlocking, hint rules or completion logic |
| Mobile reachability | Optional enlarged grids scroll in labelled keyboard-focusable regions; focus scrolls letters into view; text/buttons reflow; larger-text word-search controls return to document flow; floating icon clears the default mobile toolbar; coordinate workspaces may scroll with larger text |

Follow-up verification now includes six isolated Playwright browser journeys covering keyboard focus, dialogs, mobile emulation, actual 200% Chrome zoom and reduced motion. The computer-use host remains unavailable; the user explicitly authorized Playwright. See QA-REPORT.md for results, the scrolling fix, and limitations. Screen-reader and physical-device testing remain pending.

## Word-search controls follow-up

Only the word-search page adds a **Word search controls** fieldset to Accessibility settings. It explains the always-available arrow, endpoint, cancellation and Tab controls, and offers **Announce selected letters**, off by default and saved in the existing accessibility preference record. Reset to defaults also clears this preference. The mission map does not show activity-specific controls.

The grid has concise screen-reader instructions. The starting cell is named as the starting letter and marked with a dot; selected cells have dashed outlines and `aria-selected`; recovered cells have double borders and an underline, and the word list has check marks, strikethrough, and recovery text. High contrast preserves the double-border cue. Feedback includes the chosen starting letter and coordinates, or the recovered word and progress count. Optional selection speech spells the current letters and gives their count, without changing the board. Escape also stops an active pointer drag, preventing a later release from recovering a canceled word.

Parity tests load one saved board independently for keyboard, clicks, two taps, dragging, and controller-style keyboard activation, and verify identical letters, solutions, and recovered words. Tests also cover optional speech, setting persistence/reset, starting-cell semantics, selection clearing, and canceled-drag release. Actual screen-reader announcements still need manual verification.

## Optional gamepad mode follow-up

The panel now has a separate **Optional gamepad mode** fieldset, with an explicit saved opt-in, connection status, and collapsed mapping/timing guide. No controller is required to access the site or settings. Shared source is also synced into the coordinate activity's local preview.

- D-pad / dominant left-stick axis navigates controls or letter cells. A / Cross selects; B / Circle cancels or closes. LB / RB moves between controls, including leaving composite grids and choices.
- Word-search primary selection dispatches Enter to its existing keyboard handler, and cancellation uses Escape. Other controls use their native click/change actions. Modal cancellation dispatches the cancellable native `cancel` event before closing.
- Controller focus has an explicit outline and contrasting outer ring, including a forced-colors cue; it is cleared when trusted mouse, touch, or keyboard input takes over. Input changes do not reset puzzle selection, board, or achievements.
- Stick activation threshold is 55%; release threshold is 40%. Directions wait 400 ms, then repeat every 150 ms. Action buttons latch until release. One action is dispatched per frame; delayed frames never produce catch-up bursts.
- Enabling, reconnecting, resuming the page, or switching away from other inputs requires neutral controls before controller actions resume. This prevents held buttons or sticks from moving/activating controls unexpectedly.
- Animation frames are canceled when disabled, hidden, unfocused, disconnected, or unsupported. No controller reads or frames continue in those states. Connection, focus and visibility events restart polling only when eligible. Denied Gamepad API access gives a status message and leaves other inputs usable.

Automated lifecycle tests cover all of these cases, including persistence of game-data sentinels, primary-to-keyboard dispatch, connection loss/resume, drift/repeat boundaries, inactive-frame cancellation and modal cancellation vetoes. Physical-controller testing remains pending. The browser-integrated Gamepad API simulation and six word-search journeys pass; see QA-REPORT.md. Coordinate code entry still uses a keyboard; controller mode supplies navigation and existing controls rather than an on-screen typing interface.

## Review locally

Open the mission map at `http://localhost:4173/` and launch System Reboot, or open `http://localhost:4173/word-search.html` directly.

1. Tab from the page start. Use the skip link, open Mission 1, cycle with Tab and Shift+Tab, then Escape. Verify focus returns to the launch control.
2. Open Accessibility. Toggle each setting, close and reopen it, and navigate between map and word search. Verify settings persist. Test larger letters independently of interface text and all three spacing choices. Reset restores the default presentation while retaining the device's reduced-motion preference.
3. Start the word search. Tab into the grid; use arrows, Home/End and Ctrl+Home/End. Choose first and last letters with Enter or Space. Escape clears selection; Tab leaves the grid. Hint announces and focuses its starting letter.
4. Finish all six words. Verify the success dialog appears above the activity. Review the board or play again. Return to the map and verify the achievement remains earned.
5. Enable gamepad navigation. Connect a standard mapped gamepad, press a button, then release the controls. D-pad / left stick navigates; A selects; B clears or dismisses; LB / RB goes to previous / next control and leaves the grid. Test dialogs, help, hints, completion, replay, and returning to the map. Switch to keyboard/touch/mouse and back, disconnect/reconnect, and hide/resume the page; verify progress remains and held controls do not activate until neutral. Nonstandard mappings are not supported yet.
6. Review on a narrow phone viewport and at 200% browser zoom, with each visual preference and both map themes.
7. Open the separate coordinate preview at `http://localhost:4174/`. Complete placement exercises using x/y selectors and Check point. In missions, verify Tab/Shift+Tab enters and leaves the code editor, Ctrl/Command+] indents, and Ctrl/Command+Enter launches. Check diagram scroll areas with Wide spacing and all zoom controls.

## Verification and remaining work

Automated checks run actual preference/controller handlers in a DOM fixture, actual word-search handlers, mission launch checks, and actual coordinate React handlers through an isolated hook fixture. They cover preference persistence/migration/validation, independent letters and text, spacing choices, device-motion messaging, blocked storage, controller opt-in, button latch/repeat, native choice changes, inactive/disconnected/unsupported controllers, modal scope, grid dispatch and Tab exit, keyboard endpoints and edges, replay, all four preflight coordinate targets, unchanged preflight completion gating, editor Tab/Shift+Tab exit, indentation, semantic toggle and named zoom controls. Both production builds and coordinate TypeScript pass.

The user authorized isolated Playwright testing after the computer-use connection failed. Browser keyboard journeys, layout checks and a browser-integrated mocked Gamepad API test now pass. A floating-icon focus obstruction found on phones was fixed and retested. Screen-reader announcements, physical controllers and physical phones remain untested. See QA-REPORT.md; this is not a WCAG certification.

Keyboard behavior follows the WAI-ARIA [grid pattern](https://www.w3.org/WAI/ARIA/apg/patterns/grid/) and native dialogs follow the [modal dialog pattern](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/).

Next review: manual screen-reader/controller sessions, physical phones, other browsers/zoom levels, and the separate published coordinate return-to-map completion flow. The local word-search keyboard journey at 320px and native 200% Chrome zoom has passed with maximum text/spacing. Cross-origin localStorage does not share preferences automatically; an explicit handoff would be a separate change.

For future native activities, include `accessibility.js` in the head and `accessibility.css` after the activity stylesheet, provide a `[data-accessibility-open]` button, and keep native links/buttons in logical DOM order. Composite games must supply their own arrow-key behavior; the shared controller translates arrows for `.cell` grids and otherwise traverses controls. New composite widgets need an explicit adapter and keyboard/assistive-technology tests before claiming controller support.
