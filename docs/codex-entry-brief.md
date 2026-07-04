# Codex entry brief

Last updated: 2026-07-04 JST

Repository URL:

- https://github.com/imamuufit/platform-buddy-v2

## Why this repository exists

Platform Buddy v2 is a new clean-rebuild repository.

The previous Platform Buddy idea was valuable: a personal powerlifting app for one lifter to plan, log, review, and prepare for meets.

The previous implementation lost balance because too many directions entered the same product surface:

- UI/UX polish;
- Shiba Buddy character presence;
- training logs;
- RPE guidance;
- meet preparation;
- VBT experiments;
- video analysis;
- camera or movement-analysis ideas;
- service-worker/runtime patching;
- broad feature experiments.

The VBT/video-analysis direction was especially destabilizing. It created a new technical project inside an app that still needed a clear daily training cockpit.

Platform Buddy v2 keeps the original philosophy, but rebuilds the product as a refined, mobile-first, calm powerlifting cockpit.

The old repository remains intact as a reference archive. Do not treat it as the active app. Use it only for non-video training logic ideas.

## Current workflow

The owner has authorized ChatGPT to edit GitHub, open pull requests, and merge only after explicit owner approval.

ChatGPT has been developing this repository through small hourly automation passes. This has kept the app stable and reviewable, but the owner now wants Codex to join the work and help complete the broader app shape.

Codex should join the GitHub-first workflow:

- work in this repository;
- create a branch;
- edit files in the repository;
- open a pull request;
- include verification notes;
- wait for owner approval and ChatGPT review/merge handling.

Do not create ZIP files. Do not ask the owner to manually upload files. Do not push directly to `main`.

## What to preserve

Carry forward the philosophy, not the unstable implementation.

Preserve:

- one-lifter powerlifting cockpit;
- fast set logging;
- RPE learning;
- e1RM awareness;
- conservative training judgment;
- meet preparation;
- white-light and command reminders;
- quiet Buddy support;
- polished UI/UX;
- calm, premium, rack-side dashboard feeling.

## What not to add

Do not add these to Platform Buddy v2 core:

- VBT;
- video analysis;
- camera features;
- movement tracking;
- pose estimation;
- plate tracking;
- velocity estimation;
- service-worker HTML rewriting;
- runtime UI patch layers;
- PL Commentary Bank / HPA / PDF features;
- large character systems;
- noisy gamification.

## Design direction

The owner values UI/UX. A technically functional but visually careless app is not enough.

The app should feel:

- mobile-first;
- clean;
- calm;
- intentional;
- fast during training;
- readable at about 390px width;
- useful immediately after opening.

Buddy should feel like a quiet spotter. Buddy must not control the layout or slow down logging.

## Codex starting instruction

Use this as the first working prompt:

```text
Repository: https://github.com/imamuufit/platform-buddy-v2

This is the active clean-rebuild repository for Platform Buddy v2. The old Platform Buddy repository remains intact as a reference archive only.

The owner has authorized ChatGPT to edit GitHub, open PRs, and merge only after explicit owner approval. ChatGPT has been developing this repo through small hourly automation passes. Codex should join that GitHub-first workflow.

Do not create ZIP files. Do not ask the owner to manually upload files. Do not push directly to main. Work on a branch and open a PR.

Why this repo exists:
The original idea was strong, but the earlier implementation lost product balance when UI/UX work, Buddy, logs, RPE, meet prep, VBT experiments, video analysis, camera/movement-analysis ideas, and service-worker/runtime patching all entered the same app surface. VBT/video work especially destabilized the product. Platform Buddy v2 keeps the original philosophy but rebuilds the app as a refined mobile-first powerlifting cockpit.

Read first:
- AGENTS.md
- README.md
- docs/product-charter.md
- docs/no-vbt-policy.md
- docs/codex-entry-brief.md
- docs/codex-completion-handoff.md

Work from Issue #40.

Goal:
Complete a coherent app-wide vertical slice across HOME / LOG / PLAN / DATA / MEET so the app stops feeling like isolated panels and starts feeling like one usable mobile training cockpit.

Minimum completion target:
- LOG saves real training entries locally.
- HOME summarizes what to do today from stored data.
- PLAN stores and edits today's prescription basics.
- DATA calculates simple judgment from saved logs.
- MEET stores meet date, D-day, checklist, attempt drafts, meet memo, and conservative attempt suggestions.

Do not add VBT, video analysis, camera features, movement tracking, pose estimation, plate tracking, velocity estimation, service-worker HTML rewriting, runtime UI patch layers, PL Commentary Bank/HPA/PDF features, large character systems, or noisy gamification.

Keep the implementation static HTML/CSS/JS unless a strong reason exists. Preserve mobile-first polish and calm UI.

Open a PR with summary, files changed, exact verification, storage schema notes, and explicit confirmation that no forbidden features were added.
```
