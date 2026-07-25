import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Equipos.css'

const coloresSugeridos = ['#c8ff4d', '#4dc8ff', '#ff4d8f', '#ffb84d', '#a24dff', '#4dffb8', '#ff6b4d', '#4d6bff']

export default function Equipos({ equipos, equipoActivo, onCambiarEquipoActivo, onEquiposActualizados }) {
  const [nuevoEquipo, setNuevoEquipo] = useState('')
  const [colorNuevo, setColorNuevo] = useState(coloresSugeridos[equipos.length % coloresSugeridos.length])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  async function anadirEquipo(e) {
    e.preventDefault()
    if (!nuevoEquipo.trim()) return
    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase.from('equipos').insert({ nombre: nuevoEquipo.trim(), color: colorNuevo })
    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo crear el equipo (¿ya existe ese nombre?).' })
    } else {
      setNuevoEquipo('')
      setColorNuevo(coloresSugeridos[(equipos.length + 1) % coloresSugeridos.length])
      onEquiposActualizados()
    }
    setGuardando(false)
  }

  async function cambiarColorEquipo(id, color) {
    await supabase.from('equipos').update({ color }).eq('id', id)
    onEquiposActualizados()
  }

  return (
    <div className="equipos-layout">
      <section className="equipos-lista-card">
        <h2>¿Qué equipo quieres ver?</h2>
        <p className="equipos-sub">
          Esta selección se aplica a todo el panel (resumen, gráfico, jugadores e informes).
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
            <div key={eq.id} className={`equipo-opcion-fila ${equipoActivo === eq.id ? 'equipo-opcion-activa' : ''}`}>
              <button className="equipo-opcion-boton" onClick={() => onCambiarEquipoActivo(eq.id)}>
                <span className="equipo-punto" style={{ background: eq.color || '#c8ff4d' }} />
                <span>{eq.nombre}</span>
              </button>
              <input
                type="color" value={eq.color || '#c8ff4d'}
                onChange={(e) => cambiarColorEquipo(eq.id, e.target.value)}
                className="equipo-color-input"
                title="Cambiar color del equipo"
              />
              {equipoActivo === eq.id && <span className="check-activo">✓</span>}
            </div>
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
          <label className="equipos-color-selector">
            <span>Color identificativo</span>
            <input type="color" value={colorNuevo} onChange={(e) => setColorNuevo(e.target.value)} />
          </label>
          <button type="submit" className="btn-principal" disabled={guardando}>
            {guardando ? 'Creando…' : '+ Crear equipo'}
          </button>
        </form>
        {mensaje && <div className="aviso-error">{mensaje.texto}</div>}
        <p className="equipos-nota">
          Los jugadores eligen su equipo desde su propio formulario, entre los
          equipos que crees aquí. Puedes cambiar el color de un equipo en
          cualquier momento con la muestra de color de la izquierda.
        </p>
      </section>
    </div>
  )
}
