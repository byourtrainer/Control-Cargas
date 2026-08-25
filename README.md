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

## Corrección de encaje en pantallas de móvil pequeñas

Se ha corregido un problema por el que la app no encajaba bien el ancho en
algunos teléfonos (obligando a hacer zoom manualmente):

- Bloqueo global de desbordamiento horizontal (`overflow-x: hidden` en
  `html`/`body`), como red de seguridad.
- La cabecera (título + usuario) ahora se ajusta en pantallas muy estrechas:
  el título se recorta con "…" en vez de desbordar, y la etiqueta de rol se
  oculta por debajo de 400px de ancho.
- El formulario de registro (fecha de nacimiento, altura y peso) pasa a una
  sola columna en pantallas muy pequeñas, en vez de intentar encajar dos
  columnas donde los campos de fecha/número no cabían bien.
- Los menús desplegables (equipo/jugador/fecha, pestañas) ya no pueden ser
  más anchos que la pantalla.
- Mismo ajuste de una sola columna aplicado a los formularios de dos
  columnas en Tests, Lesiones y Planificación.

## Control diario real: alertas, mapa de calor y partidos marcados

Los tres cambios prioritarios de la revisión crítica, centrados en el
objetivo de control diario:

- **Alertas de hoy**: nueva tarjeta al principio de Resumen (siempre sobre
  "hoy/ayer", independiente del rango de fechas que tengas seleccionado en
  el gráfico) con tres bloques: quién no registró RPE ayer, quién está en
  ACWR alto/muy alto hoy, y quién ha reportado una molestia nueva hoy. Cada
  bloque se resalta en rojo solo si hay algo que revisar; si no, muestra un
  "✓ todo en orden".
- **Mapa de calor jugador × día**: rejilla con los jugadores del grupo
  activo en filas y los últimos días (hasta 21, dentro del rango elegido)
  en columnas, coloreada por ACWR o Bienestar (selector arriba). Las
  columnas de días de partido se resaltan en la cabecera. Pensado para leer
  el estado de todo el equipo de un vistazo, sin tener que ir jugador a
  jugador.
- **Días de partido marcados en el gráfico principal**: en la vista Diaria,
  los días con sesión de tipo MD (partido) aparecen con un punto naranja
  sobre la línea, para poder distinguir a simple vista un pico de RPE en
  partido (normal) de uno en un entreno suave (señal de alarma).

## Respuesta atípica y huecos de datos

Los dos últimos puntos de la revisión crítica, añadidos al bloque de
Alertas de hoy y al mapa de calor:

- **Respuesta atípica hoy**: compara el RPE de cada jugador con la media
  del RPE del equipo ese mismo día. Si la diferencia es de 2 puntos o más
  (en cualquier dirección), aparece en la alerta — es la forma más directa
  de detectar quién está respondiendo "raro" a una carga que para el resto
  fue normal, que es justo lo que se quería medir con "cómo responden los
  jugadores a las cargas propuestas".
- **Huecos de RPE (últimos 7 días)**: cuenta, para cada jugador, cuántas de
  las sesiones reales de la semana (solo días con sesión guardada, no
  descansos) se quedaron sin su RPE correspondiente. Evita que el ACWR se
  calcule silenciosamente con datos incompletos sin que nadie se dé cuenta.
- El **mapa de calor** ahora tiene una tercera variable seleccionable:
  "Desviación RPE vs equipo", con la misma escala de 4 colores, para ver el
  patrón de respuestas atípicas a lo largo de varios días, no solo hoy.

## Sesiones por equipo (ya no son globales)

Cambio de fondo: las sesiones (duración/microciclo/MDx) ya **no se aplican
a todos los jugadores de todos los equipos** — ahora cada equipo tiene sus
propias sesiones, independientes entre sí.

- En **Planificación**, si el selector "◎" tiene puesto "Todos los equipos"
  o "Sin asignar", la pestaña pide elegir un equipo concreto antes de poder
  planificar nada — no tiene sentido guardar una sesión sin saber para
  quién es.
- El calendario del jugador y el cálculo de su carga usan la sesión de **su
  propio equipo**, no la de cualquier otro.
- El calendario del entrenador (dentro de Planificación) muestra el punto
  de "sesión programada" del equipo que tengas activo en cada momento; si
  tienes "Todos los equipos" seleccionado, se ve si *cualquier* equipo tiene
  algo ese día.
- Los jugadores marcados como "Sin asignar" no pueden tener sesión (no
  pertenecen a ningún equipo), así que verán siempre el aviso de "el
  entrenador aún no ha indicado la duración" hasta que se les asigne un
  equipo.

**Importante**: la migración de base de datos de este cambio borra las
sesiones que ya tuvieras guardadas (no había forma de saber a qué equipo
pertenecía cada una bajo el modelo anterior). Hay que volver a
introducirlas, esta vez con el equipo seleccionado.

## El PDF de Resumen ya incluye los 5 gráficos, sin repetir información

- El informe de 5 variables ("Ver informe completo") ahora **siempre está
  presente en el documento**, esté o no desplegado en pantalla — antes,
  como solo existía en la página cuando lo abrías manualmente, `Imprimir /
  Guardar PDF` no lo capturaba si estaba colapsado.
- El documento exportado tiene ahora una **portada** (título + equipo o
  jugador + rango de fechas + fecha de generación) que solo aparece al
  imprimir, no en pantalla.
- Para evitar repetir información entre el mapa de calor y los 5 gráficos:
  el **mapa de calor solo se incluye en el PDF cuando estás viendo un grupo
  o equipo completo** (varias filas = información nueva). Si tienes un
  jugador individual seleccionado, se omite del documento porque sería una
  sola fila redundante con lo que ya muestran los 5 gráficos de ese mismo
  jugador — en pantalla lo sigues viendo igual, esto solo afecta a lo que
  se imprime.
- El gráfico grande de una sola variable sigue sin imprimirse (ya estaba
  así) porque esa misma variable ya aparece dentro de los 5 gráficos del
  informe completo — evita duplicar el mismo dato dos veces en el documento.

Con esto, el PDF final queda: portada → tarjetas de resumen (individuales o
medias del grupo, según selección) → mapa de calor (solo en vista de grupo)
→ los 5 gráficos con todas las variables.

## Título del informe, ajuste a página del PDF, y alerta de sesión inusual

- El título del PDF ahora es exactamente **"Informe de equipo"** (con el
  nombre del equipo como subtítulo) o **"Informe de [nombre del jugador]"**,
  según lo que tengas seleccionado.
- Corregido el motivo real por el que el mapa de calor no cabía bien: tenía
  scroll horizontal en pantalla, y al imprimir eso **recortaba** el
  contenido que quedaba fuera de la vista en vez de mostrarlo entero. Ahora
  se desactiva ese scroll solo al imprimir, se reduce el tamaño de fuente y
  de las celdas, y se ajustan los márgenes de página — todo debería caber
  ya en el ancho de A4.
- Nueva alerta **"Sesión inusual hoy"**: compara la carga de la sesión de
  hoy con la media y desviación estándar de las sesiones reales de las
  **últimas 3 semanas** de cada jugador (ventana de tiempo, no un número
  fijo de sesiones — se adapta sola a equipos que entrenan 3 o 4 días por
  semana), y avisa si se sale de ±1.5 desviaciones estándar. Es un nivel de
  detalle que no cubrían ni el ACWR ni el Cambio semanal (esos avisan a
  nivel de semana completa, no de una sesión suelta dentro de ella), así
  que no se repite información.

## Gráficos cortados al exportar — arreglo más robusto

El primer intento (forzar el ancho por CSS) no era fiable: el navegador
cambia cómo se ve el gráfico al imprimir, pero no reescribe las
proporciones internas del SVG (su `viewBox`), así que podía quedar con
aspecto extraño o incompleto en vez de ajustarse de verdad a la hoja.

Arreglo definitivo: la app ahora **detecta el momento exacto en que empieza
la impresión** (evento `beforeprint` del navegador) y, en ese instante,
redibuja cada gráfico con un ancho fijo pensado para el papel (320px, que
encaja bien en dos columnas de una A4), en vez de dejar que el gráfico
mantenga el ancho con el que se dibujó en pantalla. Al terminar de
imprimir, vuelve a su comportamiento normal en pantalla. Aplicado a los 5
gráficos del informe de Resumen y a los dos cuadrantes de Tests (donde
existía el mismo problema).

También se amplió el ancho máximo de los nombres de jugador en el mapa de
calor (se estaban recortando con "…" al imprimir).

