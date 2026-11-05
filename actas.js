// ==========================================
// FORMULARIO DE ACTAS E HISTORIAL
// ==========================================
function onRoundChange() {
  const round = document.getElementById("form-round").value;
  const car1Input = document.getElementById("form-car1");
  if (!car1Input) return;

  if (isPlayoffRound(round)) {
    car1Input.value = 120;
    showToast(`Fase Final seleccionada: distancia oficial a 120 carambolas.`);
  } else if (Number(car1Input.value) === 120) {
    car1Input.value = 90;
  }
  updateFormPreview();
}

function populatePlayerSelects() {
  ["live-p1-select", "live-p2-select", "form-p1", "form-p2"].forEach(
    (id, idx) => {
      const sel = document.getElementById(id);
      if (!sel) return;
      const current = sel.value;
      sel.innerHTML = state.players
        .map((p) => `<option value="${p}">${p}</option>`)
        .join("");
      if (current && state.players.includes(current)) {
        sel.value = current;
      } else if (state.players[idx % 2]) {
        sel.value = state.players[idx % 2];
      }
    },
  );

  const refereeSel = document.getElementById("form-referee");
  const assistantSel = document.getElementById("form-assistant");
  if (refereeSel && assistantSel) {
    const refCurrent = refereeSel.value;
    const astCurrent = assistantSel.value;

    const optionsHtml =
      `<option value="">— Ninguno —</option>` +
      state.players.map((p) => `<option value="${p}">${p}</option>`).join("");
    refereeSel.innerHTML = optionsHtml;
    assistantSel.innerHTML = optionsHtml;

    if (refCurrent) refereeSel.value = refCurrent;
    if (astCurrent) assistantSel.value = astCurrent;
  }
}

function updateFormPreview() {
  const innInput = document.getElementById("form-innings");
  const c1Input = document.getElementById("form-car1");
  const c2Input = document.getElementById("form-car2");
  if (!innInput || !c1Input || !c2Input) return;

  const inn = Math.max(1, Number(innInput.value || 1));
  const c1 = Number(c1Input.value || 0);
  const c2 = Number(c2Input.value || 0);

  const prev1 = document.getElementById("form-preview-avg1");
  const prev2 = document.getElementById("form-preview-avg2");
  if (prev1) prev1.textContent = (c1 / inn).toFixed(3);
  if (prev2) prev2.textContent = (c2 / inn).toFixed(3);
}

function editMatch(id) {
  const match = state.matches.find((m) => m.id === id);
  if (!match) return;

  state.editingMatchId = id;
  populatePlayerSelects();

  document.getElementById("form-modality").value = match.modality || "Libre";
  document.getElementById("form-round").value = match.round || "Jornada 1";
  document.getElementById("form-date").value = match.date;
  document.getElementById("form-time").value = match.time || "10:00";
  document.getElementById("form-innings").value = match.innings;
  document.getElementById("form-minutes").value = match.minutes || 60;
  document.getElementById("form-referee").value = match.referee || "";
  document.getElementById("form-assistant").value = match.assistant || "";

  document.getElementById("form-p1").value = match.p1;
  document.getElementById("form-car1").value = match.car1;
  document.getElementById("form-sm1").value = match.sm1;
  document.getElementById("form-tb1").value = match.tb1 || 0;

  document.getElementById("form-p2").value = match.p2;
  document.getElementById("form-car2").value = match.car2;
  document.getElementById("form-sm2").value = match.sm2;
  document.getElementById("form-tb2").value = match.tb2 || 0;

  document.getElementById("form-notes").value = match.notes || "";

  updateFormPreview();

  document.getElementById("edit-mode-banner").classList.remove("hidden");
  document.getElementById("form-match-title").textContent = "Editar Acta";
  document.getElementById("form-submit-label").textContent =
    "Actualizar Acta y Recalcular";
  document.getElementById("nav-label-acta").textContent = "Editando Acta...";

  switchTab("new-match");
}

