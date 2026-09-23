// Catálogo de etiquetas de la biblioteca de ejercicios — un único sitio
// donde están definidas, para que la App (BibliotecaEjercicios.jsx) y la
// sincronización desde Google Sheets (api/sincronizar-ejercicios.js) usen
// siempre exactamente las mismas listas.

export const categorias = [
  'Fuerza', 'Metabólico', 'Velocidad', 'Aceleración', 'Deceleración', 'Pliometría',
  'Agilidad', 'Coordinación', 'Movilidad', 'Olímpico',
]

export const miembros = ['Central', 'Inferior', 'Superior']

export const lateralidades = ['Mixto', 'Unilateral', 'Bilateral']

export const patrones = [
  'Aducción', 'Abducción', 'Empuje Vertical', 'Tracción Vertical', 'Empuje Horizontal',
  'Tracción Horizontal', 'Bisagra', 'Sentadilla', 'Flexión', 'Extensión',
  'Inclinación Lateral', 'Rotación', 'Split', 'Plancha', 'Carrera', 'CoD', 'Cuadrupédia', 'Hip Lock',
]

export const contraccionesPorFamilia = {
  'Dinámico': ['Balístico', 'Oscilatorio', 'Excéntrico', 'CEA', 'Dinámico General'],
  'Isométrico': ['Iso-Hold', 'Iso-Catch', 'Iso-Push', 'Iso-Switch'],
}

export const contracciones = Object.values(contraccionesPorFamilia).flat()

export const materiales = [
  'Goma', 'Fitball', 'ZeroRM', 'Mancuerna', 'Barra', 'Disco', 'Pelota Tenis', 'Banco',
  'Pica Madera', 'Cono', 'Comba', 'BattleRope', 'Rack', 'Balón Medicinal', 'Kettlebell',
  'Saco Arena', 'Aquabag', 'Aquaball', 'Chaleco Lastrado', 'Barra Hexagonal', 'Safety Bar',
  'SlamBall', 'Anillas', 'TRX', 'Exergenie', 'Inercial', 'Rueda Abdominal', 'Airbike', 'Globo', 'Box Ball',
]

// Quita acentos y pasa a minúsculas, para comparar sin que el acento o las
// mayúsculas importen (p. ej. el Sheet trae "ISO-Catch" y aquí es "Iso-Catch").
function normalizarTexto(s) {
  return s
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase().trim()
}

// Busca `valor` dentro de `listaCanonica` ignorando mayúsculas/acentos, y
// devuelve la forma canónica exacta si lo encuentra. Si no lo encuentra,
// devuelve el valor original recortado (para no perder el dato) — el
// llamante puede avisar de que no coincide con ninguna etiqueta conocida.
export function normalizarValor(valor, listaCanonica) {
  const limpio = (valor || '').trim()
  if (!limpio) return { valor: null, reconocido: true }
  const encontrado = listaCanonica.find((c) => normalizarTexto(c) === normalizarTexto(limpio))
  return encontrado ? { valor: encontrado, reconocido: true } : { valor: limpio, reconocido: false }
}

// Igual que normalizarValor pero para una celda con varios valores
// separados por comas (p. ej. el patrón de movimiento o el material).
export function normalizarLista(valor, listaCanonica) {
  const partes = (valor || '').split(',').map((p) => p.trim()).filter(Boolean)
  const resultado = partes.map((p) => normalizarValor(p, listaCanonica))
  return {
    valores: resultado.map((r) => r.valor).filter(Boolean),
    noReconocidos: resultado.filter((r) => !r.reconocido).map((r) => r.valor),
  }
}
