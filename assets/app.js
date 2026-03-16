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
  ER:"Erasmus+",
  MS:"MundoSantander",
  AB:"Acuerdo Bilateral",
  SICUE:"SICUE",
  "AB/ER":"AB / Erasmus",
  "ER/EIT HEALTH":"Erasmus / EIT Health",
  "MS/AB":"MS / AB"
};

const JSON_TO_SVG = { UK:"GB" };
const SVG_TO_JSON = { GB:"UK" };

let countries = {};
let offersAll = [];
let applyCountryFilter = null;
let activeCountryCode = "";
let mapBindTimer = null;

function getBase() {
  var href = window.location.href.split("?")[0].split("#")[0];
  return href.endsWith("/") ? href : href.substring(0, href.lastIndexOf("/") + 1);
}

document.addEventListener("DOMContentLoaded", function () {
  loadData();
});

async function loadData() {
  var url = getBase() + "data/oferta.json";
  console.log("[ETSIT] Cargando:", url);

  try {
    var res = await fetch(url, { cache: "no-store" });
    if (!res.ok) throw new Error("HTTP " + res.status);

    var data = await res.json();
    countries = data.countries || {};
    offersAll = data.offers || [];

    console.log(
      "[ETSIT] JSON OK —",
      offersAll.length,
      "ofertas,",
      Object.keys(countries).length,
      "países"
    );
  } catch (err) {
    console.error("[ETSIT] Error cargando JSON:", err);
    var rows = document.getElementById("rows");
    if (rows) {
      rows.innerHTML =
        '<tr><td colspan="8" style="padding:32px;color:#c00;text-align:center">Error al cargar datos: ' +
        err.message +
        "</td></tr>";
    }
    return;
  }

  initStats();
  initFilters();
  initMap();
}

function initStats() {
  var plazas = offersAll.reduce(function (s, o) {
    return s + (parseInt(o.plazas, 10) || 0);
  }, 0);

  var paises = Object.keys(countries).length;
  var unis = new Set(
    offersAll
      .map(function (o) { return o.universidad; })
      .filter(Boolean)
  ).size;

  animateNum("statTotal", plazas);
  animateNum("statCountries", paises);
  animateNum("statUniversities", unis);
}

function animateNum(id, target) {
  var el = document.getElementById(id);
  if (!el) return;

  var cur = 0;
  var step = Math.max(1, Math.ceil(target / 45));

  var iv = setInterval(function () {
    cur = Math.min(cur + step, target);
    el.textContent = cur.toLocaleString("es-ES");
    if (cur >= target) clearInterval(iv);
  }, 28);
}

function getSvgCountryCode(iso2) {
  return JSON_TO_SVG[iso2] || iso2;
}

function getJsonCountryCode(svgCode) {
  return SVG_TO_JSON[svgCode] || svgCode;
}

function getCountryNodeByIso2(iso2) {
  var svgCode = getSvgCountryCode(iso2);
  return document.querySelector("#map #svgMap-country-" + svgCode);
}

function clearSelectedCountryInMap() {
  document.querySelectorAll("#map .is-selected-country").forEach(function (el) {
    el.classList.remove("is-selected-country");
  });
}

function syncMapSelection() {
  clearSelectedCountryInMap();

  if (!activeCountryCode) return;

  var node = getCountryNodeByIso2(activeCountryCode);
  if (node) {
    node.classList.add("is-selected-country");
  }
}

function bindMapCountryEvents() {
  var hasAnyNode = false;

  Object.keys(countries).forEach(function (iso2) {
    var node = getCountryNodeByIso2(iso2);
    if (!node) return;

    hasAnyNode = true;

    node.classList.add("is-map-country");
    node.style.cursor = "pointer";

    if (node.dataset.etsitBound === "1") return;
    node.dataset.etsitBound = "1";

    node.setAttribute("tabindex", "0");
    node.setAttribute("role", "button");
    node.setAttribute("aria-label", "Filtrar por " + (COUNTRY_NAMES[iso2] || iso2));

    node.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();

      if (typeof applyCountryFilter === "function") {
        applyCountryFilter(iso2, true);
      }
    });

    node.addEventListener("keydown", function (e) {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        if (typeof applyCountryFilter === "function") {
          applyCountryFilter(iso2, true);
        }
      }
    });
  });

  syncMapSelection();
  return hasAnyNode;
}

function waitAndBindMapCountries() {
  if (mapBindTimer) {
    clearInterval(mapBindTimer);
    mapBindTimer = null;
  }

  var attempts = 0;
  mapBindTimer = setInterval(function () {
    attempts += 1;

    var ok = bindMapCountryEvents();
    if (ok || attempts > 50) {
      clearInterval(mapBindTimer);
      mapBindTimer = null;

      if (ok) {
        console.log("[ETSIT] Mapa listo y eventos enlazados");
      } else {
        console.warn("[ETSIT] No se pudieron enlazar los países del mapa");
      }
    }
  }, 120);
}