function cancelEditMatch() {
  state.editingMatchId = null;
  const banner = document.getElementById("edit-mode-banner");
  if (banner) banner.classList.add("hidden");
  document.getElementById("form-match-title").textContent =
    "Acta Oficial de Partido";
  document.getElementById("form-submit-label").textContent =
    "Guardar Acta Oficial";
  document.getElementById("nav-label-acta").textContent = "Registrar Acta";
  document.getElementById("form-date").value = new Date()
    .toISOString()
    .split("T")[0];
}

function saveMatchRecord(e) {
  e.preventDefault();

  if (!isAdmin) {
    toggleAdminModal();
    alert("Debes identificarte con el PIN de administrador para guardar actas.");
    return;
  }

  const p1 = document.getElementById("form-p1").value;
  const p2 = document.getElementById("form-p2").value;
  const car1 = Number(document.getElementById("form-car1").value);
  const car2 = Number(document.getElementById("form-car2").value);

  if (p1 === p2) {
    showToast("El Jugador 1 y el Jugador 2 no pueden ser la misma persona.");
    return;
  }

  if (car1 === car2) {
    showToast("No puede haber empate en el marcador.");
    return;
  }

  const matchData = {
    id: state.editingMatchId || "m_" + Date.now(),
    date: document.getElementById("form-date").value,
    time: document.getElementById("form-time").value,
    round: document.getElementById("form-round").value,
    modality: document.getElementById("form-modality").value,
    innings: Number(document.getElementById("form-innings").value),
    minutes: Number(document.getElementById("form-minutes").value) || 0,
    referee: document.getElementById("form-referee").value,
    assistant: document.getElementById("form-assistant").value,
    p1,
    car1,
    sm1: Number(document.getElementById("form-sm1").value),
    tb1: Number(document.getElementById("form-tb1").value) || 0,
    p2,
    car2,
    sm2: Number(document.getElementById("form-sm2").value),
    tb2: Number(document.getElementById("form-tb2").value) || 0,
    notes: document.getElementById("form-notes").value.trim(),
    runs1: state.tempMatchRuns1 || [],
    runs2: state.tempMatchRuns2 || [],
  };

  if (state.editingMatchId) {
    const idx = state.matches.findIndex((m) => m.id === state.editingMatchId);
    if (idx !== -1) {
      matchData.runs1 = state.matches[idx].runs1 || matchData.runs1;
      matchData.runs2 = state.matches[idx].runs2 || matchData.runs2;
      state.matches[idx] = matchData;
    }
    cancelEditMatch();
    showToast("Acta corregida y clasificación actualizada.");
  } else {
    state.matches.unshift(matchData);
    showToast("Nueva acta guardada correctamente.");
  }

  delete state.tempMatchRuns1;
  delete state.tempMatchRuns2;

  document.getElementById("form-car1").value = 90;
  document.getElementById("form-sm1").value = 0;
  document.getElementById("form-tb1").value = 0;
  document.getElementById("form-car2").value = 0;
  document.getElementById("form-sm2").value = 0;
  document.getElementById("form-tb2").value = 0;
  document.getElementById("form-innings").value = 50;
  document.getElementById("form-notes").value = "";
  updateFormPreview();

  saveState();
  subirEstadoAFirebase();
  switchTab("standings");
}

