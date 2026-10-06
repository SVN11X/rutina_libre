# Rutina Libre · edición mejorada

Catálogo estático para GitHub Pages con ejercicios de fuerza, cardio, caminata, caminadora, velocidad, agilidad, equilibrio y movilidad. El visitante usa la página directamente: no instala programas, no crea una cuenta y no necesita claves de API.

## Cambios incluidos

- **1.747 fichas**, con enlaces a su registro original. **680** incluyen pasos en español. El catálogo original se conserva.
- **46 fichas con enlaces de video**; **seis** tienen MP4 H.264, GIF y miniatura dentro del repositorio. Estos seis recursos se revisaron visualmente para comprobar que muestran el ejercicio asociado. Los demás videos conservan el enlace de su proveedor. El formato HEVC se ofrece como enlace externo para evitar reproductores que fallen.
- **28 fichas nuevas en español**: caminata cómoda y rápida, pendientes, caminadora con distintas modalidades, trote, alternancia caminar/correr, sprint, aceleraciones, progresiones, skipping, ankling, desplazamientos laterales, equilibrio, bicicleta estática, elíptica, remo, movilidad, calentamiento y vuelta a la calma.
- **15 fichas habituales mejoradas** con explicaciones en español: sentadilla, flexiones, plancha, puente de glúteos, zancadas, curls, press, dominadas, peso muerto, remo, cuerda y otras.
- **Detector por descripción y dibujo**, procesado en el navegador. No llama a un servicio de IA ni consume una cuota.
- Interfaz adaptable a móvil, filtros rápidos por actividad, filtro específico de caminadora, recuperación de la búsqueda, guardados, avisos útiles ante errores y fuentes visibles.
- Rutinas nuevas de **resistencia aeróbica** y **velocidad**, además de los objetivos anteriores. Se distingue tiempo, distancia, repeticiones y recuperación. Una caminata no se transforma en HIIT al elegir un objetivo de grasa.
- PDF con jsPDF incluido; el generador no necesita un CDN para funcionar.

## Publicar los archivos

1. Extrae el ZIP y abre la carpeta `rutina_libre`.
2. Sube **su contenido**, reemplazando los archivos existentes en la rama `main` de `SVN11X/rutina_libre`. Evita subir la carpeta como un nivel adicional.
3. Conserva `.github/workflows/publicar.yml`, `.nojekyll` y las carpetas `assets`, `css`, `data`, `js`, `scripts` y `tests`.
4. Con **Settings → Pages → Source → GitHub Actions**, el flujo de publicación ejecuta las comprobaciones y publica el sitio. Si usas **Deploy from a branch**, los datos y medios ya incluidos permiten publicar directamente desde `main` y la raíz.
5. La dirección habitual del repositorio es `https://svn11x.github.io/rutina_libre/`.

No necesitas configurar Hugging Face, RapidAPI, claves, facturación, un backend ni una base de datos. La entrega contiene el proyecto para subir; no modifica automáticamente tu repositorio remoto.

## Identificar ejercicios

Abre **Identificar** y describe la postura, el movimiento y el equipo. Por ejemplo: “estoy boca arriba, con las rodillas dobladas, y levanto la cadera”. La búsqueda pondera nombres, sinónimos, descripciones e instrucciones mediante BM25 y pistas del movimiento. Presenta fichas reales del catálogo, no inventa una explicación para una coincidencia desconocida.

También puedes dibujar una figura de palitos con ratón o pantalla táctil. El clasificador compara nubes de puntos normalizadas mediante vecinos más cercanos con **15 familias de posturas**. Tolera diferencias de tamaño, posición y reflejo horizontal. Es un modelo sencillo basado en prototipos esquemáticos locales, no un modelo de visión entrenado con millones de fotografías.

**Límites del detector:** la postura estática puede corresponder a varios ejercicios. No distingue todas las variantes, no mide velocidad, no cuenta repeticiones y no evalúa técnica ni condiciones de salud. Combina descripción y dibujo para reducir la ambigüedad y confirma la coincidencia leyendo las fichas. El dibujo funciona mejor con cabeza, tronco y extremidades en varios trazos; no es un reconocedor general de fotografías.

## Fuentes y calidad del contenido

