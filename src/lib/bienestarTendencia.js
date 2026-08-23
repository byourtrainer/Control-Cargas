// Tendencia de Bienestar (modelo de Manu Sola Arjona): en vez de un
// cociente agudo÷crónico (como el ACWR), usa una RESTA agudo−basal, y
// añade dos derivadas (delta diario y delta semanal) que dan información
// de tendencia/momentum, no solo de "dónde estás ahora".
//
// No añadimos ninguna pregunta nueva al jugador: parte exactamente del
// mismo Bienestar que ya calculamos a partir del cuestionario diario.

import { calcularBienestar } from './bienestar'
import { fechaISOLocal as fechaISO } from './fechas'

const media = (arr) => (arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length)

/**
 * Media de Bienestar en una ventana de `dias` naturales hasta
 * fechaReferencia (incluida). A diferencia de la carga (donde un día sin
 * sesión es 0), aquí un día sin registro se IGNORA, no se cuenta como 0 —
 * un hueco es "no hay dato", no "bienestar nulo".
 */
function mediaBienestarVentana(registros, dias, fechaReferencia) {
  const inicio = new Date(fechaReferencia)
  inicio.setDate(inicio.getDate() - (dias - 1))
  const inicioISO = fechaISO(inicio)
  const finISO = fechaISO(fechaReferencia)

  const valores = registros
    .filter((r) => r.fecha >= inicioISO && r.fecha <= finISO)
    .map((r) => calcularBienestar(r))
    .filter((v) => v !== null)

  return media(valores)
}

const DIAS_AGUDO_BIENESTAR = 7
const DIAS_BASAL_BIENESTAR = 90

/** Bienestar Agudo: media de los últimos 7 días. */
export function bienestarAgudo(registros, fechaReferencia = new Date()) {
  return mediaBienestarVentana(registros, DIAS_AGUDO_BIENESTAR, fechaReferencia)
}

/** Bienestar Basal: media de los últimos 90 días — la "normalidad" del jugador. */
export function bienestarBasal(registros, fechaReferencia = new Date()) {
  return mediaBienestarVentana(registros, DIAS_BASAL_BIENESTAR, fechaReferencia)
}

/** Diferencia Agudo−Basal (no un cociente, como el ACWR — una resta). */
export function diferenciaBienestar(registros, fechaReferencia = new Date()) {
  const agudo = bienestarAgudo(registros, fechaReferencia)
  const basal = bienestarBasal(registros, fechaReferencia)
  if (agudo === null || basal === null) return null
  return agudo - basal
}

/** Delta diario: cuánto ha cambiado la Diferencia de hoy respecto a ayer. */
export function deltaBienestarDiario(registros, fechaReferencia = new Date()) {
  const hoy = diferenciaBienestar(registros, fechaReferencia)
  const ayer = new Date(fechaReferencia)
  ayer.setDate(ayer.getDate() - 1)
  const valorAyer = diferenciaBienestar(registros, ayer)
  if (hoy === null || valorAyer === null) return null
  return hoy - valorAyer
}

/** Delta semanal: media de la Diferencia de los últimos 7 días vs. los 7 anteriores a esos. */
export function deltaBienestarSemanal(registros, fechaReferencia = new Date()) {
  const valoresPorDia = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(fechaReferencia)
    d.setDate(d.getDate() - i)
    valoresPorDia.push(diferenciaBienestar(registros, d))
  }
  const semanaAnterior = valoresPorDia.slice(0, 7).filter((v) => v !== null)
  const semanaActual = valoresPorDia.slice(7).filter((v) => v !== null)
  const mediaAnterior = media(semanaAnterior)
  const mediaActual = media(semanaActual)
  if (mediaAnterior === null || mediaActual === null) return null
  return mediaActual - mediaAnterior
}

/** Calcula el conjunto completo de variables de tendencia de bienestar para un jugador. */
export function calcularTendenciaBienestar(registros, fechaReferencia = new Date()) {
  const finISO = fechaISO(fechaReferencia)
  const registroHoy = registros.find((r) => r.fecha === finISO)
  return {
    bienestarHoy: registroHoy ? calcularBienestar(registroHoy) : null,
    agudo: bienestarAgudo(registros, fechaReferencia),
    basal: bienestarBasal(registros, fechaReferencia),
    diferencia: diferenciaBienestar(registros, fechaReferencia),
    deltaDiario: deltaBienestarDiario(registros, fechaReferencia),
    deltaSemanal: deltaBienestarSemanal(registros, fechaReferencia),
  }
}

/**
 * Clasificación del delta diario según los umbrales fijos del Excel
 * original de Manu Sola Arjona (±0.5) — a diferencia de las demás
 * variables de este modelo, que él mismo clasifica de forma relativa al
 * propio histórico del jugador, ésta usa un umbral fijo igual para todos.
 */
export function clasificarDeltaDiario(valor) {
  if (valor === null || valor === undefined) return 'sin_datos'
  if (valor <= -0.5) return 'alerta'
  if (valor >= 0.5) return 'positivo'
  return 'neutro'
}
