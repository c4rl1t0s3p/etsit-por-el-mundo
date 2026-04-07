/* ============================================================
   ETSIT POR EL MUNDO — app.js
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

const JSON_TO_SVG = { UK:"GB" };
const SVG_TO_JSON = { GB:"UK" };

let countries = {};
let offersAll = [];

function getBase() {
  const href = window.location.href.split("?")[0].split("#")[0];
  return href.endsWith("/") ? href : href.substring(0, href.lastIndexOf("/") + 1);
}

document.addEventListener("DOMContentLoaded", function () {
  loadData();
});

async function loadData() {
  const jsonURL = getBase() + "data/oferta.json";
  let data;
  try {
    const res = await fetch(jsonURL, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);
    data = await res.json();
  } catch (err) {
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

/* ── Mapa ──────────────────────────────────────────────────── */
function initMap() {
  if (typeof svgMap === "undefined") {
    setTimeout(initMap, 500);
    return;
  }

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
          tooltipDiv.innerHTML =
            "<div style='font-family:Syne,sans-serif;font-weight:800;font-size:14px;color:#0d1a2e'>" + countryCode + "</div>" +
            "<div style='font-size:12px;color:#888;margin-top:4px'>Sin plazas disponibles</div>";
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
            shown.map(function(c){
              return "<span style='display:inline-block;background:#f0f4fb;border-radius:4px;padding:1px 7px;margin:2px 2px 0 0'>" + c + "</span>";
            }).join("") + extra +
          "</div>" +
          "<div style='margin-top:10px;font-size:11px;color:#003DA5;text-align:center;border-top:1px solid #eee;padding-top:8px;font-weight:600'>↓ Haz clic para filtrar en la tabla</div>";
      }
    });
  } catch (err) {
    console.error("[ETSIT] Error inicializando svgMap:", err);
    return;
  }

  /* Esperar a que svgMap renderice el SVG y luego inyectar eventos */
  waitForSvg(function(svgEl) {
    attachMapClicks(svgEl);
    fixZoomButtons();
  });
}

function waitForSvg(cb) {
  var attempts = 0;
  var iv = setInterval(function() {
    var svgEl = document.querySelector("#map svg");
    if (svgEl) {
      clearInterval(iv);
      cb(svgEl);
    }
    if (++attempts > 50) clearInterval(iv);
  }, 100);
}

/* ── Click en el SVG: detectar país y aplicar filtro ─────── */
function attachMapClicks(svgEl) {
  svgEl.addEventListener("click", function(e) {
    var el = e.target;
    var countryCode = "";

    /* svgMap marca los paths con data-id o con clase svgMap-country-XX */
    while (el && el !== svgEl) {
      if (el.getAttribute && el.getAttribute("data-id")) {
        countryCode = el.getAttribute("data-id");
        break;
      }
      var cls = el.className && typeof el.className === "string"
        ? el.className : (el.className && el.className.baseVal) || "";
      var m = cls.match(/svgMap-country-([A-Z]{2})/);
      if (m) { countryCode = m[1]; break; }
      el = el.parentElement;
    }

    if (!countryCode) return;
    var ourCode = SVG_TO_JSON[countryCode] || countryCode;
    if (!countries[ourCode]) return;
    applyCountryFilter(ourCode);
  });

  /* Cursor pointer sobre países con datos */
  svgEl.addEventListener("mousemove", function(e) {
    var el = e.target;
    var hasData = false;
    while (el && el !== svgEl) {
      var code = el.getAttribute && el.getAttribute("data-id");
      if (!code) {
        var cls = el.className && typeof el.className === "string"
          ? el.className : (el.className && el.className.baseVal) || "";
        var m = cls.match(/svgMap-country-([A-Z]{2})/);
        if (m) code = m[1];
      }
      if (code) {
        var ourCode = SVG_TO_JSON[code] || code;
        hasData = !!countries[ourCode];
        break;
      }
      el = el.parentElement;
    }
    svgEl.style.cursor = hasData ? "pointer" : "default";
  });
}

function applyCountryFilter(ourCode) {
  var fCountry = document.getElementById("fCountry");
  if (!fCountry) return;
  fCountry.value = ourCode;
  fCountry.dispatchEvent(new Event("change"));
  fCountry.classList.remove("map-selected");
  void fCountry.offsetWidth;
  fCountry.classList.add("map-selected");
  setTimeout(function() { fCountry.classList.remove("map-selected"); }, 800);
  var fs = document.getElementById("filterSection");
  if (fs) fs.scrollIntoView({ behavior: "smooth", block: "start" });
}

