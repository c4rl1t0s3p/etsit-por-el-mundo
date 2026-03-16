/* ============================================================
   ETSIT POR EL MUNDO — app.js
   Versión robusta con diagnóstico y manejo de errores explícito
   ============================================================ */

/* ── Constantes globales ─────────────────────────────────── */
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
  ER:"Erasmus+", MS:"MundoSantander", AB:"Acuerdo Bilateral",
  SICUE:"SICUE", "AB/ER":"AB / Erasmus",
  "ER/EIT HEALTH":"Erasmus / EIT Health", "MS/AB":"MS / AB"
};

/* svgMap usa GB, nuestro Excel usa UK */
const JSON_TO_SVG = { UK:"GB" };
const SVG_TO_JSON = { GB:"UK" };

/* ── Variables de estado ─────────────────────────────────── */
let countries = {};
let offersAll = [];

/* ── Función para calcular la base URL ──────────────────── */
function getBase() {
  const href = window.location.href.split("?")[0].split("#")[0];
  return href.endsWith("/") ? href : href.substring(0, href.lastIndexOf("/") + 1);
}

/* ── Arranque: esperar a que el DOM esté listo ───────────── */
document.addEventListener("DOMContentLoaded", function () {
  console.log("[ETSIT] DOM listo, iniciando carga...");
  loadData();
});

/* ── Carga de datos ──────────────────────────────────────── */
async function loadData() {
  const jsonURL = getBase() + "data/oferta.json";
  console.log("[ETSIT] Cargando JSON desde:", jsonURL);

  let data;
  try {
    const res = await fetch(jsonURL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status + " al cargar " + jsonURL);
    data = await res.json();
    console.log("[ETSIT] JSON cargado OK —", data.offers.length, "ofertas,", Object.keys(data.countries).length, "países");
  } catch (err) {
    console.error("[ETSIT] ERROR cargando JSON:", err);
    document.getElementById("rows").innerHTML =
      '<tr><td colspan="8" style="padding:24px;color:#c00;text-align:center;">Error cargando datos: ' + err.message + '</td></tr>';
    return;
  }

  countries = data.countries || {};
  offersAll = data.offers || [];

  initStats();
  initMap();
  initFilters();
}

/* ── Stats del header ────────────────────────────────────── */
function initStats() {
  const totalPlazas    = offersAll.reduce((s, o) => s + (parseInt(o.plazas) || 0), 0);
  const totalCountries = Object.keys(countries).length;
  const totalUnis      = new Set(offersAll.map(o => o.universidad)).size;

  animateNum("statTotal",        totalPlazas);
  animateNum("statCountries",    totalCountries);
  animateNum("statUniversities", totalUnis);
}

function animateNum(id, target) {
  const el = document.getElementById(id);
  if (!el) return;
  let cur = 0;
  const step = Math.max(1, Math.ceil(target / 40));
  const iv = setInterval(function () {
    cur = Math.min(cur + step, target);
    el.textContent = cur.toLocaleString("es-ES");
    if (cur >= target) clearInterval(iv);
  }, 30);
}

