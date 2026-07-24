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

## Cálculo de carga avanzado (v2, basado en tu Excel)

El panel del entrenador ahora permite elegir el método de cálculo, igual que
en tu Excel de control de cargas:

- **ACWR Coupled**: el ratio agudo:crónico clásico, donde la semana aguda
  (últimos 7 días) está incluida dentro del período crónico (últimos 28 días).
- **ACWR Uncoupled**: el crónico se calcula solo con las 3 semanas *previas*
  a la semana aguda, sin solaparse con ella.
- **Ratio EWMA**: usa medias móviles exponenciales en vez de medias simples,
  dando más peso a los días más recientes — más sensible a cambios bruscos.

También se calculan, sobre los últimos 7 días:
- **Monotonía**: mide si la carga semanal es muy uniforme (sin días de
  descarga). Valores altos indican poca variabilidad, lo que se asocia a
  mayor riesgo si se mantiene en el tiempo.
- **Fatiga (Strain)**: carga semanal total × monotonía. Combina volumen y
  monotonía en un único indicador de riesgo acumulado.

La escala de RPE es ahora de **0 a 10** (0 = ningún esfuerzo, 10 = máximo),
con la misma descripción que usáis en el club.

## Cómo entienden el ACWR las tarjetas de riesgo

`ACWR = carga media de los últimos 7 días / carga media de los últimos 28 días`

- `< 0.8` → Baja carga (posible pérdida de forma)
- `0.8 – 1.3` → Óptimo
- `1.3 – 1.5` → Vigilar
- `> 1.5` → Alto riesgo (subida brusca de carga)

Esto es un cálculo estándar en literatura de ciencias del deporte, pero
podemos afinarlo o cambiar el método (ej. media móvil exponencial) en cuanto
me pases las variables concretas de tu Excel.

## Próximos pasos posibles

- Añadir las variables específicas de tu Excel de control de cargas.
- Exportar informes en PDF/Excel para el cuerpo técnico.
- Notificaciones para jugadores que no han registrado su RPE del día.
- Vista de comparativa entre jugadores o por posición.