function renderHistory() {
  const filterEl = document.getElementById("history-filter-mod");
  const mod = filterEl ? filterEl.value : "TODAS";
  const container = document.getElementById("history-list");
  if (!container) return;

  const list = state.matches.filter(
    (m) => mod === "TODAS" || m.modality === mod,
  );

  if (list.length === 0) {
    container.innerHTML = `<div class="felt-card rounded-xl p-8 text-center text-emerald-300/70 text-sm">No hay actas registradas para este filtro.</div>`;
    return;
  }

  container.innerHTML = list
    .map((m) => {
      const avg1 = (m.car1 / m.innings).toFixed(3);
      const avg2 = (m.car2 / m.innings).toFixed(3);

      let arbitrosTxt = "";
      if (m.referee) arbitrosTxt += ` · Juez: ${m.referee}`;
      if (m.assistant) arbitrosTxt += ` · Aux: ${m.assistant}`;

      const isPlayoff = isPlayoffRound(m.round);

      return `
        <div class="felt-card rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 ${isPlayoff ? "border border-gold-500/50" : ""}">
            <div class="space-y-1.5">
                <div class="flex flex-wrap items-center gap-2 text-xs">
                    <span class="px-2 py-0.5 rounded ${isPlayoff ? "bg-gold-500 text-baize-950 font-black" : "bg-gold-500/20 text-gold-400 font-bold"} uppercase">${m.round || m.modality}</span>
                    <span class="font-mono text-emerald-300/80">${m.date}${m.time ? " " + m.time : ""}</span>
                    <span class="font-mono text-emerald-400 font-semibold">· ${m.innings} Entradas</span>
                    ${m.minutes ? `<span class="font-mono text-slate-300">· ${m.minutes} min</span>` : ""}
                    ${arbitrosTxt ? `<span class="text-emerald-300/80 font-medium">${arbitrosTxt}</span>` : ""}
                    ${m.notes ? `<span class="text-amber-200/80">(${m.notes})</span>` : ""}
                </div>
                <div class="flex flex-wrap items-center gap-4 pt-1">
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full ball-white"></span>
                        <span class="font-bold text-white text-base">${m.p1}</span>
                        <span class="font-mono text-xl font-extrabold ${m.car1 > m.car2 ? "text-emerald-400" : "text-slate-300"}">${m.car1}</span>
                        <span class="text-xs font-mono text-emerald-300/80">(Prom: ${avg1} | SM: ${m.sm1} | 3B: ${m.tb1 || 0})</span>
                    </div>
                    <span class="text-gold-500 font-bold text-sm">vs</span>
                    <div class="flex items-center gap-2">
                        <span class="w-3 h-3 rounded-full ball-yellow"></span>
                        <span class="font-bold text-white text-base">${m.p2}</span>
                        <span class="font-mono text-xl font-extrabold ${m.car2 > m.car1 ? "text-emerald-400" : "text-slate-300"}">${m.car2}</span>
                        <span class="text-xs font-mono text-yellow-300/80">(Prom: ${avg2} | SM: ${m.sm2} | 3B: ${m.tb2 || 0})</span>
                    </div>
                </div>
            </div>
            <div class="flex items-center gap-2 self-end md:self-center">
                ${m.runs1 && m.runs1.length > 0 ? `
                  <button onclick="verEstadisticasPartido('${m.id}')" class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-emerald-800/60 hover:bg-emerald-700 text-emerald-200 border border-emerald-600/40 text-xs font-bold transition-all" title="Ver análisis detallado">
                      <i data-lucide="bar-chart-2" class="w-3.5 h-3.5 text-gold-400"></i>
                      <span>Estadísticas</span>
                  </button>
                ` : ''}
                <button onclick="editMatch('${m.id}')" class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-gold-400 border border-gold-500/40 text-xs font-bold transition-all" title="Editar esta acta">
                    <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
                    <span>Editar</span>
                </button>
                <button onclick="deleteMatch('${m.id}')" class="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-950/70 hover:bg-rose-900 text-rose-300 border border-rose-700/40 text-xs font-bold transition-all" title="Borrar acta">
                    <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
                </button>
            </div>
        </div>
      `;
    })
    .join("");
  lucide.createIcons();
}

function verEstadisticasPartido(id) {
  const m = state.matches.find((item) => item.id === id);
  if (m) abrirEstadisticasLiveModal(m);
}

function deleteMatch(id) {
  if (!isAdmin) {
    toggleAdminModal();
    alert("Solo el administrador con PIN puede eliminar actas.");
    return;
  }
  if (
    !confirm(
      "¿Seguro que quieres eliminar esta acta? La clasificación se recalculará automáticamente.",
    )
  )
    return;
  state.matches = state.matches.filter((m) => m.id !== id);
  saveState();
  subirEstadoAFirebase();
  renderHistory();
  renderStandings();
  showToast("Acta eliminada.");
}