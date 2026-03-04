(async function () {
  const DATA_URL = "./data/oferta.json";
  const cc = (new URLSearchParams(location.search).get("country") || "").toUpperCase();
  if (!/^[A-Z]{2}$/.test(cc)) { location.href = "./"; return; }

  const res = await fetch(DATA_URL, { cache: "no-store" });
  const data = await res.json();
  const info = (data.countries || {})[cc];
  if (!info) { document.getElementById("title").textContent = `Sin datos: ${cc}`; return; }

  document.getElementById("title").textContent = `Plazas disponibles: ${cc}`;
  document.getElementById("meta").textContent = `${info.cities_count} ciudades · ${info.offers_count} entradas`;

  const tbody = document.getElementById("rows");
  tbody.innerHTML = "";
  for (const o of info.offers) {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${o.universidad || ""}</td>
      <td>${o.ciudad || ""}</td>
      <td>${o.codigo_erasmus || ""}</td>
      <td>${o.plazas || ""}</td>
      <td>${o.programa || ""}</td>
      <td>${o.cert || ""}</td>
    `;
    tbody.appendChild(tr);
  }
})();