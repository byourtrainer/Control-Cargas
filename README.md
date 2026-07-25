# Control de Cargas

App web para gestionar cargas de entrenamiento (RPE) y bienestar de un equipo,
con un panel para el entrenador y un formulario diario para los jugadores.

## Qué incluye

- Login y registro de usuarios (Supabase Auth).
- Rol de **jugador**: formulario diario de RPE + duración + bienestar (sueño,
  fatiga, dolor muscular, estrés, ánimo), con historial de los últimos 7 días.
- Rol de **entrenador**: panel con nº de jugadores, quién ha registrado hoy,
  gráfico de carga diaria (equipo o jugador individual), y una tabla con
  carga semanal, ACWR (ratio carga aguda:crónica) y estado de bienestar por
  jugador.
- Seguridad a nivel de base de datos (RLS): cada jugador solo ve y edita sus
  propios registros; el entrenador ve los de todos.

## Cómo probarla en tu ordenador (opcional)

Necesitas tener [Node.js](https://nodejs.org) instalado (versión 18 o superior).

```bash
cd app
npm install
npm run dev
```

Se abrirá en `http://localhost:5173`. Las credenciales de Supabase ya están
en el archivo `.env`.

## Cómo publicarla en internet (Vercel, gratis)

1. Crea una cuenta en **https://vercel.com** (puedes entrar con GitHub).
2. Sube esta carpeta `app` a un repositorio de GitHub (puedes arrastrar los
   archivos directamente en github.com si nunca has usado Git — "Add file" →
   "Upload files").
3. En Vercel, pulsa **"Add New" → "Project"** e importa ese repositorio.
4. Antes de desplegar, ve a **Environment Variables** y añade:
   - `VITE_SUPABASE_URL` → `https://rffmpcdflyerepxfelpj.supabase.co`
   - `VITE_SUPABASE_ANON_KEY` → (la clave anon que me pasaste)

   (El archivo `.env` no se sube al repositorio por seguridad/buenas
   prácticas, así que hay que indicarlas aquí manualmente.)
5. Pulsa **Deploy**. En 1-2 minutos tendrás una URL pública tipo
   `control-cargas.vercel.app` que podrás compartir con tus jugadores.

## Cómo convertirte en entrenador

1. Entra en la app y regístrate normalmente (quedarás como "jugador" por
   defecto).
2. Ve a tu proyecto de Supabase → **Table Editor** → tabla `perfiles`.
3. Busca tu fila (por tu email/nombre) y cambia el campo `rol` de `jugador`
   a `entrenador`.
4. Recarga la app — verás el panel del entrenador.

## Cálculo de carga (metodología del club + EWMA)

- **Training Load** = Session RPE (0-10) × duración en minutos.
- **Carga Aguda**: suma de la carga de los últimos 7 días.
- **Carga Crónica**: media diaria de los últimos **28 días** (4 semanas).

El panel del entrenador permite elegir entre dos métodos de cálculo del ACWR:

- **ACWR Clásico**: (Carga Aguda ÷ 7) ÷ Carga Crónica, con medias simples
  sobre las ventanas de 7 y 28 días — el enfoque tradicional (Gabbett).
- **ACWR EWMA**: usa medias móviles ponderadas exponencialmente en vez de
  medias simples. Da más peso a las sesiones recientes, reacciona antes a
  cambios de carga y evita el efecto de "escalón" que tiene la media simple
  cuando una sesión con carga alta o baja sale de la ventana de golpe. Es el
  método que prefieren muchos grupos de investigación y aplicaciones de alto
  rendimiento actuales.

De ambos métodos se muestran dos versiones:
- **ACWR Pre**: cómo llega el jugador, sin contar el registro de hoy.
- **ACWR Post**: el ratio ya con el registro de hoy incluido.

Además:
- **Cambio diario**: variación de la carga de hoy respecto a ayer.
- **Cambio semanal**: variación de la carga de esta semana respecto a la
  anterior (referencia habitual: evitar subidas de más del 15-20%).
- **Monotonía** = media diaria semanal ÷ desviación estándar diaria (últimos
  7 días).
- **Fatiga (Training Strain)** = carga semanal × monotonía.

Clasificación de riesgo del ACWR (6 niveles):

| Rango | Categoría |
|---|---|
| < 0.50 | Muy baja |
| 0.50 – 0.80 | Baja |
| 0.80 – 1.10 | Óptima |
| 1.10 – 1.50 | Moderadamente alta |
| 1.50 – 2.00 | Alta |
| > 2.00 | Muy alta |

Clasificación de Monotonía: < 1 muy variable · 1–2 correcta · 2–2.5 elevada ·
> 2.5 riesgo elevado (indicado con un punto de color junto al valor).

La escala de RPE es de **0 a 10**, con la descripción exacta de vuestro
Excel (0 = Ningún esfuerzo … 10 = Máximo).

## Duración de sesión y lesiones (gestión exclusiva del entrenador)

- La **duración de la sesión** ya no la introduce el jugador: el entrenador
  la fija una vez por día desde la pestaña "Sesión del día", y se aplica
  automáticamente a todos los registros de esa fecha (incluso si un jugador
  ya había mandado su RPE antes de que se fijara la duración).
- La pestaña **"Lesiones"** solo es visible para el entrenador. Al registrar
  una lesión, la app calcula y guarda automáticamente el **ACWR** y el
  **% de cambio semanal de carga** de ese jugador en la fecha exacta de la
  lesión — así queda registrado si la lesión coincidió con un pico de carga.

## Colores por escala y equipos

- Los sliders de **RPE** y **bienestar** ahora cambian de color según el
  valor: verde (bajo/bueno), amarillo (medio), rojo (alto/extremo). Las
  escalas donde un valor alto es bueno (sueño, ánimo) están invertidas, así
  que el rojo aparece cuando esos valores son **bajos**, no altos.
- Los jugadores pueden indicar su **equipo** desde un desplegable en la
  parte superior de su formulario (lista gestionada por el entrenador).
- El entrenador puede **añadir equipos nuevos** desde el panel (campo de
  texto + botón "+ Añadir equipo"), y **filtrar** toda la vista (tarjetas,
  gráfico y tabla) por equipo con el desplegable correspondiente.

## Escala de colores progresiva y pestaña de Equipos

- Los sliders de RPE y bienestar ahora usan **4 tonos** (verde → amarillo →
  naranja → rojo) en vez de 3, para una lectura más matizada.
- Nueva pestaña **"Equipos"** para el entrenador: ahí se elige qué equipo
  ver (o "Todos" / "Sin asignar") y se crean equipos nuevos. Esa selección
  se aplica automáticamente al Resumen y al desplegable de jugadores de
  Lesiones, y se muestra como una etiqueta junto a tu nombre en la cabecera.
- La tabla de "Estado por jugador" ahora incluye también **Carga Crónica**
  (media diaria de 28 días) y la clasificación de **Monotonía** en texto
  (Muy variable / Correcta / Elevada / Riesgo elevado), no solo un punto de
  color.

## Equipo único, orden del cuestionario e Índice de Hooper

- El jugador ahora elige su **equipo una sola vez**: la primera vez que
  entra ve el selector obligatorio; después solo ve una línea compacta
  ("Tu equipo: X") con un enlace "Cambiar" por si algún día hace falta
  corregirlo, en vez de tener que decidirlo en cada sesión.
- El formulario del jugador ahora empieza por **Bienestar** (pensado para
  rellenar nada más despertar) y el **RPE de la sesión** aparece después
  (para rellenar tras entrenar) — orden invertido respecto a la versión
  anterior, con una etiqueta junto a cada título indicando el momento del
  día recomendado.
- El panel del entrenador clasifica el bienestar de cada jugador en
  **Óptimo / Bueno / Malo**, al estilo del Índice de Hooper: cada escala se
  convierte primero a "malestar" (sueño y ánimo se invierten, ya que ahí un
  valor alto es bueno), se promedian, y el resultado se traduce a una de las
  tres categorías.

## Informes exportables, bienestar destacado y gráfico configurable

- Nueva pestaña **"Informes"**: elige periodo (Diario / Semanal / Mensual) y
  fecha de referencia, y genera una tabla con todas las variables de carga y
  bienestar de los jugadores del equipo activo (incluye lesiones registradas
  en el periodo). Se puede **exportar a CSV** (para abrir en Excel y enviarlo
  al entrenador jefe) o **Imprimir / Guardar como PDF** directamente desde el
  navegador.
- El **Bienestar** ahora es la primera columna de la tabla del Resumen (justo
  después del nombre), y hay una tarjeta dedicada arriba del todo
  ("Bienestar bajo (Malo)") para verlo de un vistazo sin tener que mirar la
  tabla.
- El gráfico principal del Resumen ahora tiene un **selector de variable**:
  Carga, ACWR Post, Monotonía, Fatiga o Bienestar (malestar) — se puede
  combinar con el selector de jugador/equipo de al lado.

## MDx fijo, bandas de riesgo en gráficos y molestias localizadas

- El campo **MDx** en "Sesión del día" ahora es un desplegable con las
  opciones fijas del club: MD, MD+1, MD+2, MD+/-3, MD-2, MD-1 (antes era
  texto libre).
- El gráfico del Resumen muestra **bandas de color de fondo** con los
  umbrales de riesgo de la literatura científica cuando la variable
  seleccionada es **ACWR** (Gabbett/Hulin), **Monotonía** (Foster, umbral
  >2.0) o **Bienestar**. Carga y Fatiga (Strain) no llevan bandas porque no
  tienen un umbral absoluto universal — dependen del contexto de cada
  deportista, así lo indican también los propios estudios de Foster.
- Los jugadores ahora pueden marcar **"Tengo alguna molestia o dolor
  localizado"** y elegir la zona exacta del cuerpo entre 19 opciones (cuello,
  hombro, isquiotibiales, tobillo, etc.). El entrenador lo ve directamente en
  una columna "Molestia" en el Resumen, útil como aviso temprano antes de
  que se convierta en una lesión registrada.