| Fuente | Uso |
|---|---|
| [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) | Base original, instrucciones, clasificación y fotos enlazadas. Unlicense declarada por el proyecto. |
| [wger](https://wger.de) y [documentación de API](https://wger.readthedocs.io/en/latest/api/api.html) | Textos comunitarios en español, imágenes y videos. Se conserva la licencia y autoría de cada recurso, también cuando se une con una ficha de otra fuente. |
| [NHS: caminar](https://www.nhs.uk/live-well/exercise/walking-for-health/) y [Couch to 5K](https://www.nhs.uk/better-health/get-active/get-running-with-couch-to-5k/couch-to-5k-running-plan/) | Referencias para actividad aeróbica y progresión de carrera. |
| [NHS: equilibrio](https://www.nhs.uk/live-well/exercise/balance-exercises/) y [flexibilidad](https://www.nhs.uk/live-well/exercise/flexibility-exercises/) | Referencias de postura, control y movilidad. |
| [NHS South Tees](https://www.southtees.nhs.uk/resources/combined-cardiovascular/) | Contexto de caminadora, bicicleta y remo. |
| [World Athletics](https://worldathletics.org/personal-best/performance/jereem-richards-games-drills-develop-speed) | Técnica de carrera, coordinación y velocidad. |
| [Mayo Clinic](https://www.mayoclinic.org/health/strength-training/MY00033) y [ACE](https://www.acefitness.org/resources/everyone/exercise-library/) | Guías y demostraciones de fuerza enlazadas. |

Los recursos comunitarios no tienen una validación clínica individual. Las fichas nuevas son síntesis educativas originales en español. Se distingue entre **registro original** y **guía de técnica o contexto**: una referencia general no implica que su autor haya prescrito exactamente la dosis mostrada.

Las dosis son ejemplos orientativos de la app y requieren adaptación. Las fichas de sprint indican calentamiento, espacio para frenar y recuperación amplia; el generador no prescribe sprints máximos a principiantes. Los esquemas son referencias de postura, no demostraciones biomecánicas. Las fotos alternadas se etiquetan como referencias; no se presentan como un video del movimiento completo.

Los MP4/GIF y sus miniaturas derivados de wger mantienen **CC BY-SA 4.0**, autor **Goulart**, enlace de origen y descripción de los cambios. El registro completo está en `data/media.json` y la atribución también se muestra en la ficha. Los seis GIF usan fragmentos seleccionados para mostrar el ejercicio y evitar los segundos iniciales de preparación de la cámara.

La antigua integración con `oss.exercisedb.dev` se retiró: devolvía HTTP 403 en esta revisión y no alimentaba el catálogo. El sitio no depende de esa API para obtener animaciones.

## Gratuidad y privacidad

La búsqueda, el detector, los guardados, las rutinas y el PDF no tienen cuotas de uso de la app. Se ejecutan en el navegador. GitHub Pages y los proveedores externos mantienen sus propias políticas, disponibilidad y límites; no se promete disponibilidad ilimitada de un tercero.

El texto y los trazos del detector no se envían a servidores. La rutina, preferencias y guardados se almacenan localmente. Las imágenes externas y los enlaces que abras generan peticiones normales a sus proveedores. No se usa analítica ni se requieren cuentas.

## Actualización de datos

El proyecto ya incluye los datos enriquecidos y los medios. La actualización es opcional para el visitante. Para mantener el catálogo, usa Node.js 22 o superior:

```bash
node scripts/build-data.mjs
node --test tests/app.test.mjs
```

El script combina Free Exercise DB, wger y `data/editorial.json`. Solo une coincidencias exactas o equivalencias explícitas para evitar asociar videos de variantes diferentes. Ante un fallo remoto, conserva la base y el respaldo `data/source-wger.json`, los MP4/GIF incluidos, la autoría y los enlaces. Desactivar la actualización de wger no elimina su respaldo:

```bash
USE_WGER=0 node scripts/build-data.mjs
```

`FEDB_URL`, `WGER_BASE`, `FEDB_INPUT_FILE` y `WGER_INPUT_FILE` son opciones de mantenimiento y prueba. Las dos últimas aceptan archivos fuente locales. Las opciones antiguas de ExerciseDB ya no se utilizan.

Los esquemas originales se regeneran con `node scripts/build-illustrations.mjs`. `scripts/prepare-media.py` permite al mantenedor convertir más videos de wger a MP4 y GIF; necesita Python y ffmpeg en ese equipo. **Los visitantes no necesitan ninguno de esos programas.** Revisa visualmente cada recurso generado y su licencia antes de publicarlo.

## Comprobaciones realizadas

- Nueve pruebas automáticas de contenido, búsqueda, tolerancia a errores, equipo, reconocimiento de una postura diferente a los prototipos, entradas desconocidas, dosis, rutinas y conservación de autoría.
- Veinte comprobaciones en Chromium: catálogo, filtros, fuentes, guardados, reproducción de MP4, GIF, descripción, dibujo, PDF y uso sin red.
- Interfaz móvil a 390 px sin desbordamiento horizontal; filtros utilizables con teclado.
- Cero incidencias detectadas por axe en las cuatro vistas de escritorio revisadas (WCAG A/AA): catálogo, detector, caminadora y fuentes. Esto es una comprobación automática, no una certificación de accesibilidad.

El informe de entrega resume las condiciones de prueba y las limitaciones. Algunos medios remotos pueden fallar; la ficha ofrece enlaces y alternativas, y no oculta el problema.

## Prueba local y uso sin conexión

Para revisar el sitio en un equipo de desarrollo:

```bash
python3 -m http.server 8000
```

Abre `http://localhost:8000`. No abras `index.html` con doble clic: la carga de JSON requiere un servidor HTTP. El visitante de GitHub Pages accede directamente sin instalar nada.

En HTTPS, el service worker conserva la interfaz, catálogo, detector y esquemas tras la primera visita. Las fotos y GIF consultados pueden quedar guardados. Los videos no siempre se conservan completos, especialmente cuando el navegador solicita fragmentos; pueden necesitar conexión. Cambia `VERSION` en `sw.js` cuando publiques una nueva edición.

## Licencias

El código y los esquemas originales conservan MIT. Los datos y recursos externos mantienen las licencias de sus fuentes. Las licencias de los medios incluidos y jsPDF se detallan en `THIRD_PARTY.md` y en sus registros de atribución.
