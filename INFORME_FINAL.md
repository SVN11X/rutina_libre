# Informe de entrega · Rutina Libre 3.0.0

Fecha de revisión: 7 de octubre de 2026. Base del repositorio: `4f20a04c2a042262bc7c204ab8b44248d6537990`. Se revisaron el código de `main` y la web publicada. La entrega contiene el sitio completo, datos, derivados multimedia, atribuciones, licencias, scripts y pruebas. No se ha publicado en GitHub; las pruebas finales corresponden a un servidor local con prefijo `/rutina_libre/`.

## Resultado y límites

Se corrigieron los fallos funcionales de reproducción sin imagen, URLs de licencia sobreescribiendo medios, equipo incompleto, dosis de escaladores/Superman, duración, movilidad, consulta corta, ranking incompatible, facetas, guardados, salto al contenido y caché. Se mantienen todos los IDs publicados y las claves locales `rl:*`.

**La revisión de contenido permanece parcial.** No se declara traducido o clínicamente revisado todo el catálogo. No se inventaron niveles ni músculos ausentes. Las demostraciones locales se comprobaron con dimensiones, fotogramas, cambios de imagen y decodificación completa. Los enlaces externos de caminadora/sprint/aceleraciones tienen proveedor y registro identificados, pero su reproducción no quedó validada. También faltan demostraciones reales en otras fichas destacadas.

## Cobertura antes y después

La columna inicial corresponde a los datos descargados de la web. El repositorio de partida tenía 1.747 fichas, una menos que el sitio: se recuperó `wger-2677` desde el sitio y se corrigió su equipo. `docs/baseline.json` conserva las cifras del repositorio y `docs/baseline-live.json` las de la web; las siguientes incluyen ese registro publicado.

| Métrica | Web inicial | Entrega |
|---|---:|---:|
| Fichas conservadas | 1.748 | 1.748 |
| Pasos disponibles en español | 680 | 683 |
| Fichas con URLs de archivo de video | 46 | 52 |
| Fichas con MP4 local compatible | 6 | 50 |
| Fichas con GIF derivado de video | 6 | 49 |
| Sin recurso visual registrado | 622 | 622 |
| Sin nivel informado | 844 | 844 |
| Sin músculo principal informado | 151 | 151 |
| Sin instrucciones originales o españolas | 10 | 10 |

“Con URLs de archivo” incluye originales retirados del reproductor por mostrar otra variante; no equivale a 52 demostraciones compatibles. Los cinco registros con enlaces a reproductores externos se contabilizan aparte. Los 35 registros inicialmente exclusivamente HEVC recibieron derivados; los videos de otra variante no se asignaron forzosamente a su ficha original.

Se distribuyen **82 MP4**, 50 GIF y sus miniaturas. **79 MP4** están asociados a las 50 fichas; tres MP4 de sentadilla frontal en Smith quedan en los archivos/manifiesto con licencia pero excluidos de la ficha de barra libre. Por esa exclusión hay **49 fichas** con GIF, no 50. Los recursos nuevos reemplazan o complementan fotos/esquemas existentes; por eso no cambia la cifra de fichas sin ningún recurso.

Pendientes adicionales obtenidos del inventario: 1.065 fichas sin pasos españoles, 1.055 sin nombre español y 133 sin equipo confirmado. Se detectan nueve grupos con nombre normalizado coincidente, como posibles equivalencias: no se eliminaron IDs ni se fusionaron variantes sin evidencia. `docs/catalog-audit.json` y `docs/catalog-pending.csv` permiten revisar cada registro y sus fuentes.

## Hallazgos y correcciones

