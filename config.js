// ==========================================
// CONFIGURACIÓN FIREBASE & SEGURIDAD PIN
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyC8TnUjhlyhz5VWlkdfiw57-xGX_1_8zcA",
  authDomain: "memorial-quini-elcano.firebaseapp.com",
  projectId: "memorial-quini-elcano",
  storageBucket: "memorial-quini-elcano.firebasestorage.app",
  messagingSenderId: "166426350048",
  appId: "1:166426350048:web:9d9af0e329454a60f3db85",
};

if (!firebase.apps.length) {
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

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
    runs1: [],
    score2: 0,
    run2: 0,
    hr2: 0,
    tb2: 0,
    runs2: [],
    innings: 1,
    turn: 1,
  },
};

function isPlayoffRound(round) {
  if (!round) return false;
  return round.includes("Semifinal") || round.includes("Final");
}

function initRealtimeSync() {
  db.collection("torneo")
    .doc("memorial_quini")
    .onSnapshot(
      (doc) => {
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
          subirEstadoAFirebase();
        }
      },
      (error) => {
        console.warn("Conexión en modo local:", error);
        loadStateFallback();
      },
    );
}

function subirEstadoAFirebase() {
  db.collection("torneo")
    .doc("memorial_quini")
    .set({
      players: state.players,
      matches: state.matches,
      updatedAt: new Date().toISOString(),
    })
    .then(() => {
      showToast("Datos sincronizados en la nube.");
    })
    .catch((err) => {
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

function switchTab(tabId) {
  document
    .querySelectorAll(".tab-section")
    .forEach((el) => el.classList.add("hidden"));
  document
    .querySelectorAll(".nav-btn")
    .forEach((el) => el.classList.remove("active"));

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
    setTimeout(() => {
      if (input) input.focus();
    }, 150);
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

function showToast(msg) {
  const t = document.getElementById("toast");
  if (!t) return;
  t.textContent = msg;
  t.classList.remove("hidden");
  setTimeout(() => t.classList.add("hidden"), 3200);
}

document.addEventListener("DOMContentLoaded", () => {
  loadStateFallback();
  initRealtimeSync();
  populatePlayerSelects();
  const dateInput = document.getElementById("form-date");
  if (dateInput) dateInput.value = new Date().toISOString().split("T")[0];
  renderStandings();
  renderLiveScoreboard();
  lucide.createIcons();
});