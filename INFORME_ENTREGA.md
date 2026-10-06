# Revisión de Rutina Libre

Edición preparada el 6 de octubre de 2026 a partir de `SVN11X/rutina_libre`, revisión original `62a440b`.

## Problemas detectados y correcciones

| Problema | Resultado de la mejora |
|---|---|
| El JSON incluido solo tenía la fuente principal: 876 fichas, ninguna con español, GIF o videos. | 1.747 fichas, 680 con pasos en español, 46 con enlaces de video y seis con MP4/GIF/miniatura incluidos. |
| La integración de ExerciseDB devolvía HTTP 403. | Se retiró esa dependencia. Las animaciones incluidas se derivan de videos de wger con licencia identificada. |
| Algunos videos de wger usan HEVC. | Los seis medios incluidos se convirtieron a H.264. Los HEVC restantes se ofrecen como enlaces externos, evitando presentarlos como reproductores compatibles. |
| Los primeros segundos de algunos videos muestran la preparación de la cámara. | Se revisaron fotogramas de cada medio incluido y se eligieron fragmentos y miniaturas que muestran el ejercicio. |
| El buscador confundía caminar con zancadas, y velocidad con ejercicios de fuerza que contienen “speed”. | Se incorporaron intenciones por actividad, vocabulario en español, prioridad de fichas educativas y tolerancia a un error de escritura. |
| La unión por prefijo podía asociar recursos de variantes diferentes. | Se usan coincidencias exactas o equivalencias explícitas, conservando la autoría de cada recurso. |
| No se cubrían adecuadamente caminadora, velocidad ni técnica de carrera. | 28 fichas nuevas y categorías de velocidad, agilidad, equilibrio, movilidad, calentamiento y vuelta a la calma. |
| No había identificación por descripción o dibujo. | Búsqueda BM25 y pistas de movimiento; clasificador local por vecinos más cercanos de posturas esquemáticas. |
| Las dosis de cardio se transformaban en intervalos rápidos al seleccionar grasa. | Se conservan ejemplos de caminata sostenibles y se separan las necesidades de cardio, técnica, sprint y fuerza. |
| La exportación de PDF dependía de un CDN. | jsPDF incluido en el proyecto. |
| Los fallos de actualización podían eliminar el enriquecimiento. | Respaldo de wger, conservación de medios y deduplicación de recursos y atribuciones. |

## Pruebas

Se completaron nueve pruebas automáticas con Node.js: integridad del catálogo, archivos locales, búsqueda por actividad y equipo, escritura aproximada, descripciones naturales, dibujo con proporciones diferentes y reflejo horizontal, entradas desconocidas, dosis, rutinas y atribución.

Se completaron veinte comprobaciones en Chromium. Para verificar la independencia de servicios externos, se bloquearon los recursos remotos durante esas pruebas y se usaron los archivos incluidos. Se comprobó reproducción real del MP4, carga del GIF, exportación de PDF, persistencia de guardados, navegación, identificación por texto y dibujo y funcionamiento del detector sin red tras la instalación de la caché.

El catálogo y detector se revisaron a 1440 px y 390 px. No se observó desbordamiento horizontal en las vistas móviles revisadas y se probaron apertura y cierre de los filtros con teclado.

axe no encontró incidencias WCAG A/AA en las cuatro vistas de escritorio revisadas: catálogo, detector, ficha de caminadora y fuentes. El resultado corresponde a una herramienta automática y a esas condiciones; no es una certificación de accesibilidad universal.

Se verificó que el actualizador conserva el catálogo, los 46 enlaces de video y los seis GIF cuando la fuente principal falla y la actualización de wger se desactiva. Los enlaces de referencia de una ficha de wger, un registro de Free Exercise DB y la guía de fuerza del NHS respondieron HTTP 200. No se verificaron individualmente los 1.747 enlaces ni los 40 videos remotos restantes.

## Límites que se muestran en la aplicación

- El detector ofrece coincidencias posibles; una postura estática no basta para identificar todas las variantes. No evalúa técnica, velocidad, repeticiones ni condiciones de salud.
- Los datos comunitarios mantienen su fuente, pero no tienen validación clínica individual. Los nuevos textos son síntesis educativas; un enlace de contexto no implica que la fuente haya prescrito la dosis exacta de la app.
- Los seis MP4/GIF están dentro del proyecto. Las otras fotos y videos dependen de su proveedor y pueden cambiar o dejar de responder.
- La app no cobra ni fija cuotas de IA. GitHub Pages y los sitios externos tienen políticas y disponibilidad propias.
- El catálogo y el detector pueden funcionar sin conexión después de guardar el sitio. Los videos solicitados por fragmentos pueden necesitar red.

## Uso de la entrega

Extrae el ZIP y sube el contenido de `rutina_libre` a la raíz de la rama `main` de tu repositorio. Conserva las carpetas y el flujo `.github/workflows/publicar.yml`. El proyecto ya contiene los datos enriquecidos y los medios preparados. Consulta `README.md` para publicar, actualizar y probar.
