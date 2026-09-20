import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { fechaISOLocal, hoyISOLocal as hoyISO } from '../lib/fechas'
import './EntrenamientoJugador.css'

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

// Calcula la fecha real de un día de programa: semana 1 empieza en el lunes
// de la semana de "fechaInicio" (no en fechaInicio exacta, para que todo el
// programa quede alineado a semanas naturales de lunes a domingo).
function lunesDeSemana(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00')
  const diaSemana = (d.getDay() + 6) % 7 // 0 = lunes
  d.setDate(d.getDate() - diaSemana)
  return d
}
function fechaDePrograma(fechaInicio, semana, diaSemana) {
  const lunes1 = lunesDeSemana(fechaInicio)
  const d = new Date(lunes1)
  d.setDate(d.getDate() + (semana - 1) * 7 + (diaSemana - 1))
  return fechaISOLocal(d)
}

export default function EntrenamientoJugador({ perfil, onVolver }) {
  const [cargando, setCargando] = useState(true)
  const [asignaciones, setAsignaciones] = useState([])
  const [diasPorPrograma, setDiasPorPrograma] = useState({})
  const [mesVisible, setMesVisible] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [fechaAbierta, setFechaAbierta] = useState(null)
  const [plantillaAbiertaId, setPlantillaAbiertaId] = useState(null)
  const [plantillaDetalle, setPlantillaDetalle] = useState(null)
  const [cargandoDetalle, setCargandoDetalle] = useState(false)
  const [reproduciendoId, setReproduciendoId] = useState(null)

  useEffect(() => { cargarAsignaciones() }, [])

  async function cargarAsignaciones() {
    setCargando(true)
    const { data: asigs } = await supabase
      .from('gimnasio_asignaciones')
      .select('*, plantilla:gimnasio_plantillas(id, nombre), programa:gimnasio_programas(id, nombre, semanas)')
      .eq('destinatario_tipo', 'jugador')
      .eq('destinatario_id', perfil.id)

    const idsProgramas = [...new Set((asigs || []).filter((a) => a.tipo === 'programa').map((a) => a.programa_id))]
    let mapa = {}
    if (idsProgramas.length > 0) {
      const { data: dias } = await supabase
        .from('gimnasio_programa_dias')
        .select('*, plantilla:gimnasio_plantillas(id, nombre)')
        .in('programa_id', idsProgramas)
      ;(dias || []).forEach((d) => { (mapa[d.programa_id] ||= []).push(d) })
    }
    setAsignaciones(asigs || [])
    setDiasPorPrograma(mapa)
    setCargando(false)
  }

  const eventos = useMemo(() => {
    const lista = []
    asignaciones.forEach((a) => {
      if (a.tipo === 'sesion' && a.plantilla) {
        lista.push({ fecha: a.fecha_inicio, nombre: a.plantilla.nombre, plantillaId: a.plantilla.id, origen: 'Sesión' })
      } else if (a.tipo === 'programa') {
        const dias = diasPorPrograma[a.programa_id] || []
        dias.forEach((d) => {
          if (!d.plantilla) return
          lista.push({
            fecha: fechaDePrograma(a.fecha_inicio, d.semana, d.dia_semana),
            nombre: d.plantilla.nombre, plantillaId: d.plantilla.id,
            origen: a.programa?.nombre ? `Programa — ${a.programa.nombre}` : 'Programa',
          })
        })
      }
    })
    return lista
  }, [asignaciones, diasPorPrograma])

  async function abrirPlantilla(plantillaId) {
    setPlantillaAbiertaId(plantillaId)
    setCargandoDetalle(true)
    setReproduciendoId(null)
    const { data: bloques } = await supabase
      .from('gimnasio_plantilla_bloques')
      .select('*')
      .eq('plantilla_id', plantillaId)
      .order('orden')
    const idsBloques = (bloques || []).map((b) => b.id)
    let items = []
    if (idsBloques.length > 0) {
      const { data } = await supabase
        .from('gimnasio_plantilla_items')
        .select('*, ejercicio:ejercicios(*)')
        .in('bloque_id', idsBloques)
        .order('orden')
      items = data || []
    }
    setPlantillaDetalle((bloques || []).map((b) => ({ ...b, items: items.filter((it) => it.bloque_id === b.id) })))
    setCargandoDetalle(false)
  }

  function cerrarDetalle() {
    setPlantillaAbiertaId(null)
    setPlantillaDetalle(null)
    setFechaAbierta(null)
  }

  const primerDiaSemana = (new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1).getDay() + 6) % 7
  const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate()
  const celdas = []
  for (let i = 0; i < primerDiaSemana; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  function fechaDe(d) {
    const mm = String(mesVisible.getMonth() + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${mesVisible.getFullYear()}-${mm}-${dd}`
  }

  function cambiarMes(delta) {
    const d = new Date(mesVisible)
    d.setMonth(d.getMonth() + delta)
    setMesVisible(d)
  }

  function irAHoy() {
    const d = new Date()
    d.setDate(1)
    setMesVisible(d)
  }

  const hoy = hoyISO()
  const eventosDelDiaAbierto = fechaAbierta ? eventos.filter((e) => e.fecha === fechaAbierta) : []

  if (cargando) return <p className="mono texto-dim">Cargando…</p>

  // Vista de detalle de una sesión concreta (bloques, ejercicios, vídeos)
  if (plantillaAbiertaId) {
    return (
      <div className="entrenamiento-jugador">
        <button type="button" className="volver-calendario" onClick={cerrarDetalle}>← Volver al calendario</button>
        {cargandoDetalle ? (
          <p className="mono texto-dim">Cargando sesión…</p>
        ) : !plantillaDetalle || plantillaDetalle.length === 0 ? (
          <p className="texto-dim">Esta sesión todavía no tiene ejercicios.</p>
        ) : (
          <div className="gimnasio-bloques-lista">
            {plantillaDetalle.map((b) => (
              <section className="gimnasio-bloque-card" key={b.id}>
                <h3>{b.nombre}</h3>
                {b.items.length === 0 ? (
                  <p className="texto-dim">Sin ejercicios en este bloque.</p>
                ) : (
                  <div className="sesiones-items-lista">
                    {b.items.map((it) => (
                      <div className="sesiones-item-card" key={it.id}>
                        {it.ejercicio?.youtube_id ? (
                          reproduciendoId === it.id ? (
                            <div className="sesiones-item-imagen entrenamiento-video-wrap">
                              <iframe
                                src={`https://www.youtube.com/embed/${it.ejercicio.youtube_id}?autoplay=1`}
                                title={it.ejercicio.nombre}
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                allowFullScreen
                              />
                            </div>
                          ) : (
                            <button type="button" className="sesiones-item-imagen entrenamiento-video-boton" onClick={() => setReproduciendoId(it.id)}>
                              <img src={`https://img.youtube.com/vi/${it.ejercicio.youtube_id}/mqdefault.jpg`} alt={it.ejercicio.nombre} />
                              <span className="biblioteca-tarjeta-play-icono">▶</span>
                            </button>
                          )
                        ) : (
                          <div className="sesiones-item-imagen gimnasio-item-sin-imagen">Sin vídeo</div>
                        )}
                        <div className="sesiones-item-cuerpo">
                          <strong>{it.ejercicio?.nombre || 'Ejercicio'}</strong>
                          <div className="entrenamiento-variables-lectura">
                            {it.series && <span><strong>Series</strong> {it.series}</span>}
                            {it.repeticiones && <span><strong>Reps</strong> {it.repeticiones}{it.repeticiones_por_lado ? ' (por lado)' : ''}</span>}
                            {it.intensidad && <span><strong>Intensidad</strong> {it.intensidad}</span>}
                            {it.tempo && <span><strong>Tempo</strong> {it.tempo}</span>}
                            {it.tiempo_trabajo && <span><strong>Duración</strong> {it.tiempo_trabajo}</span>}
                            {it.descanso_repeticiones && <span><strong>Desc. reps.</strong> {it.descanso_repeticiones}</span>}
                            {it.descanso_series && <span><strong>Desc. series</strong> {it.descanso_series}</span>}
                          </div>
                          {it.notas && <p className="texto-dim">{it.notas}</p>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            ))}
          </div>
        )}
      </div>
    )
  }

  // Selector de sesión cuando un día tiene más de un evento
  if (fechaAbierta) {
    return (
      <div className="entrenamiento-jugador">
        <button type="button" className="volver-calendario" onClick={() => setFechaAbierta(null)}>← Volver al calendario</button>
        <h3 className="capitalizada">{new Date(fechaAbierta + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}</h3>
        <div className="gimnasio-lista">
          {eventosDelDiaAbierto.map((ev, i) => (
            <button key={i} className="gimnasio-tarjeta" onClick={() => abrirPlantilla(ev.plantillaId)}>
              <div>
                <strong>{ev.nombre}</strong>
                <span className="texto-dim">{ev.origen}</span>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="entrenamiento-jugador">
      {onVolver && (
        <button type="button" className="volver-calendario" onClick={onVolver}>← Volver</button>
      )}
      <section className="calendario-card">
        <div className="calendario-cabecera">
          <button className="calendario-nav" onClick={() => cambiarMes(-1)}>←</button>
          <button className="calendario-mes-titulo" onClick={irAHoy}>
            {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
          </button>
          <button className="calendario-nav" onClick={() => cambiarMes(1)}>→</button>
        </div>

        <div className="calendario-dias-semana">
          {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
        </div>

        <div className="calendario-grid">
          {celdas.map((d, i) => {
            if (d === null) return <div key={i} className="calendario-celda calendario-celda-vacia" />
            const fecha = fechaDe(d)
            const esHoy = fecha === hoy
            const eventosDelDia = eventos.filter((e) => e.fecha === fecha)
            const haySesion = eventosDelDia.length > 0
            return (
              <button
                key={i}
                className={`calendario-celda ${esHoy ? 'calendario-celda-hoy' : ''}`}
                onClick={() => haySesion && (eventosDelDia.length === 1 ? abrirPlantilla(eventosDelDia[0].plantillaId) : setFechaAbierta(fecha))}
                disabled={!haySesion}
              >
                {haySesion && <span className="calendario-sesion-punto" title="Sesión de gimnasio" />}
                <span className="calendario-numero">{d}</span>
              </button>
            )
          })}
        </div>

        <div className="calendario-leyenda">
          <span><span className="calendario-sesion-punto calendario-sesion-punto-leyenda" /> Sesión de gimnasio asignada</span>
        </div>
      </section>

      {eventos.length === 0 && (
        <p className="texto-dim">Todavía no tienes ninguna sesión de gimnasio asignada.</p>
      )}
    </div>
  )
}
