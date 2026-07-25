import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Jugadores.css'

export default function Jugadores({ equipoActivo = 'todos' }) {
  const [jugadores, setJugadores] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarJugadores() }, [])

  async function cargarJugadores() {
    setCargando(true)
    const { data } = await supabase
      .from('perfiles')
      .select('*, equipos(id, nombre, color)')
      .eq('rol', 'jugador')
      .order('nombre')
    setJugadores(data || [])
    setCargando(false)
  }

  const jugadoresFiltrados = jugadores.filter((j) => {
    if (equipoActivo === 'todos') return true
    if (equipoActivo === 'sin_asignar') return !j.equipo_id
    return j.equipo_id === equipoActivo
  })

  if (cargando) return <p className="mono texto-dim">Cargando jugadores…</p>

  return (
    <section className="jugadores-card">
      <div className="jugadores-cabecera">
        <h2>Plantilla</h2>
        <span className="mono texto-dim">{jugadoresFiltrados.length} jugadores dados de alta</span>
      </div>

      {jugadoresFiltrados.length === 0 ? (
        <p className="texto-dim">No hay jugadores en este grupo todavía.</p>
      ) : (
        <table className="jugadores-plantilla-tabla">
          <thead>
            <tr><th>Jugador</th><th>Equipo</th><th>Dado de alta</th></tr>
          </thead>
          <tbody>
            {jugadoresFiltrados.map((j) => (
              <tr key={j.id}>
                <td>{j.nombre}</td>
                <td>
                  {j.equipos ? (
                    <span className="equipo-etiqueta">
                      <span className="equipo-punto" style={{ background: j.equipos.color || '#c8ff4d' }} />
                      {j.equipos.nombre}
                    </span>
                  ) : (
                    <span className="texto-dim">Sin asignar</span>
                  )}
                </td>
                <td className="mono texto-dim">
                  {j.creado_en ? new Date(j.creado_en).toLocaleDateString('es-ES') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  )
}
