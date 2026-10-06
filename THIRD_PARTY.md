# Autoría y licencias

El archivo `LICENSE` cubre el código del proyecto y sus esquemas originales. Las licencias de los recursos externos se conservan por separado.

## wger

Proyecto: https://wger.de y https://github.com/wger-project/wger.

`data/source-wger.json` conserva la autoría y licencia del texto original, texto en español, imágenes y videos de cada ficha. `data/exercises.json` mantiene esta información después de unir fuentes. No se convierte automáticamente una licencia comunitaria en MIT.

Las seis demostraciones bajo `assets/media/wger-*.mp4`, `*.gif` y `*.jpg` proceden de videos de **Goulart** distribuidos por wger con **Creative Commons Attribution-ShareAlike 4.0 International**. Las conversiones y miniaturas mantienen la misma licencia:

https://creativecommons.org/licenses/by-sa/4.0/

El registro de cada video original, su hash, el autor, la licencia, el enlace a su ficha y los cambios realizados está en `data/media.json`. Los cambios incluyen codificación H.264 sin audio, reducción de resolución, GIF de un fragmento de seis segundos y una miniatura. Las fechas de revisión visual se refieren a comprobar que el recurso muestra el ejercicio asociado; no certifican la técnica ni su adecuación para una persona.

## Free Exercise DB

Fuente: https://github.com/yuhonas/free-exercise-db.

Licencia declarada por el proyecto: Unlicense. Referencia: https://github.com/yuhonas/free-exercise-db/blob/main/LICENSE.md.

Se conserva la base original y el enlace de cada registro. Sus fotografías siguen alojadas en la fuente; no se redistribuyen en esta entrega. La declaración de licencia del proyecto no equivale a una revisión clínica individual de sus instrucciones.

## Referencias técnicas y educativas

Las páginas del NHS, NHS South Tees, World Athletics, Mayo Clinic y ACE se enlazan como fuentes originales o de contexto. Sus videos y fotografías no se redistribuyen. Las fichas editoriales en español son síntesis originales del proyecto; sus dosis son ejemplos de la aplicación.

## jsPDF

`assets/vendor/jspdf.umd.min.js` contiene jsPDF 2.5.1 y conserva su cabecera y las licencias incluidas.

Proyecto: https://github.com/parallax/jsPDF. Licencia: MIT.

Se usa una copia local para que la exportación de PDF no necesite descargar una librería de un CDN. Se conserva el respaldo remoto de la versión original para un error excepcional de carga.
