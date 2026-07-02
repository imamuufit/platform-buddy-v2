# No VBT Policy

## Decision

Platform Buddy v2 core does not include VBT, video analysis, camera features, motion tracking, or video form notes.

This is a product boundary, not a technical limitation.

## Reason

The previous Platform Buddy became unstable because video logging, form notes, motion analysis, VBT measurement, plate tracking, Buddy comments, and training logs all entered the same product surface.

For v2, the core app must remain focused on:

- Planning
- Logging
- RPE learning
- Data judgment
- Meet preparation

## Forbidden core features

Do not add:

- VBT tab
- VBT cards
- Video upload
- Video library
- Two-video comparison
- Camera capture
- Motion analyzer
- Pose detection
- Plate tracking
- Velocity estimation
- Frame trimming
- MediaPipe
- BodyPix
- Optical flow
- AI movement scoring
- Developer diagnostic overlays for movement tracking

## Future option

If VBT is revisited, it must be separated into another repository or a clearly isolated lab project, such as:

- `platform-buddy-lab`
- `platform-buddy-vbt`
- `platform-buddy-video-lab`

It must not be part of the v2 core navigation.

## Allowed references from old repository

The old repository may be used only for non-video training logic:

- PR cycle
- RPE
- e1RM
- Wellness
- DATA judgment
- MEET preparation
- White-light quiz
- Buddy comment text
- Migration strategy

## Review checklist

Before approving any PR, check:

- Does it add video, camera, VBT, tracking, or motion analysis?
- Does it add a new top-level tab outside HOME, LOG, PLAN, DATA, MEET?
- Does it import old `video.js` behavior from `total-academy`?
- Does it introduce runtime UI patching?
- Does it make LOG slower?

If yes, reject or request changes.