function initMap() {
  if (typeof svgMap === "undefined") {
    console.log("[ETSIT] svgMap aún no cargado, reintentando...");
    setTimeout(initMap, 300);
    return;
  }

  var values = {};
  Object.keys(countries).forEach(function (iso2) {
    values[getSvgCountryCode(iso2)] = {
      value: countries[iso2].offers_count || 0
    };
  });

  var mapEl = document.getElementById("map");
  if (!mapEl) return;
  mapEl.innerHTML = "";

  new svgMap({
    targetElementID: "map",
    minZoom: 1,
    maxZoom: 8,
    initialZoom: 1.06,
    zoomScaleSensitivity: 0.22,
    mouseWheelZoomEnabled: true,
    mouseWheelZoomWithKey: true,
    mouseWheelKeyMessage: "Pulsa ALT para hacer zoom",
    showZoomReset: true,
    resetZoomOnResize: true,
    zoomButtonsPosition: "bottomRight",
    noDataText: "Sin plazas",
    colorMin: "#d0e4ff",
    colorMax: "#003DA5",
    colorNoData: "#dde3ed",

    data: {
      data: {
        value: {
          name: "Plazas",
          format: "{0}"
        }
      },
      applyData: "value",
      values: values
    },

    onGetTooltip: function (tooltipDiv, countryCode) {
      var ourCode = getJsonCountryCode(countryCode);
      var info = countries[ourCode];

      if (!info) {
        tooltipDiv.innerHTML =
          "<div style='font-weight:700;color:#0d1a2e;margin-bottom:4px'>" +
            (COUNTRY_NAMES[ourCode] || countryCode) +
          "</div>" +
          "<div style='font-size:12px;color:#999'>Sin plazas disponibles</div>";
        return;
      }

      var name = COUNTRY_NAMES[ourCode] || ourCode;
      var shown = (info.cities || []).slice(0, 10);
      var extra = (info.cities || []).length > 10
        ? "<span style='color:#aaa;font-style:italic'> +" + ((info.cities || []).length - 10) + " más</span>"
        : "";

      var active = activeCountryCode === ourCode;

      tooltipDiv.innerHTML =
        "<div style='font-family:Syne,sans-serif;font-weight:800;font-size:15px;color:#0d1a2e;margin-bottom:8px;display:flex;align-items:center;gap:8px'>" +
          name +
          (active
            ? "<span style='font-size:10px;font-family:DM Sans,sans-serif;background:#003DA5;color:#fff;border-radius:100px;padding:2px 8px;font-weight:600'>Activo ✓</span>"
            : "") +
        "</div>" +
        "<div style='display:flex;gap:20px;margin-bottom:10px'>" +
          "<div style='text-align:center'><div style='font-size:20px;font-weight:800;color:#003DA5;font-family:Syne,sans-serif'>" + info.offers_count + "</div><div style='font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.06em'>plazas</div></div>" +
          "<div style='text-align:center'><div style='font-size:20px;font-weight:800;color:#003DA5;font-family:Syne,sans-serif'>" + info.cities_count + "</div><div style='font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.06em'>ciudades</div></div>" +
        "</div>" +
        "<div style='font-size:12px;color:#0d1a2e;line-height:1.8;margin-bottom:8px'>" +
          shown.map(function (c) {
            return "<span style='display:inline-block;background:#f0f4fb;border-radius:4px;padding:1px 8px;margin:2px 2px 0 0;font-size:11px'>" + c + "</span>";
          }).join("") +
          extra +
        "</div>" +
        "<div style='font-size:11px;color:" + (active ? "#003DA5" : "#aaa") + ";text-align:center;border-top:1px solid #eee;padding-top:8px;font-weight:" + (active ? "600" : "400") + "'>" +
          (active ? "↑ Clic para quitar este filtro" : "↓ Clic para filtrar por " + name) +
        "</div>";
    }
  });

  waitAndBindMapCountries();
  console.log("[ETSIT] svgMap inicializado");
}

