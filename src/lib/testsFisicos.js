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
 * Método: regresión lineal individual del propio jugador (Velocidad = m×Carga + b,
 * mismo enfoque que Jidovtseff et al. 2011 para press banca), pero extrapolada
 * hasta la velocidad de 0.30 m/s — el punto de MPV al que Conceição, Fernandes,
 * Lewis, González-Badillo y Jiménez-Reyes (2016, J Sports Sci) encontraron que se
 * alcanza el 1RM en sentadilla completa — en vez de hasta velocidad cero (que es
 * específico de press banca, no de sentadilla).
 *
 * Devuelve null si los datos no forman una recta descendente coherente (por
 * ejemplo, si faltan puntos o la pendiente no es negativa).
 */
export const MPV_1RM_SENTADILLA = 0.30 // m/s — Conceição et al. 2016

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

  const rm = (MPV_1RM_SENTADILLA - intercepto) / pendiente
  if (!Number.isFinite(rm) || rm <= 0) return null

  return { rm, pendiente, intercepto }
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
