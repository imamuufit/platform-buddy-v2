# Old Platform Buddy Logic Audit

- Target repository: `imamuufit/platform-buddy-v2`
- Target branch for this audit PR: `codex/old-platform-buddy-logic-audit`
- Target issue: `#40`
- Audit date: 2026-07-06 JST
- Purpose: investigate the old Platform Buddy ZIP logic before migrating Buddy Method / PLAN generation / predicted PR behavior into Platform Buddy v2.

## Scope Decision

This pass is intentionally an audit and migration plan only.

No app runtime code, localStorage schema, PWA manifest, Service Worker, or UI behavior is changed in this PR. The next implementation PR should migrate a narrow, reviewable subset of the logic described below.

## Investigated ZIP Files

Primary ZIP:

- `C:\Users\tsuta\Documents\Codex\2026-04-29\new-chat-2\platform-buddy-v113-home-mobile-balance-20260528.zip`
- Extracted to `work\old-platform-buddy-audit\platform-buddy-v113-home-mobile-balance-20260528`
- Main related file: `app.js`

Cross-check ZIPs:

- `C:\Users\tsuta\Documents\Codex\2026-04-29\new-chat-2\platform-buddy-share-20260502-223056\platform-buddy-v112-14-method-recovery-plan-colors-20260527135200.zip`
- Extracted to `work\old-platform-buddy-audit\platform-buddy-v112-14-method-recovery-plan-colors-20260527135200`
- Main related file: `app.js`
- `C:\Users\tsuta\Documents\Codex\2026-04-29\new-chat-2\platform-buddy-share-20260511-buddy-method-v66.zip`
- Extracted to `work\old-platform-buddy-audit\platform-buddy-share-20260511-buddy-method-v66`
- Main related file: `app.js`

The v113 ZIP is the most complete source found in the local archive. v112-14 and v66 confirm that the Buddy Method settings and prediction/plan branches were not isolated one-off code.

## Current v2 Difference

The current `main` branch of Platform Buddy v2 has a calm static PWA shell with HOME / LOG / PLAN / DATA / MEET, simple LOG draft persistence, e1RM preview, MEET memo persistence, and MEET attempt draft persistence.

It does not yet contain the old app's Buddy Method cycle generator:

- no target selector for `BIG3` vs `bench_only`;
- no weekly frequency branch for 3 / 4 / 5 days;
- no accessory-volume branch for low / normal / high;
- no current 1RM settings per target lift;
- no experience-level branch;
- no priority-lift branch;
- no predicted PR range;
- no generated weekly/day PLAN content from those settings.

## Found Storage / State Fields In Old Logic

The old `defaultCycle()` in v113 includes the core cycle fields:

- `length`
- `daysPerWeek`
- `planTarget`
- `programMethod`
- `buddyLevel`
- `accessoryVolume`
- `priorityLift`
- `experienceLevel`
- `week`
- `maxes.squat`
- `maxes.bench`
- `maxes.deadlift`

Important normalizers in old logic:

- `planTarget` accepts `big3` or `bench_only`.
- `programMethod` accepts `platform`, `rebuild16`, `hps`, `531`, `smolov_jr`.
- `buddyLevel` accepts `level1` or `level2`.
- `priorityLift` accepts `total`, `squat`, `bench`, `deadlift`.
- `experienceLevel` accepts `beginner`, `intermediate`, `advanced`.
- `maxes` is merged with default SQ/BP/DL keys.

Migration note: v2 should start with the Platform Buddy / Buddy Method subset, not every old program method. `hps`, `531`, `smolov_jr`, and export-oriented paths can remain out of scope unless the owner explicitly requests them.

## Found Plan Generation Logic

Primary functions in v113 `app.js`:

- `programMethodInfo()`
- `methodDefaults()`
- `allowedCycleLengths()`
- `allowedDaysPerWeek()`
- `applyProgramRules()`
- `cyclePhase()`
- `projectedPrRange()`
- `prescriptionForWeek()`
- `level2PrescriptionForWeek()`
- `intensityForWeek()`
- `weeklyTemplate()`
- `buddyLevel2Template()`
- `currentCheckTemplate()`
- `finalMeetTemplate()`
- `priorityDay()`
- `accessoryLimitFor()`
- `adjustAccessories()`
- `extraAccessoryFor()`

The core Platform Buddy path is:

