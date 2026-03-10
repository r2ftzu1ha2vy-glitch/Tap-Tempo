"use strict";
// ═══════════════════════════════════════════════════════════
//  NEON TYPE — Rhythm Typing Game
//  Sounds: Web Audio API procedural jazz/synth
// ═══════════════════════════════════════════════════════════

// ─── AUDIO ──────────────────────────────────────────────────
const SoundEngine = (() => {
  let ctx = null;
  const init = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  };

  // Jazz scale (C major pentatonic + blues notes)
  const SCALES = {
    happy:  [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33, 659.25],
    cool:   [220.00, 246.94, 261.63, 311.13, 349.23, 415.30, 466.16, 523.25],
    tense:  [174.61, 196.00, 220.00, 261.63, 293.66, 329.63, 369.99, 392.00],
  };

  let scale = SCALES.happy;
  let lastNoteIdx = 0;
  let noteCount = 0;

  const setScale = s => { scale = SCALES[s] || SCALES.happy; };

  // Pluck a note (correct key)
  const note = (comboLevel = 0) => {
    init();
    // walk up scale with some jazz jumps
    const jump = Math.random() < 0.3 ? Math.floor(Math.random() * 3) + 1 : 1;
    lastNoteIdx = (lastNoteIdx + jump) % scale.length;
    const freq = scale[lastNoteIdx] * (comboLevel > 10 ? 2 : 1);
    noteCount++;

    const o  = ctx.createOscillator();
    const g  = ctx.createGain();
    const f  = ctx.createBiquadFilter();

    // warm sine + slight harmonics
    o.type = "triangle";
    o.frequency.value = freq;

    f.type = "lowpass";
    f.frequency.value = 2200 + comboLevel * 80;
    f.Q.value = 1.2;

    o.connect(f); f.connect(g); g.connect(ctx.destination);

    const t = ctx.currentTime;
    const vol = Math.min(0.3, 0.12 + comboLevel * 0.008);
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
    o.start(t); o.stop(t + 0.45);

    // Add a subtle harmony on high combo
    if (comboLevel > 5 && Math.random() < 0.4) {
      const o2 = ctx.createOscillator();
      const g2 = ctx.createGain();
      o2.type = "sine";
      o2.frequency.value = freq * 1.5;
      o2.connect(g2); g2.connect(ctx.destination);
      g2.gain.setValueAtTime(0, t);
      g2.gain.linearRampToValueAtTime(vol * 0.3, t + 0.01);
      g2.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
      o2.start(t); o2.stop(t + 0.3);
    }
  };

  // Wrong key — dissonant thud
  const wrong = () => {
    init();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    const f = ctx.createBiquadFilter();
    o.type = "sawtooth";
    o.frequency.setValueAtTime(90, ctx.currentTime);
    o.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.12);
    f.type = "lowpass"; f.frequency.value = 300;
    o.connect(f); f.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.18, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
    o.start(); o.stop(ctx.currentTime + 0.15);
  };

  // Word cleared — quick ascending run
  const wordClear = (combo = 0) => {
    init();
    const base = scale[lastNoteIdx % scale.length];
    const notes = [base, base * 1.25, base * 1.5];
    notes.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine"; o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.07;
      g.gain.setValueAtTime(0.22, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.25);
      o.start(t); o.stop(t + 0.25);
    });
  };

  // Word missed — low thud + descend
  const wordMiss = () => {
    init();
    const buf = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 200;
    const g = ctx.createGain();
    src.connect(f); f.connect(g); g.connect(ctx.destination);
    g.gain.value = 0.4;
    src.start(); src.stop(ctx.currentTime + 0.2);
  };

  // Game over — slow descend
  const gameOver = () => {
    init();
    const freqs = [440, 370, 311, 220, 185];
    freqs.forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "triangle"; o.frequency.value = f;
      o.connect(g); g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.18;
      g.gain.setValueAtTime(0.25, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
      o.start(t); o.stop(t + 0.5);
    });
  };

  // Beat tick
  const tick = () => {
    init();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine"; o.frequency.value = 60;
    o.connect(g); g.connect(ctx.destination);
    g.gain.setValueAtTime(0.06, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
    o.start(); o.stop(ctx.currentTime + 0.06);
  };

  return { note, wrong, wordClear, wordMiss, gameOver, tick, setScale };
})();

