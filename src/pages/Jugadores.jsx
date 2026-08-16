import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { calcularEstadoCiclo, infoFase } from '../lib/ciclosMenstruales'
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

const traducirSexo = (s) => ({ masculino: 'Masculino', femenino: 'Femenino', neutro: 'Neutro' }[s] || '—')

export default function Jugadores({ equipoActivo = 'todos' }) {
  const [jugadores, setJugadores] = useState([])
  const [cargando, setCargando] = useState(true)
  const [editandoPeso, setEditandoPeso] = useState(null)
  const [pesoTemp, setPesoTemp] = useState('')
  const [ciclosPorJugadora, setCiclosPorJugadora] = useState({})
  const [eliminandoId, setEliminandoId] = useState(null)

  useEffect(() => { cargarJugadores() }, [])

  async function cargarJugadores() {
    setCargando(true)
    const { data } = await supabase
      .from('perfiles')
      .select('*, equipos(id, nombre, color)')
      .eq('rol', 'jugador')
      .order('nombre')
    setJugadores(data || [])

    const idsFemenino = (data || []).filter((j) => j.sexo === 'femenino').map((j) => j.id)
    if (idsFemenino.length > 0) {
      const { data: ciclos } = await supabase
        .from('ciclos_menstruales')
        .select('*')
        .in('jugador_id', idsFemenino)
        .order('fecha_inicio', { ascending: true })
      const agrupados = {}
      ;(ciclos || []).forEach((c) => {
        if (!agrupados[c.jugador_id]) agrupados[c.jugador_id] = []
        agrupados[c.jugador_id].push(c)
      })
      setCiclosPorJugadora(agrupados)
    }
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

  async function eliminarJugador(j) {
    const escrito = window.prompt(
      `Esto eliminará PARA SIEMPRE la cuenta de ${j.nombre} y todos sus datos (registros diarios, tests, lesiones, ciclo...). No se puede deshacer.\n\nEscribe su nombre exacto para confirmar:`
    )
    if (escrito === null) return
    if (escrito !== j.nombre) {
      alert('El nombre no coincide exactamente. No se ha eliminado nada.')
      return
    }

    setEliminandoId(j.id)
    const { data: sesion } = await supabase.auth.getSession()
    try {
      const resp = await fetch('/api/eliminar-jugador', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesion.session.access_token}` },
        body: JSON.stringify({ jugadorId: j.id }),
      })
      const resultado = await resp.json()
      if (!resp.ok) {
        alert(resultado.error || 'No se pudo eliminar al jugador.')
      } else {
        cargarJugadores()
      }
    } catch {
      alert('No se pudo conectar con el servidor. Inténtalo de nuevo.')
    }
    setEliminandoId(null)
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
              <th>Fecha nacimiento</th><th>Sexo</th><th>Ciclo</th><th>Dado de alta</th><th></th>
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
                <td className="texto-dim">{traducirSexo(j.sexo)}</td>
                <td>
                  {j.sexo === 'femenino' ? (
                    (() => {
                      const estado = calcularEstadoCiclo(ciclosPorJugadora[j.id] || [])
                      return estado
                        ? (
                          <span className="ciclo-fase-badge" title={infoFase[estado.fase].mensaje}>
                            {infoFase[estado.fase].etiqueta} · día {estado.diaCiclo}
                          </span>
                        )
                        : <span className="texto-faint">Sin registros</span>
                    })()
                  ) : (
                    <span className="texto-faint">—</span>
                  )}
                </td>
                <td className="mono texto-dim">
                  {j.creado_en ? new Date(j.creado_en).toLocaleDateString('es-ES') : '—'}
                </td>
                <td>
                  <button
                    className="btn-eliminar-fila" onClick={() => eliminarJugador(j)}
                    disabled={eliminandoId === j.id} title="Eliminar jugador definitivamente"
                  >
                    {eliminandoId === j.id ? '…' : '✕'}
                  </button>
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