/* ── Mapa ────────────────────────────────────────────────── */
function initMap() {
  if (typeof svgMap === "undefined") {
    console.error("[ETSIT] svgMap no está cargado todavía. Reintentando en 500ms...");
    setTimeout(initMap, 500);
    return;
  }

  console.log("[ETSIT] Inicializando svgMap...");

  const values = {};
  Object.entries(countries).forEach(function (entry) {
    var iso2 = entry[0], info = entry[1];
    var svgCode = JSON_TO_SVG[iso2] || iso2;
    values[svgCode] = { value: info.offers_count || 0 };
  });

  try {
    new svgMap({
      targetElementID: "map",
      data: {
        data:      { value: { name: "Plazas", format: "{0}" } },
        applyData: "value",
        values:    values
      },
      colorMin:              "#d0e4ff",
      colorMax:              "#003DA5",
      colorNoData:           "#dde3ed",
      mouseWheelZoomEnabled: true,
      noDataText:            "Sin plazas",
      onGetTooltip: function (tooltipDiv, countryCode) {
        var ourCode = SVG_TO_JSON[countryCode] || countryCode;
        var info    = countries[ourCode];
        if (!info) {
          tooltipDiv.innerHTML = "<strong>" + countryCode + "</strong><br><small style='color:#888'>Sin plazas disponibles</small>";
          return;
        }
        var name  = COUNTRY_NAMES[ourCode] || ourCode;
        var shown = (info.cities || []).slice(0, 10);
        var extra = info.cities.length > 10 ? "<span style='color:#888'>…y " + (info.cities.length - 10) + " más</span>" : "";
        tooltipDiv.innerHTML =
          "<div style='font-family:Syne,sans-serif;font-weight:800;font-size:15px;margin-bottom:8px;color:#0d1a2e'>" + name + "</div>" +
          "<div style='display:flex;gap:16px;margin-bottom:10px;font-size:12px;color:#5b6880'>" +
            "<span><b style='color:#003DA5;font-size:16px'>" + info.offers_count + "</b> plazas</span>" +
            "<span><b style='color:#003DA5;font-size:16px'>" + info.cities_count + "</b> ciudades</span>" +
          "</div>" +
          "<div style='font-size:12px;color:#0d1a2e;line-height:1.6'>" +
            shown.map(function(c){ return "<span style='display:inline-block;background:#f0f4fb;border-radius:4px;padding:1px 7px;margin:2px 2px 0 0'>" + c + "</span>"; }).join("") +
            extra +
          "</div>" +
          "<div style='margin-top:10px;font-size:11px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:8px'>Haz clic para ver todas las plazas →</div>";
      },
      onClick: function (countryCode) {
        var ourCode = SVG_TO_JSON[countryCode] || countryCode;
        if (!countries[ourCode]) {
          console.log("[ETSIT] Click en país sin datos:", countryCode);
          return;
        }
        var url = getBase() + "country.html?country=" + encodeURIComponent(ourCode);
        console.log("[ETSIT] Navegando a:", url);
        window.location.href = url;
      }
    });
    console.log("[ETSIT] svgMap inicializado correctamente");
  } catch (err) {
    console.error("[ETSIT] Error inicializando svgMap:", err);
  }
}

