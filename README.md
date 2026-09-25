# El corredor del Golfo

Estudio de viabilidad del mercado emisor del Golfo hacia Japón, preparado para
una consultora de viajes privados con sede en Dubái.

**En línea:** https://2troll.github.io/corredor-golfo/

Antes de publicar, `python3 comprobar.py && git push origin main`: si una cifra de
la página no coincide con JNTO o con el modelo, no sale.

Veintiún apartados, con cotizador en vivo, el calendario hiyrí calculado en el
navegador y el corredor aéreo en tres dimensiones.

## Qué tiene dentro

- **Cotizador.** Programa, viajeros, habitaciones, nivel de hotel y margen; el
  presupuesto se rehace al instante y se descarga en texto plano. Los ocho
  conceptos salen de la misma fórmula que el informe en PDF, así que los
  totales cuadran al yen.
- **Cada línea dice de dónde sale su precio:** tarifa publicada, precio
  observado con fecha, o supuesto propio. Sin esa columna no se puede discutir
  un presupuesto, y uno que no se puede discutir no se firma.
- **Calendario hiyrí** resuelto con el algoritmo tabular civil, sin librería.
  Ramadán y las dos fiestas de 2027, con el aviso de que son aproximación:
  los ministerios del Golfo anuncian por avistamiento.
- **Corredor aéreo en 3D, con datos reales.** La Tierra con la luz del sol de
  ahora mismo (día, noche y luces de las ciudades), las nubes reales de ayer
  (NASA VIIRS), la lluvia casi en tiempo real (NASA IMERG), el tiempo actual de
  cada ciudad (Open-Meteo) y el tráfico aéreo real (OpenSky): cuántas aeronaves
  hay en el aire sobre el Golfo y sobre Japón, y los aviones de las compañías
  del Golfo que cruzan el corredor, adelantados con su rumbo y velocidad. Las
  rutas son arcos de círculo máximo; el grosor es la frecuencia semanal. Si una
  fuente falla, el globo sigue y la leyenda deja de citarla.
- **Tres gráficos dibujados a escala**, no imágenes: serie mensual,
  estacionalidad comparada con el mercado español y gasto por mercado.

## Cómo está hecho

Un solo fichero. HTML, CSS y JavaScript planos, sin compilar y sin claves de
API. Las texturas de la Tierra y las fronteras (Natural Earth 1:110 m) van en `img/`.
Fuera sólo se piden las tipografías (Google Fonts), three.js (cdnjs) y las
fuentes de datos en vivo, todas gratuitas y sin clave.

**Tráfico aéreo.** OpenSky no deja que otra web lea su API desde el navegador,
así que `trafico.py` la consulta cada 20 minutos desde GitHub Actions
(`.github/workflows/trafico.yml`) y publica `trafico.json` en la rama `datos`,
con un único commit que se reescribe. 72 consultas al día × 4 créditos = 288,
dentro de los 400 anónimos.

Claro y oscuro, con el tema del visitante respetado y botón para cambiarlo.

## Fuentes

JNTO (llegadas mensuales por nacionalidad y respuestas escritas de septiembre
de 2026), Agencia de Turismo de Japón (encuesta de consumo), Agencia de
Servicios de Inmigración vía e-Stat, Prefectura de Osaka (requisitos y tasa
del registro de 旅行サービス手配業), JFG, JR Central y JPS 京都観光貸切タクシー.

Los supuestos propios van marcados como tales en todo el documento.

## Antes de publicar: `comprobar.py`

```sh
python3 comprobar.py     # 0 si todo cuadra, 1 si hay una cifra que no
```

Contrasta lo que dice esta página con `~/projects/golfo-datos`, que es donde
vive el cálculo: los 43 meses de `const SERIE` contra el CSV de JNTO, y el
bloque `const GOLFO` campo a campo contra `salida/para-web.json`.

Existe porque esta web llegó a estar publicada con una serie inventada durante
semanas y nadie lo vio: se descubrió leyendo el repo a mano, no al publicar. Esa
parte no puede depender de que alguien se acuerde de mirar.