// ─── WORD BANK ───────────────────────────────────────────────
const WORDS = {
  easy: [
    "cat","dog","run","fly","hot","ice","map","cup","sun","big","low","sky",
    "red","fun","sea","art","box","gap","jam","lit","oak","pip","raw","tap",
    "war","yak","zen","fog","gem","hub","ivy","jet","keg","lag","mob","nap"
  ],
  medium: [
    "jazz","vibe","glow","type","beat","flow","neon","wave","drop","sync",
    "burn","code","dark","echo","fire","grid","haze","icon","jump","knot",
    "lace","melt","node","open","pace","quit","rave","spin","trek","urge",
    "vast","warp","xray","yell","zoom","arch","blur","cave","dust","edge"
  ],
  hard: [
    "rhythm","glitch","static","syntax","fractal","module","vertex","shader",
    "matrix","vector","signal","filter","output","buffer","kernel","render",
    "cipher","daemon","encode","format","hybrid","invoke","jitter","lambda",
    "malloc","nozzle","offset","packet","quartz","reflex","script","thread",
    "update","vacuum","widget","xenon","yellow","zipper","blazing","chrome"
  ]
};

// ─── VIZ BACKGROUNDS ─────────────────────────────────────────
function drawBars(canvas) {
  const ctx = canvas.getContext("2d");
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
  const W = canvas.width, H = canvas.height;

  const bars = Array.from({ length: 40 }, (_, i) => ({
    x: (W / 40) * i + W / 80,
    h: Math.random() * H * 0.4 + 20,
    speed: Math.random() * 1.5 + 0.5,
    dir: Math.random() > .5 ? 1 : -1,
    hue: Math.random() > .5 ? "#f5a623" : "#39ff8f",
  }));

  let raf;
  const draw = () => {
    ctx.clearRect(0, 0, W, H);
    bars.forEach(b => {
      b.h += b.speed * b.dir;
      if (b.h > H * 0.55 || b.h < 15) b.dir *= -1;
      ctx.fillStyle = b.hue + "22";
      ctx.strokeStyle = b.hue + "55";
      ctx.lineWidth = 1;
      const bw = W / 40 - 4;
      ctx.fillRect(b.x - bw / 2, H - b.h, bw, b.h);
      ctx.strokeRect(b.x - bw / 2, H - b.h, bw, b.h);
    });
    raf = requestAnimationFrame(draw);
  };
  draw();
  return () => cancelAnimationFrame(raf);
}

// ─── GAME CANVAS (beat visualizer) ───────────────────────────
function initBeatViz(canvas) {
  const ctx = canvas.getContext("2d");
  let beatPulse = 0;

  const resize = () => {
    canvas.width  = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
  };
  resize();
  window.addEventListener("resize", resize);

  const draw = () => {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Horizontal lines (tape lines)
    for (let y = 0; y < H; y += 48) {
      ctx.strokeStyle = `rgba(245,166,35,${0.03 + beatPulse * 0.02})`;
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }

    // Beat pulse circle
    if (beatPulse > 0) {
      const r = beatPulse * 140;
      const g = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, r);
      g.addColorStop(0, `rgba(245,166,35,${beatPulse * 0.08})`);
      g.addColorStop(1, "transparent");
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(W / 2, H / 2, r, 0, Math.PI * 2);
      ctx.fill();
      beatPulse *= 0.9;
    }
    requestAnimationFrame(draw);
  };
  draw();
  return () => { beatPulse = Math.min(beatPulse + 0.5, 1); };
}