1. Normalize cycle settings.
2. Determine phase by week and cycle length.
3. Select active lifts from target type.
4. Generate 3 / 4 / 5 day templates.
5. Insert priority-lift volume or technique work when applicable.
6. Calculate main prescriptions from current 1RM or best e1RM.
7. Limit accessories by weekly frequency, accessory volume, and phase.
8. Reduce accessory work near peaking and remove it on final meet/MAX check week.

## Target Selection Logic

Old app behavior:

- `big3` activates SQ / BP / DL.
- `bench_only` activates only BP and forces `priorityLift = "bench"`.
- Program methods can further restrict lifts, but that should not be migrated yet unless requested.

v2 migration recommendation:

- Add a simple `target` setting with `big3` and `bench_only`.
- For `bench_only`, hide or de-emphasize SQ/DL current 1RM inputs and generate BP-only PLAN days.
- Do not add old non-Buddy method branches in the first migration.

## Weekly Frequency Logic

Old app behavior:

- Buddy Method allows 3 / 4 / 5 days per week.
- 3 days uses one main SQ/BP/DL structure with some secondary technique work.
- 4 days adds a second BP volume day.
- 5 days splits work into shorter high-intent days with more BP exposure and recovery/light days.
- Higher frequency slightly increases predicted PR potential but adds fatigue discount.

v2 migration recommendation:

- Implement 3 / 4 / 5 day templates for Buddy Method only.
- Keep day text compact and mobile-first.
- Show generated week/day content in PLAN before configuration details.

## Accessory Volume Logic

Old app behavior:

Accessory cap by days/week and selected volume:

- 3 days: low 2, normal 3, high 4
- 4 days: low 1, normal 2, high 3
- 5 days: low 1, normal 1, high 2

Phase modifiers:

- final PR / meet-check phase: 0 accessories;
- peaking: reduce accessory count;
- level2 peaking: reduce more aggressively by weeks-out;
- bridge week: keep only minimal accessory work;
- high accessory volume in strengthening phase is reduced by one to control fatigue.

v2 migration recommendation:

- Migrate the cap table and phase reductions.
- Start with a smaller accessory pool than the old app so the v2 UI remains readable.
- Keep accessory choices as suggestions, not a large exercise database.

## Current 1RM / e1RM Logic

Old app behavior:

- BIG3 target stores SQ / BP / DL current 1RM.
- Bench-only target needs BP only.
- If a current 1RM is missing, old logic can fall back to the best saved e1RM for that lift.
- e1RM formula in old app: `weight * (1 + reps / 30)`, rounded to 0.1 kg.

Current v2 behavior:

- LOG preview uses the same Epley-style formula but rounds to 0.5 kg and limits preview to 1-12 reps.

v2 migration recommendation:

- Preserve v2's current e1RM preview behavior for LOG.
- Use the same formula consistently for DATA and PLAN fallback.
- Store explicit current 1RM separately from saved logs.

## Predicted PR Logic

Old app function: `projectedPrRange(liftId, max, length, daysPerWeek, priorityLift, athlete)`.

Inputs:

- lift;
- current max or best e1RM;
- cycle length;
- days per week;
- priority lift;
- athlete context multiplier from total/bodyweight and weight class.

Base gain presets:

- SQ: 10-week 2.5-5.5%, 12-week 3.5-7.0%, cap 22.5 kg.
- BP: 10-week 3.5-7.5%, 12-week 5.0-9.0%, cap 12.5 kg.
- DL: 10-week 2.5-5.5%, 12-week 3.5-7.0%, cap 25 kg.

Modifiers:

- priority lift: selected lift 1.08, total 1.00, non-priority 0.96;
- days/week: 3 days 1.02, 4 days 1.06, 5 days 1.08;
- fatigue discount: 3 days 0, 4 days 0.005, 5 days 0.0125;
- context multiplier decreases as total/bodyweight becomes more advanced;
- result rounds to 2.5 kg.

v2 migration recommendation:

- Migrate as a conservative "predicted PR range" or "final week challenge candidate".
- UI copy must avoid definitive language such as "will hit".
- Suggested labels: `到達目安`, `予測PR`, `最終週の挑戦候補`.

## Experience-Level Logic

Old app behavior:

- `beginner`: Buddy Method Lv1 preferred; current check is 3-5 reps @8.
- `intermediate`: current check is a heavy single around 88% @8-9.
- `advanced`: current check is a heavy single around 92% @9.
- Lv2 is treated as intermediate+ and uses more high-intensity single exposure, wave-like weekly loading, and stricter peaking fatigue control.

v2 migration recommendation:

- Start with `beginner`, `intermediate`, `advanced`.
- Let experience alter current-check guidance, conservatism, and whether Lv2-style high-intensity suggestions are exposed.
- Do not expose aggressive Lv2 defaults to beginners.

