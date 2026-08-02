import { useEffect, useState } from 'react'
import {
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts'
import { supabase } from '../lib/supabaseClient'
import {
  valorRelativo, indiceFatiga, ultimosTestsPorTipo,
  interpretarCMJ, interpretarSentadilla, interpretarPotencia, interpretarFatigaWingate,
} from '../lib/testsFisicos'
import {
  calcularDatosCuadrante1, calcularDatosCuadrante2, GraficoCuadrante1, GraficoCuadrante2,
} from './Tests'
import './PerfilDeportivo.css'

const metricas = [
  {
    clave: 'sentadilla', etiqueta: 'Sentadilla (relativa)',
    extraer: (t) => valorRelativo(t.valor_kg, t.peso_corporal_kg), decimales: 2,
  },
  { clave: 'cmj', etiqueta: 'CMJ (cm)', extraer: (t) => t.valor_cm, decimales: 1 },
  {
    clave: 'wingate_potencia', etiqueta: 'Potencia Wingate (W/kg)',
    extraer: (t) => valorRelativo(t.pp1, t.peso_corporal_kg), decimales: 2,
  },
  {
    clave: 'wingate_fatiga', etiqueta: 'Índice de fatiga Wingate (%)',
    extraer: (t) => t.indice_fatiga ?? indiceFatiga(t.mp1, t.mp2), decimales: 1,
  },
]

export default function PerfilDeportivo({ perfil, onVolver }) {
  const [tests, setTests] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarTests() }, [])

  async function cargarTests() {
    setCargando(true)
    const { data } = await supabase
      .from('tests_fisicos')
      .select('*')
      .eq('jugador_id', perfil.id)
      .order('fecha', { ascending: true })
    setTests(data || [])
    setCargando(false)
  }

  if (cargando) return <p className="mono texto-dim">Cargando tu perfil…</p>

  const jugadorComoFila = { id: perfil.id, nombre: perfil.nombre, peso_corporal_kg: perfil.peso_corporal_kg, equipos: null }

  const datosCuadrante1 = calcularDatosCuadrante1([jugadorComoFila], tests)
  const datosCuadrante2 = calcularDatosCuadrante2([jugadorComoFila], tests)

  // --- Trayectoria: recorrido cronológico dentro de cada cuadrante ---
  function construirTrayectoria(tipoX, extraerX, tipoY, extraerY) {
    const testsX = tests.filter((t) => t.tipo_test === tipoX).sort((a, b) => a.fecha.localeCompare(b.fecha))
    const testsY = tests.filter((t) => t.tipo_test === tipoY).sort((a, b) => a.fecha.localeCompare(b.fecha))
    const fechas = [...new Set([...testsX.map((t) => t.fecha), ...testsY.map((t) => t.fecha)])].sort()

    let ultimoX = null, ultimoY = null
    const puntos = []
    fechas.forEach((fecha) => {
      const tX = [...testsX].filter((t) => t.fecha <= fecha).slice(-1)[0]
      const tY = [...testsY].filter((t) => t.fecha <= fecha).slice(-1)[0]
      if (tX) ultimoX = extraerX(tX)
      if (tY) ultimoY = extraerY(tY)
      if (ultimoX !== null && ultimoY !== null && ultimoX !== undefined && ultimoY !== undefined) {
        const anterior = puntos[puntos.length - 1]
        if (!anterior || anterior.x !== ultimoX || anterior.y !== ultimoY) {
          puntos.push({ x: Number(ultimoX.toFixed(2)), y: Number(ultimoY.toFixed(2)), fecha })
        }
      }
    })
    return puntos
  }

  const trayectoria1 = construirTrayectoria(
    'sentadilla', (t) => valorRelativo(t.valor_kg, t.peso_corporal_kg || perfil.peso_corporal_kg),
    'cmj', (t) => t.valor_cm
  )
  const trayectoria2 = construirTrayectoria(
    'wingate', (t) => t.indice_fatiga ?? indiceFatiga(t.mp1, t.mp2),
    'wingate', (t) => valorRelativo(t.pp1, t.peso_corporal_kg || perfil.peso_corporal_kg)
  )

  const maxX1 = Math.max(3, ...datosCuadrante1.map((d) => d.x), ...trayectoria1.map((p) => p.x), 2.2)
  const maxY1 = Math.max(60, ...datosCuadrante1.map((d) => d.y), ...trayectoria1.map((p) => p.y), 44)
  const maxX2 = Math.max(35, ...datosCuadrante2.map((d) => d.x), ...trayectoria2.map((p) => p.x), 22)
  const maxY2 = Math.max(20, ...datosCuadrante2.map((d) => d.y), ...trayectoria2.map((p) => p.y), 11)

  // --- Interpretación automática del último resultado ---
  const porTipo = ultimosTestsPorTipo(tests)
  const frases = []
  if (porTipo.sentadilla) {
    const rel = valorRelativo(porTipo.sentadilla.valor_kg, porTipo.sentadilla.peso_corporal_kg || perfil.peso_corporal_kg)
    if (rel !== null) frases.push(`Sentadilla: ${interpretarSentadilla(rel)} (${rel.toFixed(2)}×)`)
  }
  if (porTipo.cmj?.valor_cm !== null && porTipo.cmj?.valor_cm !== undefined) {
    frases.push(`CMJ: ${interpretarCMJ(porTipo.cmj.valor_cm)} (${porTipo.cmj.valor_cm} cm)`)
  }
  if (porTipo.wingate) {
    const pot = valorRelativo(porTipo.wingate.pp1, porTipo.wingate.peso_corporal_kg || perfil.peso_corporal_kg)
    const fat = porTipo.wingate.indice_fatiga ?? indiceFatiga(porTipo.wingate.mp1, porTipo.wingate.mp2)
    if (pot !== null) frases.push(`Potencia: ${interpretarPotencia(pot)} (${pot.toFixed(2)} W/kg)`)
    if (fat !== null && fat !== undefined) frases.push(`Repetición de esfuerzo: ${interpretarFatigaWingate(fat)} (${fat.toFixed(1)}%)`)
  }

  function serieMetrica(m) {
    return tests
      .filter((t) => (m.clave === 'sentadilla' && t.tipo_test === 'sentadilla')
        || (m.clave === 'cmj' && t.tipo_test === 'cmj')
        || (m.clave.startsWith('wingate') && t.tipo_test === 'wingate'))
      .map((t) => {
        const valor = m.extraer(t)
        return valor !== null && valor !== undefined
          ? { fecha: t.fecha.slice(5), valor: Number(valor.toFixed(m.decimales)) }
          : null
      })
      .filter(Boolean)
  }

  const hayTests = tests.length > 0

  return (
    <div className="perfil-deportivo">
      <button className="volver-calendario" onClick={onVolver}>← Volver al calendario</button>

      <h2>Mi Perfil Deportivo</h2>
      <p className="texto-dim perfil-deportivo-sub">
        Resultados de tus tests físicos a lo largo de la temporada.
      </p>

      {!hayTests ? (
        <p className="texto-dim">Todavía no tienes ningún test registrado — tu entrenador los irá añadiendo según los vayáis haciendo.</p>
      ) : (
        <>
          {frases.length > 0 && (
            <section className="perfil-deportivo-card">
              <h3>Tu último resultado</h3>
              <ul className="perfil-deportivo-interpretacion">
                {frases.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </section>
          )}

          <section className="perfil-deportivo-card">
            <h3>Evolución en los cuadrantes</h3>
            <p className="texto-dim perfil-deportivo-nota">
              La línea punteada conecta tus tests en orden cronológico — el punto grande es tu resultado más reciente.
            </p>
            <div className="perfil-deportivo-cuadrantes">
              <div className="cuadrante-card">
                <GraficoCuadrante1 datos={datosCuadrante1} maxX={maxX1} maxY={maxY1} trayectoria={trayectoria1} />
              </div>
              <div className="cuadrante-card">
                <GraficoCuadrante2 datos={datosCuadrante2} maxX={maxX2} maxY={maxY2} trayectoria={trayectoria2} />
              </div>
            </div>
          </section>

          <section className="perfil-deportivo-card">
            <h3>Evolución por variable</h3>
            <div className="perfil-deportivo-graficos-grid">
              {metricas.map((m) => {
                const serie = serieMetrica(m)
                if (serie.length === 0) return null
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
                  </div>
                )
              })}
            </div>
          </section>
        </>
      )}
    </div>
  )
}
