import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ReferenceLine, ReferenceArea, Cell, LabelList, LineChart, Line, BarChart, Bar,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { valorRelativo, indiceFatiga, tiposTest, traducirTipoTest, ultimosTestsPorTipo, interpretarCMJ, interpretarSentadilla, interpretarPotencia, interpretarFatigaWingate } from '../lib/testsFisicos'
import './Tests.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const aunNoCumplido = hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
  if (aunNoCumplido) edad--
  return edad
}

const traducirSexo = (s) => ({ masculino: 'Masculino', femenino: 'Femenino', neutro: 'Neutro' }[s] || '—')

function iniciales(nombre) {
  return (nombre || '')
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0])
    .join('')
    .toUpperCase()
    .slice(0, 3)
}

const formularioVacio = {
  jugador_id: '', tipo_test: 'sentadilla', fecha: hoyISO(), peso_corporal_kg: '',
  valor_kg: '', valor_cm: '', rsi_modificado: '', dri: '',
  pp1: '', mp1: '', pp2: '', mp2: '', notas: '',
}

// Métricas que alimentan tanto la evolución individual como la comparativa entre jugadores.
const metricasInforme = [
  { clave: 'sentadilla', etiqueta: 'Sentadilla (kg/peso corporal)', tipoTest: 'sentadilla', extraer: (t, peso) => valorRelativo(t.valor_kg, t.peso_corporal_kg || peso), decimales: 2 },
  { clave: 'iso_sq', etiqueta: 'ISO SQ (kg/peso corporal)', tipoTest: 'iso_sq', extraer: (t, peso) => valorRelativo(t.valor_kg, t.peso_corporal_kg || peso), decimales: 2 },
  { clave: 'cmj', etiqueta: 'CMJ (cm)', tipoTest: 'cmj', extraer: (t) => t.valor_cm, decimales: 1 },
  { clave: 'sj', etiqueta: 'SJ (cm)', tipoTest: 'sj', extraer: (t) => t.valor_cm, decimales: 1 },
  { clave: 'drop_jump', etiqueta: 'Drop Jump (DRI)', tipoTest: 'drop_jump', extraer: (t) => t.dri, decimales: 2 },
  { clave: 'wingate_potencia', etiqueta: 'Potencia Wingate (PP1, W/kg)', tipoTest: 'wingate', extraer: (t, peso) => valorRelativo(t.pp1, t.peso_corporal_kg || peso), decimales: 2 },
  { clave: 'wingate_fatiga', etiqueta: 'Índice de fatiga Wingate (%)', tipoTest: 'wingate', extraer: (t) => t.indice_fatiga ?? indiceFatiga(t.mp1, t.mp2), decimales: 1, mejorEsMenor: true },
]

function calcularDatosCuadrante1(jugadoresLista, testsLista) {
  return jugadoresLista.map((j) => {
    const suyos = testsLista.filter((t) => t.jugador_id === j.id)
    const porTipo = ultimosTestsPorTipo(suyos)
    const cmj = porTipo.cmj?.valor_cm
    const sentadilla = porTipo.sentadilla
    const pesoSentadilla = sentadilla?.peso_corporal_kg || j.peso_corporal_kg
    const sentadillaRelativa = sentadilla ? valorRelativo(sentadilla.valor_kg, pesoSentadilla) : null
    if (cmj === undefined || cmj === null || sentadillaRelativa === null) return null
    return {
      nombre: j.nombre, iniciales: iniciales(j.nombre),
      x: Number(sentadillaRelativa.toFixed(2)), y: Number(cmj),
      color: j.equipos?.color || '#c8ff4d',
    }
  }).filter(Boolean)
}

function calcularDatosCuadrante2(jugadoresLista, testsLista) {
  return jugadoresLista.map((j) => {
    const suyos = testsLista.filter((t) => t.jugador_id === j.id)
    const porTipo = ultimosTestsPorTipo(suyos)
    const wingate = porTipo.wingate
    if (!wingate) return null
    const peso = wingate.peso_corporal_kg || j.peso_corporal_kg
    const potencia = valorRelativo(wingate.pp1, peso)
    const fatiga = wingate.indice_fatiga ?? indiceFatiga(wingate.mp1, wingate.mp2)
    if (potencia === null || fatiga === null || fatiga === undefined) return null
    return {
      nombre: j.nombre, iniciales: iniciales(j.nombre),
      x: Number(fatiga.toFixed(1)), y: Number(potencia.toFixed(2)),
      color: j.equipos?.color || '#c8ff4d',
    }
  }).filter(Boolean)
}

function EtiquetaZona({ viewBox, linea1, linea2, color }) {
  if (!viewBox) return null
  const cx = viewBox.x + viewBox.width / 2
  const cy = viewBox.y + viewBox.height / 2
  return (
    <g>
      <text x={cx} y={cy - 6} textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>{linea1}</text>
      <text x={cx} y={cy + 10} textAnchor="middle" fontSize="11" fontWeight="600" fill={color}>{linea2}</text>
    </g>
  )
}