| Hallazgo | Evidencia inicial y cambio |
|---|---|
| Dominadas llegaba al final sin imagen | Reproducido en la web publicada: duración/tiempo final 18,773333 s, `readyState=4`, dimensiones 0×0 y sin error general. El original de wger es MOV/HEVC Main 10. El derivado H.264 entrega 720×406 y fotogramas visibles; el informe del navegador registra fotogramas y cambios de píxeles. |
| URL multimedia sobreescrita por atribución | Confirmado en `normalizeWger`: se separan URL de medio y licencia, se repara `videoInfo` en catálogo y respaldo, y el filtro descarta HEVC conocido y variantes excluidas. Regresión con el formato antiguo v2. |
| Confusión de variantes | La inspección detectó press en Smith en videos registrados como barra libre. Se vinculan a las fichas Smith correspondientes. Tres sentadillas frontales Smith se excluyen de barra libre; el cuarto video sí corresponde a barra libre. |
| Equipo desconocido/peso corporal | Se conserva desconocido. Single leg press requiere máquina; dominadas supinas requieren barra fija. Mancuernas + banca y barra fija + rack se evalúan como conjuntos. Remo invertido admite Smith como montaje alternativo completo. |
| Mancuernas habilitaban banca o soporte inexistentes | Catálogo, generador, alternativas y selector comparten `canUseEquipment`. Las regresiones comprueban press de banca, inclinado, remo invertido y step-ups. |
| Categoría/unidad incoherentes | Escaladores pasa a cardio con intervalos en segundos. Superman pasa a fuerza con repeticiones bilaterales y pausa breve, sin segundos por lado. Movilidad dinámica y estiramiento sostenido se distinguen. |
| Encabezado de 60 min y 21–25 efectivos | La elección se presenta como máximo disponible. Se informa el rango efectivo con trabajo, descansos, recuperación y transiciones. No se añaden bloques exigentes para llenar el tiempo. |
| Trote 5–10 min sobreescrito a 30 | Ficha, creación, reemplazos y PDF usan la misma prescripción. La prueba de PDF sin red conserva 5–10 min y total estimado 12–21 min con calentamiento y vuelta a la calma. |
| Movilidad excluía `mobility` | El objetivo admite `mobility` y `stretching`; incluye dinámicos y sostenidos. Los principiantes no reciben sprints máximos. |
| “sentadilla sin equipo” sin resultados | Se extraen sinónimos/restricciones incluso en consultas breves. El primer candidato es sentadilla corporal y los resultados respetan la ausencia de equipo. |
| Descripción de polea devolvía ergómetro/mancuerna | Equipo y postura tienen mayor peso y se aplican restricciones antes de ordenar. El primer candidato es remo sentado en polea baja; no aparecen ergómetro, mancuerna, curl o aperturas entre los candidatos pertinentes comprobados. |
| Resultados descriptivos y facetas incompatibles | Se comparte el conjunto de puntuaciones y criterios de búsqueda. Conteos por tipo/nivel coinciden con resultados; las facetas de equipo evalúan requisitos completos. |
| Guardados desactualizados | Eliminar actualiza lista, contador y estado vacío; Deshacer restaura ID, tarjeta y contador. Se prueba en navegador y se preservan claves antiguas. |
| Salto rompía router | Se cancela la navegación a `#main`; el salto desplaza y enfoca `main` sin modificar el hash de la ruta. Probado con teclado. |
| Caché antigua | Worker clásico compatible con registro v2, versión por hash, instalación conjunta de datos/código y eliminación de cachés anteriores del proyecto. Se conservan guardados/rutinas y se comprueban rangos 206 desde copia completa. |

Las observaciones de código se distinguen de las reproducciones en navegador. No se afirma haber repetido en la web inicial cada combinación de filtros/rutinas del informe del 6 de octubre; sus defectos se confirmaron en la implementación y se añadieron regresiones concretas. No se accedió al almacenamiento personal del usuario.

## Reproducción y demostraciones

Los 78 originales de wger del respaldo se convirtieron con herramientas gratuitas: ffmpeg/ffprobe, H.264, yuv420p, faststart, 24 fps y resolución ajustada; MP4 sin audio. Se conservan hash del original/derivado, autor Goulart, CC BY-SA 4.0, URL de origen y cambios. El visitante no convierte nada. La eliminación de audio evita lenguaje/sonido ajeno a instrucciones, pero el éxito sigue exigiendo fotogramas.

Se añaden cuatro demostraciones de la misma variante:

| Ficha | Procedencia | Validación y licencia |
|---|---|---|
| Sentadilla corporal | DVIDS, “Body Weight Squat”, registro 517502 | Fotogramas originales inspeccionados; MP4, GIF y miniatura locales. Dominio público declarado por recurso; créditos y aviso institucional conservados. |
| Flexiones | DVIDS, “Pushups”, registro 638236 | Misma variante, grabación real; derivado local comprobado. Dominio público por recurso. |
| Plancha de antebrazos | DVIDS, “Plank Instructional Video”, registro 871026 | Fragmento desde 24 s; plancha en antebrazos. El tiempo de la prueba militar no se copia como dosis de la app. Dominio público por recurso. |
| Caminata cómoda | Wikimedia Commons, “Fit walking”, Msrmesa | Tramo 32–48 s en terreno plano, sin escaleras. CC BY-SA 3.0. No se afirma velocidad individual de caminata rápida. |

Las URLs y créditos completos figuran en `THIRD_PARTY.md`, `data/extra-sources.json` y `data/extra-media.json`. No se redistribuyen grabaciones de proveedores sin permiso conocido. Los siguientes **no cuentan como reproducción validada**:

- Caminadora caminar/inclinada: guía oficial NHS South Tees y su demostración enlazada. La fuente reúne caminar, inclinación y trote; la ficha advierte comparar la modalidad y no importar toda la sesión como dosis.
- Aceleraciones: video oficial de Outperform sobre salidas de pie. La fuente existe; no se logró validar su reproducción externa en este entorno.
- Sprint: video de Outperform sobre apoyo del pie, que también incluye ejercicios auxiliares; se advierte ese alcance. No valida una sesión completa de sprint de la app.
- Progresiones: The Running Channel, sesión con demostración de strides; la distancia de la app se distingue de la de la fuente. Reproducción externa pendiente.

La plancha es isométrica: detectar movimiento general en la grabación no significa que mantener el cuerpo quieto sea un error. El detector de imagen estática del reproductor evita advertir inmovilidad de plancha/equilibrio; los ensayos de archivos comprueban que el video completo contiene imagen y cambios de fotograma.

