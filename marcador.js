// ==========================================
// MARCADOR EN VIVO
// ==========================================
let liveTimerInterval = null;

function getLiveDurationMinutes() {
  const l = state.live;
  if (!l.isStarted) return 0;
  if (l.isFinished && typeof l.frozenDuration === "number") {
    return l.frozenDuration;
  }
  const start = l.startTimestamp || Date.now();
  const diffMs = Math.max(0, Date.now() - start);
  return Math.floor(diffMs / 60000);
}

function startLiveMatch() {
  const now = new Date();
  const hh = String(now.getHours()).padStart(2, "0");
  const mm = String(now.getMinutes()).padStart(2, "0");

  state.live.isStarted = true;
  state.live.isFinished = false;
  state.live.date = now.toISOString().split("T")[0];
  state.live.startTime = `${hh}:${mm}`;
  state.live.startTimestamp = now.getTime();
  delete state.live.frozenDuration;

  saveState();
  renderLiveScoreboard();
  showToast("¡Partida iniciada! Tiempo en marcha.");
}

function stopLiveMatch() {
  if (!state.live.isStarted) return;
  state.live.isFinished = true;
  state.live.frozenDuration = getLiveDurationMinutes();

  saveState();
  renderLiveScoreboard();
  showToast(`Partida finalizada. Tiempo registrado: ${state.live.frozenDuration} min.`);
}

function updateLiveSetup() {
  const roundSel = document.getElementById("live-round");
  if (roundSel) {
    const prevRound = state.live.round;
    state.live.round = roundSel.value;
    if (isPlayoffRound(state.live.round) && !isPlayoffRound(prevRound)) {
      state.live.target = 120;
      const targetInput = document.getElementById("live-target");
      if (targetInput) targetInput.value = 120;
    } else if (!isPlayoffRound(state.live.round) && isPlayoffRound(prevRound) && state.live.target === 120) {
      state.live.target = 90;
      const targetInput = document.getElementById("live-target");
      if (targetInput) targetInput.value = 90;
    }
  }

  state.live.p1 = document.getElementById("live-p1-select").value;
  state.live.p2 = document.getElementById("live-p2-select").value;
  state.live.modality = document.getElementById("live-modality").value;
  state.live.target = Number(document.getElementById("live-target").value || 90);
  state.live.maxInnings = Number(document.getElementById("live-max-innings").value || 100);

  saveState();
  renderLiveScoreboard();
}

function toggleP1Ball() {
  const current = state.live.p1Ball || "blanca";
  state.live.p1Ball = current === "blanca" ? "amarilla" : "blanca";
  saveState();
  renderLiveScoreboard();
}

