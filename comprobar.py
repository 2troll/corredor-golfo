#!/usr/bin/env python3
"""Comprueba que esta página dice lo mismo que el modelo, antes de publicarla.

    python3 comprobar.py        # 0 si todo cuadra, 1 si hay una sola cifra que no

Por qué existe. Esta web estuvo publicada con una **serie mensual inventada**:
una curva suavizada (2024 ≈ 2023 × 1,11) que nadie había contrastado con JNTO.
Marzo de 2024 figuraba con 2.930 llegadas cuando la cifra real son 891. El
−38,6 % que se citaba coincidía por casualidad. Se detectó el 14 de septiembre
de 2026 revisando el repo a mano, no al publicar — y esa es exactamente la parte
que no puede depender de que alguien se acuerde de mirar.

Dos comprobaciones, las dos contra `~/projects/golfo-datos`, que es donde vive
el cálculo:

  1. `const SERIE` mes a mes contra `datos/series.csv` (agregado GCC6か国 de JNTO).
  2. El bloque `const GOLFO` contra `salida/para-web.json`, campo a campo. Si el
     modelo cambia de costes o de umbrales y la página no se regenera, salta.

Lo que este script NO comprueba: que la página se vea bien. Eso es mirarla.
"""
import csv
import json
import os
import re
import sys

BASE = os.path.dirname(os.path.abspath(__file__))
DATOS = os.path.expanduser('~/projects/golfo-datos')


def bloques():
    with open(os.path.join(BASE, 'index.html'), encoding='utf-8') as f:
        html = f.read()
    serie = re.search(r'const SERIE=\{(.*?)\n\};', html, re.S)
    golfo = re.search(r'const GOLFO=(\{.*?\});\n', html, re.S)
    if not serie or not golfo:
        sys.exit('no encuentro const SERIE o const GOLFO en index.html')
    web = {}
    for anio, cuerpo in re.findall(r'(\d{4}):\[([^\]]+)\]', serie.group(1)):
        web[int(anio)] = [None if x.strip() == 'null' else int(x)
                          for x in cuerpo.split(',') if x.strip()]
    return web, json.loads(golfo.group(1))


def serie_oficial():
    ruta = os.path.join(DATOS, 'datos', 'series.csv')
    if not os.path.exists(ruta):
        sys.exit(f'falta {ruta}: ejecuta «make datos» en golfo-datos')
    real = {}
    with open(ruta, encoding='utf-8') as f:
        for r in csv.DictReader(f):
            if r['serie'] == 'golfo':
                real.setdefault(int(r['anio']), {})[int(r['mes'])] = int(r['personas'])
    return real


def compara(a, b, ruta=''):
    """Diferencias entre lo que dice la web (a) y lo que dice el modelo (b).

    Las claves que están sólo en el modelo no son un fallo: el modelo publica
    más de lo que esta página usa. Al revés sí lo es."""
    fallos = []
    if isinstance(a, dict) and isinstance(b, dict):
        for k in sorted(a):
            if k not in b:
                fallos.append(f'{ruta}.{k}: está en la web y ya no en el modelo')
            else:
                fallos += compara(a[k], b[k], f'{ruta}.{k}')
    elif isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            fallos.append(f'{ruta}: la web tiene {len(a)} elementos y el modelo {len(b)}')
        else:
            for i, (x, y) in enumerate(zip(a, b)):
                fallos += compara(x, y, f'{ruta}[{i}]')
    elif a != b:
        fallos.append(f'{ruta}: web {a!r} · modelo {b!r}')
    return fallos


def main():
    web_serie, web_golfo = bloques()
    real = serie_oficial()

    fallos, meses = [], 0
    for anio, valores in sorted(web_serie.items()):
        for i, v in enumerate(valores, 1):
            oficial = real.get(anio, {}).get(i)
            if v is None:
                if oficial is not None:
                    fallos.append(f'{anio}-{i:02d}: la web pone null y JNTO ya publica {oficial}')
                continue
            meses += 1
            if oficial is None:
                fallos.append(f'{anio}-{i:02d}: la web dice {v} y JNTO no publica ese mes')
            elif oficial != v:
                fallos.append(f'{anio}-{i:02d}: web {v} · JNTO {oficial}')
    print(f'serie mensual: {meses} meses contrastados con JNTO')

    ruta = os.path.join(DATOS, 'salida', 'para-web.json')
    if not os.path.exists(ruta):
        sys.exit(f'falta {ruta}: ejecuta «make analisis» en golfo-datos')
    with open(ruta, encoding='utf-8') as f:
        modelo = json.load(f)
    dif = compara(web_golfo, modelo)
    print(f'bloque del modelo: {len(dif)} diferencias')

    fallos += dif
    if fallos:
        print('\nNO PUBLICAR. La página no dice lo mismo que el modelo:')
        for f in fallos[:20]:
            print('  ·', f)
        if len(fallos) > 20:
            print(f'  … y {len(fallos) - 20} más')
        return 1
    print('\ntodo cuadra: la página se puede publicar')
    return 0


if __name__ == '__main__':
    sys.exit(main())
