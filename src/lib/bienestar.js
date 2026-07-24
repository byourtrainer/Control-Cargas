// Índice de bienestar estilo Hooper: convierte cada escala a "malestar"
// (donde un valor más alto siempre es peor), las promedia, y clasifica el
// resultado en Óptimo / Bueno / Malo — igual que hace el Índice de Hooper
// clásico (que sí sirve con esta escala: sueño, fatiga, dolor muscular, estrés).

const CLAVES_BIENESTAR = ['sueno', 'fatiga', 'dolor_muscular', 'estres', 'animo']
const ESCALAS_INVERTIDAS = ['sueno', 'animo'] // valor alto = bueno, hay que invertir

/** Convierte un registro diario en un "malestar" medio (1 = mejor posible, 5 = peor posible). */
export function calcularMalestar(registro) {
  const valores = CLAVES_BIENESTAR
    .map((clave) => {
      const v = registro[clave]
      if (v === null || v === undefined) return null
      return ESCALAS_INVERTIDAS.includes(clave) ? 6 - v : v
    })
    .filter((v) => v !== null)

  if (valores.length === 0) return null
  return valores.reduce((a, b) => a + b, 0) / valores.length
}

/** Clasifica el malestar medio en 3 categorías, estilo Índice de Hooper. */
export function clasificarBienestar(malestar) {
  if (malestar === null || malestar === undefined) return 'sin_datos'
  if (malestar <= 2) return 'optimo'
  if (malestar <= 3) return 'bueno'
  return 'malo'
}
