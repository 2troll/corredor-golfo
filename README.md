# El corredor del Golfo

Estudio de viabilidad del mercado emisor del Golfo hacia Japón, preparado para
una consultora de viajes privados con sede en Dubái.

**En línea:** https://2troll.github.io/corredor-golfo/

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
- **Corredor aéreo en 3D.** Cada arco es una ruta real; el grosor es la
  frecuencia semanal y el color separa lo operativo de lo anunciado. La esfera
  se orienta sola calculando el centroide de la red.
- **Tres gráficos dibujados a escala**, no imágenes: serie mensual,
  estacionalidad comparada con el mercado español y gasto por mercado.

## Cómo está hecho

Un solo fichero. HTML, CSS y JavaScript planos, sin compilar y sin claves de
API. La única petición externa es la hoja de tipografías de Google y la
biblioteca de tres dimensiones desde un CDN público.

Claro y oscuro, con el tema del visitante respetado y botón para cambiarlo.

## Fuentes

JNTO (llegadas mensuales por nacionalidad y respuestas escritas de septiembre
de 2026), Agencia de Turismo de Japón (encuesta de consumo), Agencia de
Servicios de Inmigración vía e-Stat, Prefectura de Osaka (requisitos y tasa
del registro de 旅行サービス手配業), JFG, JR Central y JPS 京都観光貸切タクシー.

Los supuestos propios van marcados como tales en todo el documento.
