import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CalendarioEntrenador from './CalendarioEntrenador'
import './SesionDia.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

const opcionesMDx = ['MD', 'MD+1', 'MD+2', 'MD+/-3', 'MD-2', 'MD-1']
const opcionesTipoSesion = ['Pista', 'Gimnasio', 'Recuperación']

function formatearFechaLarga(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

export default function SesionDia({ equipoActivo = 'todos' }) {
  const [fecha, setFecha] = useState(hoyISO())
  const [modoAsignacion, setModoAsignacion] = useState('grupo') // 'grupo' | 'individual'
  const [jugadores, setJugadores] = useState([])
  const [sesionesDelDia, setSesionesDelDia] = useState({}) // jugador_id -> fila de sesiones

  const [duracionGrupo, setDuracionGrupo] = useState(60)
  const [duracionesIndividuales, setDuracionesIndividuales] = useState({}) // jugador_id -> string
  const [microciclo, setMicrociclo] = useState('')
  const [mdx, setMdx] = useState('')
  const [tipoSesion, setTipoSesion] = useState('')
  const [contenido, setContenido] = useState('')

  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [recargarCalendario, setRecargarCalendario] = useState(0)

  useEffect(() => { cargarJugadoresYSesion() }, [fecha, equipoActivo])

  async function cargarJugadoresYSesion() {
    setCargandoSesion(true)
    setMensaje(null)

    const { data: perfiles } = await supabase.from('perfiles').select('id, nombre, equipo_id').eq('rol', 'jugador').order('nombre')
    const filtrados = (perfiles || []).filter((j) => {
      if (equipoActivo === 'todos') return true
      if (equipoActivo === 'sin_asignar') return !j.equipo_id
      return j.equipo_id === equipoActivo
    })
    setJugadores(filtrados)

    const ids = filtrados.map((j) => j.id)
    const { data: sesionesData } = ids.length > 0
      ? await supabase.from('sesiones').select('*').eq('fecha', fecha).in('jugador_id', ids)
      : { data: [] }

    const mapa = {}
    ;(sesionesData || []).forEach((s) => { mapa[s.jugador_id] = s })
    setSesionesDelDia(mapa)

    const primeraSesion = Object.values(mapa)[0]
    setDuracionGrupo(primeraSesion ? primeraSesion.duracion_min : 60)
    setMicrociclo(primeraSesion?.microciclo || '')
    setMdx(primeraSesion?.mdx || '')
    setTipoSesion(primeraSesion?.tipo_sesion || '')
    setContenido(primeraSesion?.contenido || '')

    const indivInicial = {}
    filtrados.forEach((j) => { indivInicial[j.id] = mapa[j.id] ? String(mapa[j.id].duracion_min) : '' })
    setDuracionesIndividuales(indivInicial)

    setCargandoSesion(false)
  }

  function seleccionarDiaCalendario(nuevaFecha) {
    setFecha(nuevaFecha)
  }

  async function guardarGrupo(e) {
    e.preventDefault()
    if (jugadores.length === 0) return
    setGuardando(true)
    setMensaje(null)

    const filas = jugadores.map((j) => ({
      fecha, jugador_id: j.id, duracion_min: duracionGrupo,
      microciclo: microciclo || null, mdx: mdx || null,
      tipo_sesion: tipoSesion || null, contenido: contenido || null,
    }))
    const { error } = await supabase.from('sesiones').upsert(filas, { onConflict: 'fecha,jugador_id' })

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar la sesión.' })
    } else {
      setMensaje({ tipo: 'ok', texto: `Sesión guardada para ${jugadores.length} jugador(es).` })
      cargarJugadoresYSesion()
      setRecargarCalendario((n) => n + 1)
    }
    setGuardando(false)
  }

  async function guardarIndividual(e) {
    e.preventDefault()
    const filas = jugadores
      .filter((j) => duracionesIndividuales[j.id] !== '' && duracionesIndividuales[j.id] != null)
      .map((j) => ({
        fecha, jugador_id: j.id, duracion_min: Number(duracionesIndividuales[j.id]),
        microciclo: microciclo || null, mdx: mdx || null,
        tipo_sesion: tipoSesion || null, contenido: contenido || null,
      }))

    if (filas.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Introduce al menos una duración.' })
      return
    }

    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase.from('sesiones').upsert(filas, { onConflict: 'fecha,jugador_id' })

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar la sesión.' })
    } else {
      setMensaje({ tipo: 'ok', texto: `Sesión guardada para ${filas.length} jugador(es).` })
      cargarJugadoresYSesion()
      setRecargarCalendario((n) => n + 1)
    }
    setGuardando(false)
  }

  async function eliminarSesionJugador(jugadorId) {
    setGuardando(true)
    const { error } = await supabase.from('sesiones').delete().eq('fecha', fecha).eq('jugador_id', jugadorId)
    if (!error) {
      cargarJugadoresYSesion()
      setRecargarCalendario((n) => n + 1)
    }
    setGuardando(false)
  }

  async function eliminarSesionGrupo() {
    if (!window.confirm(`¿Eliminar la sesión de este día para los ${jugadores.length} jugadores del grupo activo?`)) return
    setGuardando(true)
    const ids = jugadores.map((j) => j.id)
    const { error } = await supabase.from('sesiones').delete().eq('fecha', fecha).in('jugador_id', ids)
    if (!error) {
      setMensaje({ tipo: 'ok', texto: 'Sesión eliminada.' })
      cargarJugadoresYSesion()
      setRecargarCalendario((n) => n + 1)
    }
    setGuardando(false)
  }

  const jugadoresConSesion = jugadores.filter((j) => sesionesDelDia[j.id]).length

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
        <p className="sesion-sub">
          {jugadoresConSesion > 0
            ? `${jugadoresConSesion} de ${jugadores.length} jugador(es) del grupo activo ya tienen sesión guardada este día.`
            : `Ningún jugador del grupo activo tiene sesión guardada este día todavía.`}
          {tipoSesion && <span className="tipo-sesion-badge"> · {tipoSesion}</span>}
        </p>

        <div className="informe-modo">
          <button
            className={`periodo-btn ${modoAsignacion === 'grupo' ? 'periodo-activo' : ''}`}
            onClick={() => setModoAsignacion('grupo')}
          >
            Todo el grupo
          </button>
          <button
            className={`periodo-btn ${modoAsignacion === 'individual' ? 'periodo-activo' : ''}`}
            onClick={() => setModoAsignacion('individual')}
          >
            Por jugador
          </button>
        </div>

        {cargandoSesion ? (
          <p className="mono texto-dim">Cargando…</p>
        ) : jugadores.length === 0 ? (
          <p className="texto-dim">No hay jugadores en el grupo activo.</p>
        ) : modoAsignacion === 'grupo' ? (
          <form onSubmit={guardarGrupo}>
            <label className="campo-sesion">
              <span>Duración (minutos) — se aplica a los {jugadores.length} jugadores del grupo activo</span>
              <input
                type="number" min="0" max="300" value={duracionGrupo}
                onChange={(e) => setDuracionGrupo(Number(e.target.value))}
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

            <label className="campo-sesion">
              <span>Lugar / tipo de trabajo</span>
              <select value={tipoSesion} onChange={(e) => setTipoSesion(e.target.value)}>
                <option value="">Sin especificar</option>
                {opcionesTipoSesion.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </label>

            <label className="campo-sesion">
              <span>Contenido de la sesión (solo lo ves tú)</span>
              <textarea
                value={contenido} onChange={(e) => setContenido(e.target.value)}
                rows={4} placeholder="Ej. Series de velocidad 6x30m, fuerza tren inferior, técnica de carrera…"
              />
            </label>

            {mensaje && (
              <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>
            )}

            <button type="submit" className="btn-principal" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar para todo el grupo'}
            </button>
            {jugadoresConSesion > 0 && (
              <button type="button" className="btn-eliminar-sesion" onClick={eliminarSesionGrupo} disabled={guardando}>
                Eliminar sesión del grupo
              </button>
            )}
          </form>
        ) : (
          <form onSubmit={guardarIndividual}>
            <div className="fila-doble">
              <label className="campo-sesion">
                <span>Microciclo (opcional, se aplica a quien rellenes)</span>
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

            <label className="campo-sesion">
              <span>Lugar / tipo de trabajo</span>
              <select value={tipoSesion} onChange={(e) => setTipoSesion(e.target.value)}>
                <option value="">Sin especificar</option>
                {opcionesTipoSesion.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </label>

            <label className="campo-sesion">
              <span>Contenido de la sesión (solo lo ves tú)</span>
              <textarea
                value={contenido} onChange={(e) => setContenido(e.target.value)}
                rows={4} placeholder="Ej. Series de velocidad 6x30m, fuerza tren inferior, técnica de carrera…"
              />
            </label>

            <div className="duraciones-individuales">
              {jugadores.map((j) => (
                <div className="duracion-individual-fila" key={j.id}>
                  <span className="duracion-individual-nombre">{j.nombre}</span>
                  <input
                    type="number" min="0" max="300" placeholder="—"
                    value={duracionesIndividuales[j.id] ?? ''}
                    onChange={(e) => setDuracionesIndividuales({ ...duracionesIndividuales, [j.id]: e.target.value })}
                  />
                  <span className="duracion-individual-min">min</span>
                  {sesionesDelDia[j.id] && (
                    <button
                      type="button" className="btn-eliminar-fila" title="Eliminar sesión de este jugador"
                      onClick={() => eliminarSesionJugador(j.id)} disabled={guardando}
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {mensaje && (
              <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>
            )}

            <button type="submit" className="btn-principal" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Guardar duraciones individuales'}
            </button>
          </form>
        )}
      </section>
    </div>
  )
}