Los gráficos (Recharts) calculan su ancho en píxeles según el tamaño de la
pantalla en el momento de renderizarse, no según el ancho real de la hoja
impresa — mucho más estrecha. Eso hacía que se cortaran por los lados al
exportar a PDF, en cualquier pantalla con gráficos (Resumen y Tests).
Corregido de forma global: al imprimir, se fuerza a que cada gráfico se
reescale al ancho real de la página en vez de mantener el ancho de pantalla
con el que se dibujó originalmente.

## Sesiones por jugador (con atajo para asignar a todo el grupo)

Las sesiones dejan de estar ligadas a un equipo — ahora cada sesión es de
un **jugador concreto**, y "asignar a todo el equipo" es simplemente un
atajo que rellena la misma duración a todos los jugadores del grupo activo
de una vez, no un concepto distinto en la base de datos.

- En **Planificación** hay dos modos: **"Todo el grupo"** (como hasta
  ahora, un único campo de duración para todos) y **"Por jugador"** (una
  fila con su propio campo de duración para cada jugador del grupo activo —
  puedes rellenar solo a quien entrena ese día y dejar en blanco al resto).
- Esto resuelve directamente el caso de los **deportistas individuales sin
  equipo**: como ya no hace falta pertenecer a un equipo para tener una
  sesión, un jugador en "Sin asignar" puede tener su propia duración cada
  día, sin necesidad de crear un equipo ficticio tipo "Individuales".
- También sirve dentro de un equipo normal para ajustes puntuales (por
  ejemplo, un jugador que vuelve de lesión con sesión reducida ese día,
  mientras el resto hace la sesión completa).
- **Se conservan las sesiones de junio** que ya tenías — la migración las
  expande automáticamente de "una por equipo" a "una por cada jugador de
  ese equipo", no hace falta volver a introducirlas.

## Tipo de sesión y contenido planificado (solo visible para el entrenador)

- Al planificar una sesión (modo grupo o por jugador) hay dos campos
  nuevos, además del MDx que ya existía:
  - **Lugar / tipo de trabajo**: Pista, Gimnasio o Recuperación.
  - **Contenido de la sesión**: cuadro de texto libre para anotar qué se
    va a trabajar (series, ejercicios, enfoque de la sesión...).
- Al volver a entrar en ese día desde Planificación, ambos campos aparecen
  ya rellenos con lo que planificaste — así puedes consultar rápidamente
  qué tenías previsto para esa sesión. El tipo de sesión, además, se ve de
  un vistazo junto al resumen del día sin tener que abrir el formulario.

**Nota sobre la privacidad de estos campos**: al igual que "Microciclo" y
"MDx" (que ya existían), estos dos campos nuevos solo se muestran en el
lado del entrenador — ninguna pantalla del jugador los pide ni los
enseña. No es una restricción a nivel de base de datos columna por
columna (Supabase no lo permite de forma sencilla sin añadir una capa
extra), sino que, igual que con los campos ya existentes, la app
simplemente nunca se los pide ni se los muestra al jugador. Si en algún
momento quieres una separación más estricta a nivel de servidor, es
posible pero añade complejidad — de momento sigue el mismo patrón que ya
usa el resto de la Planificación.

## Informe de Resumen simplificado al máximo

A petición expresa: el documento exportado ya no incluye las 8 tarjetas de
arriba ni la cabecera con los botones/selectores — solo queda:

1. Portada (título + equipo o jugador + fechas)
2. Mapa de calor (con la variable que tengas elegida en su desplegable:
   ACWR, Bienestar o Desviación RPE vs equipo) — solo en vista de grupo
3. Los 5 gráficos de variables

Todo lo demás (tarjetas, cabecera con botones, alertas, gráfico de una
sola variable) se sigue viendo con normalidad en pantalla — estos cambios
solo afectan a lo que se imprime/exporta.

## Gráficos más pequeños y un comentario general del informe

- Los 5 gráficos del informe de Resumen se mantienen más compactos que
  antes (dejan más margen de página libre).
- En vez de un comentario por cada gráfico, ahora hay **un único
  comentario general** al final del bloque, pensado para explicar lo que
  muestra el informe en conjunto — se guarda solo al salir del campo de
  texto, y queda ligado al equipo/jugador y rango de fechas que estuvieras
  viendo (si vuelves a esa misma combinación más adelante, tu comentario
  sigue ahí).
- Reducido el margen blanco de la página impresa (de 12mm a 8mm) y fijado
  el fondo oscuro explícitamente durante la impresión. Aviso honesto: el
  margen en sí es una zona que los navegadores no permiten colorear por
  CSS — no se puede eliminar del todo sin salirse de los estándares web,
  pero sí lo dejamos al mínimo razonable.

## El informe se cortaba antes de terminar la página (corregido de raíz)

Encontrado el motivo real: `html, body, #root` estaban fijados a
`height: 100%` para el diseño en pantalla (necesario para que el layout de
la app funcione bien). Al imprimir, eso limitaba **todo el documento a la
altura de una sola página** — cualquier contenido que no cupiera ahí
(como el comentario general al final) se cortaba en vez de continuar en
una segunda página. Corregido de forma global: durante la impresión, esos
contenedores pasan a `height: auto` para poder crecer y paginarse con
normalidad, tantas páginas como haga falta.

## Tema de impresión propio: informe claro y profesional

Hasta ahora, imprimir/exportar mantenía el tema oscuro de la app tal cual
— por eso el resultado final parecía "una captura de pantalla" en vez de
un documento. Se ha creado un **tema de impresión independiente**, con
fondo blanco, texto oscuro y colores reforzados para verse bien sobre
blanco, sin tocar en absoluto el aspecto de la app en pantalla (que sigue
exactamente igual que siempre).

Cómo funciona: casi todo el CSS de la app está construido con variables
(`var(--bg)`, `var(--text)`, `var(--accent)`...), así que basta con
redefinir esas variables solo durante la impresión para que fondos, texto
y bordes cambien automáticamente en toda la app a la vez — no ha hecho
falta reescribir cada pantalla una por una. Además se reforzaron
específicamente las insignias de color (riesgo, monotonía, bienestar,
severidad), que usaban fondos muy translúcidos pensados para verse sobre
oscuro y quedaban casi invisibles en blanco.

## Dos correcciones: el tema de impresión no aplicaba, y el comentario iba lento

- **Tema de impresión**: cuando dos sitios definen la misma variable de
  color, gana el que aparece último en el CSS final compilado — no
  necesariamente el que corresponde al modo impresión. Se añadió
  `!important` a las variables del tema claro para que ganen siempre
  durante la impresión, sin depender del orden de los archivos.
- **Comentario lento al escribir**: cada uno de los 5 gráficos del informe
  recalculaba TODOS sus datos (ACWR, Monotonía, Fatiga... de los 8
  jugadores) en cada letra que se tecleaba en el comentario, porque esa
  parte del código no estaba "memorizada" — cualquier cambio en el
  componente (incluido escribir en un campo de texto sin relación)
  disparaba el recálculo completo. Ahora esos datos se calculan una sola
  vez y solo se recalculan cuando cambian de verdad (jugadores, fechas,
  método de ACWR...), no en cada pulsación de tecla.

## Las notas del test ahora aparecen en el historial

El campo de comentarios al registrar un test ya existía y se guardaba
correctamente, pero **nunca se mostraba en ningún sitio después** — un
hueco real. Ahora:

- El historial de tests tiene una nueva columna **"Notas"**, con la fecha
  del test justo al lado, tal y como pedías.
- Si el comentario es largo, se recorta con "…" en la tabla, pero puedes
  pasar el cursor por encima para ver el texto completo.
- El campo del formulario de registro ahora tiene un texto de ejemplo
  ("Sensaciones del jugador, condiciones del test, incidencias...") para
  animar a rellenarlo, ya que hasta ahora se perdía de vista.

## Mensaje de registro ya no es ambiguo

Antes, tras crear una cuenta, el jugador veía siempre el mismo aviso
genérico ("revisa tu correo *si* se pide confirmación"), sin saber si de
verdad tenía que hacer algo o no. Ahora la app **detecta automáticamente**
qué ha ocurrido de verdad (mirando si Supabase devuelve una sesión activa
tras el registro o no) y muestra el mensaje que corresponde a cada caso:

- **Si tu proyecto de Supabase tiene la confirmación de email
  desactivada**: no aparece ningún aviso — la cuenta queda activa al
  instante y el jugador entra directo a la app.
