import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, ReferenceArea,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { calcularMetricas, clasificarRiesgoACWR, clasificarMonotonia } from '../lib/cargaMetrics'
import { calcularMalestar, clasificarBienestar } from '../lib/bienestar'
import './CoachDashboard.css'

const diasAtras = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

const tiposVistaGrafico = [
  { valor: 'diario', etiqueta: 'Diaria' },
  { valor: 'semanal', etiqueta: 'Semanal' },
  { valor: 'mensual', etiqueta: 'Mensual' },
]

/** Construye los "cubos" (rangos de fechas) que cubren exactamente el rango elegido (desde/hasta). */
function construirBuckets(tipoVista, fechaDesde, fechaHasta) {
  const inicio = new Date(fechaDesde + 'T00:00:00')
  const fin = new Date(fechaHasta + 'T00:00:00')
  const buckets = []

  if (fin < inicio) return buckets

  if (tipoVista === 'diario') {
    const cursor = new Date(inicio)
    while (cursor <= fin) {
      buckets.push({ inicio: new Date(cursor), fin: new Date(cursor), etiqueta: cursor.toISOString().slice(5, 10) })
      cursor.setDate(cursor.getDate() + 1)
    }
  } else if (tipoVista === 'semanal') {
    const cursor = new Date(inicio)
    while (cursor <= fin) {
      const finBucket = new Date(cursor); finBucket.setDate(finBucket.getDate() + 6)
      const finReal = finBucket > fin ? new Date(fin) : finBucket
      buckets.push({ inicio: new Date(cursor), fin: finReal, etiqueta: cursor.toISOString().slice(5, 10) })
      cursor.setDate(cursor.getDate() + 7)
    }
  } else {
    let cursor = new Date(inicio.getFullYear(), inicio.getMonth(), 1)
    while (cursor <= fin) {
      const finMes = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0)
      const inicioReal = cursor < inicio ? inicio : cursor
      const finReal = finMes > fin ? fin : finMes
      buckets.push({
        inicio: inicioReal, fin: finReal,
        etiqueta: finMes.toLocaleDateString('es-ES', { month: 'short', year: '2-digit' }),
      })
      cursor = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1)
    }
  }
  return buckets.slice(-60)
}

