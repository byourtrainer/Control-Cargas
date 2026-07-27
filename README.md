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

## Instalación como app (PWA)

La app ahora tiene icono propio y se abre a pantalla completa (sin barra de
navegador) al añadirla a la pantalla de inicio:

**iPhone**: abrir la URL en **Safari** → icono de compartir → "Añadir a
pantalla de inicio".

**Android**: abrir la URL en **Chrome** → menú de tres puntos → "Añadir a
pantalla de inicio" o "Instalar aplicación".

No lleva service worker (caché offline) a propósito, para evitar que los
jugadores vean una versión desactualizada mientras seguimos haciendo cambios
frecuentes en la app. Se puede añadir más adelante, cuando el desarrollo se
estabilice, para que funcione incluso sin conexión.

## Módulo de tests físicos

Nueva pestaña **"Tests"** para el entrenador:

- **Registro de test**: elige jugador, tipo de test (Sentadilla, ISO SQ, CMJ,
  SJ, Drop Jump, Doble Wingate) y fecha. Los campos cambian según el tipo:
  - Sentadilla / ISO SQ: carga (kg) + peso corporal en el test → calcula el
    valor relativo (kg/peso corporal) al momento.
  - CMJ: altura (cm) + RSI modificado.
  - SJ: altura (cm).
  - Drop Jump: DRI.
  - Doble Wingate: PP1, MP1, PP2, MP2 → calcula el **índice de fatiga**
    automáticamente: `(MP1-MP2)/MP2 × 100`, en %.
- **Peso corporal**: se gestiona en la pestaña "Jugadores" (columna editable),
  y se usa como valor por defecto al registrar un test — aunque se puede
  ajustar test a test, ya que el peso puede variar con el tiempo.
- **Dos gráficos de cuadrantes**, filtrados por el equipo activo y coloreados
  según el color del equipo de cada jugador:
  1. **CMJ vs. Sentadilla relativa** — eje Y (CMJ) dividido en 40 cm, eje X
     (sentadilla en kg/peso corporal) dividido en 2.0×. Usa el test más
     reciente de cada tipo por jugador.
  2. **Potencia vs. Índice de fatiga (Wingate)** — eje Y (MP1 en W/kg)
     dividido en 16 W/kg, eje X (índice de fatiga) dividido en 20%.
- **Historial completo** de todos los tests registrados, con el valor
  relativo o el índice de fatiga ya calculado.

## Ficha del jugador al registrarse y correcciones en Tests

- El registro de un jugador ahora pide también **fecha de nacimiento**,
  **altura (m)**, **peso (kg)** y **sexo** (masculino/femenino/neutro),
  además de nombre, correo y contraseña. El peso queda guardado en el mismo
  campo que usa el módulo de Tests, así que ya no hace falta añadirlo a mano
  la primera vez desde la pestaña Jugadores (aunque se puede seguir
  ajustando ahí si cambia).
- Corregido el nombre de **DRI**: es *Dynamic Rebound Index*, no *Drop Jump
  Reactive Index*.
- En el cuadrante Potencia vs. Índice de fatiga (Wingate), el eje Y ahora usa
  **PP1** (potencia pico) en vez de MP1 (potencia media), tal y como debía
  ser.

## Ajustes en Tests y ficha completa en Jugadores

- Corregido el umbral del eje Y en el cuadrante Potencia/Wingate: ahora
  divide en **10 W/kg** (antes eran 16 W/kg, por error).
- La pestaña "Jugadores" ahora muestra en una sola tabla: nombre, equipo,
  peso corporal, altura, fecha de nacimiento (con la edad calculada al lado)
  y fecha de alta — todos los datos de la ficha de un vistazo, sin tener que
  entrar en otra pantalla.

## Datos personales, menú desplegable y perfil físico

- El jugador ahora tiene una tarjeta **"Mis datos"** en su propia vista, con
  equipo, peso, altura, fecha de nacimiento (y edad) y sexo — de solo
  lectura, tal como los introdujo al registrarse.
- La pestaña **"Jugadores"** del entrenador ya mostraba peso/altura/equipo/
  fecha de alta; ahora también incluye el **sexo**, para tener exactamente
  los mismos datos que ve el jugador.