function renderLiveScoreboard() {
  const l = state.live;
  const p1Select = document.getElementById("live-p1-select");
  const p2Select = document.getElementById("live-p2-select");
  const roundSelect = document.getElementById("live-round");
  const modSelect = document.getElementById("live-modality");
  const targetInput = document.getElementById("live-target");
  const maxInnInput = document.getElementById("live-max-innings");

  const btnP1Ball = document.getElementById("live-p1-ball-btn");
  const dotP1Ball = document.getElementById("live-p1-ball-dot");
  const textP1Ball = document.getElementById("live-p1-ball-text");

  const p1Ball = l.p1Ball || "blanca";

  if (p1Select) p1Select.value = l.p1;
  if (p2Select) p2Select.value = l.p2;
  if (roundSelect) roundSelect.value = l.round || "Jornada 1";
  if (modSelect) modSelect.value = l.modality;
  if (targetInput) targetInput.value = l.target;
  if (maxInnInput) maxInnInput.value = l.maxInnings;

  if (btnP1Ball && dotP1Ball && textP1Ball) {
    if (p1Ball === "blanca") {
      btnP1Ball.className = "px-2.5 py-0.5 rounded-lg bg-baize-900 border border-slate-200 text-white font-bold transition-all cursor-pointer inline-flex items-center gap-1.5";
      dotP1Ball.className = "w-2.5 h-2.5 rounded-full ball-white inline-block";
      textP1Ball.textContent = "Blanca";
      textP1Ball.className = "text-white text-[11px] font-bold";
    } else {
      btnP1Ball.className = "px-2.5 py-0.5 rounded-lg bg-baize-900 border border-yellow-400 text-yellow-300 font-bold transition-all cursor-pointer inline-flex items-center gap-1.5";
      dotP1Ball.className = "w-2.5 h-2.5 rounded-full ball-yellow inline-block";
      textP1Ball.textContent = "Amarilla";
      textP1Ball.className = "text-yellow-300 text-[11px] font-bold";
    }
  }

  const dot1 = document.getElementById("live-ball-dot-1");
  const dot2 = document.getElementById("live-ball-dot-2");
  const box1 = document.getElementById("live-score-box-1");
  const box2 = document.getElementById("live-score-box-2");
  const score1 = document.getElementById("live-score-p1");
  const score2 = document.getElementById("live-score-p2");

  const scoreTextClasses = "text-7xl sm:text-8xl lg:text-[9.5rem] font-extrabold font-mono text-slate-950 leading-none select-none";

  if (p1Ball === "blanca") {
    if (dot1) dot1.className = "w-4 h-4 sm:w-5 sm:h-5 rounded-full ball-white inline-block shadow shrink-0";
    if (dot2) dot2.className = "w-4 h-4 sm:w-5 sm:h-5 rounded-full ball-yellow inline-block shadow shrink-0";
    if (box1) box1.className = "my-2.5 flex-1 flex items-center justify-center rounded-2xl border-2 border-slate-300 bg-white shadow-2xl transition-all";
    if (score1) score1.className = scoreTextClasses;
    if (box2) box2.className = "my-2.5 flex-1 flex items-center justify-center rounded-2xl border-2 border-amber-400 bg-amber-400 shadow-2xl transition-all";
    if (score2) score2.className = scoreTextClasses;
  } else {
    if (dot1) dot1.className = "w-4 h-4 sm:w-5 sm:h-5 rounded-full ball-yellow inline-block shadow shrink-0";
    if (dot2) dot2.className = "w-4 h-4 sm:w-5 sm:h-5 rounded-full ball-white inline-block shadow shrink-0";
    if (box1) box1.className = "my-2.5 flex-1 flex items-center justify-center rounded-2xl border-2 border-amber-400 bg-amber-400 shadow-2xl transition-all";
    if (score1) score1.className = scoreTextClasses;
    if (box2) box2.className = "my-2.5 flex-1 flex items-center justify-center rounded-2xl border-2 border-slate-300 bg-white shadow-2xl transition-all";
    if (score2) score2.className = scoreTextClasses;
  }

  const nameP1 = document.getElementById("live-name-p1");
  const nameP2 = document.getElementById("live-name-p2");
  const runP1 = document.getElementById("live-run-p1");
  const runP2 = document.getElementById("live-run-p2");
  const hrP1 = document.getElementById("live-hr-p1");
  const hrP2 = document.getElementById("live-hr-p2");
  const tbP1 = document.getElementById("live-tb-p1");
  const tbP2 = document.getElementById("live-tb-p2");
  const innDisplay = document.getElementById("live-innings");

  if (nameP1) nameP1.textContent = l.p1;
  if (nameP2) nameP2.textContent = l.p2;
  if (score1) score1.textContent = l.score1;
  if (score2) score2.textContent = l.score2;
  if (runP1) runP1.textContent = l.run1;
  if (runP2) runP2.textContent = l.run2;
  if (hrP1) hrP1.textContent = l.hr1;
  if (hrP2) hrP2.textContent = l.hr2;
  if (tbP1) tbP1.textContent = l.tb1 || 0;
  if (tbP2) tbP2.textContent = l.tb2 || 0;
  if (innDisplay) innDisplay.textContent = l.innings;

  const inn = Math.max(1, l.innings);
  const avgP1 = document.getElementById("live-avg-p1");
  const avgP2 = document.getElementById("live-avg-p2");
  if (avgP1) avgP1.textContent = (l.score1 / inn).toFixed(3);
  if (avgP2) avgP2.textContent = (l.score2 / inn).toFixed(3);

  const badgeMod = document.getElementById("live-badge-modality");
  const targetDisp = document.getElementById("live-target-display");
  if (badgeMod) badgeMod.textContent = `${l.modality} · ${l.round || "Jornada 1"}`;
  if (targetDisp) targetDisp.textContent = `Distancia: ${l.target} car. | Límite: ${l.maxInnings} ent.`;

  const dispDate = document.getElementById("live-display-date");
  const dispTime = document.getElementById("live-display-time");
  const dispDuration = document.getElementById("live-display-duration");
  const badgeStatus = document.getElementById("live-status-badge");
  const btnContainer = document.getElementById("live-timer-btn-container");

  if (dispDate) {
    if (l.date) {
      const parts = l.date.split("-");
      dispDate.textContent = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : l.date;
    } else {
      dispDate.textContent = "--/--/----";
    }
  }

  if (dispTime) {
    dispTime.textContent = l.startTime || "--:--";
  }

  const durationMin = getLiveDurationMinutes();
  if (dispDuration) {
    dispDuration.textContent = `${durationMin}'`;
  }

  if (badgeStatus && btnContainer) {
    if (!l.isStarted) {
      badgeStatus.textContent = "En espera";
      badgeStatus.className = "px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300";
      btnContainer.innerHTML = `
        <button
          onclick="startLiveMatch()"
          class="w-full py-1.5 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow transition-all active:scale-95"
        >
          <i data-lucide="play" class="w-3.5 h-3.5 fill-current"></i>
          <span>Iniciar Partida (Start)</span>
        </button>
      `;
    } else if (!l.isFinished) {
      badgeStatus.textContent = "En juego";
      badgeStatus.className = "px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/50 animate-pulse";
      btnContainer.innerHTML = `
        <button
          onclick="stopLiveMatch()"
          class="w-full py-1.5 px-3 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-rose-100 font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 border border-rose-600/50 shadow transition-all active:scale-95"
        >
          <i data-lucide="square" class="w-3.5 h-3.5 fill-current"></i>
          <span>Finalizar Tiempo (Stop)</span>
        </button>
      `;
    } else {
      badgeStatus.textContent = "Finalizada";
      badgeStatus.className = "px-1.5 py-0.5 rounded text-[10px] font-bold bg-gold-500/20 text-gold-400 border border-gold-500/50";
      btnContainer.innerHTML = `
        <button
          onclick="startLiveMatch()"
          class="w-full py-1.5 px-3 rounded-lg bg-baize-900 hover:bg-baize-800 text-slate-300 font-semibold text-[11px] flex items-center justify-center gap-1 border border-emerald-800/60 transition-all"
          title="Reanudar cronómetro si se detuvo por error"
        >
          <i data-lucide="rotate-ccw" class="w-3 h-3 text-gold-400"></i>
          <span>Reanudar tiempo</span>
        </button>
      `;
    }
  }

  // GESTIÓN DE TURNO ACTIVO Y BLOQUEO VISUAL DE BOTONES
  const c1 = document.getElementById("live-card-p1");
  const c2 = document.getElementById("live-card-p2");
  const btnsP1 = c1 ? c1.querySelectorAll("button") : [];
  const btnsP2 = c2 ? c2.querySelectorAll("button") : [];

  const turnClasses = [
    "ring-4",
    "ring-gold-400",
    "border-gold-400",
    "shadow-[0_0_25px_rgba(250,204,21,0.5)]",
    "active-turn-glow",
  ];

  if (c1 && c2) {
    if (l.turn === 1) {
      c1.classList.add(...turnClasses);
      c2.classList.remove(...turnClasses);
      btnsP1.forEach((b) => b.classList.remove("opacity-35", "cursor-not-allowed"));
      btnsP2.forEach((b) => b.classList.add("opacity-35", "cursor-not-allowed"));
    } else {
      c2.classList.add(...turnClasses);
      c1.classList.remove(...turnClasses);
      btnsP2.forEach((b) => b.classList.remove("opacity-35", "cursor-not-allowed"));
      btnsP1.forEach((b) => b.classList.add("opacity-35", "cursor-not-allowed"));
    }
  }

  if (!liveTimerInterval) {
    liveTimerInterval = setInterval(() => {
      if (state.live && state.live.isStarted && !state.live.isFinished) {
        const durEl = document.getElementById("live-display-duration");
        if (durEl) durEl.textContent = `${getLiveDurationMinutes()}'`;
      }
    }, 15000);
  }

  if (typeof lucide !== "undefined") {
    lucide.createIcons();
  }
}

