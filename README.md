# El corredor del Golfo

Estudio de viabilidad del mercado emisor del Golfo hacia Japón, preparado para
una consultora de viajes privados con sede en Dubái.

**En línea:** https://2troll.github.io/corredor-golfo/

> ⚠️ **La versión publicada está desfasada (a 19-9-2026).** Lo que hay en GitHub
> Pages es anterior al 14 de septiembre y publica una **serie mensual que no es
> de JNTO**: una curva suavizada donde marzo de 2024 figura con 2.930 llegadas
> en vez de 891. Aquí en local ya está corregida y contrastada. **No enviar ese
> enlace a nadie hasta publicar**, que es un `git push` y lo lanza el operador:
>
> ```sh
> python3 comprobar.py && git push origin main
> ```

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
