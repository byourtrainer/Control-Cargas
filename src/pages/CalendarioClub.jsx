import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './CalendarioClub.css'

import { fechaISOLocal, hoyISOLocal as hoyISO } from '../lib/fechas'

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const tiposEvento = ['Entrenamiento', 'Amistoso', 'Liga', 'Europa', 'Copa del Rey', 'Play-Off']
const opcionesTipoSesion = ['Pista', 'Gimnasio', 'Recuperación']

const colorPorTipo = {
  'Entrenamiento': '#8a968c',
  'Amistoso': '#4dc8ff',
  'Liga': '#c8ff4d',
  'Europa': '#a24dff',
  'Copa del Rey': '#f2c14e',
  'Play-Off': '#ea5c4a',
}

const nivelesIntensidad = [
  { valor: 'baja', etiqueta: 'Baja', color: 'var(--risk-low)' },
  { valor: 'media', etiqueta: 'Media', color: 'var(--risk-mid)' },
  { valor: 'alta', etiqueta: 'Alta', color: 'var(--risk-high)' },
]
const colorIntensidad = Object.fromEntries(nivelesIntensidad.map((n) => [n.valor, n.color]))
const etiquetaIntensidad = Object.fromEntries(nivelesIntensidad.map((n) => [n.valor, n.etiqueta]))
const ordenIntensidad = nivelesIntensidad.map((n) => n.valor)

/** Devuelve la intensidad (array o null) siempre en el mismo orden (baja→media→alta). */
function ordenarIntensidad(intensidad) {
  if (!intensidad || intensidad.length === 0) return []
  return ordenIntensidad.filter((v) => intensidad.includes(v))
}

const vacio = { tipo: 'Liga', titulo: '', hora: '', rival: '', lugar: '', notas: '', fechaFin: '', intensidad: [], duracionMin: '', tipoSesion: '' }

/** Texto que identifica el evento: el título si lo hay, o "vs Rival" si no. */
function tituloEfectivo(ev) {
  if (ev.titulo && ev.titulo.trim()) return ev.titulo
  if (ev.rival) return `vs ${ev.rival}`
  return ev.tipo
}

/** Si "fecha" cae dentro del rango [ev.fecha, ev.fecha_fin || ev.fecha]. */
function eventoIncluyeFecha(ev, fecha) {
  const fin = ev.fecha_fin || ev.fecha
  return fecha >= ev.fecha && fecha <= fin
}

/** Cualquier tipo de evento que no sea un entrenamiento normal cuenta como partido. */
function esPartido(tipo) {
  return tipo !== 'Entrenamiento'
}

const opcionesMDx = ['MD', 'MD+1', 'MD+2', 'MD+/-3', 'MD-2', 'MD-1']
const claveTipo = (tipo) => tipo || '__sin_tipo__'

