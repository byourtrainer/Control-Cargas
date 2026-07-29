import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colorParaValor } from '../lib/colorEscalas'
import { calcularMalestar, clasificarBienestar } from '../lib/bienestar'
import './Calendario.css'

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const hoyISO = () => new Date().toISOString().slice(0, 10)

function colorBienestarPromedio(registrosDia) {
  const malestares = registrosDia
    .filter((r) => r.sueno !== null && r.sueno !== undefined)
    .map((r) => calcularMalestar(r))
  if (malestares.length === 0) return null
  const media = malestares.reduce((a, b) => a + b, 0) / malestares.length
  const nivel = clasificarBienestar(media)
  return { optimo: 'var(--risk-low)', bueno: 'var(--risk-mid)', malo: 'var(--risk-high)' }[nivel] || null
}

function colorRpePromedio(registrosDia) {
  const rpes = registrosDia.filter((r) => r.rpe !== null && r.rpe !== undefined).map((r) => r.rpe)
  if (rpes.length === 0) return null
  const media = rpes.reduce((a, b) => a + b, 0) / rpes.length
  return colorParaValor(media, 10)
}

export default function CalendarioEntrenador({ equipoActivo = 'todos', onSeleccionarDia, fechaActiva }) {
  const [mesVisible, setMesVisible] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [jugadores, setJugadores] = useState([])
  const [registros, setRegistros] = useState([])
  const [sesiones, setSesiones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarMes() }, [mesVisible, equipoActivo])

  async function cargarMes() {
    setCargando(true)
    const inicio = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1).toISOString().slice(0, 10)
    const fin = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).toISOString().slice(0, 10)

    const { data: perfiles } = await supabase
      .from('perfiles').select('id, equipo_id').eq('rol', 'jugador')

    const jugadoresFiltrados = (perfiles || []).filter((j) => {
      if (equipoActivo === 'todos') return true
      if (equipoActivo === 'sin_asignar') return !j.equipo_id
      return j.equipo_id === equipoActivo
    })
    setJugadores(jugadoresFiltrados)

    const ids = jugadoresFiltrados.map((j) => j.id)
    let consultaSesiones = supabase.from('sesiones').select('*').gte('fecha', inicio).lte('fecha', fin)
    if (equipoActivo === 'sin_asignar') {
      consultaSesiones = null // los jugadores sin equipo no pueden tener sesión
    } else if (equipoActivo !== 'todos') {
      consultaSesiones = consultaSesiones.eq('equipo_id', equipoActivo)
    }

    const [{ data: regs }, sesResultado] = await Promise.all([
      ids.length > 0
        ? supabase.from('registros_diarios').select('*').in('jugador_id', ids).gte('fecha', inicio).lte('fecha', fin)
        : Promise.resolve({ data: [] }),
      consultaSesiones ? consultaSesiones : Promise.resolve({ data: [] }),
    ])
    setRegistros(regs || [])
    setSesiones(sesResultado.data || [])
    setCargando(false)
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

  function cambiarMes(delta) {
    const d = new Date(mesVisible)
    d.setMonth(d.getMonth() + delta)
    setMesVisible(d)
  }

  function irAHoy() {
    const d = new Date()
    d.setDate(1)
    setMesVisible(d)
  }

  const hoy = hoyISO()

  return (
    <section className="calendario-card">
      <div className="calendario-cabecera">
        <button className="calendario-nav" onClick={() => cambiarMes(-1)}>←</button>
        <button className="calendario-mes-titulo" onClick={irAHoy}>
          {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
        </button>
        <button className="calendario-nav" onClick={() => cambiarMes(1)}>→</button>
      </div>

      <div className="calendario-dias-semana">
        {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
      </div>

      <div className={`calendario-grid ${cargando ? 'calendario-cargando' : ''}`}>
        {celdas.map((d, i) => {
          if (d === null) return <div key={i} className="calendario-celda calendario-celda-vacia" />
          const fecha = fechaDe(d)
          const registrosDia = registros.filter((r) => r.fecha === fecha)
          const esHoy = fecha === hoy
          const esActiva = fecha === fechaActiva
          const cBienestar = colorBienestarPromedio(registrosDia)
          const cRpe = colorRpePromedio(registrosDia)
          const haySesion = sesiones.some((s) => s.fecha === fecha)
          return (
            <button
              key={i}
              className={`calendario-celda ${esHoy ? 'calendario-celda-hoy' : ''} ${esActiva ? 'calendario-celda-activa' : ''}`}
              onClick={() => onSeleccionarDia(fecha)}
            >
              {haySesion && <span className="calendario-sesion-punto" title="Sesión programada" />}
              <span className="calendario-numero">{d}</span>
              <span className="calendario-barras">
                <span className="calendario-barra" style={{ background: cBienestar || 'var(--line)' }} />
                <span className="calendario-barra" style={{ background: cRpe || 'var(--line)' }} />
              </span>
            </button>
          )
        })}
      </div>

      <div className="calendario-leyenda">
        <span><span className="calendario-leyenda-barra" style={{ background: 'var(--risk-low)' }} /> Bienestar medio del equipo</span>
        <span><span className="calendario-leyenda-barra" style={{ background: 'var(--accent)' }} /> RPE medio del equipo</span>
        <span><span className="calendario-sesion-punto calendario-sesion-punto-leyenda" /> Sesión programada</span>
        <span className="texto-dim">{jugadores.length} jugadores en el grupo activo</span>
      </div>
    </section>
  )
}
