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

// svgMap usa "GB" para Reino Unido; nuestro JSON usa "UK"
const JSON_TO_SVG = { UK: "GB" };
const SVG_TO_JSON = { GB: "UK" };

let countries = {};
let offersAll = [];

// ── Helpers ──────────────────────────────────────────────────

function getBase() {
  var href = window.location.href.split("?")[0].split("#")[0];
  return href.endsWith("/") ? href : href.substring(0, href.lastIndexOf("/") + 1);
}

function uniqueSorted(arr) {
  return Array.from(new Set(arr.map(function(x){ return (x||"").trim(); }).filter(Boolean)))
    .sort(function(a,b){ return a.localeCompare(b,"es"); });
}

function certShort(cert) {
  if (!cert || cert === "-") return "";
  var m = cert.match(/^([A-ZÁÉÍÓÚÜÑa-záéíóúüñ]+(?:\s[A-ZÁÉÍÓÚÜÑa-záéíóúüñ]+)?)\s/);
  return m ? m[1].toUpperCase() : cert.slice(0, 30);
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
  return '<span title="' + cert.replace(/"/g,"&quot;") + '">' + cert.split(/[,(]/)[0].trim() + "</span>";
}

function animateNum(id, target) {
  var el = document.getElementById(id);
  if (!el) return;
  var cur = 0, step = Math.max(1, Math.ceil(target / 45));
  var iv = setInterval(function() {
    cur = Math.min(cur + step, target);
    el.textContent = cur.toLocaleString("es-ES");
    if (cur >= target) clearInterval(iv);
  }, 28);
}

// ── Arranque ─────────────────────────────────────────────────

document.addEventListener("DOMContentLoaded", function() {
  var url = getBase() + "data/oferta.json";
  console.log("[ETSIT] Cargando:", url);

  fetch(url, { cache: "no-store" })
    .then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function(data) {
      countries = data.countries || {};
      offersAll = data.offers   || [];
      console.log("[ETSIT] Datos OK —", offersAll.length, "ofertas,", Object.keys(countries).length, "países");

      // Stats header
      animateNum("statTotal",        offersAll.reduce(function(s,o){ return s+(parseInt(o.plazas)||0); }, 0));
      animateNum("statCountries",    Object.keys(countries).length);
      animateNum("statUniversities", new Set(offersAll.map(function(o){ return o.universidad; })).size);

      // Filtros primero (define filterByCountry), luego mapa
      var filterByCountry = setupFilters();
      setupMap(filterByCountry);
    })
    .catch(function(err) {
      console.error("[ETSIT] Error:", err);
      var el = document.getElementById("rows");
      if (el) el.innerHTML = '<tr><td colspan="8" style="padding:32px;color:#c00;text-align:center">Error al cargar datos: ' + err.message + '</td></tr>';
    });
});

// ── Mapa ─────────────────────────────────────────────────────

