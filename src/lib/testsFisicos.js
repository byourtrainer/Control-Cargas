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
 * Método híbrido: combina lo mejor de dos enfoques.
 * 1. Regresión lineal INDIVIDUAL del propio jugador con sus 4 puntos
 *    (Velocidad = pendiente × Carga + intercepto) — se adapta a su
 *    técnica y perfil concreto, no asume que todo el mundo se mueve igual.
 * 2. Se extrapola esa recta hasta la velocidad que, al 100% del 1RM,
 *    predice la propia ecuación de grupo de Sánchez-Medina, Pallarés,
 *    Pérez, Morán-Navarro y González-Badillo (2017) — en vez de un valor
 *    suelto sacado de otra tabla, se calcula directamente de su misma
 *    parábola, para que el punto de referencia sea coherente con el
 *    estudio de mayor tamaño muestral (489 repeticiones, 80 sujetos).
 *
 * Así se combina la adaptación individual (que la sola ecuación de grupo
 * no ofrece) con el respaldo del estudio más sólido (que una regresión
 * puramente individual, sin ningún ancla externa, tampoco ofrece).
 *
 * Devuelve null si los datos no forman una recta descendente coherente.
 */
const COEF_A_SENTADILLA = -0.00006977
const COEF_B_SENTADILLA = -0.005861
const COEF_C_SENTADILLA = 1.608

/** Velocidad que la parábola de Sánchez-Medina et al. (2017) predice al 100% del 1RM. */
export const VELOCIDAD_OBJETIVO_SENTADILLA_100 =
  COEF_A_SENTADILLA * 100 ** 2 + COEF_B_SENTADILLA * 100 + COEF_C_SENTADILLA

export function estimarRMSentadilla(puntos) {
  const validos = puntos.filter((p) => p.carga !== '' && p.carga !== null && p.velocidad !== '' && p.velocidad !== null)
  if (validos.length < 2) return null

  const cargas = validos.map((p) => Number(p.carga))
  const velocidades = validos.map((p) => Number(p.velocidad))
  const n = cargas.length
  const mediaCarga = cargas.reduce((a, b) => a + b, 0) / n
  const mediaVelocidad = velocidades.reduce((a, b) => a + b, 0) / n

  let numerador = 0
  let denominador = 0
  for (let i = 0; i < n; i++) {
    numerador += (cargas[i] - mediaCarga) * (velocidades[i] - mediaVelocidad)
    denominador += (cargas[i] - mediaCarga) ** 2
  }
  if (denominador === 0) return null

  const pendiente = numerador / denominador
  const intercepto = mediaVelocidad - pendiente * mediaCarga
  if (pendiente >= 0) return null // una sentadilla real siempre pierde velocidad al subir la carga

  const rm = (VELOCIDAD_OBJETIVO_SENTADILLA_100 - intercepto) / pendiente
  if (!Number.isFinite(rm) || rm <= 0) return null

  return { rm, pendiente, intercepto, velocidadObjetivo: VELOCIDAD_OBJETIVO_SENTADILLA_100 }
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