## Deslizadores con degradado, cuestionarios independientes y plantilla con colores

- Los deslizadores de RPE y bienestar ahora tienen una **barra de fondo con
  degradado de color** (verde → amarillo → naranja → rojo, o invertido en
  sueño/ánimo) en vez de solo cambiar de color el punto — se ve la escala
  completa de un vistazo, como un velocímetro.
- **Bienestar** y **RPE** son ahora dos formularios totalmente
  independientes, cada uno con su propio botón de guardar y su propia
  confirmación ("✓ Guardado hoy"). El jugador puede rellenar el bienestar
  nada más despertar y el RPE horas después, sin que uno dependa del otro ni
  se pisen los datos.
- Nueva pestaña **"Jugadores"**: tabla con todos los jugadores dados de alta
  en la app (nombre, equipo, fecha de alta), filtrable por el equipo activo
  igual que el resto de pestañas.
- Los **equipos** ahora tienen un **color identificativo** (elegible al
  crearlos o cambiable después con una muestra de color en la pestaña
  Equipos), que se muestra como un punto de color junto al nombre del equipo
  en Jugadores, Resumen e Informes.

## Próximos pasos posibles

- Añadir las variables específicas de tu Excel de control de cargas.
- Exportar informes en PDF/Excel para el cuerpo técnico.
- Notificaciones para jugadores que no han registrado su RPE del día.
- Vista de comparativa entre jugadores o por posición.
