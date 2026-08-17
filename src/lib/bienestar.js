// Índice de bienestar: convierte cada escala en un único valor de 1 a 5,
// donde 1 = peor posible y 5 = mejor posible — misma dirección que el
// modelo de Bienestar de Manu Sola Arjona, para que ambos "hablen el mismo
// idioma" en toda la app. Basado en el Índice de Hooper clásico (sueño,
// fatiga, dolor muscular, estrés), con el ánimo añadido.

const CLAVES_BIENESTAR = ['sueno', 'fatiga', 'dolor_muscular', 'estres', 'animo']
// En estas tres, un valor alto en la pregunta original es malo (mucha
// fatiga, mucho dolor, mucho estrés) — se invierten para que, en el
// resultado final, un valor alto sea siempre bueno.
const ESCALAS_A_INVERTIR = ['fatiga', 'dolor_muscular', 'estres']

/** Bienestar medio del día (1 = peor posible, 5 = mejor posible). */
export function calcularBienestar(registro) {
  const valores = CLAVES_BIENESTAR
    .map((clave) => {
      const v = registro[clave]
      if (v === null || v === undefined) return null
      return ESCALAS_A_INVERTIR.includes(clave) ? 6 - v : v
    })
    .filter((v) => v !== null)

  if (valores.length === 0) return null
  return valores.reduce((a, b) => a + b, 0) / valores.length
}

/** Clasifica el bienestar medio en 3 categorías, estilo Índice de Hooper. */
export function clasificarBienestar(bienestar) {
  if (bienestar === null || bienestar === undefined) return 'sin_datos'
  if (bienestar >= 4) return 'optimo'
  if (bienestar >= 3) return 'bueno'
  return 'malo'
}
