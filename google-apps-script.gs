/**
 * Bacteria Survival — Google Sheets data endpoint
 *
 * Recommended setup:
 * 1. Open the Google Sheet that contains Organisms, Swipe Questions, and App Settings.
 * 2. Extensions > Apps Script.
 * 3. Replace the default code with this file.
 * 4. Deploy > New deployment > Web app.
 * 5. Execute as: Me. Access: Anyone (or the broadest anonymous option available to you).
 * 6. Copy the /exec URL into config.js as googleAppsScriptUrl.
 *
 * This endpoint is intentionally read-only and returns only game content.
 */

function doGet(e) {
  const payload = buildPayload_();
  const prefix = e && e.parameter ? e.parameter.prefix : "";

  // JSONP makes the read-only endpoint usable from a GitHub Pages site without CORS setup.
  if (prefix && /^[A-Za-z_$][0-9A-Za-z_$]*$/.test(prefix)) {
    return ContentService
      .createTextOutput(prefix + "(" + JSON.stringify(payload) + ");")
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function buildPayload_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const organismRows = sheetObjects_(ss, "Organisms");
  const questionRows = sheetObjects_(ss, "Swipe Questions");
  const settingRows = sheetObjects_(ss, "App Settings");

  const settingsMap = {};
  settingRows.forEach((row) => {
    if (row.setting !== "") settingsMap[String(row.setting)] = row.value;
  });

  const organisms = organismRows
    .filter((row) => asBoolean_(row.active))
    .map((row) => ({
      id: String(row.organism_id || ""),
      name: String(row.organism_name || ""),
      gramStain: String(row.gram_stain || ""),
      morphology: String(row.morphology || ""),
      arrangement: String(row.arrangement || ""),
      questionCount: Number(row.question_count || 0),
      status: String(row.game_status || "")
    }))
    .filter((row) => row.id && row.name);

  const questions = questionRows
    .filter((row) => asBoolean_(row.active))
    .map((row) => ({
      id: String(row.question_id || ""),
      organismId: String(row.organism_id || ""),
      organismName: String(row.organism_name || ""),
      category: String(row.category || "General"),
      prompt: String(row.prompt || ""),
      answer: asBoolean_(row.correct_answer),
      explanation: String(row.explanation || ""),
      difficulty: String(row.difficulty || "Medium"),
      highYield: String(row.high_yield || "").toLowerCase() === "high",
      source: String(row.source || ""),
      sourceSlide: row.source_slide === "" ? null : row.source_slide
    }))
    .filter((row) => row.id && row.organismId && row.prompt);

  return {
    version: Number(settingsMap.data_version || 1),
    lastUpdated: String(settingsMap.last_updated || ""),
    settings: {
      appTitle: String(settingsMap.app_title || "Bacteria Survival"),
      questionsPerRound: Number(settingsMap.questions_per_round || 8),
      startingLives: Number(settingsMap.starting_lives || 1),
      shuffleQuestions: asBoolean_(settingsMap.shuffle_questions),
      showExplanationAfterWrong: asBoolean_(settingsMap.show_explanation_after_wrong),
      showExplanationAfterRight: asBoolean_(settingsMap.show_explanation_after_right)
    },
    organisms: organisms,
    questions: questions
  };
}

function sheetObjects_(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) throw new Error("Missing required sheet: " + sheetName);
  const values = sheet.getDataRange().getValues();
  if (values.length < 2) return [];

  const headers = values[0].map((header) => String(header || "").trim());
  return values.slice(1).map((row) => {
    const obj = {};
    headers.forEach((header, index) => {
      if (header) obj[header] = row[index];
    });
    return obj;
  });
}

function asBoolean_(value) {
  if (value === true) return true;
  return String(value || "").trim().toUpperCase() === "TRUE";
}
