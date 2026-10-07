# Rutina Libre 3.0.0

Catálogo estático para GitHub Pages. Búsqueda, identificación por texto/dibujo, guardados, rutinas y PDF se ejecutan en el navegador. El visitante no instala herramientas, no crea cuentas ni entrega tarjetas o claves. Las herramientas de conversión y pruebas son exclusivamente de mantenimiento.

## Entrega y alcance

Se conservan los **1.748 IDs** de la web revisada, sus fuentes y atribuciones. El repositorio de partida tenía 1.747: se recuperó del sitio la ficha `wger-2677` (Single leg press). No se eliminan guardados ni rutinas locales.

- **50 fichas con MP4 incluidos**, frente a seis. **49 fichas con GIF derivados reales**, frente a seis. Se distribuyen 82 MP4 H.264/yuv420p/faststart: 79 asociados a fichas y tres conservados con licencia pero excluidos por mostrar otra variante.
- Los 78 originales de wger se convirtieron, incluidas las variantes del respaldo. Dominadas/Pullups entrega imagen real; duración, HTTP 200 y avance del reloj ya no bastan para dar una reproducción por válida.
- Sentadilla corporal, flexiones, plancha de antebrazos y caminata tienen demostraciones locales de fuentes identificadas. Caminadora, sprint, aceleraciones y progresiones conservan enlaces concretos de proveedores; **su reproducción externa no quedó validada**.
- Video, GIF, Fotos y Esquema son tipos distintos. Los GIF parten de un poster y se activan manualmente. Las fotografías se seleccionan sin simular una película. Los esquemas de las 28 fichas editoriales quedan como apoyo secundario.
- Requisitos completos de equipo; búsqueda corta con restricciones y negaciones; ranking local por equipo, postura y movimiento; conteos coherentes; dosis y duración compartidas por ficha, rutina, alternativas y PDF.
- Guardados con actualización inmediata y Deshacer; salto al contenido sin modificar el hash; foco y controles accesibles; actualización de caché que conserva almacenamiento local.

**El catálogo no está completamente revisado ni traducido.** Hay 683 fichas con pasos en español; quedan 1.065 sin esos pasos, 1.055 sin nombre español, 844 sin nivel, 151 sin músculo principal, 133 sin equipo confirmado y diez sin instrucciones. No se rellenaron esos campos inventando valores. Las rutinas automáticas excluyen nivel desconocido y equipo sin confirmar. Consulta [INFORME_FINAL.md](INFORME_FINAL.md), [el inventario](docs/catalog-audit.json) y [la lista de pendientes](docs/catalog-pending.csv).

## Publicación

1. Extrae `rutina-libre-v3.0.0.zip`. Copia **el contenido** de su carpeta `rutina_libre` a la raíz del repositorio; evita un nivel de carpeta adicional.
2. Reemplaza código, `data`, `assets`, `sw.js`, documentación y flujos `.github`. Conserva `.nojekyll`. No subas `.git`, `node_modules` ni los originales temporales de mantenimiento.
3. En **Settings → Pages → Source**, selecciona **GitHub Actions**. El flujo `publicar.yml` reconstruye únicamente las fuentes incluidas, comprueba medios, ejecuta pruebas y publica. No actualiza el catálogo remoto ni programa conversiones semanales sin revisión.
4. Alternativamente, **Deploy from a branch → main → /(root)** publica los archivos ya preparados. En ese modo las comprobaciones del flujo no bloquean una publicación incorrecta.
5. La URL prevista sigue siendo `https://svn11x.github.io/rutina_libre/`. La aplicación utiliza rutas de hash y archivos relativos. Esta entrega no se ha subido al repositorio ni probado después de su publicación.
6. Tras publicar, espera el aviso de actualización y recarga. Si una pestaña antigua sigue mostrando la versión anterior, ciérrala y vuelve a abrirla. **No borres los datos del sitio** para actualizar: perderías los guardados y la rutina.

El despliegue de Actions necesita acceso a npm, los paquetes gratuitos de Ubuntu y los binarios de Playwright. Se incluyen todas las demostraciones locales; el visitante nunca descarga ni ejecuta ffmpeg. GitHub Pages, Actions y las fuentes tienen políticas, disponibilidad y límites propios; no se promete una cuota ilimitada del proveedor.

## Prueba y mantenimiento

Requiere Node.js 22+, Python 3 y ffmpeg/ffprobe en el equipo de mantenimiento. Playwright y axe-core son dependencias de desarrollo, no de los visitantes.

```bash
npm ci
npx playwright install --with-deps chromium
npm run build:offline
npm run audit:data
npm test
npm run check:media
npm run stamp:release
npm run test:browser
npm run serve
```

Abre `http://localhost:4173/`. El servidor local admite rangos de video. No abras `index.html` con doble clic: la carga de JSON necesita HTTP. En Windows se puede ejecutar la reconstrucción incluida con `OFFLINE=1` adaptado a la sintaxis de variables del terminal, o usar GitHub Actions.

`npm test` contiene 25 pruebas, incluidas regresiones de URL/licencia, equipo completo, búsqueda, facetas, dosis, duración y rangos HTTP. `test:browser` comprueba fotogramas y cambios de píxeles en cada MP4, navegación, errores, accesibilidad, actualización, uso sin conexión y descarga PDF. Los resultados se escriben en `docs/browser-validation.json`; la decodificación completa en `docs/media-decode.json`.

