(() => {
  "use strict";

  const root = document.getElementById("app");
  const homeScreen = document.getElementById("homeScreen");
  const gameScreen = document.getElementById("gameScreen");
  const resultScreen = document.getElementById("resultScreen");
  const identifyScreen = document.getElementById("identifyScreen");
  const organismField = document.getElementById("organismField");
  const identifyHomeButton = document.getElementById("identifyHomeButton");
  const identifyProgressFill = document.getElementById("identifyProgressFill");
  const identifyProgressText = document.getElementById("identifyProgressText");
  const identifyScore = document.getElementById("identifyScore");
  const clueTimer = document.getElementById("clueTimer");
  const clueList = document.getElementById("clueList");
  const identifyChoices = document.getElementById("identifyChoices");
  const identifyFeedback = document.getElementById("identifyFeedback");
  const identifyFeedbackStatus = document.getElementById("identifyFeedbackStatus");
  const identifyFeedbackAnswer = document.getElementById("identifyFeedbackAnswer");
  const identifyFeedbackDetail = document.getElementById("identifyFeedbackDetail");
  const identifyNextButton = document.getElementById("identifyNextButton");
  const progressScreen = document.getElementById("progressScreen");
  const playTabButton = document.getElementById("playTabButton");
  const progressTabButton = document.getElementById("progressTabButton");
  const progressHomeButton = document.getElementById("progressHomeButton");
  const progressSearch = document.getElementById("progressSearch");
  const progressList = document.getElementById("progressList");
  const progressEmpty = document.getElementById("progressEmpty");
  const resetProgressButton = document.getElementById("resetProgressButton");
  const totalClears = document.getElementById("totalClears");
  const totalLosses = document.getElementById("totalLosses");
  const uniqueCleared = document.getElementById("uniqueCleared");
  const overallWinRate = document.getElementById("overallWinRate");
  const dataStatus = document.getElementById("dataStatus");
  const organismCount = document.getElementById("organismCount");
  const questionCount = document.getElementById("questionCount");
  const organismSelect = document.getElementById("organismSelect");
  const startButton = document.getElementById("startButton");
  const homeButton = document.getElementById("homeButton");
  const organismName = document.getElementById("organismName");
  const organismTags = document.getElementById("organismTags");
  const progressFill = document.getElementById("progressFill");
  const progressText = document.getElementById("progressText");
  const lives = document.getElementById("lives");
  const questionCard = document.getElementById("questionCard");
  const categoryBadge = document.getElementById("categoryBadge");
  const hyBadge = document.getElementById("hyBadge");
  const questionPrompt = document.getElementById("questionPrompt");
  const negativeButton = document.getElementById("negativeButton");
  const positiveButton = document.getElementById("positiveButton");
  const resultMark = document.getElementById("resultMark");
  const resultEyebrow = document.getElementById("resultEyebrow");
  const resultTitle = document.getElementById("resultTitle");
  const resultOrganism = document.getElementById("resultOrganism");
  const resultSummary = document.getElementById("resultSummary");
  const feedbackCard = document.getElementById("feedbackCard");
  const feedbackAnswer = document.getElementById("feedbackAnswer");
  const feedbackPrompt = document.getElementById("feedbackPrompt");
  const feedbackExplanation = document.getElementById("feedbackExplanation");
  const feedbackSource = document.getElementById("feedbackSource");
  const againButton = document.getElementById("againButton");
  const retryButton = document.getElementById("retryButton");
  const practiceFeedback = document.getElementById("practiceFeedback");
  const practiceStatus = document.getElementById("practiceStatus");
  const practiceAnswer = document.getElementById("practiceAnswer");
  const practiceExplanation = document.getElementById("practiceExplanation");
  const practiceSource = document.getElementById("practiceSource");
  const continueButton = document.getElementById("continueButton");
  const negativeStamp = questionCard.querySelector(".stamp-negative");
  const positiveStamp = questionCard.querySelector(".stamp-positive");

  const state = {
    data: null,
    source: "local",
    organism: null,
    deck: [],
    index: 0,
    correct: 0,
    lives: 1,
    mode: "survival",
    locked: false,
    retryOrganismId: null,
    pendingAdvance: false,
    identifyTargets: [],
    identifyRound: 0,
    identifyCorrect: 0,
    identifyTarget: null,
    identifyClues: [],
    identifyVisibleClues: 0,
    identifyChoices: [],
    identifyLocked: false,
    identifyTimer: null,
    identifyCountdown: 5
  };

  const config = window.BACTERIA_SURVIVAL_CONFIG || {};

  const PROGRESS_STORAGE_KEY = "microswipeProgress_v1";

  function emptyProgress() {
    return { version: 1, organisms: {} };
  }

  function loadProgress() {
    try {
      const raw = window.localStorage.getItem(PROGRESS_STORAGE_KEY);
      if (!raw) return emptyProgress();
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== "object" || typeof parsed.organisms !== "object") {
        return emptyProgress();
      }
      return parsed;
    } catch (error) {
      console.warn("Saved progress could not be read.", error);
      return emptyProgress();
    }
  }

  function saveProgress(progress) {
    try {
      window.localStorage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(progress));
    } catch (error) {
      console.warn("Progress could not be saved.", error);
    }
  }

  function progressKey(organism) {
    return String(organism?.name || organism?.id || "unknown").trim().toLowerCase();
  }

  function organismProgress(organism) {
    const progress = loadProgress();
    return progress.organisms[progressKey(organism)] || {
      clears: 0,
      losses: 0,
      practiceCompletions: 0,
      correctAnswers: 0,
      answeredQuestions: 0,
      identifyCorrect: 0,
      identifyWrong: 0,
      lastPlayed: null
    };
  }

  function recordRound(result) {
    if (!state.organism) return;
    const progress = loadProgress();
    const key = progressKey(state.organism);
    const current = progress.organisms[key] || {
      clears: 0,
      losses: 0,
      practiceCompletions: 0,
      correctAnswers: 0,
      answeredQuestions: 0,
      identifyCorrect: 0,
      identifyWrong: 0,
      lastPlayed: null
    };

    if (result === "clear") current.clears += 1;
    if (result === "loss") current.losses += 1;
    if (result === "practice") current.practiceCompletions += 1;
    current.correctAnswers += state.correct;
    current.answeredQuestions += result === "loss" ? Math.min(state.index + 1, state.deck.length) : state.deck.length;
    current.lastPlayed = new Date().toISOString();
    current.organismName = state.organism.name;
    progress.organisms[key] = current;
    saveProgress(progress);
  }

  function formatLastPlayed(iso) {
    if (!iso) return "Never played";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "Played previously";
    return `Last played ${date.toLocaleDateString()}`;
  }

  function renderProgress(filterText = "") {
    if (!state.data) return;
    const saved = loadProgress();
    const query = filterText.trim().toLowerCase();
    const organisms = state.data.organisms
      .filter((o) => o && o.id && o.name)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));

    let clears = 0;
    let lossesCount = 0;
    let unique = 0;
    organisms.forEach((o) => {
      const stats = saved.organisms[progressKey(o)] || {};
      const c = Number(stats.clears || 0);
      const l = Number(stats.losses || 0);
      clears += c;
      lossesCount += l;
      if (c > 0) unique += 1;
    });

    totalClears.textContent = String(clears);
    totalLosses.textContent = String(lossesCount);
    uniqueCleared.textContent = `${unique}/${organisms.length}`;
    const survivalAttempts = clears + lossesCount;
    overallWinRate.textContent = survivalAttempts ? `${Math.round((clears / survivalAttempts) * 100)}%` : "—";

    progressList.replaceChildren();
    const filtered = organisms.filter((o) => o.name.toLowerCase().includes(query));
    filtered.forEach((organism) => {
      const stats = organismProgress(organism);
      const attempts = stats.clears + stats.losses;
      const row = document.createElement("article");
      row.className = "progress-row";

      const name = document.createElement("div");
      name.className = "progress-name";
      const strong = document.createElement("strong");
      strong.textContent = organism.name;
      const small = document.createElement("small");
      const practiceText = stats.practiceCompletions ? ` · ${stats.practiceCompletions} practice ${stats.practiceCompletions === 1 ? "round" : "rounds"}` : "";
      const identifyAttempts = Number(stats.identifyCorrect || 0) + Number(stats.identifyWrong || 0);
      const identifyText = identifyAttempts ? ` · Identify ${Number(stats.identifyCorrect || 0)}/${identifyAttempts}` : "";
      small.textContent = `${formatLastPlayed(stats.lastPlayed)}${practiceText}${identifyText}`;
      name.append(strong, small);

      const statWrap = document.createElement("div");
      statWrap.className = "progress-stats";
      const clearStat = document.createElement("div");
      clearStat.className = "progress-stat clear";
      clearStat.innerHTML = `<b>${stats.clears}</b><small>Cleared</small>`;
      const lossStat = document.createElement("div");
      lossStat.className = "progress-stat loss";
      lossStat.innerHTML = `<b>${stats.losses}</b><small>Lost</small>`;
      const rateStat = document.createElement("div");
      rateStat.className = "progress-stat";
      rateStat.innerHTML = `<b>${attempts ? Math.round((stats.clears / attempts) * 100) + "%" : "—"}</b><small>Rate</small>`;
      statWrap.append(clearStat, lossStat, rateStat);

      row.append(name, statWrap);
      progressList.appendChild(row);
    });

    const hasAnySaved = Object.values(saved.organisms).some((s) => Number(s.clears || 0) + Number(s.losses || 0) + Number(s.practiceCompletions || 0) + Number(s.identifyCorrect || 0) + Number(s.identifyWrong || 0) > 0);
    progressEmpty.classList.toggle("is-hidden", filtered.length > 0 && (hasAnySaved || query));
    if (!filtered.length && query) {
      progressEmpty.textContent = "No organisms match that search.";
      progressEmpty.classList.remove("is-hidden");
    } else if (!hasAnySaved) {
      progressEmpty.textContent = "No saved progress yet. Complete or lose a Survival run to start tracking.";
      progressEmpty.classList.remove("is-hidden");
    }
  }

  function openProgress() {
    if (!state.data) return;
    renderProgress(progressSearch.value || "");
    showScreen(progressScreen);
    progressSearch.focus({ preventScroll: true });
  }

  // Sound effects are synthesized with the Web Audio API so the site does
  // not depend on external .wav files. Audio is created/resumed only after
  // a user interaction to comply with mobile/browser autoplay policies.
  let audioContext = null;

  function getAudioContext() {
    if (audioContext) return audioContext;
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return null;
    audioContext = new AudioContextClass();
    return audioContext;
  }

  function unlockAudio() {
    const ctx = getAudioContext();
    if (!ctx) return;
    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
  }

  function tone(ctx, frequency, start, duration, gainValue, type = "sine") {
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(gainValue, start + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function playSound(name) {
    const ctx = getAudioContext();
    if (!ctx) return;

    const play = () => {
      const now = ctx.currentTime + 0.01;
      if (name === "correct") {
        tone(ctx, 660, now, 0.09, 0.055, "sine");
        tone(ctx, 880, now + 0.075, 0.12, 0.05, "sine");
      } else if (name === "win") {
        tone(ctx, 523.25, now, 0.16, 0.05, "sine");
        tone(ctx, 659.25, now + 0.09, 0.18, 0.05, "sine");
        tone(ctx, 783.99, now + 0.18, 0.24, 0.055, "sine");
      } else if (name === "lose") {
        tone(ctx, 246.94, now, 0.18, 0.055, "triangle");
        tone(ctx, 196.00, now + 0.12, 0.24, 0.05, "triangle");
      }
    };

    if (ctx.state === "suspended") {
      ctx.resume().then(play).catch(() => {});
    } else {
      play();
    }
  }

  function shuffle(items) {
    const a = [...items];
    for (let i = a.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function normalizeData(data) {
    if (!data || !Array.isArray(data.organisms) || !Array.isArray(data.questions)) {
      throw new Error("Database is missing organisms or questions.");
    }
    return data;
  }

  function loadJsonp(url, timeoutMs) {
    return new Promise((resolve, reject) => {
      const callbackName = `__bacteriaData_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
      const script = document.createElement("script");
      const separator = url.includes("?") ? "&" : "?";
      let settled = false;

      const cleanup = () => {
        delete window[callbackName];
        script.remove();
      };

      const timer = window.setTimeout(() => {
        if (settled) return;
        settled = true;
        cleanup();
        reject(new Error("Live database timed out."));
      }, timeoutMs || 7000);

      window[callbackName] = (data) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        cleanup();
        resolve(data);
      };

      script.onerror = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        cleanup();
        reject(new Error("Live database could not be loaded."));
      };

      script.src = `${url}${separator}prefix=${encodeURIComponent(callbackName)}`;
      document.head.appendChild(script);
    });
  }

  async function loadData() {
    const liveUrl = (config.googleAppsScriptUrl || "").trim();
    if (liveUrl) {
      try {
        const live = normalizeData(await loadJsonp(liveUrl, config.liveLoadTimeoutMs));
        state.source = "live";
        return live;
      } catch (error) {
        console.warn("Live database unavailable; using bundled database.", error);
      }
    }

    const response = await fetch(config.localDataUrl || "./data/bacteria.json", { cache: "no-store" });
    if (!response.ok) throw new Error(`Database request failed (${response.status}).`);
    state.source = "local";
    return normalizeData(await response.json());
  }

  function showScreen(screen) {
    if (screen !== identifyScreen) stopIdentifyTimer();
    [homeScreen, progressScreen, gameScreen, identifyScreen, resultScreen].forEach((node) => node.classList.add("is-hidden"));
    screen.classList.remove("is-hidden");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function populateHome() {
    const activeOrganisms = state.data.organisms.filter((o) => o && o.id && o.name);
    const activeQuestions = state.data.questions.filter((q) => q && q.organismId && q.prompt);
    organismCount.textContent = String(activeOrganisms.length);
    questionCount.textContent = String(activeQuestions.length);

    activeOrganisms
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name))
      .forEach((organism) => {
        const option = document.createElement("option");
        option.value = organism.id;
        option.textContent = organism.name;
        organismSelect.appendChild(option);
      });

    if (state.source === "live") {
      dataStatus.textContent = "Live database";
      dataStatus.classList.add("live");
    } else {
      dataStatus.textContent = `Bundled DB · v${state.data.version || 1}`;
    }
    startButton.disabled = activeOrganisms.length === 0;
  }

  function selectedMode() {
    const chosen = document.querySelector('input[name="mode"]:checked');
    return chosen ? chosen.value : "survival";
  }


  function updateModeUI() {
    const mode = selectedMode();
    const identify = mode === "identify";
    organismField.classList.toggle("is-hidden", identify);
    startButton.textContent = identify ? "Start identification" : "Start game";
  }

  function factKey(q) {
    return String(q?.prompt || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  }

  function clueText(q) {
    let text = String(q?.prompt || "").trim().replace(/\?+$/, "").trim();
    const yes = Boolean(q?.answer);
    if (!text) return "Characteristic available";

    const exactOpposites = [
      [/^gram-positive$/i, "Gram-positive", "Gram-negative"],
      [/^gram-negative$/i, "Gram-negative", "Gram-positive"],
      [/^catalase-positive$/i, "Catalase positive", "Catalase negative"],
      [/^oxidase-positive$/i, "Oxidase positive", "Oxidase negative"],
      [/^coagulase-positive$/i, "Coagulase positive", "Coagulase negative"],
      [/^catalase-negative$/i, "Catalase negative", "Catalase positive"],
      [/^oxidase-negative$/i, "Oxidase negative", "Oxidase positive"],
      [/^coagulase-negative$/i, "Coagulase negative", "Coagulase positive"],
      [/^motile$/i, "Motile", "Nonmotile"],
      [/^encapsulated$/i, "Encapsulated", "Not encapsulated"],
      [/^aerobic$/i, "Aerobic", "Not aerobic"],
      [/^anaerobic$/i, "Anaerobic", "Not anaerobic"],
      [/^spore-forming$/i, "Spore-forming", "Non–spore-forming"]
    ];
    for (const [pattern, positive, negative] of exactOpposites) {
      if (pattern.test(text)) return yes ? positive : negative;
    }

    const polarity = text.match(/^(.+?)-(positive|negative)$/i);
    if (polarity) {
      const base = polarity[1].replace(/-/g, " ").trim();
      const statedPositive = polarity[2].toLowerCase() === "positive";
      const finalPositive = yes ? statedPositive : !statedPositive;
      return `${base.charAt(0).toUpperCase()}${base.slice(1)} ${finalPositive ? "positive" : "negative"}`;
    }

    if (/^gram-negative\s+/i.test(text)) return yes ? text : `Not ${text.toLowerCase()}`;
    if (/^gram-positive\s+/i.test(text)) return yes ? text : `Not ${text.toLowerCase()}`;
    if (/^can cause\s+/i.test(text)) {
      const rest = text.replace(/^can cause\s+/i, "");
      return yes ? `Causes ${rest}` : `Does not cause ${rest}`;
    }
    if (/^can trigger\s+/i.test(text)) {
      const rest = text.replace(/^can trigger\s+/i, "");
      return yes ? `Can trigger ${rest}` : `Does not trigger ${rest}`;
    }
    if (/^associated with\s+/i.test(text)) return yes ? text : `Not ${text.toLowerCase()}`;
    if (/^produces\s+/i.test(text)) return yes ? text : `Does not ${text.toLowerCase()}`;
    if (/^ferments\s+/i.test(text)) return yes ? text : `Does not ${text.toLowerCase()}`;
    if (/^forms\s+/i.test(text)) return yes ? text : `Does not ${text.toLowerCase()}`;
    if (/^positive\s+/i.test(text)) return yes ? text : `Negative ${text.replace(/^positive\s+/i, "")}`;
    return yes ? text : `${text}: No`;
  }

  function organismQuestions(organism) {
    return state.data.questions.filter((q) => q.organismId === organism.id && q.prompt);
  }

  function buildIdentifyClues(organism) {
    const all = organismQuestions(organism);
    const frequency = new Map();
    state.data.questions.forEach((q) => {
      const key = `${factKey(q)}|${Boolean(q.answer)}`;
      frequency.set(key, (frequency.get(key) || 0) + 1);
    });
    const seen = new Set();
    const unique = [];
    all.forEach((q) => {
      const text = clueText(q);
      const clean = text.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
      if (!clean || seen.has(clean)) return;
      seen.add(clean);
      unique.push({
        text,
        category: q.category || "General",
        highYield: Boolean(q.highYield),
        frequency: frequency.get(`${factKey(q)}|${Boolean(q.answer)}`) || 1
      });
    });
    // Common facts appear first; rare/distinguishing facts arrive later.
    return unique.sort((a, b) => (b.frequency - a.frequency) || (Number(b.highYield) - Number(a.highYield)) || a.text.localeCompare(b.text));
  }

  function similarityScore(target, candidate) {
    if (!candidate || candidate.id === target.id) return -Infinity;
    let score = 0;
    if (target.gramStain && candidate.gramStain && target.gramStain === candidate.gramStain) score += 8;
    if (target.morphology && candidate.morphology && target.morphology === candidate.morphology) score += 6;
    if (target.arrangement && candidate.arrangement && target.arrangement === candidate.arrangement) score += 3;
    const targetGenus = target.name.split(/\s+/)[0];
    const candidateGenus = candidate.name.split(/\s+/)[0];
    if (targetGenus && targetGenus === candidateGenus) score += 5;

    const targetFacts = new Map(organismQuestions(target).map((q) => [factKey(q), Boolean(q.answer)]));
    organismQuestions(candidate).forEach((q) => {
      const key = factKey(q);
      if (!targetFacts.has(key)) return;
      score += targetFacts.get(key) === Boolean(q.answer) ? 4 : 1;
    });
    return score + Math.random() * 1.5;
  }

  function buildIdentifyChoices(target) {
    const candidates = state.data.organisms
      .filter((o) => o && o.id && o.name && o.id !== target.id && organismQuestions(o).length)
      .map((o) => ({ organism: o, score: similarityScore(target, o) }))
      .sort((a, b) => b.score - a.score);
    const pool = candidates.slice(0, Math.max(8, Math.min(14, candidates.length)));
    const distractors = shuffle(pool).sort((a, b) => b.score - a.score).slice(0, 3).map((x) => x.organism);
    return shuffle([target, ...distractors]);
  }

  function stopIdentifyTimer() {
    if (state.identifyTimer) {
      window.clearInterval(state.identifyTimer);
      state.identifyTimer = null;
    }
  }

  function renderIdentifyClues() {
    clueList.replaceChildren();
    state.identifyClues.slice(0, state.identifyVisibleClues).forEach((clue, index) => {
      const row = document.createElement("div");
      row.className = "clue-item";
      const num = document.createElement("span");
      num.className = "clue-number";
      num.textContent = String(index + 1);
      const text = document.createElement("strong");
      text.textContent = clue.text;
      row.append(num, text);
      clueList.appendChild(row);
    });
  }

  function revealIdentifyClue() {
    if (state.identifyLocked || state.identifyVisibleClues >= state.identifyClues.length) return;
    state.identifyVisibleClues += 1;
    renderIdentifyClues();
    if (state.identifyVisibleClues >= state.identifyClues.length) {
      stopIdentifyTimer();
      clueTimer.textContent = "All clues revealed";
      return;
    }
    state.identifyCountdown = 5;
    clueTimer.textContent = "Next clue in 5s";
  }

  function startIdentifyTimer() {
    stopIdentifyTimer();
    if (state.identifyClues.length <= state.identifyVisibleClues) {
      clueTimer.textContent = "All clues revealed";
      return;
    }
    state.identifyCountdown = 5;
    clueTimer.textContent = "Next clue in 5s";
    state.identifyTimer = window.setInterval(() => {
      if (state.identifyLocked) return;
      state.identifyCountdown -= 1;
      if (state.identifyCountdown <= 0) {
        revealIdentifyClue();
      } else {
        clueTimer.textContent = `Next clue in ${state.identifyCountdown}s`;
      }
    }, 1000);
  }

  function recordIdentifyResult(organism, correct) {
    if (!organism) return;
    const progress = loadProgress();
    const key = progressKey(organism);
    const current = progress.organisms[key] || {
      clears: 0, losses: 0, practiceCompletions: 0, correctAnswers: 0, answeredQuestions: 0,
      identifyCorrect: 0, identifyWrong: 0, lastPlayed: null
    };
    if (correct) current.identifyCorrect = Number(current.identifyCorrect || 0) + 1;
    else current.identifyWrong = Number(current.identifyWrong || 0) + 1;
    current.lastPlayed = new Date().toISOString();
    current.organismName = organism.name;
    progress.organisms[key] = current;
    saveProgress(progress);
  }

  function startIdentifySession() {
    unlockAudio();
    const available = state.data.organisms.filter((o) => o && o.id && o.name && organismQuestions(o).length >= 2);
    const rounds = Math.min(10, available.length);
    state.mode = "identify";
    state.identifyTargets = shuffle(available).slice(0, rounds);
    state.identifyRound = 0;
    state.identifyCorrect = 0;
    showScreen(identifyScreen);
    startIdentifyRound();
  }

  function startIdentifyRound() {
    stopIdentifyTimer();
    const target = state.identifyTargets[state.identifyRound];
    if (!target) {
      finishIdentifySession();
      return;
    }
    state.identifyTarget = target;
    state.identifyClues = buildIdentifyClues(target);
    state.identifyVisibleClues = Math.min(1, state.identifyClues.length);
    state.identifyChoices = buildIdentifyChoices(target);
    state.identifyLocked = false;
    identifyFeedback.classList.add("is-hidden");
    identifyProgressText.textContent = `${state.identifyRound + 1} / ${state.identifyTargets.length}`;
    identifyProgressFill.style.width = `${Math.round((state.identifyRound / Math.max(1, state.identifyTargets.length)) * 100)}%`;
    identifyScore.textContent = `${state.identifyCorrect} ✓`;
    renderIdentifyClues();
    identifyChoices.replaceChildren();
    state.identifyChoices.forEach((organism, index) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "identify-choice";
      button.dataset.organismId = organism.id;
      button.innerHTML = `<span>${organism.name}</span><small>${index + 1}</small>`;
      button.addEventListener("click", () => answerIdentify(organism.id));
      identifyChoices.appendChild(button);
    });
    startIdentifyTimer();
  }

  function answerIdentify(organismId) {
    if (state.identifyLocked || !state.identifyTarget) return;
    unlockAudio();
    state.identifyLocked = true;
    stopIdentifyTimer();
    const correct = organismId === state.identifyTarget.id;
    if (correct) {
      state.identifyCorrect += 1;
      playSound("correct");
    } else {
      playSound("lose");
    }
    recordIdentifyResult(state.identifyTarget, correct);
    identifyScore.textContent = `${state.identifyCorrect} ✓`;

    [...identifyChoices.querySelectorAll(".identify-choice")].forEach((button) => {
      button.disabled = true;
      if (button.dataset.organismId === state.identifyTarget.id) button.classList.add("correct");
      else if (button.dataset.organismId === organismId) button.classList.add("wrong");
    });

    identifyFeedbackStatus.textContent = correct ? "Correct" : "Incorrect";
    identifyFeedbackStatus.className = `feedback-status ${correct ? "correct" : "wrong"}`;
    identifyFeedbackAnswer.textContent = state.identifyTarget.name;
    const used = state.identifyVisibleClues;
    identifyFeedbackDetail.textContent = correct
      ? `Identified after ${used} ${used === 1 ? "clue" : "clues"}.`
      : `The correct organism was ${state.identifyTarget.name}. You had ${used} ${used === 1 ? "clue" : "clues"} revealed.`;
    identifyNextButton.textContent = state.identifyRound + 1 >= state.identifyTargets.length ? "See results" : "Next organism";
    identifyFeedback.classList.remove("is-hidden");
    identifyNextButton.focus({ preventScroll: true });
  }

  function nextIdentifyRound() {
    if (!state.identifyLocked) return;
    state.identifyRound += 1;
    if (state.identifyRound >= state.identifyTargets.length) finishIdentifySession();
    else startIdentifyRound();
  }

  function finishIdentifySession() {
    stopIdentifyTimer();
    identifyProgressFill.style.width = "100%";
    resultMark.textContent = state.identifyCorrect >= Math.ceil(state.identifyTargets.length * 0.7) ? "✓" : "•";
    resultMark.classList.toggle("dead", state.identifyCorrect < Math.ceil(state.identifyTargets.length * 0.5));
    resultEyebrow.textContent = "Identification complete";
    resultTitle.textContent = "Round complete";
    resultOrganism.textContent = `${state.identifyCorrect} / ${state.identifyTargets.length} organisms identified`;
    resultSummary.textContent = `${Math.round((state.identifyCorrect / Math.max(1, state.identifyTargets.length)) * 100)}% correct.`;
    feedbackCard.classList.add("is-hidden");
    againButton.textContent = "New identification round";
    retryButton.textContent = "Back to home";
    showScreen(resultScreen);
    playSound("win");
  }

  function chooseOrganism(requestedId) {
    const available = state.data.organisms.filter((organism) => {
      return state.data.questions.some((q) => q.organismId === organism.id);
    });
    if (!available.length) return null;
    if (requestedId && requestedId !== "random") {
      return available.find((o) => o.id === requestedId) || available[0];
    }
    return available[Math.floor(Math.random() * available.length)];
  }

  function buildDeck(organism) {
    let questions = state.data.questions.filter((q) => q.organismId === organism.id && q.prompt);
    if (state.data.settings?.shuffleQuestions !== false) questions = shuffle(questions);
    const requested = Number(state.data.settings?.questionsPerRound || questions.length);
    const limit = Number.isFinite(requested) && requested > 0 ? Math.min(requested, questions.length) : questions.length;
    return questions.slice(0, limit);
  }

  function startGame(requestedId) {
    const chosen = chooseOrganism(requestedId);
    if (!chosen) return;
    state.organism = chosen;
    state.retryOrganismId = chosen.id;
    state.deck = buildDeck(chosen);
    state.index = 0;
    state.correct = 0;
    state.mode = selectedMode();
    state.lives = state.mode === "survival" ? Number(state.data.settings?.startingLives || 1) : Infinity;
    state.locked = false;
    state.pendingAdvance = false;

    organismName.textContent = chosen.name;
    organismTags.replaceChildren();
    [chosen.gramStain, chosen.morphology, chosen.arrangement].filter(Boolean).forEach((label) => {
      const span = document.createElement("span");
      span.textContent = label;
      organismTags.appendChild(span);
    });
    lives.textContent = state.mode === "survival" ? "♥".repeat(Math.max(1, state.lives)) : "∞";
    feedbackCard.classList.add("is-hidden");
    showScreen(gameScreen);
    renderQuestion();
  }

  function currentQuestion() {
    return state.deck[state.index] || null;
  }

  function resetCardTransform() {
    questionCard.classList.remove("dragging", "animating");
    questionCard.style.transform = "";
    questionCard.style.opacity = "";
    negativeStamp.style.opacity = "0";
    positiveStamp.style.opacity = "0";
  }

  function renderQuestion() {
    const q = currentQuestion();
    if (!q) {
      finishWin();
      return;
    }
    resetCardTransform();
    categoryBadge.textContent = q.category || "General";
    hyBadge.classList.toggle("is-hidden", !q.highYield);
    questionPrompt.textContent = q.prompt;
    const completed = state.index;
    const total = state.deck.length || 1;
    progressText.textContent = `${state.index + 1} / ${total}`;
    progressFill.style.width = `${Math.round((completed / total) * 100)}%`;
    state.locked = false;
    negativeButton.disabled = false;
    positiveButton.disabled = false;
    questionCard.focus({ preventScroll: true });
  }

  function sourceText(q) {
    if (!q || !q.source) return "";
    return q.sourceSlide ? `${q.source} · slide ${q.sourceSlide}` : q.source;
  }

  function answer(value, direction) {
    if (state.locked) return;
    unlockAudio();
    const q = currentQuestion();
    if (!q) return;
    state.locked = true;
    negativeButton.disabled = true;
    positiveButton.disabled = true;

    questionCard.classList.add("animating");
    const x = direction === "left" ? -520 : 520;
    questionCard.style.transform = `translateX(${x}px) rotate(${direction === "left" ? -12 : 12}deg)`;
    questionCard.style.opacity = "0";

    const correct = Boolean(value) === Boolean(q.answer);
    if (correct) {
      state.correct += 1;
      playSound("correct");
    }

    window.setTimeout(() => {
      if (state.mode === "practice") {
        showPracticeFeedback(q, correct);
        return;
      }
      if (!correct) {
        state.lives -= 1;
        if (state.lives <= 0) {
          finishLoss(q);
          return;
        }
      }
      state.index += 1;
      renderQuestion();
    }, 230);
  }

  function showPracticeFeedback(q, correct) {
    practiceStatus.textContent = correct ? "Correct" : "Incorrect";
    practiceStatus.className = `feedback-status ${correct ? "correct" : "wrong"}`;
    practiceAnswer.textContent = `Correct answer: ${q.answer ? "Positive" : "Negative"}`;
    practiceExplanation.textContent = q.explanation || "No explanation has been added yet.";
    const source = sourceText(q);
    practiceSource.textContent = source ? `Source: ${source}` : "";
    practiceFeedback.classList.remove("is-hidden");
    continueButton.focus();
  }

  function continuePractice() {
    practiceFeedback.classList.add("is-hidden");
    state.index += 1;
    renderQuestion();
  }

  function finishWin() {
    recordRound(state.mode === "survival" ? "clear" : "practice");
    progressFill.style.width = "100%";
    resultMark.textContent = "✓";
    resultMark.classList.remove("dead");
    resultEyebrow.textContent = state.mode === "survival" ? "Survived" : "Round complete";
    resultTitle.textContent = state.mode === "survival" ? "Organism cleared" : "Practice complete";
    resultOrganism.textContent = state.organism.name;
    resultSummary.textContent = `${state.correct} of ${state.deck.length} correct.`;
    feedbackCard.classList.add("is-hidden");
    retryButton.textContent = "Play this organism again";
    showScreen(resultScreen);
    playSound("win");
  }

  function finishLoss(q) {
    recordRound("loss");
    resultMark.textContent = "×";
    resultMark.classList.add("dead");
    resultEyebrow.textContent = "Game over";
    resultTitle.textContent = "You didn't survive";
    resultOrganism.textContent = state.organism.name;
    resultSummary.textContent = `${state.correct} correct before the miss.`;
    feedbackAnswer.textContent = `Correct answer: ${q.answer ? "Positive" : "Negative"}`;
    feedbackPrompt.textContent = q.prompt;
    feedbackExplanation.textContent = q.explanation || "No explanation has been added yet.";
    const source = sourceText(q);
    feedbackSource.textContent = source ? `Source: ${source}` : "";
    feedbackCard.classList.remove("is-hidden");
    retryButton.textContent = "Retry this organism";
    showScreen(resultScreen);
    playSound("lose");
  }

  let drag = null;

  questionCard.addEventListener("pointerdown", (event) => {
    if (state.locked || event.button !== 0) return;
    drag = { pointerId: event.pointerId, startX: event.clientX, currentX: event.clientX };
    questionCard.setPointerCapture(event.pointerId);
    questionCard.classList.add("dragging");
  });

  questionCard.addEventListener("pointermove", (event) => {
    if (!drag || event.pointerId !== drag.pointerId) return;
    drag.currentX = event.clientX;
    const dx = drag.currentX - drag.startX;
    const clamped = Math.max(-170, Math.min(170, dx));
    questionCard.style.transform = `translateX(${clamped}px) rotate(${clamped / 22}deg)`;
    const strength = Math.min(1, Math.abs(clamped) / 95);
    negativeStamp.style.opacity = clamped < 0 ? String(strength) : "0";
    positiveStamp.style.opacity = clamped > 0 ? String(strength) : "0";
  });

  function endDrag(event) {
    if (!drag || event.pointerId !== drag.pointerId) return;
    const dx = drag.currentX - drag.startX;
    drag = null;
    questionCard.classList.remove("dragging");
    if (Math.abs(dx) >= 90) {
      answer(dx > 0, dx > 0 ? "right" : "left");
    } else {
      questionCard.classList.add("animating");
      questionCard.style.transform = "";
      negativeStamp.style.opacity = "0";
      positiveStamp.style.opacity = "0";
      window.setTimeout(() => questionCard.classList.remove("animating"), 230);
    }
  }

  questionCard.addEventListener("pointerup", endDrag);
  questionCard.addEventListener("pointercancel", endDrag);

  negativeButton.addEventListener("click", () => answer(false, "left"));
  positiveButton.addEventListener("click", () => answer(true, "right"));
  continueButton.addEventListener("click", continuePractice);

  startButton.addEventListener("click", () => {
    if (selectedMode() === "identify") startIdentifySession();
    else startGame(organismSelect.value);
  });
  homeButton.addEventListener("click", () => showScreen(homeScreen));
  againButton.addEventListener("click", () => {
    if (state.mode === "identify") {
      startIdentifySession();
      return;
    }
    organismSelect.value = "random";
    startGame("random");
  });
  retryButton.addEventListener("click", () => {
    if (state.mode === "identify") {
      showScreen(homeScreen);
      return;
    }
    startGame(state.retryOrganismId);
  });
  identifyHomeButton.addEventListener("click", () => showScreen(homeScreen));
  identifyNextButton.addEventListener("click", nextIdentifyRound);
  document.querySelectorAll('input[name="mode"]').forEach((radio) => radio.addEventListener("change", updateModeUI));
  updateModeUI();

  progressTabButton.addEventListener("click", openProgress);
  playTabButton.addEventListener("click", () => showScreen(homeScreen));
  progressHomeButton.addEventListener("click", () => showScreen(homeScreen));
  progressSearch.addEventListener("input", () => renderProgress(progressSearch.value));
  resetProgressButton.addEventListener("click", () => {
    const confirmed = window.confirm("Reset all MicroSwipe progress on this device? This cannot be undone.");
    if (!confirmed) return;
    saveProgress(emptyProgress());
    renderProgress(progressSearch.value);
  });

  root.addEventListener("keydown", (event) => {
    if (event.target && ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
    if (!identifyScreen.classList.contains("is-hidden")) {
      if (!state.identifyLocked && /^[1-4]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        const choice = state.identifyChoices[index];
        if (choice) {
          event.preventDefault();
          answerIdentify(choice.id);
        }
      }
      return;
    }
    if (gameScreen.classList.contains("is-hidden") || state.locked) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      answer(false, "left");
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      answer(true, "right");
    }
  });

  loadData()
    .then((data) => {
      state.data = data;
      populateHome();
    })
    .catch((error) => {
      console.error(error);
      dataStatus.textContent = "Database error";
      startButton.disabled = true;
      const message = document.createElement("p");
      message.className = "feedback-explanation";
      message.textContent = "The bacteria database could not be loaded. Open this site through GitHub Pages or a local web server rather than by double-clicking index.html.";
      document.querySelector(".setup-panel").appendChild(message);
    });
})();
