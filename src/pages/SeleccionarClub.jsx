import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export default function SeleccionarClub({ perfil, onElegido }) {
  const [clubes, setClubes] = useState([])
  const [clubId, setClubId] = useState('')
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    supabase.from('clubes').select('id, nombre').order('nombre').then(({ data }) => {
      setClubes(data || [])
      setCargando(false)
    })
  }, [])

  async function confirmar(e) {
    e.preventDefault()
    if (!clubId) return
    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase.from('perfiles').update({ club_id: clubId }).eq('id', perfil.id)
    if (error) {
      setMensaje('No se pudo guardar. Inténtalo de nuevo.')
      setGuardando(false)
    } else {
      onElegido(clubId)
    }
  }

  return (
    <div className="pantalla-carga">
      <div className="seleccionar-club-tarjeta">
        <h2>¿A qué club perteneces?</h2>
        <p className="texto-dim">
          Es la primera vez que entras — indica tu club para poder empezar. Una vez elegido, solo
          un administrador podrá cambiarlo si en el futuro cambias de club.
        </p>
        {cargando ? (
          <p className="mono texto-dim">Cargando…</p>
        ) : clubes.length === 0 ? (
          <p className="texto-dim">Todavía no hay ningún club creado — pide a tu administrador que cree uno primero.</p>
        ) : (
          <form onSubmit={confirmar}>
            <select value={clubId} onChange={(e) => setClubId(e.target.value)} required>
              <option value="">Selecciona un club</option>
              {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
            {mensaje && <div className="aviso-error">{mensaje}</div>}
            <button type="submit" className="btn-principal" disabled={guardando}>
              {guardando ? 'Guardando…' : 'Confirmar'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
