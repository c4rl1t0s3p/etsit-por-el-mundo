/* ============================================================
   ETSIT POR EL MUNDO — country.js
   ============================================================ */

(async function () {
  const base = window.location.href.replace(/\?.*$/, "").replace(/\/[^/]*$/, "/");
  const DATA_URL = base + "data/oferta.json";

  const COUNTRY_NAMES = {
    AR:"Argentina", AT:"Austria", AU:"Australia", BE:"Bélgica",
    BG:"Bulgaria", BR:"Brasil", CA:"Canadá", CH:"Suiza",
    CL:"Chile", CN:"China", CO:"Colombia", CZ:"República Checa",
    DE:"Alemania", DK:"Dinamarca", ES:"España", FI:"Finlandia",
    FR:"Francia", GR:"Grecia", HR:"Croacia", HU:"Hungría",
    IE:"Irlanda", IT:"Italia", JP:"Japón", MK:"Macedonia del Norte",
    MX:"México", MY:"Malasia", NL:"Países Bajos", NO:"Noruega",
    PA:"Panamá", PE:"Perú", PL:"Polonia", PR:"Puerto Rico",
    PT:"Portugal", RO:"Rumanía", RS:"Serbia", SE:"Suecia",
    SI:"Eslovenia", TR:"Turquía", TW:"Taiwán", UK:"Reino Unido",
    US:"Estados Unidos", UY:"Uruguay"
  };

  const PROG_LABELS = {
    ER: "Erasmus+",
    MS: "MundoSantander",
    AB: "Acuerdo Bilateral",
    SICUE: "SICUE",
    "AB/ER": "AB / Erasmus",
    "ER/EIT HEALTH": "Erasmus / EIT Health",
    "MS/AB": "MS / AB"
  };

  /* ── Validar parámetro y normalizar código ─────────── */
  // svgMap puede haber enviado "GB" (su código) en lugar de "UK" (nuestro JSON)
  const SVG_TO_JSON = { GB: "UK" };
  const rawCode = (new URLSearchParams(location.search).get("country") || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(rawCode)) {
    location.href = "./";
    return;
  }
  // Traducir si es necesario (GB → UK, etc.)
  const cc = SVG_TO_JSON[rawCode] || rawCode;

  /* ── Cargar datos ──────────────────────────────────── */
  let data, info;
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    data = await res.json();
    info = (data.countries || {})[cc];
  } catch (err) {
    console.error("Error cargando datos:", err);
    document.getElementById("pageTitle").textContent = "Error al cargar los datos";
    return;
  }

  if (!info) {
    document.getElementById("pageTitle").textContent = `Sin datos: ${cc}`;
    document.getElementById("pageMeta").textContent = "No hay plazas disponibles para este país.";
    return;
  }

  /* ── Título y meta ─────────────────────────────────── */
  const countryName = COUNTRY_NAMES[cc] || cc;
  document.title = `${countryName} · ETSIT por el Mundo`;
  document.getElementById("pageTitle").textContent = countryName;
  document.getElementById("pageMeta").textContent =
    `${info.cities_count} ciudad${info.cities_count !== 1 ? "es" : ""} · ${info.offers_count} plaza${info.offers_count !== 1 ? "s" : ""}`;

  /* ── Stats toolbar ─────────────────────────────────── */
  const totalPlazas = info.offers.reduce((s, o) => s + (parseInt(o.plazas) || 0), 0);
  const unis = new Set(info.offers.map(o => o.universidad)).size;

  document.getElementById("toolbarStats").innerHTML = `
    <div class="t-stat"><span class="t-stat-num">${totalPlazas}</span><span class="t-stat-label">plazas</span></div>
    <div class="t-stat"><span class="t-stat-num">${unis}</span><span class="t-stat-label">universidades</span></div>
    <div class="t-stat"><span class="t-stat-num">${info.cities_count}</span><span class="t-stat-label">ciudades</span></div>
  `;

  /* ── Filtro ciudad ─────────────────────────────────── */
  const cityFilter = document.getElementById("cityFilter");
  cityFilter.innerHTML = `<option value="">Todas las ciudades</option>`;
  (info.cities || []).forEach(c => cityFilter.appendChild(new Option(c, c)));

  /* ── Render tabla ──────────────────────────────────── */
  function progBadgeClass(prog) {
    if (!prog) return "";
    const p = prog.toLowerCase();
    if (p.includes("er")) return "er";
    if (p.includes("ms")) return "ms";
    if (p.includes("ab")) return "ab";
    if (p.includes("sicue")) return "sicue";
    return "";
  }

  function formatCert(cert) {
    if (!cert || cert === "-") return '<span style="color:#bbb">—</span>';
    const short = cert.split(/[,(]/)[0].trim();
    return `<span title="${cert.replace(/"/g, "&quot;")}">${short}</span>`;
  }

  function render() {
    const cityVal = cityFilter.value;
    const offers = cityVal
      ? info.offers.filter(o => o.ciudad === cityVal)
      : info.offers;

    const tbody = document.getElementById("rows");
    const fragment = document.createDocumentFragment();

    // Agrupar por ciudad
    const byCity = {};
    for (const o of offers) {
      const c = o.ciudad || "Sin ciudad";
      if (!byCity[c]) byCity[c] = [];
      byCity[c].push(o);
    }

    for (const [city, cityOffers] of Object.entries(byCity)) {
      // Fila cabecera de ciudad
      if (!cityVal) {
        const hdr = document.createElement("tr");
        hdr.className = "city-group-header";
        hdr.innerHTML = `<td colspan="7">${city} <span style="font-weight:400;color:#888;">(${cityOffers.length} oferta${cityOffers.length !== 1 ? "s" : ""})</span></td>`;
        fragment.appendChild(hdr);
      }

      for (const o of cityOffers) {
        const tr = document.createElement("tr");
        const progLabel = PROG_LABELS[o.programa] || o.programa || "";
        const bClass = progBadgeClass(o.programa);
        tr.innerHTML = `
          <td><strong>${o.universidad || "—"}</strong></td>
          <td>${o.ciudad || "—"}</td>
          <td><code style="font-size:12px;color:#555;">${o.codigo_erasmus || "—"}</code></td>
          <td class="plazas-cell"><span class="plazas-badge">${o.plazas || "—"}</span></td>
          <td><span class="prog-badge ${bClass}">${progLabel}</span></td>
          <td style="font-size:12px;color:#5b6880;max-width:200px;">${formatCert(o.cert)}</td>
          <td class="obs-cell">${o.observaciones || ""}</td>
        `;
        fragment.appendChild(tr);
      }
    }

    if (fragment.childNodes.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `<td colspan="7"><div class="empty-state"><p>No hay plazas para esta ciudad.</p></div></td>`;
      fragment.appendChild(tr);
    }

    tbody.innerHTML = "";
    tbody.appendChild(fragment);
  }

  cityFilter.addEventListener("change", render);
  render();
})();