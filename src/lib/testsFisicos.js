// Cálculos derivados de los tests físicos.

/** Valor relativo al peso corporal (ej. kg de sentadilla / kg de peso corporal). */
export function valorRelativo(valorAbsoluto, pesoCorporalKg) {
  if (valorAbsoluto === null || valorAbsoluto === undefined) return null
  if (!pesoCorporalKg) return null
  return valorAbsoluto / pesoCorporalKg
}

/**
 * Estima el 1RM de sentadilla a partir de 4 pares (carga, velocidad media
 * propulsiva) tomados a distintas cargas submáximas.
 *
 * Método: ecuación cuadrática de grupo de Sánchez-Medina, Pallarés, Pérez,
 * Morán-Navarro y González-Badillo (2017, Sports Medicine International
 * Open) — MPV = -0.00006977×%1RM² - 0.005861×%1RM + 1.608 (R²=0.958,
 * n=489 repeticiones de 80 sujetos entrenados en fuerza) — que relaciona
 * directamente la velocidad medida con el %1RM correspondiente.
 *
 * Por cada carga introducida se despeja su %1RM (resolviendo la ecuación
 * de segundo grado) y se calcula el 1RM implícito en ese punto
 * (carga ÷ %1RM). El resultado final es la media de las estimaciones de
 * las 4 cargas — así se aprovechan los 4 puntos para un resultado más
 * estable que con uno solo, en vez de ajustar una recta individual.
 *
 * Devuelve null si no hay datos suficientes o ninguna carga da una
 * solución físicamente razonable.
 */
const COEF_A_SENTADILLA = -0.00006977
const COEF_B_SENTADILLA = -0.005861
const COEF_C_SENTADILLA = 1.608

/** Despeja el %1RM correspondiente a una MPV medida, según la parábola de Sánchez-Medina et al. (2017). */
function porcentaje1RMDesdeMPV(mpv) {
  const discriminante = COEF_B_SENTADILLA ** 2 - 4 * COEF_A_SENTADILLA * (COEF_C_SENTADILLA - mpv)
  if (discriminante < 0) return null
  const x = (-COEF_B_SENTADILLA - Math.sqrt(discriminante)) / (2 * COEF_A_SENTADILLA)
  if (!Number.isFinite(x) || x <= 0 || x > 200) return null
  return x
}

export function estimarRMSentadilla(puntos) {
  const validos = puntos.filter((p) => p.carga !== '' && p.carga !== null && p.velocidad !== '' && p.velocidad !== null)
  if (validos.length < 2) return null

  const estimacionesPorPunto = validos
    .map((p) => {
      const porcentaje = porcentaje1RMDesdeMPV(Number(p.velocidad))
      if (porcentaje === null) return null
      return { carga: Number(p.carga), porcentaje, rmImplicito: Number(p.carga) / (porcentaje / 100) }
    })
    .filter((e) => e !== null)

  if (estimacionesPorPunto.length === 0) return null

  const rm = estimacionesPorPunto.reduce((a, e) => a + e.rmImplicito, 0) / estimacionesPorPunto.length
  return { rm, estimacionesPorPunto }
}

/** Índice de fatiga del Wingate doble, en %: (MP1 - MP2) / MP2 × 100. */
export function indiceFatiga(mp1, mp2) {
  if (mp1 === null || mp1 === undefined || !mp2) return null
  return ((mp1 - mp2) / mp2) * 100
}

export const tiposTest = [
  { valor: 'sentadilla', etiqueta: 'Sentadilla' },
  { valor: 'iso_sq', etiqueta: 'ISO SQ' },
  { valor: 'cmj', etiqueta: 'CMJ' },
  { valor: 'sj', etiqueta: 'SJ' },
  { valor: 'drop_jump', etiqueta: 'Drop Jump' },
  { valor: 'wingate', etiqueta: 'Doble Wingate' },
]

export function traducirTipoTest(tipo) {
  return tiposTest.find((t) => t.valor === tipo)?.etiqueta || tipo
}

/** Del listado de tests de un jugador, obtiene el más reciente de cada tipo. */
export function ultimosTestsPorTipo(tests) {
  const resultado = {}
  for (const t of tests) {
    if (!resultado[t.tipo_test] || t.fecha > resultado[t.tipo_test].fecha) {
      resultado[t.tipo_test] = t
    }
  }
  return resultado
}

// --- Interpretaciones según los umbrales de los cuadrantes ---

export function interpretarCMJ(cm) {
  if (cm === null || cm === undefined) return null
  return cm >= 40 ? 'Explosivo' : 'Poco explosivo'
}

export function interpretarSentadilla(relativo) {
  if (relativo === null || relativo === undefined) return null
  return relativo >= 2 ? 'Fuerte' : 'Poco fuerte'
}

export function interpretarPotencia(wKg) {
  if (wKg === null || wKg === undefined) return null
  return wKg >= 10 ? 'Potente' : 'Poco potente'
}

export function interpretarFatigaWingate(pct) {
  if (pct === null || pct === undefined) return null
  return pct < 20 ? 'Buena capacidad de repetir esfuerzo' : 'Poca capacidad de repetir esfuerzo'
}
