// Función de servidor (Vercel) para sincronizar la Biblioteca de ejercicios
// con el Google Sheet donde el administrador mantiene su base de datos de
// ejercicios. Lee el Sheet (publicado como "cualquiera con el enlace puede
// ver"), lo compara con lo que ya hay en la tabla `ejercicios` y hace un
// upsert: actualiza los que coinciden por nombre y crea los que son nuevos.
// No borra ningún ejercicio existente aunque haya desaparecido del Sheet.
//
// No usa la clave "service_role" — solo necesita leer/escribir en
// `ejercicios`, algo que cualquier entrenador/fisio/administrador ya puede
// hacer según las políticas RLS existentes, así que basta con reenviar el
// token de quien hace la petición.

import { createClient } from '@supabase/supabase-js'
import { categorias, miembros, lateralidades, patrones, contracciones, materiales, normalizarValor, normalizarLista } from '../src/lib/catalogoEjercicios.js'
import { extraerYoutubeId } from '../src/lib/youtube.js'

const URL_SHEET = 'https://docs.google.com/spreadsheets/d/1u19VK0uKKb3hIw_grmzy8ZcqQBqr2Td3c3uqQySLqpI/export?format=csv&gid=0'

// Parser de CSV que respeta las comillas (Google exporta con comillas los
// campos que contienen comas, como "Flexión, Abducción"). No usar split(',')
// a pelo porque rompería esas celdas.
function parsearCSV(texto) {
  const filas = []
  let fila = []
  let campo = ''
  let dentroComillas = false

  for (let i = 0; i < texto.length; i++) {
    const c = texto[i]
    const siguiente = texto[i + 1]

    if (dentroComillas) {
      if (c === '"' && siguiente === '"') {
        campo += '"'
        i++
      } else if (c === '"') {
        dentroComillas = false
      } else {
        campo += c
      }
    } else if (c === '"') {
      dentroComillas = true
    } else if (c === ',') {
      fila.push(campo)
      campo = ''
    } else if (c === '\r') {
      // ignorar, el salto real lo marca \n
    } else if (c === '\n') {
      fila.push(campo)
      filas.push(fila)
      fila = []
      campo = ''
    } else {
      campo += c
    }
  }
  // última celda/fila si el texto no acaba en salto de línea
  if (campo.length > 0 || fila.length > 0) {
    fila.push(campo)
    filas.push(fila)
  }
  return filas.filter((f) => f.some((c) => c.trim() !== ''))
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const urlSupabase = process.env.VITE_SUPABASE_URL
  const claveAnonima = process.env.VITE_SUPABASE_ANON_KEY
  if (!urlSupabase || !claveAnonima) {
    return res.status(500).json({ error: 'Faltan variables de entorno en el servidor. Revisa la configuración en Vercel.' })
  }

  // 1. Comprobar que quien llama está autenticado de verdad
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'No autenticado.' })
  }

  const supabase = createClient(urlSupabase, claveAnonima, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  })
  const { data: { user }, error: errorUsuario } = await supabase.auth.getUser(token)
  if (errorUsuario || !user) {
    return res.status(401).json({ error: 'Sesión no válida.' })
  }

  // 2. Descargar el Sheet
  let textoCSV
  try {
    const respuestaSheet = await fetch(URL_SHEET)
    if (!respuestaSheet.ok) {
      return res.status(502).json({ error: 'No se pudo descargar el Google Sheet. Comprueba que sigue compartido como "cualquiera con el enlace puede ver".' })
    }
    textoCSV = await respuestaSheet.text()
  } catch {
    return res.status(502).json({ error: 'No se pudo conectar con Google Sheets.' })
  }

  const filas = parsearCSV(textoCSV)
  if (filas.length < 2) {
    return res.status(422).json({ error: 'El Sheet parece estar vacío.' })
  }

  const cabecera = filas[0].map((c) => c.trim().toLowerCase())
  const idx = {
    nombre: cabecera.findIndex((c) => c.startsWith('nombre')),
    enlace: cabecera.findIndex((c) => c.startsWith('enlace')),
    categoria: cabecera.findIndex((c) => c.startsWith('categor')),
    miembro: cabecera.findIndex((c) => c.startsWith('miembro')),
    lateralidad: cabecera.findIndex((c) => c.startsWith('lateralidad')),
    patron: cabecera.findIndex((c) => c.startsWith('patr')),
    contraccion: cabecera.findIndex((c) => c.startsWith('contracc')),
    material: cabecera.findIndex((c) => c.startsWith('material')),
  }
  if (idx.nombre === -1) {
    return res.status(422).json({ error: 'No se encontró la columna "Nombre" en el Sheet.' })
  }

  // 3. Traer los ejercicios que ya existen, para saber cuáles hay que
  // actualizar (mismo nombre) y cuáles crear.
  const { data: existentes, error: errorExistentes } = await supabase
    .from('ejercicios').select('id, nombre')
  if (errorExistentes) {
    return res.status(500).json({ error: 'No se pudo leer la biblioteca actual: ' + errorExistentes.message })
  }
  const idPorNombre = new Map(
    (existentes || []).map((e) => [e.nombre.trim().toLowerCase(), e.id])
  )

  const avisos = []
  const filasNombreVisto = new Set()
  const paraUpsert = []

  for (let f = 1; f < filas.length; f++) {
    const fila = filas[f]
    const nombre = (fila[idx.nombre] || '').trim()
    if (!nombre) continue

    const clave = nombre.toLowerCase()
    if (filasNombreVisto.has(clave)) {
      avisos.push(`Fila ${f + 1}: nombre "${nombre}" duplicado en el Sheet — se usa la última aparición.`)
    }
    filasNombreVisto.add(clave)

    const enlace = idx.enlace >= 0 ? (fila[idx.enlace] || '').trim() : ''
    const youtubeId = extraerYoutubeId(enlace)
    if (enlace && !youtubeId) {
      avisos.push(`"${nombre}": el enlace de vídeo no parece de YouTube y se ha dejado en blanco.`)
    }

    const categoriaRaw = idx.categoria >= 0 ? fila[idx.categoria] : ''
    const rCategoria = normalizarValor(categoriaRaw, categorias)
    if (rCategoria.valor && !rCategoria.reconocido) {
      avisos.push(`"${nombre}": categoría "${rCategoria.valor}" no reconocida — revisar.`)
    }

    const miembroRaw = idx.miembro >= 0 ? fila[idx.miembro] : ''
    const rMiembro = normalizarValor(miembroRaw, miembros)
    if (rMiembro.valor && !rMiembro.reconocido) {
      avisos.push(`"${nombre}": miembro "${rMiembro.valor}" no reconocido — revisar.`)
    }

    const lateralidadRaw = idx.lateralidad >= 0 ? fila[idx.lateralidad] : ''
    const rLateralidad = normalizarValor(lateralidadRaw, lateralidades)
    if (rLateralidad.valor && !rLateralidad.reconocido) {
      avisos.push(`"${nombre}": lateralidad "${rLateralidad.valor}" no reconocida — revisar.`)
    }

    const contraccionRaw = idx.contraccion >= 0 ? fila[idx.contraccion] : ''
    const rContraccion = normalizarValor(contraccionRaw, contracciones)
    if (rContraccion.valor && !rContraccion.reconocido) {
      avisos.push(`"${nombre}": contracción "${rContraccion.valor}" no reconocida — revisar.`)
    }

    const patronRaw = idx.patron >= 0 ? fila[idx.patron] : ''
    const rPatron = normalizarLista(patronRaw, patrones)
    rPatron.noReconocidos.forEach((v) => avisos.push(`"${nombre}": patrón "${v}" no reconocido — revisar.`))

    const materialRaw = idx.material >= 0 ? fila[idx.material] : ''
    const rMaterial = normalizarLista(materialRaw, materiales)
    rMaterial.noReconocidos.forEach((v) => avisos.push(`"${nombre}": material "${v}" no reconocido — revisar.`))

    const fila_bd = {
      nombre,
      url_youtube: enlace || null,
      youtube_id: youtubeId || null,
      categoria: rCategoria.valor || null,
      miembro: rMiembro.valor || null,
      lateralidad: rLateralidad.valor || null,
      // guardamos el patrón como texto (posibles varios valores separados por coma),
      // igual que ya lo gestiona el formulario manual de la App
      patron: rPatron.valores.join(', ') || null,
      contraccion: rContraccion.valor || null,
      material: rMaterial.valores,
    }

    const idExistente = idPorNombre.get(clave)
    if (idExistente) {
      fila_bd.id = idExistente
    }
    paraUpsert.push(fila_bd)
  }

  if (paraUpsert.length === 0) {
    return res.status(422).json({ error: 'No se encontró ninguna fila válida en el Sheet.' })
  }

  const insertados = paraUpsert.filter((f) => !f.id).length
  const actualizados = paraUpsert.filter((f) => f.id).length

  const { error: errorUpsert } = await supabase.from('ejercicios').upsert(paraUpsert, { onConflict: 'id' })
  if (errorUpsert) {
    return res.status(500).json({ error: 'No se pudo guardar en la base de datos: ' + errorUpsert.message })
  }

  return res.status(200).json({ insertados, actualizados, avisos })
}
