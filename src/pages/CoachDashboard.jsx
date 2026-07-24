import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import './CoachDashboard.css'

const diasAtras = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function CoachDashboard() {
  const [jugadores, setJugadores] = useState([])
  const [registros, setRegistros] = useState([])
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState('equipo')
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setCargando(true)
    const [{ data: perfiles }, { data: regs }] = await Promise.all([
      supabase.from('perfiles').select('*').eq('rol', 'jugador').order('nombre'),
      supabase.from('registros_diarios').select('*').gte('fecha', diasAtras(35)).order('fecha'),
    ])
    setJugadores(perfiles || [])
    setRegistros(regs || [])
    setCargando(false)
  }

  const resumenPorJugador = useMemo(() => {
    return jugadores.map((j) => {
      const suyos = registros.filter((r) => r.jugador_id === j.id)
      const cargaSemana = sumaDesde(suyos, 7)
      const cargaAguda = promedioDesde(suyos, 7)
      const cargaCronica = promedioDesde(suyos, 28)
      const acwr = cargaCronica > 0 ? cargaAguda / cargaCronica : null
      const ultimoRegistro = [...suyos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
      return {
        ...j,
        cargaSemana,
        acwr,
        riesgo: clasificarRiesgo(acwr),
        ultimoBienestar: ultimoRegistro
          ? promedio([ultimoRegistro.sueno, ultimoRegistro.fatiga, ultimoRegistro.dolor_muscular, ultimoRegistro.estres, ultimoRegistro.animo])
          : null,
        registroHoy: suyos.some((r) => r.fecha === diasAtras(0)),
      }
    })
  }, [jugadores, registros])

  const datosGrafico = useMemo(() => {
    const fuente = jugadorSeleccionado === 'equipo'
      ? registros
      : registros.filter((r) => r.jugador_id === jugadorSeleccionado)

    const porFecha = {}
    fuente.forEach((r) => {
      porFecha[r.fecha] = (porFecha[r.fecha] || 0) + (r.carga || 0)
    })
    return Object.entries(porFecha)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, carga]) => ({ fecha: fecha.slice(5), carga }))
  }, [registros, jugadorSeleccionado])

  if (cargando) return <p className="mono texto-dim">Cargando datos del equipo…</p>

  return (
    <div className="coach-layout">
      <div className="coach-header">
        <h2>Panel del entrenador</h2>
        <span className="mono texto-dim">{jugadores.length} jugadores · últimos 35 días</span>
      </div>

      <section className="tarjetas-resumen">
        <TarjetaResumen etiqueta="Jugadores activos" valor={jugadores.length} />
        <TarjetaResumen
          etiqueta="Registraron hoy"
          valor={`${resumenPorJugador.filter((j) => j.registroHoy).length} / ${jugadores.length}`}
        />
        <TarjetaResumen
          etiqueta="En riesgo (ACWR alto)"
          valor={resumenPorJugador.filter((j) => j.riesgo === 'alto').length}
          tono="alto"
        />
      </section>

      <section className="grafico-card">
        <div className="grafico-cabecera">
          <h3>Carga acumulada por día</h3>
          <select
            value={jugadorSeleccionado}
            onChange={(e) => setJugadorSeleccionado(e.target.value)}
            className="selector-jugador"
          >
            <option value="equipo">Todo el equipo</option>
            {jugadores.map((j) => (
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

      <section className="tabla-card">
        <h3>Estado por jugador</h3>
        <table className="jugadores-tabla">
          <thead>
            <tr>
              <th>Jugador</th>
              <th>Hoy</th>
              <th>Carga 7 días</th>
              <th>ACWR</th>
              <th>Riesgo</th>
              <th>Bienestar reciente</th>
            </tr>
          </thead>
          <tbody>
            {resumenPorJugador.map((j) => (
              <tr key={j.id}>
                <td>{j.nombre}</td>
                <td>{j.registroHoy ? <span className="punto-ok" /> : <span className="punto-pendiente" />}</td>
                <td className="mono">{j.cargaSemana}</td>
                <td className="mono">{j.acwr ? j.acwr.toFixed(2) : '—'}</td>
                <td><span className={`riesgo-badge riesgo-${j.riesgo}`}>{traducirRiesgo(j.riesgo)}</span></td>
                <td className="mono">{j.ultimoBienestar ? j.ultimoBienestar.toFixed(1) + ' / 5' : '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {jugadores.length === 0 && (
          <p className="texto-dim">Todavía no hay jugadores registrados en el equipo.</p>
        )}
      </section>
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

function sumaDesde(registros, dias) {
  const limite = diasAtras(dias)
  return registros.filter((r) => r.fecha >= limite).reduce((acc, r) => acc + (r.carga || 0), 0)
}

function promedioDesde(registros, dias) {
  const limite = diasAtras(dias)
  const relevantes = registros.filter((r) => r.fecha >= limite)
  if (relevantes.length === 0) return 0
  return relevantes.reduce((acc, r) => acc + (r.carga || 0), 0) / dias
}

function promedio(valores) {
  const validos = valores.filter((v) => v !== null && v !== undefined)
  if (validos.length === 0) return null
  return validos.reduce((a, b) => a + b, 0) / validos.length
}

function clasificarRiesgo(acwr) {
  if (acwr === null) return 'sin_datos'
  if (acwr < 0.8) return 'bajo'
  if (acwr <= 1.3) return 'optimo'
  if (acwr <= 1.5) return 'medio'
  return 'alto'
}

function traducirRiesgo(r) {
  return {
    sin_datos: 'Sin datos',
    bajo: 'Baja carga',
    optimo: 'Óptimo',
    medio: 'Vigilar',
    alto: 'Alto riesgo',
  }[r]
}
