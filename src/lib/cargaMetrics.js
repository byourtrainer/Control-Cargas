// Cálculos de carga: ACWR (Coupled / Uncoupled), EWMA, Monotonía y Fatiga (Foster).
// Réplica de la lógica del Excel de control de cargas del club.

const fechaISO = (date) => date.toISOString().slice(0, 10)

/** Construye una serie diaria continua de los últimos `dias` días (rellena huecos con carga 0). */
export function construirSerieDiaria(registros, dias, fechaReferencia = new Date()) {
  const porFecha = {}
  registros.forEach((r) => { porFecha[r.fecha] = (porFecha[r.fecha] || 0) + (r.carga || 0) })

  const serie = []
  for (let i = dias - 1; i >= 0; i--) {
    const d = new Date(fechaReferencia)
    d.setDate(d.getDate() - i)
    const fecha = fechaISO(d)
    serie.push({ fecha, carga: porFecha[fecha] || 0 })
  }
  return serie
}

const media = (arr) => (arr.length === 0 ? 0 : arr.reduce((a, b) => a + b, 0) / arr.length)

const desviacionEstandar = (arr) => {
  if (arr.length === 0) return 0
  const m = media(arr)
  const varianza = media(arr.map((v) => (v - m) ** 2))
  return Math.sqrt(varianza)
}

/** ACWR Coupled: la semana aguda está incluida dentro del período crónico (28 días). */
export function acwrCoupled(registros, fechaReferencia) {
  const serie = construirSerieDiaria(registros, 28, fechaReferencia)
  const agudo = media(serie.slice(-7).map((d) => d.carga))
  const cronico = media(serie.map((d) => d.carga))
  return cronico > 0 ? agudo / cronico : null
}

/** ACWR Uncoupled: el crónico se calcula solo con las 3 semanas PREVIAS a la semana aguda. */
export function acwrUncoupled(registros, fechaReferencia) {
  const serie = construirSerieDiaria(registros, 28, fechaReferencia)
  const agudo = media(serie.slice(-7).map((d) => d.carga))
  const previas = serie.slice(0, 21).map((d) => d.carga)
  const cronico = media(previas)
  return cronico > 0 ? agudo / cronico : null
}

function ewma(cargas, lambda) {
  let valor = null
  for (const c of cargas) {
    valor = valor === null ? c : c * lambda + valor * (1 - lambda)
  }
  return valor
}

/** Ratio EWMA: mismo concepto que ACWR pero con medias móviles exponenciales (más sensible a cambios recientes). */
export function ratioEWMA(registros, fechaReferencia) {
  const serie = construirSerieDiaria(registros, 28, fechaReferencia)
  const cargas = serie.map((d) => d.carga)
  const agudo = ewma(cargas, 2 / (7 + 1))
  const cronico = ewma(cargas, 2 / (28 + 1))
  return cronico > 0 ? agudo / cronico : null
}

/** Monotonía y Fatiga (índices de Foster) sobre los últimos 7 días. */
export function monotoniaYFatiga(registros, fechaReferencia) {
  const serie = construirSerieDiaria(registros, 7, fechaReferencia)
  const cargas = serie.map((d) => d.carga)
  const m = media(cargas)
  const sd = desviacionEstandar(cargas)
  const monotonia = sd > 0 ? m / sd : null
  const cargaSemanal = cargas.reduce((a, b) => a + b, 0)
  const fatiga = monotonia !== null ? cargaSemanal * monotonia : null
  return { monotonia, fatiga, cargaSemanal }
}

/** Calcula el conjunto completo de métricas para un jugador, según el método de ACWR elegido. */
export function calcularMetricas(registros, metodo, fechaReferencia = new Date()) {
  const { monotonia, fatiga, cargaSemanal } = monotoniaYFatiga(registros, fechaReferencia)
  let acwr = null
  if (metodo === 'coupled') acwr = acwrCoupled(registros, fechaReferencia)
  else if (metodo === 'uncoupled') acwr = acwrUncoupled(registros, fechaReferencia)
  else if (metodo === 'ewma') acwr = ratioEWMA(registros, fechaReferencia)
  return { acwr, monotonia, fatiga, cargaSemanal }
}

export function clasificarRiesgoACWR(acwr) {
  if (acwr === null) return 'sin_datos'
  if (acwr < 0.8) return 'bajo'
  if (acwr <= 1.3) return 'optimo'
  if (acwr <= 1.5) return 'medio'
  return 'alto'
}