// ─── MAIN GAME ───────────────────────────────────────────────
const Game = (() => {
  let difficulty = "easy";
  let words, score, combo, maxCombo, lives, totalTyped, correctTyped, wordsCleared;
  let activeWords = [], wordPool = [];
  let spawnInterval, beatInterval;
  let startTime;
  let targetWord = null;
  let pulseBeat;

  const playArea  = document.getElementById("play-area");
  const wordsLayer= document.getElementById("words-layer");
  const gameCanvas= document.getElementById("game-canvas");
  const input     = document.getElementById("word-input");
  const gScore    = document.getElementById("g-score");
  const gAcc      = document.getElementById("g-acc");
  const comboNum  = document.getElementById("combo-num");
  const ringFill  = document.getElementById("ring-fill");
  const livesEl   = document.getElementById("lives");

  const CIRCUMFERENCE = 163;

  // difficulty config
  const CONFIG = {
    easy:   { spawnMs: 2800, fallDuration: 9000,  wordsAtOnce: 2 },
    medium: { spawnMs: 2000, fallDuration: 6500,  wordsAtOnce: 3 },
    hard:   { spawnMs: 1400, fallDuration: 4500,  wordsAtOnce: 5 },
  };

  function shufflePool() {
    wordPool = [...WORDS[difficulty]].sort(() => Math.random() - .5);
  }

  function nextWord() {
    if (wordPool.length === 0) shufflePool();
    return wordPool.pop();
  }

  function spawnWord() {
    const cfg = CONFIG[difficulty];
    if (activeWords.length >= cfg.wordsAtOnce + Math.floor(score / 800)) return;

    const text = nextWord();
    const W = playArea.offsetWidth;
    const x = 40 + Math.random() * (W - 180);

    const tile = document.createElement("div");
    tile.className = "word-tile";
    tile.innerHTML = `<span class="typed-part"></span><span class="remaining">${text}</span>`;
    tile.style.left = x + "px";
    tile.style.top  = "-40px";
    wordsLayer.appendChild(tile);

    const dur = cfg.fallDuration - Math.min(score * 0.5, cfg.fallDuration * 0.4);

    const obj = { text, typed: 0, el: tile, done: false };
    activeWords.push(obj);

    // CSS animation for falling
    tile.style.transition = `top ${dur}ms linear`;
    requestAnimationFrame(() => {
      tile.style.top = (playArea.offsetHeight + 10) + "px";
    });

    // Timeout when it hits floor
    setTimeout(() => {
      if (!obj.done) wordMissed(obj);
    }, dur);
  }

  function wordMissed(obj) {
    if (obj.done) return;
    obj.done = true;
    SoundEngine.wordMiss();
    flashFloor();
    lives--;
    updateLives();
    removeWord(obj);
    combo = 0;
    updateComboHUD();
    if (lives <= 0) endGame();
  }

  function removeWord(obj) {
    obj.done = true;
    activeWords = activeWords.filter(w => w !== obj);
    obj.el.remove();
    if (targetWord === obj) targetWord = null;
  }

  function flashFloor() {
    const fl = document.querySelector(".floor-line");
    fl.style.opacity = "1";
    fl.style.boxShadow = "0 0 24px var(--red)";
    setTimeout(() => { fl.style.opacity = ".6"; fl.style.boxShadow = "0 0 12px var(--red)"; }, 200);
  }

  function findTarget(typed) {
    // prefer current target, then find a word starting with typed text
    if (targetWord && !targetWord.done && targetWord.text.startsWith(typed)) return targetWord;
    return activeWords.find(w => !w.done && w.text.startsWith(typed)) || null;
  }

  function handleInput(e) {
    const val = input.value.toLowerCase().replace(/[^a-z]/g, "");
    input.value = val;

    if (!val) {
      targetWord = null;
      highlightTargets();
      return;
    }

    const target = findTarget(val);

    if (!target) {
      // wrong
      SoundEngine.wrong();
      totalTyped++;
      input.classList.remove("shake");
      void input.offsetWidth;
      input.classList.add("shake");
      input.value = "";
      return;
    }

    targetWord = target;
    totalTyped += (val.length - target.typed);
    correctTyped += (val.length - target.typed);

    // count each new correct char for note
    const newChars = val.length - target.typed;
    for (let i = 0; i < newChars; i++) SoundEngine.note(combo);

    target.typed = val.length;

    // update tile display
    const typed_text = target.text.slice(0, target.typed);
    const rest_text  = target.text.slice(target.typed);
    target.el.querySelector(".typed-part").textContent = typed_text;
    target.el.querySelector(".remaining").textContent  = rest_text;

    // check complete
    if (target.typed >= target.text.length) {
      input.value = "";
      combo++;
      maxCombo = Math.max(maxCombo, combo);
      wordsCleared++;
      const pts = target.text.length * 10 * (1 + combo * 0.1);
      score += Math.round(pts);
      SoundEngine.wordClear(combo);
      showPop(target.el, `+${Math.round(pts)}`);
      if (pulseBeat) pulseBeat();
      removeWord(target);
      targetWord = null;
      updateHUD();
    }

    highlightTargets();
    updateHUD();
  }

  function highlightTargets() {
    activeWords.forEach(w => {
      w.el.classList.toggle("targeted", w === targetWord);
    });
  }

  function showPop(anchorEl, text) {
    const pop = document.createElement("div");
    pop.className = "pop-text";
    pop.textContent = text;
    const rect = anchorEl.getBoundingClientRect();
    const areaRect = playArea.getBoundingClientRect();
    pop.style.left = (rect.left - areaRect.left + rect.width / 2 - 30) + "px";
    pop.style.top  = (rect.top  - areaRect.top  - 20) + "px";
    wordsLayer.appendChild(pop);
    setTimeout(() => pop.remove(), 600);
  }

  function updateHUD() {
    gScore.textContent = score.toLocaleString();
    const acc = totalTyped > 0 ? Math.round((correctTyped / totalTyped) * 100) : 100;
    gAcc.textContent   = acc + "%";
    updateComboHUD();
  }

  function updateComboHUD() {
    comboNum.textContent = combo;
    const pct = Math.min(combo / 20, 1);
    const offset = CIRCUMFERENCE * (1 - pct);
    ringFill.style.strokeDashoffset = offset;
    const color = combo > 15 ? "#39ff8f" : combo > 8 ? "#f5a623" : "#f5a623";
    ringFill.style.stroke = color;
    comboNum.style.color  = color;
  }

  function updateLives() {
    document.querySelectorAll(".life").forEach((el, i) => {
      el.classList.toggle("lost", i >= lives);
    });
  }

  // ── BEAT TIMER ──
  let beat = 0;
  function startBeat() {
    beatInterval = setInterval(() => {
      beat++;
      SoundEngine.tick();
      if (pulseBeat) pulseBeat();
      // spawn on beat
      if (beat % 2 === 0) spawnWord();
    }, 700);
  }

  // ── START / END ──
  function start(diff) {
    difficulty = diff || difficulty;
    score = 0; combo = 0; maxCombo = 0; lives = 3; beat = 0;
    totalTyped = 0; correctTyped = 0; wordsCleared = 0;
    activeWords = []; targetWord = null;
    wordsLayer.innerHTML = "";
    input.value = "";
    startTime = Date.now();
    shufflePool();
    updateHUD(); updateLives();
    SoundEngine.setScale(diff === "hard" ? "tense" : diff === "medium" ? "cool" : "happy");

    pulseBeat = initBeatViz(gameCanvas);

    startBeat();
    input.focus();
  }

  function endGame() {
    clearInterval(beatInterval);
    SoundEngine.gameOver();

    const elapsed = (Date.now() - startTime) / 60000;
    const wpm     = Math.round(wordsCleared / elapsed) || 0;
    const acc     = totalTyped > 0 ? Math.round((correctTyped / totalTyped) * 100) : 100;

    document.getElementById("r-score").textContent = score.toLocaleString();
    document.getElementById("r-words").textContent = wordsCleared;
    document.getElementById("r-acc").textContent   = acc + "%";
    document.getElementById("r-combo").textContent = maxCombo;
    document.getElementById("r-wpm").textContent   = wpm;

    setTimeout(() => showScreen("screen-results"), 800);
  }

  input.addEventListener("input", handleInput);

  return { start, setDiff: d => { difficulty = d; } };
})();

