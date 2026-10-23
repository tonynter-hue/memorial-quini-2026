// ==========================================
// CONFIGURACIÓN FIREBASE & SEGURIDAD PIN
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC8TnUjhlyhz5VWlkdfiw57-xGX_1_8zcA",
  authDomain: "memorial-quini-elcano.firebaseapp.com",
  projectId: "memorial-quini-elcano",
  storageBucket: "memorial-quini-elcano.firebasestorage.app",
  messagingSenderId: "166426350048",
  appId: "1:166426350048:web:9d9af0e329454a60f3db85"
};

// Inicializar Firebase Firestore
if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// PIN DE ADMINISTRADOR (cámbialo por las 4 cifras que quieras)
const ADMIN_PIN = "9292";
let isAdmin = false;

const STORAGE_KEY = "club_elcano_billar_v4";

const DEFAULT_PLAYERS = [
  "José Gonzalez",
  "Juan Rguez",
  "Paco Madrigal",
  "May",
  "Quini Barbero",
  "Javier Santos",
  "Javi Coco",
  "Tony Elena",
  "Juan Costa",
  "Miguel Frade",
  "Alfonso Santos",
  "Paco Vidal",
];

let state = {
  players: [],
  matches: [],
  currentModalityFilter: "Libre",
  editingMatchId: null,
  live: {
    p1: "Tony Elena",
    p2: "Paco Vidal",
    modality: "Libre",
    target: 90,
    maxInnings: 100,
    score1: 0,
    run1: 0,
    hr1: 0,
    tb1: 0,
    score2: 0,
    run2: 0,
    hr2: 0,
    tb2: 0,
    innings: 1,
    turn: 1,
  },
};


// Comprueba si un partido es de Fase Final
function isPlayoffRound(round) {
  if (!round) return false;
  return round.includes("Semifinal") || round.includes("Final");
}

// ==========================================
// SINCRONIZACIÓN NUBE (FIRESTORE) Y LOCAL
// ==========================================
function initRealtimeSync() {
  db.collection("torneo").doc("memorial_quini")
    .onSnapshot((doc) => {
      if (doc.exists) {
        const cloudData = doc.data();
        if (cloudData.matches) {
          state.matches = cloudData.matches;
          state.players = cloudData.players || DEFAULT_PLAYERS;
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          renderStandings();
          renderHistory();
        }
      } else {
        // Primera vez: sube las 30 partidas de datos.js a la nube
        subirEstadoAFirebase();
      }
    }, (error) => {
      console.warn("Conexión en modo local:", error);
      loadStateFallback();
    });
}

function subirEstadoAFirebase() {
  db.collection("torneo").doc("memorial_quini").set({
    players: state.players,
    matches: state.matches,
    updatedAt: new Date().toISOString()
  }).then(() => {
    showToast("Datos sincronizados en la nube.");
  }).catch((err) => {
    console.error("Error al subir a Firestore:", err);
  });
}

function loadStateFallback() {
  const local = localStorage.getItem(STORAGE_KEY);
  if (local) {
    const data = JSON.parse(local);
    state.players = data.players || DEFAULT_PLAYERS;
    state.matches = data.matches || [];
  } else if (typeof DATOS_TORNEO !== "undefined") {
    state.players = DATOS_TORNEO.players;
    state.matches = DATOS_TORNEO.matches;
  }
  renderStandings();
  renderHistory();
}

function saveState() {
  localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      players: state.players,
      matches: state.matches,
      live: state.live,
    }),
  );
}
// ==========================================
// NAVEGACIÓN ENTRE PESTAÑAS
// ==========================================
function switchTab(tabId) {
  document.querySelectorAll(".tab-section").forEach((el) => el.classList.add("hidden"));
  document.querySelectorAll(".nav-btn").forEach((el) => el.classList.remove("active"));

  const targetTab = document.getElementById(`tab-${tabId}`);
  const targetBtn = document.getElementById(`tab-btn-${tabId}`);
  if (targetTab) targetTab.classList.remove("hidden");
  if (targetBtn) targetBtn.classList.add("active");

  if (tabId === "standings") renderStandings();
  if (tabId === "history") renderHistory();
  if (tabId === "players") renderPlayers();
  if (tabId === "live") renderLiveScoreboard();
  lucide.createIcons();
}

// ==========================================
// COMPARADOR OFICIAL DE DESEMPATE
// ==========================================
function compararJugadoresOficial(a, b, matchesList, countG) {
  // 1º Partidos Ganados (G)
  if (b.g !== a.g) return b.g - a.g;

  // 2º Duelo particular ÚNICAMENTE si hay exactamente 2 empatados a victorias
  if (countG[a.g] === 2) {
    const duel = matchesList.find(
      (m) => (m.p1 === a.name && m.p2 === b.name) || (m.p1 === b.name && m.p2 === a.name)
    );
    if (duel) {
      const aGano = (duel.p1 === a.name && duel.car1 > duel.car2) || (duel.p2 === a.name && duel.car2 > duel.car1);
      const bGano = (duel.p1 === b.name && duel.car1 > duel.car2) || (duel.p2 === b.name && duel.car2 > duel.car1);
      if (aGano) return -1;
      if (bGano) return 1;
    }
  }

  // 3º Saldo general (+/-)
  if (b.saldo !== a.saldo) return b.saldo - a.saldo;

  // 4º Promedio General (PG)
  return b.pg - a.pg;
}

