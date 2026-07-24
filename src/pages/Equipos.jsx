import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Equipos.css'

export default function Equipos({ equipos, equipoActivo, onCambiarEquipoActivo, onEquiposActualizados }) {
  const [nuevoEquipo, setNuevoEquipo] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  async function anadirEquipo(e) {
    e.preventDefault()
    if (!nuevoEquipo.trim()) return
    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase.from('equipos').insert({ nombre: nuevoEquipo.trim() })
    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo crear el equipo (¿ya existe ese nombre?).' })
    } else {
      setNuevoEquipo('')
      onEquiposActualizados()
    }
    setGuardando(false)
  }

  return (
    <div className="equipos-layout">
      <section className="equipos-lista-card">
        <h2>¿Qué equipo quieres ver?</h2>
        <p className="equipos-sub">
          Esta selección se aplica a todo el panel (resumen, gráfico y tabla de jugadores).
        </p>

        <div className="equipos-opciones">
          <button
            className={`equipo-opcion ${equipoActivo === 'todos' ? 'equipo-opcion-activa' : ''}`}
            onClick={() => onCambiarEquipoActivo('todos')}
          >
            <span>Todos los equipos</span>
            {equipoActivo === 'todos' && <span className="check-activo">✓</span>}
          </button>

          {equipos.map((eq) => (
            <button
              key={eq.id}
              className={`equipo-opcion ${equipoActivo === eq.id ? 'equipo-opcion-activa' : ''}`}
              onClick={() => onCambiarEquipoActivo(eq.id)}
            >
              <span>{eq.nombre}</span>
              {equipoActivo === eq.id && <span className="check-activo">✓</span>}
            </button>
          ))}

          <button
            className={`equipo-opcion ${equipoActivo === 'sin_asignar' ? 'equipo-opcion-activa' : ''}`}
            onClick={() => onCambiarEquipoActivo('sin_asignar')}
          >
            <span>Jugadores sin asignar</span>
            {equipoActivo === 'sin_asignar' && <span className="check-activo">✓</span>}
          </button>
        </div>
      </section>

      <section className="equipos-crear-card">
        <h3>Crear un equipo nuevo</h3>
        <form onSubmit={anadirEquipo} className="equipos-crear-form">
          <input
            type="text" value={nuevoEquipo}
            onChange={(e) => setNuevoEquipo(e.target.value)}
            placeholder="Ej. Juvenil A, Filial, Primer equipo…"
          />
          <button type="submit" className="btn-principal" disabled={guardando}>
            {guardando ? 'Creando…' : '+ Crear equipo'}
          </button>
        </form>
        {mensaje && <div className="aviso-error">{mensaje.texto}</div>}
        <p className="equipos-nota">
          Los jugadores eligen su equipo desde su propio formulario, entre los
          equipos que crees aquí.
        </p>
      </section>
    </div>
  )
}
