# MicroSwiper self-contained deployment

This build contains the AI startup disclaimer and the Identify game mode.

## Why this build is different
The entire site is embedded inside a single `index.html`: HTML, CSS, JavaScript, sounds (Web Audio), and the bacteria database. It does not depend on `app.js`, `styles.css`, `config.js`, or `data/bacteria.json` being loaded separately.

The same `index.html` is included in two locations:
- `/index.html` for GitHub Pages source `/(root)`
- `/docs/index.html` for GitHub Pages source `/docs`

Upload the contents of this ZIP to the branch selected in Settings → Pages. If your source is `/(root)`, the root `index.html` is used. If your source is `/docs`, the copy in `/docs` is used.

When the new build is live, the FIRST screen must say `AI-assisted study tool`, and at the bottom of that disclaimer you will see `Build 2026-09-13 · Identify + AI Disclaimer`. After continuing, the mode list must contain Survival, Practice, and Identify.

The `source` folder is only for reference and is not required by the deployed site.
