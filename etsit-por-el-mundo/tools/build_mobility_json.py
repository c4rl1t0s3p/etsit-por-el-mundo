import json
import re
from pathlib import Path
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
EXCEL_PATH = ROOT / "data" / "Oferta_de_plazas_2026-27_web_OI.xlsx"
OUT_JSON = ROOT / "data" / "oferta.json"

COLS = {
    "pais": "PAÍS",
    "ciudad": "CIUDAD",
    "universidad": "UNIVERSIDAD",
    "codigo": "CÓDIGO ERASMUS",
    "plazas": "PLAZAS",
    "programa": "PROGRAMA",
    "cert": "CERT",
    "observaciones": "OBSERVACIONES",
}

def clean(x) -> str:
    if pd.isna(x):
        return ""
    return str(x).strip()

def extract_iso2(raw: str) -> list[str]:
    s = clean(raw).upper()
    codes = re.findall(r"\b[A-Z]{2}\b", s)
    seen, out = set(), []
    for c in codes:
        if c not in seen:
            out.append(c); seen.add(c)
    return out

def main():
    df = pd.read_excel(EXCEL_PATH)

    missing = [v for v in COLS.values() if v not in df.columns]
    if missing:
        raise SystemExit(f"Faltan columnas en el Excel: {missing}\nDetectadas: {list(df.columns)}")

    offers = []
    for _, row in df.iterrows():
        uni = clean(row[COLS["universidad"]])
        city = clean(row[COLS["ciudad"]])
        country_raw = row[COLS["pais"]]
        if not uni or not city or pd.isna(country_raw):
            continue

        iso2_list = extract_iso2(country_raw)
        if not iso2_list:
            continue

        base = {
            "universidad": uni,
            "ciudad": city,
            "codigo_erasmus": clean(row[COLS["codigo"]]),
            "plazas": clean(row[COLS["plazas"]]),
            "programa": clean(row[COLS["programa"]]),
            "cert": clean(row[COLS["cert"]]),
            "observaciones": clean(row[COLS["observaciones"]]),
        }
        for iso2 in iso2_list:
            o = dict(base)
            o["pais"] = iso2
            offers.append(o)

    countries = {}
    for o in offers:
        c = o["pais"]
        countries.setdefault(c, {"cities": set(), "offers": []})
        countries[c]["cities"].add(o["ciudad"])
        countries[c]["offers"].append(o)

    out = {
        "meta": {
            "curso": "2026-2027",
            "source_excel": EXCEL_PATH.name,
            "offers_count": len(offers),
            "countries_count": len(countries),
        },
        "countries": {},
        "offers": offers,
    }

    for c, info in sorted(countries.items()):
        cities = sorted(info["cities"])
        out["countries"][c] = {
            "iso2": c,
            "cities": cities,
            "cities_count": len(cities),
            "offers_count": len(info["offers"]),
            "offers": info["offers"],
        }

    OUT_JSON.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"OK: {OUT_JSON}")

if __name__ == "__main__":
    main()