// ==========================================
// MOTOR DE CLASIFICACIÓN Y BRACKET PLAY-OFF
// ==========================================
function renderStandings() {
  const mod = state.currentModalityFilter;
  const sortSelect = document.getElementById("standings-sort");
  const sortBy = sortSelect ? sortSelect.value : "G";

  const stats = {};
  state.players.forEach((p) => {
    stats[p] = {
      name: p,
      pj: 0,
      g: 0,
      p: 0,
      saldo: 0,
      car: 0,
      tb: 0,
      ent: 0,
      pg: 0,
      mp: 0,
      sm: 0,
    };
  });

  // Los partidos de Fase Final (Play-Off) se aíslan de la tabla de liga regular
  const regularMatches = state.matches.filter(
    (m) => (mod === "TODAS" || m.modality === mod) && !isPlayoffRound(m.round)
  );

  let clubCar = 0, clubEnt = 0, bestMP = 0, bestMPName = "—", bestSM = 0, bestSMName = "—";

  regularMatches.forEach((m) => {
    if (!stats[m.p1]) stats[m.p1] = { name: m.p1, pj: 0, g: 0, p: 0, saldo: 0, car: 0, tb: 0, ent: 0, pg: 0, mp: 0, sm: 0 };
    if (!stats[m.p2]) stats[m.p2] = { name: m.p2, pj: 0, g: 0, p: 0, saldo: 0, car: 0, tb: 0, ent: 0, pg: 0, mp: 0, sm: 0 };

    const s1 = stats[m.p1], s2 = stats[m.p2];
    const c1 = Number(m.car1), c2 = Number(m.car2), inn = Math.max(1, Number(m.innings));
    const sm1 = Number(m.sm1 || 0), sm2 = Number(m.sm2 || 0);
    const tb1 = Number(m.tb1 || 0), tb2 = Number(m.tb2 || 0);

    s1.pj++; s2.pj++;
    s1.car += c1; s2.car += c2;
    s1.tb += tb1; s2.tb += tb2;
    s1.ent += inn; s2.ent += inn;
    s1.saldo += c1 - c2; s2.saldo += c2 - c1;

    if (sm1 > s1.sm) s1.sm = sm1;
    if (sm2 > s2.sm) s2.sm = sm2;

    const avg1 = c1 / inn, avg2 = c2 / inn;
    if (avg1 > s1.mp) s1.mp = avg1;
    if (avg2 > s2.mp) s2.mp = avg2;

    if (c1 > c2) { s1.g++; s2.p++; }
    else if (c2 > c1) { s2.g++; s1.p++; }

    clubCar += c1 + c2;
    clubEnt += inn * 2;

    if (avg1 > bestMP) { bestMP = avg1; bestMPName = m.p1; }
    if (avg2 > bestMP) { bestMP = avg2; bestMPName = m.p2; }
    if (sm1 > bestSM) { bestSM = sm1; bestSMName = m.p1; }
    if (sm2 > bestSM) { bestSM = sm2; bestSMName = m.p2; }
  });

  const rows = Object.values(stats).map((s) => {
    s.pg = s.ent > 0 ? s.car / s.ent : 0;
    return s;
  });

  const victoriasCount = {};
  rows.forEach((r) => {
    victoriasCount[r.g] = (victoriasCount[r.g] || 0) + 1;
  });

  rows.sort((a, b) => {
    if (sortBy === "SALDO") return b.saldo - a.saldo || b.g - a.g || b.pg - a.pg;
    if (sortBy === "PG") return b.pg - a.pg || b.g - a.g || b.saldo - a.saldo;
    if (sortBy === "TB") return b.tb - a.tb || b.g - a.g || b.saldo - a.saldo;
    if (sortBy === "MP") return b.mp - a.mp || b.pg - a.pg;
    if (sortBy === "SM") return b.sm - a.sm || b.pg - a.pg;

    // Criterio oficial por defecto
    return compararJugadoresOficial(a, b, regularMatches, victoriasCount);
  });

  // Actualizar Tarjetas KPI
  const kpiMatches = document.getElementById("kpi-matches");
  const kpiModLabel = document.getElementById("kpi-modality-label");
  const kpiClubAvg = document.getElementById("kpi-club-avg");
  const kpiCarTotal = document.getElementById("kpi-carambolas-total");
  const kpiBestMp = document.getElementById("kpi-best-mp");
  const kpiBestMpPlayer = document.getElementById("kpi-best-mp-player");
  const kpiBestSm = document.getElementById("kpi-best-sm");
  const kpiBestSmPlayer = document.getElementById("kpi-best-sm-player");

  if (kpiMatches) kpiMatches.textContent = regularMatches.length;
  if (kpiModLabel) kpiModLabel.textContent = `Modalidad: Libre (90 Carambolas)`;
  if (kpiClubAvg) kpiClubAvg.textContent = (clubEnt > 0 ? clubCar / clubEnt : 0).toFixed(3);
  if (kpiCarTotal) kpiCarTotal.textContent = `${clubCar} carambolas / ${clubEnt} entradas`;
  if (kpiBestMp) kpiBestMp.textContent = bestMP.toFixed(3);
  if (kpiBestMpPlayer) kpiBestMpPlayer.textContent = bestMPName;
  if (kpiBestSm) kpiBestSm.textContent = bestSM;
  if (kpiBestSmPlayer) kpiBestSmPlayer.textContent = bestSMName;

  // Renderizar filas de la tabla con distinción visual para los 4 de Play-Off
  const tbody = document.getElementById("standings-tbody");
  if (tbody) {
    tbody.innerHTML = rows
      .map((r, i) => {
        const saldoStr = r.saldo > 0 ? `+${r.saldo}` : `${r.saldo}`;
        const saldoColor =
          r.saldo > 0 ? "text-emerald-300 font-black" : r.saldo < 0 ? "text-rose-400 font-black" : "text-gold-400 font-bold";
        const isPlayoff = i < 4;
        const playoffBadge = isPlayoff
          ? `<span class="ml-2 text-[10px] uppercase font-black px-1.5 py-0.5 rounded bg-gold-500/20 text-gold-400 border border-gold-500/40">Play-Off</span>`
          : "";

        return `
          <tr class="transition-colors hover:bg-emerald-900/40 ${isPlayoff ? "row-playoff" : ""}">
              <td class="py-4 px-3 text-center font-mono font-black text-base ${isPlayoff ? "text-gold-400" : "text-slate-300"}">${i + 1}</td>
              <td class="py-4 px-4 text-left font-bold text-white text-base tracking-wide flex items-center">
                  <button onclick="verFichaJugador('${r.name}')" class="text-left text-white hover:text-gold-400 hover:underline transition-colors focus:outline-none flex items-center gap-1.5" title="Ver partidos de ${r.name}">
                      <span>${r.name}</span>
                      <i data-lucide="search" class="w-3.5 h-3.5 text-gold-400/60 inline"></i>
                  </button>
                  ${playoffBadge}
              </td>
              <td class="py-4 px-3 text-center font-mono font-bold text-slate-100 text-base">${r.pj}</td>
              <td class="py-4 px-3 text-center font-mono font-black text-emerald-400 text-lg">${r.g}</td>
              <td class="py-4 px-3 text-center font-mono font-bold text-rose-300 text-base">${r.p}</td>
              <td class="py-4 px-4 text-center font-mono text-lg bg-gold-500/10 ${saldoColor}">${saldoStr}</td>
              <td class="py-4 px-4 text-center font-mono font-black text-amber-300 text-lg">${r.tb}</td>
              <td class="py-4 px-3 text-center font-mono font-medium text-slate-200 text-base">${r.ent}</td>
              <td class="py-4 px-4 text-center font-mono font-black text-emerald-200 text-lg bg-emerald-950/70">${r.pg.toFixed(3)}</td>
              <td class="py-4 px-3 text-center font-mono font-semibold text-slate-200 text-base">${r.mp > 0 ? r.mp.toFixed(3) : "0.000"}</td>
              <td class="py-4 px-3 text-center font-mono font-black text-gold-400 text-lg">${r.sm}</td>
          </tr>
        `;
      })
      .join("");
  }

  // Renderizar el Cuadro de Fase Final (Play-Off)
  renderPlayoffBracket(rows);
}

