#!/usr/bin/env python3
"""Instantánea del tráfico aéreo real para el globo del corredor.

Consulta la API pública de OpenSky Network (anónima, sin clave) con una sola
caja que cubre el Golfo, el corredor y Japón, y escribe datos/trafico.json:

- golfo / japon: cuántas aeronaves hay en el aire en cada zona y dónde.
- corredor: aeronaves de compañías del Golfo en vuelo sobre el corredor
  Golfo–Asia oriental, rumbo este u oeste. NO se afirma que vayan a Japón:
  OpenSky no da el destino, y el globo lo dice así.

La web no puede leer OpenSky directamente (su CORS sólo admite su dominio),
por eso lo hace una tarea de GitHub Actions y la web lee este fichero.
Sólo biblioteca estándar. Falla con código 1 y mensaje claro si no hay datos.
"""
import json
import sys
import time
import urllib.request
from pathlib import Path

URL = ('https://opensky-network.org/api/states/all'
       '?lamin=0&lomin=30&lamax=50&lomax=150')
GOLFO = (12, 38, 34, 62)      # lat mín, lat máx, lon mín, lon máx
JAPON = (24, 46, 122, 150)
CORREDOR = (5, 46, 60, 146)
COMPANIAS = ('UAE', 'QTR', 'ETD', 'SVA', 'GFA', 'KAC', 'OMA')


def dentro(caja, lat, lon):
    return caja[0] <= lat <= caja[1] and caja[2] <= lon <= caja[3]


def rumbo_corredor(track):
    """Este (hacia Asia) u oeste (hacia el Golfo), con margen amplio."""
    return 30 <= track <= 130 or 230 <= track <= 330


def main():
    req = urllib.request.Request(URL, headers={'User-Agent': 'corredor-golfo/1.0'})
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            datos = json.load(r)
    except Exception as e:  # red, 429 por cuota, 403 si bloquean la IP
        sys.exit(f'OpenSky no respondió: {e}')
    estados = datos.get('states') or []
    if not estados:
        sys.exit('OpenSky devolvió cero aeronaves: no se sobrescribe la instantánea')

    golfo, japon, corredor = [], [], []
    for s in estados:
        lon, lat, suelo, vel, track = s[5], s[6], s[8], s[9], s[10]
        if lat is None or lon is None or suelo:
            continue
        p = [round(lat, 2), round(lon, 2), round(track or 0)]
        if dentro(GOLFO, lat, lon):
            golfo.append(p)
        if dentro(JAPON, lat, lon):
            japon.append(p)
        indicativo = (s[1] or '').strip()
        if (indicativo[:3] in COMPANIAS and dentro(CORREDOR, lat, lon)
                and track is not None and vel and rumbo_corredor(track)):
            alt = s[13] if s[13] is not None else s[7]
            corredor.append([indicativo, round(lat, 3), round(lon, 3), round(track),
                             round(vel), round(alt or 0)])

    salida = {
        'fuente': 'OpenSky Network, API pública (anónima)',
        't': datos.get('time') or int(time.time()),
        'golfo': {'n': len(golfo), 'p': golfo},
        'japon': {'n': len(japon), 'p': japon},
        'corredor': corredor,
    }
    Path('datos').mkdir(exist_ok=True)
    Path('datos/trafico.json').write_text(json.dumps(salida, separators=(',', ':')))
    print(f"golfo {len(golfo)} · japón {len(japon)} · corredor {len(corredor)}")


if __name__ == '__main__':
    main()