function GraficoCuadrante1({ datos, maxX, maxY }) {
  return (
    <>
      <h3>Fuerza-salto: CMJ vs. Sentadilla relativa</h3>
      <p className="cuadrante-sub">Eje Y: CMJ (cm), dividido en 40 cm · Eje X: Sentadilla (kg/peso corporal), dividido en 2.0×</p>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis type="number" dataKey="x" name="Sentadilla relativa" domain={[0, maxX]} stroke="var(--text-faint)" fontSize={12} />
          <YAxis type="number" dataKey="y" name="CMJ" domain={[0, maxY]} stroke="var(--text-faint)" fontSize={12} />
          <ZAxis range={[80, 80]} />
          <ReferenceArea x1={0} x2={2.0} y1={0} y2={40} fill="var(--risk-high)" fillOpacity={0.1} stroke="none"
            label={<EtiquetaZona linea1="Poco explosivo" linea2="Poco fuerte" color="var(--risk-high)" />} />
          <ReferenceArea x1={2.0} x2={maxX} y1={0} y2={40} fill="var(--risk-mid)" fillOpacity={0.1} stroke="none"
            label={<EtiquetaZona linea1="Poco explosivo" linea2="Fuerte" color="var(--risk-mid)" />} />
          <ReferenceArea x1={0} x2={2.0} y1={40} y2={maxY} fill="var(--risk-mid)" fillOpacity={0.1} stroke="none"
            label={<EtiquetaZona linea1="Explosivo" linea2="Poco fuerte" color="var(--risk-mid)" />} />
          <ReferenceArea x1={2.0} x2={maxX} y1={40} y2={maxY} fill="var(--risk-low)" fillOpacity={0.12} stroke="none"
            label={<EtiquetaZona linea1="Explosivo" linea2="Fuerte" color="var(--risk-low)" />} />
          <ReferenceLine x={2.0} stroke="var(--text-faint)" strokeDasharray="4 4" />
          <ReferenceLine y={40} stroke="var(--text-faint)" strokeDasharray="4 4" />
          <Tooltip content={<TooltipCuadrante etiquetaX="Sentadilla rel." etiquetaY="CMJ (cm)" />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={datos}>
            {datos.map((d, i) => <Cell key={i} fill={d.color} />)}
            <LabelList dataKey="iniciales" position="top" offset={6} style={{ fill: 'var(--text)', fontSize: 10, fontWeight: 700 }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      {datos.length === 0 && <p className="texto-dim cuadrante-vacio">Necesitas al menos un test de CMJ y de Sentadilla por jugador.</p>}
      <p className="cuadrante-leyenda">
        CMJ ≥ 40cm: <strong>Explosivo</strong> · CMJ &lt; 40cm: <strong>Poco explosivo</strong> ·{' '}
        Sentadilla ≥ 2.0×: <strong>Fuerte</strong> · Sentadilla &lt; 2.0×: <strong>Poco fuerte</strong>
      </p>
    </>
  )
}

function GraficoCuadrante2({ datos, maxX, maxY }) {
  return (
    <>
      <h3>Potencia vs. capacidad de repetirla (Wingate)</h3>
      <p className="cuadrante-sub">
        Eje Y: Potencia (PP1 en W/kg), dividido en 10 W/kg · Eje X: Índice de fatiga (%), dividido en 20% —
        eje invertido: más a la derecha = menor fatiga = mejor capacidad de repetir potencia
      </p>
      <ResponsiveContainer width="100%" height={280}>
        <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
          <XAxis type="number" dataKey="x" name="Índice de fatiga" domain={[0, maxX]} reversed stroke="var(--text-faint)" fontSize={12} />
          <YAxis type="number" dataKey="y" name="Potencia" domain={[0, maxY]} stroke="var(--text-faint)" fontSize={12} />
          <ZAxis range={[80, 80]} />
          <ReferenceArea x1={20} x2={maxX} y1={0} y2={10} fill="var(--risk-high)" fillOpacity={0.1} stroke="none"
            label={<EtiquetaZona linea1="Poco potente" linea2="Baja capacidad" color="var(--risk-high)" />} />
          <ReferenceArea x1={0} x2={20} y1={0} y2={10} fill="var(--risk-mid)" fillOpacity={0.1} stroke="none"
            label={<EtiquetaZona linea1="Poco potente" linea2="Alta capacidad" color="var(--risk-mid)" />} />
          <ReferenceArea x1={20} x2={maxX} y1={10} y2={maxY} fill="var(--risk-mid)" fillOpacity={0.1} stroke="none"
            label={<EtiquetaZona linea1="Potente" linea2="Baja capacidad" color="var(--risk-mid)" />} />
          <ReferenceArea x1={0} x2={20} y1={10} y2={maxY} fill="var(--risk-low)" fillOpacity={0.12} stroke="none"
            label={<EtiquetaZona linea1="Potente" linea2="Alta capacidad" color="var(--risk-low)" />} />
          <ReferenceLine x={20} stroke="var(--text-faint)" strokeDasharray="4 4" />
          <ReferenceLine y={10} stroke="var(--text-faint)" strokeDasharray="4 4" />
          <Tooltip content={<TooltipCuadrante etiquetaX="Índice fatiga (%)" etiquetaY="Potencia (W/kg)" />} cursor={{ strokeDasharray: '3 3' }} />
          <Scatter data={datos}>
            {datos.map((d, i) => <Cell key={i} fill={d.color} />)}
            <LabelList dataKey="iniciales" position="top" offset={6} style={{ fill: 'var(--text)', fontSize: 10, fontWeight: 700 }} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
      {datos.length === 0 && <p className="texto-dim cuadrante-vacio">Necesitas al menos un test de Doble Wingate por jugador.</p>}
      <p className="cuadrante-leyenda">
        Potencia ≥ 10 W/kg: <strong>Potente</strong> · Potencia &lt; 10 W/kg: <strong>Poco potente</strong> ·{' '}
        Fatiga &lt; 20%: <strong>Buena capacidad de repetir esfuerzo</strong> · Fatiga ≥ 20%: <strong>Poca capacidad</strong>
      </p>
    </>
  )
}

export default function Tests({ equipoActivo = 'todos' }) {
  const [jugadores, setJugadores] = useState([])
  const [tests, setTests] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(formularioVacio)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    setCargando(true)
    const [{ data: perfiles }, { data: testsData }] = await Promise.all([
      supabase.from('perfiles').select('*, equipos(id, nombre, color)').eq('rol', 'jugador').order('nombre'),
      supabase.from('tests_fisicos').select('*, perfiles(nombre, equipo_id)').order('fecha', { ascending: false }),
    ])
    setJugadores(perfiles || [])
    setTests(testsData || [])
    setCargando(false)
  }

  const jugadoresFiltrados = useMemo(() => jugadores.filter((j) => {
    if (equipoActivo === 'todos') return true
    if (equipoActivo === 'sin_asignar') return !j.equipo_id
    return j.equipo_id === equipoActivo
  }), [jugadores, equipoActivo])

  function seleccionarJugador(id) {
    const j = jugadores.find((x) => x.id === id)
    setForm({ ...form, jugador_id: id, peso_corporal_kg: j?.peso_corporal_kg ?? '' })
  }

  async function guardarTest(e) {
    e.preventDefault()
    if (!form.jugador_id) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un jugador.' })
      return
    }
    setGuardando(true)
    setMensaje(null)

    const numero = (v) => (v === '' ? null : Number(v))
    const { error } = await supabase.from('tests_fisicos').insert({
      jugador_id: form.jugador_id,
      fecha: form.fecha,
      tipo_test: form.tipo_test,
      peso_corporal_kg: numero(form.peso_corporal_kg),
      valor_kg: numero(form.valor_kg),
      valor_cm: numero(form.valor_cm),
      rsi_modificado: numero(form.rsi_modificado),
      dri: numero(form.dri),
      pp1: numero(form.pp1),
      mp1: numero(form.mp1),
      pp2: numero(form.pp2),
      mp2: numero(form.mp2),
      notas: form.notas || null,
    })

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar el test.' })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Test registrado correctamente.' })
      setForm({ ...formularioVacio, jugador_id: form.jugador_id, peso_corporal_kg: form.peso_corporal_kg })
      cargarTodo()
    }
    setGuardando(false)
  }

  const testsFiltrados = useMemo(() => {
    const ids = new Set(jugadoresFiltrados.map((j) => j.id))
    return tests.filter((t) => ids.has(t.jugador_id))
  }, [tests, jugadoresFiltrados])

  // --- Cuadrante 1: CMJ (y) vs Sentadilla relativa (x) ---
  const datosCuadrante1 = useMemo(
    () => calcularDatosCuadrante1(jugadoresFiltrados, testsFiltrados),
    [jugadoresFiltrados, testsFiltrados]
  )

  // --- Cuadrante 2: Potencia W/kg (y) vs Índice de fatiga % (x) ---
  const datosCuadrante2 = useMemo(
    () => calcularDatosCuadrante2(jugadoresFiltrados, testsFiltrados),
    [jugadoresFiltrados, testsFiltrados]
  )

  const maxX1 = Math.max(3, ...datosCuadrante1.map((d) => d.x), 2.2)
  const maxY1 = Math.max(60, ...datosCuadrante1.map((d) => d.y), 44)
  const maxX2 = Math.max(35, ...datosCuadrante2.map((d) => d.x), 22)
  const maxY2 = Math.max(20, ...datosCuadrante2.map((d) => d.y), 11)

  // --- Informe de perfil físico (individual o comparativo) ---
  const [modoInforme, setModoInforme] = useState('individual')
  const [seleccionInforme, setSeleccionInforme] = useState(new Set())

  useEffect(() => {
    setSeleccionInforme(new Set(jugadoresFiltrados.map((j) => j.id)))
  }, [equipoActivo, jugadores])

  function alternarSeleccionInforme(id) {
    setSeleccionInforme((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  const jugadorIndividual = jugadores.find((j) => j.id === form.jugador_id)

  const jugadoresInforme = modoInforme === 'individual'
    ? (jugadorIndividual ? [jugadorIndividual] : [])
    : jugadoresFiltrados.filter((j) => seleccionInforme.has(j.id))

  const testsInforme = useMemo(() => {
    const ids = new Set(jugadoresInforme.map((j) => j.id))
    return tests.filter((t) => ids.has(t.jugador_id))
  }, [tests, jugadoresInforme])

  const cuadrante1Informe = useMemo(
    () => calcularDatosCuadrante1(jugadoresInforme, testsInforme),
    [jugadoresInforme, testsInforme]
  )
  const cuadrante2Informe = useMemo(
    () => calcularDatosCuadrante2(jugadoresInforme, testsInforme),
    [jugadoresInforme, testsInforme]
  )
  const maxX1i = Math.max(3, ...cuadrante1Informe.map((d) => d.x), 2.2)
  const maxY1i = Math.max(60, ...cuadrante1Informe.map((d) => d.y), 44)
  const maxX2i = Math.max(35, ...cuadrante2Informe.map((d) => d.x), 22)
  const maxY2i = Math.max(20, ...cuadrante2Informe.map((d) => d.y), 11)

  // --- Ranking comparativo del jugador individual frente al resto del grupo activo ---
  function calcularRanking(metrica) {
    if (!jugadorIndividual) return null
    const valores = jugadoresFiltrados.map((j) => {
      const suyos = tests.filter((t) => t.jugador_id === j.id)
      const porTipo = ultimosTestsPorTipo(suyos)
      const t = porTipo[metrica.tipoTest]
      if (!t) return null
      const v = t && metrica.extraer(t, j.peso_corporal_kg)
      return v !== null && v !== undefined ? { id: j.id, valor: v } : null
    }).filter(Boolean)
    if (valores.length < 2) return null
    const ordenados = [...valores].sort((a, b) => metrica.mejorEsMenor ? a.valor - b.valor : b.valor - a.valor)
    const posicion = ordenados.findIndex((v) => v.id === jugadorIndividual.id) + 1
    if (posicion === 0) return null
    const percentil = Math.round(((valores.length - posicion) / (valores.length - 1)) * 100)
    return { posicion, total: valores.length, percentil }
  }

  // --- Interpretación automática + comentario editable del entrenador ---
  const [interpretacionTexto, setInterpretacionTexto] = useState('')
  const [editandoInterpretacion, setEditandoInterpretacion] = useState(false)
  const [guardandoInterpretacion, setGuardandoInterpretacion] = useState(false)
  const [mensajeInterpretacion, setMensajeInterpretacion] = useState(null)

  useEffect(() => {
    if (modoInforme !== 'individual' || !jugadorIndividual) return
    let activo = true
    supabase.from('interpretaciones_fisicas').select('texto').eq('jugador_id', jugadorIndividual.id).maybeSingle()
      .then(({ data }) => { if (activo) setInterpretacionTexto(data?.texto || '') })
    setEditandoInterpretacion(false)
    setMensajeInterpretacion(null)
    return () => { activo = false }
  }, [jugadorIndividual?.id, modoInforme])

  async function guardarInterpretacion() {
    setGuardandoInterpretacion(true)
    setMensajeInterpretacion(null)
    const { error } = await supabase.from('interpretaciones_fisicas')
      .upsert({ jugador_id: jugadorIndividual.id, texto: interpretacionTexto }, { onConflict: 'jugador_id' })
    if (error) setMensajeInterpretacion({ tipo: 'error', texto: 'No se pudo guardar.' })
    else { setMensajeInterpretacion({ tipo: 'ok', texto: 'Guardado.' }); setEditandoInterpretacion(false) }
    setGuardandoInterpretacion(false)
  }

  function interpretacionAutomatica() {
    if (!jugadorIndividual) return []
    const porTipo = ultimosTestsPorTipo(tests.filter((t) => t.jugador_id === jugadorIndividual.id))
    const frases = []
    const sent = porTipo.sentadilla
    if (sent) {
      const rel = valorRelativo(sent.valor_kg, sent.peso_corporal_kg || jugadorIndividual.peso_corporal_kg)
      if (rel !== null) frases.push(`Sentadilla: ${interpretarSentadilla(rel)} (${rel.toFixed(2)}×)`)
    }
    const cmj = porTipo.cmj
    if (cmj?.valor_cm !== null && cmj?.valor_cm !== undefined) {
      frases.push(`CMJ: ${interpretarCMJ(cmj.valor_cm)} (${cmj.valor_cm} cm)`)
    }
    const wing = porTipo.wingate
    if (wing) {
      const pot = valorRelativo(wing.pp1, wing.peso_corporal_kg || jugadorIndividual.peso_corporal_kg)
      const fat = wing.indice_fatiga ?? indiceFatiga(wing.mp1, wing.mp2)
      if (pot !== null) frases.push(`Potencia: ${interpretarPotencia(pot)} (${pot.toFixed(2)} W/kg)`)
      if (fat !== null && fat !== undefined) frases.push(`Repetición de esfuerzo: ${interpretarFatigaWingate(fat)} (${fat.toFixed(1)}%)`)
    }
    return frases
  }

  // --- Comentarios guardados de cada jugador, para el informe de "varios" ---
  const [comentariosVarios, setComentariosVarios] = useState({})

  useEffect(() => {
    if (modoInforme !== 'varios' || jugadoresInforme.length === 0) return
    let activo = true
    supabase.from('interpretaciones_fisicas').select('jugador_id, texto')
      .in('jugador_id', jugadoresInforme.map((j) => j.id))
      .then(({ data }) => {
        if (!activo) return
        const mapa = {}
        ;(data || []).forEach((r) => { if (r.texto) mapa[r.jugador_id] = r.texto })
        setComentariosVarios(mapa)
      })
    return () => { activo = false }
  }, [modoInforme, jugadoresInforme.map((j) => j.id).join(',')])

  // --- Comentario único para todo el grupo/equipo seleccionado ---
  const claveGrupo = useMemo(
    () => jugadoresInforme.map((j) => j.id).slice().sort().join(','),
    [jugadoresInforme]
  )
  const [comentarioGrupoTexto, setComentarioGrupoTexto] = useState('')
  const [editandoComentarioGrupo, setEditandoComentarioGrupo] = useState(false)
  const [guardandoComentarioGrupo, setGuardandoComentarioGrupo] = useState(false)
  const [mensajeComentarioGrupo, setMensajeComentarioGrupo] = useState(null)

  useEffect(() => {
    if (modoInforme !== 'varios' || !claveGrupo) { setComentarioGrupoTexto(''); return }
    let activo = true
    supabase.from('comentarios_grupales').select('texto').eq('clave', claveGrupo).maybeSingle()
      .then(({ data }) => { if (activo) setComentarioGrupoTexto(data?.texto || '') })
    setEditandoComentarioGrupo(false)
    setMensajeComentarioGrupo(null)
    return () => { activo = false }
  }, [claveGrupo, modoInforme])

  async function guardarComentarioGrupo() {
    setGuardandoComentarioGrupo(true)
    setMensajeComentarioGrupo(null)
    const { error } = await supabase.from('comentarios_grupales')
      .upsert({ clave: claveGrupo, texto: comentarioGrupoTexto }, { onConflict: 'clave' })
    if (error) setMensajeComentarioGrupo({ tipo: 'error', texto: 'No se pudo guardar.' })
    else { setMensajeComentarioGrupo({ tipo: 'ok', texto: 'Guardado.' }); setEditandoComentarioGrupo(false) }
    setGuardandoComentarioGrupo(false)
  }

  function construirSerieEvolucion(jugadorId, metrica, peso) {
    return tests
      .filter((t) => t.jugador_id === jugadorId && t.tipo_test === metrica.tipoTest)
      .sort((a, b) => a.fecha.localeCompare(b.fecha))
      .map((t) => ({ fecha: t.fecha.slice(5), valor: metrica.extraer(t, peso) }))
      .filter((d) => d.valor !== null && d.valor !== undefined)
  }

  function construirComparativa(metrica) {
    return jugadoresInforme.map((j) => {
      const suyos = tests.filter((t) => t.jugador_id === j.id)
      const porTipo = ultimosTestsPorTipo(suyos)
      const test = porTipo[metrica.tipoTest]
      if (!test) return null
      const valor = metrica.extraer(test, j.peso_corporal_kg)
      if (valor === null || valor === undefined) return null
      return { nombre: j.nombre, valor: Number(valor.toFixed(metrica.decimales)), color: j.equipos?.color || '#c8ff4d' }
    }).filter(Boolean)
  }

  function exportarInformeCSV() {
    const cabeceras = ['Jugador', 'Equipo', 'Peso', 'Altura', ...metricasInforme.map((m) => m.etiqueta)]
    const filas = jugadoresInforme.map((j) => {
      const suyos = tests.filter((t) => t.jugador_id === j.id)
      const porTipo = ultimosTestsPorTipo(suyos)
      const valores = metricasInforme.map((m) => {
        const t = porTipo[m.tipoTest]
        if (!t) return ''
        const v = m.extraer(t, j.peso_corporal_kg)
        return v !== null && v !== undefined ? v.toFixed(m.decimales) : ''
      })
      return [j.nombre, j.equipos?.nombre || '—', j.peso_corporal_kg ?? '', j.altura_m ?? '', ...valores]
    })
    const csv = [cabeceras, ...filas]
      .map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `perfil_fisico_${modoInforme}_${hoyISO()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (cargando) return <p className="mono texto-dim">Cargando tests…</p>

  return (
    <div className="tests-layout">
      <section className="test-form-card no-imprimir">
        <h2>Registrar test</h2>
        <form onSubmit={guardarTest}>
          <label className="campo-test">
            <span>Jugador</span>
            <select value={form.jugador_id} onChange={(e) => seleccionarJugador(e.target.value)} required>
              <option value="" disabled>Selecciona un jugador</option>
              {jugadoresFiltrados.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </label>

          <div className="fila-doble">
            <label className="campo-test">
              <span>Tipo de test</span>
              <select value={form.tipo_test} onChange={(e) => setForm({ ...form, tipo_test: e.target.value })}>
                {tiposTest.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
              </select>
            </label>
            <label className="campo-test">
              <span>Fecha</span>
              <input type="date" value={form.fecha} onChange={(e) => setForm({ ...form, fecha: e.target.value })} required />
            </label>
          </div>

          {['sentadilla', 'iso_sq', 'cmj', 'wingate'].includes(form.tipo_test) && (
            <label className="campo-test">
              <span>Peso corporal en el test (kg)</span>
              <input
                type="number" step="0.1" value={form.peso_corporal_kg}
                onChange={(e) => setForm({ ...form, peso_corporal_kg: e.target.value })}
              />
            </label>
          )}

          {(form.tipo_test === 'sentadilla' || form.tipo_test === 'iso_sq') && (
            <>
              <label className="campo-test">
                <span>Carga (kg)</span>
                <input type="number" step="0.1" value={form.valor_kg} onChange={(e) => setForm({ ...form, valor_kg: e.target.value })} />
              </label>
              {form.valor_kg && form.peso_corporal_kg && (
                <div className="preview-test mono">
                  Relativo: <strong>{(Number(form.valor_kg) / Number(form.peso_corporal_kg)).toFixed(2)}</strong> kg/peso corporal
                  {form.tipo_test === 'sentadilla' && (
                    <> · <span className="interpretacion-chip">{interpretarSentadilla(Number(form.valor_kg) / Number(form.peso_corporal_kg))}</span></>
                  )}
                </div>
              )}
            </>
          )}

          {form.tipo_test === 'cmj' && (
            <>
              <label className="campo-test">
                <span>Altura (cm)</span>
                <input type="number" step="0.1" value={form.valor_cm} onChange={(e) => setForm({ ...form, valor_cm: e.target.value })} />
              </label>
              <label className="campo-test">
                <span>RSI modificado</span>
                <input type="number" step="0.01" value={form.rsi_modificado} onChange={(e) => setForm({ ...form, rsi_modificado: e.target.value })} />
              </label>
              {form.valor_cm && (
                <div className="preview-test mono">
                  Interpretación: <span className="interpretacion-chip">{interpretarCMJ(Number(form.valor_cm))}</span>
                </div>
              )}
            </>
          )}

          {form.tipo_test === 'sj' && (
            <label className="campo-test">
              <span>Altura (cm)</span>
              <input type="number" step="0.1" value={form.valor_cm} onChange={(e) => setForm({ ...form, valor_cm: e.target.value })} />
            </label>
          )}

          {form.tipo_test === 'drop_jump' && (
            <label className="campo-test">
              <span>DRI (Dynamic Rebound Index)</span>
              <input type="number" step="0.01" value={form.dri} onChange={(e) => setForm({ ...form, dri: e.target.value })} />
            </label>
          )}

          {form.tipo_test === 'wingate' && (
            <>
              <div className="fila-doble">
                <label className="campo-test">
                  <span>PP1 (W)</span>
                  <input type="number" step="0.1" value={form.pp1} onChange={(e) => setForm({ ...form, pp1: e.target.value })} />
                </label>
                <label className="campo-test">
                  <span>MP1 (W)</span>
                  <input type="number" step="0.1" value={form.mp1} onChange={(e) => setForm({ ...form, mp1: e.target.value })} />
                </label>
              </div>
              <div className="fila-doble">
                <label className="campo-test">
                  <span>PP2 (W)</span>
                  <input type="number" step="0.1" value={form.pp2} onChange={(e) => setForm({ ...form, pp2: e.target.value })} />
                </label>
                <label className="campo-test">
                  <span>MP2 (W)</span>
                  <input type="number" step="0.1" value={form.mp2} onChange={(e) => setForm({ ...form, mp2: e.target.value })} />
                </label>
              </div>
              {form.mp1 && form.mp2 && (
                <div className="preview-test mono">
                  Índice de fatiga: <strong>{indiceFatiga(Number(form.mp1), Number(form.mp2)).toFixed(1)}%</strong>
                  {' '}· <span className="interpretacion-chip">{interpretarFatigaWingate(indiceFatiga(Number(form.mp1), Number(form.mp2)))}</span>
                </div>
              )}
              {form.pp1 && form.peso_corporal_kg && (
                <div className="preview-test mono">
                  Potencia (PP1): <strong>{(Number(form.pp1) / Number(form.peso_corporal_kg)).toFixed(2)}</strong> W/kg
                  {' '}· <span className="interpretacion-chip">{interpretarPotencia(Number(form.pp1) / Number(form.peso_corporal_kg))}</span>
                </div>
              )}
            </>
          )}

          <label className="campo-test">
            <span>Notas (opcional)</span>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />
          </label>

          {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}

          <button type="submit" className="btn-principal" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Registrar test'}
          </button>
        </form>
      </section>

      <div className="tests-columna-derecha no-imprimir">
        <section className="cuadrante-card">
          <GraficoCuadrante1 datos={datosCuadrante1} maxX={maxX1} maxY={maxY1} />
        </section>

        <section className="cuadrante-card">
          <GraficoCuadrante2 datos={datosCuadrante2} maxX={maxX2} maxY={maxY2} />
        </section>
      </div>

      <section className="informe-fisico-card">
        <div className="informe-controles no-imprimir">
          <div className="informe-modo">
            <button
              className={`periodo-btn ${modoInforme === 'individual' ? 'periodo-activo' : ''}`}
              onClick={() => setModoInforme('individual')}
            >
              Perfil individual
            </button>
            <button
              className={`periodo-btn ${modoInforme === 'varios' ? 'periodo-activo' : ''}`}
              onClick={() => setModoInforme('varios')}
            >
              Varios jugadores
            </button>
          </div>

          {modoInforme === 'individual' ? (
            <p className="informe-nota">
              {jugadorIndividual
                ? <>Mostrando el perfil de <strong>{jugadorIndividual.nombre}</strong> (el jugador seleccionado arriba en "Registrar test").</>
                : 'Selecciona un jugador en el formulario de "Registrar test" de arriba para ver su perfil individual.'}
            </p>
          ) : (
            <div className="perfil-chips">
              {jugadoresFiltrados.map((j) => (
                <button
                  key={j.id}
                  className={`perfil-chip ${seleccionInforme.has(j.id) ? 'perfil-chip-activo' : ''}`}
                  onClick={() => alternarSeleccionInforme(j.id)}
                >
                  {j.nombre}
                </button>
              ))}
            </div>
          )}

          <div className="informe-acciones">
            <button className="btn-exportar" onClick={exportarInformeCSV}>Exportar CSV</button>
            <button className="btn-exportar" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
          </div>
        </div>

        <div className="informe-imprimible">
          <h2 className="informe-titulo-impresion">
            Perfil físico {modoInforme === 'individual' ? '— ' + (jugadorIndividual?.nombre || '') : 'del equipo'}
          </h2>

          {jugadoresInforme.length === 0 ? (
            <p className="texto-dim">
              {modoInforme === 'individual' ? 'Selecciona un jugador arriba.' : 'Selecciona al menos un jugador.'}
            </p>
          ) : modoInforme === 'individual' ? (
            <>
              <div className="informe-datos-jugador">
                <span><strong>{jugadorIndividual.nombre}</strong></span>
                <span>{jugadorIndividual.equipos?.nombre || 'Sin equipo'}</span>
                <span>{jugadorIndividual.peso_corporal_kg ? `${jugadorIndividual.peso_corporal_kg} kg` : '—'}</span>
                <span>{jugadorIndividual.altura_m ? `${jugadorIndividual.altura_m} m` : '—'}</span>
                <span>
                  {jugadorIndividual.fecha_nacimiento
                    ? `${new Date(jugadorIndividual.fecha_nacimiento).toLocaleDateString('es-ES')} (${calcularEdad(jugadorIndividual.fecha_nacimiento)} años)`
                    : '—'}
                </span>
                <span>{traducirSexo(jugadorIndividual.sexo)}</span>
              </div>

              <div className="informe-graficos-grid no-imprimir">
                {metricasInforme.map((m) => {
                  const serie = construirSerieEvolucion(jugadorIndividual.id, m, jugadorIndividual.peso_corporal_kg)
                  if (serie.length === 0) return null
                  const ranking = calcularRanking(m)
                  return (
                    <div className="mini-grafico-card" key={m.clave}>
                      <h4>{m.etiqueta}</h4>
                      <ResponsiveContainer width="100%" height={160}>
                        <LineChart data={serie} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                          <XAxis dataKey="fecha" stroke="var(--text-faint)" fontSize={11} />
                          <YAxis stroke="var(--text-faint)" fontSize={11} width={32} />
                          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-strong)', borderRadius: 8, fontSize: 12 }} />
                          <Line type="monotone" dataKey="valor" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                      {ranking && (
                        <p className="ranking-nota">
                          Puesto <strong>{ranking.posicion}</strong> de {ranking.total} en el grupo activo
                          {' '}(percentil {ranking.percentil})
                        </p>
                      )}
                    </div>
                  )
                })}
              </div>
              {metricasInforme.every((m) => construirSerieEvolucion(jugadorIndividual.id, m, jugadorIndividual.peso_corporal_kg).length === 0) && (
                <p className="texto-dim no-imprimir">Este jugador todavía no tiene tests registrados.</p>
              )}

              <div className="informe-cuadrantes-grid">
                <div className="cuadrante-card cuadrante-card-informe">
                  <GraficoCuadrante1 datos={cuadrante1Informe} maxX={maxX1i} maxY={maxY1i} />
                </div>
                <div className="cuadrante-card cuadrante-card-informe">
                  <GraficoCuadrante2 datos={cuadrante2Informe} maxX={maxX2i} maxY={maxY2i} />
                </div>
              </div>

              <div className="interpretacion-card">
                <h4>Interpretación</h4>
                {interpretacionAutomatica().length > 0 && (
                  <ul className="interpretacion-automatica">
                    {interpretacionAutomatica().map((frase, i) => <li key={i}>{frase}</li>)}
                  </ul>
                )}

                <div className="no-imprimir">
                  {editandoInterpretacion ? (
                    <>
                      <textarea
                        className="interpretacion-textarea"
                        rows={4}
                        value={interpretacionTexto}
                        onChange={(e) => setInterpretacionTexto(e.target.value)}
                        placeholder="Escribe aquí tu valoración del perfil físico de este jugador…"
                      />
                      {mensajeInterpretacion && (
                        <div className={mensajeInterpretacion.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensajeInterpretacion.texto}</div>
                      )}
                      <div className="mis-datos-botones">
                        <button className="btn-principal" onClick={guardarInterpretacion} disabled={guardandoInterpretacion}>
                          {guardandoInterpretacion ? 'Guardando…' : 'Guardar comentario'}
                        </button>
                        <button className="equipo-cancelar" onClick={() => setEditandoInterpretacion(false)}>Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <button className="equipo-cambiar-link" onClick={() => setEditandoInterpretacion(true)}>
                      {interpretacionTexto ? 'Editar comentario del entrenador' : '+ Añadir comentario del entrenador'}
                    </button>
                  )}
                </div>

                {!editandoInterpretacion && interpretacionTexto && (
                  <p className="interpretacion-comentario">"{interpretacionTexto}"</p>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="informe-graficos-grid no-imprimir">
                {metricasInforme.map((m) => {
                  const datos = construirComparativa(m)
                  if (datos.length === 0) return null
                  return (
                    <div className="mini-grafico-card" key={m.clave}>
                      <h4>{m.etiqueta}</h4>
                      <ResponsiveContainer width="100%" height={Math.max(160, datos.length * 28)}>
                        <BarChart data={datos} layout="vertical" margin={{ top: 5, right: 20, bottom: 0, left: 10 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                          <XAxis type="number" stroke="var(--text-faint)" fontSize={11} />
                          <YAxis type="category" dataKey="nombre" stroke="var(--text-faint)" fontSize={11} width={90} />
                          <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-strong)', borderRadius: 8, fontSize: 12 }} />
                          <Bar dataKey="valor" radius={[0, 4, 4, 0]}>
                            {datos.map((d, i) => <Cell key={i} fill={d.color} />)}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )
                })}
              </div>

              <div className="informe-cuadrantes-grid">
                <div className="cuadrante-card cuadrante-card-informe">
                  <GraficoCuadrante1 datos={cuadrante1Informe} maxX={maxX1i} maxY={maxY1i} />
                </div>
                <div className="cuadrante-card cuadrante-card-informe">
                  <GraficoCuadrante2 datos={cuadrante2Informe} maxX={maxX2i} maxY={maxY2i} />
                </div>
              </div>

              <div className="interpretacion-card">
                <h4>Comentario del entrenador sobre este grupo</h4>

                <div className="no-imprimir">
                  {editandoComentarioGrupo ? (
                    <>
                      <textarea
                        className="interpretacion-textarea"
                        rows={4}
                        value={comentarioGrupoTexto}
                        onChange={(e) => setComentarioGrupoTexto(e.target.value)}
                        placeholder="Escribe aquí tu valoración conjunta de estos jugadores…"
                      />
                      {mensajeComentarioGrupo && (
                        <div className={mensajeComentarioGrupo.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensajeComentarioGrupo.texto}</div>
                      )}
                      <div className="mis-datos-botones">
                        <button className="btn-principal" onClick={guardarComentarioGrupo} disabled={guardandoComentarioGrupo}>
                          {guardandoComentarioGrupo ? 'Guardando…' : 'Guardar comentario'}
                        </button>
                        <button className="equipo-cancelar" onClick={() => setEditandoComentarioGrupo(false)}>Cancelar</button>
                      </div>
                    </>
                  ) : (
                    <button className="equipo-cambiar-link" onClick={() => setEditandoComentarioGrupo(true)}>
                      {comentarioGrupoTexto ? 'Editar comentario del grupo' : '+ Añadir comentario sobre este grupo'}
                    </button>
                  )}
                </div>

                {!editandoComentarioGrupo && comentarioGrupoTexto && (
                  <p className="interpretacion-comentario">"{comentarioGrupoTexto}"</p>
                )}
              </div>

              {jugadoresInforme.some((j) => comentariosVarios[j.id]) && (
                <div className="interpretacion-card">
                  <h4>Comentarios individuales guardados</h4>
                  <ul className="interpretacion-automatica">
                    {jugadoresInforme.filter((j) => comentariosVarios[j.id]).map((j) => (
                      <li key={j.id}>
                        <strong>{j.nombre}:</strong> <em>"{comentariosVarios[j.id]}"</em>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      <section className="tests-historial-card no-imprimir">
        <h3>Historial de tests</h3>
        {testsFiltrados.length === 0 ? (
          <p className="texto-dim">Todavía no hay tests registrados.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="tests-tabla">
              <thead>
                <tr>
                  <th>Fecha</th><th>Jugador</th><th>Test</th><th>Peso (kg)</th>
                  <th>Valor</th><th>Detalle</th>
                </tr>
              </thead>
              <tbody>
                {testsFiltrados.slice(0, 60).map((t) => (
                  <tr key={t.id}>
                    <td className="mono">{t.fecha}</td>
                    <td>{t.perfiles?.nombre || '—'}</td>
                    <td>{traducirTipoTest(t.tipo_test)}</td>
                    <td className="mono">{t.peso_corporal_kg ?? '—'}</td>
                    <td className="mono">{formatearValorPrincipal(t)}</td>
                    <td className="mono texto-dim">{formatearDetalle(t)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}

function TooltipCuadrante({ active, payload, etiquetaX, etiquetaY }) {
  if (!active || !payload || payload.length === 0) return null
  const d = payload[0].payload
  return (
    <div className="tooltip-cuadrante">
      <strong>{d.nombre}</strong>
      <div>{etiquetaX}: {d.x}</div>
      <div>{etiquetaY}: {d.y}</div>
    </div>
  )
}

function formatearValorPrincipal(t) {
  if (t.tipo_test === 'sentadilla' || t.tipo_test === 'iso_sq') {
    return t.valor_kg !== null ? `${t.valor_kg} kg` : '—'
  }
  if (t.tipo_test === 'cmj' || t.tipo_test === 'sj') {
    return t.valor_cm !== null ? `${t.valor_cm} cm` : '—'
  }
  if (t.tipo_test === 'drop_jump') return t.dri !== null ? `DRI ${t.dri}` : '—'
  if (t.tipo_test === 'wingate') return t.pp1 !== null ? `PP1 ${t.pp1} W` : '—'
  return '—'
}

function formatearDetalle(t) {
  if (t.tipo_test === 'sentadilla' || t.tipo_test === 'iso_sq') {
    const rel = t.valor_kg && t.peso_corporal_kg ? (t.valor_kg / t.peso_corporal_kg).toFixed(2) : null
    return rel ? `${rel} kg/peso corporal` : ''
  }
  if (t.tipo_test === 'cmj') return t.rsi_modificado !== null ? `RSI mod. ${t.rsi_modificado}` : ''
  if (t.tipo_test === 'wingate') {
    return t.indice_fatiga !== null && t.indice_fatiga !== undefined ? `Fatiga ${t.indice_fatiga}%` : ''
  }
  return ''
}