// Pintar el cuadro de Semifinales y Gran Final
function renderPlayoffBracket(topRows) {
  const container = document.getElementById("playoff-bracket");
  if (!container) return;

  const p1 = topRows[0] ? topRows[0].name : "1º Clasificado";
  const p2 = topRows[1] ? topRows[1].name : "2º Clasificado";
  const p3 = topRows[2] ? topRows[2].name : "3º Clasificado";
  const p4 = topRows[3] ? topRows[3].name : "4º Clasificado";

  // Buscar actas ya jugadas de Semifinal 1, Semifinal 2 y Final
  const mSemi1 = state.matches.find((m) => m.round === "Semifinal 1 (1º vs 4º)");
  const mSemi2 = state.matches.find((m) => m.round === "Semifinal 2 (2º vs 3º)");
  const mFinal = state.matches.find((m) => m.round === "Gran Final");

  // Ganadores de semifinales (si ya se jugaron)
  let winnerSemi1 = mSemi1 ? (mSemi1.car1 > mSemi1.car2 ? mSemi1.p1 : mSemi1.p2) : "Vencedor Semi 1";
  let winnerSemi2 = mSemi2 ? (mSemi2.car1 > mSemi2.car2 ? mSemi2.p1 : mSemi2.p2) : "Vencedor Semi 2";
  let champion = mFinal ? (mFinal.car1 > mFinal.car2 ? mFinal.p1 : mFinal.p2) : null;

  function formatMatchBox(title, j1, j2, match) {
    if (match) {
      const avg1 = (match.car1 / match.innings).toFixed(3);
      const avg2 = (match.car2 / match.innings).toFixed(3);
      return `
        <div class="bracket-card active-match flex flex-col justify-between">
            <div>
                <span class="text-[11px] font-black uppercase text-gold-400 tracking-wider">${title} (Finalizado)</span>
                <p class="text-xs text-slate-300 mt-0.5">${match.innings} Entradas · Prom. ${avg1} / ${avg2}</p>
            </div>
            <div class="my-3 space-y-2">
                <div class="flex items-center justify-between bg-baize-950 p-2 rounded-lg border border-emerald-800/60">
                    <span class="text-sm font-bold ${match.car1 > match.car2 ? "text-gold-400 font-black" : "text-slate-300"}">${match.p1}</span>
                    <span class="font-mono text-base font-black ${match.car1 > match.car2 ? "text-emerald-400" : "text-slate-400"}">${match.car1}</span>
                </div>
                <div class="flex items-center justify-between bg-baize-950 p-2 rounded-lg border border-emerald-800/60">
                    <span class="text-sm font-bold ${match.car2 > match.car1 ? "text-gold-400 font-black" : "text-slate-300"}">${match.p2}</span>
                    <span class="font-mono text-base font-black ${match.car2 > match.car1 ? "text-emerald-400" : "text-slate-400"}">${match.car2}</span>
                </div>
            </div>
            <div class="text-[11px] font-bold text-emerald-300">Vencedor: ${match.car1 > match.car2 ? match.p1 : match.p2}</div>
        </div>
      `;
    }
    return `
      <div class="bracket-card flex flex-col justify-between">
          <div>
              <span class="text-[11px] font-black uppercase text-emerald-300/80 tracking-wider">${title} (A 120 Car.)</span>
              <p class="text-xs text-slate-400 mt-0.5">Pendiente de disputar</p>
          </div>
          <div class="my-3 space-y-2">
              <div class="flex items-center justify-between bg-baize-950/70 p-2 rounded-lg border border-emerald-900/50">
                  <span class="text-sm font-bold text-white">${j1}</span>
                  <span class="text-xs font-mono text-slate-500">—</span>
              </div>
              <div class="flex items-center justify-between bg-baize-950/70 p-2 rounded-lg border border-emerald-900/50">
                  <span class="text-sm font-bold text-white">${j2}</span>
                  <span class="text-xs font-mono text-slate-500">—</span>
              </div>
          </div>
          <div class="text-[11px] font-semibold text-slate-400">Distancia: 120 carambolas</div>
      </div>
    `;
  }

  container.innerHTML = `
    ${formatMatchBox("Semifinal 1 (1º vs 4º)", p1, p4, mSemi1)}
    ${formatMatchBox("Semifinal 2 (2º vs 3º)", p2, p3, mSemi2)}
    <div class="bracket-card ${mFinal ? "active-match border-gold-500 bg-gold-500/10" : ""} flex flex-col justify-between">
        <div>
            <div class="flex items-center gap-1.5">
                <i data-lucide="trophy" class="w-4 h-4 text-gold-400"></i>
                <span class="text-[11px] font-black uppercase text-gold-400 tracking-wider">Gran Final (A 120 Car.)</span>
            </div>
            <p class="text-xs text-slate-300 mt-0.5">${mFinal ? `${mFinal.innings} Entradas` : "Por el Título del Memorial"}</p>
        </div>
        <div class="my-3 space-y-2">
            <div class="flex items-center justify-between bg-baize-950 p-2 rounded-lg border border-emerald-800/60">
                <span class="text-sm font-bold ${mFinal && mFinal.car1 > mFinal.car2 ? "text-gold-400 font-black" : "text-white"}">${winnerSemi1}</span>
                <span class="font-mono text-base font-black ${mFinal ? (mFinal.car1 > mFinal.car2 ? "text-emerald-400" : "text-slate-400") : "text-slate-500"}">${mFinal ? mFinal.car1 : "—"}</span>
            </div>
            <div class="flex items-center justify-between bg-baize-950 p-2 rounded-lg border border-emerald-800/60">
                <span class="text-sm font-bold ${mFinal && mFinal.car2 > mFinal.car1 ? "text-gold-400 font-black" : "text-white"}">${winnerSemi2}</span>
                <span class="font-mono text-base font-black ${mFinal ? (mFinal.car2 > mFinal.car1 ? "text-emerald-400" : "text-slate-400") : "text-slate-500"}">${mFinal ? mFinal.car2 : "—"}</span>
            </div>
        </div>
        <div class="text-xs font-black ${champion ? "text-gold-400" : "text-slate-400"}">
            ${champion ? `🏆 CAMPEÓN: ${champion}` : "Distancia: 120 carambolas"}
        </div>
    </div>
  `;
  lucide.createIcons();
}