- Las pestañas del entrenador (que ya eran siete) se han convertido en un
  **menú desplegable** en vez de una fila de botones, para que quepan bien
  y sea más cómodo navegar según van creciendo.
- Nueva pestaña **"Perfil Físico"**: informe de todos los resultados de
  tests (Sentadilla, ISO SQ, CMJ, SJ, Drop Jump, Wingate) de un grupo de
  jugadores, con chips para incluir o excluir jugadores concretos dentro
  del equipo activo (por defecto se incluyen todos). Exportable a **CSV** o
  **Imprimir/Guardar PDF**, igual que en Informes.

## Informe de perfil físico con gráficos, edición de datos y exportación con el diseño de la app

- El informe de perfil físico ya no es una pestaña aparte: ahora vive
  **dentro de la pestaña "Tests"**, justo debajo de los cuadrantes.
- Se elige entre **"Perfil individual"** (el jugador que tengas seleccionado
  en el formulario de "Registrar test" de arriba) o **"Varios jugadores"**
  (chips para incluir/excluir dentro del equipo activo).
- El perfil individual muestra una **mini-gráfica de evolución** por cada
  métrica con al menos un test (Sentadilla, ISO SQ, CMJ, SJ, Drop Jump,
  Potencia e Índice de fatiga del Wingate). La comparativa de varios
  jugadores muestra **gráficos de barras** por métrica, coloreados según el
  color del equipo de cada jugador.
- **Exportar CSV** e **Imprimir / Guardar PDF** están ahora en esta misma
  sección. Al exportar a PDF, el documento **mantiene el diseño oscuro y los
  colores de la app** (antes se forzaba fondo blanco) — para que se vea bien
  necesitas tener activado "Gráficos de fondo" / "Background graphics" en el
  diálogo de impresión de tu navegador. Este mismo criterio se aplicó
  también a las exportaciones de la pestaña "Informes".
- Se eliminó la pestaña independiente "Perfil Físico" (fusionada en Tests).
- Los datos personales del jugador (peso, altura, fecha de nacimiento,
  sexo) ahora son **editables** desde su propia tarjeta "Mis datos", no solo
  de lectura.

## Interpretaciones, cuadrantes en el informe y ranking comparativo

- **Interpretación en directo**: al registrar un test de Sentadilla, CMJ o
  Doble Wingate, aparece de inmediato si el resultado es "Fuerte/Poco
  fuerte", "Explosivo/Poco explosivo", "Potente/Poco potente" o la capacidad
  de repetir esfuerzo, según los umbrales exactos que definiste.
- **Los dos cuadrantes ahora aparecen también dentro del informe físico**
  (tanto en modo individual como en la comparativa de varios jugadores), con
  una leyenda explicando el significado de cada zona — y se incluyen al
  exportar/imprimir.
- **Interpretación automática + comentario del entrenador**: en el perfil
  individual se genera un resumen automático a partir de los últimos tests
  (ej. "Sentadilla: Fuerte (2.3×) · CMJ: Explosivo (44cm)…"), y debajo hay un
  cuadro de texto para que el entrenador escriba y guarde su propia
  valoración, que queda asociada a ese jugador para futuras consultas.
- **Ranking comparativo**: en el perfil individual, debajo de cada
  mini-gráfica aparece el puesto del jugador dentro del equipo activo (ej.
  "Puesto 3 de 12, percentil 82") para esa métrica en concreto.

## Hoja del informe individual: solo cuadrantes, datos completos y zonas coloreadas

- La **hoja impresa/exportada** del perfil individual ahora muestra
  únicamente: datos personales completos (peso, altura, fecha de
  nacimiento con edad, sexo), equipo, los **dos cuadrantes** y el
  **comentario del entrenador** debajo — las mini-gráficas de evolución y
  el ranking comparativo se quedan solo en pantalla (son útiles para
  explorar, no para la hoja final).
- Cada uno de los **4 cuadrantes** de ambos gráficos tiene ahora **fondo de
  color y texto explicativo** (ej. "Explosivo · Fuerte"), con este esquema:
  - 🟢 Verde: las dos cualidades en su lado bueno (mejor caso).
  - 🟡 Ámbar: una cualidad buena y la otra no (casos mixtos).
  - 🔴 Rojo: las dos cualidades en su lado débil (peor caso).

