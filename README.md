# Bacteria Survival

A static, swipe-based medical microbiology recall game. The front end is designed for GitHub Pages and can use either the bundled JSON database or a live Google Sheet through Google Apps Script.

## What is included

- `index.html` — game markup
- `styles.css` — responsive phone/desktop styling
- `app.js` — game logic, swipe gestures, keyboard controls, Survival and Practice modes
- `config.js` — data-source configuration
- `data/bacteria.json` — current bundled database generated from the workbook
- `google-apps-script.gs` — optional read-only endpoint for a live Google Sheet
- `.nojekyll` — tells GitHub Pages to serve these files directly

## Test locally

Because the game loads JSON, do not double-click `index.html`. Run any simple local web server in this folder, for example:

```bash
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Create a GitHub repository, for example `bacteria-survival`.
2. Upload all files and folders from this project to the repository root.
3. Open the repository's **Settings > Pages**.
4. Under **Build and deployment**, select **Deploy from a branch**.
5. Choose the `main` branch and `/(root)`, then save.
6. GitHub will show the public Pages URL after deployment.

The project needs no npm install and no build process.

## Connect the live Google Sheet

The bundled database works immediately. To make spreadsheet edits appear in the shared game without rebuilding the site:

1. Upload/import `bacterial_microbiology_swipe_game_database.xlsx` into Google Sheets.
2. In the Google Sheet, open **Extensions > Apps Script**.
3. Paste the contents of `google-apps-script.gs` into the script editor and save.
4. Use **Deploy > New deployment > Web app**.
5. Configure the deployment to execute as you and allow the widest read access you intend for the game. For a public game, the endpoint itself must be publicly readable.
6. Copy the deployed URL ending in `/exec`.
7. Open `config.js` and paste that URL into `googleAppsScriptUrl`.
8. Commit that single change to GitHub.

After that initial connection, edits to active rows in `Organisms`, `Swipe Questions`, and `App Settings` are read when the game loads. No front-end code change is required for routine database updates.

The endpoint uses JSONP only for read-only, non-sensitive educational content. Do not place private student or patient information in this spreadsheet.

## Database expectations

The live endpoint expects these exact sheet names:

- `Organisms`
- `Swipe Questions`
- `App Settings`

For a new question, add a row to `Swipe Questions` with a unique `question_id`, a valid `organism_id`, a prompt, `TRUE` or `FALSE` in `correct_answer`, and `TRUE` in `active`.

## Game rules

- Right = Positive / Yes / True
- Left = Negative / No / False
- Survival mode: one wrong answer ends the run by default
- Practice mode: every answer shows an explanation, then continues
- Questions are shuffled and limited by `questions_per_round` in `App Settings`
