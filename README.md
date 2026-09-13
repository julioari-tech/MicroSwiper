# MicroSwiper — Complete GitHub Pages Build

This package is a complete replacement for the GitHub Pages repository contents.

Included features:
- Survival mode: given an organism, answer each characteristic as positive/negative.
- Practice mode: same direction with feedback/explanations.
- Identify mode: given progressive characteristics, choose the organism from four choices.
- Identify mode reveals the first clue immediately and adds another clue every 5 seconds.
- Progress tab stored locally in the player's browser/device.
- Synthesized browser sound effects; no audio files are required for playback.
- Startup AI disclaimer shown on every page load.
- Sketchy-based bundled database: 73 organism profiles / 753 questions.
- Optional Google Apps Script bridge remains included for a future live Google Sheet database.

## Deploy

1. Back up the current repository if desired.
2. Delete/replace the current repository files with the contents of this folder.
3. Keep the same folder structure, especially `data/bacteria.json`.
4. Commit to the branch GitHub Pages deploys from (normally `main`).
5. After GitHub Pages redeploys, hard-refresh the site (Ctrl+Shift+R on Windows).

The startup disclaimer states that MicroSwipe was created with AI assistance and is an educational study tool, not a clinical diagnostic tool.