## Informe de "varios jugadores": mismo criterio que el individual

- Al exportar/imprimir el informe con varios jugadores seleccionados, ahora
  solo aparecen los **dos cuadrantes** (las barras comparativas por métrica
  se quedan solo en pantalla, igual que en el modo individual).
- Debajo de los cuadrantes se listan los **comentarios que el entrenador
  haya guardado** para cada uno de los jugadores incluidos (los mismos que
  se escriben desde el perfil individual de cada uno) — si un jugador no
  tiene comentario guardado, simplemente no aparece en la lista.

## Comentario único para todo un grupo/equipo

- En el modo "Varios jugadores" del informe físico, ahora hay un
  **comentario del entrenador sobre el grupo entero**, con su propio botón
  de editar/guardar — no hace falta entrar jugador por jugador.
- Ese comentario queda asociado a la combinación exacta de jugadores
  seleccionados: si eliges el mismo equipo o la misma selección más
  adelante, recuperas el mismo comentario; si cambias la selección, empieza
  en blanco (puedes escribir uno distinto para cada agrupación).
- Debajo sigue apareciendo, si los hay, el listado de comentarios
  individuales que ya hubieras guardado desde el perfil de cada jugador —
  ahora bajo el título "Comentarios individuales guardados", para
  diferenciarlo del comentario de grupo.

## Vista del jugador: calendario como pantalla inicial

- El jugador ahora ve primero un **calendario mensual** en vez de ir directo
  al formulario de hoy. El día actual aparece resaltado con un borde.
- Cada celda de día muestra **dos barritas de color**: la de arriba refleja
  el bienestar de ese día (verde/amarillo/rojo, estilo Hooper) y la de abajo
  el RPE (la misma escala de 4 colores de los deslizadores). Si no hay
  registro ese día, aparecen en gris.
- Al pulsar un día (hoy o cualquier día pasado — los días futuros están
  deshabilitados) se abren los formularios de Bienestar y RPE **de esa fecha
  concreta**, con un botón "← Volver al calendario" para regresar. Esto
  también permite corregir un registro de un día anterior si hace falta.
- Se puede navegar entre meses con las flechas, y pulsar el nombre del mes
  vuelve directamente al mes actual.
- La tabla "Últimos 7 registros" se ha retirado, ya que el calendario cumple
  esa función de forma más visual y con más alcance (todo el mes, no solo 7
  días).

## Calendario de equipo en "Sesión del día"

- La pestaña "Sesión del día" ahora muestra un **calendario mensual**, igual
  en estilo al del jugador, pero con las **medias del equipo activo**: cada
  celda muestra la media de bienestar y la media de RPE de todos los
  jugadores del grupo filtrado ese día, con los mismos colores.
- Un **punto de color** en la esquina de cada celda indica si ya hay una
  sesión (duración) guardada ese día.
- Al hacer clic en cualquier día del calendario (pasado, hoy o futuro, para
  poder planificar por adelantado), el formulario de la derecha se actualiza
  con los datos de esa fecha — si ya existe una sesión, aparece precargada
  para editarla; si no, aparece en blanco para crearla.
- En cuanto el entrenador guarda una sesión, el **punto indicador aparece
  automáticamente en el calendario de todos los jugadores** ese mismo día
  (el jugador ve que hay sesión programada aunque todavía no haya rellenado
  su RPE).
- Se retiró la lista de "Últimas sesiones", sustituida por el propio
  calendario.

## Fecha de referencia y vista diaria/semanal/mensual en el gráfico del Resumen

- El gráfico principal de la pestaña "Resumen" ahora tiene un **selector de
  fecha** (hasta qué día quieres ver) y un **selector de vista**: Diaria
  (últimos 21 días), Semanal (últimas 12 semanas) o Mensual (últimos 6
  meses) — combinable con los selectores de variable y jugador/equipo que
  ya había.
- **Carga**: en semanal/mensual se suma toda la carga del grupo durante ese
  periodo (no solo un día).