`npm run build:offline` reconstruye el catálogo sin consultar APIs remotas. Incluye el respaldo wger corregido, el catálogo anterior, `editorial.json`, `corrections.json` y los manifiestos multimedia. Conserva registros antiguos que no aparecen en una actualización. `npm run build:data` sí consulta las fuentes y **exige revisión antes de publicar**. También se aceptan `FEDB_INPUT_FILE`, `WGER_INPUT_FILE`, `FEDB_URL`, `WGER_BASE` y `USE_WGER=0` para mantenimiento controlado.

```bash
python scripts/prepare-media.py --all-variants --workers 3
python scripts/prepare-extra-media.py
npm run build:offline
npm run audit:data
npm test
npm run check:media
npm run stamp:release
npm run test:browser
```

La conversión comprueba licencia redistribuible, guarda hashes del original y derivado, verifica fotogramas distintos y registra modificaciones. Produce MP4 sin audio, GIF de seis segundos y miniatura. No modifica ni traduce técnica por IA. `data/media-review.json` conserva decisiones humanas sobre variantes: los videos de Smith no se presentan como barra libre. `mantenimiento-medios.yml` entrega un artefacto para revisión, sin commit ni despliegue automático. Una inspección de fotogramas no certifica adecuación clínica.

## Equipo, dosis y duración

`equipment` conserva compatibilidad con la estructura antigua. `requiredEquipment` contiene todos los implementos obligatorios; `equipmentAlternatives` permite montajes completos alternativos. Una opción se habilita solamente cuando están disponibles **todos** sus elementos. Mancuernas no implican disponer de banca, rack o barra fija. El equipo desconocido se muestra como no confirmado.

Las dosis se etiquetan como orientaciones de la app, diferenciadas de los textos de las fuentes. Escaladores usa segundos, Superman usa repeticiones bilaterales y movilidad distingue movimientos dinámicos de estiramientos sostenidos. El trote suave conserva 5–10 minutos también en rutina, reemplazos y PDF. Los principiantes no reciben sprints máximos.

La duración elegida es un **máximo disponible**. Cada día muestra un rango efectivo estimado que suma trabajo, descansos entre series, preparación, recuperación y transiciones. No se incrementa el esfuerzo para llenar 60 minutos. Las repeticiones y distancias usan estimaciones orientativas de tiempo, no mediciones de tu ejecución. Las ediciones de texto libre se marcan como duración pendiente en lugar de presentar un total falso.

## Identificación local

Describe equipo, postura y movimiento: “Estoy sentado y tiro de un mango hacia el abdomen usando una polea”. Se combinan BM25, sinónimos, coincidencias aproximadas y evidencia específica. “Sentadilla sin equipo” funciona como consulta corta. Las negaciones y restricciones excluyen candidatos incompatibles.

El dibujo compara trazos normalizados con ejemplos esquemáticos variados de 15 familias. Puede no encontrar coincidencias. No se ha medido precisión en una población representativa; no es un modelo de visión para fotografías, no cuenta repeticiones, no evalúa técnica y no garantiza una variante. Confirma los candidatos con sus instrucciones y equipo.

Texto y trazos permanecen en el navegador. Las imágenes externas, el traductor externo y los videos que abras generan solicitudes a sus proveedores. La traducción integrada del navegador depende de su disponibilidad y no se verificó en esta entrega. Los pasos ingleses originales permanecen disponibles.

## Caché y uso sin conexión

El service worker clásico permite actualizar instalaciones v2. `stamp:release` genera una versión con hash de código, datos y lógica del worker; no edites el sitio sin ejecutar ese paso. La interfaz y el catálogo se instalan juntos. Una actualización elimina solo cachés antiguas con prefijo `rutina-libre-`; no toca las claves `rl:*` de `localStorage`.

Después de completar la primera instalación en HTTPS o localhost, el catálogo, detector, esquemas, guardados, rutinas y PDF pueden funcionar sin red. El PDF con texto usa jsPDF incluido. Las fotos externas pueden faltar, y los reproductores externos necesitan conexión. Una instalación incompleta no habilita funcionamiento sin red.

Los videos usan peticiones de rango. **Guardar video sin conexión** solicita el archivo completo y confirma que está en caché; desde esa copia se responden rangos 206. No se guardan como completos los fragmentos 206 recibidos de red. El caché multimedia se limita a 180 entradas y aproximadamente 160 MiB según tamaños declarados; puede expulsar archivos antiguos. El navegador también puede liberar espacio. La actualización de versión elimina el caché multimedia anterior, conservando guardados y rutinas; vuelve a guardar los videos que necesites. No se descarga el catálogo entero de videos automáticamente.

## Fuentes y licencias

Fuentes por ficha: registro original, guía específica, demostración o contexto. Una búsqueda de YouTube o una página general no valida técnica ni dosis. Los videos incluidos proceden de wger, DVIDS y Wikimedia Commons. Los enlaces de NHS South Tees, Outperform y The Running Channel conservan su proveedor y sus condiciones. Más información en [THIRD_PARTY.md](THIRD_PARTY.md) y `data/media.json`, `data/extra-media.json`, `data/source-wger.json` y `licenses/`.

Código y esquemas propios: MIT. Recursos externos: su licencia individual. No se cambia su licencia a MIT. No hay analítica, API de pago, claves privadas ni requisitos de instalación para visitantes.