// ─── SCREEN MANAGER ─────────────────────────────────────────
function showScreen(id) {
  document.querySelectorAll(".screen").forEach(s => s.classList.remove("active"));
  document.getElementById(id).classList.add("active");
}

// ─── INIT ────────────────────────────────────────────────────
let stopMenuViz, stopResultsViz;

document.addEventListener("DOMContentLoaded", () => {
  stopMenuViz = drawBars(document.getElementById("menu-viz"));
  window.addEventListener("resize", () => {
    const mc = document.getElementById("menu-viz");
    if (mc) { mc.width = window.innerWidth; mc.height = window.innerHeight; }
  });

  // difficulty
  let selectedDiff = "easy";
  document.querySelectorAll(".diff-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".diff-btn").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      selectedDiff = btn.dataset.diff;
    });
  });

  // play
  document.getElementById("btn-play").addEventListener("click", () => {
    if (stopMenuViz) stopMenuViz();
    showScreen("screen-game");
    Game.start(selectedDiff);
  });

  // again
  document.getElementById("btn-again").addEventListener("click", () => {
    showScreen("screen-game");
    Game.start(selectedDiff);
  });

  // menu
  document.getElementById("btn-menu").addEventListener("click", () => {
    showScreen("screen-menu");
    stopMenuViz = drawBars(document.getElementById("menu-viz"));
  });

  // results viz
  const resultsScreen = document.getElementById("screen-results");
  const observer = new MutationObserver(() => {
    if (resultsScreen.classList.contains("active")) {
      stopResultsViz = drawBars(document.getElementById("results-viz"));
    } else if (stopResultsViz) {
      stopResultsViz();
    }
  });
  observer.observe(resultsScreen, { attributes: true, attributeFilter: ["class"] });
});