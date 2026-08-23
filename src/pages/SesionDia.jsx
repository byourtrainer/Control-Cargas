import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import CalendarioEntrenador from './CalendarioEntrenador'
import './SesionDia.css'

import { hoyISOLocal as hoyISO } from '../lib/fechas'

const opcionesMDx = ['MD', 'MD+1', 'MD+2', 'MD+/-3', 'MD-2', 'MD-1']
const opcionesTipoSesion = ['Pista', 'Gimnasio', 'Recuperación']

function formatearFechaLarga(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Clave interna para agrupar sesiones por tipo dentro del mapa (el tipo puede venir en blanco)
const claveTipo = (tipo) => tipo || '__sin_tipo__'

export default function SesionDia({ equipoActivo = 'todos', fechaInicial }) {
  const [fecha, setFecha] = useState(fechaInicial || hoyISO())
  const [modoAsignacion, setModoAsignacion] = useState('grupo') // 'grupo' | 'individual'
  const [jugadores, setJugadores] = useState([])
  const [sesionesDelDia, setSesionesDelDia] = useState({}) // jugador_id -> { claveTipo: fila }

  const [duracionGrupo, setDuracionGrupo] = useState(60)
  const [duracionesIndividuales, setDuracionesIndividuales] = useState({}) // jugador_id -> string
  const [microciclo, setMicrociclo] = useState('')
  const [mdx, setMdx] = useState('')
  const [tipoSesion, setTipoSesion] = useState('')
  const [contenido, setContenido] = useState('')
  const [editandoContenido, setEditandoContenido] = useState(false)

  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [cargandoSesion, setCargandoSesion] = useState(true)
  const [recargarCalendario, setRecargarCalendario] = useState(0)

  useEffect(() => { cargarJugadoresYSesion() }, [fecha, equipoActivo])

  // Cada vez que cambia el tipo de sesión seleccionado (o se recarga el día),
  // se recalculan los valores de partida a partir de las sesiones YA
  // guardadas de ese tipo concreto — así, si cambias de "Pista" a
  // "Gimnasio", ves los datos de esa sesión en vez de los de la otra.
  useEffect(() => {
    const clave = claveTipo(tipoSesion)
    const filas = jugadores.map((j) => sesionesDelDia[j.id]?.[clave]).filter(Boolean)
    const primera = filas[0]

    setDuracionGrupo(primera ? primera.duracion_min : 60)
    setMicrociclo(primera?.microciclo || '')
    setMdx(primera?.mdx || '')
    setContenido(primera?.contenido || '')
    setEditandoContenido(false)

    const indivInicial = {}
    jugadores.forEach((j) => {
      const fila = sesionesDelDia[j.id]?.[clave]
      indivInicial[j.id] = fila ? String(fila.duracion_min) : ''
    })
    setDuracionesIndividuales(indivInicial)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tipoSesion, sesionesDelDia, jugadores])

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
    ;(sesionesData || []).forEach((s) => {
      if (!mapa[s.jugador_id]) mapa[s.jugador_id] = {}
      mapa[s.jugador_id][claveTipo(s.tipo_sesion)] = s
    })
    setSesionesDelDia(mapa)
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
    const { error } = await supabase.from('sesiones').upsert(filas, { onConflict: 'fecha,jugador_id,tipo_sesion' })

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
    const { error } = await supabase.from('sesiones').upsert(filas, { onConflict: 'fecha,jugador_id,tipo_sesion' })

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
    const { error } = await supabase.from('sesiones').delete()
      .eq('fecha', fecha).eq('jugador_id', jugadorId).eq('tipo_sesion', tipoSesion || null)
    if (!error) {
      cargarJugadoresYSesion()
      setRecargarCalendario((n) => n + 1)
    }
    setGuardando(false)
  }

  async function eliminarSesionGrupo() {
    if (!window.confirm(`¿Eliminar la sesión${tipoSesion ? ` de ${tipoSesion}` : ''} de este día para los ${jugadores.length} jugadores del grupo activo?`)) return
    setGuardando(true)
    const ids = jugadores.map((j) => j.id)
    const { error } = await supabase.from('sesiones').delete()
      .eq('fecha', fecha).in('jugador_id', ids).eq('tipo_sesion', tipoSesion || null)
    if (!error) {
      setMensaje({ tipo: 'ok', texto: 'Sesión eliminada.' })
      cargarJugadoresYSesion()
      setRecargarCalendario((n) => n + 1)
    }
    setGuardando(false)
  }

  const claveActual = claveTipo(tipoSesion)
  const jugadoresConSesion = jugadores.filter((j) => sesionesDelDia[j.id]?.[claveActual]).length
  // Para el aviso "ya hay sesiones guardadas hoy" (de cualquier tipo, para que no se olvide de las otras)
  const tiposGuardadosHoy = [...new Set(
    jugadores.flatMap((j) => Object.values(sesionesDelDia[j.id] || {}).map((s) => s.tipo_sesion || 'Sin tipo'))
  )]

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
            ? `${jugadoresConSesion} de ${jugadores.length} jugador(es) ya tienen sesión${tipoSesion ? ` de ${tipoSesion}` : ''} guardada este día.`
            : `Ningún jugador del grupo activo tiene sesión${tipoSesion ? ` de ${tipoSesion}` : ''} guardada este día todavía.`}
          {tiposGuardadosHoy.length > 0 && (
            <span className="tipo-sesion-badge"> · Ya guardado hoy: {tiposGuardadosHoy.join(', ')}</span>
          )}
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
        ) : (
          <form onSubmit={modoAsignacion === 'grupo' ? guardarGrupo : guardarIndividual}>
            {modoAsignacion === 'grupo' && (
              <label className="campo-sesion">
                <span>Duración (minutos) — se aplica a los {jugadores.length} jugadores del grupo activo</span>
                <input
                  type="number" min="0" max="300" value={duracionGrupo}
                  onChange={(e) => setDuracionGrupo(Number(e.target.value))}
                  required
                />
              </label>
            )}

            <div className="fila-doble">
              <label className="campo-sesion">
                <span>Microciclo (opcional{modoAsignacion === 'individual' ? ', se aplica a quien rellenes' : ''})</span>
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
              <span>Lugar / tipo de trabajo — puedes guardar una sesión distinta por cada tipo el mismo día</span>
              <select value={tipoSesion} onChange={(e) => setTipoSesion(e.target.value)}>
                <option value="">Sin especificar</option>
                {opcionesTipoSesion.map((op) => (
                  <option key={op} value={op}>{op}</option>
                ))}
              </select>
            </label>

            <div className="campo-sesion">
              <span>Contenido de la sesión (solo lo ves tú)</span>
              {contenido && !editandoContenido ? (
                <div className="contenido-sesion-lectura">
                  <p>{contenido}</p>
                  <button type="button" className="equipo-cambiar-link" onClick={() => setEditandoContenido(true)}>
                    ✎ Editar contenido de sesión
                  </button>
                </div>
              ) : (
                <textarea
                  value={contenido} onChange={(e) => setContenido(e.target.value)}
                  rows={4} placeholder="Ej. Series de velocidad 6x30m, fuerza tren inferior, técnica de carrera…"
                />
              )}
            </div>

            {modoAsignacion === 'individual' && (
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
                    {sesionesDelDia[j.id]?.[claveActual] && (
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
            )}

            {mensaje && (
              <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>
            )}

            <button type="submit" className="btn-principal" disabled={guardando}>
              {guardando ? 'Guardando…' : modoAsignacion === 'grupo' ? 'Guardar para todo el grupo' : 'Guardar duraciones individuales'}
            </button>
            {modoAsignacion === 'grupo' && jugadoresConSesion > 0 && (
              <button type="button" className="btn-eliminar-sesion" onClick={eliminarSesionGrupo} disabled={guardando}>
                Eliminar sesión{tipoSesion ? ` de ${tipoSesion}` : ''} del grupo
              </button>
            )}
          </form>
        )}
      </section>
    </div>
  )
}