- **Bienestar**: se promedia entre todos los registros del periodo, no solo
  el último día.
- **ACWR, Monotonía y Fatiga**: se calculan tal y como estarían al final de
  cada semana/mes (con todo su histórico previo en cuenta), y se promedian
  entre los jugadores del grupo — así cada punto refleja fielmente el
  estado real a cierre de esa semana o mes.

## Tarjetas adaptativas e informe exportable en el Resumen

- Las 4 tarjetas de la parte superior del Resumen ahora se **adaptan** a la
  vista, fecha y jugador/grupo seleccionados en el gráfico:
  - **Jugador individual**: Carga total del periodo, Días con RPE
    registrado, Bienestar medio, y ACWR al final del periodo (con su nivel
    de riesgo).
  - **Grupo/equipo**: Jugadores en el grupo, Cuántos registraron en el
    periodo, Bienestar medio del grupo, y Nº en riesgo (ACWR alto/muy alto).
- Nuevos botones **"Exportar CSV"** e **"Imprimir / Guardar PDF"** en la
  cabecera del panel.
- Nueva tarjeta de **informe** al final del Resumen con las 5 variables
  (Carga, ACWR, Monotonía, Fatiga, Bienestar) en mini-gráficos separados —
  visible tanto en pantalla como al exportar, con el mismo diseño oscuro de
  la app (recuerda activar "Gráficos de fondo" al imprimir). Al exportar,
  solo se ven las tarjetas de resumen y estos gráficos — el resto de
  controles y la tabla detallada se ocultan para un documento limpio.
- Funciona igual tanto si tienes seleccionado "Todo el equipo" como un
  jugador individual en el desplegable del gráfico — el título del informe
  cambia en consecuencia.

## Rango de fechas (desde/hasta) y todas las variables de carga en las tarjetas

- El gráfico del Resumen ahora tiene dos selectores de fecha (**Desde** /
  **Hasta**) en vez de una sola fecha de referencia — puedes ver desde un
  único día hasta periodos tan largos como quieras, combinado con la vista
  Diaria/Semanal/Mensual (que decide cómo se agrupan los puntos dentro de
  ese rango).
- Las tarjetas de resumen ahora muestran **todas las variables de carga**,
  no solo 4:
  - **Jugador individual**: Carga total, Días con RPE registrado, Bienestar
    medio, ACWR, Monotonía y Fatiga (Strain) al final del periodo.
  - **Grupo/equipo**: Jugadores en el grupo, Registraron en el periodo,
    Carga media por jugador, Bienestar medio, ACWR medio, Monotonía media,
    Fatiga media y Nº en riesgo.

## Tabla "Estado por jugador" ligada a la fecha "Hasta"

- La tabla ya no está fijada a "hoy": ahora usa la fecha **"Hasta"** que
  elijas en el gráfico de arriba como referencia para todos sus cálculos
  (ACWR Pre/Post, Riesgo, Monotonía, Fatiga, Bienestar más reciente hasta
  esa fecha, cambios diario/semanal, y la columna "Registró").
- El título de la tabla muestra la fecha de referencia usada, y la columna
  que antes decía "Hoy" ahora se llama "Registró" (con un tooltip que
  aclara qué fecha concreta comprueba).
- Con esto, las tarjetas de resumen y la tabla siempre están sincronizadas
  con el mismo periodo/fecha, sin importar si estás mirando datos actuales
  o de un mes pasado como junio.

## Iniciales en los cuadrantes y mapa corporal de molestias

- Los puntos de los dos cuadrantes (Tests) ahora muestran las **iniciales
  del jugador** encima, para saber quién es quién de un vistazo.
- Nueva sección **"Mapa corporal de molestias"** dentro de la pestaña
  "Lesiones": dos siluetas (frontal y posterior) que colorean cada zona del
  cuerpo en una escala de rojos según cuántas veces se ha reportado
  molestia/dolor ahí — más oscuro = más veces reportada.
  - Se puede ver de un **jugador individual** o de un **equipo/selección de
    varios jugadores** (mismo patrón de chips que en Tests).
  - Tiene su propio selector de **fechas (Desde/Hasta)** — cuenta solo las
    molestias reportadas en ese rango, no todo el historial.
  - Se basa en las molestias que el propio jugador marca en su registro
    diario de bienestar (campo "Tengo alguna molestia..."), no en las
    lesiones formales que registra el entrenador — son dos fuentes de datos
    distintas, mostradas una debajo de la otra en la misma pestaña.
  - Al lado del cuerpo hay una lista con las zonas más reportadas y cuántas
    veces cada una.

