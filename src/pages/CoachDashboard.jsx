import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, ReferenceArea,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { calcularMetricas, clasificarRiesgoACWR, clasificarMonotonia, construirSerieDiaria } from '../lib/cargaMetrics'
import { calcularMalestar, clasificarBienestar } from '../lib/bienestar'
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

const variablesGrafico = [
  { valor: 'carga', etiqueta: 'Carga' },
  { valor: 'acwr', etiqueta: 'ACWR Post' },
  { valor: 'monotonia', etiqueta: 'Monotonía' },
  { valor: 'fatiga', etiqueta: 'Fatiga (Strain)' },
  { valor: 'malestar', etiqueta: 'Bienestar (malestar)' },
]

// Bandas de referencia según los umbrales de riesgo estándar en ciencias del
// deporte (Gabbett/Hulin para ACWR, Foster para Monotonía). "Carga" y
// "Fatiga (Strain)" no tienen un umbral absoluto universal en la literatura
// — dependen del contexto de cada deportista — así que no llevan bandas.
const bandasPorVariable = {
  acwr: [
    { y1: 0, y2: 0.5, color: 'var(--risk-mid)' },
    { y1: 0.5, y2: 0.8, color: 'var(--risk-low)' },
    { y1: 0.8, y2: 1.1, color: 'var(--accent)' },
    { y1: 1.1, y2: 1.5, color: 'var(--risk-mid)' },
    { y1: 1.5, y2: 2.0, color: 'var(--risk-high-mid)' },
    { y1: 2.0, y2: 3.5, color: 'var(--risk-high)' },
  ],
  monotonia: [
    { y1: 0, y2: 1, color: 'var(--text-faint)' },
    { y1: 1, y2: 2, color: 'var(--risk-low)' },
    { y1: 2, y2: 2.5, color: 'var(--risk-high-mid)' },
    { y1: 2.5, y2: 5, color: 'var(--risk-high)' },
  ],
  malestar: [
    { y1: 1, y2: 2, color: 'var(--risk-low)' },
    { y1: 2, y2: 3, color: 'var(--risk-mid)' },
    { y1: 3, y2: 5, color: 'var(--risk-high)' },
  ],
}

