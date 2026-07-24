import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './SesionDia.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

export default function SesionDia() {
  const [fecha, setFecha] = useState(hoyISO())
  const [duracion, setDuracion] = useState(60)
  const [microciclo, setMicrociclo] = useState('')
  const [mdx, setMdx] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [sesiones, setSesiones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarSesiones() }, [])

  useEffect(() => {
    // Si ya existe una sesión guardada para la fecha elegida, precarga sus valores.
    const existente = sesiones.find((s) => s.fecha === fecha)
    if (existente) {
      setDuracion(existente.duracion_min)
      setMicrociclo(existente.microciclo || '')
      setMdx(existente.mdx || '')
    } else {
      setMicrociclo('')
      setMdx('')
    }
  }, [fecha, sesiones])

  async function cargarSesiones() {
    setCargando(true)
    const { data } = await supabase
      .from('sesiones')
      .select('*')
      .order('fecha', { ascending: false })
      .limit(14)
    setSesiones(data || [])
    setCargando(false)
  }

  async function manejarEnvio(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)

    const { error } = await supabase.from('sesiones').upsert({
      fecha,
      duracion_min: duracion,
      microciclo: microciclo || null,
      mdx: mdx || null,
    }, { onConflict: 'fecha' })

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar la sesión.' })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Duración guardada. Se ha aplicado a todos los registros de esa fecha.' })
      cargarSesiones()
    }
    setGuardando(false)
  }

  return (
    <div className="sesion-layout">
      <section className="sesion-form-card">
        <h2>Duración de la sesión</h2>
        <p className="sesion-sub">
          Esta duración se aplica automáticamente a todos los jugadores que registren
          su RPE ese día — no hace falta que la introduzcan ellos.
        </p>

        <form onSubmit={manejarEnvio}>
          <label className="campo-sesion">
            <span>Fecha</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} required />
          </label>

          <label className="campo-sesion">
            <span>Duración (minutos)</span>
            <input
              type="number" min="0" max="300" value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value))}
              required
            />
          </label>

          <div className="fila-doble">
            <label className="campo-sesion">
              <span>Microciclo (opcional)</span>
              <input
                type="text" value={microciclo} onChange={(e) => setMicrociclo(e.target.value)}
                placeholder="Ej. Largo 7, Corto 2"
              />
            </label>
            <label className="campo-sesion">
              <span>MDx (opcional)</span>
              <input
                type="text" value={mdx} onChange={(e) => setMdx(e.target.value)}
                placeholder="Ej. MD-3, MD, MD+1"
              />
            </label>
          </div>

          {mensaje && (
            <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>
          )}

          <button type="submit" className="btn-principal" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar duración'}
          </button>
        </form>
      </section>

      <section className="sesion-historial-card">
        <h3>Últimas sesiones</h3>
        {cargando ? (
          <p className="mono texto-dim">Cargando…</p>
        ) : sesiones.length === 0 ? (
          <p className="texto-dim">Todavía no has fijado ninguna duración.</p>
        ) : (
          <table className="sesion-tabla">
            <thead>
              <tr><th>Fecha</th><th>Duración</th><th>Microciclo</th><th>MDx</th></tr>
            </thead>
            <tbody>
              {sesiones.map((s) => (
                <tr key={s.id}>
                  <td className="mono">{s.fecha}</td>
                  <td className="mono">{s.duracion_min} min</td>
                  <td>{s.microciclo || '—'}</td>
                  <td>{s.mdx || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}
