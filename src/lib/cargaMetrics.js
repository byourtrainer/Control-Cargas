// Cálculos de carga: Training Load, Carga Aguda/Crónica, ACWR clásico y EWMA
// (Pre/Post), Monotonía, Fatiga (Strain), y cambios diario/semanal.

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

const suma = (arr) => arr.reduce((a, b) => a + b, 0)
const media = (arr) => (arr.length === 0 ? 0 : suma(arr) / arr.length)

const desviacionEstandar = (arr) => {
  if (arr.length === 0) return 0
  const m = media(arr)
  const varianza = media(arr.map((v) => (v - m) ** 2))
  return Math.sqrt(varianza)
}

const DIAS_AGUDO = 7
const DIAS_CRONICO = 28 // 4 semanas

/** Carga Aguda: suma de las cargas de los últimos 7 días. */
export function cargaAguda(registros, fechaReferencia = new Date()) {
  const serie = construirSerieDiaria(registros, DIAS_AGUDO, fechaReferencia)
  return suma(serie.map((d) => d.carga))
}

/** Carga Crónica: media diaria de los últimos 28 días (4 semanas). */
export function cargaCronicaPromedio(registros, fechaReferencia = new Date()) {
  const serie = construirSerieDiaria(registros, DIAS_CRONICO, fechaReferencia)
  return media(serie.map((d) => d.carga))
}

/** ACWR clásico = (Carga Aguda / 7) ÷ Carga Crónica (media diaria sobre 28 días). */
export function acwrClasico(registros, fechaReferencia = new Date()) {
  const agudoPromedioDiario = cargaAguda(registros, fechaReferencia) / DIAS_AGUDO
  const cronico = cargaCronicaPromedio(registros, fechaReferencia)
  return cronico > 0 ? agudoPromedioDiario / cronico : null
}

function ewma(cargasOrdenadasPorFecha, lambda) {
  let valor = null
  for (const c of cargasOrdenadasPorFecha) {
    valor = valor === null ? c : c * lambda + valor * (1 - lambda)
  }
  return valor
}

/**
 * Ratio EWMA: medias móviles ponderadas exponencialmente en vez de medias
 * simples. Da más peso a las sesiones recientes y reacciona antes a cambios
 * de carga que el ACWR clásico. Se usa una ventana de histórico más amplia
 * (60 días) para que las medias tengan tiempo de estabilizarse.
 */
export function ratioEWMA(registros, fechaReferencia = new Date()) {
  const serie = construirSerieDiaria(registros, 60, fechaReferencia)
  const cargas = serie.map((d) => d.carga)
  const lambdaAgudo = 2 / (DIAS_AGUDO + 1)     // 0.25
  const lambdaCronico = 2 / (DIAS_CRONICO + 1) // ≈ 0.069
  const agudo = ewma(cargas, lambdaAgudo)
  const cronico = ewma(cargas, lambdaCronico)
  return cronico > 0 ? agudo / cronico : null
}

function calcularACWR(registros, metodo, fechaReferencia) {
  return metodo === 'ewma' ? ratioEWMA(registros, fechaReferencia) : acwrClasico(registros, fechaReferencia)
}

/** ACWR Pre-entreno: el ratio tal y como llega el jugador, sin contar el registro de hoy. */
export function acwrPreEntreno(registros, metodo, fechaReferencia = new Date()) {
  const ayer = new Date(fechaReferencia)
  ayer.setDate(ayer.getDate() - 1)
  return calcularACWR(registros, metodo, ayer)
}

/** ACWR Post-entreno: el ratio ya incluyendo el registro de hoy. */
export function acwrPostEntreno(registros, metodo, fechaReferencia = new Date()) {
  return calcularACWR(registros, metodo, fechaReferencia)
}

/** Monotonía y Fatiga (Training Strain), sobre los últimos 7 días. */
export function monotoniaYFatiga(registros, fechaReferencia = new Date()) {
  const serie = construirSerieDiaria(registros, DIAS_AGUDO, fechaReferencia)
  const cargas = serie.map((d) => d.carga)
  const m = media(cargas)
  const sd = desviacionEstandar(cargas)
  const monotonia = sd > 0 ? m / sd : null
  const cargaSemanal = suma(cargas)
  const fatiga = monotonia !== null ? cargaSemanal * monotonia : null
  return { monotonia, fatiga, cargaSemanal }
}

