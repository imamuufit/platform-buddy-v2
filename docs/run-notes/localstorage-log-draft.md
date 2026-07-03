# LOG draft storage scope

Platform Buddy v2 should persist only the current LOG form draft at this stage.

Allowed in this slice:
- Save Lift, Weight, Reps, and RPE draft values locally.
- Restore those values when the LOG screen is reopened.
- Keep storage failures silent so logging remains usable.

Not allowed in this slice:
- Set history.
- Training calculations.
- e1RM or RPE logic.
- VBT, video, motion tracking, camera, or Service Worker changes.