Carga, bloqueo de red, error de formato, audio sin imagen y tiempo de espera generan mensajes y reintento. Las alternativas se limitan a la misma ficha; los GIF incluidos son fragmentos reales. Un iframe cargado no demuestra reproducción: los proveedores conservan aviso de verificación pendiente. No se usa IA para inventar técnica ni una demostración visual.

## Pruebas y evidencias

Las **nueve pruebas originales pasaban antes de corregir los fallos**. La entrega tiene **25 pruebas automáticas** y 16/16 comprobaciones de navegador. El script de navegador se ejecuta con Chromium **138.0.7204.0 en Linux**, escritorio 1280×800 y emulación 390×844, incluyendo preferencia de movimiento reducido. Los recursos externos se bloquean en las pruebas locales: no se confunde esa prueba con validación del proveedor.

- `npm test`: 25/25; incluye 90 combinaciones de planes y requisitos de equipo/nivel conocido.
- `python scripts/check-media.py`: 82/82 archivos, hash correcto, H.264/yuv420p, dimensiones positivas, faststart y decodificación completa sin errores. Evidencia: `docs/media-decode.json`.
- `node tests/browser.mjs`: dimensiones, fotogramas presentados y cambios de píxeles durante aproximadamente tres segundos en **cada uno de los 82 MP4**, con hash del archivo medido. Evidencia: `docs/browser-validation.json`.
- Ensayos funcionales: carga inicial sin descargar videos, búsqueda/navegación, salto, guardados/Deshacer, Dominadas, GIF manual, fallo de red, archivo sintético real de audio sin video, espera de red, móvil/foco, activación de caché, rangos y reproducción sin red, PDF descargado y acciones sobre rutinas antiguas con IDs no disponibles.
- axe-core 4.11.0: cero infracciones automáticas detectadas en 12 análisis (cinco vistas de escritorio y ficha en móvil, con temas claro y oscuro; WCAG A/AA y 2.1 A/AA). Los casos incompletos de la herramienta requieren revisión manual. No es certificación de accesibilidad ni ensayo de lector de pantalla.
- `docs/qa/pullups.png`, `mobile.png`, hojas de contacto de medios y `routine-offline.pdf` documentan la inspección. Se extrajo texto y renderizó el PDF para revisar dosis, duración y disposición.

El archivo `docs/historical-browser-results-v2.json` procede de la entrega anterior y se conserva como histórico: **no es evidencia de estas pruebas**.

**No comprobados:** Firefox, Safari, dispositivos físicos iOS/Android, lectores de pantalla, estabilidad en condiciones prolongadas de red, reproducción de proveedores externos ni actualización real después de subir a GitHub Pages. El ensayo de activación elimina cachés v2 sembradas y conserva los valores locales; no simula todas las carreras posibles de pestañas antiguas durante un despliegue. La inspección de fotogramas verifica variante y movimiento visible, no toda la técnica de cada repetición. No se midió precisión estadística del identificador por dibujo.

## Pendientes concretos

1. Traducir y revisar nombres/pasos restantes contra sus textos originales; mantener atribución/licencia y revisión lingüística. El traductor opcional del navegador no sustituye esta tarea ni quedó probado.
2. Revisar los 844 niveles y 151 músculos no informados con evidencia específica; el generador los trata como nivel desconocido cuando corresponde, sin suponer principiante. Revisar los 133 equipos no confirmados y las inferencias conservadoras de soporte.
3. Completar las diez fichas sin instrucciones y añadir demostraciones reales donde faltan; 1.698 fichas no tienen MP4/GIF compatible. Las 622 sin recurso visual siguen identificadas.
4. Validar reproducción externa de las cinco fichas y ampliar cobertura de caminadora, sprint, aceleraciones y otras destacadas; no considerar títulos/enlaces como prueba de imágenes.
5. Revisar los nueve grupos de posibles equivalencias sin eliminar IDs históricos; la equivalencia de nombre no prueba que equipo, agarre, variante y atribución coincidan.
6. Probar Safari/Firefox, móvil físico, lector de pantalla y sitio ya publicado. El ZIP está preparado para revisión y sustitución, sin afirmar haber completado esos ensayos.

## Publicación, caché y continuidad

Las instrucciones reproducibles están en README. El flujo de publicación consume fuentes incluidas y bloquea el despliegue si fallan las pruebas; el de mantenimiento produce artefactos para revisión humana. Todo utiliza herramientas gratuitas, sujeto a políticas y disponibilidad de cada servicio.

No cambian los nombres de almacenamiento local. IDs antiguos no disponibles no se borran silenciosamente y los botones de la rutina operan sobre los índices almacenados. El service worker actualiza código/datos sin limpiar guardados ni rutinas. Su caché multimedia es limitado y puede ser liberado por el navegador; al actualizar se elimina el caché multimedia de la edición anterior. El usuario debe volver a guardar los videos que quiera usar sin red. La primera instalación y los medios no guardados necesitan conexión. El PDF de texto se verificó sin red; fotografías y reproductores externos pueden faltar.
