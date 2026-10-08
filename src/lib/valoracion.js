// Estructura de la ficha de valoración y cálculos de la isometría.

// ---- Valoración neuromuscular: campos agrupados por bloque ----
// lados: true → se pide Derecha e Izquierda y se calcula la asimetría.
export const BLOQUES_NEUROMUSCULAR = [
  {
    titulo: 'Movilidad',
    campos: [
      { clave: 'dorsiflexion', etiqueta: 'Dorsiflexión de tobillo (knee-to-wall, cm)', lados: true },
      { clave: 'slr', etiqueta: 'Elevación de pierna recta (SLR, °)', lados: true },
      { clave: 'thomas', etiqueta: 'Test de Thomas (flexión de cadera, °)', lados: true },
      { clave: 'rot_int_cadera', etiqueta: 'Rotación interna de cadera (°)', lados: true },
      { clave: 'rot_ext_cadera', etiqueta: 'Rotación externa de cadera (°)', lados: true },
    ],
  },
  {
    titulo: 'Control motor y estabilidad',
    campos: [
      { clave: 'ybal_ant', etiqueta: 'Y-Balance anterior (cm)', lados: true },
      { clave: 'ybal_pm', etiqueta: 'Y-Balance posteromedial (cm)', lados: true },
      { clave: 'ybal_pl', etiqueta: 'Y-Balance posterolateral (cm)', lados: true },
      { clave: 'sentadilla_mono', etiqueta: 'Sentadilla monopodal (calidad 0–3)', lados: true },
      { clave: 'sentadilla_overhead', etiqueta: 'Sentadilla overhead (calidad 0–3)', lados: false },
      { clave: 'puente_gluteo', etiqueta: 'Puente de glúteo monopodal (s)', lados: true },
    ],
  },
  {
    titulo: 'Saltos y reactividad (valoración funcional)',
    campos: [
      { clave: 'hop_simple', etiqueta: 'Single hop for distance (cm)', lados: true },
      { clave: 'hop_triple', etiqueta: 'Triple hop (cm)', lados: true },
      { clave: 'aterrizaje', etiqueta: 'Calidad de aterrizaje (valgo/control, 0–3)', lados: false },
    ],
  },
]

// ---- Isometría: grupos musculares, ambos lados ----
export const GRUPOS_ISOMETRIA = [
  { clave: 'cuadriceps', etiqueta: 'Cuádriceps' },
  { clave: 'isquios', etiqueta: 'Isquiotibiales' },
  { clave: 'aductores', etiqueta: 'Aductores' },
  { clave: 'abductores', etiqueta: 'Abductores' },
]

// Umbrales ORIENTATIVOS (se pueden ajustar aquí). No sustituyen el criterio clínico.
export const UMBRALES = {
  asimetriaAviso: 10, // %
  asimetriaAlerta: 15, // %
  ratioHQMin: 0.6,   // isquios/cuádriceps (convencional) por debajo = revisar
  ratioAddAbdMin: 0.8, // aductores/abductores por debajo = revisar
}

const num = (v) => {
  if (v === '' || v === null || v === undefined) return null
  const n = Number(String(v).replace(',', '.'))
  return Number.isFinite(n) ? n : null
}
export { num }

/** Asimetría (%) respecto al lado más fuerte: (mayor − menor) / mayor × 100. */
export function asimetria(d, i) {
  const a = num(d), b = num(i)
  if (a === null || b === null) return null
  const mayor = Math.max(a, b)
  if (!mayor) return null
  return ((mayor - Math.min(a, b)) / mayor) * 100
}

export function ratio(num1, den) {
  const a = num(num1), b = num(den)
  if (a === null || b === null || !b) return null
  return a / b
}

/** A partir del objeto de valores { cuadriceps_d, cuadriceps_i, ... } calcula ratios y asimetrías. */
export function calcularIsometria(v = {}) {
  const res = {
    asimetrias: {},
    hqD: ratio(v.isquios_d, v.cuadriceps_d),
    hqI: ratio(v.isquios_i, v.cuadriceps_i),
    addAbdD: ratio(v.aductores_d, v.abductores_d),
    addAbdI: ratio(v.aductores_i, v.abductores_i),
  }
  GRUPOS_ISOMETRIA.forEach((g) => { res.asimetrias[g.clave] = asimetria(v[`${g.clave}_d`], v[`${g.clave}_i`]) })
  return res
}

/** 'ok' | 'aviso' | 'alerta' | null para pintar semáforos. */
export function nivelAsimetria(p) {
  if (p === null || p === undefined) return null
  if (p >= UMBRALES.asimetriaAlerta) return 'alerta'
  if (p >= UMBRALES.asimetriaAviso) return 'aviso'
  return 'ok'
}
export function nivelRatioHQ(r) {
  if (r === null || r === undefined) return null
  return r < UMBRALES.ratioHQMin ? 'alerta' : 'ok'
}
export function nivelRatioAddAbd(r) {
  if (r === null || r === undefined) return null
  return r < UMBRALES.ratioAddAbdMin ? 'alerta' : 'ok'
}

// ---- Anamnesis: estructura por defecto ----
export const ANAMNESIS_VACIA = {
  datos: { dominancia_pierna: '', dominancia_mano: '', profesion: '', actividad_laboral: '', telefono_emergencia: '' },
  contexto: {
    deporte: '', nivel: '', posicion: '', anos_practica: '', sesiones_semana: '', horas_semana: '',
    otras_actividades: '', calendario_competicion: '', sueno_horas: '', nutricion: '', estres: '', habitos: '',
  },
  salud: { patologias: '', cirugias: '', medicacion: '', alergias: '', dolor_actual: '', observaciones: '' },
  lesiones_previas: [], // { zona, lado, tipo, anio, tratamiento, secuelas }
  objetivos: { principal: '', secundarios: '', plazo: '', disponibilidad: '', motivacion: '' },
  kpis: [], // { indicador, inicial, objetivo, unidad, plazo, actual }
  consentimiento: false,
}

export function fusionarAnamnesis(guardada) {
  const g = guardada || {}
  return {
    ...ANAMNESIS_VACIA,
    ...g,
    datos: { ...ANAMNESIS_VACIA.datos, ...(g.datos || {}) },
    contexto: { ...ANAMNESIS_VACIA.contexto, ...(g.contexto || {}) },
    salud: { ...ANAMNESIS_VACIA.salud, ...(g.salud || {}) },
    objetivos: { ...ANAMNESIS_VACIA.objetivos, ...(g.objetivos || {}) },
    lesiones_previas: g.lesiones_previas || [],
    kpis: g.kpis || [],
  }
}
