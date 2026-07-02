# AGENTS.md

This repository is the clean rebuild of Platform Buddy v2.

Platform Buddy v2 is a mobile-first powerlifting training cockpit. It is not a VBT app, video analysis app, motion tracking app, character game, or general fitness social app.

## Product role

Build a fast, calm, training-focused PWA for one lifter to plan, log, review, and prepare for meets.

Primary surfaces:

1. HOME: decide what to do today.
2. LOG: record a set as fast as possible.
3. PLAN: show today's training prescription.
4. DATA: help decide the next training adjustment.
5. MEET: prepare for competition.

## Hard prohibitions

Do not add any of the following unless a specific issue explicitly requests it and the product lead approves it:

- VBT
- Video analysis
- Motion tracking
- Camera features
- MediaPipe, BodyPix, pose estimation, optical flow, plate tracking, or frame analysis
- Video library, video form note, or two-video comparison
- Character-heavy UI
- Large background illustration systems
- Excessive gamification such as XP, levels, gacha, missions, or character growth
- Service Worker HTML rewriting or runtime UI patch layers
- Direct pushes to `main`

## Character policy

The Shiba Buddy may exist only as a quiet spotter.

Allowed:

- Small icon or avatar
- One short Buddy comment per screen
- Subtle feedback after save, warning, or PR update

Not allowed:

- Large character panels
- Background character art
- Multiple character teams
- Character-driven layout
- Mascot behavior that slows set logging

## UI principles

- Mobile first, with 390px width as the primary review target.
- One screen, one purpose.
- The first visible area must answer the user's next action.
- LOG must be faster than writing a paper note.
- PLAN must show today's work before configuration.
- DATA must show judgment before charts.
- MEET must show readiness before learning content.
- Details belong in accordions or secondary sections.
- Avoid visual novelty unless it improves training use.

## Development rules

- One PR per purpose.
- Keep PRs small and reversible.
- Preserve training logic when migrating from `imamuufit/total-academy`.
- Do not import VBT/video code from the old repository.
- Do not change storage schema without a migration note.
- Do not merge without explicit owner confirmation.
- If tests or checks are not run, state that clearly in the PR.

## Old repository use

Use `imamuufit/total-academy` only as a reference for:

- PR cycle logic
- RPE logic
- e1RM logic
- Wellness checks
- DATA judgment
- MEET preparation
- White-light quiz
- Buddy comment wording
- Data migration strategy

Do not copy old VBT, video, camera, character-background, or Service Worker HTML rewriting patterns.