function addLiveCarom(player, delta, es3B = false) {
  const l = state.live;

  // Validación estricta de turno de juego
  if (player !== l.turn) {
    const jugadorEnTurno = l.turn === 1 ? l.p1 : l.p2;
    showToast(`Turno de ${jugadorEnTurno}. Pulsa "Cambiar Turno" para alternar.`);
    return;
  }

  if (player === 1) {
    l.score1 = Math.max(0, l.score1 + delta);
    l.run1 = Math.max(0, l.run1 + delta);
    if (es3B) {
      l.tb1 = Math.max(0, (l.tb1 || 0) + 1);
      l.lastWas3B1 = true;
    } else if (delta > 0) {
      l.lastWas3B1 = false;
    } else if (delta < 0) {
      if (l.lastWas3B1 && (l.tb1 || 0) > 0) {
        l.tb1 = Math.max(0, l.tb1 - 1);
        l.lastWas3B1 = false;
      }
    }
    if (l.run1 > l.hr1) l.hr1 = l.run1;
  } else {
    l.score2 = Math.max(0, l.score2 + delta);
    l.run2 = Math.max(0, l.run2 + delta);
    if (es3B) {
      l.tb2 = Math.max(0, (l.tb2 || 0) + 1);
      l.lastWas3B2 = true;
    } else if (delta > 0) {
      l.lastWas3B2 = false;
    } else if (delta < 0) {
      if (l.lastWas3B2 && (l.tb2 || 0) > 0) {
        l.tb2 = Math.max(0, l.tb2 - 1);
        l.lastWas3B2 = false;
      }
    }
    if (l.run2 > l.hr2) l.hr2 = l.run2;
  }
  saveState();
  renderLiveScoreboard();
}

