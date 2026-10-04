# Rutina Libre

Sitio web gratuito para buscar ejercicios, aprender a hacerlos con fotos paso a paso y armar una rutina semanal que se puede descargar en PDF. Funciona completo en GitHub Pages, sin servidor, sin base de datos y sin cuentas de usuario.

## Qué hace

**Catálogo de ejercicios.** Más de 870 ejercicios con buscador en español. Entiende palabras como sentadilla, press de banca, dominadas o pecho mancuernas aunque los nombres originales estén en inglés. Se puede filtrar por nivel, equipo, músculo y tipo de ejercicio, y cada opción muestra cuántos resultados da. Los filtros quedan en la dirección de la página, así que una búsqueda se puede compartir con un enlace.

**Ficha de cada ejercicio.** Las dos fotos del ejercicio se alternan para mostrar el movimiento completo. Cuando existe, también se muestra una animación GIF o un video. La ficha sugiere cuántas series, repeticiones y descanso hacer según el objetivo y el nivel de la persona. Las instrucciones en inglés se pueden traducir al español con el traductor que trae el propio navegador.

**Generador de rutina.** Hace seis preguntas (objetivo, experiencia, días, tiempo, equipo y zonas a priorizar) y arma la semana completa. Después se puede cambiar cualquier ejercicio por otro parecido, moverlo, quitarlo o agregar nuevos. Todo se guarda en el navegador.

**PDF.** La rutina se descarga con fotos, instrucciones breves y casillas para marcar el avance de cuatro semanas.

## De dónde salen los datos

Todo viene de fuentes abiertas y gratuitas que no piden clave.

| Fuente | Qué aporta | Licencia |
|---|---|---|
| [Free Exercise DB](https://github.com/yuhonas/free-exercise-db) | Base principal. 870 ejercicios con dos fotos cada uno | Dominio público |
| [wger](https://wger.de) | Nombres y descripciones en español, videos y ejercicios extra | Creative Commons, con autoría |
| [ExerciseDB V1](https://oss.exercisedb.dev) | Animaciones GIF | API gratuita, revisa sus términos |

El repositorio ya incluye `data/exercises.json` con la base principal, así que el sitio funciona desde el primer momento. Cada vez que se publica, y además todos los lunes, GitHub Actions ejecuta `scripts/build-data.mjs`, que descarga las tres fuentes, las une y agrega los textos en español, los videos y los GIF. Si wger o ExerciseDB no responden, el sitio se publica igual con los datos que ya tenía.

Las fotos y animaciones no se copian al repositorio. Se muestran directo desde los servidores de cada fuente, así el repositorio pesa poco.

## Publicar en GitHub Pages

1. Crea un repositorio nuevo en GitHub, por ejemplo `rutina-libre`.
2. Sube todos los archivos de esta carpeta a la rama `main`. Incluye la carpeta oculta `.github` y el archivo `.nojekyll`.
3. En el repositorio entra a **Settings**, luego a **Pages**.
4. En **Source** elige **GitHub Actions**.
5. Entra a la pestaña **Actions** y espera que termine el flujo **Publicar sitio**. La primera vez puedes lanzarlo a mano con **Run workflow**.
6. El sitio queda en `https://TU-USUARIO.github.io/rutina-libre/`.

Si prefieres no usar Actions, en el paso 4 elige **Deploy from a branch**, rama `main` y carpeta `/ (root)`. El sitio funciona igual, pero solo con la base principal. Para sumar wger y ExerciseDB tendrías que ejecutar el script en tu computador y subir el archivo resultante.

## Probar en tu computador

Necesitas Node.js 18 o superior, solo para el script de datos. La página en sí no necesita instalar nada.

```bash
# Actualizar los datos (opcional)
node scripts/build-data.mjs

# Levantar un servidor local
python3 -m http.server 8000
# o bien
npx serve .
```

Luego abre `http://localhost:8000`. Abrir el archivo `index.html` con doble clic no funciona, porque el navegador bloquea la carga de datos desde archivos locales.

El script acepta estas opciones:

```bash
USE_WGER=0 node scripts/build-data.mjs         # sin wger
USE_EXERCISEDB=0 node scripts/build-data.mjs   # sin ExerciseDB
```

## Estructura

```
index.html              página única
css/styles.css          estilos, modo oscuro e impresión
js/app.js               navegación entre vistas
js/catalog.js           buscador, filtros y tarjetas
js/detail.js            ficha del ejercicio
js/routine.js           formulario y editor de la rutina
js/generator.js         reglas para armar la rutina
js/reps.js              series, repeticiones y descanso sugeridos
js/pdf.js               exportación a PDF
js/data.js              carga de datos y búsqueda
js/i18n.js              textos en español y diccionario de búsqueda
js/translate.js         traducción en el navegador
js/store.js             guardado local
sw.js                   uso sin conexión
scripts/build-data.mjs  descarga y unión de las fuentes
data/exercises.json     datos generados
```

## Decisiones de experiencia de uso

La navegación pasa a una barra inferior en el celular para tenerla al alcance del pulgar. Los filtros se abren como un panel desde abajo y el botón muestra cuántos resultados vas a ver. Al volver de una ficha, el catálogo recupera la búsqueda y la posición donde estabas. Cada acción importante, como quitar un ejercicio o borrar la rutina, se puede deshacer desde el aviso que aparece abajo.

Todo se puede usar con teclado y lector de pantalla. Los controles tienen al menos 44 píxeles de alto para tocarlos con el dedo. El color de nivel sigue a los discos de pesas olímpicos (verde para principiante, azul para intermedio, rojo para avanzado) y siempre va acompañado del nombre, para no depender solo del color. Si la persona pidió menos animación en su sistema, las fotos no se alternan solas. El sitio respeta el modo oscuro del sistema.

Después de la primera visita funciona sin conexión. Si cambias archivos del sitio, sube el número `VERSION` en `sw.js` para que los navegadores tomen la versión nueva.

## Detalles a tener en cuenta

Las series y repeticiones son una guía general basada en los rangos más usados en entrenamiento. No reemplazan la indicación de un profesional.

La traducción automática funciona en Chrome y Edge recientes. En otros navegadores aparece un enlace a Google Translate.

La unión entre fuentes se hace comparando nombres en inglés. Algunos ejercicios pueden aparecer dos veces con nombres un poco distintos cuando cada fuente los llama de otra forma.

## Licencia

El código usa licencia MIT. Los datos, fotos, animaciones y videos mantienen la licencia de su fuente original.
