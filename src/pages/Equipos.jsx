import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Equipos.css'

const coloresSugeridos = ['#c8ff4d', '#4dc8ff', '#ff4d8f', '#ffb84d', '#a24dff', '#4dffb8', '#ff6b4d', '#4d6bff']
const TAMANO_MAXIMO_MB = 1.5

export default function Equipos({ equipos, equipoActivo, onCambiarEquipoActivo, onEquiposActualizados }) {
  const [nuevoEquipo, setNuevoEquipo] = useState('')
  const [colorNuevo, setColorNuevo] = useState(coloresSugeridos[equipos.length % coloresSugeridos.length])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [subiendoLogoId, setSubiendoLogoId] = useState(null)
  const [errorLogo, setErrorLogo] = useState(null)

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

  function subirLogo(id, archivo) {
    if (!archivo) return
    setErrorLogo(null)

    if (!archivo.type.startsWith('image/')) {
      setErrorLogo('El archivo debe ser una imagen.')
      return
    }
    if (archivo.size > TAMANO_MAXIMO_MB * 1024 * 1024) {
      setErrorLogo(`La imagen es demasiado grande (máximo ${TAMANO_MAXIMO_MB} MB). Prueba con una versión más pequeña del escudo.`)
      return
    }

    setSubiendoLogoId(id)
    const lector = new FileReader()
    lector.onload = async () => {
      const { error } = await supabase.from('equipos').update({ logo_base64: lector.result }).eq('id', id)
      if (error) setErrorLogo('No se pudo guardar el escudo.')
      else onEquiposActualizados()
      setSubiendoLogoId(null)
    }
    lector.onerror = () => {
      setErrorLogo('No se pudo leer la imagen.')
      setSubiendoLogoId(null)
    }
    lector.readAsDataURL(archivo)
  }

  async function quitarLogo(id) {
    await supabase.from('equipos').update({ logo_base64: null }).eq('id', id)
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
              <label className="equipo-logo-selector" title="Subir escudo del equipo">
                {eq.logo_base64 ? (
                  <img src={eq.logo_base64} alt={`Escudo de ${eq.nombre}`} className="equipo-logo-miniatura" />
                ) : (
                  <span className="equipo-logo-vacio">+ Escudo</span>
                )}
                <input
                  type="file" accept="image/*" className="equipo-logo-input-oculto"
                  onChange={(e) => subirLogo(eq.id, e.target.files?.[0])}
                  disabled={subiendoLogoId === eq.id}
                />
              </label>
              {eq.logo_base64 && (
                <button type="button" className="equipo-logo-quitar" onClick={() => quitarLogo(eq.id)} title="Quitar escudo">
                  ✕
                </button>
              )}
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
        {errorLogo && <div className="aviso-error" style={{ marginTop: 12 }}>{errorLogo}</div>}
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
