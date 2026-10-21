"""
Mapa de distribución de Baccharis (Asteraceae) en Bolivia con datos de GBIF.

Requisitos:  pip install requests pandas folium matplotlib
Salidas:     baccharis_bolivia.csv, baccharis_bolivia.html (interactivo), baccharis_bolivia.png
"""
import requests
import pandas as pd
import folium
import matplotlib.pyplot as plt

API = "https://api.gbif.org/v1"

# 1) Obtener la clave taxonómica del género desde el Backbone de GBIF
m = requests.get(f"{API}/species/match", params={"name": "Baccharis", "rank": "genus"}).json()
taxon_key = m["usageKey"]
print(f"Baccharis -> taxonKey {taxon_key} ({m.get('status')}, {m.get('matchType')})")

# 2) Descargar ocurrencias paginadas (Bolivia = BO, con coordenadas, sin problemas geoespaciales)
params = {
    "taxonKey": taxon_key,
    "country": "BO",
    "hasCoordinate": "true",
    "hasGeospatialIssue": "false",
    "limit": 300,
    "offset": 0,
}
records = []
while True:
    r = requests.get(f"{API}/occurrence/search", params=params).json()
    records += r["results"]
    if r["endOfRecords"] or params["offset"] >= 99_000:  # la búsqueda admite hasta ~100k registros
        break
    params["offset"] += params["limit"]

total = r["count"]
print(f"Registros descargados: {len(records)} de {total}")

cols = ["key", "species", "scientificName", "decimalLatitude", "decimalLongitude",
        "year", "basisOfRecord", "institutionCode", "datasetName", "stateProvince"]
df = pd.DataFrame(records).reindex(columns=cols).dropna(subset=["decimalLatitude", "decimalLongitude"])
df.to_csv("baccharis_bolivia.csv", index=False)

# 3) Mapa interactivo (Leaflet)
mapa = folium.Map(location=[-16.5, -64.5], zoom_start=6, tiles="CartoDB positron")
for _, f in df.iterrows():
    folium.CircleMarker(
        [f.decimalLatitude, f.decimalLongitude],
        radius=3, color="#2e7d32", fill=True, fill_opacity=0.7, weight=0.5,
        popup=folium.Popup(
            f"<i>{f.species or f.scientificName}</i><br>{f.year}<br>{f.institutionCode}<br>"
            f"<a href='https://www.gbif.org/occurrence/{f.key}' target='_blank'>GBIF {f.key}</a>",
            max_width=250),
    ).add_to(mapa)
mapa.save("baccharis_bolivia.html")

# 4) Mapa estático (PNG) para publicaciones
fig, ax = plt.subplots(figsize=(7, 8))
ax.scatter(df.decimalLongitude, df.decimalLatitude, s=8, c="#2e7d32", alpha=0.6, edgecolors="none")
ax.set_xlim(-70, -57.3); ax.set_ylim(-23, -9.5)
ax.set_aspect("equal"); ax.grid(alpha=0.3)
ax.set_xlabel("Longitud"); ax.set_ylabel("Latitud")
ax.set_title(f"Ocurrencias de Baccharis en Bolivia (n = {len(df)})\nFuente: GBIF.org")
plt.tight_layout(); plt.savefig("baccharis_bolivia.png", dpi=300)
print("Listo: baccharis_bolivia.html / .png / .csv")