function setupMap(filterByCountry) {
  // Esperar a que svgMap esté disponible (cargado con defer)
  if (typeof svgMap === "undefined") {
    setTimeout(function() { setupMap(filterByCountry); }, 200);
    return;
  }

  // Construir values con códigos ISO de svgMap
  var values = {};
  Object.keys(countries).forEach(function(iso2) {
    values[JSON_TO_SVG[iso2] || iso2] = { value: countries[iso2].offers_count || 0 };
  });

  new svgMap({
    targetElementID:       "map",
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

    onGetTooltip: function(tooltipDiv, countryCode) {
      var ourCode = SVG_TO_JSON[countryCode] || countryCode;
      var info    = countries[ourCode];
      var name    = COUNTRY_NAMES[ourCode] || ourCode;

      if (!info) {
        tooltipDiv.innerHTML =
          "<b style='color:#0d1a2e'>" + name + "</b>" +
          "<div style='font-size:12px;color:#999;margin-top:4px'>Sin plazas disponibles</div>";
        return;
      }

      var active  = document.getElementById("fCountry") &&
                    document.getElementById("fCountry").value === ourCode;
      var shown   = (info.cities || []).slice(0, 10);
      var extra   = info.cities.length > 10 ? " <span style='color:#aaa'>+" + (info.cities.length-10) + " más</span>" : "";

      tooltipDiv.innerHTML =
        "<div style='font-family:Syne,sans-serif;font-weight:800;font-size:15px;color:#0d1a2e;margin-bottom:8px'>" +
          name +
          (active ? " <span style='font-size:10px;background:#003DA5;color:#fff;border-radius:100px;padding:2px 8px'>Activo ✓</span>" : "") +
        "</div>" +
        "<div style='display:flex;gap:20px;margin-bottom:10px'>" +
          "<div style='text-align:center'><div style='font-size:20px;font-weight:800;color:#003DA5;font-family:Syne,sans-serif'>" + info.offers_count + "</div><div style='font-size:10px;color:#888;text-transform:uppercase'>plazas</div></div>" +
          "<div style='text-align:center'><div style='font-size:20px;font-weight:800;color:#003DA5;font-family:Syne,sans-serif'>" + info.cities_count + "</div><div style='font-size:10px;color:#888;text-transform:uppercase'>ciudades</div></div>" +
        "</div>" +
        "<div style='font-size:12px;color:#0d1a2e;line-height:1.8;margin-bottom:8px'>" +
          shown.map(function(c){ return "<span style='display:inline-block;background:#f0f4fb;border-radius:4px;padding:1px 8px;margin:2px 2px 0 0;font-size:11px'>" + c + "</span>"; }).join("") + extra +
        "</div>" +
        "<div style='font-size:11px;color:" + (active ? "#003DA5":"#aaa") + ";text-align:center;border-top:1px solid #eee;padding-top:8px'>" +
          (active ? "↑ Clic para quitar el filtro" : "↓ Clic para filtrar plazas de " + name) +
        "</div>";
    },

    onClick: function(countryCode) {
      var ourCode = SVG_TO_JSON[countryCode] || countryCode;
      console.log("[ETSIT] Click en mapa:", countryCode, "→", ourCode, "| datos:", !!countries[ourCode]);
      if (countries[ourCode]) filterByCountry(ourCode);
    }
  });

  // Hover suave: esperar a que svgMap renderice el SVG
  var attempts = 0;
  var hoverInterval = setInterval(function() {
    attempts++;
    var mapEl = document.getElementById("map");
    var svg   = mapEl && mapEl.querySelector("svg");
    if (!svg && attempts < 20) return;
    clearInterval(hoverInterval);
    if (!svg) return;

    Object.keys(countries).forEach(function(iso2) {
      var path = svg.querySelector("#svgMap-country-" + (JSON_TO_SVG[iso2] || iso2));
      if (!path) return;
      path.style.cursor     = "pointer";
      path.style.transition = "opacity 0.15s ease";
      path.addEventListener("mouseenter", function() { this.style.opacity = "0.7"; });
      path.addEventListener("mouseleave", function() { this.style.opacity = "1";   });
    });
    console.log("[ETSIT] Hover aplicado");
  }, 150);
}

// ── Filtros ──────────────────────────────────────────────────
// Devuelve la función filterByCountry para que el mapa pueda llamarla