// ==========================================
// CAMBIO AUTOMÁTICO DE DISTANCIA POR JORNADA
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
// ==========================================
// FICHA INDIVIDUAL DE JUGADOR Y SUS PARTIDOS
// ==========================================
function verFichaJugador(nombre) {
  const modal = document.getElementById("modal-jugador");
  if (!modal) return;

  // Filtrar los partidos jugados por este socio
  const matchesJugador = state.matches.filter(
    (m) => m.p1 === nombre || m.p2 === nombre
  );

  let pj = 0, g = 0, p = 0, car = 0, ent = 0, tb = 0, bestSM = 0;
  const rivalesJugados = new Set();

  const partidosHtml = matchesJugador.map((m) => {
    const soyP1 = m.p1 === nombre;
    const misCar = Number(soyP1 ? m.car1 : m.car2);
    const susCar = Number(soyP1 ? m.car2 : m.car1);
    const rival = soyP1 ? m.p2 : m.p1;
    const inn = Math.max(1, Number(m.innings));
    const miSM = Number(soyP1 ? m.sm1 : m.sm2) || 0;
    const suSM = Number(soyP1 ? m.sm2 : m.sm1) || 0;
    const miTB = Number(soyP1 ? m.tb1 : m.tb2) || 0;
    const suTB = Number(soyP1 ? m.tb2 : m.tb1) || 0;
    const gano = misCar > susCar;

    pj++;
    if (gano) g++; else p++;
    car += misCar;
    ent += inn;
    tb += miTB;
    if (miSM > bestSM) bestSM = miSM;
    if (!isPlayoffRound(m.round)) rivalesJugados.add(rival);

    const miAvg = (misCar / inn).toFixed(3);
    const suAvg = (susCar / inn).toFixed(3);
    const badgeColor = gano
      ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/50"
      : "bg-rose-500/20 text-rose-300 border-rose-500/50";
    const badgeTexto = gano ? "Victoria" : "Derrota";

    return `
      <div class="bg-baize-950/80 border border-emerald-800/60 rounded-xl p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div class="space-y-1">
              <div class="flex items-center gap-2 text-[11px]">
                  <span class="px-2 py-0.5 rounded font-black uppercase text-gold-400 bg-gold-500/10 border border-gold-500/30">${m.round}</span>
                  <span class="text-slate-400 font-mono">${m.date}</span>
                  <span class="text-emerald-400 font-semibold font-mono">· ${m.innings} Entradas</span>
                  ${m.referee ? `<span class="text-slate-400">· Árb: ${m.referee}</span>` : ""}
              </div>
              <div class="flex items-center gap-3 pt-1">
                  <span class="px-2 py-0.5 rounded text-xs font-black uppercase border ${badgeColor}">${badgeTexto}</span>
                  <span class="text-sm font-bold text-white">${nombre} <span class="font-mono text-base font-black ${gano ? "text-emerald-400" : "text-slate-300"}">${misCar}</span></span>
                  <span class="text-xs font-bold text-gold-500">vs</span>
                  <span class="text-sm font-bold text-slate-200">${rival} <span class="font-mono text-base font-black ${!gano ? "text-emerald-400" : "text-slate-300"}">${susCar}</span></span>
              </div>
          </div>
          <div class="text-left sm:text-right text-[11px] font-mono text-slate-300 border-t sm:border-t-0 border-emerald-900/40 pt-1.5 sm:pt-0">
              <div>Promedio: <b class="text-emerald-300">${miAvg}</b> vs ${suAvg}</div>
              <div>Serie Mayor: <b class="text-gold-400">${miSM}</b> vs ${suSM} · 3B: <b class="text-amber-300">${miTB}</b> vs ${suTB}</div>
          </div>
      </div>
    `;
  }).join("");

  const pg = ent > 0 ? (car / ent).toFixed(3) : "0.000";

  // KPIs superiores
  document.getElementById("modal-jugador-nombre").textContent = nombre;
  document.getElementById("modal-jugador-kpis").innerHTML = `
    <div class="bg-baize-950 p-2.5 rounded-xl border border-emerald-800/60 text-center">
        <span class="text-[10px] uppercase font-bold text-emerald-300 block">Partidos (G - P)</span>
        <span class="font-mono text-lg font-black text-white">${pj} (<span class="text-emerald-400">${g}</span> - <span class="text-rose-400">${p}</span>)</span>
    </div>
    <div class="bg-baize-950 p-2.5 rounded-xl border border-emerald-800/60 text-center">
        <span class="text-[10px] uppercase font-bold text-emerald-300 block">Promedio Gral</span>
        <span class="font-mono text-lg font-black text-emerald-300">${pg}</span>
    </div>
    <div class="bg-baize-950 p-2.5 rounded-xl border border-emerald-800/60 text-center">
        <span class="text-[10px] uppercase font-bold text-emerald-300 block">Serie Mayor</span>
        <span class="font-mono text-lg font-black text-gold-400">${bestSM}</span>
    </div>
    <div class="bg-baize-950 p-2.5 rounded-xl border border-emerald-800/60 text-center">
        <span class="text-[10px] uppercase font-bold text-emerald-300 block">3 Bandas (3B)</span>
        <span class="font-mono text-lg font-black text-amber-300">${tb}</span>
    </div>
  `;

  // Contenedor de partidas
  document.getElementById("modal-jugador-partidos").innerHTML =
    matchesJugador.length > 0
      ? partidosHtml
      : `<div class="bg-baize-950/60 p-4 rounded-xl text-center text-xs text-slate-400">Aún no ha disputado ninguna partida.</div>`;

  // Rivales pendientes en liga regular (los 11 compañeros de club restantes)
  const pendientes = state.players.filter(
    (p) => p !== nombre && !rivalesJugados.has(p)
  );

  document.getElementById("modal-jugador-pendientes").innerHTML =
    pendientes.length > 0
      ? pendientes
          .map(
            (p) =>
              `<span class="px-2.5 py-1 rounded-lg bg-baize-950 border border-emerald-700/50 text-slate-300 text-xs font-semibold">${p}</span>`
          )
          .join("")
      : `<span class="text-xs text-emerald-400 font-bold">¡Ha jugado contra todos los socios en la primera vuelta!</span>`;

  modal.classList.remove("hidden");
  lucide.createIcons();
}