function initFilters() {
  var fCountry = document.getElementById("fCountry");
  var fCity = document.getElementById("fCity");
  var fProgram = document.getElementById("fProgram");
  var fCert = document.getElementById("fCert");
  var rows = document.getElementById("rows");
  var count = document.getElementById("count");
  var section = document.getElementById("filterSection");
  var clearBtn = document.getElementById("clearFilters");

  if (!fCountry || !fCity || !fProgram || !fCert || !rows || !count || !clearBtn) {
    console.error("[ETSIT] Elementos del DOM no encontrados");
    return;
  }

  function uniqueSorted(arr) {
    return Array.from(new Set(
      arr
        .map(function (x) { return (x || "").trim(); })
        .filter(Boolean)
    )).sort(function (a, b) {
      return a.localeCompare(b, "es");
    });
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
    if (p.indexOf("ms") >= 0) return "ms";
    if (p.indexOf("ab") >= 0) return "ab";
    if (p.indexOf("er") >= 0) return "er";
    return "";
  }

  function formatCert(cert) {
    if (!cert || cert === "-") return '<span style="color:#bbb">—</span>';
    var short = cert.split(/[,(]/)[0].trim();
    return '<span title="' + cert.replace(/"/g, "&quot;") + '">' + short + "</span>";
  }

  Object.entries(COUNTRY_NAMES)
    .filter(function (e) { return !!countries[e[0]]; })
    .sort(function (a, b) { return a[1].localeCompare(b[1], "es"); })
    .forEach(function (e) {
      fCountry.appendChild(new Option(e[1] + " (" + e[0] + ")", e[0]));
    });

  uniqueSorted(offersAll.map(function (o) { return o.programa; }))
    .forEach(function (v) {
      fProgram.appendChild(new Option(PROG_LABELS[v] || v, v));
    });

  uniqueSorted(
    offersAll
      .map(function (o) { return certShort(o.cert); })
      .filter(Boolean)
  ).forEach(function (v) {
    fCert.appendChild(new Option(v, v));
  });

  function populateCities() {
    var cc = fCountry.value;
    var prevCity = fCity.value;

    var cities = (cc && countries[cc] && Array.isArray(countries[cc].cities))
      ? countries[cc].cities
      : uniqueSorted(offersAll.map(function (o) { return o.ciudad; }));

    fCity.innerHTML = '<option value="">Todas las ciudades</option>';

    cities.forEach(function (v) {
      fCity.appendChild(new Option(v, v));
    });

    if (cities.indexOf(prevCity) >= 0) {
      fCity.value = prevCity;
    } else {
      fCity.value = "";
    }
  }

  function passes(o) {
    if (fCountry.value && o.pais !== fCountry.value) return false;
    if (fCity.value && o.ciudad !== fCity.value) return false;
    if (fProgram.value && o.programa !== fProgram.value) return false;
    if (fCert.value && certShort(o.cert) !== fCert.value) return false;
    return true;
  }

  function render() {
    var filtered = offersAll.filter(passes);

    count.textContent =
      filtered.length.toLocaleString("es-ES") +
      (filtered.length === 1 ? " resultado" : " resultados");

    if (filtered.length === 0) {
      rows.innerHTML =
        '<tr><td colspan="8"><div class="empty-state">' +
        '<svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>' +
        "<p>No hay destinos que coincidan con los filtros seleccionados.</p>" +
        "</div></td></tr>";
      return;
    }

    var frag = document.createDocumentFragment();

    filtered.slice(0, 5000).forEach(function (o) {
      var tr = document.createElement("tr");
      tr.innerHTML =
        "<td><strong>" + (o.universidad || "—") + "</strong></td>" +
        "<td>" + (o.ciudad || "—") + "</td>" +
        "<td><span class='country-cell'>" +
          "<span>" + (COUNTRY_NAMES[o.pais] || o.pais || "") + "</span>" +
          "<small style='color:#888'>" + (o.pais || "") + "</small>" +
        "</span></td>" +
        "<td><code style='font-size:12px;color:#555'>" + (o.codigo_erasmus || "—") + "</code></td>" +
        "<td class='plazas-cell'><span class='plazas-badge'>" + (o.plazas || "—") + "</span></td>" +
        "<td><span class='prog-badge " + progBadgeClass(o.programa) + "'>" + (PROG_LABELS[o.programa] || o.programa || "") + "</span></td>" +
        "<td style='font-size:12px;color:#5b6880;max-width:180px'>" + formatCert(o.cert) + "</td>" +
        "<td class='obs-cell'>" + (o.observaciones || "") + "</td>";
      frag.appendChild(tr);
    });

    rows.innerHTML = "";
    rows.appendChild(frag);
  }

  applyCountryFilter = function (ourCode, scrollToFilters) {
    fCountry.value = (fCountry.value === ourCode) ? "" : ourCode;
    activeCountryCode = fCountry.value || "";

    populateCities();
    render();
    syncMapSelection();

    fCountry.classList.remove("filter-select--active");
    void fCountry.offsetWidth;
    fCountry.classList.add("filter-select--active");

    setTimeout(function () {
      fCountry.classList.remove("filter-select--active");
    }, 900);

    if (scrollToFilters && section) {
      section.scrollIntoView({
        behavior: "smooth",
        block: "start"
      });
    }
  };

  clearBtn.addEventListener("click", function () {
    fCountry.value = "";
    fCity.value = "";
    fProgram.value = "";
    fCert.value = "";
    activeCountryCode = "";

    populateCities();
    render();
    syncMapSelection();
  });

  fCountry.addEventListener("change", function () {
    activeCountryCode = fCountry.value || "";
    populateCities();
    render();
    syncMapSelection();
  });

  fCity.addEventListener("change", render);
  fProgram.addEventListener("change", render);
  fCert.addEventListener("change", render);

  populateCities();
  render();

  console.log(
    "[ETSIT] ✓ Filtros listos —",
    fCountry.options.length - 1, "países,",
    fProgram.options.length - 1, "programas"
  );
}