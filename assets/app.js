/* ============================================================
   ETSIT POR EL MUNDO — app.js
   ============================================================ */

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

let countries  = {};
let offersAll  = [];
let applyCountryFilter;

function getBase() {
  var href = window.location.href.split("?")[0].split("#")[0];
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
    console.error("[ETSIT] ERROR cargando JSON:", err);
    document.getElementById("rows").innerHTML =
      '<tr><td colspan="8" style="padding:24px;color:#c00;text-align:center;">Error cargando datos: ' + err.message + '</td></tr>';
    return;
  }
  countries = data.countries || {};
  offersAll = data.offers   || [];

  initStats();
  initFilters();
  initMap();
}

function initStats() {
  var totalPlazas    = offersAll.reduce(function(s,o){ return s+(parseInt(o.plazas)||0); }, 0);
  var totalCountries = Object.keys(countries).length;
  var totalUnis      = new Set(offersAll.map(function(o){ return o.universidad; })).size;
  animateNum("statTotal",        totalPlazas);
  animateNum("statCountries",    totalCountries);
  animateNum("statUniversities", totalUnis);
}

function animateNum(id, target) {
  var el = document.getElementById(id);
  if (!el) return;
  var cur = 0, step = Math.max(1, Math.ceil(target / 40));
  var iv = setInterval(function() {
    cur = Math.min(cur + step, target);
    el.textContent = cur.toLocaleString("es-ES");
    if (cur >= target) clearInterval(iv);
  }, 30);
}

function initMap() {
  if (typeof svgMap === "undefined") {
    setTimeout(initMap, 500);
    return;
  }

  var values = {};
  Object.entries(countries).forEach(function(e) {
    var svgCode = JSON_TO_SVG[e[0]] || e[0];
    values[svgCode] = { value: e[1].offers_count || 0 };
  });

  try {
    new svgMap({
      targetElementID:       "map",
      data: {
        data:      { value: { name:"Plazas", format:"{0}" } },
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
            "<strong style='color:#0d1a2e'>" + countryCode + "</strong>" +
            "<br><small style='color:#888'>Sin plazas disponibles</small>";
          return;
        }
        var name  = COUNTRY_NAMES[ourCode] || ourCode;
        var shown = (info.cities || []).slice(0, 10);
        var extra = info.cities.length > 10
          ? "<span style='color:#888'>…y "+(info.cities.length-10)+" más</span>" : "";

        var fCountry = document.getElementById("fCountry");
        var isActive = fCountry && fCountry.value === ourCode;
        var activeTag = isActive
          ? "<span style='display:inline-block;background:#003DA5;color:#fff;font-size:10px;border-radius:100px;padding:2px 8px;margin-left:6px;vertical-align:middle'>Filtrado ✓</span>"
          : "";

        tooltipDiv.innerHTML =
          "<div style='font-family:Syne,sans-serif;font-weight:800;font-size:15px;margin-bottom:8px;color:#0d1a2e'>" +
            name + activeTag +
          "</div>" +
          "<div style='display:flex;gap:16px;margin-bottom:10px;font-size:12px;color:#5b6880'>" +
            "<span><b style='color:#003DA5;font-size:16px'>" + info.offers_count + "</b> plazas</span>" +
            "<span><b style='color:#003DA5;font-size:16px'>" + info.cities_count + "</b> ciudades</span>" +
          "</div>" +
          "<div style='font-size:12px;color:#0d1a2e;line-height:1.8'>" +
            shown.map(function(c){
              return "<span style='display:inline-block;background:#f0f4fb;border-radius:4px;padding:1px 7px;margin:2px 2px 0 0'>" + c + "</span>";
            }).join("") + extra +
          "</div>" +
          "<div style='margin-top:10px;font-size:11px;color:#888;text-align:center;border-top:1px solid #eee;padding-top:8px'>" +
            (isActive ? "Haz clic para quitar el filtro ✕" : "Haz clic para filtrar plazas de " + name) +
          "</div>";
      },

      onClick: function (countryCode) {
        var ourCode = SVG_TO_JSON[countryCode] || countryCode;
        if (!countries[ourCode]) return;
        if (typeof applyCountryFilter === "function") {
          applyCountryFilter(ourCode);
        }
      }
    });

    _addMapCursorStyles();

  } catch (err) {
    console.error("[ETSIT] Error inicializando svgMap:", err);
  }
}

function _addMapCursorStyles() {
  var style = document.createElement("style");
  style.textContent =
    "#map path[fill]:not([fill='#dde3ed']):not([fill='none']) { cursor: pointer; }" +
    "#map path { transition: opacity 0.15s ease, filter 0.15s ease; }" +
    "#map path:hover { opacity: 0.82; filter: brightness(1.08); }";
  document.head.appendChild(style);
}

function initFilters() {
  var fCountry = document.getElementById("fCountry");
  var fCity    = document.getElementById("fCity");
  var fProgram = document.getElementById("fProgram");
  var fCert    = document.getElementById("fCert");
  var rows     = document.getElementById("rows");
  var count    = document.getElementById("count");
  var section  = document.getElementById("filterSection");

  if (!fCountry || !fCity || !fProgram || !fCert || !rows || !count) {
    console.error("[ETSIT] Elementos de filtro no encontrados");
    return;
  }

  function uniqueSorted(arr) {
    return Array.from(new Set(arr.map(function(x){ return (x||"").trim(); }).filter(Boolean)))
      .sort(function(a,b){ return a.localeCompare(b,"es"); });
  }

  Object.entries(COUNTRY_NAMES)
    .filter(function(e){ return !!countries[e[0]]; })
    .sort(function(a,b){ return a[1].localeCompare(b[1],"es"); })
    .forEach(function(e) {
      var opt = document.createElement("option");
      opt.value = e[0];
      opt.textContent = e[1] + " (" + e[0] + ")";
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
      fCity.appendChild(new Option(v, v));
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
    count.textContent = filtered.length.toLocaleString("es-ES") +
      (filtered.length === 1 ? " resultado" : " resultados");

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
      tr.innerHTML =
        "<td><strong>" + (o.universidad || "—") + "</strong></td>" +
        "<td>" + (o.ciudad || "—") + "</td>" +
        "<td><span class='country-cell'><span>" + (COUNTRY_NAMES[o.pais]||o.pais||"") + "</span>" +
          "<small style='color:#888'>" + (o.pais||"") + "</small></span></td>" +
        "<td><code style='font-size:12px;color:#555'>" + (o.codigo_erasmus||"—") + "</code></td>" +
        "<td class='plazas-cell'><span class='plazas-badge'>" + (o.plazas||"—") + "</span></td>" +
        "<td><span class='prog-badge " + progBadgeClass(o.programa) + "'>" + (PROG_LABELS[o.programa]||o.programa||"") + "</span></td>" +
        "<td style='font-size:12px;color:#5b6880;max-width:180px'>" + formatCert(o.cert) + "</td>" +
        "<td class='obs-cell'>" + (o.observaciones||"") + "</td>";
      fragment.appendChild(tr);
    });
    rows.innerHTML = "";
    rows.appendChild(fragment);
  }

  applyCountryFilter = function(ourCode) {
    var isAlreadyActive = fCountry.value === ourCode;

    if (isAlreadyActive) {
      fCountry.value = "";
    } else {
      fCountry.value = ourCode;
    }

    populateCities();
    render();

    fCountry.classList.add("filter-select--active");
    setTimeout(function() { fCountry.classList.remove("filter-select--active"); }, 1200);

    if (section) {
      section.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

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

  console.log("[ETSIT] ✓ Todo inicializado");
}