// Cálculos derivados de los tests físicos.

/** Valor relativo al peso corporal (ej. kg de sentadilla / kg de peso corporal). */
export function valorRelativo(valorAbsoluto, pesoCorporalKg) {
  if (valorAbsoluto === null || valorAbsoluto === undefined) return null
  if (!pesoCorporalKg) return null
  return valorAbsoluto / pesoCorporalKg
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
