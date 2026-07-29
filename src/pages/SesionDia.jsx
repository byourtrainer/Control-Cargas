import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CalendarioEntrenador from './CalendarioEntrenador'
import './SesionDia.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

const opcionesMDx = ['MD', 'MD+1', 'MD+2', 'MD+/-3', 'MD-2', 'MD-1']

function formatearFechaLarga(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function SesionDia({ equipoActivo = 'todos', equipos = [] }) {
  const [fecha, setFecha] = useState(hoyISO())
  const [duracion, setDuracion] = useState(60)
  const [microciclo, setMicrociclo] = useState('')
  const [mdx, setMdx] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [sesionExistente, setSesionExistente] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [recargarCalendario, setRecargarCalendario] = useState(0)

  const equipoValido = equipoActivo !== 'todos' && equipoActivo !== 'sin_asignar'
  const nombreEquipoActivo = equipos.find((e) => e.id === equipoActivo)?.nombre

  useEffect(() => { if (equipoValido) cargarSesionDelDia() }, [fecha, equipoActivo])

  async function cargarSesionDelDia() {
    setCargandoSesion(true)
    setMensaje(null)
    const { data } = await supabase
      .from('sesiones').select('*')
      .eq('fecha', fecha).eq('equipo_id', equipoActivo)
      .maybeSingle()
    if (data) {
      setSesionExistente(data)
      setDuracion(data.duracion_min)
      setMicrociclo(data.microciclo || '')
      setMdx(data.mdx || '')
    } else {
      setSesionExistente(null)
      setDuracion(60)
      setMicrociclo('')
      setMdx('')
    }
    setCargandoSesion(false)
  }

  function seleccionarDiaCalendario(nuevaFecha) {
    setFecha(nuevaFecha)
  }

  async function manejarEnvio(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)

    const { error } = await supabase.from('sesiones').upsert({
      fecha,
      equipo_id: equipoActivo,
      duracion_min: duracion,
      microciclo: microciclo || null,
      mdx: mdx || null,
    }, { onConflict: 'fecha,equipo_id' })

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar la sesión.' })
    } else {
      setMensaje({ tipo: 'ok', texto: `Sesión guardada para ${nombreEquipoActivo}. Se ha aplicado a sus jugadores en esta fecha.` })
      cargarSesionDelDia()
      setRecargarCalendario((n) => n + 1)
    }
    setGuardando(false)
  }

  async function eliminarSesion() {
    if (!window.confirm(`¿Eliminar la sesión de ${nombreEquipoActivo} de este día?`)) return
    setGuardando(true)
    const { error } = await supabase.from('sesiones').delete().eq('fecha', fecha).eq('equipo_id', equipoActivo)
    if (!error) {
      setMensaje({ tipo: 'ok', texto: 'Sesión eliminada.' })
      cargarSesionDelDia()
      setRecargarCalendario((n) => n + 1)
    } else {
      setMensaje({ tipo: 'error', texto: 'No se pudo eliminar la sesión.' })
    }
    setGuardando(false)
  }

  if (!equipoValido) {
    return (
      <div className="sesion-layout">
        <section className="sesion-form-card sesion-sin-equipo">
          <h2>Selecciona un equipo</h2>
          <p className="sesion-sub">
            Las sesiones se planifican por equipo, ya que no todos entrenan los mismos días.
            Usa el selector <strong>◎</strong> de la cabecera y elige un equipo concreto
            (no "Todos los equipos" ni "Sin asignar") para poder planificar aquí.
          </p>
        </section>
      </div>
    )
  }

  return (
    <div className="sesion-layout">
      <div className="sesion-columna-calendario">
        <CalendarioEntrenador
          key={recargarCalendario}
          equipoActivo={equipoActivo}
          onSeleccionarDia={seleccionarDiaCalendario}
          fechaActiva={fecha}
        />
      </div>

      <section className="sesion-form-card">
        <h2 className="capitalizada">{formatearFechaLarga(fecha)}</h2>
        <p className="sesion-equipo-etiqueta">Planificando para: <strong>{nombreEquipoActivo}</strong></p>
        <p className="sesion-sub">
          {sesionExistente
            ? 'Ya hay una sesión guardada para este equipo en este día — puedes modificarla.'
            : 'Todavía no hay ninguna sesión guardada para este equipo en este día.'}
          {' '}Se aplica automáticamente a los jugadores de este equipo que registren su RPE esta fecha.
        </p>

        {cargandoSesion ? (
          <p className="mono texto-dim">Cargando…</p>
        ) : (
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
                <span>Tipo de sesión (MDx)</span>
                <select value={mdx} onChange={(e) => setMdx(e.target.value)}>
                  <option value="">Sin especificar</option>
                  {opcionesMDx.map((op) => (
                    <option key={op} value={op}>{op}</option>
                  ))}
                </select>
              </label>
            </div>

            {mensaje && (
              <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>
            )}

            <button type="submit" className="btn-principal" disabled={guardando}>
              {guardando ? 'Guardando…' : sesionExistente ? 'Actualizar sesión' : 'Guardar sesión'}
            </button>
            {sesionExistente && (
              <button type="button" className="btn-eliminar-sesion" onClick={eliminarSesion} disabled={guardando}>
                Eliminar sesión
              </button>
            )}
          </form>
        )}
      </section>
    </div>
  )
}
