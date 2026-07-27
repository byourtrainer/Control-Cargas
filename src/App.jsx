import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import PlayerForm from './pages/PlayerForm'
import CoachDashboard from './pages/CoachDashboard'
import SesionDia from './pages/SesionDia'
import Lesiones from './pages/Lesiones'
import Equipos from './pages/Equipos'
import Jugadores from './pages/Jugadores'
import Tests from './pages/Tests'
import Referencias from './pages/Referencias'
import './App.css'

const pestanasEntrenador = [
  { clave: 'equipos', etiqueta: 'Equipos' },
  { clave: 'resumen', etiqueta: 'Resumen' },
  { clave: 'jugadores', etiqueta: 'Jugadores' },
  { clave: 'sesion', etiqueta: 'Planificación' },
  { clave: 'tests', etiqueta: 'Tests' },
  { clave: 'lesiones', etiqueta: 'Lesiones' },
  { clave: 'referencias', etiqueta: 'Referencias' },
]

const diasAtras = (n) => {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return d.toISOString().slice(0, 10)
}

export default function App() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [pestana, setPestana] = useState('resumen')
  const [equipos, setEquipos] = useState([])
  const [equipoActivo, setEquipoActivo] = useState('todos')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)

  // --- Contexto único: jugador + rango de fechas, compartido entre pestañas ---
  const [jugadoresContexto, setJugadoresContexto] = useState([])
  const [jugadorActivo, setJugadorActivo] = useState('equipo')
  const [fechaDesde, setFechaDesde] = useState(diasAtras(20))
  const [fechaHasta, setFechaHasta] = useState(diasAtras(0))
  const [contextoAbierto, setContextoAbierto] = useState(false)
  const contextoRef = useRef(null)

  useEffect(() => {
    function alClicarFuera(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false)
      if (contextoRef.current && !contextoRef.current.contains(e.target)) setContextoAbierto(false)
    }
    document.addEventListener('mousedown', alClicarFuera)
    return () => document.removeEventListener('mousedown', alClicarFuera)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (!session) setCargando(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (!session) {
        setPerfil(null)
        setCargando(false)
      }
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!session) return
    let activo = true
    setCargando(true)
    supabase
      .from('perfiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
      .then(({ data, error }) => {
        if (!activo) return
        if (error) console.error('Error cargando perfil:', error)
        setPerfil(data)
        setCargando(false)
      })
    return () => { activo = false }
  }, [session])

  useEffect(() => {
    if (perfil?.rol === 'entrenador') { cargarEquipos(); cargarJugadoresContexto() }
  }, [perfil])

  async function cargarEquipos() {
    const { data } = await supabase.from('equipos').select('*').order('nombre')
    setEquipos(data || [])
  }

  async function cargarJugadoresContexto() {
    const { data } = await supabase.from('perfiles').select('id, nombre, equipo_id').eq('rol', 'jugador').order('nombre')
    setJugadoresContexto(data || [])
  }

  function alCambiarEquipoActivo(id) {
    setEquipoActivo(id)
    setJugadorActivo('equipo')
  }

  async function cerrarSesion() {
    await supabase.auth.signOut()
  }

  if (cargando) {
    return (
      <div className="pantalla-carga">
        <div className="pulso mono">CARGANDO</div>
      </div>
    )
  }

  if (!session) {
    return <Login />
  }

  if (!perfil) {
    return (
      <div className="pantalla-carga">
        <div className="mono">No se ha encontrado tu perfil todavía. Prueba a recargar en unos segundos.</div>
      </div>
    )
  }

  const jugadoresParaContexto = jugadoresContexto.filter((j) => {
    if (equipoActivo === 'todos') return true
    if (equipoActivo === 'sin_asignar') return !j.equipo_id
    return j.equipo_id === equipoActivo
  })

  const etiquetaContexto = [
    equipoActivo === 'todos' ? 'Todos los equipos' : equipoActivo === 'sin_asignar' ? 'Sin asignar' : equipos.find((e) => e.id === equipoActivo)?.nombre || '…',
    jugadorActivo !== 'equipo' ? (jugadoresContexto.find((j) => j.id === jugadorActivo)?.nombre || '…') : null,
  ].filter(Boolean).join(' · ')

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="marca">
          <span className="marca-punto" />
          <h1>CONTROL DE CARGAS</h1>
        </div>
        <div className="usuario-actual">
          <span className="usuario-nombre">{perfil.nombre}</span>
          <span className={`rol-badge rol-${perfil.rol}`}>{perfil.rol}</span>
          <button className="btn-salir" onClick={cerrarSesion}>Salir</button>
        </div>
      </header>

      {perfil.rol === 'entrenador' && (
        <>
          <nav className="pestanas-nav" ref={menuRef}>
            <button className="menu-desplegable-boton" onClick={() => setMenuAbierto(!menuAbierto)}>
              <span>{pestanasEntrenador.find((p) => p.clave === pestana)?.etiqueta}</span>
              <span className={`menu-flecha ${menuAbierto ? 'menu-flecha-abierta' : ''}`}>▾</span>
            </button>
            {menuAbierto && (
              <div className="menu-desplegable-lista">
                {pestanasEntrenador.map((p) => (
                  <button
                    key={p.clave}
                    className={`menu-desplegable-item ${pestana === p.clave ? 'menu-desplegable-item-activo' : ''}`}
                    onClick={() => { setPestana(p.clave); setMenuAbierto(false) }}
                  >
                    {p.etiqueta}
                  </button>
                ))}
              </div>
            )}
          </nav>

          <div className="contexto-barra" ref={contextoRef}>
            <button className="contexto-boton" onClick={() => setContextoAbierto(!contextoAbierto)}>
              <span className="contexto-icono">◎</span>
              <span>{etiquetaContexto}</span>
              <span className="mono contexto-fechas">{fechaDesde} → {fechaHasta}</span>
              <span className={`menu-flecha ${contextoAbierto ? 'menu-flecha-abierta' : ''}`}>▾</span>
            </button>

            {contextoAbierto && (
              <div className="contexto-panel">
                <label className="contexto-campo">
                  <span>Equipo</span>
                  <select value={equipoActivo} onChange={(e) => alCambiarEquipoActivo(e.target.value)}>
                    <option value="todos">Todos los equipos</option>
                    {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
                    <option value="sin_asignar">Sin asignar</option>
                  </select>
                </label>
                <label className="contexto-campo">
                  <span>Jugador</span>
                  <select value={jugadorActivo} onChange={(e) => setJugadorActivo(e.target.value)}>
                    <option value="equipo">Todo el grupo</option>
                    {jugadoresParaContexto.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
                  </select>
                </label>
                <div className="contexto-campo-fila">
                  <label className="contexto-campo">
                    <span>Desde</span>
                    <input type="date" value={fechaDesde} max={fechaHasta} onChange={(e) => setFechaDesde(e.target.value)} />
                  </label>
                  <label className="contexto-campo">
                    <span>Hasta</span>
                    <input type="date" value={fechaHasta} min={fechaDesde} max={diasAtras(0)} onChange={(e) => setFechaHasta(e.target.value)} />
                  </label>
                </div>
                <p className="contexto-nota">
                  Este equipo, jugador y rango de fechas se aplican en Resumen y en el mapa corporal de Lesiones.
                </p>
              </div>
            )}
          </div>
        </>
      )}

      <main className="contenido">
        {perfil.rol === 'entrenador' ? (
          pestana === 'sesion' ? <SesionDia equipoActivo={equipoActivo} />
          : pestana === 'lesiones' ? (
            <Lesiones
              equipos={equipos} equipoActivo={equipoActivo}
              jugadorActivo={jugadorActivo} fechaDesde={fechaDesde} fechaHasta={fechaHasta}
            />
          )
          : pestana === 'referencias' ? <Referencias />
          : pestana === 'jugadores' ? <Jugadores equipoActivo={equipoActivo} />
          : pestana === 'tests' ? <Tests equipoActivo={equipoActivo} />
          : pestana === 'equipos' ? (
            <Equipos
              equipos={equipos}
              equipoActivo={equipoActivo}
              onCambiarEquipoActivo={alCambiarEquipoActivo}
              onEquiposActualizados={cargarEquipos}
            />
          )
          : (
            <CoachDashboard
              equipoActivo={equipoActivo} jugadorActivo={jugadorActivo}
              fechaDesde={fechaDesde} fechaHasta={fechaHasta}
            />
          )
        ) : (
          <PlayerForm perfil={perfil} />
        )}
      </main>
    </div>
  )
}
