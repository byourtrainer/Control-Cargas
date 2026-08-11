// Cálculo del ciclo menstrual a partir del historial de fechas de inicio
// (no se pide la duración: se deduce de los propios registros).
// Modelo estándar por calendario, con la fase lútea fijada en ~14 días
// (es la parte más estable entre personas) y la folicular variable según
// la duración media real de cada jugadora.

export function calcularDuracionMedia(fechasInicioOrdenadas) {
  if (fechasInicioOrdenadas.length < 2) return null
  const duraciones = []
  for (let i = 1; i < fechasInicioOrdenadas.length; i++) {
    const dias = Math.round(
      (new Date(fechasInicioOrdenadas[i]) - new Date(fechasInicioOrdenadas[i - 1])) / 86400000
    )
    if (dias > 0 && dias < 60) duraciones.push(dias) // descarta valores absurdos (error de registro)
  }
  if (duraciones.length === 0) return null
  return duraciones.reduce((a, b) => a + b, 0) / duraciones.length
}

/**
 * Devuelve el estado del ciclo a fecha de hoy (o la fecha indicada):
 * { diaCiclo, duracionMedia, fasesConDatosSuficientes, fase }
 * fase ∈ 'menstrual' | 'folicular' | 'ovulatoria' | 'lutea' | null (sin datos)
 */
export function calcularEstadoCiclo(ciclos, fechaReferencia = new Date()) {
  if (!ciclos || ciclos.length === 0) return null

  const fechas = [...ciclos].map((c) => c.fecha_inicio).sort()
  const ultimaFecha = fechas[fechas.length - 1]
  const duracionMedia = calcularDuracionMedia(fechas) || 28
  const conDatosSuficientes = fechas.length >= 2

  const diaCiclo = Math.floor((fechaReferencia - new Date(ultimaFecha + 'T00:00:00')) / 86400000) + 1
  if (diaCiclo < 1) return null // fecha de referencia anterior al último inicio registrado

  const diaOvulacion = Math.max(1, Math.round(duracionMedia - 14))
  let fase
  if (diaCiclo <= 5) fase = 'menstrual'
  else if (diaCiclo < diaOvulacion - 1) fase = 'folicular'
  else if (diaCiclo <= diaOvulacion + 1) fase = 'ovulatoria'
  else fase = 'lutea'

  return { diaCiclo, duracionMedia: Math.round(duracionMedia * 10) / 10, conDatosSuficientes, fase, ultimaFecha }
}

export const infoFase = {
  menstrual: {
    etiqueta: 'Menstrual',
    mensaje: 'Estrógeno y progesterona en sus niveles más bajos. Es habitual sentir más fatiga o molestias estos días — no hay evidencia clara de que el rendimiento físico baje, pero vale la pena prestar atención a cómo se encuentra.',
  },
  folicular: {
    etiqueta: 'Folicular',
    mensaje: 'El estrógeno va en ascenso — suele ser la fase en la que más deportistas se sienten más fuertes y con mejor capacidad de esfuerzo. Buen momento para cargas de fuerza altas, si el resto de indicadores (RPE, sueño) acompañan.',
  },
  ovulatoria: {
    etiqueta: 'Ovulatoria',
    mensaje: 'Pico de estrógeno. Algunos estudios señalan algo más de laxitud articular estos días — presta algo más de atención a la técnica en saltos, cambios de dirección y cargas altas.',
  },
  lutea: {
    etiqueta: 'Lútea',
    mensaje: 'La progesterona sube y cae hacia el final. En la fase lútea tardía (últimos días antes de la regla) es cuando más deportistas refieren sentirse más cansadas — vale la pena vigilar el bienestar estos días.',
  },
}

export const avisoEstimacionCiclo =
  'Estimación por calendario, no una medición hormonal real — la variabilidad entre personas (e incluso entre ciclos de la misma persona) es alta. Es un dato de contexto, no una instrucción.'
