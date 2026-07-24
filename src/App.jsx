import { useEffect, useState } from 'react'
import { supabase } from './lib/supabaseClient'
import Login from './pages/Login'
import PlayerForm from './pages/PlayerForm'
import CoachDashboard from './pages/CoachDashboard'
import './App.css'

export default function App() {
  const [session, setSession] = useState(null)
  const [perfil, setPerfil] = useState(null)
  const [cargando, setCargando] = useState(true)

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
          <span className="usuario-nombre">{perfil.nombre}</span>
          <span className={`rol-badge rol-${perfil.rol}`}>{perfil.rol}</span>
          <button className="btn-salir" onClick={cerrarSesion}>Salir</button>
        </div>
      </header>

      <main className="contenido">
        {perfil.rol === 'entrenador'
          ? <CoachDashboard />
          : <PlayerForm perfil={perfil} />}
      </main>
    </div>
  )
}
