import { useEffect, useMemo, useState } from 'react'
import {
  ResponsiveContainer, ScatterChart, Scatter, XAxis, YAxis, ZAxis,
  CartesianGrid, Tooltip, ReferenceLine, Cell,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { valorRelativo, indiceFatiga, tiposTest, traducirTipoTest, ultimosTestsPorTipo } from '../lib/testsFisicos'
import './Tests.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

const formularioVacio = {
  jugador_id: '', tipo_test: 'sentadilla', fecha: hoyISO(), peso_corporal_kg: '',
  valor_kg: '', valor_cm: '', rsi_modificado: '', dri: '',
  pp1: '', mp1: '', pp2: '', mp2: '', notas: '',
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
  const datosCuadrante1 = useMemo(() => {
    return jugadoresFiltrados.map((j) => {
      const suyos = testsFiltrados.filter((t) => t.jugador_id === j.id)
      const porTipo = ultimosTestsPorTipo(suyos)
      const cmj = porTipo.cmj?.valor_cm
      const sentadilla = porTipo.sentadilla
      const pesoSentadilla = sentadilla?.peso_corporal_kg || j.peso_corporal_kg
      const sentadillaRelativa = sentadilla ? valorRelativo(sentadilla.valor_kg, pesoSentadilla) : null
      if (cmj === undefined || cmj === null || sentadillaRelativa === null) return null
      return {
        nombre: j.nombre, x: Number(sentadillaRelativa.toFixed(2)), y: Number(cmj),
        color: j.equipos?.color || '#c8ff4d',
      }
    }).filter(Boolean)
  }, [jugadoresFiltrados, testsFiltrados])

  // --- Cuadrante 2: Potencia W/kg (y) vs Índice de fatiga % (x) ---
  const datosCuadrante2 = useMemo(() => {
    return jugadoresFiltrados.map((j) => {
      const suyos = testsFiltrados.filter((t) => t.jugador_id === j.id)
      const porTipo = ultimosTestsPorTipo(suyos)
      const wingate = porTipo.wingate
      if (!wingate) return null
      const peso = wingate.peso_corporal_kg || j.peso_corporal_kg
      const potencia = valorRelativo(wingate.pp1, peso)
      const fatiga = wingate.indice_fatiga ?? indiceFatiga(wingate.mp1, wingate.mp2)
      if (potencia === null || fatiga === null || fatiga === undefined) return null
      return {
        nombre: j.nombre, x: Number(fatiga.toFixed(1)), y: Number(potencia.toFixed(2)),
        color: j.equipos?.color || '#c8ff4d',
      }
    }).filter(Boolean)
  }, [jugadoresFiltrados, testsFiltrados])

  const maxX1 = Math.max(3, ...datosCuadrante1.map((d) => d.x), 2.2)
  const maxY1 = Math.max(60, ...datosCuadrante1.map((d) => d.y), 44)
  const maxX2 = Math.max(35, ...datosCuadrante2.map((d) => d.x), 22)
  const maxY2 = Math.max(20, ...datosCuadrante2.map((d) => d.y), 11)

  if (cargando) return <p className="mono texto-dim">Cargando tests…</p>

  return (
    <div className="tests-layout">
      <section className="test-form-card">
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
                </div>
              )}
              {form.pp1 && form.peso_corporal_kg && (
                <div className="preview-test mono">
                  Potencia (PP1): <strong>{(Number(form.pp1) / Number(form.peso_corporal_kg)).toFixed(2)}</strong> W/kg
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

      <div className="tests-columna-derecha">
        <section className="cuadrante-card">
          <h3>Fuerza-salto: CMJ vs. Sentadilla relativa</h3>
          <p className="cuadrante-sub">Eje Y: CMJ (cm), dividido en 40 cm · Eje X: Sentadilla (kg/peso corporal), dividido en 2.0×</p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis type="number" dataKey="x" name="Sentadilla relativa" domain={[0, maxX1]} stroke="var(--text-faint)" fontSize={12} />
              <YAxis type="number" dataKey="y" name="CMJ" domain={[0, maxY1]} stroke="var(--text-faint)" fontSize={12} />
              <ZAxis range={[80, 80]} />
              <ReferenceLine x={2.0} stroke="var(--text-faint)" strokeDasharray="4 4" />
              <ReferenceLine y={40} stroke="var(--text-faint)" strokeDasharray="4 4" />
              <Tooltip content={<TooltipCuadrante etiquetaX="Sentadilla rel." etiquetaY="CMJ (cm)" />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={datosCuadrante1}>
                {datosCuadrante1.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          {datosCuadrante1.length === 0 && <p className="texto-dim cuadrante-vacio">Necesitas al menos un test de CMJ y de Sentadilla por jugador.</p>}
        </section>

        <section className="cuadrante-card">
          <h3>Potencia vs. capacidad de repetirla (Wingate)</h3>
          <p className="cuadrante-sub">
            Eje Y: Potencia (PP1 en W/kg), dividido en 10 W/kg · Eje X: Índice de fatiga (%), dividido en 20% —
            eje invertido: más a la derecha = menor fatiga = mejor capacidad de repetir potencia
          </p>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
              <XAxis type="number" dataKey="x" name="Índice de fatiga" domain={[0, maxX2]} reversed stroke="var(--text-faint)" fontSize={12} />
              <YAxis type="number" dataKey="y" name="Potencia" domain={[0, maxY2]} stroke="var(--text-faint)" fontSize={12} />
              <ZAxis range={[80, 80]} />
              <ReferenceLine x={20} stroke="var(--text-faint)" strokeDasharray="4 4" />
              <ReferenceLine y={10} stroke="var(--text-faint)" strokeDasharray="4 4" />
              <Tooltip content={<TooltipCuadrante etiquetaX="Índice fatiga (%)" etiquetaY="Potencia (W/kg)" />} cursor={{ strokeDasharray: '3 3' }} />
              <Scatter data={datosCuadrante2}>
                {datosCuadrante2.map((d, i) => <Cell key={i} fill={d.color} />)}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
          {datosCuadrante2.length === 0 && <p className="texto-dim cuadrante-vacio">Necesitas al menos un test de Doble Wingate por jugador.</p>}
        </section>
      </div>

      <section className="tests-historial-card">
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
