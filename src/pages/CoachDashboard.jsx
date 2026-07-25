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
  // Límite de seguridad: como mucho 60 puntos, por si se elige un rango muy amplio en vista diaria.
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

  // acwr / monotonia / fatiga: se evalúan al final del cubo (con todo su histórico
  // previo) para cada jugador, y se promedian entre jugadores del grupo.
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
  const [tipoVistaGrafico, setTipoVistaGrafico] = useState('diario')
  const [fechaDesdeGrafico, setFechaDesdeGrafico] = useState(diasAtras(20))
  const [fechaHastaGrafico, setFechaHastaGrafico] = useState(diasAtras(0))
  const [metodoACWR, setMetodoACWR] = useState('clasico')
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setCargando(true)
    // Se piden ~13 meses de histórico: cubre la vista mensual (6 meses hacia
    // atrás desde la fecha de referencia elegida) más margen para ACWR/EWMA.
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

  const resumenPorJugador = useMemo(() => {
    const fechaRef = new Date(fechaHastaGrafico + 'T00:00:00')
    return jugadoresFiltrados.map((j) => {
      const suyos = registros.filter((r) => r.jugador_id === j.id)
      const metricas = calcularMetricas(suyos, metodoACWR, fechaRef)
      const ultimoRegistro = [...suyos]
        .filter((r) => r.fecha <= fechaHastaGrafico)
        .sort((a, b) => b.fecha.localeCompare(a.fecha))[0]
      const malestar = ultimoRegistro ? calcularMalestar(ultimoRegistro) : null
      return {
        ...j,
        ...metricas,
        riesgo: clasificarRiesgoACWR(metricas.acwrPost),
        nivelMonotonia: clasificarMonotonia(metricas.monotonia),
        malestar,
        nivelBienestar: clasificarBienestar(malestar),
        molestiaFecha: ultimoRegistro?.fecha === fechaHastaGrafico && ultimoRegistro?.tiene_molestia
          ? ultimoRegistro.zona_molestia
          : null,
        registroFecha: suyos.some((r) => r.fecha === fechaHastaGrafico),
      }
    })
  }, [jugadoresFiltrados, registros, metodoACWR, fechaHastaGrafico])

  const jugadoresGrafico = useMemo(() => (
    jugadorSeleccionado === 'equipo'
      ? jugadoresFiltrados
      : jugadoresFiltrados.filter((j) => j.id === jugadorSeleccionado)
  ), [jugadorSeleccionado, jugadoresFiltrados])

  const buckets = useMemo(
    () => construirBuckets(tipoVistaGrafico, fechaDesdeGrafico, fechaHastaGrafico),
    [tipoVistaGrafico, fechaDesdeGrafico, fechaHastaGrafico]
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

  // --- Tarjetas de resumen: se adaptan a la vista/fecha/jugador seleccionados ---
  const resumenTarjetas = useMemo(() => {
    const periodoInicio = buckets[0].inicio.toISOString().slice(0, 10)
    const periodoFinDate = buckets[buckets.length - 1].fin
    const periodoFin = periodoFinDate.toISOString().slice(0, 10)

    if (jugadorSeleccionado !== 'equipo') {
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
        {
          etiqueta: 'ACWR medio del grupo',
          valor: acwrMedio !== null ? acwrMedio.toFixed(2) : '—',
        },
        {
          etiqueta: 'Monotonía media del grupo',
          valor: monotoniaMedia !== null ? monotoniaMedia.toFixed(2) : '—',
        },
        {
          etiqueta: 'Fatiga (Strain) media del grupo',
          valor: fatigaMedia !== null ? Math.round(fatigaMedia) : '—',
        },
        { etiqueta: 'En riesgo (ACWR alto/muy alto)', valor: enRiesgo, tono: enRiesgo > 0 ? 'alto' : null },
      ],
    }
  }, [jugadorSeleccionado, jugadoresGrafico, registros, metodoACWR, buckets])

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
    a.download = `resumen_${tipoVistaGrafico}_${fechaDesdeGrafico}_a_${fechaHastaGrafico}.csv`
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
            <label className="rango-fecha-campo">
              <span>Desde</span>
              <input
                type="date"
                value={fechaDesdeGrafico}
                max={fechaHastaGrafico}
                onChange={(e) => setFechaDesdeGrafico(e.target.value)}
                className="selector-jugador"
              />
            </label>
            <label className="rango-fecha-campo">
              <span>Hasta</span>
              <input
                type="date"
                value={fechaHastaGrafico}
                min={fechaDesdeGrafico}
                max={diasAtras(0)}
                onChange={(e) => setFechaHastaGrafico(e.target.value)}
                className="selector-jugador"
              />
            </label>
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
        <p className="grafico-nota texto-dim">
          Del {new Date(fechaDesdeGrafico + 'T00:00:00').toLocaleDateString('es-ES')} al{' '}
          {new Date(fechaHastaGrafico + 'T00:00:00').toLocaleDateString('es-ES')}
          {' '}({buckets.length} {tipoVistaGrafico === 'diario' ? 'días' : tipoVistaGrafico === 'semanal' ? 'semanas' : 'meses'}).
        </p>
        {bandasPorVariable[variableGrafico] && (
          <p className="grafico-nota texto-dim">
            Bandas de color según umbrales de riesgo de la literatura (Gabbett/Hulin para ACWR, Foster para
            Monotonía y Bienestar) — no se aplican a Carga ni Fatiga por no tener un umbral absoluto universal.
          </p>
        )}
      </section>

      <section className="tabla-card tabla-card-ancha no-imprimir">
        <h3>
          Estado por jugador
          <span className="texto-dim mono tabla-fecha-nota">
            {' '}— a fecha {new Date(fechaHastaGrafico + 'T00:00:00').toLocaleDateString('es-ES')}
          </span>
        </h3>
        <div className="tabla-scroll">
          <table className="jugadores-tabla">
            <thead>
              <tr>
                <th>Jugador</th>
                <th>Bienestar</th>
                <th>Molestia</th>
                <th>Equipo</th>
                <th title={`¿Registró RPE el ${fechaHastaGrafico}?`}>Registró</th>
                <th title="Suma de carga de los últimos 7 días hasta la fecha elegida">Carga Aguda</th>
                <th title="Media diaria de carga de los últimos 28 días hasta la fecha elegida">Carga Crónica</th>
                <th title="ACWR sin contar el registro de la fecha elegida: cómo llega el jugador">ACWR Pre</th>
                <th title="ACWR incluyendo el registro de la fecha elegida">ACWR Post</th>
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
                    {j.molestiaFecha ? (
                      <span className="molestia-badge">{j.molestiaFecha}</span>
                    ) : '—'}
                  </td>
                  <td className="texto-dim">
                    {j.equipos ? (
                      <span className="equipo-etiqueta">
                        <span className="equipo-punto-mini" style={{ background: j.equipos.color || '#c8ff4d' }} />
                        {j.equipos.nombre}
                      </span>
                    ) : '—'}
                  </td>
                  <td>{j.registroFecha ? <span className="punto-ok" /> : <span className="punto-pendiente" />}</td>
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

      <p className="leyenda-riesgo texto-dim no-imprimir">
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

      <section className="informe-resumen-card">
        <h2 className="informe-resumen-titulo">
          {resumenTarjetas?.modo === 'individual'
            ? `Informe individual — ${jugadoresGrafico[0]?.nombre || ''}`
            : `Informe de equipo — ${equipoActivo === 'todos' ? 'Todos los equipos' : equipoActivo === 'sin_asignar' ? 'Sin asignar' : jugadoresFiltrados[0]?.equipos?.nombre || 'Grupo seleccionado'}`}
        </h2>
        <p className="texto-dim">
          Vista {tiposVistaGrafico.find((t) => t.valor === tipoVistaGrafico).etiqueta.toLowerCase()},
          {' '}del {new Date(fechaDesdeGrafico + 'T00:00:00').toLocaleDateString('es-ES')} al{' '}
          {new Date(fechaHastaGrafico + 'T00:00:00').toLocaleDateString('es-ES')}
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
