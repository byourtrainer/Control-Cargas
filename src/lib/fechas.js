// toISOString() convierte a hora UTC antes de dar la fecha — eso desplaza
// el día un día hacia atrás (o hacia delante) para cualquier usuario que
// no esté exactamente en el huso horario UTC (España, por ejemplo, está
// siempre por delante). Estas dos funciones dan la fecha tal y como la
// ve el propio usuario en su reloj, sin ese desfase.

/** Convierte un Date a "YYYY-MM-DD" usando la fecha LOCAL, no UTC. */
export function fechaISOLocal(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** La fecha de hoy, en local, como "YYYY-MM-DD". */
export function hoyISOLocal() {
  return fechaISOLocal(new Date())
}
