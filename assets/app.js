/* ============================================================
   ETSIT POR EL MUNDO — app.js (index)
   ============================================================ */

(async function () {
  // Ruta al JSON robusta tanto en local como en GitHub Pages
  const base = window.location.href.replace(/\/[^/]*$/, "/");
  const DATA_URL = base + "data/oferta.json";

  /* ── Nombres legibles de país (ISO 2 → español) ─────── */
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

  /*
   * svgMap usa códigos ISO 3166-1 alpha-2 estándar en sus paths SVG.
   * Nuestro Excel usa "UK" para Reino Unido, pero el estándar es "GB".
   * Este mapa convierte los códigos del JSON → código que entiende svgMap,
   * y el inverso para recuperar datos cuando el mapa devuelve su código.
   */
  const JSON_TO_SVG = { UK: "GB" };          // nuestro código → código svgMap
  const SVG_TO_JSON = { GB: "UK" };          // código svgMap  → nuestro código

  const PROG_LABELS = {
    ER: "Erasmus+",
    MS: "MundoSantander",
    AB: "Acuerdo Bilateral",
    SICUE: "SICUE",
    "AB/ER": "AB / Erasmus",
    "ER/EIT HEALTH": "Erasmus / EIT Health",
    "MS/AB": "MS / AB"
  };

  /* ── Cargar datos ────────────────────────────────────── */
  let data, countries, offersAll;
  try {
    const res = await fetch(DATA_URL, { cache: "no-store" });
    data = await res.json();
    countries = data.countries || {};
    offersAll = data.offers || [];
  } catch (err) {
    console.error("Error cargando oferta.json:", err);
    return;
  }

  /* ── Stats globales ──────────────────────────────────── */
  const totalPlazas = offersAll.reduce((s, o) => s + (parseInt(o.plazas) || 0), 0);
  const totalCountries = Object.keys(countries).length;
  const totalUnis = new Set(offersAll.map(o => o.universidad)).size;

  animateNum("statTotal", totalPlazas);
  animateNum("statCountries", totalCountries);
  animateNum("statUniversities", totalUnis);

  function animateNum(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    let cur = 0;
    const step = Math.ceil(target / 40);
    const iv = setInterval(() => {
      cur = Math.min(cur + step, target);
      el.textContent = cur.toLocaleString("es-ES");
      if (cur >= target) clearInterval(iv);
    }, 30);
  }

  /* ── Mapa ────────────────────────────────────────────── */
  // Construir values con los códigos que entiende svgMap (GB en lugar de UK, etc.)
  const values = {};
  for (const [iso2, info] of Object.entries(countries)) {
    const svgCode = JSON_TO_SVG[iso2] || iso2;
    values[svgCode] = { value: info.offers_count || 0 };
  }

  new svgMap({
    targetElementID: "map",
    data: {
      data: { value: { name: "Plazas", format: "{0}" } },
      applyData: "value",
      values
    },
    colorMin: "#d0e4ff",
    colorMax: "#003DA5",
    colorNoData: "#dde3ed",
    mouseWheelZoomEnabled: true,
    noDataText: "Sin plazas",
    onGetTooltip: function (tooltipDiv, countryCode) {
      // svgMap nos devuelve su código (p.ej. "GB") → traducir al nuestro ("UK")
      const ourCode = SVG_TO_JSON[countryCode] || countryCode;
      const info = countries[ourCode];
      if (!info) {
        tooltipDiv.innerHTML = `<div style="font-weight:700; font-size:14px;">${countryCode}</div><div style="font-size:12px;color:#666;margin-top:4px;">Sin plazas disponibles</div>`;
        return;
      }
      const name = COUNTRY_NAMES[ourCode] || ourCode;
      const cities = info.cities || [];
      const shown = cities.slice(0, 10);
      const extra = cities.length > 10 ? `<span style="color:#888">…y ${cities.length - 10} más</span>` : "";

      tooltipDiv.innerHTML = `
        <div style="font-family:'Syne',sans-serif; font-weight:800; font-size:15px; margin-bottom:8px; color:#0d1a2e;">
          ${name}
        </div>
        <div style="display:flex; gap:16px; margin-bottom:10px; font-size:12px; color:#5b6880;">
          <span><b style="color:#003DA5; font-size:16px;">${info.offers_count}</b> plazas</span>
          <span><b style="color:#003DA5; font-size:16px;">${info.cities_count}</b> ciudades</span>
        </div>
        <div style="font-size:12px; color:#0d1a2e; line-height:1.6;">
          ${shown.map(c => `<span style="display:inline-block;background:#f0f4fb;border-radius:4px;padding:1px 7px;margin:2px 2px 0 0;">${c}</span>`).join("")}
          ${extra}
        </div>
        <div style="margin-top:10px; font-size:11px; color:#888; text-align:center; border-top:1px solid #eee; padding-top:8px;">
          Haz clic para ver todas las plazas →
        </div>
      `;
    },
    onClick: function (countryCode) {
      // Traducir código svgMap → nuestro código JSON
      const ourCode = SVG_TO_JSON[countryCode] || countryCode;
      if (!countries[ourCode]) return;
      // Usar ruta relativa robusta compatible con GitHub Pages
      const base = window.location.href.replace(/\/[^/]*$/, "/");
      window.location.href = base + "country.html?country=" + encodeURIComponent(ourCode);
    }
  });

  /* ── Filtros ─────────────────────────────────────────── */
  const $ = id => document.getElementById(id);
  const fCountry = $("fCountry");
  const fCity    = $("fCity");
  const fProgram = $("fProgram");
  const fCert    = $("fCert");
  const rows     = $("rows");
  const count    = $("count");

  function uniqueSorted(arr) {
    return [...new Set(arr.map(x => (x || "").trim()).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  }

  /* Poblar selectores */
  Object.entries(COUNTRY_NAMES)
    .filter(([cc]) => countries[cc])
    .sort((a, b) => a[1].localeCompare(b[1], "es"))
    .forEach(([cc, name]) => {
      const opt = new Option(`${name} (${cc})`, cc);
      fCountry.appendChild(opt);
    });

  uniqueSorted(offersAll.map(o => o.programa)).forEach(v => {
    fProgram.appendChild(new Option(PROG_LABELS[v] || v, v));
  });

  /* Certificados: extraer el idioma principal de la cadena larga */
  const certShort = cert => {
    if (!cert || cert === "-") return "";
    const m = cert.match(/^([A-ZÁÉÍÓÚÜÑ][a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+(?:\s[A-ZÁÉÍÓÚÜÑ][a-záéíóúüñA-ZÁÉÍÓÚÜÑ]+)?)\s/);
    return m ? m[1].toUpperCase() : cert.slice(0, 30);
  };

  uniqueSorted(offersAll.map(o => certShort(o.cert)).filter(Boolean)).forEach(v => {
    fCert.appendChild(new Option(v, v));
  });

  function populateCities() {
    const cc = fCountry.value;
    const cities = cc && countries[cc]
      ? countries[cc].cities
      : uniqueSorted(offersAll.map(o => o.ciudad));
    fCity.innerHTML = `<option value="">Todas las ciudades</option>`;
    cities.forEach(v => fCity.appendChild(new Option(v, v)));
  }

  function passes(o) {
    if (fCountry.value && o.pais !== fCountry.value) return false;
    if (fCity.value && o.ciudad !== fCity.value) return false;
    if (fProgram.value && o.programa !== fProgram.value) return false;
    if (fCert.value && certShort(o.cert) !== fCert.value) return false;
    return true;
  }

  function progBadgeClass(prog) {
    if (!prog) return "";
    const p = prog.toLowerCase();
    if (p.includes("er")) return "er";
    if (p.includes("ms")) return "ms";
    if (p.includes("ab")) return "ab";
    if (p.includes("sicue")) return "sicue";
    return "";
  }

  function render() {
    const filtered = offersAll.filter(passes);
    const plural = filtered.length === 1 ? "resultado" : "resultados";
    count.textContent = `${filtered.length.toLocaleString("es-ES")} ${plural}`;

    if (filtered.length === 0) {
      rows.innerHTML = `
        <tr><td colspan="8">
          <div class="empty-state">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <p>No hay destinos que coincidan con los filtros seleccionados.</p>
          </div>
        </td></tr>
      `;
      return;
    }

    const fragment = document.createDocumentFragment();
    for (const o of filtered.slice(0, 5000)) {
      const tr = document.createElement("tr");
      const countryName = COUNTRY_NAMES[o.pais] || o.pais || "";
      const progLabel = PROG_LABELS[o.programa] || o.programa || "";
      const bClass = progBadgeClass(o.programa);
      tr.innerHTML = `
        <td><strong>${o.universidad || "—"}</strong></td>
        <td>${o.ciudad || "—"}</td>
        <td><span class="country-cell"><span>${countryName}</span><small style="color:#888">${o.pais || ""}</small></span></td>
        <td><code style="font-size:12px;color:#555;">${o.codigo_erasmus || "—"}</code></td>
        <td class="plazas-cell"><span class="plazas-badge">${o.plazas || "—"}</span></td>
        <td><span class="prog-badge ${bClass}">${progLabel}</span></td>
        <td style="font-size:12px; color:#5b6880; max-width:180px;">${formatCert(o.cert)}</td>
        <td class="obs-cell">${o.observaciones || ""}</td>
      `;
      fragment.appendChild(tr);
    }
    rows.innerHTML = "";
    rows.appendChild(fragment);
  }

  function formatCert(cert) {
    if (!cert || cert === "-") return '<span style="color:#bbb">—</span>';
    // Mostrar sólo el primer requisito de idioma (hasta la primera coma o paréntesis)
    const short = cert.split(/[,(]/)[0].trim();
    return `<span title="${cert.replace(/"/g,"&quot;")}">${short}</span>`;
  }

  $("clearFilters").addEventListener("click", () => {
    fCountry.value = ""; fCity.value = ""; fProgram.value = ""; fCert.value = "";
    populateCities(); render();
  });

  fCountry.addEventListener("change", () => { populateCities(); render(); });
  fCity.addEventListener("change", render);
  fProgram.addEventListener("change", render);
  fCert.addEventListener("change", render);

  populateCities();
  render();
})();