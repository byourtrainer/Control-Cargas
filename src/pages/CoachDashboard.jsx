import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { calcularMetricas, clasificarRiesgoACWR, clasificarMonotonia } from '../lib/cargaMetrics'
import './CoachDashboard.css'

const diasAtras = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const metodosACWR = [
  { valor: 'clasico', etiqueta: 'ACWR Clásico (28 días)' },
  { valor: 'ewma', etiqueta: 'ACWR EWMA' },
]

export default function CoachDashboard() {
  const [jugadores, setJugadores] = useState([])
  const [registros, setRegistros] = useState([])
  const [equipos, setEquipos] = useState([])
  const [equipoFiltro, setEquipoFiltro] = useState('todos')
  const [nuevoEquipo, setNuevoEquipo] = useState('')
  const [guardandoEquipo, setGuardandoEquipo] = useState(false)
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState('equipo')
  const [metodoACWR, setMetodoACWR] = useState('clasico')
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setCargando(true)
    // Se piden 70 días de histórico: suficiente para la carga crónica clásica
    // (28 días), el cambio semanal, y para que el EWMA tenga tiempo de estabilizarse.
    const [{ data: perfiles }, { data: regs }, { data: equiposData }] = await Promise.all([
      supabase.from('perfiles').select('*, equipos(id, nombre)').eq('rol', 'jugador').order('nombre'),
      supabase.from('registros_diarios').select('*').gte('fecha', diasAtras(70)).order('fecha'),
      supabase.from('equipos').select('*').order('nombre'),
    ])
    setJugadores(perfiles || [])
    setRegistros(regs || [])
    setEquipos(equiposData || [])
    setCargando(false)
  }

  async function anadirEquipo(e) {
    e.preventDefault()
    if (!nuevoEquipo.trim()) return
    setGuardandoEquipo(true)
    const { error } = await supabase.from('equipos').insert({ nombre: nuevoEquipo.trim() })
    if (!error) {
      setNuevoEquipo('')
      cargarDatos()
    }
    setGuardandoEquipo(false)
  }

  const jugadoresFiltrados = useMemo(() => {
    if (equipoFiltro === 'todos') return jugadores
    if (equipoFiltro === 'sin_asignar') return jugadores.filter((j) => !j.equipo_id)
    return jugadores.filter((j) => j.equipo_id === equipoFiltro)
  }, [jugadores, equipoFiltro])

  const resumenPorJugador = useMemo(() => {
    return jugadoresFiltrados.map((j) => {
      const suyos = registros.filter((r) => r.jugador_id === j.id)
      const metricas = calcularMetricas(suyos, metodoACWR)
      const ultimoRegistro = [...suyos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
      return {
        ...j,
        ...metricas,
        riesgo: clasificarRiesgoACWR(metricas.acwrPost),
        nivelMonotonia: clasificarMonotonia(metricas.monotonia),
        ultimoBienestar: ultimoRegistro
          ? promedio([ultimoRegistro.sueno, ultimoRegistro.fatiga, ultimoRegistro.dolor_muscular, ultimoRegistro.estres, ultimoRegistro.animo])
          : null,
        registroHoy: suyos.some((r) => r.fecha === diasAtras(0)),
      }
    })
  }, [jugadoresFiltrados, registros, metodoACWR])

  const datosGrafico = useMemo(() => {
    const idsFiltrados = new Set(jugadoresFiltrados.map((j) => j.id))
    const registrosFiltrados = registros.filter((r) => idsFiltrados.has(r.jugador_id))
    const fuente = jugadorSeleccionado === 'equipo'
      ? registrosFiltrados
      : registrosFiltrados.filter((r) => r.jugador_id === jugadorSeleccionado)

    const porFecha = {}
    fuente.forEach((r) => {
      porFecha[r.fecha] = (porFecha[r.fecha] || 0) + (r.carga || 0)
    })
    return Object.entries(porFecha)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-21)
      .map(([fecha, carga]) => ({ fecha: fecha.slice(5), carga }))
  }, [registros, jugadorSeleccionado, jugadoresFiltrados])

  if (cargando) return <p className="mono texto-dim">Cargando datos del equipo…</p>

  return (
    <div className="coach-layout">
      <div className="coach-header">
        <h2>Panel del entrenador</h2>
        <div className="coach-header-derecha">
          <span className="mono texto-dim">{jugadoresFiltrados.length} jugadores</span>
          <select
            value={equipoFiltro}
            onChange={(e) => setEquipoFiltro(e.target.value)}
            className="selector-jugador"
          >
            <option value="todos">Todos los equipos</option>
            {equipos.map((eq) => (
              <option key={eq.id} value={eq.id}>{eq.nombre}</option>
            ))}
            <option value="sin_asignar">Sin asignar</option>
          </select>
          <select
            value={metodoACWR}
            onChange={(e) => setMetodoACWR(e.target.value)}
            className="selector-jugador"
          >
            {metodosACWR.map((m) => (
              <option key={m.valor} value={m.valor}>{m.etiqueta}</option>
            ))}
          </select>
        </div>
      </div>

      <form className="anadir-equipo-form" onSubmit={anadirEquipo}>
        <input
          type="text" value={nuevoEquipo}
          onChange={(e) => setNuevoEquipo(e.target.value)}
          placeholder="Nombre de un equipo nuevo (ej. Juvenil A)"
        />
        <button type="submit" disabled={guardandoEquipo}>
          {guardandoEquipo ? 'Añadiendo…' : '+ Añadir equipo'}
        </button>
      </form>

      <section className="tarjetas-resumen">
        <TarjetaResumen etiqueta="Jugadores activos" valor={jugadoresFiltrados.length} />
        <TarjetaResumen
          etiqueta="Registraron hoy"
          valor={`${resumenPorJugador.filter((j) => j.registroHoy).length} / ${jugadoresFiltrados.length}`}
        />
        <TarjetaResumen
          etiqueta="En riesgo (ACWR alto o muy alto)"
          valor={resumenPorJugador.filter((j) => j.riesgo === 'alta' || j.riesgo === 'muy_alta').length}
          tono="alto"
        />
      </section>

      <section className="grafico-card">
        <div className="grafico-cabecera">
          <h3>Carga diaria (últimos 21 días)</h3>
          <select
            value={jugadorSeleccionado}
            onChange={(e) => setJugadorSeleccionado(e.target.value)}
            className="selector-jugador"
          >
            <option value="equipo">{equipoFiltro === 'todos' ? 'Todo el equipo' : 'Todo el grupo filtrado'}</option>
            {jugadoresFiltrados.map((j) => (
              <option key={j.id} value={j.id}>{j.nombre}</option>
            ))}
          </select>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={datosGrafico}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="fecha" stroke="var(--text-faint)" fontSize={12} />
            <YAxis stroke="var(--text-faint)" fontSize={12} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-strong)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--text)' }}
            />
            <Bar dataKey="carga" fill="var(--accent)" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="tabla-card tabla-card-ancha">
        <h3>Estado por jugador</h3>
        <div className="tabla-scroll">
          <table className="jugadores-tabla">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Equipo</th>
                <th>Hoy</th>
                <th>Carga 7d</th>
                <th title="ACWR sin contar el registro de hoy: cómo llega el jugador">ACWR Pre</th>
                <th title="ACWR incluyendo el registro de hoy">ACWR Post</th>
                <th>Riesgo</th>
                <th>Cambio diario</th>
                <th>Cambio semanal</th>
                <th>Monotonía</th>
                <th>Fatiga</th>
                <th>Bienestar</th>
              </tr>
            </thead>
            <tbody>
              {resumenPorJugador.map((j) => (
                <tr key={j.id}>
                  <td>{j.nombre}</td>
                  <td className="texto-dim">{j.equipos?.nombre || '—'}</td>
                  <td>{j.registroHoy ? <span className="punto-ok" /> : <span className="punto-pendiente" />}</td>
                  <td className="mono">{j.cargaSemanal}</td>
                  <td className="mono">{j.acwrPre !== null ? j.acwrPre.toFixed(2) : '—'}</td>
                  <td className="mono">{j.acwrPost !== null ? j.acwrPost.toFixed(2) : '—'}</td>
                  <td><span className={`riesgo-badge riesgo-${j.riesgo}`}>{traducirRiesgo(j.riesgo)}</span></td>
                  <td className="mono">{formatearPorcentaje(j.cambioDiario)}</td>
                  <td className="mono">{formatearPorcentaje(j.cambioSemanal)}</td>
                  <td className="mono">
                    {j.monotonia !== null ? j.monotonia.toFixed(2) : '—'}
                    {j.monotonia !== null && (
                      <span className={`monotonia-punto monotonia-${j.nivelMonotonia}`} />
                    )}
                  </td>
                  <td className="mono">{j.fatiga ? Math.round(j.fatiga) : '—'}</td>
                  <td className="mono">{j.ultimoBienestar ? j.ultimoBienestar.toFixed(1) + ' / 5' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {jugadoresFiltrados.length === 0 && (
          <p className="texto-dim">No hay jugadores en este grupo todavía.</p>
        )}
      </section>

      <p className="leyenda-riesgo texto-dim">
        ACWR — <span className="riesgo-badge riesgo-muy_baja">Muy baja</span> &lt;0.5 ·{' '}
        <span className="riesgo-badge riesgo-baja">Baja</span> 0.5–0.8 ·{' '}
        <span className="riesgo-badge riesgo-optima">Óptima</span> 0.8–1.1 ·{' '}
        <span className="riesgo-badge riesgo-moderada_alta">Mod. alta</span> 1.1–1.5 ·{' '}
        <span className="riesgo-badge riesgo-alta">Alta</span> 1.5–2.0 ·{' '}
        <span className="riesgo-badge riesgo-muy_alta">Muy alta</span> &gt;2.0
      </p>
    </div>
  )
}

function TarjetaResumen({ etiqueta, valor, tono }) {
  return (
    <div className={`tarjeta-resumen ${tono ? 'tarjeta-' + tono : ''}`}>
      <span className="tarjeta-valor mono">{valor}</span>
      <span className="tarjeta-etiqueta">{etiqueta}</span>
    </div>
  )
}

function promedio(valores) {
  const validos = valores.filter((v) => v !== null && v !== undefined)
  if (validos.length === 0) return null
  return validos.reduce((a, b) => a + b, 0) / validos.length
}

function formatearPorcentaje(valor) {
  if (valor === null || valor === undefined) return '—'
  const signo = valor > 0 ? '+' : ''
  return `${signo}${Math.round(valor * 100)}%`
}

function traducirRiesgo(r) {
  return {
    sin_datos: 'Sin datos',
    muy_baja: 'Muy baja',
    baja: 'Baja',
    optima: 'Óptima',
    moderada_alta: 'Mod. alta',
    alta: 'Alta',
    muy_alta: 'Muy alta',
  }[r]
}