- **Si la tiene activada**: aparece un mensaje claro y concreto ("Te hemos
  enviado un correo a [su email] para confirmar tu cuenta...") en vez del
  mensaje ambiguo de antes.

No hace falta que sepas de memoria cómo tienes configurado ese ajuste —
la app reacciona a lo que realmente pasa en cada registro.

## Escudo del equipo en la cabecera de los informes exportados

- En **Equipos**, junto al color de cada equipo, hay un pequeño recuadro
  para **subir su escudo** (clic para elegir la imagen desde tu
  ordenador/móvil). Se guarda directamente asociado a ese equipo — sin
  necesidad de montar un sistema de almacenamiento aparte, la imagen viaja
  con los datos del propio equipo. Límite de 1.5 MB por imagen (con aviso
  claro si se supera).
- El escudo aparece automáticamente en la **cabecera del PDF exportado
  desde Resumen**, arriba a la derecha del título — tanto en el informe de
  equipo (si tienes un equipo concreto seleccionado, no "Todos los
  equipos") como en el informe individual (usando el escudo del equipo al
  que pertenece ese jugador).
- Se puede quitar el escudo en cualquier momento con el botón "✕" junto al
  recuadro.

## Flechas de dirección en el mapa de calor (Desviación RPE vs equipo)

Cuando el mapa de calor está en modo "Desviación RPE vs equipo", cada
celda con datos ahora muestra una pequeña flecha además del color:
**▲ = ese día el jugador tuvo un RPE por encima de la media del equipo**,
**▼ = por debajo**. Antes esa información solo estaba disponible pasando
el cursor por encima (lo cual no funciona en absoluto en el PDF exportado)
— ahora es visible directamente, tanto en pantalla como impreso. Se añadió
también una nota explicativa debajo del mapa cuando esta vista está activa.

## Nueva pestaña "Calendario" (agenda del club)

Distinta de "Planificación" (que gestiona la duración de las sesiones día
a día) — esta es la **agenda de temporada** del club: partidos,
competiciones, entrenamientos señalados...

- Requiere tener un **equipo/club concreto** seleccionado en el "◎" (igual
  que Planificación) — el calendario es siempre de un club a la vez.
- Cada evento tiene un **tipo** con su propio color: Entrenamiento (gris),
  Amistoso (azul), Liga (verde lima), Europa (morado), Copa del Rey
  (dorado), Play-Off (rojo) — con su leyenda debajo del calendario.
- Cada día del mes muestra puntos de color con los eventos de ese día. Al
  hacer clic en un día se abre un panel con el listado de eventos (con
  opción de borrar) y un formulario para añadir uno nuevo: tipo, título,
  hora, rival y lugar (opcionales), y notas.

## Calendario de club exportable a PDF, con eventos legibles día a día

- Nuevo botón **"Imprimir / Guardar PDF"** en el Calendario.
- En pantalla, cada día sigue mostrando puntos de color compactos (para no
  saturar la vista). **Al exportar**, esos puntos se sustituyen por el
  texto real de cada evento dentro de la propia casilla — por ejemplo
  **"Entrenamiento Pista · 19:00"** o **"Amistoso vs Rival · 18:00"** — con
  una barra lateral del color de su tipo, y las casillas se agrandan
  automáticamente para dar cabida al texto.
- El panel de edición del día (interactivo, solo tiene sentido en pantalla)
  no se imprime — el documento final es solo el calendario completo del
  mes con todo legible de un vistazo, más su leyenda de colores.
- Ajuste de contraste: el color de cada tipo se usa como barra lateral,
  pero el texto en sí se mantiene siempre en el color normal de lectura —
  algunos colores (como el verde lima de "Liga") apenas se verían si se
  usaran como color de texto sobre el fondo blanco del informe.

## Calendario: título opcional para partidos, eventos de varios días, semáforo de intensidad

- **Título ya no es obligatorio** para Amistoso/Liga/Europa/Copa del
  Rey/Play-Off — en su lugar, el **rival pasa a ser obligatorio** para
  esos tipos (el título sigue siendo obligatorio solo para
  "Entrenamiento", donde no hay rival). Si no pones título en un partido,
  se muestra automáticamente "vs [Rival]" en el calendario, en la lista de
  eventos del día y en el PDF exportado.
- **Eventos de varios días**: nuevo campo "Hasta" (opcional) al crear un
  evento. Si lo rellenas, ese evento aparece en todos los días del rango
  (calendario, lista del día y PDF) — útil para concentraciones,
  pretemporadas, torneos de varios días, etc.
- **Semáforo de intensidad** (rojo/amarillo/verde): al crear cualquier
  evento puedes marcar opcionalmente su intensidad esperada — se ve como
  un puntito de color junto al del tipo de evento en el calendario
  (pantalla), y como un punto de color delante del texto en el PDF
  exportado. Tiene su propia leyenda debajo del calendario.

## Intensidad combinada (hasta 2 niveles a la vez)

El semáforo de intensidad ya no es de elección única — ahora puedes marcar
**hasta 2 niveles a la vez** (por ejemplo, rojo + amarillo para una
intensidad intermedia-alta, o verde + amarillo para intermedia-baja). El
tercer botón se bloquea automáticamente si ya tienes 2 marcados. Se
muestra siempre en el mismo orden (verde→amarillo→rojo) sin importar en
qué orden los marcaste, tanto en los puntos del calendario como en el
texto del PDF exportado ("Intensidad baja-media", etc.).

## "Mi Perfil Deportivo" para el jugador

Nuevo botón destacado en el calendario del jugador ("📊 Ver mi Perfil
Deportivo") que abre una pantalla con sus propios resultados de tests:

- **Interpretación automática** de su último resultado (Sentadilla, CMJ,
  Wingate), igual que ya veía el entrenador.
- **Los dos cuadrantes, con trayectoria**: en vez de un selector de fecha
  para ver "un test u otro", se muestra una **línea que conecta todos sus
  tests en orden cronológico**, con el resultado más reciente destacado al
  final — así ve de un vistazo si ha ido mejorando hacia la zona verde del
  cuadrante a lo largo de la temporada, no solo dónde está hoy.
- **Evolución por variable**: mini-gráficos de línea de cada métrica
  (Sentadilla, CMJ, Potencia, Índice de fatiga) a lo largo del tiempo.

Los cuadrantes reutilizan exactamente el mismo componente que ya usa el
entrenador (mismos umbrales, colores y leyenda) — se les añadió la opción
de dibujar esa línea de trayectoria, que solo aparece cuando se le pasan
datos históricos (así el uso que ya hacía el entrenador no cambia en
absoluto).

## "App Entrenamiento" — Biblioteca de ejercicios (fase 1)

Nueva sección **totalmente aparte** del control de cargas — pensada para
programas de trabajo complementario (gimnasio), no para las sesiones de
equipo del calendario ya existente.

- **Añadir ejercicios**: nombre + enlace de YouTube (se reconoce
  automáticamente el vídeo y se muestra su miniatura como confirmación) +
  toda tu taxonomía: Categoría, Miembro, Lateralidad, Patrón de
  movimiento, Contracción (agrupada visualmente en Dinámico/Isométrico al
  elegir) y Material (selección múltiple, con chips).
- **Biblioteca en cuadrícula**, cada ejercicio con su miniatura de vídeo,
  etiquetas visibles, y opción de editar/eliminar.
- **Filtros**: por texto, categoría, miembro, patrón y material — para
  encontrar rápido lo que buscas cuando la biblioteca crezca.

Esta es la primera de las tres piezas que hablamos (biblioteca → planes →
asignación). Las siguientes fases (crear planes combinando estos
ejercicios, y asignarlos a jugadores con un calendario que ellos vean) se
construirán sobre esta misma base, cuando quieras retomarlo.

## Autocompletar el nombre del ejercicio desde YouTube

Al pegar el enlace de un vídeo al añadir un ejercicio, si el campo
"Nombre" está vacío, la app busca automáticamente el título real del
vídeo en YouTube (usando su servicio público de "oEmbed", sin necesidad de
clave ni configuración) y lo rellena solo. Si ya has escrito algo en
"Nombre" (o estás editando un ejercicio existente), no lo toca — solo
actúa cuando el campo está en blanco. Puedes seguir editando el nombre
libremente después de que se autocomplete, por si el título del vídeo no
es exactamente como quieres llamarlo en tu biblioteca.

## Reproducir el vídeo directamente en la tarjeta del ejercicio

Al pulsar el botón de play en cualquier ejercicio de la biblioteca, el
vídeo se reproduce **incrustado en la propia tarjeta**, sin salir de la
app ni abrir YouTube en otra pestaña. Un botón "✕" en la esquina permite
cerrarlo y volver a la miniatura.

## Selección unilateral en el muñeco, y ciclo menstrual

- **Muñeco unilateral**: las 12 zonas que tienen lado (hombro, brazo, codo,
  antebrazo, muñeca, cuádriceps, rodilla, tibiales, tobillo, pie,
  isquiotibiales, gemelos) ahora se marcan por separado — el jugador toca
  el lado concreto donde tiene la molestia, y el mapa de calor del
  entrenador colorea cada lado de forma independiente. Las 7 zonas sin
  lado (cuello, cadera, psoas, aductores, dorsal, lumbar, glúteos) se
  quedan igual que antes.
- **Ciclo menstrual** (solo visible si `sexo === 'femenino'`): la jugadora
  marca únicamente el día que le empieza la regla — la app deduce sola la
  duración media de su ciclo (a partir de sus propios registros, mejora
  con el tiempo) y en qué fase estimada está hoy (Menstrual, Folicular,
  Ovulatoria, Lútea), con un mensaje explicando qué implica cada fase y un
  aviso claro de que es una estimación por calendario, no una medición
  real. El entrenador ve la misma fase, con el mismo mensaje, en una nueva
  columna "Ciclo" dentro de la pestaña Jugadores.

## Molestias: selección múltiple de zonas

Antes solo se podía marcar una zona (y un lado) por día. Ahora el jugador
puede marcar **tantas zonas como necesite** en el mismo registro — por
ejemplo "Rodilla (Derecho)" y "Hombro (Izquierdo)" a la vez. Se guarda como
una lista, y todo lo que ya dependía de esto se actualizó en consecuencia:
el mapa de calor del entrenador cuenta cada zona marcada por separado, y la
alerta "Molestia reportada hoy" del Resumen muestra todas las zonas de golpe.

## Pizarra Táctica: campo real de hockey, tamaños ajustables, y líneas movibles

- **Campo rediseñado según pista real de hockey sobre patines**: áreas de
  gol rectangulares junto a cada pared, con un círculo mitad sólido /
  mitad discontinuo marcando la zona de portería, y el punto de penalti —
  pista de esquinas redondeadas y círculo central. **Sin porterías
  dibujadas de fondo**: las colocas tú donde te convenga con el elemento
  "+ Portería". "Espacio reducido" y "Gimnasio" se mantienen genéricos.
- **Color propio en cada elemento** (menos porterías): jugadores, conos y
  vallas se pueden pintar de 7 colores distintos.
- **Tamaño ajustable** en conos, vallas y porterías — control deslizante,
  tanto al añadirlos como después, seleccionándolos.
- **Porterías de hockey**: postes naranjas y red con patrón de cuadros
  blanco.
- **4 balones distintos**: hockey (negra, pequeña), fútbol, baloncesto y
  voleibol.
- **Sistema de líneas completo**:
  - 3 herramientas de trazo: **flecha recta**, **flecha curva** (arrastra
    el punto verde para curvarla después de dibujarla) y **lápiz libre**
    (dibujo a mano alzada).
  - 3 estilos de trazo (sólida / discontinua / punteada) — útil para
    diferenciar tipos de desplazamiento (sprint, conducción de balón,
    carrera suave...).
  - **Color y grosor editables en cualquier momento**, tanto al dibujar
    como después.
  - **Las líneas se pueden mover enteras** arrastrándolas desde cualquier
    punto de su trazo, no solo editarse — útil para corregir la posición
    si te equivocas al dibujarla.

## Pizarra Táctica: color de campo, rotación, y biblioteca de ejercicios

- **Color del campo modificable** — selector de color en la barra de
  herramientas, independiente del fondo elegido.
- **Rotación** en conos, vallas y porterías — control deslizante (0-350°)
  en el panel lateral al seleccionarlos, junto al de tamaño.
- **Guardar el ejercicio en una biblioteca propia**, justo debajo de la
  pizarra: nombre, etiquetas (escribes y pulsas Enter — las etiquetas ya
  usadas antes aparecen como sugerencias, así se va formando un
  vocabulario consistente sin tener que recordarlo de memoria),
  descripción y variantes. Al guardar, se genera automáticamente la
  imagen de la escena actual y se guarda todo junto. Debajo aparece una
  galería con todo lo guardado hasta ahora, con opción de borrar.

Esta biblioteca (`ejercicios_pizarra`) es independiente de la biblioteca
de vídeos de YouTube de "App Entrenamiento" — cada una guarda un tipo de
contenido distinto (imagen de pizarra vs. vídeo), pensadas para
propósitos distintos.

## Ejercicios externos en la biblioteca, y líneas visibles en campos claros

- **Subir ejercicios externos**: nueva sección junto al formulario de la
  pizarra, con dos orígenes — **imagen** (subida desde tu ordenador, máx.
  2 MB) o **enlace de YouTube** (reconoce el vídeo automáticamente, igual
  que en "App Entrenamiento"). Mismo sistema de nombre, etiquetas
  (compartiendo las sugerencias con los ejercicios creados desde la
  pizarra), descripción y variantes. Todo queda en la misma galería,
  distinguiendo visualmente los vídeos (con su botón de play hacia
  YouTube) de las imágenes.
- **Contraste automático en campos claros**: si eliges un color de campo
  claro (blanco, por ejemplo), las marcas del terreno de juego (líneas,
  círculos, áreas) pasan a dibujarse en negro en vez de blanco — antes
  eran siempre blancas y se volvían invisibles sobre fondos claros. El
  color por defecto de las flechas nuevas también se ajusta solo (blanco
  sobre campo oscuro, negro sobre campo claro) — se añadió además el negro
  como opción en la paleta de colores para poder elegirlo tú mismo cuando
  quieras, sea cual sea el campo.

## Nueva pestaña "📋 Sesiones" — hojas de sesión desde la biblioteca de pizarra

- **Crea una sesión**, ponle título y fecha, y ve añadiendo ejercicios
  desde tu biblioteca (buscándolos por nombre o etiqueta) — puedes
  reordenarlos con las flechas ↑↓ y quitar los que no quieras.
- **Cada ejercicio tiene sus propias variables para esa sesión concreta**:
  series, repeticiones, intensidad, tiempo de trabajo, tiempo de
  descanso, y una nota — separadas de la descripción general del
  ejercicio en la biblioteca, porque el mismo ejercicio puede usarse
  distinto según la sesión.
- **Exportar a PDF**: reutiliza el mismo tema claro de impresión de toda
  la app — imagen/miniatura de cada ejercicio, su descripción, y las
  variables de esa sesión en una hoja lista para imprimir o guardar.
- **Ver como diapositivas**: una vista dentro de la propia app, un
  ejercicio a pantalla completa con su vídeo/imagen grande, variables y
  descripción, con botones Anterior/Siguiente — pensada para repasar la
  sesión con el equipo o entrenador a distancia sin tener que imprimir nada.

## Etiquetas clicables, bidones y formas geométricas en la Pizarra

- **Etiquetas ya usadas, ahora clicables**: en ambos formularios de la
  biblioteca (pizarra y externos) aparece, debajo del campo de texto, la
  lista de etiquetas que ya has creado antes — un clic las añade, sin
  tener que volver a escribirlas.
- **Bidones**: nuevo tipo de obstáculo, junto a conos y vallas, agrupados
  ahora en un único desplegable con un botón "+ Añadir" (antes eran
  botones sueltos).
- **Formas geométricas**: círculo, cuadrado, rectángulo, triángulo y
  pentágono, con su propio desplegable. Se pueden usar como marcadores
  visuales de una zona del campo — tienen **tamaño y opacidad ajustables**
  (además de color y rotación), pensadas para ponerlas de fondo delimitando
  espacios sin taparlo todo.
- El título automático desde YouTube y las etiquetas ya existían de una
  pasada anterior de este mismo bloque de trabajo — confirmado que
  funcionan correctamente.

## Formas geométricas: tamaño sin límite arrastrando, y rectángulo libre

- **Tirador de esquina**: cualquier forma seleccionada muestra un pequeño
  cuadrado verde en su esquina — arrástralo para agrandarla o encogerla
  sin ningún límite superior, en vez de depender solo del slider.
- **Nueva herramienta "▭ Rectángulo libre"**: dibújalo arrastrando por la
  pizarra, igual que una flecha, con el ancho y alto exactos que quieras
  (no una forma proporcional escalada) — pensado para delimitar una zona
  concreta del campo a tu medida. Una vez creado, se puede seguir
  ajustando arrastrando su propio tirador, o escribiendo el ancho/alto a
  mano en el panel lateral.

## Reproductor inline, PDF de sesión completo, logos, y pantalla completa + grabación

- **Vídeo dentro de la propia app**: en la galería de la biblioteca de
  pizarra, los ejercicios de YouTube ahora se reproducen incrustados al
  pulsar play, igual que en "App Entrenamiento" — sin salir a YouTube.
- **Imágenes completas en el PDF de sesión**: se recortaban porque el
  documento reutilizaba el recuadro pequeño de la pantalla (pensado para
  verse en una lista, no para imprimir). Ahora, solo al exportar, cada
  ejercicio pasa a mostrarse en columna con la imagen completa (sin
  recortar, escalada para que quepa entera).
- **Logo del entrenador y escudo del equipo en la cabecera del PDF**:
  nuevo campo "Equipo destinatario" (opcional) al crear la sesión — si lo
  rellenas, su escudo aparece a la derecha del título, y tu logo personal
  (el mismo que configuraste para "Sin asignar") a la izquierda, si lo
  tienes subido.
- **Pantalla completa** en las diapositivas, con un botón dedicado.
- **Grabar pantalla**: botón que graba pantalla + micrófono (si das
  permiso) mientras pasas las diapositivas explicando en voz alta, y al
  terminar descarga el vídeo automáticamente en tu ordenador (formato
  .webm). Aviso honesto: esta función depende del navegador — funciona
  bien en Chrome/Edge y Safari de escritorio, pero **no está disponible en
  navegadores de móvil/tablet** (ninguna app puede saltarse esa
  limitación, es una restricción del propio sistema operativo).

## Modelo de Readiness (Manu Sola Arjona), aplicado a bienestar y a carga

Nueva librería `readiness.js` que implementa el modelo de Manu Sola
Arjona — igual espíritu que el ACWR, pero con una **resta** (Agudo −
Basal) en vez de un cociente, más dos derivadas de tendencia (delta
diario y delta semanal). **No se añade ninguna pregunta nueva al
jugador**: el "Readiness percibido" (1=peor·5=mejor, la escala de Manu
Sola) se traduce directamente del índice de bienestar que ya rellena cada
día, simplemente invertido de dirección.

- **Readiness Agudo** = media de los últimos 7 días · **Readiness Basal**
  = media de los últimos 90 días · **Diferencia** = Agudo − Basal.
- **Delta diario** = cuánto cambia esa Diferencia de un día a otro (umbral
  ±0.5, tal y como venía en el Excel original) · **Delta semanal** =
  media de la Diferencia de la última semana vs. la semana anterior.
- El mismo modelo (diferencia + deltas) también se aplicó a la
  **carga/RPE**, como complemento del ACWR ya existente — nueva variable
  "Carga (Diferencia Agudo-Crónico)".
- Ambas ("Readiness (Diferencia)" y "Carga (Diferencia Agudo-Crónico)")
  son dos nuevas opciones en el selector de variable del gráfico de
  Resumen, con su hueco correspondiente en el informe de 5→7 gráficos y en
  el PDF exportado.
- Nueva alerta **"Caída de Readiness hoy"** en el bloque de Alertas,
  usando el umbral fijo del propio Excel de Manu Sola (delta diario ≤ -0.5).
- Nueva sección en **Referencias**, con un aviso honesto: a diferencia del
  resto de variables de esa página (que citan artículos científicos
  revisados por pares), este modelo viene de la metodología práctica de un
  preparador físico concreto, no de un paper — se dice así de claro para
  que sepas qué tipo de respaldo tiene cada dato.

**Nota técnica**: no pude acceder a los dos vídeos de YouTube que
compartiste (bloqueo temporal de acceso), así que la implementación se
basó enteramente en las fórmulas y el formato condicional (colores/umbrales)
del propio Excel que subiste — que son la fuente más fiable posible, ya
que es la lógica de cálculo real, no una interpretación de algo hablado.

## Bienestar unificado: 1 siempre es malo, 5 siempre es bueno

Detectado un problema real: el Bienestar (estilo Hooper) usaba 1=mejor·
5=peor, mientras que el Readiness que añadimos hace poco usa la dirección
contraria (1=peor·5=mejor) — ambos convivían en el mismo Resumen con
polaridades opuestas, lo cual podía confundir al leer los gráficos.

Ahora **toda la app usa una única dirección: 1 es siempre lo peor, 5 es
siempre lo mejor** — en Bienestar, en Readiness, y en cualquier sitio
donde se muestre. Como consecuencia directa de esto, "Readiness percibido"
pasa a ser **literalmente el mismo dato** que "Bienestar" — mismo
cuestionario, misma escala — así que el código quedó más simple (ya no
hace falta ninguna conversión entre uno y otro, `readiness.js` reutiliza
directamente el cálculo de `bienestar.js`).

Cambios visibles:
- La variable "Bienestar (malestar)" del gráfico de Resumen pasa a
  llamarse simplemente **"Bienestar"**, con las bandas de color
  invertidas (ahora rojo abajo, verde arriba, como el resto de variables).
- La tabla del Índice de Hooper en Referencias tiene los umbrales
  actualizados (antes ≤2 óptimo, ahora ≥4 óptimo).
- Nada de esto cambia lo que el jugador rellena — solo cómo se interpreta
  el resultado internamente.

## Eliminar jugador directamente desde la App

Nuevo botón "✕" en la pestaña Jugadores, al final de cada fila. Pide
escribir el nombre exacto del jugador para confirmar (es una acción
**irreversible** — borra su cuenta y todos sus datos: registros diarios,
tests, lesiones, ciclo...).

### Por qué hizo falta una pieza nueva de "servidor"

Borrar de verdad una cuenta de usuario (no solo su ficha) es algo que
Supabase no permite hacer desde el navegador por seguridad — requiere una
clave especial de administrador que nunca puede llegar al código que se
ejecuta en tu ordenador. Se ha creado `api/eliminar-jugador.js`, una
función que Vercel ejecuta en su propio servidor (no en el navegador),
donde esa clave está a salvo.

### Configuración necesaria en Vercel (una sola vez)

1. Ve a tu proyecto de Supabase → **Project Settings → API**.
2. Copia la clave **`service_role`** (la secreta, no la `anon` que ya
   usas) — **nunca la compartas ni la subas a GitHub**.
3. Ve a tu proyecto en Vercel → **Settings → Environment Variables**.
4. Añade una nueva variable: nombre `SUPABASE_SERVICE_ROLE_KEY`, valor la
   clave que copiaste. Aplícala a Production (y a Preview/Development si
   las usas).
5. Vuelve a desplegar (un nuevo `git push` ya lo dispara, o puedes forzar
   un "Redeploy" desde el panel de Vercel).

Sin este paso, el botón de eliminar dará un error claro pidiéndote que
revises la configuración — no fallará en silencio.

## Ciclo menstrual: indicar una fecha pasada, no solo "hoy"

Junto al botón de "Hoy me ha venido la regla" hay ahora un enlace
"¿No fue hoy? Indica otra fecha" — pensado para cuando una jugadora se da
de alta y su última regla ya pasó hace unos días: puede introducir esa
fecha directamente, sin esperar al siguiente ciclo, para que la
estimación de fase empiece a funcionar desde el primer momento. También
sirve para rellenar un día que se te haya olvidado marcar más adelante.
No permite fechas futuras.

## Logo personal completado, cabecera fija en todas las páginas, y más personalización

- **Sitio para subir tu logo personal**: se había quedado a medio
  construir (la base de datos existía, pero nunca llegó el formulario) —
  ahora hay una tarjeta dedicada arriba del todo en la pestaña Equipos.
- **Arreglada la página en blanco** al exportar sesiones a PDF — la causa
  real era que los escudos estaban posicionados de forma que interferían
  con el propio flujo del documento.
- **El escudo y tu logo ahora se repiten en todas las páginas** del PDF
  (no solo en la primera), usando una cabecera fija — funciona bien en
  Chrome y Firefox; en Safari el comportamiento de este tipo de cabecera
  fija al imprimir puede variar algo según la versión.
- Dos detalles más de personalización, también repitiéndose en cada
  página: una **barra de color** arriba con el color de identidad del
  equipo destinatario, y un **pie de página** con tu nombre, el título de
  la sesión, y la fecha de generación.

## Ajustes al PDF de sesión, a partir de una prueba real

- **Franja verde eliminada** de la cabecera, tal y como pediste.
- **Título más grande** (de 20px a 27px), recortando el espacio que
  ocupaba debajo para que no reste sitio a la página.
- **Imágenes mejor aprovechadas**: el motivo real por el que se veían
  pequeñas, con mucho hueco gris a los lados, es que el alto máximo
  estaba fijado en 320px — eso obligaba al ancho a encogerse mucho más de
  lo necesario en una página bastante más ancha. Se amplió ese límite a
  480px, así que ahora el ancho de la página es lo que manda, no el alto.
- **Logo personal**: el código para mostrarlo ya estaba correcto (se
  confirmó revisándolo) — lo que faltaba era subir la imagen desde la
  nueva tarjeta "Tu logo personal" en Equipos, que se construyó en la
  actualización anterior. En cuanto la subas, aparecerá solo.

## Gráfico combinado de Bienestar + nomenclatura unificada + limpieza

- **"Readiness" renombrado a "Bienestar" en toda la app** — variables,
  alertas, gráfico y Referencias. Como quedó explicado hace unas
  actualizaciones, "Readiness percibido" y "Bienestar" son literalmente el
  mismo dato, así que ya no tenía sentido usar dos palabras distintas.
- **Nuevo gráfico combinado**: al elegir "Bienestar" en el desplegable del
  Resumen (tanto en el gráfico principal como en el informe de 5→9
  variables), ahora se ven **3 líneas juntas con leyenda**, igual que
  plantea el propio Excel de Manu Sola Arjona:
  - **Percibido** (gris, punteada): el dato de ese día en concreto.
  - **Agudo** (verde lima, sólida): su media de los últimos 7 días.
  - **Basal** (ámbar, discontinua): su media de los últimos 90 días — su
    normalidad de fondo.
  
  Con una nota explicando cómo leerlas: cuando el Agudo se aleja
  claramente por debajo del Basal varios días seguidos, suele merecer la
  pena prestar atención.
- **Delta Diario y Delta Semanal de Bienestar**, que ya estaban calculados
  pero nunca se habían conectado a ninguna pantalla, ahora son dos
  opciones más del desplegable — con las bandas de color del umbral fijo
  original (±0.5) en el caso del diario.
- Limpieza de paso: varios archivos sueltos huérfanos en `src/lib/`
  (restos de una anomalía de hace tiempo en el repositorio) eliminados —
  no afectaban al funcionamiento, pero ensuciaban el proyecto.

## Atajo Calendario → Planificación

En el panel de un día con algún evento (Calendario de club), nuevo botón
**"→ Planificar la duración de este día"** — te lleva directo a
Planificación, con esa misma fecha y ese mismo equipo ya seleccionados,
lista de jugadores esperando. No une los dos sistemas (el Calendario
sigue sin afectar a los cálculos de carga, como ya sabes) — es solo un
atajo de navegación para no tener que buscar la misma fecha dos veces.

## Desplegable de Resumen recortado a 5 variables

El desplegable del gráfico principal (y el informe de 5 gráficos que se
exporta a PDF, ya que comparten el mismo listado) se quedan solo con:
**Carga, ACWR Post, Monotonía, Fatiga (Strain) y Bienestar** (el
combinado con Percibido/Agudo/Basal). Las 4 variables derivadas que
habíamos ido añadiendo (Diferencia y Deltas de Bienestar, Diferencia de
Carga) siguen calculándose por dentro — la alerta "Caída de Bienestar
hoy" sigue funcionando igual — solo se quitaron del desplegable y del PDF
para no saturar la vista.

## Leyenda del gráfico de Bienestar corregida

La librería de gráficos posicionaba mal su leyenda automática dentro del
hueco pequeño del mini-gráfico (se veía flotando en mitad del gráfico, tal
y como se vio en un PDF exportado real). Arreglado de raíz: en vez de
depender de ese posicionamiento automático, la leyenda (Percibido /
Agudo / Basal, con una muestra del trazo de cada línea) se construye
ahora como texto normal encima del gráfico — fiable tanto en pantalla
como en el PDF, sin depender de cómo la librería decida colocarla en un
espacio reducido. Aplicado tanto al gráfico principal como al mini-gráfico
del informe/PDF.

## Editar eventos del Calendario

Cada evento del día seleccionado tiene ahora un botón **"Editar"** además
del de eliminar — abre el mismo formulario ya relleno con sus datos
(tipo, título, rival, hora, lugar, notas, fecha fin, intensidad), listo
para corregir lo que haga falta y pulsar "Guardar cambios". El formulario
se marca como "Editar evento" mientras estás en ese modo, con un enlace
"Cancelar" para volver al modo normal de añadir uno nuevo sin guardar
nada.

## Calendario también para deportistas sin club

Hasta ahora el Calendario solo funcionaba con un equipo concreto — un
deportista "Sin asignar" se quedaba sin poder tener su propia agenda.
Ahora, seleccionando "Sin asignar" en el "◎", la app te pide elegir a qué
deportista individual le quieres llevar el calendario (con un selector
para cambiar de jugador sin salir de la pantalla), y a partir de ahí
funciona exactamente igual que con un equipo: mismos tipos de evento,
misma intensidad, y el mismo campo de **notas** para detallar el
contenido de la sesión.

Un evento ahora pertenece a un equipo **o** a un jugador individual,
nunca a los dos a la vez — el atajo "Planificar la duración de este día"
sigue apareciendo solo para equipos, ya que Planificación por jugador
individual se hace directamente desde esa pestaña.

## "Media pista" ya es un recorte real, como tu referencia

Antes, "Media pista" mostraba el lienzo entero (con el círculo central
completo) y solo quitaba una portería — no era un recorte de verdad.
Ahora tiene su propia forma: esquinas redondeadas solo en el lado de la
portería, el lado de la línea de medio campo queda recto (sin redondear),
y el círculo central aparece cortado como una media luna, tal y como en
tu foto de referencia.

**Un matiz honesto**: para no arriesgar a desproporcionar el dibujo,
mantuve la misma escala de coordenadas que "Pista completa" — así que la
mitad izquierda del lienzo queda con el color de fondo pero sin marcas
(no ocupa todo el ancho como en tu foto, que está pensada solo para media
pista desde el principio). Si prefieres que la media pista se agrande
para llenar todo el lienzo, dímelo y lo ajusto en otra pasada.

## Nuevas zonas en el muñeco de molestias/lesiones

- **Pectoral** (izquierdo/derecho) — nueva zona en la vista frontal.
- **Escapular** (izquierdo/derecho) — nueva zona en la vista posterior.
- **Aductor**: antes era una única zona central ("Aductores") — ahora se
  distingue izquierdo/derecho, igual que el resto de zonas con lado
  (cuádriceps, isquiotibiales, etc.).

Todo esto funciona igual que las zonas ya existentes: selección múltiple
para el jugador, y el mapa de calor del entrenador las cuenta y colorea
por separado automáticamente, sin necesitar ningún cambio adicional en el
resto de la app.

## Varias sesiones el mismo día (Pista + Gimnasio) y contenido con modo lectura

- **Un jugador ya puede tener más de una sesión el mismo día**, siempre
  que sean de tipo distinto — planificas "Pista, 45 min", guardas,
  cambias el desplegable a "Gimnasio, 30 min" y guardas otra vez: ahora
  conviven las dos en vez de que la segunda borre la primera. La carga
  del día **suma automáticamente ambas duraciones** para el cálculo de
  RPE × duración — no hace falta que sumes tú nada a mano.
- Al cambiar el desplegable de tipo de sesión, los campos se rellenan
  solos con los datos YA guardados de ese tipo concreto (o en blanco si
  todavía no hay ninguna).
- **Contenido de la sesión**: una vez guardado, se muestra como texto de
  lectura completo (con saltos de línea conservados), con un botón
  **"✎ Editar contenido de sesión"** para volver a modificarlo — en vez de
  tener siempre el cuadro de texto abierto, evitando tocarlo sin querer.

## Arreglo de raíz: desfase de fechas en toda la app

Encontrado el motivo real del "23/08 en vez de 22/08" del mapa de calor:
`toISOString()` convierte la fecha a hora UTC antes de darla — eso
desplaza el día para cualquier usuario que no esté exactamente en ese
huso horario (España, por ejemplo, siempre va por delante). Y no era solo
el mapa de calor: **este mismo patrón aparecía en 15 archivos de toda la
app** — el "hoy" de Planificación, Calendario, Tests, Lesiones, Ciclo
menstrual, y las ventanas de 7/28/90 días de ACWR y Bienestar en las
propias librerías de cálculo.

Se creó una única función compartida (`fechaISOLocal`, en
`src/lib/fechas.js`) que da la fecha tal y como la ve el usuario en su
propio reloj, y se sustituyó **cada** uso del patrón problemático por
esta función, en los 15 archivos afectados — incluidas las dos librerías
de cálculo (`cargaMetrics.js`, `bienestarTendencia.js`), así que esto
también corrige de raíz cualquier pequeño desajuste que pudiera haber
habido en las ventanas de ACWR, Monotonía o Bienestar Agudo/Basal por el
mismo motivo.

## Bienestar de hoy — vistazo rápido antes de la sesión

Esta parte ya estaba construida (de un paso anterior de este mismo
bloque que no tenía completamente a la vista) — la revisé a fondo y
confirmé que está bien hecha: nueva tarjeta arriba del Resumen, con una
ficha de color por jugador (verde/ámbar/rojo, igual que el resto de la
app), ordenadas mostrando primero a quien peor está — pensada exactamente
para el vistazo rápido antes de empezar la sesión que pedías. Con el
arreglo de fechas de arriba, ahora muestra el día correcto de verdad.

## Pizarra: línea recta, cuadro de texto, y vídeo del movimiento

- **Línea recta**: nueva herramienta "— Línea recta", con los mismos
  colores/grosor/trazo que la flecha, pero sin punta — para marcar
  límites o referencias que no representan un desplazamiento.
- **Cuadro de texto**: botón "+ Texto" para escribir directamente en la
  pizarra (admite varias líneas), con color y tamaño de letra ajustables
  desde el panel lateral, igual que el resto de elementos.
- **Vídeo del movimiento de jugadores** — la pieza grande de esta
  actualización:
  - Colocas a los jugadores, pulsas **"📷 Capturar fotograma"**.
  - Los mueves a la siguiente posición, capturas otro fotograma. Repite
    tantas veces como necesites.
  - Pulsas **"▶ Generar vídeo del movimiento"**: la pizarra se anima sola
    (interpolando el desplazamiento entre cada par de fotogramas
    consecutivos) mientras se graba la pantalla — al terminar, se
    descarga automáticamente un vídeo (.webm) mostrando ese movimiento.
  - Al acabar, la pizarra vuelve tal y como estaba antes de generar el
    vídeo — los fotogramas capturados se quedan guardados por si quieres
    volver a generarlo o añadir alguno más.

**Aviso honesto**: esto reutiliza la misma grabación de pantalla que ya
construimos para las diapositivas — funciona bien en Chrome/Edge/Safari
de escritorio, pero no está disponible en navegadores de móvil/tablet (es
una limitación del propio sistema operativo, no de la app).

## Vídeo del movimiento: sin "compartir pantalla", con previa, MP4, y corrección de fotogramas

- **Ya no pide compartir pantalla**: en vez de grabar toda la pantalla,
  ahora se graba directamente el propio dibujo de la pizarra en un
  lienzo interno — sin ningún permiso del navegador de por medio.
- **Previsualización**: al terminar de generar, aparece un reproductor de
  vídeo justo en la propia pizarra, con controles, antes de decidir qué
  hacer con él.
- **Formato**: se intenta grabar directamente en **MP4** (funciona en
  Safari, que sí lo soporta de forma nativa); si el navegador no lo
  permite (Chrome y Firefox, por ahora, solo graban en su formato nativo
  WEBM), se usa WEBM automáticamente en su lugar — un aviso honesto: no
  puedo forzar el MP4 en todos los navegadores, es una limitación real de
  cómo graban vídeo hoy en día.
- **Guardar en la biblioteca**: nuevo botón que sube el vídeo a un
  almacenamiento de archivos de verdad (Supabase Storage — un vídeo no
  cabe razonablemente como texto en la base de datos, a diferencia de las
  imágenes), con su propio formulario de nombre/etiquetas/descripción.
  Aparece en la galería de siempre, ya como un reproductor de vídeo
  normal. Al borrarlo, también se limpia el archivo del almacenamiento.
- **Flechas ◀ ▶ para revisar y corregir fotogramas**: navega entre los ya
  capturados, y si ves un error, corrígelo y pulsa "Actualizar fotograma"
  para sobrescribirlo en su sitio, sin tener que empezar de cero.

## Rotulador para dibujar encima de las diapositivas

Nuevo botón **"✎ Rotulador"** en las diapositivas — al activarlo, aparece
un lienzo transparente encima de la imagen o vídeo del ejercicio, donde
puedes dibujar a mano alzada (6 colores + grosor ajustable) para señalar
movimientos, zonas o indicaciones mientras explicas. Botón "🧹 Borrar"
para limpiar, y se borra solo al cambiar de diapositiva (las anotaciones
son de ese ejercicio concreto).

**No hizo falta tocar la grabación de pantalla**: como ya graba
literalmente lo que se ve en pantalla, tus trazos aparecen solos en el
vídeo grabado, sin componer nada por separado — se activa el rotulador,
se graba pantalla, y se dibuja mientras se explica, tal y como pedías.

Cuando el rotulador está activo, el lienzo capta el ratón/dedo por
encima del vídeo o imagen (para poder dibujar) — desactívalo para volver
a poder tocar los controles del vídeo con normalidad.

## Biblioteca grande al crear sesiones, filtro de varias etiquetas, y fotogramas arreglados

- **Biblioteca en modal grande**: al crear una sesión, el botón "🔍 Explorar
  biblioteca y añadir ejercicios" abre una ventana amplia con cuadrícula de
  tarjetas grandes (imagen o vídeo, nombre, etiquetas) — mucho más cómoda
  para buscar que la lista estrecha de antes. Esta parte ya estaba
  programada de un paso anterior, pero le faltaba **todo el estilo visual**
  (por eso probablemente se veía mal) — completado ahora.
- **Filtro de varias etiquetas a la vez**: dentro del mismo modal, clica
  tantas etiquetas como quieras combinar (se muestran solo los ejercicios
  que tengan TODAS las etiquetas marcadas) — también programado ya, solo
  le faltaba el estilo.
- **Vídeos grabados en la biblioteca**: se me había quedado un hueco — las
  miniaturas y vistas no contemplaban los vídeos de movimiento que
  guardamos hace poco; ya se ven correctamente tanto en el modal como en
  la lista de ejercicios de la sesión.

## Fotogramas: arreglado el fallo, y barra de botones fija

Encontrado el motivo exacto de "solo puedo capturar uno": capturar dejaba
el fotograma recién creado "seleccionado", así que el siguiente clic lo
sobrescribía en vez de crear uno nuevo. Rediseñado con la barra que
pediste, siempre visible:

- **📷 Capturar fotograma** — siempre añade uno nuevo, nunca sobrescribe.
- **◀ / ▶** — navega entre los ya capturados.
- **💾 Guardar cambios** — aparece solo mientras revisas un fotograma
  concreto, para corregirlo en su sitio sin crear uno nuevo por error.
- **▶ Reproducir / ⏸ Pausa** — repasa la secuencia animada en la propia
  pizarra, sin grabar nada, antes de exportar.
- **⬇ Exportar secuencia** — genera y descarga/guarda el vídeo, como ya
  teníamos.

## Panel de "Movimiento de jugadores" más compacto

- **Plegado por defecto** (esto ya estaba hecho de un paso anterior) —
  cabecera de una sola línea con el número de fotogramas, se despliega
  solo al pulsarla.
- **Quitada la lista de "Fotograma 1, 2, 3..."** que pediste — redundante
  con las flechas ◀ ▶, que ya cumplen esa función. Los botones "💾
  Guardar cambios" y "🗑 Eliminar" (para el fotograma que estás viendo)
  pasan a la propia barra de herramientas, en vez de estar en esa lista.
- Quitado el párrafo explicativo largo (ahora es un texto emergente al
  pasar el ratón por la cabecera) y apretados los espacios — la tarjeta
  ocupa bastante menos alto, tanto plegada como desplegada, dejando ver
  antes la pizarra y sus herramientas de dibujo.
- De paso, arreglado un desajuste de código que quedó de la actualización
  anterior (un cierre de etiqueta suelto) que podía haber causado
  problemas al compilar.

## Estimación del 1RM de Sentadilla por perfil carga-velocidad

Al seleccionar el test de "Sentadilla", ahora aparecen **4 recuadros de
carga (kg) + velocidad media propulsiva (m/s)** en vez de un único campo.
Con esos 4 puntos:

1. Se calcula la **regresión individual** del jugador (Velocidad =
   pendiente × Carga + intercepto) — el mismo enfoque de Jidovtseff et al.
   (2011) para press banca, pero aplicado a sus propios datos.
2. Se extrapola esa recta hasta **0.30 m/s** — la velocidad específica a
   la que la sentadilla completa alcanza el 1RM, según Conceição,
   Fernandes, Lewis, González-Badillo y Jiménez-Reyes (2016, *J Sports
   Sci*) — en vez de hasta velocidad cero (que es un punto específico de
   press banca, no de sentadilla).
3. El 1RM resultante alimenta automáticamente el resto de la app tal y
   como ya funcionaba: relación kg/peso corporal, interpretación
   Fuerte/Poco fuerte, y posicionamiento en el cuadrante Sentadilla-CMJ.

Los 4 pares de datos introducidos se guardan junto al resultado (columna
nueva `datos_carga_velocidad`), para poder auditar de dónde salió cada
número si hace falta revisarlo más adelante. Nueva referencia añadida a
la pestaña Referencias explicando el método y su respaldo científico.

**ISO SQ** (el test isométrico) se queda como estaba — un único valor de
carga, sin velocidad — ya que es un ejercicio distinto que no usa este
método.

## Sentadilla: cambiado a la fórmula de González-Badillo/Sánchez-Medina

Sustituido el método de estimación del 1RM de sentadilla — de la regresión
individual (Conceição et al.) a la **ecuación de grupo de Sánchez-Medina,
Pallarés, Pérez, Morán-Navarro y González-Badillo (2017)**, el estudio más
grande de los revisados (489 repeticiones, 80 sujetos, R²=0.958). Es una
parábola, no una recta, que relaciona directamente el %1RM con la
velocidad media propulsiva.

**Cómo se aplica con tus 4 cargas**: por cada carga se despeja su propio
%1RM (resolviendo la ecuación de segundo grado), se calcula el 1RM
implícito en ese punto (carga ÷ %1RM), y el resultado final es la
**media de las 4 estimaciones** — se aprovechan los 4 datos para un
resultado más estable, en vez de depender de un único punto o de una
recta que un solo dato con ruido podría desviar.

Verificado con una simulación completa: generando 4 cargas con la
velocidad exacta que predice la propia fórmula para un 1RM conocido, el
cálculo recupera ese mismo 1RM con precisión exacta — confirma que el
despeje matemático de la parábola está bien resuelto.

Actualizada la interfaz (nota explicativa) y la referencia científica en
la pestaña Referencias con la cita correcta.

## Sentadilla: método híbrido (regresión individual + ancla de González-Badillo)

Combinado lo mejor de los dos enfoques que habíamos probado:

1. **Regresión lineal individual** con tus 4 puntos (carga, velocidad) —
   se adapta al perfil y técnica de cada jugador concreto.
2. Extrapolada hasta la velocidad que, al 100% del 1RM, predice la propia
   parábola de Sánchez-Medina, Pallarés, Pérez, Morán-Navarro y
   González-Badillo (2017) — **0.3242 m/s**, calculada directamente de su
   ecuación (no un valor suelto de otra tabla), así el punto de anclaje
   es coherente con el estudio de mayor tamaño muestral revisado.

Verificado matemáticamente con dos simulaciones: si un sujeto siguiera
exactamente la curva de grupo, el método da 104 en vez de 100 — no es un
fallo, es la consecuencia esperable de ajustar una recta (el perfil
individual) sobre una parábola (la ecuación de grupo); una recta nunca
encaja perfectamente sobre una curva. Es el compromiso razonable de
adaptarse al individuo en vez de seguir la parábola de grupo al pie de la
letra.

## Calendario y Planificación unificados en un solo sitio

Ahora, al crear o editar un evento en el **Calendario**, todo se indica
junto en el mismo formulario: tipo de evento, tipo de sesión
(Pista/Gimnasio/Recuperación, para entrenamientos), intensidad,
duración (minutos), y contenido de la sesión (solo lo ves tú) — antes
había que ir a Planificación aparte para la duración y el contenido.

Al guardar un evento con duración rellenada, se crean o actualizan
automáticamente las sesiones de **todos los jugadores del equipo activo**
(o del jugador individual, si estás en modo "Sin asignar") ese día — el
mismo efecto que antes lograbas yendo a Planificación en modo "Todo el
grupo".

**Planificación sigue existiendo**, pero ahora solo hace falta para el
caso concreto de querer poner una **duración distinta a cada jugador** —
el atajo desde el Calendario se renombró a "→ Poner una duración distinta
por jugador" para dejar claro cuándo hace falta.

Un aviso honesto sobre el comportamiento: si borras un evento del
Calendario, **no se borran** las sesiones ya creadas de los jugadores
(por si alguno ya había registrado su RPE contra esa sesión) — solo se
borra el evento del calendario en sí.

## Sentadilla: la estimación de 1RM ya admite de 1 a 4 cargas

Antes hacían falta al menos 2 cargas (mínimo para poder calcular una
recta). Ahora también funciona con **una sola carga**:

- **1 carga**: no hay datos para una pendiente propia, así que se usa
  directamente la ecuación de grupo de González-Badillo, despejando el
  %1RM de esa única medición.
- **2, 3 o 4 cargas**: sigue funcionando igual que antes — regresión
  individual extrapolada a la velocidad del 100% del 1RM.

Verificado matemáticamente con una simulación probando las 4 cantidades
de cargas por separado: con 1 carga el resultado es exacto (100.00 para
un 1RM simulado de 100), y con 2/3/4 cargas el error de la regresión
individual **baja cuantas más cargas se añaden** (113→106→104) — confirma
que más datos sí mejoran la estimación, como cabía esperar.

## Nueva tarjeta "RPE de la semana"

Justo debajo de "Bienestar de hoy", en el Resumen — una tabla con cada
jugador del grupo activo en filas y los **últimos 7 días** en columnas,
mostrando el RPE que ha reportado cada uno, coloreado igual que el resto
de la app (verde=bajo, rojo=alto). Los días sin RPE registrado muestran
un guion, para detectar de un vistazo tanto quién ha aportado qué
esfuerzo como quién no ha registrado todavía.

Jugadores con más huecos sin registrar aparecen primero, para que salten
a la vista antes que los que ya tienen la semana completa.

## "Bienestar de hoy" ahora es "Bienestar y RPE del día", con fecha elegible

La tarjeta que antes se llamaba "Bienestar de hoy" pasa a mostrar
**bienestar y RPE juntos**, para la fecha que elijas (selector de fecha +
atajos "Ayer"/"Hoy"), en vez de estar fija siempre al día actual. Cada
tarjeta de jugador muestra ahora también su RPE de ese día (coloreado
igual que el resto de la app), o "—" si no registró sesión.

Útil tanto para el vistazo pre-sesión de siempre como para revisar
retrospectivamente cómo llegó el equipo un día concreto del pasado. La
tabla "RPE de la semana" se mantiene tal cual, para la vista de conjunto
de los últimos 7 días.

## Guardado de vídeo unificado, y edición de ejercicios de la biblioteca

- **Un solo formulario para guardar**: antes había dos sitios distintos
  para guardar en la biblioteca (uno para la imagen de la pizarra, otro
  aparte para el vídeo del movimiento) — ahora es uno solo. Si has
  generado un vídeo con "Exportar secuencia", el formulario "Guardar este
  ejercicio en la biblioteca" lo detecta automáticamente y guarda ESE
  vídeo (con su nombre/etiquetas/descripción/variantes), en vez de una
  imagen estática — el propio título del formulario y el botón cambian
  para dejarlo claro.
- **Editar un ejercicio ya guardado**: nuevo botón "✎ Editar" en cada
  tarjeta de la galería, que abre una ventana con todos sus datos —
  nombre, etiquetas, descripción, variantes, y también la posibilidad de
  **reemplazar el archivo** (subir un vídeo nuevo si es de tipo vídeo,
  una imagen nueva si es de tipo imagen, o cambiar el enlace si es de
  YouTube). Al reemplazar un vídeo, el archivo antiguo se borra del
  almacenamiento para no dejar basura acumulada.

## Próximos pasos posibles

- Añadir las variables específicas de tu Excel de control de cargas.
- Exportar informes en PDF/Excel para el cuerpo técnico.
- Notificaciones para jugadores que no han registrado su RPE del día.
- Vista de comparativa entre jugadores o por posición.
