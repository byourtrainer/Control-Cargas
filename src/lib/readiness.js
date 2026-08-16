// Modelo de "Readiness" de Manu Sola Arjona: en vez de un cociente
// agudo÷crónico (como el ACWR), usa una RESTA agudo−crónico, y añade dos
// derivadas (delta diario y delta semanal) que dan información de
// tendencia/momentum, no solo de "dónde estás ahora".
//
// No añadimos ninguna pregunta nueva al jugador: el "Readiness percibido"
// se traduce directamente del índice de bienestar que ya rellena cada día
// (calcularMalestar, 1=mejor·5=peor), invertido a la escala de Manu Sola
// (1=peor·5=mejor: 1=rojo, 3=amarillo, 5=verde en su Excel original).

import { calcularMalestar } from './bienestar'

const fechaISO = (date) => date.toISOString().slice(0, 10)
const media = (arr) => (arr.length === 0 ? null : arr.reduce((a, b) => a + b, 0) / arr.length)

/** Traduce el malestar (1=mejor·5=peor) al Readiness percibido de Manu Sola (1=peor·5=mejor). */
export function readinessPercibido(registro) {
  const malestar = calcularMalestar(registro)
  return malestar === null ? null : 6 - malestar
}

/**
 * Media de Readiness percibido en una ventana de `dias` naturales hasta
 * fechaReferencia (incluida). A diferencia de la carga (donde un día sin
 * sesión es 0), aquí un día sin registro se IGNORA, no se cuenta como 0 —
 * un hueco es "no hay dato", no "readiness nulo".
 */
function mediaReadinessVentana(registros, dias, fechaReferencia) {
  const inicio = new Date(fechaReferencia)
  inicio.setDate(inicio.getDate() - (dias - 1))
  const inicioISO = fechaISO(inicio)
  const finISO = fechaISO(fechaReferencia)

  const valores = registros
    .filter((r) => r.fecha >= inicioISO && r.fecha <= finISO)
    .map((r) => readinessPercibido(r))
    .filter((v) => v !== null)

  return media(valores)
}

const DIAS_AGUDO_READINESS = 7
const DIAS_BASAL_READINESS = 90

/** Readiness Agudo: media de los últimos 7 días. */
export function readinessAgudo(registros, fechaReferencia = new Date()) {
  return mediaReadinessVentana(registros, DIAS_AGUDO_READINESS, fechaReferencia)
}

/** Readiness Basal: media de los últimos 90 días — la "normalidad" del jugador. */
export function readinessBasal(registros, fechaReferencia = new Date()) {
  return mediaReadinessVentana(registros, DIAS_BASAL_READINESS, fechaReferencia)
}

/** Diferencia Agudo−Basal (no un cociente, como el ACWR — una resta). */
export function diferenciaReadiness(registros, fechaReferencia = new Date()) {
  const agudo = readinessAgudo(registros, fechaReferencia)
  const basal = readinessBasal(registros, fechaReferencia)
  if (agudo === null || basal === null) return null
  return agudo - basal
}

/** Delta diario: cuánto ha cambiado la Diferencia de hoy respecto a ayer. */
export function deltaReadinessDiario(registros, fechaReferencia = new Date()) {
  const hoy = diferenciaReadiness(registros, fechaReferencia)
  const ayer = new Date(fechaReferencia)
  ayer.setDate(ayer.getDate() - 1)
  const valorAyer = diferenciaReadiness(registros, ayer)
  if (hoy === null || valorAyer === null) return null
  return hoy - valorAyer
}

/** Delta semanal: media de la Diferencia de los últimos 7 días vs. los 7 anteriores a esos. */
export function deltaReadinessSemanal(registros, fechaReferencia = new Date()) {
  const valoresPorDia = []
  for (let i = 13; i >= 0; i--) {
    const d = new Date(fechaReferencia)
    d.setDate(d.getDate() - i)
    valoresPorDia.push(diferenciaReadiness(registros, d))
  }
  const semanaAnterior = valoresPorDia.slice(0, 7).filter((v) => v !== null)
  const semanaActual = valoresPorDia.slice(7).filter((v) => v !== null)
  const mediaAnterior = media(semanaAnterior)
  const mediaActual = media(semanaActual)
  if (mediaAnterior === null || mediaActual === null) return null
  return mediaActual - mediaAnterior
}

/** Calcula el conjunto completo de métricas de readiness para un jugador. */
export function calcularReadiness(registros, fechaReferencia = new Date()) {
  const finISO = fechaISO(fechaReferencia)
  const registroHoy = registros.find((r) => r.fecha === finISO)
  return {
    percibidoHoy: registroHoy ? readinessPercibido(registroHoy) : null,
    agudo: readinessAgudo(registros, fechaReferencia),
    basal: readinessBasal(registros, fechaReferencia),
    diferencia: diferenciaReadiness(registros, fechaReferencia),
    deltaDiario: deltaReadinessDiario(registros, fechaReferencia),
    deltaSemanal: deltaReadinessSemanal(registros, fechaReferencia),
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