/* ── Filtros ─────────────────────────────────────────────── */
function initFilters() {
  console.log("[ETSIT] Inicializando filtros...");

  var fCountry = document.getElementById("fCountry");
  var fCity    = document.getElementById("fCity");
  var fProgram = document.getElementById("fProgram");
  var fCert    = document.getElementById("fCert");
  var rows     = document.getElementById("rows");
  var count    = document.getElementById("count");

  if (!fCountry || !fCity || !fProgram || !fCert || !rows || !count) {
    console.error("[ETSIT] No se encontraron elementos del DOM para los filtros");
    return;
  }

  function uniqueSorted(arr) {
    return Array.from(new Set(arr.map(function(x){ return (x||"").trim(); }).filter(Boolean)))
      .sort(function(a,b){ return a.localeCompare(b,"es"); });
  }

  /* Poblar países */
  Object.entries(COUNTRY_NAMES)
    .filter(function(e){ return !!countries[e[0]]; })
    .sort(function(a,b){ return a[1].localeCompare(b[1],"es"); })
    .forEach(function(e) {
      var opt = document.createElement("option");
      opt.value = e[0];
      opt.textContent = e[1] + " (" + e[0] + ")";
      fCountry.appendChild(opt);
    });

  /* Poblar programas */
  uniqueSorted(offersAll.map(function(o){ return o.programa; })).forEach(function(v) {
    var opt = document.createElement("option");
    opt.value = v;
    opt.textContent = PROG_LABELS[v] || v;
    fProgram.appendChild(opt);
  });

  /* Poblar idiomas */
  function certShort(cert) {
    if (!cert || cert === "-") return "";
    var m = cert.match(/^([A-ZÁÉÍÓÚÜÑA-Za-záéíóúüñ]+(?:\s[A-ZÁÉÍÓÚÜÑA-Za-záéíóúüñ]+)?)\s/);
    return m ? m[1].toUpperCase() : cert.slice(0, 30);
  }

  uniqueSorted(offersAll.map(function(o){ return certShort(o.cert); }).filter(Boolean)).forEach(function(v) {
    var opt = document.createElement("option");
    opt.value = v;
    opt.textContent = v;
    fCert.appendChild(opt);
  });

  console.log("[ETSIT] Filtros poblados — países:", fCountry.options.length - 1,
    "programas:", fProgram.options.length - 1, "certs:", fCert.options.length - 1);

  function populateCities() {
    var cc = fCountry.value;
    var cities = (cc && countries[cc])
      ? countries[cc].cities
      : uniqueSorted(offersAll.map(function(o){ return o.ciudad; }));
    fCity.innerHTML = '<option value="">Todas las ciudades</option>';
    cities.forEach(function(v) {
      var opt = document.createElement("option");
      opt.value = v; opt.textContent = v;
      fCity.appendChild(opt);
    });
  }

  function passes(o) {
    if (fCountry.value && o.pais     !== fCountry.value) return false;
    if (fCity.value    && o.ciudad   !== fCity.value)    return false;
    if (fProgram.value && o.programa !== fProgram.value) return false;
    if (fCert.value    && certShort(o.cert) !== fCert.value) return false;
    return true;
  }

  function progBadgeClass(prog) {
    if (!prog) return "";
    var p = prog.toLowerCase();
    if (p.indexOf("sicue") >= 0) return "sicue";
    if (p.indexOf("ms")    >= 0) return "ms";
    if (p.indexOf("ab")    >= 0) return "ab";
    if (p.indexOf("er")    >= 0) return "er";
    return "";
  }

  function formatCert(cert) {
    if (!cert || cert === "-") return '<span style="color:#bbb">—</span>';
    var short = cert.split(/[,(]/)[0].trim();
    return '<span title="' + cert.replace(/"/g,"&quot;") + '">' + short + "</span>";
  }

  function render() {
    var filtered = offersAll.filter(passes);
    var plural   = filtered.length === 1 ? "resultado" : "resultados";
    count.textContent = filtered.length.toLocaleString("es-ES") + " " + plural;

    if (filtered.length === 0) {
      rows.innerHTML =
        '<tr><td colspan="8"><div class="empty-state">' +
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
        "<p>No hay destinos que coincidan con los filtros seleccionados.</p>" +
        "</div></td></tr>";
      return;
    }

    var fragment = document.createDocumentFragment();
    filtered.slice(0, 5000).forEach(function(o) {
      var tr = document.createElement("tr");
      var countryName = COUNTRY_NAMES[o.pais] || o.pais || "";
      var progLabel   = PROG_LABELS[o.programa] || o.programa || "";
      var bClass      = progBadgeClass(o.programa);
      tr.innerHTML =
        "<td><strong>" + (o.universidad || "—") + "</strong></td>" +
        "<td>" + (o.ciudad || "—") + "</td>" +
        "<td><span class='country-cell'><span>" + countryName + "</span><small style='color:#888'>" + (o.pais||"") + "</small></span></td>" +
        "<td><code style='font-size:12px;color:#555'>" + (o.codigo_erasmus || "—") + "</code></td>" +
        "<td class='plazas-cell'><span class='plazas-badge'>" + (o.plazas || "—") + "</span></td>" +
        "<td><span class='prog-badge " + bClass + "'>" + progLabel + "</span></td>" +
        "<td style='font-size:12px;color:#5b6880;max-width:180px'>" + formatCert(o.cert) + "</td>" +
        "<td class='obs-cell'>" + (o.observaciones || "") + "</td>";
      fragment.appendChild(tr);
    });
    rows.innerHTML = "";
    rows.appendChild(fragment);
    console.log("[ETSIT] Renderizados", filtered.length, "resultados");
  }

  document.getElementById("clearFilters").addEventListener("click", function() {
    fCountry.value = ""; fCity.value = ""; fProgram.value = ""; fCert.value = "";
    populateCities();
    render();
  });

  fCountry.addEventListener("change", function() { populateCities(); render(); });
  fCity.addEventListener("change",    render);
  fProgram.addEventListener("change", render);
  fCert.addEventListener("change",    render);

  populateCities();
  render();

  console.log("[ETSIT] ✓ Todo inicializado correctamente");
}