function setupFilters() {
  var fCountry = document.getElementById("fCountry");
  var fCity    = document.getElementById("fCity");
  var fProgram = document.getElementById("fProgram");
  var fCert    = document.getElementById("fCert");
  var rows     = document.getElementById("rows");
  var count    = document.getElementById("count");
  var section  = document.getElementById("filterSection");

  // Poblar países
  Object.entries(COUNTRY_NAMES)
    .filter(function(e) { return !!countries[e[0]]; })
    .sort(function(a,b)  { return a[1].localeCompare(b[1],"es"); })
    .forEach(function(e) { fCountry.appendChild(new Option(e[1] + " (" + e[0] + ")", e[0])); });

  // Poblar programas
  uniqueSorted(offersAll.map(function(o){ return o.programa; }))
    .forEach(function(v) { fProgram.appendChild(new Option(PROG_LABELS[v] || v, v)); });

  // Poblar idiomas
  uniqueSorted(offersAll.map(function(o){ return certShort(o.cert); }).filter(Boolean))
    .forEach(function(v) { fCert.appendChild(new Option(v, v)); });

  function populateCities() {
    var cc = fCountry.value;
    var cities = (cc && countries[cc])
      ? countries[cc].cities
      : uniqueSorted(offersAll.map(function(o){ return o.ciudad; }));
    fCity.innerHTML = '<option value="">Todas las ciudades</option>';
    cities.forEach(function(v){ fCity.appendChild(new Option(v, v)); });
  }

  function passes(o) {
    if (fCountry.value && o.pais     !== fCountry.value) return false;
    if (fCity.value    && o.ciudad   !== fCity.value)    return false;
    if (fProgram.value && o.programa !== fProgram.value) return false;
    if (fCert.value    && certShort(o.cert) !== fCert.value) return false;
    return true;
  }

  function render() {
    var filtered = offersAll.filter(passes);
    count.textContent = filtered.length.toLocaleString("es-ES") +
      (filtered.length === 1 ? " resultado" : " resultados");

    if (filtered.length === 0) {
      rows.innerHTML =
        '<tr><td colspan="8"><div class="empty-state">' +
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
        "<p>No hay destinos con esos filtros.</p></div></td></tr>";
      return;
    }

    var frag = document.createDocumentFragment();
    filtered.slice(0, 5000).forEach(function(o) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><strong>" + (o.universidad||"—") + "</strong></td>" +
        "<td>" + (o.ciudad||"—") + "</td>" +
        "<td><span class='country-cell'><span>" + (COUNTRY_NAMES[o.pais]||o.pais||"") + "</span>" +
          "<small style='color:#888'>" + (o.pais||"") + "</small></span></td>" +
        "<td><code style='font-size:12px;color:#555'>" + (o.codigo_erasmus||"—") + "</code></td>" +
        "<td class='plazas-cell'><span class='plazas-badge'>" + (o.plazas||"—") + "</span></td>" +
        "<td><span class='prog-badge " + progBadgeClass(o.programa) + "'>" + (PROG_LABELS[o.programa]||o.programa||"") + "</span></td>" +
        "<td style='font-size:12px;color:#5b6880;max-width:180px'>" + formatCert(o.cert) + "</td>" +
        "<td class='obs-cell'>" + (o.observaciones||"") + "</td>";
      frag.appendChild(tr);
    });
    rows.innerHTML = "";
    rows.appendChild(frag);
  }

  // Listeners normales
  document.getElementById("clearFilters").addEventListener("click", function() {
    fCountry.value = ""; fCity.value = ""; fProgram.value = ""; fCert.value = "";
    populateCities(); render();
  });
  fCountry.addEventListener("change", function(){ populateCities(); render(); });
  fCity.addEventListener("change",    render);
  fProgram.addEventListener("change", render);
  fCert.addEventListener("change",    render);

  populateCities();
  render();

  console.log("[ETSIT] Filtros listos —", fCountry.options.length-1, "países");

  // Devolver función para que el mapa la pueda llamar directamente
  return function filterByCountry(ourCode) {
    // Toggle: si ya está activo, quitar; si no, poner
    fCountry.value = (fCountry.value === ourCode) ? "" : ourCode;
    populateCities();
    render();

    // Flash azul en el select
    fCountry.classList.remove("filter-select--active");
    void fCountry.offsetWidth; // reflow para reiniciar animación
    fCountry.classList.add("filter-select--active");
    setTimeout(function(){ fCountry.classList.remove("filter-select--active"); }, 1400);

    // Scroll suave a la sección de filtros
    if (section) section.scrollIntoView({ behavior: "smooth", block: "start" });
  };
}
