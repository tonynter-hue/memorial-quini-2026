// ==========================================
// CÁLCULO Y VISUALIZACIÓN DE ESTADÍSTICAS
// ==========================================
function calcularMetricasJugador(runs, scoreActual) {
  const list = runs || [];
  const totalInn = list.length;
  const conPuntos = list.filter((r) => r > 0).length;
  const blancos = list.filter((r) => r === 0).length;
  const cincoOMas = list.filter((r) => r >= 5).length;

  const rp = totalInn > 0 ? conPuntos / totalInn : 0;
  const hrp5 = totalInn > 0 ? cincoOMas / totalInn : 0;
  const avg = totalInn > 0 ? scoreActual / totalInn : 0;

  const distribucion = {};
  list.forEach((r) => {
    distribucion[r] = (distribucion[r] || 0) + 1;
  });

  return { totalInn, conPuntos, blancos, cincoOMas, rp, hrp5, avg, distribucion };
}

function abrirEstadisticasLiveModal(matchCustom = null) {
  const modal = document.getElementById("modal-stats");
  if (!modal) return;

  let p1Name, p2Name, p1Ball, score1, score2, runs1, runs2;

  if (matchCustom) {
    p1Name = matchCustom.p1;
    p2Name = matchCustom.p2;
    p1Ball = "blanca";
    score1 = matchCustom.car1;
    score2 = matchCustom.car2;
    runs1 = matchCustom.runs1 || [];
    runs2 = matchCustom.runs2 || [];
    const fechaFmt = typeof formatearFechaDDMMAAAA === "function" ? formatearFechaDDMMAAAA(matchCustom.date) : matchCustom.date;
    document.getElementById("stats-modal-subtitle").textContent = `${matchCustom.round || "Liga Regular"} · ${fechaFmt} · Billar Elcano (Sevilla)`;
  } else {
    const l = state.live;
    p1Name = l.p1;
    p2Name = l.p2;
    p1Ball = l.p1Ball || "blanca";
    score1 = l.score1;
    score2 = l.score2;
    runs1 = [...(l.runs1 || [])];
    runs2 = [...(l.runs2 || [])];
    if (l.turn === 1 && l.run1 > 0) runs1.push(l.run1);
    if (l.turn === 2 && l.run2 > 0) runs2.push(l.run2);
    document.getElementById("stats-modal-subtitle").textContent = `Marcador en Vivo · ${l.modality || "Libre"} · ${l.round || "Jornada 1"}`;
  }

  const m1 = calcularMetricasJugador(runs1, score1);
  const m2 = calcularMetricasJugador(runs2, score2);

  const rp1Porc = (m1.rp * 100).toFixed(1).replace(".", ",");
  const rp2Porc = (m2.rp * 100).toFixed(1).replace(".", ",");

  const hrp1Porc = (m1.hrp5 * 100).toFixed(1).replace(".", ",");
  const hrp2Porc = (m2.hrp5 * 100).toFixed(1).replace(".", ",");

  const kpiContainer = document.getElementById("stats-comparativa-kpis");
  kpiContainer.innerHTML = `
    <div class="bg-baize-950 p-2.5 rounded-xl border border-emerald-800 text-center">
      <span class="text-[10px] uppercase font-bold text-slate-400 block">Carambolas / Entradas</span>
      <div class="font-mono text-sm font-black text-white mt-1">
        <span class="${score1 >= score2 ? "text-emerald-400" : "text-slate-300"}">${score1}</span> (${m1.totalInn}) vs 
        <span class="${score2 >= score1 ? "text-emerald-400" : "text-slate-300"}">${score2}</span> (${m2.totalInn})
      </div>
    </div>

    <div class="bg-baize-950 p-2.5 rounded-xl border border-emerald-800 text-center">
      <span class="text-[10px] uppercase font-bold text-slate-400 block">Promedio Partido</span>
      <div class="font-mono text-sm font-black text-emerald-300 mt-1">
        ${m1.avg.toFixed(3)} vs ${m2.avg.toFixed(3)}
      </div>
    </div>

    <div class="bg-baize-950 p-2.5 rounded-xl border border-emerald-800 text-center">
      <span class="text-[10px] uppercase font-bold text-slate-400 block" title="Porcentaje de entradas con al menos una carambola">Entradas acertadas</span>
      <div class="font-mono text-sm font-black text-gold-400 mt-1">
        ${rp1Porc}% vs ${rp2Porc}%
      </div>
    </div>

    <div class="bg-baize-950 p-2.5 rounded-xl border border-emerald-800 text-center">
      <span class="text-[10px] uppercase font-bold text-slate-400 block" title="Porcentaje de entradas con 5 o más carambolas">Más de 5 puntos</span>
      <div class="font-mono text-sm font-black text-amber-300 mt-1">
        ${hrp1Porc}% vs ${hrp2Porc}%
      </div>
    </div>
  `;

  const thRow = document.getElementById("stats-tabla-header");
  thRow.innerHTML = `
    <th colspan="4" class="py-1.5 px-2 text-center text-xs font-bold text-white bg-baize-950">
      <span class="inline-block w-2.5 h-2.5 rounded-full ${p1Ball === "blanca" ? "ball-white" : "ball-yellow"} mr-1.5 align-middle"></span>
      ${p1Name}
    </th>
    <th colspan="4" class="py-1.5 px-2 text-center text-xs font-bold text-white bg-baize-950 border-l border-emerald-800">
      <span class="inline-block w-2.5 h-2.5 rounded-full ${p1Ball === "blanca" ? "ball-yellow" : "ball-white"} mr-1.5 align-middle"></span>
      ${p2Name}
    </th>
  `;

  const maxInns = Math.max(runs1.length, runs2.length);
  const tbody = document.getElementById("stats-tabla-body");
  let filasHtml = "";
  let tot1 = 0, tot2 = 0;

  for (let i = 0; i < maxInns; i++) {
    const r1 = runs1[i];
    const r2 = runs2[i];

    let r1Txt = "", tot1Txt = "", avg1Txt = "";
    if (typeof r1 === "number") {
      tot1 += r1;
      if (r1 > 0) {
        r1Txt = r1;
        tot1Txt = tot1;
        avg1Txt = (tot1 / (i + 1)).toFixed(3);
      }
    }

    let r2Txt = "", tot2Txt = "", avg2Txt = "";
    if (typeof r2 === "number") {
      tot2 += r2;
      if (r2 > 0) {
        r2Txt = r2;
        tot2Txt = tot2;
        avg2Txt = (tot2 / (i + 1)).toFixed(3);
      }
    }

    filasHtml += `
      <tr class="hover:bg-emerald-900/30 transition-colors">
        <td class="py-1 text-slate-400">${i + 1}</td>
        <td class="py-1 font-bold ${r1 >= 5 ? "text-gold-400 font-black" : "text-slate-100"}">${r1Txt}</td>
        <td class="py-1 font-bold text-emerald-300">${tot1Txt}</td>
        <td class="py-1 font-mono font-semibold text-gold-300/90">${avg1Txt}</td>

        <td class="py-1 text-slate-400 border-l border-emerald-900">${i + 1}</td>
        <td class="py-1 font-bold ${r2 >= 5 ? "text-gold-400 font-black" : "text-slate-100"}">${r2Txt}</td>
        <td class="py-1 font-bold text-emerald-300">${tot2Txt}</td>
        <td class="py-1 font-mono font-semibold text-gold-300/90">${avg2Txt}</td>
      </tr>
    `;
  }

  tbody.innerHTML =
    filasHtml ||
    `<tr><td colspan="8" class="py-4 text-center text-slate-400 text-xs">No hay entradas registradas aún.</td></tr>`;

  // Columnas fijas 0 al 10 + solo las que superen 10 que hayan ocurrido
  const clavesFijas = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
  const tacadasAltasSet = new Set();

  runs1.forEach((r) => {
    if (typeof r === "number" && r > 10) tacadasAltasSet.add(r);
  });
  runs2.forEach((r) => {
    if (typeof r === "number" && r > 10) tacadasAltasSet.add(r);
  });

  const tacadasAltas = Array.from(tacadasAltasSet).sort((a, b) => a - b);
  const clavesFinales = [...clavesFijas, ...tacadasAltas];

  const distContainer = document.getElementById("stats-tacadas-grid");
  distContainer.innerHTML = `
    <table class="w-full text-center border-collapse text-xs font-mono">
      <thead>
        <tr class="bg-baize-950 text-slate-300 border-b border-emerald-800">
          <th class="py-1 px-2 text-left">Tacada</th>
          ${clavesFinales
            .map(
              (k) =>
                `<th class="py-1 px-1.5 text-center ${k === 0 ? "text-rose-400" : k >= 5 ? "text-gold-400 font-bold" : "text-slate-300"}">${k}</th>`
            )
            .join("")}
        </tr>
      </thead>
      <tbody class="divide-y divide-emerald-950">
        <tr>
          <td class="py-1.5 px-2 text-left font-bold text-white truncate max-w-[100px]">${p1Name}</td>
          ${clavesFinales
            .map((k) => {
              const cnt = m1.distribucion[k] || 0;
              return `<td class="py-1.5 px-1.5 ${cnt > 0 ? "font-bold text-emerald-300" : "text-slate-600"}">${cnt > 0 ? cnt : "-"}</td>`;
            })
            .join("")}
        </tr>
        <tr>
          <td class="py-1.5 px-2 text-left font-bold text-white truncate max-w-[100px]">${p2Name}</td>
          ${clavesFinales
            .map((k) => {
              const cnt = m2.distribucion[k] || 0;
              return `<td class="py-1.5 px-1.5 ${cnt > 0 ? "font-bold text-amber-300" : "text-slate-600"}">${cnt > 0 ? cnt : "-"}</td>`;
            })
            .join("")}
        </tr>
      </tbody>
    </table>
  `;

  modal.classList.remove("hidden");
  lucide.createIcons();
}

function imprimirEstadisticasPDF() {
  const tituloOriginal = document.title;
  const subtitulo = document.getElementById("stats-modal-subtitle")?.textContent || "Partida";
  document.title = `Estadisticas_${subtitulo.replace(/[^a-zA-Z0-9]/g, "_")}`;
  window.print();
  document.title = tituloOriginal;
}

function cerrarEstadisticasModal() {
  const modal = document.getElementById("modal-stats");
  if (modal) modal.classList.add("hidden");
}