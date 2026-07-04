# Codex completion handoff

Last updated: 2026-07-04 JST

This document is the handoff for bringing Codex back into Platform Buddy v2.

Read this together with:

- `AGENTS.md`
- `README.md`
- `docs/product-charter.md`
- `docs/no-vbt-policy.md`

## Executive summary

Platform Buddy v2 is a clean rebuild of the user's personal powerlifting training app.

The current app is a mobile-first, one-lifter training cockpit with five surfaces:

1. HOME: decide what to do today.
2. LOG: record training quickly.
3. PLAN: see today's prescription.
4. DATA: decide the next adjustment.
5. MEET: prepare for competition.

The owner now wants a broad completion pass. Until now, ChatGPT has been advancing the app through small, safe PRs and hourly automation. That process is stable but too incremental for the current need. Codex is being reintroduced to produce a complete usable app shape across the five screens.

## Do not confuse this project with other repositories

This repository is `imamuufit/platform-buddy-v2`.

It is not:

- `imamuufit/total-academy`, the older Platform Buddy project.
- `imamuufit/pl-commentary-bank`, the separate PL Commentary Bank / HPA commentary database and PDF tool.

PL Commentary Bank is for athlete research, commentary staff material, venue information, HPA data, and PDF-style competition documents. None of that belongs in Platform Buddy v2.

Platform Buddy v2 is for one lifter's own training decisions, logs, RPE learning, data judgment, and meet preparation.

## Historical workflow context

### Older workflow

Earlier app iterations were sometimes produced as ZIP files. The owner then manually uploaded or replaced files.

That workflow caused problems:

- the repository could drift from the live app;
- review history was weak;
- broad ZIP replacement made it hard to see what changed;
- old VBT, video, camera, Service Worker, and UI patching ideas could re-enter the app;
- Platform Buddy and PL Commentary Bank concerns could be mixed accidentally.

### Current workflow

The current workflow is GitHub-first:

- changes happen on branches;
- changes are reviewed through pull requests;
- ChatGPT only merges after explicit owner approval;
- no direct push to `main`;
- hourly ChatGPT automation has been used for small, finished units;
- each automated pass has generally completed one narrow purpose before moving on.

This workflow is safer, but it has produced many tiny improvements. The owner now wants Codex to make a broader app-wide completion pass while preserving the same repository discipline.

## Current implementation state

The current app is static-first with some localStorage-backed draft behavior.

Implemented:

- PWA shell with `index.html`, `manifest.webmanifest`, `src/main.js`, `src/styles.css`.
- Five bottom nav surfaces: HOME / LOG / PLAN / DATA / MEET.
- Active tab persistence through `platformBuddy.activeView`.
- LOG draft inputs persisted locally through `platformBuddy.logDraft`.
- LOG e1RM preview using a simple Epley-style estimate: `weight * (1 + reps / 30)`, rounded to 0.5 kg, limited to 1-12 reps.
- LOG RPE helper text.
- PLAN static prescription card and static cycle panel.
- DATA static judgment panel.
- MEET static readiness order, attempt notes, checklist, white-light focus, Buddy note.
- MEET attempt draft persistence through `platformBuddy.meetAttemptDraft`.
- MEET memo persistence through `platformBuddy.meetMemo`.

Not yet complete:

- durable training log history;
- session history list;
- edit/delete saved sets;
- PLAN driven by stored settings or log history;
- DATA calculated from stored logs;
- MEET date and D-day logic;
- meet settings;
- attempt candidate logic;
- import/export backup;
- PWA icons;
- user-facing validation and empty states;
- useful first-run default sample state.

## Product boundary remains strict

Do not add these to the core app:

- VBT tab or VBT cards;
- video upload;
- video analysis;
- camera capture;
- motion tracking;
- pose estimation;
- plate tracking;
- velocity estimation;
- MediaPipe;
- BodyPix;
- optical flow;
- AI movement scoring;
- large character systems;
- gacha, XP, levels, missions, character growth;
- Service Worker HTML rewriting;
- runtime UI patch layers;
- multi-athlete coaching CRM;
- PL Commentary Bank features.

The old repository may be referenced only for non-video training logic ideas:

- PR cycle logic;
- RPE logic;
- e1RM logic;
- wellness checks;
- DATA judgment;
- MEET preparation;
- white-light quiz;
- Buddy comment wording;
- data migration strategy.

Do not copy old VBT/video/camera/Service Worker behavior.

## Completion target for Codex

Build a coherent, usable vertical slice across all five screens.

The goal is not a perfect long-term architecture. The goal is a usable v2 app shape that the owner can open on mobile and understand immediately.

### 1. Data model and storage

Create a small localStorage-backed app state.

Suggested keys:

- `platformBuddy.activeView`
- `platformBuddy.logDraft`
- `platformBuddy.trainingLogs`
- `platformBuddy.planSettings`
- `platformBuddy.meetSettings`
- `platformBuddy.meetAttemptDraft`
- `platformBuddy.meetMemo`
- `platformBuddy.checklistState`

Use plain JSON. Keep migration safe:

- tolerate missing keys;
- tolerate malformed JSON;
- preserve existing draft keys;
- never wipe current local data without explicit user action.

### 2. LOG completion

LOG must become useful as the primary input surface.

Required:

- lift selection: Squat / Bench press / Deadlift / accessory or memo-compatible fallback;
- date field, defaulting to today;
- weight, reps, RPE, memo;
- save as a real log entry, not only a draft;
- show the most recent entries;
- allow deleting an entry with clear intent;
- keep the e1RM preview and RPE helper;
- keep input fast on mobile.

Optional but useful:

- set IDs using timestamp + random suffix;
- session grouping by date;
- simple total volume display.

### 3. HOME completion

HOME should read stored state and answer: what should I do today?

Required:

- show next recommended action based on recent log and plan settings;
- show current readiness/status;
- show recent best e1RM or latest top set per main lift;
- show meet countdown if meet date is set;
- show one concise Buddy note;
- remain useful at about 390px width.

Do not turn HOME into a dense analytics dashboard.

### 4. PLAN completion

PLAN should become editable enough to guide training.

Required:

- choose today's main lift;
- store top set target, backoff target, target RPE, and adjustment rule;
- show the plan before configuration;
- allow editing plan settings in a compact section;
- save settings locally.

Recommended simple logic:

- if no plan exists, provide a safe default plan;
- if recent RPE is high, advise holding or reducing load;
- if recent completion is clean and RPE is moderate, advise small progression;
- keep recommendations conservative.

### 5. DATA completion

DATA should calculate simple training judgment from saved logs.

Required:

- calculate e1RM per saved top set using the same simple formula currently used in LOG;
- show recent e1RM trend per lift;
- show latest top set per lift;
- show RPE drift from recent entries;
- show completion/readiness judgment in plain text;
- show next recommendation before any chart-like display.

Avoid heavy charts unless the implementation stays small and readable.

### 6. MEET completion

MEET should reduce competition anxiety.

Required:

- meet date input;
- D-day calculation from meet date;
- meet settings persistence;
- SQ/BP/DL attempt draft persistence;
- meet memo persistence;
- checklist items with checked state;
- white-light command reminders;
- attempt candidate helper from recent e1RM when available.

Attempt helper guidance:

- opener: conservative, roughly 90-93% of recent reliable e1RM;
- second: roughly 95-98%;
- third: only suggest after second-attempt feedback, roughly 100-102% when readiness supports it;
- label all attempt numbers as suggestions, not commands.

Do not create aggressive max calculators that encourage reckless attempt selection.

### 7. Backup / portability

If time allows, add simple export/import JSON backup.

Rules:

- do not use ZIP;
- export app state as JSON;
- import must warn that local data will be overwritten;
- validate version shape before import;
- keep this secondary to LOG/PLAN/DATA/MEET completion.

### 8. PWA polish

If time allows:

- add simple generated icons or document that icons are still pending;
- preserve the manifest;
- avoid Service Worker HTML rewriting;
- do not add a complicated offline strategy in the completion pass.

## Design and UX rules

- Mobile first.
- Review at approximately 390px width.
- One screen, one purpose.
- LOG must be faster than writing a paper note.
- PLAN must show today's work before settings.
- DATA must show judgment before charts.
- MEET must show readiness before education.
- Buddy should be quiet and secondary.
- Japanese copy is acceptable and preferred for user-facing text, but concise English labels are also acceptable where already used.
- Avoid noisy dashboards.
- Avoid heavy animations.
- Avoid large background character art.

## Suggested implementation style

The current app is static HTML + CSS + JavaScript modules. Prefer to keep it that way unless a framework is absolutely necessary.

Recommended file split:

- `src/storage.js`: storage keys and safe read/write helpers.
- `src/main.js`: view rendering and event binding.
- `src/training-math.js`: e1RM, trend, RPE helper, attempt helper.
- `src/default-state.js`: safe defaults.
- `src/meet-attempt-notes.js`: existing static attempt notes.
- `src/styles.css`: mobile-first styles.

Keep PRs understandable. If the completion pass becomes too large, split by vertical slice:

1. storage + LOG history;
2. PLAN settings;
3. DATA calculations;
4. MEET settings/checklist/attempt helper;
5. HOME summary polish.

However, the owner specifically wants the app to reach a complete shape, so do not stop after tiny copy-only changes.

## Verification required

Report exact checks in the PR.

Minimum manual checks:

1. Open app at mobile width around 390px.
2. Navigate HOME / LOG / PLAN / DATA / MEET.
3. Save a LOG entry.
4. Reload and confirm saved entry remains.
5. Confirm e1RM preview still works for 1-12 reps.
6. Confirm DATA changes after adding a log.
7. Save PLAN settings, reload, confirm persistence.
8. Set MEET date, reload, confirm D-day persistence.
9. Edit SQ/BP/DL attempt drafts, reload, confirm persistence.
10. Check and uncheck MEET checklist items, reload, confirm persistence.
11. Confirm no VBT/video/camera/motion-tracking UI exists.
12. Confirm PL Commentary Bank/HPA/PDF concepts do not appear.

If no automated test/build exists, state that clearly.

## Pull request expectations

Every Codex PR should include:

- summary;
- files changed;
- exact manual verification;
- explicit scope guard confirming no VBT/video/camera/motion tracking/PL Commentary Bank features;
- storage schema notes if keys change;
- screenshots only if helpful, not required.

No direct pushes to `main`.
Do not merge without the owner approving the PR.

## Owner intent in plain language

The owner is satisfied that the hourly automation is careful. The problem is speed and completion shape. The app needs to stop feeling like isolated panels and start feeling like one usable powerlifting cockpit.

Codex should now help complete the broad v2 app shape while respecting the strict boundaries that made v2 stable in the first place.