/** Cambio diario: variación de la carga de hoy respecto a ayer. */
export function cambioDiario(registros, fechaReferencia = new Date()) {
  const serie = construirSerieDiaria(registros, 2, fechaReferencia)
  const [ayer, hoy] = serie.map((d) => d.carga)
  if (!ayer) return null
  return hoy / ayer - 1
}

/** Cambio semanal: variación de la carga de esta semana (7 días) respecto a la anterior. */
export function cambioSemanal(registros, fechaReferencia = new Date()) {
  return cambioPeriodo(registros, 7, fechaReferencia)
}

/** Cambio genérico: variación de la carga de los últimos `dias` días respecto al periodo igual anterior. */
export function cambioPeriodo(registros, dias, fechaReferencia = new Date()) {
  const serie = construirSerieDiaria(registros, dias * 2, fechaReferencia)
  const anterior = suma(serie.slice(0, dias).map((d) => d.carga))
  const actual = suma(serie.slice(dias).map((d) => d.carga))
  if (!anterior) return null
  return actual / anterior - 1
}

/** Calcula el conjunto completo de métricas para un jugador, según el método de ACWR elegido. */
export function calcularMetricas(registros, metodo = 'clasico', fechaReferencia = new Date()) {
  const { monotonia, fatiga, cargaSemanal } = monotoniaYFatiga(registros, fechaReferencia)
  return {
    cargaCronica: cargaCronicaPromedio(registros, fechaReferencia),
    acwrPre: acwrPreEntreno(registros, metodo, fechaReferencia),
    acwrPost: acwrPostEntreno(registros, metodo, fechaReferencia),
    monotonia,
    fatiga,
    cargaSemanal,
    cambioDiario: cambioDiario(registros, fechaReferencia),
    cambioSemanal: cambioSemanal(registros, fechaReferencia),
  }
}

/** Clasificación cualitativa del ACWR en 6 categorías, según el Excel del club. */
export function clasificarRiesgoACWR(valor) {
  if (valor === null || valor === undefined) return 'sin_datos'
  if (valor < 0.5) return 'muy_baja'
  if (valor < 0.8) return 'baja'
  if (valor <= 1.1) return 'optima'
  if (valor <= 1.5) return 'moderada_alta'
  if (valor <= 2.0) return 'alta'
  return 'muy_alta'
}

/** Clasificación cualitativa de la Monotonía. */
export function clasificarMonotonia(valor) {
  if (valor === null || valor === undefined) return 'sin_datos'
  if (valor < 1) return 'muy_variable'
  if (valor <= 2) return 'correcta'
  if (valor <= 2.5) return 'elevada'
  return 'riesgo_elevado'
}

// =========================================================
// Modelo de Diferencia Agudo−Crónico (Manu Sola Arjona), aplicado a la
// carga como complemento del ACWR — mismo espíritu que el modelo de
// bienestar, pero con una RESTA en vez de un cociente, más sus dos
// derivadas (delta diario y delta semanal) para ver la tendencia.
// =========================================================

/** Diferencia Agudo−Crónico de la carga (ambos en carga media diaria, no una suma). */
export function diferenciaCarga(registros, fechaReferencia = new Date()) {
  const agudoPromedioDiario = cargaAguda(registros, fechaReferencia) / DIAS_AGUDO
  const cronico = cargaCronicaPromedio(registros, fechaReferencia)
  return agudoPromedioDiario - cronico
}

/** Delta diario de la Diferencia de carga: hoy vs. ayer. */
export function deltaCargaDiferenciaDiario(registros, fechaReferencia = new Date()) {
  const hoy = diferenciaCarga(registros, fechaReferencia)
  const ayer = new Date(fechaReferencia)
  ayer.setDate(ayer.getDate() - 1)
  const valorAyer = diferenciaCarga(registros, ayer)
  return hoy - valorAyer
}

/** Delta semanal de la Diferencia de carga: media de los últimos 7 días vs. los 7 anteriores. */
export function deltaCargaDiferenciaSemanal(registros, fechaReferencia = new Date()) {
  const valoresPorDia = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(fechaReferencia)
    d.setDate(d.getDate() - i)
    valoresPorDia.push(diferenciaCarga(registros, d))
  }
  const anterior = media(valoresPorDia.slice(0, 7))
  const actual = media(valoresPorDia.slice(7))
  return actual - anterior
}
