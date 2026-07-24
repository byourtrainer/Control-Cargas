// Calcula un color (verde / amarillo / rojo) según la posición de un valor
// dentro de una escala. `invertido` se usa para escalas donde un valor alto
// es BUENO (ej. calidad del sueño, ánimo) — en esas, el rojo aparece en los
// valores bajos, no en los altos.
export function colorParaValor(valor, maximo, invertido = false) {
  if (valor === null || valor === undefined) return 'var(--text-faint)'
  let ratio = valor / maximo
  if (invertido) ratio = 1 - ratio
  if (ratio <= 0.34) return 'var(--risk-low)'   // verde
  if (ratio <= 0.67) return 'var(--risk-mid)'   // amarillo
  return 'var(--risk-high)'                     // rojo
}