function cerrarFichaJugadorModal() {
  const modal = document.getElementById("modal-jugador");
  if (modal) modal.classList.add("hidden");
}

// ==========================================
// GENERADOR DE BOLETÍN WHATSAPP UNIFICADO
// ==========================================
function generarTextoBoletinWhatsApp() {
  const stats = {};
  state.players.forEach((p) => {
    stats[p] = { name: p, pj: 0, g: 0, p: 0, saldo: 0, car: 0, tb: 0, ent: 0, pg: 0, mp: 0, sm: 0, refCount: 0 };
  });

  let clubCar = 0, clubEnt = 0, fastestInnings = 999, fastestMatchDesc = "";

  const regularMatches = state.matches.filter((m) => !isPlayoffRound(m.round));

  regularMatches.forEach((m) => {
    if (!stats[m.p1]) stats[m.p1] = { name: m.p1, pj: 0, g: 0, p: 0, saldo: 0, car: 0, tb: 0, ent: 0, pg: 0, mp: 0, sm: 0, refCount: 0 };
    if (!stats[m.p2]) stats[m.p2] = { name: m.p2, pj: 0, g: 0, p: 0, saldo: 0, car: 0, tb: 0, ent: 0, pg: 0, mp: 0, sm: 0, refCount: 0 };

    const s1 = stats[m.p1], s2 = stats[m.p2];
    const c1 = Number(m.car1), c2 = Number(m.car2), inn = Math.max(1, Number(m.innings));
    const sm1 = Number(m.sm1 || 0), sm2 = Number(m.sm2 || 0);
    const tb1 = Number(m.tb1 || 0), tb2 = Number(m.tb2 || 0);

    s1.pj++; s2.pj++;
    s1.car += c1; s2.car += c2;
    s1.tb += tb1; s2.tb += tb2;
    s1.ent += inn; s2.ent += inn;
    s1.saldo += c1 - c2; s2.saldo += c2 - c1;

    if (sm1 > s1.sm) s1.sm = sm1;
    if (sm2 > s2.sm) s2.sm = sm2;

    const avg1 = c1 / inn, avg2 = c2 / inn;
    if (avg1 > s1.mp) s1.mp = avg1;
    if (avg2 > s2.mp) s2.mp = avg2;

    if (c1 > c2) { s1.g++; s2.p++; }
    else if (c2 > c1) { s2.g++; s1.p++; }

    clubCar += c1 + c2;
    clubEnt += inn * 2;

    if (inn < fastestInnings) {
      fastestInnings = inn;
      fastestMatchDesc = `${m.p1} vs ${m.p2} (${inn} entradas)`;
    }

    if (m.referee && stats[m.referee]) stats[m.referee].refCount++;
  });

  const rows = Object.values(stats).map((s) => {
    s.pg = s.ent > 0 ? s.car / s.ent : 0;
    return s;
  });

  const countG = {};
  rows.forEach((r) => { countG[r.g] = (countG[r.g] || 0) + 1; });

  // Mismo criterio de ordenación que la tabla
  rows.sort((a, b) => compararJugadoresOficial(a, b, regularMatches, countG));

  const topTB = [...rows].sort((a, b) => b.tb - a.tb || b.g - a.g);
  const mejorProm = [...rows].sort((a, b) => b.mp - a.mp)[0];
  const mejorSM = [...rows].sort((a, b) => b.sm - a.sm)[0];
  const maxArbitro = [...rows].sort((a, b) => b.refCount - a.refCount)[0];

  let txt = `🏆 *CLUB ELCANO · CLASIFICACIÓN*\n`;
  txt += `🎱 *II MEMORIAL QUINI 2026*\n\n`;

  rows.forEach((r, idx) => {
    const sld = r.saldo > 0 ? `+${r.saldo}` : `${r.saldo}`;
    const playoffMark = idx < 4 ? " ⭐" : "";
    txt += `${idx + 1}. *${r.name}*${playoffMark}: ${r.g}V | Saldo: ${sld} | PG: ${r.pg.toFixed(3)}\n`;
  });

  txt += `\n⭐ *ZONA PLAY-OFF (SEMIFINALES A 120 CAR.):*\n`;
  txt += `• Semi 1: *${rows[0]?.name || "1º"}* vs *${rows[3]?.name || "4º"}*\n`;
  txt += `• Semi 2: *${rows[1]?.name || "2º"}* vs *${rows[2]?.name || "3º"}*\n`;

  txt += `\n🎯 *LÍDERES EN 3 BANDAS:*\n`;
  if (topTB[0]) txt += `• 1º *${topTB[0].name}*: ${topTB[0].tb} carambolas\n`;
  if (topTB[1]) txt += `• 2º *${topTB[1].name}*: ${topTB[1].tb} carambolas\n`;
  if (topTB[2]) txt += `• 3º *${topTB[2].name}*: ${topTB[2].tb} carambolas\n`;

  txt += `\n⭐ *MEJORES MARCAS LIGA REGULAR:*\n`;
  if (mejorSM) txt += `• Serie Mayor: *${mejorSM.name}* (${mejorSM.sm})\n`;
  if (mejorProm) txt += `• Mejor Promedio: *${mejorProm.name}* (${mejorProm.mp.toFixed(3)})\n`;
  if (fastestMatchDesc) txt += `• Partida Más Rápida: *${fastestMatchDesc}*\n`;
  if (maxArbitro && maxArbitro.refCount > 0) {
    txt += `• Árbitro Más Activo: *${maxArbitro.name}* (${maxArbitro.refCount} partidas)\n`;
  }
  txt += `• Promedio Global Club: *${(clubEnt > 0 ? clubCar / clubEnt : 0).toFixed(3)}*\n`;

  return txt;
}