/** Calcula el valor de la variable seleccionada para un cubo de fechas concreto. */
function calcularValorBucket(bucket, jugadoresGrafico, registros, variableGrafico, metodoACWR) {
  const inicioISO = bucket.inicio.toISOString().slice(0, 10)
  const finISO = bucket.fin.toISOString().slice(0, 10)

  if (variableGrafico === 'carga') {
    let suma = 0
    jugadoresGrafico.forEach((j) => {
      registros
        .filter((r) => r.jugador_id === j.id && r.fecha >= inicioISO && r.fecha <= finISO)
        .forEach((r) => { suma += r.carga || 0 })
    })
    return suma
  }

  if (variableGrafico === 'malestar') {
    const valores = []
    jugadoresGrafico.forEach((j) => {
      registros
        .filter((r) => r.jugador_id === j.id && r.fecha >= inicioISO && r.fecha <= finISO)
        .forEach((r) => {
          const m = calcularMalestar(r)
          if (m !== null && m !== undefined) valores.push(m)
        })
    })
    if (valores.length === 0) return null
    return valores.reduce((a, b) => a + b, 0) / valores.length
  }

  const valores = jugadoresGrafico.map((j) => {
    const suyos = registros.filter((r) => r.jugador_id === j.id)
    const metricas = calcularMetricas(suyos, metodoACWR, bucket.fin)
    if (variableGrafico === 'acwr') return metricas.acwrPost
    if (variableGrafico === 'monotonia') return metricas.monotonia
    if (variableGrafico === 'fatiga') return metricas.fatiga
    return null
  }).filter((v) => v !== null && v !== undefined)
  if (valores.length === 0) return null
  return valores.reduce((a, b) => a + b, 0) / valores.length
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

export default function CoachDashboard({ equipoActivo = 'todos', jugadorActivo = 'equipo', fechaDesde, fechaHasta }) {
  const [jugadores, setJugadores] = useState([])
  const [registros, setRegistros] = useState([])
  const [variableGrafico, setVariableGrafico] = useState('carga')
  const [tipoVistaGrafico, setTipoVistaGrafico] = useState('diario')
  const [metodoACWR, setMetodoACWR] = useState('clasico')
  const [informeAbierto, setInformeAbierto] = useState(false)
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setCargando(true)
    const [{ data: perfiles }, { data: regs }] = await Promise.all([
      supabase.from('perfiles').select('*, equipos(id, nombre)').eq('rol', 'jugador').order('nombre'),
      supabase.from('registros_diarios').select('*').gte('fecha', diasAtras(400)).order('fecha'),
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

  const jugadoresGrafico = useMemo(() => (
    jugadorActivo === 'equipo'
      ? jugadoresFiltrados
      : jugadoresFiltrados.filter((j) => j.id === jugadorActivo)
  ), [jugadorActivo, jugadoresFiltrados])

  const buckets = useMemo(
    () => construirBuckets(tipoVistaGrafico, fechaDesde, fechaHasta),
    [tipoVistaGrafico, fechaDesde, fechaHasta]
  )

  function construirDatosVariable(variable) {
    return buckets.map((b) => {
      const valor = calcularValorBucket(b, jugadoresGrafico, registros, variable, metodoACWR)
      return { fecha: b.etiqueta, valor: valor !== null ? Number(valor.toFixed(2)) : null }
    })
  }

  const datosGrafico = useMemo(
    () => construirDatosVariable(variableGrafico),
    [registros, jugadoresGrafico, variableGrafico, metodoACWR, buckets]
  )

  const resumenTarjetas = useMemo(() => {
    if (buckets.length === 0) return null
    const periodoInicio = buckets[0].inicio.toISOString().slice(0, 10)
    const periodoFinDate = buckets[buckets.length - 1].fin
    const periodoFin = periodoFinDate.toISOString().slice(0, 10)

    if (jugadorActivo !== 'equipo') {
      const jugador = jugadoresGrafico[0]
      if (!jugador) return null
      const suyos = registros.filter((r) => r.jugador_id === jugador.id)
      const registrosPeriodo = suyos.filter((r) => r.fecha >= periodoInicio && r.fecha <= periodoFin)
      const cargaTotal = registrosPeriodo.reduce((acc, r) => acc + (r.carga || 0), 0)
      const diasConRpe = registrosPeriodo.filter((r) => r.rpe !== null && r.rpe !== undefined).length
      const diasPeriodo = Math.round((periodoFinDate - buckets[0].inicio) / 86400000) + 1
      const malestares = registrosPeriodo.map((r) => calcularMalestar(r)).filter((v) => v !== null && v !== undefined)
      const malestarMedio = malestares.length ? malestares.reduce((a, b) => a + b, 0) / malestares.length : null
      const nivelBienestar = clasificarBienestar(malestarMedio)
      const metricasFin = calcularMetricas(suyos, metodoACWR, periodoFinDate)
      const riesgo = clasificarRiesgoACWR(metricasFin.acwrPost)
      const nivelMonot = clasificarMonotonia(metricasFin.monotonia)

      return {
        modo: 'individual',
        tarjetas: [
          { etiqueta: 'Carga total del periodo', valor: cargaTotal },
          { etiqueta: 'Días con RPE registrado', valor: `${diasConRpe} / ${diasPeriodo}` },
          {
            etiqueta: 'Bienestar medio', valor: traducirBienestar(nivelBienestar),
            tono: nivelBienestar === 'malo' ? 'alto' : null,
          },
          {
            etiqueta: 'ACWR al final del periodo',
            valor: metricasFin.acwrPost !== null ? `${metricasFin.acwrPost.toFixed(2)} · ${traducirRiesgo(riesgo)}` : '—',
            tono: (riesgo === 'alta' || riesgo === 'muy_alta') ? 'alto' : null,
          },
          {
            etiqueta: 'Monotonía al final del periodo',
            valor: metricasFin.monotonia !== null ? `${metricasFin.monotonia.toFixed(2)} · ${traducirMonotonia(nivelMonot)}` : '—',
            tono: nivelMonot === 'riesgo_elevado' ? 'alto' : null,
          },
          {
            etiqueta: 'Fatiga (Strain) al final del periodo',
            valor: metricasFin.fatiga !== null && metricasFin.fatiga !== undefined ? Math.round(metricasFin.fatiga) : '—',
          },
        ],
      }
    }

    const registrosPeriodo = registros.filter((r) =>
      jugadoresGrafico.some((j) => j.id === r.jugador_id) && r.fecha >= periodoInicio && r.fecha <= periodoFin
    )
    const jugadoresConRegistro = jugadoresGrafico.filter((j) =>
      registrosPeriodo.some((r) => r.jugador_id === j.id && r.rpe !== null && r.rpe !== undefined)
    ).length
    const malestares = registrosPeriodo.map((r) => calcularMalestar(r)).filter((v) => v !== null && v !== undefined)
    const malestarMedio = malestares.length ? malestares.reduce((a, b) => a + b, 0) / malestares.length : null
    const nivelBienestar = clasificarBienestar(malestarMedio)

    const metricasPorJugador = jugadoresGrafico.map((j) => {
      const suyos = registros.filter((r) => r.jugador_id === j.id)
      return calcularMetricas(suyos, metodoACWR, periodoFinDate)
    })
    const enRiesgo = metricasPorJugador.filter((m) => {
      const r = clasificarRiesgoACWR(m.acwrPost)
      return r === 'alta' || r === 'muy_alta'
    }).length

    const media = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null)
    const cargaTotalGrupo = jugadoresGrafico.reduce((acc, j) => (
      acc + registrosPeriodo.filter((r) => r.jugador_id === j.id).reduce((a, r) => a + (r.carga || 0), 0)
    ), 0)
    const cargaMediaJugador = jugadoresGrafico.length ? cargaTotalGrupo / jugadoresGrafico.length : null
    const acwrMedio = media(metricasPorJugador.map((m) => m.acwrPost).filter((v) => v !== null && v !== undefined))
    const monotoniaMedia = media(metricasPorJugador.map((m) => m.monotonia).filter((v) => v !== null && v !== undefined))
    const fatigaMedia = media(metricasPorJugador.map((m) => m.fatiga).filter((v) => v !== null && v !== undefined))

    return {
      modo: 'grupo',
      tarjetas: [
        { etiqueta: 'Jugadores en el grupo', valor: jugadoresGrafico.length },
        { etiqueta: 'Registraron en el periodo', valor: `${jugadoresConRegistro} / ${jugadoresGrafico.length}` },
        { etiqueta: 'Carga media por jugador', valor: cargaMediaJugador !== null ? Math.round(cargaMediaJugador) : '—' },
        {
          etiqueta: 'Bienestar medio del grupo', valor: traducirBienestar(nivelBienestar),
          tono: nivelBienestar === 'malo' ? 'alto' : null,
        },
        { etiqueta: 'ACWR medio del grupo', valor: acwrMedio !== null ? acwrMedio.toFixed(2) : '—' },
        { etiqueta: 'Monotonía media del grupo', valor: monotoniaMedia !== null ? monotoniaMedia.toFixed(2) : '—' },
        { etiqueta: 'Fatiga (Strain) media del grupo', valor: fatigaMedia !== null ? Math.round(fatigaMedia) : '—' },
        { etiqueta: 'En riesgo (ACWR alto/muy alto)', valor: enRiesgo, tono: enRiesgo > 0 ? 'alto' : null },
      ],
    }
  }, [jugadorActivo, jugadoresGrafico, registros, metodoACWR, buckets])

  function exportarInformeCSV() {
    const cabeceras = ['Periodo', ...variablesGrafico.map((v) => v.etiqueta)]
    const columnas = variablesGrafico.map((v) => construirDatosVariable(v.valor))
    const filas = buckets.map((b, i) => [
      b.etiqueta, ...columnas.map((col) => col[i].valor ?? ''),
    ])
    const csv = [cabeceras, ...filas]
      .map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `resumen_${tipoVistaGrafico}_${fechaDesde}_a_${fechaHasta}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

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
          <button className="btn-exportar" onClick={exportarInformeCSV}>Exportar CSV</button>
          <button className="btn-exportar" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        </div>
      </div>

      <p className="coach-contexto-nota texto-dim no-imprimir">
        Usa el selector <strong>◎</strong> de arriba para cambiar el equipo, jugador o rango de fechas.
      </p>

      <section className="tarjetas-resumen">
        {resumenTarjetas?.tarjetas.map((t, i) => (
          <TarjetaResumen key={i} etiqueta={t.etiqueta} valor={t.valor} tono={t.tono} />
        ))}
      </section>

      <section className="grafico-card no-imprimir">
        <div className="grafico-cabecera">
          <h3>
            {variablesGrafico.find((v) => v.valor === variableGrafico).etiqueta}
            {' '}({tiposVistaGrafico.find((t) => t.valor === tipoVistaGrafico).etiqueta.toLowerCase()})
          </h3>
          <div className="grafico-selectores">
            <select
              value={tipoVistaGrafico}
              onChange={(e) => setTipoVistaGrafico(e.target.value)}
              className="selector-jugador"
            >
              {tiposVistaGrafico.map((t) => (
                <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
              ))}
            </select>
            <select
              value={variableGrafico}
              onChange={(e) => setVariableGrafico(e.target.value)}
              className="selector-jugador"
            >
              {variablesGrafico.map((v) => (
                <option key={v.valor} value={v.valor}>{v.etiqueta}</option>
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
        <p className="grafico-nota texto-dim">
          Del {new Date(fechaDesde + 'T00:00:00').toLocaleDateString('es-ES')} al{' '}
          {new Date(fechaHasta + 'T00:00:00').toLocaleDateString('es-ES')}
          {' '}({buckets.length} {tipoVistaGrafico === 'diario' ? 'días' : tipoVistaGrafico === 'semanal' ? 'semanas' : 'meses'}).
        </p>
        {bandasPorVariable[variableGrafico] && (
          <p className="grafico-nota texto-dim">
            Bandas de color según umbrales de riesgo de la literatura (Gabbett/Hulin para ACWR, Foster para
            Monotonía y Bienestar) — no se aplican a Carga ni Fatiga por no tener un umbral absoluto universal.
          </p>
        )}
      </section>

      <button className="informe-toggle no-imprimir" onClick={() => setInformeAbierto(!informeAbierto)}>
        {informeAbierto ? '▾' : '▸'} {informeAbierto ? 'Ocultar' : 'Ver'} informe completo (las 5 variables)
      </button>

      {informeAbierto && (
        <section className="informe-resumen-card">
          <h2 className="informe-resumen-titulo">
            {resumenTarjetas?.modo === 'individual'
              ? `Informe individual — ${jugadoresGrafico[0]?.nombre || ''}`
              : `Informe de equipo — ${equipoActivo === 'todos' ? 'Todos los equipos' : equipoActivo === 'sin_asignar' ? 'Sin asignar' : jugadoresFiltrados[0]?.equipos?.nombre || 'Grupo seleccionado'}`}
          </h2>
          <p className="texto-dim">
            Vista {tiposVistaGrafico.find((t) => t.valor === tipoVistaGrafico).etiqueta.toLowerCase()},
            {' '}del {new Date(fechaDesde + 'T00:00:00').toLocaleDateString('es-ES')} al{' '}
            {new Date(fechaHasta + 'T00:00:00').toLocaleDateString('es-ES')}
          </p>

          <div className="informe-graficos-grid">
            {variablesGrafico.map((v) => (
              <div className="mini-grafico-card" key={v.valor}>
                <h4>{v.etiqueta}</h4>
                <ResponsiveContainer width="100%" height={170}>
                  <LineChart data={construirDatosVariable(v.valor)} margin={{ top: 5, right: 10, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
                    <XAxis dataKey="fecha" stroke="var(--text-faint)" fontSize={11} />
                    <YAxis stroke="var(--text-faint)" fontSize={11} width={32} />
                    <Tooltip contentStyle={{ background: 'var(--bg-elevated)', border: '1px solid var(--line-strong)', borderRadius: 8, fontSize: 12 }} />
                    {(bandasPorVariable[v.valor] || []).map((b, i) => (
                      <ReferenceArea key={i} y1={b.y1} y2={b.y2} fill={b.color} fillOpacity={0.1} strokeOpacity={0} ifOverflow="extendDomain" />
                    ))}
                    <Line type="monotone" dataKey="valor" stroke="var(--accent)" strokeWidth={2} dot={false} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        </section>
      )}
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
