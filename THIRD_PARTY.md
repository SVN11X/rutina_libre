# Autoría y licencias · versión 3.0.0

`LICENSE` cubre el código y los esquemas propios. Los recursos de terceros conservan su licencia individual; las modificaciones y traducciones no borran autores ni registros originales.

## wger

Fuentes: https://wger.de y https://github.com/wger-project/wger.

`data/source-wger.json` conserva autoría y licencia de textos, traducciones, imágenes y videos. `data/exercises.json` las conserva al unir fuentes. `mediaUrl`/`url` identifican el medio y `licenseUrl` identifica la licencia: ya no se sobreescriben entre sí.

Los **78 MP4 de wger**, sus GIF y miniaturas se derivan de grabaciones de **Goulart**, bajo **CC BY-SA 4.0**. El manifiesto `data/media.json` identifica por archivo el original, la ficha de origen, hashes, formato, fotogramas muestreados, autor y cambios. Las conversiones y fragmentos mantienen esa licencia. Se conserva también el crédito del video original aunque se vincule a otra ficha de la misma variante.

Cambios: conversión a H.264/yuv420p, 24 fps, reducción de tamaño, faststart y eliminación de audio; GIF de un fragmento real y miniatura JPEG. No se generaron movimientos con IA ni se interpolaron fotos como demostración. `data/media-review.json` explica reasignaciones a Smith y exclusiones de grabaciones que muestran otra variante. Los tres archivos excluidos se mantienen con su procedencia y licencia, sin contarlos como demostraciones de barra libre.

Textos e imágenes comunitarios conservan CC BY-SA 3.0/4.0 o CC0 cuando así lo informa su registro. Los textos completos de esas herramientas legales están en `licenses/`. Las traducciones manuales conservan referencia al texto traducido y su licencia.

## DVIDS · tres demostraciones

Cada registro consultado declara su recurso como dominio público. Referencia de condiciones y aviso requerido: https://www.dvidshub.net/about/copyright.

| Archivo y ejercicio | Registro original | Créditos conservados |
|---|---|---|
| `demo-bodyweight-squat.*` · sentadilla corporal | https://www.dvidshub.net/video/517502/body-weight-squat | Cpl. Amber Jennings / U.S. Marine Corps; registro: MAJ Joshua Pena |
| `demo-pushups.*` · flexiones | https://www.dvidshub.net/video/638236/pushups | CPT Matthew Holfinger / U.S. Marine Corps; demostración: Gunnery Sgt. Gates |
| `demo-forearm-plank.*` · plancha de antebrazos | https://www.dvidshub.net/video/871026/plank-instructional-video | Cpl. Caden Phillips / U.S. Marine Corps; explicación: Gunnery Sgt. Travis Titopace |

El manifiesto `data/extra-media.json` conserva URLs originales, hashes, recortes, créditos y aviso. Se incluyen 32 segundos de sentadilla, 18 de flexiones y 30 de plancha desde el segundo 24. El video y su contexto militar no prescriben los tiempos de la app. Las marcas institucionales no se presentan como respaldo a esta aplicación.

Aviso conservado en las fichas: “The appearance of U.S. Department of War (DoW) visual information does not imply or constitute DoW endorsement.”

## Wikimedia Commons · caminata

`demo-walking.*`: fragmento de **Fit walking**, autor **Msrmesa**, **CC BY-SA 3.0**. Fuente: https://commons.wikimedia.org/wiki/File:Fit_walking.webmhd.webm. Se conserva el enlace de licencia y la atribución en `extra-media.json` y en la ficha.

Cambios: selección del tramo de caminata en terreno plano entre los segundos 32 y 48, H.264/yuv420p/faststart sin audio, GIF y miniatura. Se excluyeron escaleras y tramo de tierra del original. El ritmo mostrado no certifica una intensidad individual ni la duración prescrita.

## Free Exercise DB

Fuente: https://github.com/yuhonas/free-exercise-db. Licencia declarada: Unlicense, en https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md. Se conserva el texto de esa declaración en `licenses/FREE-EXERCISE-DB-Unlicense.txt`.

La base e instrucciones mantienen el registro original por ficha. Sus fotografías permanecen enlazadas a la fuente; no se redistribuyen en la entrega. La licencia del repositorio no equivale a revisión clínica individual.

## Guías y reproductores externos

NHS, NHS South Tees, World Athletics, Mayo Clinic, ACE, Outperform y The Running Channel se enlazan como guías, demostraciones o contexto, según la ficha. No se copian videos que no informan permiso de redistribución. Las incrustaciones se cargan únicamente a petición del visitante.

Las cinco fichas con demostraciones de proveedor externo incluyen aviso de reproducción no comprobada. No se afirma que un enlace, un iframe cargado o una búsqueda de YouTube valide imágenes, técnica o dosis. Las 28 fichas editoriales y sus esquemas son contenido propio educativo; las dosis son orientaciones de la aplicación.

## jsPDF y herramientas de mantenimiento

`assets/vendor/jspdf.umd.min.js`: jsPDF **2.5.1**, MIT. Conserva su cabecera y licencias incorporadas. Proyecto: https://github.com/parallax/jsPDF. La exportación usa esta copia local; quedan respaldos de CDN para fallos de carga, sin requisitos de cuenta.

Playwright y axe-core se instalan solo para pruebas mediante npm y no se sirven como dependencias del visitante. Python y ffmpeg/ffprobe se usan en mantenimiento. Sus ejecutables no se redistribuyen. La carpeta `tests/fixtures` contiene un archivo sintético de audio usado exclusivamente para reproducir el fallo sin fotogramas; no es una demostración de ejercicio.

Los resultados de inspección de variantes, fotogramas y accesibilidad no certifican técnica, salud ni accesibilidad completa.