function formatearFechaLarga(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function CalendarioClub({ equipoActivo = 'todos', equipos = [], jugadorActivo = 'equipo', fechaDesde, fechaHasta }) {
  const esSinAsignar = equipoActivo === 'sin_asignar'
  const esEquipoConcreto = equipoActivo !== 'todos' && !esSinAsignar

  const [jugadoresSinAsignar, setJugadoresSinAsignar] = useState([])
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState('')
  const [personalizarDuraciones, setPersonalizarDuraciones] = useState(false)
  const [duracionesPorJugador, setDuracionesPorJugador] = useState({})
  const [jugadoresPersonalizacion, setJugadoresPersonalizacion] = useState([])
  const [cargandoPersonalizacion, setCargandoPersonalizacion] = useState(false)

  const modoDestino = esEquipoConcreto ? 'equipo' : (esSinAsignar && jugadorSeleccionado ? 'jugador' : null)
  const nombreDestino = esEquipoConcreto
    ? equipos.find((e) => e.id === equipoActivo)?.nombre
    : jugadoresSinAsignar.find((j) => j.id === jugadorSeleccionado)?.nombre

  const [mesVisible, setMesVisible] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyISO())
  const [form, setForm] = useState(vacio)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [borrandoId, setBorrandoId] = useState(null)
  const [editandoId, setEditandoId] = useState(null)

  // --- Pestaña interna del panel del día: Evento / Contenido ---
  const [subVistaPanel, setSubVistaPanel] = useState('evento')

  // --- Contenido de la sesión (fusionado desde la antigua Planificación) ---
  const [modoAsignacionContenido, setModoAsignacionContenido] = useState('grupo')
  const [jugadoresContenido, setJugadoresContenido] = useState([])
  const [sesionesDelDiaContenido, setSesionesDelDiaContenido] = useState({})
  const [duracionGrupoContenido, setDuracionGrupoContenido] = useState(60)
  const [duracionesIndividualesContenido, setDuracionesIndividualesContenido] = useState({})
  const [microcicloContenido, setMicrocicloContenido] = useState('')
  const [mdxContenido, setMdxContenido] = useState('')
  const [tipoSesionContenido, setTipoSesionContenido] = useState('')
  const [contenidoTexto, setContenidoTexto] = useState('')
  const [editandoContenidoTexto, setEditandoContenidoTexto] = useState(false)
  const [guardandoContenido, setGuardandoContenido] = useState(false)
  const [mensajeContenido, setMensajeContenido] = useState(null)
  const [cargandoContenido, setCargandoContenido] = useState(true)

  useEffect(() => {
    if (subVistaPanel === 'contenido') cargarJugadoresYSesionContenido()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subVistaPanel, fechaSeleccionada, modoDestino, jugadorSeleccionado, equipoActivo])

  useEffect(() => {
    const clave = claveTipo(tipoSesionContenido)
    const filas = jugadoresContenido.map((j) => sesionesDelDiaContenido[j.id]?.[clave]).filter(Boolean)
    const primera = filas[0]
    setDuracionGrupoContenido(primera ? primera.duracion_min : 60)
    setMicrocicloContenido(primera?.microciclo || '')
    setMdxContenido(primera?.mdx || '')
    setContenidoTexto(primera?.contenido || '')
    setEditandoContenidoTexto(false)
    const indivInicial = {}
    jugadoresContenido.forEach((j) => {
      const fila = sesionesDelDiaContenido[j.id]?.[clave]
      indivInicial[j.id] = fila ? String(fila.duracion_min) : ''
    })
    setDuracionesIndividualesContenido(indivInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoSesionContenido, sesionesDelDiaContenido, jugadoresContenido])

  async function cargarJugadoresYSesionContenido() {
    setCargandoContenido(true)
    setMensajeContenido(null)
    let lista = []
    if (modoDestino === 'jugador') {
      const encontrado = jugadoresSinAsignar.find((j) => j.id === jugadorSeleccionado)
      lista = encontrado ? [encontrado] : []
    } else if (modoDestino === 'equipo') {
      const { data: perfiles } = await supabase.from('perfiles').select('id, nombre, equipo_id').eq('rol', 'jugador').order('nombre')
      lista = (perfiles || []).filter((j) => {
        if (equipoActivo === 'todos') return true
        if (equipoActivo === 'sin_asignar') return !j.equipo_id
        return j.equipo_id === equipoActivo
      })
    }
    setJugadoresContenido(lista)

    const ids = lista.map((j) => j.id)
    const { data: sesionesData } = ids.length > 0
      ? await supabase.from('sesiones').select('*').eq('fecha', fechaSeleccionada).in('jugador_id', ids)
      : { data: [] }

    const mapa = {}
    ;(sesionesData || []).forEach((s) => {
      if (!mapa[s.jugador_id]) mapa[s.jugador_id] = {}
      mapa[s.jugador_id][claveTipo(s.tipo_sesion)] = s
    })
    setSesionesDelDiaContenido(mapa)
    setCargandoContenido(false)
  }

  async function guardarGrupoContenido(e) {
    e.preventDefault()
    if (jugadoresContenido.length === 0) return
    setGuardandoContenido(true)
    setMensajeContenido(null)
    const filas = jugadoresContenido.map((j) => ({
      fecha: fechaSeleccionada, jugador_id: j.id, duracion_min: duracionGrupoContenido,
      microciclo: microcicloContenido || null, mdx: mdxContenido || null,
      tipo_sesion: tipoSesionContenido || null, contenido: contenidoTexto || null,
    }))
    const { error } = await supabase.from('sesiones').upsert(filas, { onConflict: 'fecha,jugador_id,tipo_sesion' })
    if (error) {
      setMensajeContenido({ tipo: 'error', texto: 'No se pudo guardar la sesión.' })
    } else {
      setMensajeContenido({ tipo: 'ok', texto: `Sesión guardada para ${jugadoresContenido.length} jugador(es).` })
      cargarJugadoresYSesionContenido()
    }
    setGuardandoContenido(false)
  }

  async function guardarIndividualContenido(e) {
    e.preventDefault()
    const filas = jugadoresContenido
      .filter((j) => duracionesIndividualesContenido[j.id] !== '' && duracionesIndividualesContenido[j.id] != null)
      .map((j) => ({
        fecha: fechaSeleccionada, jugador_id: j.id, duracion_min: Number(duracionesIndividualesContenido[j.id]),
        microciclo: microcicloContenido || null, mdx: mdxContenido || null,
        tipo_sesion: tipoSesionContenido || null, contenido: contenidoTexto || null,
      }))
    if (filas.length === 0) {
      setMensajeContenido({ tipo: 'error', texto: 'Introduce al menos una duración.' })
      return
    }
    setGuardandoContenido(true)
    setMensajeContenido(null)
    const { error } = await supabase.from('sesiones').upsert(filas, { onConflict: 'fecha,jugador_id,tipo_sesion' })
    if (error) {
      setMensajeContenido({ tipo: 'error', texto: 'No se pudo guardar la sesión.' })
    } else {
      setMensajeContenido({ tipo: 'ok', texto: `Sesión guardada para ${filas.length} jugador(es).` })
      cargarJugadoresYSesionContenido()
    }
    setGuardandoContenido(false)
  }

  async function eliminarSesionJugadorContenido(jugadorId) {
    setGuardandoContenido(true)
    const { error } = await supabase.from('sesiones').delete()
      .eq('fecha', fechaSeleccionada).eq('jugador_id', jugadorId).eq('tipo_sesion', tipoSesionContenido || null)
    if (!error) cargarJugadoresYSesionContenido()
    setGuardandoContenido(false)
  }

  async function eliminarSesionGrupoContenido() {
    if (!window.confirm(`¿Eliminar la sesión${tipoSesionContenido ? ` de ${tipoSesionContenido}` : ''} de este día para los ${jugadoresContenido.length} jugadores del grupo activo?`)) return
    setGuardandoContenido(true)
    const ids = jugadoresContenido.map((j) => j.id)
    const { error } = await supabase.from('sesiones').delete()
      .eq('fecha', fechaSeleccionada).in('jugador_id', ids).eq('tipo_sesion', tipoSesionContenido || null)
    if (!error) {
      setMensajeContenido({ tipo: 'ok', texto: 'Sesión eliminada.' })
      cargarJugadoresYSesionContenido()
    }
    setGuardandoContenido(false)
  }

  const claveContenidoActual = claveTipo(tipoSesionContenido)
  const jugadoresConSesionContenido = jugadoresContenido.filter((j) => sesionesDelDiaContenido[j.id]?.[claveContenidoActual]).length
  const tiposGuardadosHoyContenido = [...new Set(
    jugadoresContenido.flatMap((j) => Object.values(sesionesDelDiaContenido[j.id] || {}).map((s) => s.tipo_sesion || 'Sin tipo'))
  )]

  // --- Diario de sesiones ---
  const [diarioAbierto, setDiarioAbierto] = useState(false)
  const [cargandoDiario, setCargandoDiario] = useState(false)
  const [entradasDiario, setEntradasDiario] = useState([])
  const [busquedaDiario, setBusquedaDiario] = useState('')

  useEffect(() => {
    if (diarioAbierto) cargarDiario()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [diarioAbierto, equipoActivo, jugadorActivo, fechaDesde, fechaHasta])

  async function cargarDiario() {
    setCargandoDiario(true)
    let idsJugadores = []
    let mapaNombres = {}
    if (jugadorActivo !== 'equipo') {
      idsJugadores = [jugadorActivo]
      const { data: perfil } = await supabase.from('perfiles').select('id, nombre').eq('id', jugadorActivo).maybeSingle()
      if (perfil) mapaNombres[perfil.id] = perfil.nombre
    } else {
      const { data: perfiles } = await supabase.from('perfiles').select('id, nombre, equipo_id').eq('rol', 'jugador')
      const filtrados = (perfiles || []).filter((j) => {
        if (equipoActivo === 'todos') return true
        if (equipoActivo === 'sin_asignar') return !j.equipo_id
        return j.equipo_id === equipoActivo
      })
      idsJugadores = filtrados.map((j) => j.id)
      filtrados.forEach((j) => { mapaNombres[j.id] = j.nombre })
    }
    if (idsJugadores.length === 0) { setEntradasDiario([]); setCargandoDiario(false); return }

    const { data } = await supabase
      .from('sesiones')
      .select('fecha, tipo_sesion, contenido, jugador_id, evento_id')
      .in('jugador_id', idsJugadores)
      .not('contenido', 'is', null)
      .gte('fecha', fechaDesde || '2000-01-01')
      .lte('fecha', fechaHasta || hoyISO())
      .order('fecha', { ascending: false })

    let eventosQuery = supabase.from('eventos_calendario').select('id, fecha, tipo, notas')
      .not('notas', 'is', null)
      .gte('fecha', fechaDesde || '2000-01-01')
      .lte('fecha', fechaHasta || hoyISO())
    if (jugadorActivo !== 'equipo') {
      eventosQuery = eventosQuery.eq('jugador_id', jugadorActivo)
    } else if (equipoActivo !== 'todos' && equipoActivo !== 'sin_asignar') {
      eventosQuery = eventosQuery.eq('equipo_id', equipoActivo)
    }
    const { data: eventosConNotas } = await eventosQuery
    const eventosYaCubiertos = new Set((data || []).map((s) => s.evento_id).filter(Boolean))
    const eventosHuerfanos = (eventosConNotas || []).filter((e) => !eventosYaCubiertos.has(e.id))

    const grupos = {}
    ;(data || []).forEach((fila) => {
      const clave = `${fila.fecha}|${fila.tipo_sesion || ''}`
      if (!grupos[clave]) grupos[clave] = { fecha: fila.fecha, tipo_sesion: fila.tipo_sesion, porContenido: {} }
      const c = fila.contenido
      if (!grupos[clave].porContenido[c]) grupos[clave].porContenido[c] = []
      grupos[clave].porContenido[c].push(mapaNombres[fila.jugador_id] || '—')
    })
    eventosHuerfanos.forEach((ev) => {
      const clave = `${ev.fecha}|evento-${ev.id}`
      grupos[clave] = { fecha: ev.fecha, tipo_sesion: ev.tipo, porContenido: { [ev.notas]: ['Nota del evento (sin duración asignada)'] } }
    })

    const entradas = Object.values(grupos).map((g) => ({
      fecha: g.fecha,
      tipo_sesion: g.tipo_sesion,
      bloques: Object.entries(g.porContenido).map(([contenido, nombres]) => ({ contenido, nombres })),
    }))
    entradas.sort((a, b) => b.fecha.localeCompare(a.fecha))
    setEntradasDiario(entradas)
    setCargandoDiario(false)
  }

  const textoNombreJugadorDiario = jugadorActivo !== 'equipo' ? jugadoresContenido.find((j) => j.id === jugadorActivo)?.nombre : null
  const entradasFiltradasDiario = entradasDiario.filter((e) => {
    if (!busquedaDiario.trim()) return true
    const q = busquedaDiario.trim().toLowerCase()
    return e.bloques.some((b) => b.contenido.toLowerCase().includes(q))
  })

  useEffect(() => {
    if (esSinAsignar) cargarJugadoresSinAsignar()
    else setJugadorSeleccionado('')
  }, [esSinAsignar])

  useEffect(() => { if (modoDestino) { cargarMes(); cargarNotaMes() } }, [mesVisible, modoDestino, equipoActivo, jugadorSeleccionado])

  // --- Contexto compartido por notas e intensidad: equipo o jugador individual ---
  const campoContexto = modoDestino === 'equipo' ? 'equipo_id' : 'jugador_id'
  const valorContexto = modoDestino === 'equipo' ? equipoActivo : jugadorSeleccionado

  // --- Notas del mes (fijas por mes, consultables como historial después) ---
  const [notaMesTexto, setNotaMesTexto] = useState('')
  const [notaMesId, setNotaMesId] = useState(null)
  const [notaMesCargada, setNotaMesCargada] = useState(false)
  const [guardandoNota, setGuardandoNota] = useState(false)
  const [historialNotasAbierto, setHistorialNotasAbierto] = useState(false)
  const [historialNotas, setHistorialNotas] = useState([])
  const [cargandoHistorialNotas, setCargandoHistorialNotas] = useState(false)

  async function cargarNotaMes() {
    setNotaMesCargada(false)
    const { data } = await supabase.from('notas_calendario').select('*')
      .eq(campoContexto, valorContexto).eq('anio', mesVisible.getFullYear()).eq('mes', mesVisible.getMonth() + 1)
      .maybeSingle()
    setNotaMesTexto(data?.texto || '')
    setNotaMesId(data?.id || null)
    setNotaMesCargada(true)
    setHistorialNotasAbierto(false)
  }

  async function guardarNotaMes() {
    setGuardandoNota(true)
    if (notaMesId) {
      await supabase.from('notas_calendario').update({ texto: notaMesTexto, actualizado_en: new Date().toISOString() }).eq('id', notaMesId)
    } else if (notaMesTexto.trim()) {
      const { data } = await supabase.from('notas_calendario')
        .insert({ [campoContexto]: valorContexto, anio: mesVisible.getFullYear(), mes: mesVisible.getMonth() + 1, texto: notaMesTexto })
        .select().single()
      if (data) setNotaMesId(data.id)
    }
    setGuardandoNota(false)
  }

  async function cargarHistorialNotas() {
    setCargandoHistorialNotas(true)
    const { data } = await supabase.from('notas_calendario').select('*')
      .eq(campoContexto, valorContexto)
      .order('anio', { ascending: false }).order('mes', { ascending: false })
    const actual = { anio: mesVisible.getFullYear(), mes: mesVisible.getMonth() + 1 }
    setHistorialNotas((data || []).filter((n) => n.texto.trim() && !(n.anio === actual.anio && n.mes === actual.mes)))
    setCargandoHistorialNotas(false)
  }

  // --- Intensidad por día (independiente de si hay o no evento ese día) ---
  const [intensidadDias, setIntensidadDias] = useState({}) // fecha -> 'baja'|'media'|'alta'
  const [guardandoIntensidadDia, setGuardandoIntensidadDia] = useState(false)

  async function establecerIntensidadDia(nivel) {
    setGuardandoIntensidadDia(true)
    const yaTiene = intensidadDias[fechaSeleccionada]
    if (yaTiene === nivel) {
      await supabase.from('intensidad_dias').delete().eq(campoContexto, valorContexto).eq('fecha', fechaSeleccionada)
      setIntensidadDias((prev) => { const copia = { ...prev }; delete copia[fechaSeleccionada]; return copia })
    } else if (yaTiene) {
      await supabase.from('intensidad_dias').update({ intensidad: nivel }).eq(campoContexto, valorContexto).eq('fecha', fechaSeleccionada)
      setIntensidadDias((prev) => ({ ...prev, [fechaSeleccionada]: nivel }))
    } else {
      await supabase.from('intensidad_dias').insert({ [campoContexto]: valorContexto, fecha: fechaSeleccionada, intensidad: nivel })
      setIntensidadDias((prev) => ({ ...prev, [fechaSeleccionada]: nivel }))
    }
    setGuardandoIntensidadDia(false)
  }

  async function cargarJugadoresSinAsignar() {
    const { data } = await supabase
      .from('perfiles').select('id, nombre')
      .eq('rol', 'jugador').is('equipo_id', null).order('nombre')
    setJugadoresSinAsignar(data || [])
  }

  async function cargarMes() {
    setCargando(true)
    const inicio = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1)
    const fin = fechaISOLocal(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0))
    const inicioConsulta = new Date(inicio); inicioConsulta.setDate(inicioConsulta.getDate() - 45)
    let consulta = supabase
      .from('eventos_calendario')
      .select('*')
      .gte('fecha', fechaISOLocal(inicioConsulta))
      .lte('fecha', fin)
      .order('hora', { ascending: true })
    consulta = modoDestino === 'equipo' ? consulta.eq('equipo_id', equipoActivo) : consulta.eq('jugador_id', jugadorSeleccionado)
    const { data } = await consulta
    setEventos(data || [])

    const { data: intensidades } = await supabase.from('intensidad_dias').select('fecha, intensidad')
      .eq(campoContexto, valorContexto)
      .gte('fecha', fechaISOLocal(inicioConsulta)).lte('fecha', fin)
    setIntensidadDias(Object.fromEntries((intensidades || []).map((i) => [i.fecha, i.intensidad])))

    setCargando(false)
  }

  function cambiarMes(delta) {
    const d = new Date(mesVisible)
    d.setMonth(d.getMonth() + delta)
    setMesVisible(d)
  }

  function irAHoy() {
    const d = new Date(); d.setDate(1)
    setMesVisible(d)
    setFechaSeleccionada(hoyISO())
  }

  function seleccionarDia(fecha) {
    setFechaSeleccionada(fecha)
    setForm(vacio)
    setEditandoId(null)
    setMensaje(null)
  }

  function empezarEdicion(ev) {
    setForm({
      tipo: ev.tipo,
      titulo: ev.titulo || '',
      hora: ev.hora || '',
      rival: ev.rival || '',
      lugar: ev.lugar || '',
      notas: ev.notas || '',
      fechaFin: ev.fecha_fin || '',
      intensidad: ev.intensidad || [],
      duracionMin: ev.duracion_min ?? '',
      tipoSesion: ev.tipo_sesion || '',
    })
    setEditandoId(ev.id)
    setMensaje(null)
    setPersonalizarDuraciones(false)
    setDuracionesPorJugador({})
  }

  function cancelarEdicion() {
    setForm(vacio)
    setEditandoId(null)
    setMensaje(null)
    setPersonalizarDuraciones(false)
    setDuracionesPorJugador({})
  }

  async function abrirPersonalizacionDuraciones() {
    setCargandoPersonalizacion(true)
    const { data: perfiles } = await supabase.from('perfiles').select('id, nombre, equipo_id').eq('rol', 'jugador').order('nombre')
    const delEquipo = (perfiles || []).filter((j) => {
      if (equipoActivo === 'todos') return true
      if (equipoActivo === 'sin_asignar') return !j.equipo_id
      return j.equipo_id === equipoActivo
    })
    setJugadoresPersonalizacion(delEquipo)

    // Precarga con la duración que cada jugador ya tuviera en este evento
    // (si se está editando uno existente), o si no, la duración general del formulario.
    const iniciales = {}
    if (editandoId) {
      const { data: existentes } = await supabase.from('sesiones').select('jugador_id, duracion_min').eq('evento_id', editandoId)
      const mapa = Object.fromEntries((existentes || []).map((s) => [s.jugador_id, s.duracion_min]))
      delEquipo.forEach((j) => { iniciales[j.id] = String(mapa[j.id] ?? form.duracionMin ?? '') })
    } else {
      delEquipo.forEach((j) => { iniciales[j.id] = String(form.duracionMin || '') })
    }
    setDuracionesPorJugador(iniciales)
    setPersonalizarDuraciones(true)
    setCargandoPersonalizacion(false)
  }

  async function crearSesionesDesdeEvento(datosEvento, eventoId, duracionesPersonalizadas) {
    if (!datosEvento.duracion_min && !duracionesPersonalizadas) return { ok: true }

    let idsJugadores = []
    if (modoDestino === 'equipo') {
      const { data } = await supabase.from('perfiles').select('id, equipo_id').eq('rol', 'jugador')
      idsJugadores = (data || [])
        .filter((j) => {
          if (equipoActivo === 'todos') return true
          if (equipoActivo === 'sin_asignar') return !j.equipo_id
          return j.equipo_id === equipoActivo
        })
        .map((j) => j.id)
    } else if (modoDestino === 'jugador') {
      idsJugadores = [jugadorSeleccionado]
    }
    if (idsJugadores.length === 0) return { ok: true }

    // Si alguno de estos jugadores ya tenía una sesión vinculada a ESTE
    // evento concreto (por ejemplo, se está editando un evento ya
    // guardado), se actualiza esa misma fila — conservando su id y, por
    // tanto, el RPE que el jugador ya hubiera puesto — en vez de crear
    // una fila nueva que dejaría la antigua huérfana con el RPE
    // desconectado. Solo se inserta una fila nueva para quien no tuviera
    // ya una.
    let existentes = []
    if (eventoId) {
      const { data } = await supabase.from('sesiones').select('id, jugador_id').eq('evento_id', eventoId)
      existentes = data || []
    }
    const idSesionPorJugador = Object.fromEntries(existentes.map((s) => [s.jugador_id, s.id]))

    let error = null
    for (const jugador_id of idsJugadores) {
      // Si hay duraciones personalizadas por jugador, cada uno usa la
      // suya (o la del evento si no se ha tocado la suya en concreto);
      // si no, todos comparten la duración única del evento, como hasta ahora.
      const duracionDeEste = duracionesPersonalizadas?.[jugador_id] ?? datosEvento.duracion_min
      if (!duracionDeEste) continue

      const datosComunes = {
        fecha: datosEvento.fecha,
        duracion_min: duracionDeEste,
        tipo_sesion: datosEvento.tipo_sesion,
        contenido: datosEvento.notas,
        mdx: datosEvento.tipo !== 'Entrenamiento' ? 'MD' : null,
        evento_id: eventoId || null,
      }

      if (idSesionPorJugador[jugador_id]) {
        const { error: e } = await supabase.from('sesiones').update(datosComunes).eq('id', idSesionPorJugador[jugador_id])
        if (e) error = e
      } else {
        const { error: e } = await supabase
          .from('sesiones')
          .upsert({ ...datosComunes, jugador_id }, { onConflict: 'fecha,jugador_id,tipo_sesion' })
        if (e) error = e
      }
    }
    return { ok: !error }
  }

  async function guardarEvento(e) {
    e.preventDefault()
    const esEntrenamiento = form.tipo === 'Entrenamiento'

    if (esEntrenamiento && !form.titulo.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ponle un título al entrenamiento.' })
      return
    }
    if (!esEntrenamiento && !form.rival.trim()) {
      setMensaje({ tipo: 'error', texto: 'Indica el rival (el título es opcional para partidos/competiciones).' })
      return
    }
    if (form.fechaFin && form.fechaFin < fechaSeleccionada) {
      setMensaje({ tipo: 'error', texto: 'La fecha de fin no puede ser anterior a la fecha de inicio.' })
      return
    }

    setGuardando(true)
    setMensaje(null)
    const datos = {
      equipo_id: modoDestino === 'equipo' ? equipoActivo : null,
      jugador_id: modoDestino === 'jugador' ? jugadorSeleccionado : null,
      fecha: fechaSeleccionada,
      fecha_fin: form.fechaFin || null,
      tipo: form.tipo,
      titulo: form.titulo.trim() || null,
      hora: form.hora || null,
      rival: form.rival || null,
      lugar: form.lugar || null,
      notas: form.notas || null,
      intensidad: form.intensidad.length > 0 ? form.intensidad : null,
      duracion_min: form.duracionMin === '' ? null : Number(form.duracionMin),
      tipo_sesion: esEntrenamiento ? (form.tipoSesion || null) : 'Partido',
    }
    let error
    let eventoIdFinal = editandoId
    if (editandoId) {
      ;({ error } = await supabase.from('eventos_calendario').update(datos).eq('id', editandoId))
    } else {
      const resultado = await supabase.from('eventos_calendario').insert(datos).select('id').single()
      error = resultado.error
      eventoIdFinal = resultado.data?.id
    }

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar el evento.' })
    } else {
      const duracionesAEnviar = personalizarDuraciones
        ? Object.fromEntries(Object.entries(duracionesPorJugador).map(([id, v]) => [id, v === '' ? null : Number(v)]))
        : null
      const resultadoSesiones = await crearSesionesDesdeEvento(datos, eventoIdFinal, duracionesAEnviar)
      setForm(vacio)
      setPersonalizarDuraciones(false)
      setDuracionesPorJugador({})
      setEditandoId(null)
      setMensaje(
        !resultadoSesiones.ok
          ? { tipo: 'error', texto: 'El evento se guardó, pero hubo un problema al aplicar la duración a los jugadores.' }
          : { tipo: 'ok', texto: editandoId ? 'Evento actualizado.' : 'Evento añadido.' }
      )
      cargarMes()
    }
    setGuardando(false)
  }

  async function eliminarEvento(id) {
    setBorrandoId(id)
    const { error } = await supabase.from('eventos_calendario').delete().eq('id', id)
    if (!error) setEventos((prev) => prev.filter((ev) => ev.id !== id))
    setBorrandoId(null)
  }

  if (equipoActivo === 'todos') {
    return (
      <div className="calendario-club-layout">
        <section className="calendario-club-sin-equipo">
          <h2>Selecciona un club o un jugador</h2>
          <p className="texto-dim">
            El calendario es siempre de un destino concreto. Usa el selector <strong>◎</strong> de la
            cabecera y elige un equipo, o "Sin asignar" si quieres llevar el calendario de un
            deportista individual sin club.
          </p>
        </section>
      </div>
    )
  }

  if (esSinAsignar && !jugadorSeleccionado) {
    return (
      <div className="calendario-club-layout">
        <section className="calendario-club-sin-equipo">
          <h2>Elige un deportista</h2>
          <p className="texto-dim">
            Los deportistas sin equipo tienen su calendario individual — elige a quién le quieres
            llevar la agenda.
          </p>
          {jugadoresSinAsignar.length === 0 ? (
            <p className="texto-dim">No hay ningún jugador marcado como "Sin asignar" ahora mismo.</p>
          ) : (
            <select value={jugadorSeleccionado} onChange={(e) => setJugadorSeleccionado(e.target.value)} className="calendario-club-selector-jugador">
              <option value="">Elige un jugador…</option>
              {jugadoresSinAsignar.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          )}
        </section>
      </div>
    )
  }

  const primerDiaSemana = (new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1).getDay() + 6) % 7
  const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate()
  const celdas = []
  for (let i = 0; i < primerDiaSemana; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  function fechaDe(d) {
    const mm = String(mesVisible.getMonth() + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${mesVisible.getFullYear()}-${mm}-${dd}`
  }

  const esEntrenamientoForm = form.tipo === 'Entrenamiento'
  const eventosDelDiaSeleccionado = eventos.filter((ev) => eventoIncluyeFecha(ev, fechaSeleccionada))
  const hoy = hoyISO()

  return (
    <>
    <div className="calendario-club-layout">
      <div className="calendario-club-titulo-imprimir">
        <h2>Calendario — {nombreDestino}</h2>
        <p className="texto-dim">{MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}</p>
      </div>

      <section className="calendario-card calendario-club-card">
        <div className="calendario-cabecera">
          <button className="calendario-nav no-imprimir" onClick={() => cambiarMes(-1)}>←</button>
          <button className="calendario-mes-titulo" onClick={irAHoy}>
            {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
          </button>
          <button className="calendario-nav no-imprimir" onClick={() => cambiarMes(1)}>→</button>
          <button className="btn-exportar no-imprimir" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        </div>

        {esSinAsignar && (
          <div className="calendario-club-cambiar-jugador no-imprimir">
            <span className="texto-dim">Deportista:</span>
            <select value={jugadorSeleccionado} onChange={(e) => setJugadorSeleccionado(e.target.value)}>
              {jugadoresSinAsignar.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </div>
        )}

        <div className="calendario-club-notas-mes no-imprimir">
          <div className="panel-admin-cabecera-flex">
            <span className="texto-dim capitalizada">📝 Notas de {MESES[mesVisible.getMonth()].toLowerCase()}</span>
            <button
              type="button" className="equipo-cambiar-link"
              onClick={() => { const abrir = !historialNotasAbierto; setHistorialNotasAbierto(abrir); if (abrir) cargarHistorialNotas() }}
            >
              {historialNotasAbierto ? '▲ Ocultar meses anteriores' : '▼ Ver meses anteriores'}
            </button>
          </div>
          <textarea
            className="calendario-club-notas-textarea"
            value={notaMesTexto}
            onChange={(e) => setNotaMesTexto(e.target.value)}
            onBlur={guardarNotaMes}
            placeholder="Aspectos de la programación general de este mes…"
            rows={3}
            disabled={!notaMesCargada}
          />
          {guardandoNota && <p className="texto-faint mono">Guardando…</p>}

          {historialNotasAbierto && (
            <div className="calendario-club-historial-notas">
              {cargandoHistorialNotas ? (
                <p className="mono texto-dim">Cargando…</p>
              ) : historialNotas.length === 0 ? (
                <p className="texto-dim">No hay notas guardadas de meses anteriores.</p>
              ) : (
                historialNotas.map((n) => (
                  <div className="calendario-club-nota-pasada" key={n.id}>
                    <strong className="capitalizada">{MESES[n.mes - 1]} {n.anio}</strong>
                    <p>{n.texto}</p>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="calendario-dias-semana">
          {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
        </div>

        <div className={`calendario-grid ${cargando ? 'calendario-cargando' : ''}`}>
          {celdas.map((d, i) => {
            if (d === null) return <div key={i} className="calendario-celda calendario-celda-vacia" />
            const fecha = fechaDe(d)
            const eventosDia = eventos.filter((ev) => eventoIncluyeFecha(ev, fecha))
            const esHoy = fecha === hoy
            const esActiva = fecha === fechaSeleccionada
            const esDiaPartido = eventosDia.some((ev) => esPartido(ev.tipo))
            const intensidadDelDia = intensidadDias[fecha]
            return (
              <button
                key={i}
                className={`calendario-celda calendario-club-celda ${esHoy ? 'calendario-celda-hoy' : ''} ${esActiva ? 'calendario-celda-activa' : ''} ${esDiaPartido ? 'calendario-club-celda-partido' : ''}`}
                onClick={() => seleccionarDia(fecha)}
              >
                {intensidadDelDia && (
                  <span className="calendario-club-barra-intensidad" style={{ background: colorIntensidad[intensidadDelDia] }} />
                )}
                <span className="calendario-numero">{d}</span>
                <span className="calendario-club-puntos no-imprimir">
                  {eventosDia.slice(0, 4).map((ev) => (
                    <span key={ev.id} className="calendario-club-punto-doble">
                      <span className="calendario-club-punto" style={{ background: colorPorTipo[ev.tipo] }} />
                      {ordenarIntensidad(ev.intensidad).map((valor) => (
                        <span key={valor} className="calendario-club-punto calendario-club-punto-intensidad" style={{ background: colorIntensidad[valor] }} />
                      ))}
                    </span>
                  ))}
                </span>
                <span className="calendario-club-eventos-imprimir">
                  {eventosDia.map((ev) => (
                    <span
                      key={ev.id}
                      className="calendario-club-evento-linea"
                      style={{ borderLeftColor: colorPorTipo[ev.tipo] }}
                    >
                      {ordenarIntensidad(ev.intensidad).map((valor) => (
                        <span key={valor} className="calendario-club-intensidad-punto" style={{ background: colorIntensidad[valor] }} />
                      ))}
                      <strong>{ev.tipo}</strong> {tituloEfectivo(ev)}{ev.hora ? ` · ${ev.hora}` : ''}
                    </span>
                  ))}
                </span>
              </button>
            )
          })}
        </div>

        <div className="calendario-club-leyenda">
          {tiposEvento.map((t) => (
            <span key={t}><span className="calendario-club-leyenda-punto" style={{ background: colorPorTipo[t] }} /> {t}</span>
          ))}
        </div>
        <div className="calendario-club-leyenda calendario-club-leyenda-intensidad">
          <span className="texto-dim">Intensidad:</span>
          {nivelesIntensidad.map((n) => (
            <span key={n.valor}><span className="calendario-club-leyenda-punto" style={{ background: n.color }} /> {n.etiqueta}</span>
          ))}
        </div>
      </section>

      <section className="calendario-club-panel no-imprimir">
        <h2 className="capitalizada">
          {new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        <p className="texto-dim calendario-club-equipo">{nombreDestino}</p>

        <div className="calendario-club-intensidad-dia no-imprimir">
          <span className="texto-faint">Intensidad de este día:</span>
          <div className="calendario-club-intensidad-selector">
            {nivelesIntensidad.map((n) => {
              const activo = intensidadDias[fechaSeleccionada] === n.valor
              return (
                <button
                  key={n.valor} type="button"
                  className={`calendario-club-intensidad-boton ${activo ? 'calendario-club-intensidad-activo' : ''}`}
                  style={{ '--color-intensidad': n.color }}
                  disabled={guardandoIntensidadDia}
                  onClick={() => establecerIntensidadDia(n.valor)}
                >
                  <span className="calendario-club-intensidad-punto" style={{ background: n.color }} />
                  {n.etiqueta}
                </button>
              )
            })}
          </div>
        </div>

        {eventosDelDiaSeleccionado.length > 0 && modoDestino === 'equipo' && subVistaPanel === 'evento' && (
          <p className="texto-faint calendario-club-duracion-nota">
            → Usa la pestaña "Contenido" de abajo para poner una duración distinta por jugador.
          </p>
        )}

        <div className="informe-modo calendario-club-subtabs">
          <button className={`periodo-btn ${subVistaPanel === 'evento' ? 'periodo-activo' : ''}`} onClick={() => setSubVistaPanel('evento')}>
            Evento
          </button>
          <button className={`periodo-btn ${subVistaPanel === 'contenido' ? 'periodo-activo' : ''}`} onClick={() => setSubVistaPanel('contenido')}>
            Contenido
          </button>
        </div>

        {subVistaPanel === 'evento' && (
        <>
        {eventosDelDiaSeleccionado.length > 0 && (
          <ul className="calendario-club-lista">
            {eventosDelDiaSeleccionado.map((ev) => (
              <li key={ev.id}>
                <span className="calendario-club-tipo-badge" style={{ background: colorPorTipo[ev.tipo] + '33', color: colorPorTipo[ev.tipo] }}>
                  {ev.tipo}
                </span>
                <div className="calendario-club-evento-info">
                  <strong>{tituloEfectivo(ev)}</strong>
                  <span className="texto-dim">
                    {[ev.hora, (ev.titulo && ev.titulo.trim() && ev.rival) ? ev.rival : null, ev.lugar].filter(Boolean).join(' · ')}
                  </span>
                  {ev.fecha_fin && ev.fecha_fin !== ev.fecha && (
                    <span className="texto-dim calendario-club-rango">
                      Del {new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-ES')} al {new Date(ev.fecha_fin + 'T00:00:00').toLocaleDateString('es-ES')}
                    </span>
                  )}
                  {ev.duracion_min && (
                    <span className="texto-dim">
                      ⏱ {ev.duracion_min} min{ev.tipo_sesion ? ` · ${ev.tipo_sesion}` : ''}
                    </span>
                  )}
                  {ev.intensidad && ev.intensidad.length > 0 && (
                    <span className="calendario-club-intensidad-badge">
                      {ordenarIntensidad(ev.intensidad).map((valor) => (
                        <span key={valor} className="calendario-club-intensidad-punto" style={{ background: colorIntensidad[valor] }} />
                      ))}
                      Intensidad {ordenarIntensidad(ev.intensidad).map((v) => etiquetaIntensidad[v].toLowerCase()).join('-')}
                    </span>
                  )}
                  {ev.notas && <p className="calendario-club-evento-notas">{ev.notas}</p>}
                </div>
                <div className="calendario-club-evento-acciones">
                  <button
                    className="equipo-cambiar-link" onClick={() => empezarEdicion(ev)}
                    title="Editar evento"
                  >
                    Editar
                  </button>
                  <button
                    className="btn-eliminar-fila" onClick={() => eliminarEvento(ev.id)}
                    disabled={borrandoId === ev.id} title="Eliminar evento"
                  >
                    {borrandoId === ev.id ? '…' : '✕'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h3 className="calendario-club-subtitulo">
          {editandoId ? 'Editar evento' : '+ Añadir evento este día'}
          {editandoId && (
            <button type="button" className="equipo-cambiar-link calendario-club-cancelar-edicion" onClick={cancelarEdicion}>
              Cancelar
            </button>
          )}
        </h3>
        <form onSubmit={guardarEvento}>
          <label className="campo-sesion">
            <span>Tipo</span>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {tiposEvento.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          {esEntrenamientoForm ? (
            <label className="campo-sesion">
              <span>Título</span>
              <input
                type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ej. Pista, Gimnasio, Recuperación…" required
              />
            </label>
          ) : (
            <div className="fila-doble">
              <label className="campo-sesion">
                <span>Rival</span>
                <input
                  type="text" value={form.rival} onChange={(e) => setForm({ ...form, rival: e.target.value })}
                  placeholder="Ej. Real Madrid" required
                />
              </label>
              <label className="campo-sesion">
                <span>Título (opcional)</span>
                <input
                  type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Se usa vs Rival si se deja en blanco"
                />
              </label>
            </div>
          )}

          <div className="fila-doble">
            <label className="campo-sesion">
              <span>Hora (opcional)</span>
              <input type="text" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} placeholder="18:00" />
            </label>
            <label className="campo-sesion">
              <span>Hasta (opcional, evento de varios días)</span>
              <input type="date" value={form.fechaFin} min={fechaSeleccionada} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
            </label>
          </div>

          {esEntrenamientoForm && (
            <label className="campo-sesion">
              <span>Rival (opcional)</span>
              <input type="text" value={form.rival} onChange={(e) => setForm({ ...form, rival: e.target.value })} placeholder="—" />
            </label>
          )}

          <label className="campo-sesion">
            <span>Lugar (opcional)</span>
            <input type="text" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} placeholder="Casa / Fuera / estadio…" />
          </label>

          <div className="fila-doble">
            <label className="campo-sesion">
              <span>Duración (min) — aplica esta sesión al jugador o a todo el grupo activo</span>
              <input
                type="number" min="0" max="300" value={form.duracionMin}
                onChange={(e) => setForm({ ...form, duracionMin: e.target.value })}
                placeholder="Ej. 60"
              />
            </label>
            {esEntrenamientoForm && (
              <label className="campo-sesion">
                <span>Tipo de sesión</span>
                <select value={form.tipoSesion} onChange={(e) => setForm({ ...form, tipoSesion: e.target.value })}>
                  <option value="">Sin especificar</option>
                  {opcionesTipoSesion.map((op) => <option key={op} value={op}>{op}</option>)}
                </select>
              </label>
            )}
          </div>
          {form.duracionMin === '' && !personalizarDuraciones && (
            <p className="texto-faint calendario-club-duracion-nota">
              Sin duración, no se generará la sesión del día — el jugador no verá el cuestionario
              de RPE para este evento hasta que la rellenes (sea entrenamiento o partido).
            </p>
          )}
          {form.duracionMin !== '' && !personalizarDuraciones && (
            <p className="texto-faint calendario-club-duracion-nota">
              Al guardar, esta duración se aplicará a {modoDestino === 'equipo' ? 'todos los jugadores del equipo activo' : 'este jugador'} ese día.
            </p>
          )}

          {modoDestino === 'equipo' && (
            <>
              {!personalizarDuraciones ? (
                <button type="button" className="equipo-cambiar-link calendario-club-personalizar-link" onClick={abrirPersonalizacionDuraciones} disabled={cargandoPersonalizacion}>
                  {cargandoPersonalizacion ? 'Cargando…' : '✎ Personalizar duración por jugador'}
                </button>
              ) : (
                <div className="calendario-club-personalizacion">
                  <div className="panel-admin-cabecera-flex">
                    <span className="texto-faint">Duración individual por jugador (editar solo quien necesite algo distinto)</span>
                    <button type="button" className="equipo-cambiar-link" onClick={() => { setPersonalizarDuraciones(false); setDuracionesPorJugador({}) }}>Cancelar</button>
                  </div>
                  {jugadoresPersonalizacion.map((j) => (
                    <div className="calendario-club-fila-personalizacion" key={j.id}>
                      <span>{j.nombre}</span>
                      <input
                        type="number" min="0" max="300"
                        value={duracionesPorJugador[j.id] ?? ''}
                        onChange={(e) => setDuracionesPorJugador({ ...duracionesPorJugador, [j.id]: e.target.value })}
                        placeholder="min"
                      />
                    </div>
                  ))}
                  <p className="texto-faint calendario-club-duracion-nota">
                    Editar aquí no crea sesiones nuevas ni RPE nuevos para quien ya tuviera uno en
                    este evento — solo actualiza la duración de cada uno.
                  </p>
                </div>
              )}
            </>
          )}

          <label className="campo-sesion">
            <span>Intensidad esperada (opcional, hasta 2 — ej. rojo-amarillo)</span>
            <div className="calendario-club-intensidad-selector">
              {nivelesIntensidad.map((n) => {
                const activo = form.intensidad.includes(n.valor)
                const bloqueado = !activo && form.intensidad.length >= 2
                return (
                  <button
                    key={n.valor} type="button"
                    className={`calendario-club-intensidad-boton ${activo ? 'calendario-club-intensidad-activo' : ''}`}
                    style={{ '--color-intensidad': n.color }}
                    disabled={bloqueado}
                    onClick={() => setForm({
                      ...form,
                      intensidad: activo
                        ? form.intensidad.filter((v) => v !== n.valor)
                        : [...form.intensidad, n.valor],
                    })}
                  >
                    <span className="calendario-club-intensidad-punto" style={{ background: n.color }} />
                    {n.etiqueta}
                  </button>
                )
              })}
            </div>
          </label>

          <label className="campo-sesion">
            <span>Contenido de la sesión (opcional, solo lo ves tú)</span>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3} />
          </label>

          {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}

          <button type="submit" className="btn-principal" disabled={guardando}>
            {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : '+ Añadir evento'}
          </button>
        </form>
        </>
        )}

        {subVistaPanel === 'contenido' && (
          <>
            <p className="sesion-sub">
              {jugadoresConSesionContenido > 0
                ? `${jugadoresConSesionContenido} de ${jugadoresContenido.length} jugador(es) ya tienen sesión${tipoSesionContenido ? ` de ${tipoSesionContenido}` : ''} guardada este día.`
                : `Ningún jugador del grupo activo tiene sesión${tipoSesionContenido ? ` de ${tipoSesionContenido}` : ''} guardada este día todavía.`}
              {tiposGuardadosHoyContenido.length > 0 && (
                <span className="tipo-sesion-badge"> · Ya guardado hoy: {tiposGuardadosHoyContenido.join(', ')}</span>
              )}
            </p>

            {modoDestino === 'equipo' && (
              <div className="informe-modo">
                <button
                  className={`periodo-btn ${modoAsignacionContenido === 'grupo' ? 'periodo-activo' : ''}`}
                  onClick={() => setModoAsignacionContenido('grupo')}
                >
                  Todo el grupo
                </button>
                <button
                  className={`periodo-btn ${modoAsignacionContenido === 'individual' ? 'periodo-activo' : ''}`}
                  onClick={() => setModoAsignacionContenido('individual')}
                >
                  Por jugador
                </button>
              </div>
            )}

            {cargandoContenido ? (
              <p className="mono texto-dim">Cargando…</p>
            ) : jugadoresContenido.length === 0 ? (
              <p className="texto-dim">No hay jugadores en el grupo activo.</p>
            ) : (
              <form onSubmit={modoAsignacionContenido === 'grupo' ? guardarGrupoContenido : guardarIndividualContenido}>
                {modoAsignacionContenido === 'grupo' && (
                  <label className="campo-sesion">
                    <span>Duración (minutos) — se aplica a los {jugadoresContenido.length} jugadores del grupo activo</span>
                    <input
                      type="number" min="0" max="300" value={duracionGrupoContenido}
                      onChange={(e) => setDuracionGrupoContenido(Number(e.target.value))}
                      required
                    />
                  </label>
                )}

                <div className="fila-doble">
                  <label className="campo-sesion">
                    <span>Microciclo (opcional{modoAsignacionContenido === 'individual' ? ', se aplica a quien rellenes' : ''})</span>
                    <input
                      type="text" value={microcicloContenido} onChange={(e) => setMicrocicloContenido(e.target.value)}
                      placeholder="Ej. Largo 7, Corto 2"
                    />
                  </label>
                  <label className="campo-sesion">
                    <span>Tipo de sesión (MDx)</span>
                    <select value={mdxContenido} onChange={(e) => setMdxContenido(e.target.value)}>
                      <option value="">Sin especificar</option>
                      {opcionesMDx.map((op) => <option key={op} value={op}>{op}</option>)}
                    </select>
                  </label>
                </div>

                <label className="campo-sesion">
                  <span>Lugar / tipo de trabajo — puedes guardar una sesión distinta por cada tipo el mismo día</span>
                  <select value={tipoSesionContenido} onChange={(e) => setTipoSesionContenido(e.target.value)}>
                    <option value="">Sin especificar</option>
                    {opcionesTipoSesion.map((op) => <option key={op} value={op}>{op}</option>)}
                  </select>
                </label>

                <div className="campo-sesion">
                  <span>Contenido de la sesión (solo lo ves tú)</span>
                  {contenidoTexto && !editandoContenidoTexto ? (
                    <div className="contenido-sesion-lectura">
                      <p>{contenidoTexto}</p>
                      <button type="button" className="equipo-cambiar-link" onClick={() => setEditandoContenidoTexto(true)}>
                        ✎ Editar contenido de sesión
                      </button>
                    </div>
                  ) : (
                    <textarea
                      value={contenidoTexto} onChange={(e) => setContenidoTexto(e.target.value)}
                      rows={4} placeholder="Ej. Series de velocidad 6x30m, fuerza tren inferior, técnica de carrera…"
                    />
                  )}
                </div>

                {modoAsignacionContenido === 'individual' && (
                  <div className="duraciones-individuales">
                    {jugadoresContenido.map((j) => (
                      <div className="duracion-individual-fila" key={j.id}>
                        <span className="duracion-individual-nombre">{j.nombre}</span>
                        <input
                          type="number" min="0" max="300" placeholder="—"
                          value={duracionesIndividualesContenido[j.id] ?? ''}
                          onChange={(e) => setDuracionesIndividualesContenido({ ...duracionesIndividualesContenido, [j.id]: e.target.value })}
                        />
                        <span className="duracion-individual-min">min</span>
                        {sesionesDelDiaContenido[j.id]?.[claveContenidoActual] && (
                          <button
                            type="button" className="btn-eliminar-fila" title="Eliminar sesión de este jugador"
                            onClick={() => eliminarSesionJugadorContenido(j.id)} disabled={guardandoContenido}
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {mensajeContenido && (
                  <div className={mensajeContenido.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensajeContenido.texto}</div>
                )}

                <button type="submit" className="btn-principal" disabled={guardandoContenido}>
                  {guardandoContenido ? 'Guardando…' : modoAsignacionContenido === 'grupo' ? 'Guardar para todo el grupo' : 'Guardar duraciones individuales'}
                </button>
                {modoAsignacionContenido === 'grupo' && jugadoresConSesionContenido > 0 && (
                  <button type="button" className="btn-eliminar-sesion" onClick={eliminarSesionGrupoContenido} disabled={guardandoContenido}>
                    Eliminar sesión{tipoSesionContenido ? ` de ${tipoSesionContenido}` : ''} del grupo
                  </button>
                )}
              </form>
            )}
          </>
        )}
      </section>
    </div>

    <section className="diario-sesiones-card no-imprimir">
      <button type="button" className="diario-sesiones-cabecera" onClick={() => setDiarioAbierto((a) => !a)}>
        <h3>📔 Diario de sesiones{textoNombreJugadorDiario ? ` — ${textoNombreJugadorDiario}` : ''}</h3>
        <span className="diario-sesiones-plegar">{diarioAbierto ? '▲ Ocultar' : '▼ Mostrar'}</span>
      </button>

      {diarioAbierto && (
        <>
          <p className="texto-dim diario-sesiones-sub">
            Lo que se ha escrito en "Contenido de la sesión" a lo largo del tiempo, para el equipo,
            jugador y fechas que tengas seleccionados arriba en el ◎.
          </p>
          <input
            type="text" className="diario-sesiones-buscador" value={busquedaDiario}
            onChange={(e) => setBusquedaDiario(e.target.value)}
            placeholder="Buscar por palabra dentro del contenido…"
          />

          {cargandoDiario ? (
            <p className="mono texto-dim">Cargando…</p>
          ) : entradasFiltradasDiario.length === 0 ? (
            <p className="texto-dim">No hay contenido de sesión guardado en este periodo.</p>
          ) : (
            <div className="diario-sesiones-lista">
              {entradasFiltradasDiario.map((e, i) => (
                <div className="diario-sesiones-entrada" key={i}>
                  <div className="diario-sesiones-fecha">
                    <span className="capitalizada">{formatearFechaLarga(e.fecha)}</span>
                    {e.tipo_sesion && <span className="diario-sesiones-tipo">{e.tipo_sesion}</span>}
                  </div>
                  {e.bloques.map((b, j) => (
                    <div className="diario-sesiones-bloque" key={j}>
                      {e.bloques.length > 1 && <p className="diario-sesiones-nombres">{b.nombres.join(', ')}</p>}
                      <p className="diario-sesiones-contenido">{b.contenido}</p>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  </>
  )
}
