// Cálculos del historial de cargas.

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
export { num }

/** 1RM estimado (Epley): kg × (1 + reps/30). Con 1 repetición devuelve los kg. */
export function e1RM(kg, reps) {
  const k = num(kg), r = num(reps)
  if (k === null || r === null || r <= 0 || k <= 0) return null
  return r === 1 ? k : k * (1 + r / 30)
}

/** Agrupa las series (filas de cargas_ejercicio) por fecha, más reciente primero. */
export function agruparPorFecha(filas) {
  const mapa = new Map()
  for (const f of filas) {
    if (!mapa.has(f.fecha)) mapa.set(f.fecha, [])
    mapa.get(f.fecha).push(f)
  }
  return [...mapa.entries()]
    .sort((a, b) => b[0].localeCompare(a[0]))
    .map(([fecha, series]) => ({
      fecha,
      series: series.sort((a, b) => a.serie - b.serie),
    }))
}

/** Texto compacto de una serie: "80 kg × 5 · 0.62 m/s · RIR 2". */
export function textoSerie(s) {
  const partes = []
  if (s.kg !== null && s.kg !== undefined) partes.push(`${Number(s.kg)} kg`)
  if (s.reps !== null && s.reps !== undefined) partes.push(`× ${s.reps}`)
  let t = partes.join(' ')
  if (s.velocidad !== null && s.velocidad !== undefined) t += ` · ${Number(s.velocidad).toFixed(2)} m/s`
  if (s.rir !== null && s.rir !== undefined) t += ` · RIR ${Number(s.rir)}`
  return t || '—'
}

/** Resumen por sesión para la gráfica: kg máximo, 1RM estimado máximo, velocidad de la serie más pesada. */
export function resumenPorSesion(filas) {
  return agruparPorFecha(filas).reverse().map(({ fecha, series }) => {
    const maxKg = Math.max(...series.map((s) => num(s.kg) ?? 0))
    const est = series.map((s) => e1RM(s.kg, s.reps)).filter((x) => x !== null)
    const masPesada = [...series].sort((a, b) => (num(b.kg) ?? 0) - (num(a.kg) ?? 0))[0]
    return {
      fecha,
      maxKg: maxKg || null,
      e1rm: est.length ? Number(Math.max(...est).toFixed(1)) : null,
      velocidad: masPesada?.velocidad != null ? Number(masPesada.velocidad) : null,
      volumen: series.reduce((t, s) => t + (num(s.kg) ?? 0) * (num(s.reps) ?? 0), 0),
    }
  })
}
