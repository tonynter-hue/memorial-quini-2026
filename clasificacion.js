// ==========================================
// CLASIFICACIÓN GENERAL, PLAY-OFF Y FICHA DE JUGADOR
// ==========================================
function compararJugadoresOficial(a, b, matchesList, countG) {
  if (b.g !== a.g) return b.g - a.g;

  if (countG[a.g] === 2) {
    const duel = matchesList.find(
      (m) =>
        (m.p1 === a.name && m.p2 === b.name) ||
        (m.p1 === b.name && m.p2 === a.name),
    );
    if (duel) {
      const aGano =
        (duel.p1 === a.name && duel.car1 > duel.car2) ||
        (duel.p2 === a.name && duel.car2 > duel.car1);
      const bGano =
        (duel.p1 === b.name && duel.car1 > duel.car2) ||
        (duel.p2 === b.name && duel.car2 > duel.car1);
      if (aGano) return -1;
      if (bGano) return 1;
    }
  }

  if (b.saldo !== a.saldo) return b.saldo - a.saldo;
  return b.pg - a.pg;
}

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

  const regularMatches = state.matches.filter(
    (m) => (mod === "TODAS" || m.modality === mod) && !isPlayoffRound(m.round),
  );

  let clubCar = 0,
    clubEnt = 0,
    bestMP = 0,
    bestMPName = "—",
    bestSM = 0,
    bestSMName = "—";

  regularMatches.forEach((m) => {
    if (!stats[m.p1])
      stats[m.p1] = {
        name: m.p1,
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
    if (!stats[m.p2])
      stats[m.p2] = {
        name: m.p2,
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

    const s1 = stats[m.p1],
      s2 = stats[m.p2];
    const c1 = Number(m.car1),
      c2 = Number(m.car2),
      inn = Math.max(1, Number(m.innings));
    const sm1 = Number(m.sm1 || 0),
      sm2 = Number(m.sm2 || 0);
    const tb1 = Number(m.tb1 || 0),
      tb2 = Number(m.tb2 || 0);

    s1.pj++;
    s2.pj++;
    s1.car += c1;
    s2.car += c2;
    s1.tb += tb1;
    s2.tb += tb2;
    s1.ent += inn;
    s2.ent += inn;
    s1.saldo += c1 - c2;
    s2.saldo += c2 - c1;

    if (sm1 > s1.sm) s1.sm = sm1;
    if (sm2 > s2.sm) s2.sm = sm2;

    const avg1 = c1 / inn,
      avg2 = c2 / inn;
    if (avg1 > s1.mp) s1.mp = avg1;
    if (avg2 > s2.mp) s2.mp = avg2;

    if (c1 > c2) {
      s1.g++;
      s2.p++;
    } else if (c2 > c1) {
      s2.g++;
      s1.p++;
    }

    clubCar += c1 + c2;
    clubEnt += inn * 2;

    if (avg1 > bestMP) {
      bestMP = avg1;
      bestMPName = m.p1;
    }
    if (avg2 > bestMP) {
      bestMP = avg2;
      bestMPName = m.p2;
    }
    if (sm1 > bestSM) {
      bestSM = sm1;
      bestSMName = m.p1;
    }
    if (sm2 > bestSM) {
      bestSM = sm2;
      bestSMName = m.p2;
    }
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
    if (sortBy === "SALDO")
      return b.saldo - a.saldo || b.g - a.g || b.pg - a.pg;
    if (sortBy === "PG") return b.pg - a.pg || b.g - a.g || b.saldo - a.saldo;
    if (sortBy === "TB") return b.tb - a.tb || b.g - a.g || b.saldo - a.saldo;
    if (sortBy === "MP") return b.mp - a.mp || b.pg - a.pg;
    if (sortBy === "SM") return b.sm - a.sm || b.pg - a.pg;

    return compararJugadoresOficial(a, b, regularMatches, victoriasCount);
  });

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
  if (kpiClubAvg)
    kpiClubAvg.textContent = (clubEnt > 0 ? clubCar / clubEnt : 0).toFixed(3);
  if (kpiCarTotal)
    kpiCarTotal.textContent = `${clubCar} carambolas / ${clubEnt} entradas`;
  if (kpiBestMp) kpiBestMp.textContent = bestMP.toFixed(3);
  if (kpiBestMpPlayer) kpiBestMpPlayer.textContent = bestMPName;
  if (kpiBestSm) kpiBestSm.textContent = bestSM;
  if (kpiBestSmPlayer) kpiBestSmPlayer.textContent = bestSMName;

  const thColumna6 =
    document.getElementById("th-dinamica") ||
    document.querySelector("#tab-standings table thead tr th:nth-child(6)") ||
    document.querySelector("table thead tr th:nth-child(6)");
  if (thColumna6) {
    if (sortBy === "PG") thColumna6.textContent = "PROM.";
    else if (sortBy === "SM") thColumna6.textContent = "S.M.";
    else if (sortBy === "TB") thColumna6.textContent = "3 BANDAS";
    else if (sortBy === "MP") thColumna6.textContent = "M. PROM.";
    else thColumna6.textContent = "SALDO";
  }

  const tbody = document.getElementById("standings-tbody");
  if (tbody) {
    tbody.innerHTML = rows
      .map((r, i) => {
        let datoStr = "";
        let datoColor = "text-gold-400 font-bold";

        if (sortBy === "PG") {
          datoStr = r.pg.toFixed(3);
          datoColor = "text-emerald-200 font-black";
        } else if (sortBy === "SM") {
          datoStr = r.sm;
          datoColor = "text-gold-400 font-black";
        } else if (sortBy === "TB") {
          datoStr = r.tb;
          datoColor = "text-amber-300 font-black";
        } else if (sortBy === "MP") {
          datoStr = r.mp > 0 ? r.mp.toFixed(3) : "0.000";
          datoColor = "text-slate-100 font-bold";
        } else {
          datoStr = r.saldo > 0 ? `+${r.saldo}` : `${r.saldo}`;
          datoColor =
            r.saldo > 0
              ? "text-emerald-300 font-black"
              : r.saldo < 0
                ? "text-rose-400 font-black"
                : "text-gold-400 font-bold";
        }

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
              <td class="py-4 px-4 text-center font-mono text-lg bg-gold-500/10 ${datoColor}">${datoStr}</td>
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

  renderPlayoffBracket(rows);
  lucide.createIcons();
}

function verFichaJugador(nombre) {
  const modal = document.getElementById("modal-jugador");
  if (!modal) return;

  const matchesOfPlayer = state.matches.filter(
    (m) => m.p1 === nombre || m.p2 === nombre,
  );

  let pj = 0, g = 0, p = 0, carTot = 0, entTot = 0, maxSerie = 0, tbTot = 0;
  const rivalesJugados = new Set();

  matchesOfPlayer.forEach((m) => {
    pj++;
    const isP1 = m.p1 === nombre;
    const myCar = isP1 ? Number(m.car1) : Number(m.car2);
    const oppCar = isP1 ? Number(m.car2) : Number(m.car1);
    const mySm = isP1 ? Number(m.sm1 || 0) : Number(m.sm2 || 0);
    const myTb = isP1 ? Number(m.tb1 || 0) : Number(m.tb2 || 0);
    const inn = Math.max(1, Number(m.innings));
    const rival = isP1 ? m.p2 : m.p1;

    rivalesJugados.add(rival);
    carTot += myCar;
    entTot += inn;
    tbTot += myTb;
    if (mySm > maxSerie) maxSerie = mySm;

    if (myCar > oppCar) g++;
    else if (oppCar > myCar) p++;
  });

  const prom = entTot > 0 ? (carTot / entTot).toFixed(3) : "0.000";

  document.getElementById("modal-jugador-nombre").textContent = nombre;

  const kpis = document.getElementById("modal-jugador-kpis");
  kpis.innerHTML = `
    <div class="bg-baize-950 p-2 rounded-xl border border-emerald-800 text-center">
      <span class="text-[10px] uppercase font-bold text-slate-400 block">Partidos (G/P)</span>
      <span class="font-mono text-sm font-black text-white">${pj} (<span class="text-emerald-400">${g}</span>/<span class="text-rose-400">${p}</span>)</span>
    </div>
    <div class="bg-baize-950 p-2 rounded-xl border border-emerald-800 text-center">
      <span class="text-[10px] uppercase font-bold text-slate-400 block">Promedio</span>
      <span class="font-mono text-sm font-black text-emerald-300">${prom}</span>
    </div>
    <div class="bg-baize-950 p-2 rounded-xl border border-emerald-800 text-center">
      <span class="text-[10px] uppercase font-bold text-slate-400 block">Serie Mayor</span>
      <span class="font-mono text-sm font-black text-gold-400">${maxSerie}</span>
    </div>
    <div class="bg-baize-950 p-2 rounded-xl border border-emerald-800 text-center">
      <span class="text-[10px] uppercase font-bold text-slate-400 block">3 Bandas</span>
      <span class="font-mono text-sm font-black text-amber-300">${tbTot}</span>
    </div>
  `;

  const containerPartidos = document.getElementById("modal-jugador-partidos");
  if (matchesOfPlayer.length === 0) {
    containerPartidos.innerHTML = `<div class="p-3 text-center text-xs text-slate-400 bg-baize-950 rounded-lg">Aún no ha disputado partidas registradas.</div>`;
  } else {
    containerPartidos.innerHTML = matchesOfPlayer
      .map((m) => {
        const isP1 = m.p1 === nombre;
        const myScore = isP1 ? m.car1 : m.car2;
        const oppScore = isP1 ? m.car2 : m.car1;
        const oppName = isP1 ? m.p2 : m.p1;
        const won = myScore > oppScore;
        const avg = (myScore / m.innings).toFixed(3);

        return `
          <div class="bg-baize-950 p-2.5 rounded-lg border border-emerald-900/60 flex items-center justify-between text-xs">
            <div class="flex items-center gap-2">
              <span class="px-1.5 py-0.5 rounded font-black font-mono text-[10px] ${won ? "bg-emerald-500/20 text-emerald-300" : "bg-rose-500/20 text-rose-300"}">${won ? "V" : "D"}</span>
              <span class="text-slate-400 font-mono">${m.date}</span>
              <span class="text-white font-bold">vs ${oppName}</span>
            </div>
            <div class="flex items-center gap-2 font-mono">
              <span class="${won ? "text-emerald-300 font-bold" : "text-slate-300"}">${myScore} - ${oppScore}</span>
              <span class="text-slate-400 text-[11px]">(${m.innings} ent. · Prom: ${avg})</span>
            </div>
          </div>
        `;
      })
      .join("");
  }

  const pendientesContainer = document.getElementById("modal-jugador-pendientes");
  const rivalesPendientes = state.players.filter(
    (p) => p !== nombre && !rivalesJugados.has(p),
  );

  if (rivalesPendientes.length === 0) {
    pendientesContainer.innerHTML = `<span class="text-xs text-emerald-300">¡Ha completado todos los partidos de la ronda regular!</span>`;
  } else {
    pendientesContainer.innerHTML = rivalesPendientes
      .map(
        (r) =>
          `<span class="px-2 py-1 rounded bg-baize-950 border border-emerald-800/60 text-xs text-slate-300">${r}</span>`,
      )
      .join("");
  }

  modal.classList.remove("hidden");
  lucide.createIcons();
}

function cerrarFichaJugadorModal() {
  const modal = document.getElementById("modal-jugador");
  if (modal) modal.classList.add("hidden");
}

function renderPlayoffBracket(topRows) {
  const container = document.getElementById("playoff-bracket");
  if (!container) return;

  const p1 = topRows[0] ? topRows[0].name : "1º Clasificado";
  const p2 = topRows[1] ? topRows[1].name : "2º Clasificado";
  const p3 = topRows[2] ? topRows[2].name : "3º Clasificado";
  const p4 = topRows[3] ? topRows[3].name : "4º Clasificado";

  const mSemi1 = state.matches.find(
    (m) => m.round === "Semifinal 1 (1º vs 4º)",
  );
  const mSemi2 = state.matches.find(
    (m) => m.round === "Semifinal 2 (2º vs 3º)",
  );
  const mFinal = state.matches.find((m) => m.round === "Gran Final");

  let winnerSemi1 = mSemi1
    ? mSemi1.car1 > mSemi1.car2
      ? mSemi1.p1
      : mSemi1.p2
    : "Vencedor Semi 1";
  let winnerSemi2 = mSemi2
    ? mSemi2.car1 > mSemi2.car2
      ? mSemi2.p1
      : mSemi2.p2
    : "Vencedor Semi 2";
  let champion = mFinal
    ? mFinal.car1 > mFinal.car2
      ? mFinal.p1
      : mFinal.p2
    : null;

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

function generarTextoBoletinWhatsApp() {
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
      refCount: 0,
    };
  });

  let clubCar = 0,
    clubEnt = 0,
    fastestInnings = 999,
    fastestMatchDesc = "";

  const regularMatches = state.matches.filter((m) => !isPlayoffRound(m.round));

  regularMatches.forEach((m) => {
    if (!stats[m.p1])
      stats[m.p1] = {
        name: m.p1,
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
        refCount: 0,
      };
    if (!stats[m.p2])
      stats[m.p2] = {
        name: m.p2,
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
        refCount: 0,
      };

    const s1 = stats[m.p1],
      s2 = stats[m.p2];
    const c1 = Number(m.car1),
      c2 = Number(m.car2),
      inn = Math.max(1, Number(m.innings));
    const sm1 = Number(m.sm1 || 0),
      sm2 = Number(m.sm2 || 0);
    const tb1 = Number(m.tb1 || 0),
      tb2 = Number(m.tb2 || 0);

    s1.pj++;
    s2.pj++;
    s1.car += c1;
    s2.car += c2;
    s1.tb += tb1;
    s2.tb += tb2;
    s1.ent += inn;
    s2.ent += inn;
    s1.saldo += c1 - c2;
    s2.saldo += c2 - c1;

    if (sm1 > s1.sm) s1.sm = sm1;
    if (sm2 > s2.sm) s2.sm = sm2;

    const avg1 = c1 / inn,
      avg2 = c2 / inn;
    if (avg1 > s1.mp) s1.mp = avg1;
    if (avg2 > s2.mp) s2.mp = avg2;

    if (c1 > c2) {
      s1.g++;
      s2.p++;
    } else if (c2 > c1) {
      s2.g++;
      s1.p++;
    }

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
  rows.forEach((r) => {
    countG[r.g] = (countG[r.g] || 0) + 1;
  });

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
  if (mejorProm)
    txt += `• Mejor Promedio: *${mejorProm.name}* (${mejorProm.mp.toFixed(3)})\n`;
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
      showToast(
        "¡Boletín copiado al portapapeles! Listo para pegar en WhatsApp.",
      );
      cerrarBoletinModal();
    })
    .catch(() => {
      document.execCommand("copy");
      showToast("¡Boletín copiado! Listo para WhatsApp.");
      cerrarBoletinModal();
    });
}