## Priority-Lift Logic

Old app behavior:

- `total` preserves balanced templates.
- `squat`, `bench`, `deadlift` insert extra priority volume/technique work on a specific day depending on weekly frequency.
- Bench-only forces bench priority.
- Predicted PR range also uses priority as a multiplier.

Priority insertion table found:

- 3 days: SQ index 1, BP index 2, DL index 1
- 4 days: SQ index 3, BP index 2, DL index 3
- 5 days: SQ index 3, BP index 4, DL index 4

v2 migration recommendation:

- Add priority lift setting: total balance / SQ / BP / DL.
- In bench-only, force BP.
- Keep inserted focus work concise in PLAN.

## Meet / Final Week Logic Found

Old app final-week behavior:

- final phase becomes a meet-style MAX check;
- Day1 is light technique work around 60-70%;
- Day2 is rest;
- Day3 is SQ/BP/DL attempt-style work;
- first attempt is conservative, second builds total, third references predicted PR range.

Old attempt helper shape:

- first: approximately conservative range below predicted PR and around current max;
- second: around 94-98% of predicted low;
- third: predicted PR low-high range.

v2 migration recommendation:

- Reuse the conservative framing, not exact meet-day UI from old app.
- Keep MEET attempt suggestions labeled as suggestions.
- Do not turn this into commentary material or external meet document generation.

## Old Logic Not To Migrate Now

Do not migrate in the next app implementation pass:

- VBT, video, camera, movement analysis, pose estimation, velocity, plate tracking.
- Service Worker HTML rewriting or runtime UI patch layers.
- PL Commentary Bank, HPA, PDFs, A4 print layouts, athlete roster or commentary data.
- Old ZIP/manual upload workflow.
- Large character systems or background character art.
- Excel/XLSX export and broad report generation.
- Full old multi-method program set unless separately requested.

Potentially defer:

- `hps`, `531`, `smolov_jr`, `rebuild16`.
- Large accessory/facility exercise database.
- Multi-athlete state.
- Import/export backup.

## Proposed Next Implementation Slice

Recommended next PR purpose:

`Migrate Buddy Method settings and predicted PR into v2 PLAN`

Suggested files:

- `src/storage.js`
- `src/main.js`
- optionally `src/training-math.js`
- optionally `src/buddy-method.js`
- `src/styles.css`

Suggested storage keys:

- preserve existing keys;
- add `platformBuddy.buddyMethodSettings`;
- add only if needed, with migration notes: `platformBuddy.trainingLogs` and `platformBuddy.planSettings`.

Minimum behavior for next implementation:

- PLAN settings: target, days/week, accessory volume, current 1RM, experience, priority lift.
- PLAN output: generated today/week prescription from stored settings.
- predicted PR range: shown as non-definitive guidance.
- HOME/DATA can read the settings later, after PLAN migration is stable.

## Verification Performed For This Audit

Verified:

- Found local old ZIP candidates under `C:\Users\tsuta\Documents\Codex\2026-04-29\new-chat-2`.
- Extracted and inspected v113, v112-14, and v66 old Platform Buddy ZIPs.
- Confirmed relevant old logic is in `app.js`.
- Read current repo guidance: `AGENTS.md`, `README.md`, `docs/product-charter.md`, `docs/no-vbt-policy.md`, `docs/codex-entry-brief.md`, `docs/codex-completion-handoff.md`.
- Fetched current `main` versions of `src/main.js`, `src/storage.js`, `index.html`, and `manifest.webmanifest` for comparison.
- Confirmed this PR does not edit app runtime files.

Not verified in this audit:

- Mobile 390px runtime UI, because no app UI changed.
- GitHub Pages deployment, because no deployable app behavior changed.
- PWA installability, because manifest/runtime files were not changed.
- Full old ZIP line-by-line audit outside the Buddy Method / PLAN / prediction path.

## Data And PWA Impact

Storage impact:

- None in this PR.
- No localStorage keys are added, removed, renamed, or migrated.

PWA cache impact:

- None in this PR.
- No Service Worker or manifest file is changed.

User data impact:

- None in this PR.
- No existing LOG, DATA, MEET, PLAN, or localStorage data is modified.

## Explicit Scope Guard

This audit does not add VBT, video analysis, camera features, movement tracking, pose estimation, plate tracking, velocity estimation, Service Worker HTML rewriting, runtime UI patch layers, PL Commentary Bank / HPA / PDF features, large character systems, or noisy gamification.
