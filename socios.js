// ==========================================
// PLANTILLA DE SOCIOS Y BACKUPS
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
      `,
    )
    .join("");
}

function addPlayer(e) {
  if (e && e.preventDefault) e.preventDefault();
  if (!isAdmin) {
    toggleAdminModal();
    alert("Solo el administrador con PIN puede añadir jugadores.");
    return;
  }

  const input = document.getElementById("new-player-name");
  const name = input.value.trim();
  if (!name) return;
  if (state.players.includes(name)) {
    showToast("Ese jugador ya existe en la lista.");
    return;
  }

  state.players.push(name);
  input.value = "";
  saveState();
  subirEstadoAFirebase();
  populatePlayerSelects();
  renderPlayers();
  showToast(`Jugador "${name}" añadido.`);
}

function removePlayer(name) {
  if (!isAdmin) {
    toggleAdminModal();
    alert("Solo el administrador con PIN puede eliminar socios.");
    return;
  }

  const hasMatches = state.matches.some((m) => m.p1 === name || m.p2 === name);
  if (hasMatches) {
    alert(`No puedes eliminar a "${name}" porque ya tiene partidas registradas.`);
    return;
  }

  if (!confirm(`¿Eliminar a ${name} de la lista de socios?`)) return;

  state.players = state.players.filter((p) => p !== name);
  saveState();
  subirEstadoAFirebase();
  populatePlayerSelects();
  renderPlayers();
  showToast(`Socio "${name}" eliminado.`);
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
  loadStateFallback();
  populatePlayerSelects();
  renderStandings();
  showToast("Datos locales restablecidos.");
}