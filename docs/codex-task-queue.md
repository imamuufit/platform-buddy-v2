# Codex Task Queue

Use this file as the working queue for Codex. Each task must become one small PR.

## Task order

1. Project charter and agent rules
2. Initial PWA shell
3. HOME screen
4. LOG screen
5. PLAN screen
6. DATA screen
7. MEET screen
8. Minimal Shiba Buddy layer
9. Old logic migration
10. Data migration helper

## Current task

### Task 1: Project charter and agent rules

Status: proposed in initial setup PR.

Purpose:

- Establish project boundaries before implementation.
- Prevent VBT/video/camera/motion-analysis features from entering the core app.
- Define the Shiba Buddy as a quiet spotter, not a character-heavy UI system.
- Define mobile-first UI principles for future Codex work.

Acceptance criteria:

- `AGENTS.md` exists.
- `docs/product-charter.md` exists.
- `docs/ui-principles.md` exists.
- `docs/no-vbt-policy.md` exists.
- This task queue exists.
- No app implementation is added in this PR.

## Next Codex task after merge

### Task 2: Initial PWA shell only

Codex prompt:

Build the initial Platform Buddy v2 PWA shell only.

Read and follow `AGENTS.md`, `docs/product-charter.md`, `docs/ui-principles.md`, and `docs/no-vbt-policy.md` before editing.

Scope:

- Create a minimal static PWA shell.
- Add HOME, LOG, PLAN, DATA, MEET navigation only.
- Make the layout mobile-first for 390px width.
- Add no business logic beyond switching views.
- Add no VBT, video, camera, motion tracking, or character-heavy UI.
- Use a cool, training-focused visual tone.

Expected files:

- `index.html`
- `src/styles.css`
- `src/main.js`
- `manifest.webmanifest`
- Optional minimal `sw.js` only if it does not rewrite HTML and only handles safe static caching.

Forbidden:

- VBT
- Video upload
- Camera
- Motion tracking
- Pose estimation
- Character-heavy UI
- Large background images
- Service Worker HTML rewriting
- Direct main push

Acceptance criteria:

- App loads locally as a static page.
- Navigation switches HOME / LOG / PLAN / DATA / MEET.
- First screen is readable at 390px width.
- No references to VBT, video, camera, Motion Analyzer, MediaPipe, BodyPix, or tracking.
- PR includes a short verification note.
