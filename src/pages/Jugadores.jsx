import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Jugadores.css'

function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null
  const hoy = new Date()
  const nacimiento = new Date(fechaNacimiento)
  let edad = hoy.getFullYear() - nacimiento.getFullYear()
  const aunNoCumplido = hoy.getMonth() < nacimiento.getMonth() ||
    (hoy.getMonth() === nacimiento.getMonth() && hoy.getDate() < nacimiento.getDate())
  if (aunNoCumplido) edad--
  return edad
}

export default function Jugadores({ equipoActivo = 'todos' }) {
  const [jugadores, setJugadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editandoPeso, setEditandoPeso] = useState(null)
  const [pesoTemp, setPesoTemp] = useState('')

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

  function empezarEdicionPeso(j) {
    setEditandoPeso(j.id)
    setPesoTemp(j.peso_corporal_kg ?? '')
  }

  async function guardarPeso(id) {
    const valor = pesoTemp === '' ? null : Number(pesoTemp)
    await supabase.from('perfiles').update({ peso_corporal_kg: valor }).eq('id', id)
    setEditandoPeso(null)
    cargarJugadores()
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
        <div className="tabla-scroll">
        <table className="jugadores-plantilla-tabla">
          <thead>
            <tr>
              <th>Jugador</th><th>Equipo</th><th>Peso corporal</th><th>Altura</th>
              <th>Fecha nacimiento</th><th>Dado de alta</th>
            </tr>
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
                <td className="mono">
                  {editandoPeso === j.id ? (
                    <span className="peso-editor">
                      <input
                        type="number" step="0.1" min="0" autoFocus
                        value={pesoTemp}
                        onChange={(e) => setPesoTemp(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && guardarPeso(j.id)}
                      />
                      <button onClick={() => guardarPeso(j.id)}>✓</button>
                      <button onClick={() => setEditandoPeso(null)}>✕</button>
                    </span>
                  ) : (
                    <button className="peso-boton" onClick={() => empezarEdicionPeso(j)}>
                      {j.peso_corporal_kg ? `${j.peso_corporal_kg} kg` : 'Añadir peso'}
                    </button>
                  )}
                </td>
                <td className="mono texto-dim">{j.altura_m ? `${j.altura_m} m` : '—'}</td>
                <td className="mono texto-dim">
                  {j.fecha_nacimiento
                    ? `${new Date(j.fecha_nacimiento).toLocaleDateString('es-ES')} (${calcularEdad(j.fecha_nacimiento)} años)`
                    : '—'}
                </td>
                <td className="mono texto-dim">
                  {j.creado_en ? new Date(j.creado_en).toLocaleDateString('es-ES') : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
    </section>
  )
}