function mostrarBoletinWhatsApp() {
  const modal = document.getElementById("modal-boletin");
  const textarea = document.getElementById("texto-boletin-whatsapp");
  if (!modal || !textarea) return;

  textarea.value = generarTextoBoletinWhatsApp();
  modal.classList.remove("hidden");
  lucide.createIcons();
}

function cerrarBoletinModal() {
  const modal = document.getElementById("modal-boletin");
  if (modal) modal.classList.add("hidden");
}

function copiarTextoBoletin() {
  const textarea = document.getElementById("texto-boletin-whatsapp");
  if (!textarea) return;

  textarea.select();
  textarea.setSelectionRange(0, 99999);

  navigator.clipboard
    .writeText(textarea.value)
    .then(() => {
      showToast("¡Boletín copiado al portapapeles! Listo para pegar en WhatsApp.");
      cerrarBoletinModal();
    })
    .catch(() => {
      document.execCommand("copy");
      showToast("¡Boletín copiado! Listo para WhatsApp.");
      cerrarBoletinModal();
    });
}

// ==========================================
// GESTIÓN DEL PIN DE ADMINISTRADOR
// ==========================================
function toggleAdminModal() {
  if (isAdmin) {
    isAdmin = false;
    actualizarEstadoAdminUI();
    showToast("Modo administrador bloqueado.");
  } else {
    const modal = document.getElementById("modal-pin");
    const input = document.getElementById("input-pin-admin");
    if (input) input.value = "";
    if (modal) modal.classList.remove("hidden");
    setTimeout(() => { if (input) input.focus(); }, 150);
  }
}

function cerrarPinModal() {
  const modal = document.getElementById("modal-pin");
  if (modal) modal.classList.add("hidden");
}

function verificarPinAdmin() {
  const input = document.getElementById("input-pin-admin");
  if (!input) return;

  if (input.value === ADMIN_PIN) {
    isAdmin = true;
    cerrarPinModal();
    actualizarEstadoAdminUI();
    showToast("¡Acceso concedido! Ya puedes gestionar actas.");
  } else {
    alert("PIN incorrecto. Acceso denegado.");
    input.value = "";
  }
}

function actualizarEstadoAdminUI() {
  const icon = document.getElementById("icon-admin-lock");
  const text = document.getElementById("text-admin-status");

  if (isAdmin) {
    if (icon) icon.setAttribute("data-lucide", "lock-open");
    if (text) text.textContent = "Admin ON";
  } else {
    if (icon) icon.setAttribute("data-lucide", "lock");
    if (text) text.textContent = "Acceso PIN";
  }
  lucide.createIcons();
}

