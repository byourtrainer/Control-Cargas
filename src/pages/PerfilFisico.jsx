import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { valorRelativo, indiceFatiga, ultimosTestsPorTipo } from '../lib/testsFisicos'
import './PerfilFisico.css'

export default function PerfilFisico({ equipoActivo = 'todos' }) {
  const [jugadores, setJugadores] = useState([])
  const [tests, setTests] = useState([])
  const [seleccionados, setSeleccionados] = useState(new Set())
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    setCargando(true)
    const [{ data: perfiles }, { data: testsData }] = await Promise.all([
      supabase.from('perfiles').select('*, equipos(id, nombre, color)').eq('rol', 'jugador').order('nombre'),
      supabase.from('tests_fisicos').select('*'),
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

  // Al cambiar el equipo activo (o cargar por primera vez), selecciona por defecto a todo el grupo filtrado.
  useEffect(() => {
    setSeleccionados(new Set(jugadoresFiltrados.map((j) => j.id)))
  }, [equipoActivo, jugadores])

  function alternarSeleccion(id) {
    setSeleccionados((prev) => {
      const siguiente = new Set(prev)
      if (siguiente.has(id)) siguiente.delete(id)
      else siguiente.add(id)
      return siguiente
    })
  }

  const filas = useMemo(() => {
    return jugadoresFiltrados
      .filter((j) => seleccionados.has(j.id))
      .map((j) => {
        const suyos = tests.filter((t) => t.jugador_id === j.id)
        const porTipo = ultimosTestsPorTipo(suyos)
        const peso = j.peso_corporal_kg

        const sentadilla = porTipo.sentadilla
        const isoSq = porTipo.iso_sq
        const cmj = porTipo.cmj
        const sj = porTipo.sj
        const dropJump = porTipo.drop_jump
        const wingate = porTipo.wingate

        return {
          nombre: j.nombre,
          equipo: j.equipos?.nombre || '—',
          peso: peso || null,
          altura: j.altura_m || null,
          sentadillaKg: sentadilla?.valor_kg ?? null,
          sentadillaRel: sentadilla ? valorRelativo(sentadilla.valor_kg, sentadilla.peso_corporal_kg || peso) : null,
          isoSqKg: isoSq?.valor_kg ?? null,
          isoSqRel: isoSq ? valorRelativo(isoSq.valor_kg, isoSq.peso_corporal_kg || peso) : null,
          cmjCm: cmj?.valor_cm ?? null,
          cmjRsi: cmj?.rsi_modificado ?? null,
          sjCm: sj?.valor_cm ?? null,
          dri: dropJump?.dri ?? null,
          wingatePP1: wingate?.pp1 ?? null,
          wingateMP1: wingate?.mp1 ?? null,
          wingatePP2: wingate?.pp2 ?? null,
          wingateMP2: wingate?.mp2 ?? null,
          wingateFatiga: wingate?.indice_fatiga ?? (wingate ? indiceFatiga(wingate.mp1, wingate.mp2) : null),
        }
      })
  }, [jugadoresFiltrados, seleccionados, tests])

  function exportarCSV() {
    const cabeceras = [
      'Jugador', 'Equipo', 'Peso (kg)', 'Altura (m)',
      'Sentadilla (kg)', 'Sentadilla (rel)', 'ISO SQ (kg)', 'ISO SQ (rel)',
      'CMJ (cm)', 'CMJ RSI mod.', 'SJ (cm)', 'DRI',
      'Wingate PP1 (W)', 'Wingate MP1 (W)', 'Wingate PP2 (W)', 'Wingate MP2 (W)', 'Índice fatiga (%)',
    ]
    const filasCSV = filas.map((f) => [
      f.nombre, f.equipo, f.peso ?? '', f.altura ?? '',
      f.sentadillaKg ?? '', f.sentadillaRel?.toFixed(2) ?? '', f.isoSqKg ?? '', f.isoSqRel?.toFixed(2) ?? '',
      f.cmjCm ?? '', f.cmjRsi ?? '', f.sjCm ?? '', f.dri ?? '',
      f.wingatePP1 ?? '', f.wingateMP1 ?? '', f.wingatePP2 ?? '', f.wingateMP2 ?? '', f.wingateFatiga?.toFixed(1) ?? '',
    ])
    const csv = [cabeceras, ...filasCSV]
      .map((fila) => fila.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `perfil_fisico_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  if (cargando) return <p className="mono texto-dim">Cargando…</p>

  return (
    <div className="perfil-fisico-layout">
      <div className="perfil-controles no-imprimir">
        <div className="perfil-seleccion">
          <span className="perfil-seleccion-titulo">Jugadores incluidos ({filas.length}/{jugadoresFiltrados.length})</span>
          <div className="perfil-chips">
            {jugadoresFiltrados.map((j) => (
              <button
                key={j.id}
                className={`perfil-chip ${seleccionados.has(j.id) ? 'perfil-chip-activo' : ''}`}
                onClick={() => alternarSeleccion(j.id)}
              >
                {j.nombre}
              </button>
            ))}
          </div>
        </div>
        <div className="perfil-acciones">
          <button className="btn-exportar" onClick={exportarCSV}>Exportar CSV</button>
          <button className="btn-exportar" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        </div>
      </div>

      <section className="perfil-card">
        <div className="perfil-cabecera">
          <h2>Perfil físico del jugador</h2>
          <span className="mono texto-dim">
            {equipoActivo === 'todos' ? 'Todos los equipos' : equipoActivo === 'sin_asignar' ? 'Sin asignar' : jugadoresFiltrados[0]?.equipo}
          </span>
        </div>

        <div className="tabla-scroll">
          <table className="perfil-tabla">
            <thead>
              <tr>
                <th>Jugador</th><th>Equipo</th><th>Peso</th><th>Altura</th>
                <th>Sentadilla</th><th>ISO SQ</th><th>CMJ</th><th>SJ</th><th>DRI</th>
                <th>Wingate PP1/MP1</th><th>Wingate PP2/MP2</th><th>Índice fatiga</th>
              </tr>
            </thead>
            <tbody>
              {filas.map((f, i) => (
                <tr key={i}>
                  <td>{f.nombre}</td>
                  <td className="texto-dim">{f.equipo}</td>
                  <td className="mono">{f.peso ? `${f.peso} kg` : '—'}</td>
                  <td className="mono">{f.altura ? `${f.altura} m` : '—'}</td>
                  <td className="mono">
                    {f.sentadillaKg !== null ? `${f.sentadillaKg} kg` : '—'}
                    {f.sentadillaRel !== null && <div className="texto-dim">{f.sentadillaRel.toFixed(2)}×</div>}
                  </td>
                  <td className="mono">
                    {f.isoSqKg !== null ? `${f.isoSqKg} kg` : '—'}
                    {f.isoSqRel !== null && <div className="texto-dim">{f.isoSqRel.toFixed(2)}×</div>}
                  </td>
                  <td className="mono">
                    {f.cmjCm !== null ? `${f.cmjCm} cm` : '—'}
                    {f.cmjRsi !== null && <div className="texto-dim">RSI {f.cmjRsi}</div>}
                  </td>
                  <td className="mono">{f.sjCm !== null ? `${f.sjCm} cm` : '—'}</td>
                  <td className="mono">{f.dri ?? '—'}</td>
                  <td className="mono">
                    {f.wingatePP1 !== null ? `${f.wingatePP1} / ${f.wingateMP1} W` : '—'}
                  </td>
                  <td className="mono">
                    {f.wingatePP2 !== null ? `${f.wingatePP2} / ${f.wingateMP2} W` : '—'}
                  </td>
                  <td className="mono">{f.wingateFatiga !== null && f.wingateFatiga !== undefined ? `${f.wingateFatiga.toFixed(1)}%` : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filas.length === 0 && <p className="texto-dim">Selecciona al menos un jugador para generar el informe.</p>}
      </section>
    </div>
  )
}