function adjustLiveTB(player, delta) {
  const l = state.live;
  if (player !== l.turn) {
    return;
  }
  if (player === 1) {
    l.tb1 = Math.max(0, (l.tb1 || 0) + delta);
    l.lastWas3B1 = false;
  } else {
    l.tb2 = Math.max(0, (l.tb2 || 0) + delta);
    l.lastWas3B2 = false;
  }
  saveState();
  renderLiveScoreboard();
}

function switchTurn() {
  const l = state.live;
  if (!l.runs1) l.runs1 = [];
  if (!l.runs2) l.runs2 = [];

  if (l.turn === 1) {
    l.runs1.push(Number(l.run1 || 0));
    l.run1 = 0;
    l.lastWas3B1 = false;
    l.turn = 2;
  } else {
    l.runs2.push(Number(l.run2 || 0));
    l.run2 = 0;
    l.lastWas3B2 = false;
    l.turn = 1;
    l.innings++;
  }
  saveState();
  renderLiveScoreboard();
}

function adjustInnings(delta) {
  state.live.innings = Math.max(1, state.live.innings + delta);
  saveState();
  renderLiveScoreboard();
}

function resetLiveMatch() {
  state.live.score1 = 0;
  state.live.run1 = 0;
  state.live.hr1 = 0;
  state.live.tb1 = 0;
  state.live.runs1 = [];
  state.live.lastWas3B1 = false;

  state.live.score2 = 0;
  state.live.run2 = 0;
  state.live.hr2 = 0;
  state.live.tb2 = 0;
  state.live.runs2 = [];
  state.live.lastWas3B2 = false;

  state.live.innings = 1;
  state.live.turn = 1;

  state.live.isStarted = false;
  state.live.isFinished = false;
  delete state.live.date;
  delete state.live.startTime;
  delete state.live.startTimestamp;
  delete state.live.frozenDuration;

  saveState();
  renderLiveScoreboard();
  showToast("Marcador restablecido. En espera de inicio.");
}

function finishLiveMatchToRecord() {
  const l = state.live;
  const p1Ball = l.p1Ball || "blanca";

  if (l.isStarted && !l.isFinished) {
    l.isFinished = true;
    l.frozenDuration = getLiveDurationMinutes();
    saveState();
  }

  cancelEditMatch();

  const formRound = document.getElementById("form-round");
  if (formRound) {
    formRound.value = l.round || "Jornada 1";
  }

  document.getElementById("form-modality").value = l.modality;
  document.getElementById("form-date").value = l.date || new Date().toISOString().split("T")[0];
  document.getElementById("form-time").value = l.startTime || "10:00";
  document.getElementById("form-innings").value = l.innings;
  document.getElementById("form-minutes").value = getLiveDurationMinutes();

  const r1 = [...(l.runs1 || [])];
  const r2 = [...(l.runs2 || [])];
  if (l.turn === 1 && l.run1 > 0) r1.push(l.run1);
  if (l.turn === 2 && l.run2 > 0) r2.push(l.run2);

  if (p1Ball === "blanca") {
    document.getElementById("form-p1").value = l.p1;
    document.getElementById("form-car1").value = l.score1;
    document.getElementById("form-sm1").value = l.hr1;
    document.getElementById("form-tb1").value = l.tb1 || 0;
    document.getElementById("form-p2").value = l.p2;
    document.getElementById("form-car2").value = l.score2;
    document.getElementById("form-sm2").value = l.hr2;
    document.getElementById("form-tb2").value = l.tb2 || 0;
    state.tempMatchRuns1 = r1;
    state.tempMatchRuns2 = r2;
  } else {
    document.getElementById("form-p1").value = l.p2;
    document.getElementById("form-car1").value = l.score2;
    document.getElementById("form-sm1").value = l.hr2;
    document.getElementById("form-tb1").value = l.tb2 || 0;
    document.getElementById("form-p2").value = l.p1;
    document.getElementById("form-car2").value = l.score1;
    document.getElementById("form-sm2").value = l.hr1;
    document.getElementById("form-tb2").value = l.tb1 || 0;
    state.tempMatchRuns1 = r2;
    state.tempMatchRuns2 = r1;
  }

  if (typeof onRoundChange === "function") {
    onRoundChange();
  }

  updateFormPreview();
  switchTab("new-match");
  showToast("Datos, jornada y duración cargados en el acta oficial.");
}