// ==========================================
// REGISTRAR Y EDITAR ACTAS
// ==========================================
function populatePlayerSelects() {
  ["live-p1-select", "live-p2-select", "form-p1", "form-p2"].forEach((id, idx) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    const current = sel.value;
    sel.innerHTML = state.players.map((p) => `<option value="${p}">${p}</option>`).join("");
    if (current && state.players.includes(current)) {
      sel.value = current;
    } else if (state.players[idx % 2]) {
      sel.value = state.players[idx % 2];
    }
  });

  const refereeSel = document.getElementById("form-referee");
  const assistantSel = document.getElementById("form-assistant");
  if (refereeSel && assistantSel) {
    const refCurrent = refereeSel.value;
    const astCurrent = assistantSel.value;

    const optionsHtml = `<option value="">— Ninguno —</option>` + state.players.map((p) => `<option value="${p}">${p}</option>`).join("");
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
  document.getElementById("form-submit-label").textContent = "Actualizar Acta y Recalcular";
  document.getElementById("nav-label-acta").textContent = "Editando Acta...";

  switchTab("new-match");
}

function cancelEditMatch() {
  state.editingMatchId = null;
  const banner = document.getElementById("edit-mode-banner");
  if (banner) banner.classList.add("hidden");
  document.getElementById("form-match-title").textContent = "Acta Oficial de Partido";
  document.getElementById("form-submit-label").textContent = "Guardar Acta Oficial";
  document.getElementById("nav-label-acta").textContent = "Registrar Acta";
  document.getElementById("form-date").value = new Date().toISOString().split("T")[0];
}

function saveMatchRecord(e) {
  e.preventDefault();

  // Comprobación de seguridad: exige PIN
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
  };

  if (state.editingMatchId) {
    const idx = state.matches.findIndex((m) => m.id === state.editingMatchId);
    if (idx !== -1) state.matches[idx] = matchData;
    cancelEditMatch();
    showToast("Acta corregida y clasificación actualizada.");
  } else {
    state.matches.unshift(matchData);
    showToast("Nueva acta guardada correctamente.");
  }

  // Limpieza de campos para la siguiente acta
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
  subirEstadoAFirebase(); // Se envía inmediatamente a la nube para todos los móviles
  switchTab("standings");
}

