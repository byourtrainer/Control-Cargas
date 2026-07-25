import { useEffect, useRef, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import PlayerForm from './pages/PlayerForm'
import CoachDashboard from './pages/CoachDashboard'
import SesionDia from './pages/SesionDia'
import Lesiones from './pages/Lesiones'
import Equipos from './pages/Equipos'
import Informes from './pages/Informes'
import Jugadores from './pages/Jugadores'
import Tests from './pages/Tests'
import './App.css'

const pestanasEntrenador = [
  { clave: 'resumen', etiqueta: 'Resumen' },
  { clave: 'jugadores', etiqueta: 'Jugadores' },
  { clave: 'tests', etiqueta: 'Tests' },
  { clave: 'equipos', etiqueta: 'Equipos' },
  { clave: 'sesion', etiqueta: 'Sesión del día' },
  { clave: 'lesiones', etiqueta: 'Lesiones' },
  { clave: 'informes', etiqueta: 'Informes' },
]

export default function App() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [pestana, setPestana] = useState('resumen')
  const [equipos, setEquipos] = useState([])
  const [equipoActivo, setEquipoActivo] = useState('todos')
  const [menuAbierto, setMenuAbierto] = useState(false)
  const menuRef = useRef(null)

  useEffect(() => {
    function alClicarFuera(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuAbierto(false)
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
    if (perfil?.rol === 'entrenador') cargarEquipos()
  }, [perfil])

  async function cargarEquipos() {
    const { data } = await supabase.from('equipos').select('*').order('nombre')
    setEquipos(data || [])
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

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="marca">
          <span className="marca-punto" />
          <h1>CONTROL DE CARGAS</h1>
        </div>
        <div className="usuario-actual">
          {perfil.rol === 'entrenador' && (
            <span className="equipo-activo-badge mono">
              {equipoActivo === 'todos' ? 'Todos los equipos'
                : equipoActivo === 'sin_asignar' ? 'Sin asignar'
                : equipos.find((e) => e.id === equipoActivo)?.nombre || '…'}
            </span>
          )}
          <span className="usuario-nombre">{perfil.nombre}</span>
          <span className={`rol-badge rol-${perfil.rol}`}>{perfil.rol}</span>
          <button className="btn-salir" onClick={cerrarSesion}>Salir</button>
        </div>
      </header>

      {perfil.rol === 'entrenador' && (
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
      )}

      <main className="contenido">
        {perfil.rol === 'entrenador' ? (
          pestana === 'sesion' ? <SesionDia equipoActivo={equipoActivo} />
          : pestana === 'lesiones' ? <Lesiones equipos={equipos} equipoActivo={equipoActivo} />
          : pestana === 'informes' ? <Informes equipoActivo={equipoActivo} />
          : pestana === 'jugadores' ? <Jugadores equipoActivo={equipoActivo} />
          : pestana === 'tests' ? <Tests equipoActivo={equipoActivo} />
          : pestana === 'equipos' ? (
            <Equipos
              equipos={equipos}
              equipoActivo={equipoActivo}
              onCambiarEquipoActivo={setEquipoActivo}
              onEquiposActualizados={cargarEquipos}
            />
          )
          : <CoachDashboard equipoActivo={equipoActivo} />
        ) : (
          <PlayerForm perfil={perfil} />
        )}
      </main>
    </div>
  )
}
