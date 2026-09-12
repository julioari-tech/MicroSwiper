(() => {
  "use strict";

  const root = document.getElementById("app");
  const homeScreen = document.getElementById("homeScreen");
  const gameScreen = document.getElementById("gameScreen");
  const resultScreen = document.getElementById("resultScreen");
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
    pendingAdvance: false
  };

  const config = window.BACTERIA_SURVIVAL_CONFIG || {};

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
    [homeScreen, gameScreen, resultScreen].forEach((node) => node.classList.add("is-hidden"));
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

  startButton.addEventListener("click", () => startGame(organismSelect.value));
  homeButton.addEventListener("click", () => showScreen(homeScreen));
  againButton.addEventListener("click", () => {
    organismSelect.value = "random";
    startGame("random");
  });
  retryButton.addEventListener("click", () => startGame(state.retryOrganismId));

  root.addEventListener("keydown", (event) => {
    if (gameScreen.classList.contains("is-hidden") || state.locked) return;
    if (event.target && ["INPUT", "SELECT", "TEXTAREA"].includes(event.target.tagName)) return;
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
