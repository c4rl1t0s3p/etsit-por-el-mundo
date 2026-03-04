(async function () {
  const DATA_URL = "./data/oferta.json";

  const res = await fetch(DATA_URL, { cache: "no-store" });
  const data = await res.json();
  const countries = data.countries || {};
  const offersAll = data.offers || [];

  // MAPA
  const values = {};
  for (const [iso2, info] of Object.entries(countries)) {
    values[iso2] = { value: info.offers_count || 0 };
  }

  new svgMap({
    targetElementID: "map",
    data: {
      data: { value: { name: "Entradas", format: "{0}" } },
      applyData: "value",
      values
    },
    colorMin: "#e7eeff",
    colorMax: "#2b63ff",
    mouseWheelZoomEnabled: true,
    onGetTooltip: function (tooltipDiv, countryCode) {
      const info = countries[countryCode];
      if (!info) return;
      const cities = info.cities || [];
      const shown = cities.slice(0, 12);
      const extra = cities.length > 12 ? `… +${cities.length - 12} más` : "";
      tooltipDiv.innerHTML = `
        <div style="font-weight:700; margin-bottom:6px;">
          ${countryCode} — ${info.cities_count} ciudades
        </div>
        <div style="font-size:12px; line-height:1.35;">
          ${shown.map(c => `<div>• ${c}</div>`).join("")}
          ${extra ? `<div style="opacity:.8; margin-top:4px;">${extra}</div>` : ""}
        </div>
        <div style="margin-top:8px; font-size:12px; opacity:.9;">Click para ver plazas</div>
      `;
    },
    onClick: function (countryCode) {
      if (!countries[countryCode]) return;
      window.location.href = `./country.html?country=${encodeURIComponent(countryCode)}`;
    }
  });

  // FILTROS
  const $ = (id) => document.getElementById(id);
  const fCountry = $("fCountry");
  const fCity = $("fCity");
  const fProgram = $("fProgram");
  const fCert = $("fCert");
  const rows = $("rows");
  const count = $("count");

  function uniqueSorted(arr) {
    return [...new Set(arr.map(x => (x || "").trim()).filter(Boolean))].sort((a,b)=>a.localeCompare(b));
  }

  // Países
  Object.keys(countries).sort().forEach(cc => {
    const opt = document.createElement("option");
    opt.value = cc; opt.textContent = cc;
    fCountry.appendChild(opt);
  });

  // Programas / certs
  uniqueSorted(offersAll.map(o => o.programa)).forEach(v => {
    const opt = document.createElement("option");
    opt.value = v; opt.textContent = v;
    fProgram.appendChild(opt);
  });
  uniqueSorted(offersAll.map(o => o.cert)).forEach(v => {
    const opt = document.createElement("option");
    opt.value = v; opt.textContent = v;
    fCert.appendChild(opt);
  });

  function populateCities() {
    const cc = fCountry.value;
    const cities = cc && countries[cc] ? countries[cc].cities : uniqueSorted(offersAll.map(o => o.ciudad));
    fCity.innerHTML = `<option value="">Todas</option>`;
    cities.forEach(v => {
      const opt = document.createElement("option");
      opt.value = v; opt.textContent = v;
      fCity.appendChild(opt);
    });
  }

  function passes(o) {
    if (fCountry.value && o.pais !== fCountry.value) return false;
    if (fCity.value && o.ciudad !== fCity.value) return false;
    if (fProgram.value && o.programa !== fProgram.value) return false;
    if (fCert.value && o.cert !== fCert.value) return false;
    return true;
  }

  function render() {
    const filtered = offersAll.filter(passes);
    count.textContent = `${filtered.length} resultados`;
    rows.innerHTML = "";
    for (const o of filtered.slice(0, 5000)) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${o.universidad || ""}</td>
        <td>${o.ciudad || ""}</td>
        <td>${o.pais || ""}</td>
        <td>${o.codigo_erasmus || ""}</td>
        <td>${o.plazas || ""}</td>
        <td>${o.programa || ""}</td>
        <td>${o.cert || ""}</td>
      `;
      rows.appendChild(tr);
    }
  }

  document.getElementById("clear").addEventListener("click", () => {
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