/* ── Botones de zoom ────────────────────────────────────── */
function fixZoomButtons() {
  var mapEl       = document.getElementById("map");
  var mapContainer = mapEl.closest(".map-container") || mapEl.parentElement;

  /* svgMap genera los botones dentro del wrapper; los sacamos del overflow:hidden */
  var ctrlWrapper = mapEl.querySelector(".svgMap-map-controls-wrapper");

  if (ctrlWrapper) {
    /* Reubicar en map-container (fuera del #map que tiene overflow:hidden) */
    mapContainer.style.position = "relative";
    mapContainer.appendChild(ctrlWrapper);
    ctrlWrapper.style.cssText += ";position:absolute;bottom:16px;left:16px;right:auto;z-index:9999;pointer-events:auto;";

    var btnIn  = ctrlWrapper.querySelector(".svgMap-map-controls-zoom-in");
    var btnOut = ctrlWrapper.querySelector(".svgMap-map-controls-zoom-out");
    [btnIn, btnOut].forEach(function(b) {
      if (!b) return;
      b.style.cssText += ";pointer-events:auto!important;cursor:pointer!important;z-index:9999!important;";
    });
    return;
  }

  /* Fallback: crear botones propios que simulan el zoom via transform */
  if (mapContainer.querySelector(".etsit-zoom")) return;

  mapContainer.style.position = "relative";
  var svgEl   = mapEl.querySelector("svg");
  var innerG  = svgEl && svgEl.querySelector("g");
  var scale   = 1;

  function applyZoom() {
    var target = innerG || svgEl;
    if (!target) return;
    target.style.transformOrigin = "50% 50%";
    target.style.transition = "transform .2s ease";
    target.style.transform = "scale(" + scale + ")";
  }

  var zoomDiv = document.createElement("div");
  zoomDiv.className = "etsit-zoom";
  zoomDiv.style.cssText = "position:absolute;bottom:16px;left:16px;display:flex;flex-direction:column;gap:2px;z-index:9999;pointer-events:auto;";

  function makeBtn(label, delta) {
    var b = document.createElement("button");
    b.textContent = label;
    b.style.cssText = "width:32px;height:32px;border:1px solid #e2e7f0;background:#fff;color:#0d1a2e;font-size:20px;line-height:1;cursor:pointer;border-radius:6px;box-shadow:0 2px 8px rgba(0,30,80,.1);display:flex;align-items:center;justify-content:center;padding:0;pointer-events:auto;";
    b.addEventListener("click", function(e) {
      e.stopPropagation();
      scale = Math.max(1, Math.min(10, scale * delta));
      applyZoom();
    });
    return b;
  }

  zoomDiv.appendChild(makeBtn("+", 1.4));
  zoomDiv.appendChild(makeBtn("−", 1/1.4));
  mapContainer.appendChild(zoomDiv);
}

/* ── Filtros ─────────────────────────────────────────────── */
function initFilters() {
  var fCountry = document.getElementById("fCountry");
  var fCity    = document.getElementById("fCity");
  var fProgram = document.getElementById("fProgram");
  var fCert    = document.getElementById("fCert");
  var rows     = document.getElementById("rows");
  var count    = document.getElementById("count");
  if (!fCountry || !fCity || !fProgram || !fCert || !rows || !count) return;

  function uniqueSorted(arr) {
    return Array.from(new Set(arr.map(function(x){ return (x||"").trim(); }).filter(Boolean)))
      .sort(function(a,b){ return a.localeCompare(b,"es"); });
  }

  Object.entries(COUNTRY_NAMES)
    .filter(function(e){ return !!countries[e[0]]; })
    .sort(function(a,b){ return a[1].localeCompare(b[1],"es"); })
    .forEach(function(e) {
      var opt = document.createElement("option");
      opt.value = e[0]; opt.textContent = e[1] + " (" + e[0] + ")";
      fCountry.appendChild(opt);
    });

  uniqueSorted(offersAll.map(function(o){ return o.programa; })).forEach(function(v) {
    var opt = document.createElement("option");
    opt.value = v; opt.textContent = PROG_LABELS[v] || v;
    fProgram.appendChild(opt);
  });

  function certShort(cert) {
    if (!cert || cert === "-") return "";
    var m = cert.match(/^([A-ZÁÉÍÓÚÜÑA-Za-záéíóúüñ]+(?:\s[A-ZÁÉÍÓÚÜÑA-Za-záéíóúüñ]+)?)\s/);
    return m ? m[1].toUpperCase() : cert.slice(0, 30);
  }

  uniqueSorted(offersAll.map(function(o){ return certShort(o.cert); }).filter(Boolean)).forEach(function(v) {
    var opt = document.createElement("option");
    opt.value = v; opt.textContent = v;
    fCert.appendChild(opt);
  });

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
  }

  document.getElementById("clearFilters").addEventListener("click", function() {
    fCountry.value = ""; fCity.value = ""; fProgram.value = ""; fCert.value = "";
    populateCities(); render();
  });

  fCountry.addEventListener("change", function() { populateCities(); render(); });
  fCity.addEventListener("change",    render);
  fProgram.addEventListener("change", render);
  fCert.addEventListener("change",    render);

  populateCities();
  render();
}