## Cuerpo interactivo y eliminación de "Informes"

- Nuevo componente de cuerpo mejorado (silueta continua de fondo + zonas
  superpuestas, dos modos):
  - **El jugador** ahora toca directamente la zona en el propio dibujo del
    cuerpo al marcar una molestia, en vez de elegir de una lista
    desplegable — la zona seleccionada se resalta en verde lima.
  - **El entrenador** sigue viendo el mapa de calor en rojo en la pestaña
    Lesiones, con el mismo dibujo.
  - No es una ilustración anatómica de detalle profesional (no hay
    herramienta de trazado de imágenes en este entorno), pero mejora la
    silueta y las formas respecto a la versión anterior con rectángulos y
    círculos sueltos.
- Se eliminó la pestaña **"Informes"** — quedó redundante desde que el
  Resumen incorporó su propio informe exportable con rango de fechas,
  tarjetas adaptativas y gráficos multi-variable, y la tabla "Estado por
  jugador" pasó a respetar también la fecha seleccionada.

## Nueva pestaña "Referencias"

Consulta rápida para el entrenador con la definición científica, la
interpretación práctica (con las mismas tablas de colores que usa el resto
de la app) y la cita bibliográfica completa de:

1. Carga de entrenamiento (Foster et al., 2001)
2. Carga Aguda y Carga Crónica
3. ACWR — Clásico y EWMA, unificado en una sola sección (Gabbett 2016; Hulin
   et al. 2016; Williams et al. 2017; Murray et al. 2017)
4. Monotonía y Fatiga/Strain (Foster, 1998)
5. Bienestar, estilo Índice de Hooper (Hooper & Mackinnon, 1995)

Pensada para que puedas consultarla tú mismo o remitir a otros técnicos del
club cuando les envíes un informe y necesiten entender qué significa cada
dato de un vistazo.

## Repaso general: contexto unificado, orden, densidad y borrado

A raíz de una revisión crítica de la app, se aplicaron varios cambios de
fondo (todos menos el modo de impresión, que queda pendiente):

- **Contexto único**: nuevo selector "◎" en la cabecera (equipo + jugador +
  rango de fechas) que se aplica automáticamente en **Resumen** y en el
  **mapa corporal de Lesiones** — ya no hay que configurar el mismo filtro
  por separado en cada pestaña. Al cambiar de equipo, el jugador individual
  se resetea a "todo el grupo" para evitar inconsistencias.
- **Orden de pestañas** más lógico: Equipos → Resumen → Jugadores →
  Planificación → Tests → Lesiones → Referencias.
- **"Sesión del día" pasó a llamarse "Planificación"**, para no confundirla
  con el registro diario del jugador ni con los tests físicos.
- **Se eliminó la tabla "Estado por jugador"** de Resumen (poco clara según
  el propio análisis) — las tarjetas de arriba y el informe multi-variable
  cubren esa información de forma más legible.
- **El informe de 5 variables en Resumen ahora está colapsado por
  defecto** ("Ver informe completo"), para reducir el scroll inicial.
- **Botones de eliminar** en el historial de Tests, en el historial de
  Lesiones, y un botón "Eliminar sesión" en Planificación cuando ya existe
  una guardada — con confirmación antes de borrar en los tres casos.

Pendiente para una próxima sesión: vista de tarjeta apilada para tablas
anchas en pantallas pequeñas, y revisión del modo de impresión para que no
dependa de activar "Gráficos de fondo" en el navegador.

## Próximos pasos posibles

- Añadir las variables específicas de tu Excel de control de cargas.
- Exportar informes en PDF/Excel para el cuerpo técnico.
- Notificaciones para jugadores que no han registrado su RPE del día.
- Vista de comparativa entre jugadores o por posición.
