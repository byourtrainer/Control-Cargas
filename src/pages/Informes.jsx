import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import {
  calcularMetricas, construirSerieDiaria, cambioPeriodo,
} from '../lib/cargaMetrics'
import { calcularMalestar, clasificarBienestar } from '../lib/bienestar'
import './Informes.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

const periodos = [
  { valor: 'diario', etiqueta: 'Diario', dias: 1 },
  { valor: 'semanal', etiqueta: 'Semanal', dias: 7 },
  { valor: 'mensual', etiqueta: 'Mensual', dias: 28 },
]

const traducirBienestar = (b) => ({ sin_datos: 'Sin datos', optimo: 'Óptimo', bueno: 'Bueno', malo: 'Malo' }[b])

export default function Informes({ equipoActivo = 'todos' }) {
  const [jugadores, setJugadores] = useState([])
  const [registros, setRegistros] = useState([])
  const [lesiones, setLesiones] = useState([])
  const [periodo, setPeriodo] = useState('semanal')
  const [fechaRef, setFechaRef] = useState(hoyISO())
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarDatos() }, [])

  async function cargarDatos() {
    setCargando(true)
    const [{ data: perfiles }, { data: regs }, { data: lesionesData }] = await Promise.all([
      supabase.from('perfiles').select('*, equipos(id, nombre)').eq('rol', 'jugador').order('nombre'),
      // Histórico amplio: cubre carga crónica mensual + comparativas de periodo anterior.
      supabase.from('registros_diarios').select('*').order('fecha'),
      supabase.from('lesiones').select('*'),
    ])
    setJugadores(perfiles || [])
    setRegistros(regs || [])
    setLesiones(lesionesData || [])
    setCargando(false)
  }

  const jugadoresFiltrados = useMemo(() => {
    if (equipoActivo === 'todos') return jugadores
    if (equipoActivo === 'sin_asignar') return jugadores.filter((j) => !j.equipo_id)
    return jugadores.filter((j) => j.equipo_id === equipoActivo)
  }, [jugadores, equipoActivo])

  const dias = periodos.find((p) => p.valor === periodo).dias

  const filas = useMemo(() => {
    const fecha = new Date(fechaRef)
    const inicioVentana = new Date(fecha)
    inicioVentana.setDate(inicioVentana.getDate() - (dias - 1))
    const inicioISO = inicioVentana.toISOString().slice(0, 10)

    return jugadoresFiltrados.map((j) => {
      const suyos = registros.filter((r) => r.jugador_id === j.id)
      const lesionesJugador = lesiones.filter(
        (l) => l.jugador_id === j.id && l.fecha_lesion >= inicioISO && l.fecha_lesion <= fechaRef
      )

      if (periodo === 'diario') {
        const registroDia = suyos.find((r) => r.fecha === fechaRef)
        const metricas = calcularMetricas(suyos, 'clasico', fecha)
        const malestar = registroDia ? calcularMalestar(registroDia) : null
        return {
          nombre: j.nombre,
          equipo: j.equipos?.nombre || '—',
          registrado: !!registroDia,
          rpe: registroDia?.rpe ?? null,
          duracion: registroDia?.duracion_min ?? null,
          carga: registroDia?.carga ?? null,
          acwr: metricas.acwrPost,
          monotonia: metricas.monotonia,
          malestar,
          nivelBienestar: clasificarBienestar(malestar),
          lesiones: lesionesJugador.length,
        }
      }

      const serieVentana = construirSerieDiaria(suyos, dias, fecha)
      const cargaTotal = serieVentana.reduce((a, d) => a + d.carga, 0)
      const diasRegistrados = suyos.filter((r) => r.fecha >= inicioISO && r.fecha <= fechaRef).length
      const registrosVentana = suyos.filter((r) => r.fecha >= inicioISO && r.fecha <= fechaRef)
      const malestares = registrosVentana.map((r) => calcularMalestar(r)).filter((v) => v !== null)
      const malestarMedio = malestares.length ? malestares.reduce((a, b) => a + b, 0) / malestares.length : null
      const metricas = calcularMetricas(suyos, 'clasico', fecha)

      return {
        nombre: j.nombre,
        equipo: j.equipos?.nombre || '—',
        cargaTotal,
        cargaCronica: metricas.cargaCronica,
        acwrPre: metricas.acwrPre,
        acwrPost: metricas.acwrPost,
        cambio: cambioPeriodo(suyos, dias, fecha),
        monotonia: metricas.monotonia,
        fatiga: metricas.fatiga,
        malestarMedio,
        nivelBienestar: clasificarBienestar(malestarMedio),
        diasRegistrados,
        totalDias: dias,
        lesiones: lesionesJugador.length,
      }
    })
  }, [jugadoresFiltrados, registros, lesiones, periodo, fechaRef, dias])

  function exportarCSV() {
    let cabeceras, filasCSV
    if (periodo === 'diario') {
      cabeceras = ['Jugador', 'Equipo', 'Registrado', 'RPE', 'Duración (min)', 'Carga', 'ACWR', 'Monotonía', 'Malestar', 'Bienestar', 'Lesiones']
      filasCSV = filas.map((f) => [
        f.nombre, f.equipo, f.registrado ? 'Sí' : 'No', f.rpe ?? '', f.duracion ?? '', f.carga ?? '',
        f.acwr?.toFixed(2) ?? '', f.monotonia?.toFixed(2) ?? '', f.malestar?.toFixed(2) ?? '',
        traducirBienestar(f.nivelBienestar), f.lesiones,
      ])
    } else {
      cabeceras = ['Jugador', 'Equipo', `Carga total (${dias}d)`, 'Carga crónica', 'ACWR Pre', 'ACWR Post', 'Cambio periodo', 'Monotonía', 'Fatiga', 'Malestar medio', 'Bienestar', 'Días registrados', 'Lesiones']
      filasCSV = filas.map((f) => [
        f.nombre, f.equipo, f.cargaTotal, f.cargaCronica?.toFixed(1) ?? '',
        f.acwrPre?.toFixed(2) ?? '', f.acwrPost?.toFixed(2) ?? '',
        f.cambio !== null ? `${Math.round(f.cambio * 100)}%` : '',
        f.monotonia?.toFixed(2) ?? '', f.fatiga?.toFixed(0) ?? '', f.malestarMedio?.toFixed(2) ?? '',
        traducirBienestar(f.nivelBienestar), `${f.diasRegistrados}/${f.totalDias}`, f.lesiones,
      ])
    }

    const csv = [cabeceras, ...filasCSV]
      .map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `informe_${periodo}_${fechaRef}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (cargando) return <p className="mono texto-dim">Cargando datos…</p>

  return (
    <div className="informes-layout">
      <div className="informes-controles no-imprimir">
        <div className="informes-selector-periodo">
          {periodos.map((p) => (
            <button
              key={p.valor}
              className={`periodo-btn ${periodo === p.valor ? 'periodo-activo' : ''}`}
              onClick={() => setPeriodo(p.valor)}
            >
              {p.etiqueta}
            </button>
          ))}
        </div>
        <label className="informes-fecha">
          <span>Fecha de referencia</span>
          <input type="date" value={fechaRef} onChange={(e) => setFechaRef(e.target.value)} />
        </label>
        <div className="informes-acciones">
          <button className="btn-exportar" onClick={exportarCSV}>Exportar CSV</button>
          <button className="btn-exportar" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        </div>
      </div>

      <section className="informe-card">
        <div className="informe-cabecera">
          <h2>
            Informe {periodo} — {periodo === 'diario' ? fechaRef : `hasta ${fechaRef} (${dias} días)`}
          </h2>
          <span className="mono texto-dim">
            {equipoActivo === 'todos' ? 'Todos los equipos' : equipoActivo === 'sin_asignar' ? 'Sin asignar' : jugadoresFiltrados[0]?.equipos?.nombre || ''}
          </span>
        </div>

        <div className="tabla-scroll">
          {periodo === 'diario' ? (
            <table className="informe-tabla">
              <thead>
                <tr>
                  <th>Jugador</th><th>Equipo</th><th>Registró</th><th>RPE</th><th>Min</th>
                  <th>Carga</th><th>ACWR</th><th>Monotonía</th><th>Bienestar</th><th>Lesiones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i}>
                    <td>{f.nombre}</td>
                    <td className="texto-dim">{f.equipo}</td>
                    <td>{f.registrado ? '✓' : '—'}</td>
                    <td className="mono">{f.rpe ?? '—'}</td>
                    <td className="mono">{f.duracion ?? '—'}</td>
                    <td className="mono">{f.carga ?? '—'}</td>
                    <td className="mono">{f.acwr !== null ? f.acwr.toFixed(2) : '—'}</td>
                    <td className="mono">{f.monotonia !== null ? f.monotonia.toFixed(2) : '—'}</td>
                    <td><span className={`bienestar-badge bienestar-${f.nivelBienestar}`}>{traducirBienestar(f.nivelBienestar)}</span></td>
                    <td className="mono">{f.lesiones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <table className="informe-tabla">
              <thead>
                <tr>
                  <th>Jugador</th><th>Equipo</th><th>Carga total</th><th>Carga crónica</th>
                  <th>ACWR Pre</th><th>ACWR Post</th><th>Cambio</th><th>Monotonía</th><th>Fatiga</th>
                  <th>Bienestar</th><th>Registros</th><th>Lesiones</th>
                </tr>
              </thead>
              <tbody>
                {filas.map((f, i) => (
                  <tr key={i}>
                    <td>{f.nombre}</td>
                    <td className="texto-dim">{f.equipo}</td>
                    <td className="mono">{f.cargaTotal}</td>
                    <td className="mono">{f.cargaCronica ? f.cargaCronica.toFixed(0) : '—'}</td>
                    <td className="mono">{f.acwrPre !== null ? f.acwrPre.toFixed(2) : '—'}</td>
                    <td className="mono">{f.acwrPost !== null ? f.acwrPost.toFixed(2) : '—'}</td>
                    <td className="mono">{f.cambio !== null ? `${f.cambio > 0 ? '+' : ''}${Math.round(f.cambio * 100)}%` : '—'}</td>
                    <td className="mono">{f.monotonia !== null ? f.monotonia.toFixed(2) : '—'}</td>
                    <td className="mono">{f.fatiga ? Math.round(f.fatiga) : '—'}</td>
                    <td><span className={`bienestar-badge bienestar-${f.nivelBienestar}`}>{traducirBienestar(f.nivelBienestar)}</span></td>
                    <td className="mono">{f.diasRegistrados}/{f.totalDias}</td>
                    <td className="mono">{f.lesiones}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        {filas.length === 0 && <p className="texto-dim">No hay jugadores en este grupo.</p>}
      </section>
    </div>
  )
}