// ==========================================
// HISTORIAL DE PARTIDAS
// ==========================================
function renderHistory() {
  const filterEl = document.getElementById("history-filter-mod");
  const mod = filterEl ? filterEl.value : "TODAS";
  const container = document.getElementById("history-list");
  if (!container) return;

  const list = state.matches.filter((m) => mod === "TODAS" || m.modality === mod);

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

function deleteMatch(id) {
  if (!isAdmin) {
    toggleAdminModal();
    alert("Solo el administrador con PIN puede eliminar actas.");
    return;
  }
  if (!confirm("¿Seguro que quieres eliminar esta acta? La clasificación se recalculará automáticamente.")) return;
  state.matches = state.matches.filter((m) => m.id !== id);
  saveState();
  subirEstadoAFirebase();
  renderHistory();
  renderStandings();
  showToast("Acta eliminada.");
}

// ==========================================
// MARCADOR EN VIVO
// ==========================================
function updateLiveSetup() {
  state.live.p1 = document.getElementById("live-p1-select").value;
  state.live.p2 = document.getElementById("live-p2-select").value;
  state.live.modality = document.getElementById("live-modality").value;
  state.live.target = Number(document.getElementById("live-target").value || 90);
  state.live.maxInnings = Number(document.getElementById("live-max-innings").value || 100);
  saveState();
  renderLiveScoreboard();
}

function renderLiveScoreboard() {
  const l = state.live;
  const p1Select = document.getElementById("live-p1-select");
  const p2Select = document.getElementById("live-p2-select");
  const modSelect = document.getElementById("live-modality");
  const targetInput = document.getElementById("live-target");
  const maxInnInput = document.getElementById("live-max-innings");

  if (p1Select) p1Select.value = l.p1;
  if (p2Select) p2Select.value = l.p2;
  if (modSelect) modSelect.value = l.modality;
  if (targetInput) targetInput.value = l.target;
  if (maxInnInput) maxInnInput.value = l.maxInnings;

  const nameP1 = document.getElementById("live-name-p1");
  const nameP2 = document.getElementById("live-name-p2");
  const scoreP1 = document.getElementById("live-score-p1");
  const scoreP2 = document.getElementById("live-score-p2");
  const runP1 = document.getElementById("live-run-p1");
  const runP2 = document.getElementById("live-run-p2");
  const hrP1 = document.getElementById("live-hr-p1");
  const hrP2 = document.getElementById("live-hr-p2");
  const innDisplay = document.getElementById("live-innings");

  if (nameP1) nameP1.textContent = l.p1;
  if (nameP2) nameP2.textContent = l.p2;
  if (scoreP1) scoreP1.textContent = l.score1;
  if (scoreP2) scoreP2.textContent = l.score2;
  if (runP1) runP1.textContent = l.run1;
  if (runP2) runP2.textContent = l.run2;
  if (hrP1) hrP1.textContent = l.hr1;
  if (hrP2) hrP2.textContent = l.hr2;
  if (innDisplay) innDisplay.textContent = l.innings;

  const inn = Math.max(1, l.innings);
  const avgP1 = document.getElementById("live-avg-p1");
  const avgP2 = document.getElementById("live-avg-p2");
  if (avgP1) avgP1.textContent = (l.score1 / inn).toFixed(3);
  if (avgP2) avgP2.textContent = (l.score2 / inn).toFixed(3);

  const badgeMod = document.getElementById("live-badge-modality");
  const targetDisp = document.getElementById("live-target-display");
  if (badgeMod) badgeMod.textContent = l.modality;
  if (targetDisp) targetDisp.textContent = `Distancia: ${l.target} car. | Límite: ${l.maxInnings} ent.`;

  const c1 = document.getElementById("live-card-p1");
  const c2 = document.getElementById("live-card-p2");
  const b1 = document.getElementById("live-turn-badge-1");
  const b2 = document.getElementById("live-turn-badge-2");

  if (c1 && c2 && b1 && b2) {
    if (l.turn === 1) {
      c1.classList.add("active-turn-glow");
      c2.classList.remove("active-turn-glow");
      b1.classList.remove("hidden");
      b2.classList.add("hidden");
    } else {
      c2.classList.add("active-turn-glow");
      c1.classList.remove("active-turn-glow");
      b2.classList.remove("hidden");
      b1.classList.add("hidden");
    }
  }
}

function addLiveCarom(player, delta, es3B = false) {
  const l = state.live;
  if (player === 1) {
    l.score1 = Math.max(0, l.score1 + delta);
    l.run1 = Math.max(0, l.run1 + delta);
    if (es3B) l.tb1 = Math.max(0, (l.tb1 || 0) + 1);
    if (l.run1 > l.hr1) l.hr1 = l.run1;
  } else {
    l.score2 = Math.max(0, l.score2 + delta);
    l.run2 = Math.max(0, l.run2 + delta);
    if (es3B) l.tb2 = Math.max(0, (l.tb2 || 0) + 1);
    if (l.run2 > l.hr2) l.hr2 = l.run2;
  }
  saveState();
  renderLiveScoreboard();
}

function switchTurn() {
  const l = state.live;
  if (l.turn === 1) {
    l.run1 = 0;
    l.turn = 2;
  } else {
    l.run2 = 0;
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
  state.live.score2 = 0;
  state.live.run2 = 0;
  state.live.hr2 = 0;
  state.live.tb2 = 0;
  state.live.innings = 1;
  state.live.turn = 1;
  saveState();
  renderLiveScoreboard();
  showToast("Marcador de mesa reiniciado.");
}

function finishLiveMatchToRecord() {
  const l = state.live;
  cancelEditMatch();
  document.getElementById("form-modality").value = l.modality;
  document.getElementById("form-date").value = new Date().toISOString().split("T")[0];
  document.getElementById("form-innings").value = l.innings;
  document.getElementById("form-p1").value = l.p1;
  document.getElementById("form-car1").value = l.score1;
  document.getElementById("form-sm1").value = l.hr1;
  document.getElementById("form-tb1").value = l.tb1 || 0;
  document.getElementById("form-p2").value = l.p2;
  document.getElementById("form-car2").value = l.score2;
  document.getElementById("form-sm2").value = l.hr2;
  document.getElementById("form-tb2").value = l.tb2 || 0;
  updateFormPreview();
  switchTab("new-match");
  showToast("Datos cargados en el acta. Revisa y pulsa Guardar.");
}

// ==========================================
// JUGADORES Y BACKUPS
// ==========================================
function renderPlayers() {
  const grid = document.getElementById("players-grid");
  if (!grid) return;
  grid.innerHTML = state.players
    .map(
      (p) => `
        <div class="flex items-center justify-between bg-baize-950/80 border border-emerald-800/50 rounded-xl px-4 py-3">
            <span class="text-base font-bold text-white">${p}</span>
            <button onclick="removePlayer('${p}')" class="text-rose-400 hover:text-rose-300 text-xs font-semibold px-2 py-1 rounded bg-rose-950/40">Eliminar</button>
        </div>
      `
    )
    .join("");
}

function addPlayer(e) {
  e.preventDefault();
  const input = document.getElementById("new-player-name");
  const name = input.value.trim();
  if (!name || state.players.includes(name)) return;
  state.players.push(name);
  input.value = "";
  saveState();
  populatePlayerSelects();
  renderPlayers();
  showToast(`Socio ${name} añadido.`);
}

function removePlayer(name) {
  if (!confirm(`¿Eliminar a ${name} de la lista de socios?`)) return;
  state.players = state.players.filter((p) => p !== name);
  saveState();
  populatePlayerSelects();
  renderPlayers();
}

function downloadBackupJSON() {
  const blob = new Blob([JSON.stringify(state, null, 2)], {
    type: "application/json",
  });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `Backup_Club_Elcano_${new Date().toISOString().split("T")[0]}.json`;
  a.click();
}

function downloadDatosJS() {
  const exportData = {
    players: state.players,
    matches: state.matches,
  };

  const contenido = `// Archivo de datos autónomo para Club Elcano\nconst DATOS_TORNEO = ${JSON.stringify(exportData, null, 2)};\n`;
  const blob = new Blob([contenido], { type: "application/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "datos.js";
  a.click();
  showToast("Descargado 'datos.js'. Cópialo en tu carpeta Web_billar reemplazando el viejo.");
}

function restoreBackupJSON(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function (e) {
    try {
      const data = JSON.parse(e.target.result);
      if (data.players && data.matches) {
        state.players = data.players;
        state.matches = data.matches;
        saveState();
        populatePlayerSelects();
        renderStandings();
        showToast("Copia de seguridad restaurada con éxito.");
      }
    } catch (err) {
      alert("El archivo JSON no es válido.");
    }
  };
  reader.readAsText(file);
}

function resetDemoData() {
  if (!confirm("¿Deseas reiniciar los datos locales a los valores por defecto?")) return;
  localStorage.removeItem(STORAGE_KEY);
  loadState();
  populatePlayerSelects();
  renderStandings();
  showToast("Datos locales restablecidos.");
}

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 3200);
}

document.addEventListener("DOMContentLoaded", () => {
  loadStateFallback(); // Carga rápida inicial desde la memoria local
  initRealtimeSync();  // Conecta la escucha en tiempo real con Firebase Firestore
  populatePlayerSelects();
  const dateInput = document.getElementById("form-date");
  if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
  renderStandings();
  renderLiveScoreboard();
  lucide.createIcons();
});