/* ============================================================
   ETSIT POR EL MUNDO — country.js
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

const SVG_TO_JSON = { GB:"UK" };

function getBase() {
  var href = window.location.href.split("?")[0].split("#")[0];
  return href.endsWith("/") ? href : href.substring(0, href.lastIndexOf("/") + 1);
}

document.addEventListener("DOMContentLoaded", function () {
  var rawCode = (new URLSearchParams(window.location.search).get("country") || "").toUpperCase();
  var cc = SVG_TO_JSON[rawCode] || rawCode;

  if (!/^[A-Z]{2}$/.test(cc)) {
    window.location.href = getBase();
    return;
  }

  var jsonURL = getBase() + "data/oferta.json";
  console.log("[ETSIT country] Cargando:", jsonURL, "para país:", cc);

  fetch(jsonURL, { cache: "no-store" })
    .then(function(res) {
      if (!res.ok) throw new Error("HTTP " + res.status);
      return res.json();
    })
    .then(function(data) {
      var info = (data.countries || {})[cc];
      if (!info) {
        document.getElementById("pageTitle").textContent = "Sin datos: " + cc;
        document.getElementById("pageMeta").textContent = "No hay plazas disponibles para este país.";
        return;
      }
      renderPage(cc, info);
    })
    .catch(function(err) {
      console.error("[ETSIT country] Error:", err);
      document.getElementById("pageTitle").textContent = "Error al cargar los datos";
    });
});

function renderPage(cc, info) {
  var countryName = COUNTRY_NAMES[cc] || cc;

  document.title = countryName + " · ETSIT por el Mundo";
  document.getElementById("pageTitle").textContent = countryName;
  document.getElementById("pageMeta").textContent =
    info.cities_count + " ciudad" + (info.cities_count !== 1 ? "es" : "") +
    " · " + info.offers_count + " plaza" + (info.offers_count !== 1 ? "s" : "");

  var totalPlazas = info.offers.reduce(function(s, o) { return s + (parseInt(o.plazas) || 0); }, 0);
  var unis = new Set(info.offers.map(function(o) { return o.universidad; })).size;

  document.getElementById("toolbarStats").innerHTML =
    "<div class='t-stat'><span class='t-stat-num'>" + totalPlazas + "</span><span class='t-stat-label'>plazas</span></div>" +
    "<div class='t-stat'><span class='t-stat-num'>" + unis + "</span><span class='t-stat-label'>universidades</span></div>" +
    "<div class='t-stat'><span class='t-stat-num'>" + info.cities_count + "</span><span class='t-stat-label'>ciudades</span></div>";

  var cityFilter = document.getElementById("cityFilter");
  cityFilter.innerHTML = '<option value="">Todas las ciudades</option>';
  (info.cities || []).forEach(function(c) {
    cityFilter.appendChild(new Option(c, c));
  });

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
    var cityVal  = cityFilter.value;
    var offers   = cityVal ? info.offers.filter(function(o) { return o.ciudad === cityVal; }) : info.offers;
    var tbody    = document.getElementById("rows");
    var fragment = document.createDocumentFragment();

    var byCity = {};
    offers.forEach(function(o) {
      var c = o.ciudad || "Sin ciudad";
      if (!byCity[c]) byCity[c] = [];
      byCity[c].push(o);
    });

    Object.entries(byCity).forEach(function(entry) {
      var city = entry[0], cityOffers = entry[1];

      if (!cityVal) {
        var hdr = document.createElement("tr");
        hdr.className = "city-group-header";
        hdr.innerHTML = '<td colspan="7">' + city +
          ' <span style="font-weight:400;color:#888">(' + cityOffers.length +
          ' oferta' + (cityOffers.length !== 1 ? "s" : "") + ')</span></td>';
        fragment.appendChild(hdr);
      }

      cityOffers.forEach(function(o) {
        var tr = document.createElement("tr");
        var progLabel = PROG_LABELS[o.programa] || o.programa || "";
        var bClass    = progBadgeClass(o.programa);
        tr.innerHTML =
          "<td><strong>" + (o.universidad || "—") + "</strong></td>" +
          "<td>" + (o.ciudad || "—") + "</td>" +
          "<td><code style='font-size:12px;color:#555'>" + (o.codigo_erasmus || "—") + "</code></td>" +
          "<td class='plazas-cell'><span class='plazas-badge'>" + (o.plazas || "—") + "</span></td>" +
          "<td><span class='prog-badge " + bClass + "'>" + progLabel + "</span></td>" +
          "<td style='font-size:12px;color:#5b6880;max-width:200px'>" + formatCert(o.cert) + "</td>" +
          "<td class='obs-cell'>" + (o.observaciones || "") + "</td>";
        fragment.appendChild(tr);
      });
    });

    if (!fragment.childNodes.length) {
      var tr = document.createElement("tr");
      tr.innerHTML = '<td colspan="7"><div class="empty-state"><p>No hay plazas para esta ciudad.</p></div></td>';
      fragment.appendChild(tr);
    }

    tbody.innerHTML = "";
    tbody.appendChild(fragment);
  }

  cityFilter.addEventListener("change", render);
  render();
  console.log("[ETSIT country] ✓ Página renderizada para", countryName);
}