export default function CoachDashboard({ equipoActivo = 'todos' }) {
  const [jugadores, setJugadores] = useState([])
  const [registros, setRegistros] = useState([])
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState('equipo')
  const [variableGrafico, setVariableGrafico] = useState('carga')
  const [metodoACWR, setMetodoACWR] = useState('clasico')
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setCargando(true)
    // Se piden 70 días de histórico: suficiente para la carga crónica clásica
    // (28 días), el cambio semanal, y para que el EWMA tenga tiempo de estabilizarse.
    const [{ data: perfiles }, { data: regs }] = await Promise.all([
      supabase.from('perfiles').select('*, equipos(id, nombre)').eq('rol', 'jugador').order('nombre'),
      supabase.from('registros_diarios').select('*').gte('fecha', diasAtras(70)).order('fecha'),
    ])
    setJugadores(perfiles || [])
    setRegistros(regs || [])
    setCargando(false)
  }

  const jugadoresFiltrados = useMemo(() => {
    if (equipoActivo === 'todos') return jugadores
    if (equipoActivo === 'sin_asignar') return jugadores.filter((j) => !j.equipo_id)
    return jugadores.filter((j) => j.equipo_id === equipoActivo)
  }, [jugadores, equipoActivo])

  const resumenPorJugador = useMemo(() => {
    return jugadoresFiltrados.map((j) => {
      const suyos = registros.filter((r) => r.jugador_id === j.id)
      const metricas = calcularMetricas(suyos, metodoACWR)
      const ultimoRegistro = [...suyos].sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
      const malestar = ultimoRegistro ? calcularMalestar(ultimoRegistro) : null
      return {
        ...j,
        ...metricas,
        riesgo: clasificarRiesgoACWR(metricas.acwrPost),
        nivelMonotonia: clasificarMonotonia(metricas.monotonia),
        malestar,
        nivelBienestar: clasificarBienestar(malestar),
        molestiaHoy: ultimoRegistro?.fecha === diasAtras(0) && ultimoRegistro?.tiene_molestia
          ? ultimoRegistro.zona_molestia
          : null,
        registroHoy: suyos.some((r) => r.fecha === diasAtras(0)),
      }
    })
  }, [jugadoresFiltrados, registros, metodoACWR])

  const datosGrafico = useMemo(() => {
    const dias = 21
    const jugadoresGrafico = jugadorSeleccionado === 'equipo'
      ? jugadoresFiltrados
      : jugadoresFiltrados.filter((j) => j.id === jugadorSeleccionado)

    const fechas = []
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      fechas.push(d)
    }

    return fechas.map((fecha) => {
      const fechaISO = fecha.toISOString().slice(0, 10)
      const valoresDelDia = jugadoresGrafico.map((j) => {
        const suyos = registros.filter((r) => r.jugador_id === j.id)
        if (variableGrafico === 'carga') {
          return construirSerieDiaria(suyos, 1, fecha)[0].carga
        }
        if (variableGrafico === 'malestar') {
          const registroDia = suyos.find((r) => r.fecha === fechaISO)
          return registroDia ? calcularMalestar(registroDia) : null
        }
        const metricas = calcularMetricas(suyos, metodoACWR, fecha)
        if (variableGrafico === 'acwr') return metricas.acwrPost
        if (variableGrafico === 'monotonia') return metricas.monotonia
        if (variableGrafico === 'fatiga') return metricas.fatiga
        return null
      }).filter((v) => v !== null && v !== undefined)

      let valor = null
      if (valoresDelDia.length > 0) {
        valor = variableGrafico === 'carga'
          ? valoresDelDia.reduce((a, b) => a + b, 0)               // suma total del grupo
          : valoresDelDia.reduce((a, b) => a + b, 0) / valoresDelDia.length // media del grupo
      }
      return { fecha: fechaISO.slice(5), valor: valor !== null ? Number(valor.toFixed(2)) : null }
    })
  }, [registros, jugadorSeleccionado, jugadoresFiltrados, variableGrafico, metodoACWR])

  if (cargando) return <p className="mono texto-dim">Cargando datos del equipo…</p>

  return (
    <div className="coach-layout">
      <div className="coach-header">
        <h2>Panel del entrenador</h2>
        <div className="coach-header-derecha">
          <span className="mono texto-dim">{jugadoresFiltrados.length} jugadores</span>
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

      <section className="tarjetas-resumen">
        <TarjetaResumen etiqueta="Jugadores activos" valor={jugadoresFiltrados.length} />
        <TarjetaResumen
          etiqueta="Registraron hoy"
          valor={`${resumenPorJugador.filter((j) => j.registroHoy).length} / ${jugadoresFiltrados.length}`}
        />
        <TarjetaResumen
          etiqueta="Bienestar bajo (Malo)"
          valor={resumenPorJugador.filter((j) => j.nivelBienestar === 'malo').length}
          tono="alto"
        />
        <TarjetaResumen
          etiqueta="En riesgo (ACWR alto o muy alto)"
          valor={resumenPorJugador.filter((j) => j.riesgo === 'alta' || j.riesgo === 'muy_alta').length}
          tono="alto"
        />
      </section>

      <section className="grafico-card">
        <div className="grafico-cabecera">
          <h3>{variablesGrafico.find((v) => v.valor === variableGrafico).etiqueta} (últimos 21 días)</h3>
          <div className="grafico-selectores">
            <select
              value={variableGrafico}
              onChange={(e) => setVariableGrafico(e.target.value)}
              className="selector-jugador"
            >
              {variablesGrafico.map((v) => (
                <option key={v.valor} value={v.valor}>{v.etiqueta}</option>
              ))}
            </select>
            <select
              value={jugadorSeleccionado}
              onChange={(e) => setJugadorSeleccionado(e.target.value)}
              className="selector-jugador"
            >
              <option value="equipo">{equipoActivo === 'todos' ? 'Todo el equipo' : 'Todo el grupo seleccionado'}</option>
              {jugadoresFiltrados.map((j) => (
                <option key={j.id} value={j.id}>{j.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={datosGrafico}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="fecha" stroke="var(--text-faint)" fontSize={12} />
            <YAxis stroke="var(--text-faint)" fontSize={12} />
            <Tooltip
              contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-strong)', borderRadius: 8 }}
              labelStyle={{ color: 'var(--text)' }}
            />
            {(bandasPorVariable[variableGrafico] || []).map((b, i) => (
              <ReferenceArea
                key={i} y1={b.y1} y2={b.y2} fill={b.color} fillOpacity={0.12}
                strokeOpacity={0} ifOverflow="extendDomain"
              />
            ))}
            <Line type="monotone" dataKey="valor" stroke="var(--accent)" strokeWidth={2} dot={false} connectNulls />
          </LineChart>
        </ResponsiveContainer>
        {bandasPorVariable[variableGrafico] && (
          <p className="grafico-nota texto-dim">
            Bandas de color según umbrales de riesgo de la literatura (Gabbett/Hulin para ACWR, Foster para
            Monotonía y Bienestar) — no se aplican a Carga ni Fatiga por no tener un umbral absoluto universal.
          </p>
        )}
      </section>

      <section className="tabla-card tabla-card-ancha">
        <h3>Estado por jugador</h3>
        <div className="tabla-scroll">
          <table className="jugadores-tabla">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Bienestar</th>
                <th>Molestia</th>
                <th>Equipo</th>
                <th>Hoy</th>
                <th title="Suma de carga de los últimos 7 días">Carga Aguda</th>
                <th title="Media diaria de carga de los últimos 28 días">Carga Crónica</th>
                <th title="ACWR sin contar el registro de hoy: cómo llega el jugador">ACWR Pre</th>
                <th title="ACWR incluyendo el registro de hoy">ACWR Post</th>
                <th>Riesgo</th>
                <th>Cambio diario</th>
                <th>Cambio semanal</th>
                <th>Monotonía</th>
                <th>Fatiga (Strain)</th>
              </tr>
            </thead>
            <tbody>
              {resumenPorJugador.map((j) => (
                <tr key={j.id}>
                  <td>{j.nombre}</td>
                  <td>
                    {j.malestar !== null ? (
                      <span className={`bienestar-badge bienestar-${j.nivelBienestar}`}>
                        {traducirBienestar(j.nivelBienestar)}
                      </span>
                    ) : '—'}
                  </td>
                  <td>
                    {j.molestiaHoy ? (
                      <span className="molestia-badge">{j.molestiaHoy}</span>
                    ) : '—'}
                  </td>
                  <td className="texto-dim">{j.equipos?.nombre || '—'}</td>
                  <td>{j.registroHoy ? <span className="punto-ok" /> : <span className="punto-pendiente" />}</td>
                  <td className="mono">{j.cargaSemanal}</td>
                  <td className="mono">{j.cargaCronica ? Math.round(j.cargaCronica) : '—'}</td>
                  <td className="mono">{j.acwrPre !== null ? j.acwrPre.toFixed(2) : '—'}</td>
                  <td className="mono">{j.acwrPost !== null ? j.acwrPost.toFixed(2) : '—'}</td>
                  <td><span className={`riesgo-badge riesgo-${j.riesgo}`}>{traducirRiesgo(j.riesgo)}</span></td>
                  <td className="mono">{formatearPorcentaje(j.cambioDiario)}</td>
                  <td className="mono">{formatearPorcentaje(j.cambioSemanal)}</td>
                  <td className="mono">
                    {j.monotonia !== null ? (
                      <span className={`monotonia-badge monotonia-${j.nivelMonotonia}`}>
                        {j.monotonia.toFixed(2)} · {traducirMonotonia(j.nivelMonotonia)}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="mono">{j.fatiga ? Math.round(j.fatiga) : '—'}</td>
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
        <br />
        Monotonía — <span className="monotonia-badge monotonia-muy_variable">Muy variable</span> &lt;1 ·{' '}
        <span className="monotonia-badge monotonia-correcta">Correcta</span> 1–2 ·{' '}
        <span className="monotonia-badge monotonia-elevada">Elevada</span> 2–2.5 ·{' '}
        <span className="monotonia-badge monotonia-riesgo_elevado">Riesgo elevado</span> &gt;2.5
        <br />
        Bienestar (estilo Índice de Hooper) — <span className="bienestar-badge bienestar-optimo">Óptimo</span> ·{' '}
        <span className="bienestar-badge bienestar-bueno">Bueno</span> ·{' '}
        <span className="bienestar-badge bienestar-malo">Malo</span>
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

function traducirMonotonia(m) {
  return {
    sin_datos: 'Sin datos',
    muy_variable: 'Muy variable',
    correcta: 'Correcta',
    elevada: 'Elevada',
    riesgo_elevado: 'Riesgo elevado',
  }[m]
}

function traducirBienestar(b) {
  return {
    sin_datos: 'Sin datos',
    optimo: 'Óptimo',
    bueno: 'Bueno',
    malo: 'Malo',
  }[b]
}
