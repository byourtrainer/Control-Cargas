import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './CalendarioClub.css'

import { fechaISOLocal, hoyISOLocal as hoyISO } from '../lib/fechas'

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const tiposEvento = ['Entrenamiento', 'Amistoso', 'Liga', 'Europa', 'Copa del Rey', 'Play-Off']
const opcionesTipoSesion = ['Pista', 'Gimnasio', 'Recuperación']

const colorPorTipo = {
  'Entrenamiento': '#8a968c',
  'Amistoso': '#4dc8ff',
  'Liga': '#c8ff4d',
  'Europa': '#a24dff',
  'Copa del Rey': '#f2c14e',
  'Play-Off': '#ea5c4a',
}

const nivelesIntensidad = [
  { valor: 'baja', etiqueta: 'Baja', color: 'var(--risk-low)' },
  { valor: 'media', etiqueta: 'Media', color: 'var(--risk-mid)' },
  { valor: 'alta', etiqueta: 'Alta', color: 'var(--risk-high)' },
]
const colorIntensidad = Object.fromEntries(nivelesIntensidad.map((n) => [n.valor, n.color]))
const etiquetaIntensidad = Object.fromEntries(nivelesIntensidad.map((n) => [n.valor, n.etiqueta]))
const ordenIntensidad = nivelesIntensidad.map((n) => n.valor)

/** Devuelve la intensidad (array o null) siempre en el mismo orden (baja→media→alta). */
function ordenarIntensidad(intensidad) {
  if (!intensidad || intensidad.length === 0) return []
  return ordenIntensidad.filter((v) => intensidad.includes(v))
}

const vacio = { tipo: 'Liga', titulo: '', hora: '', rival: '', lugar: '', notas: '', fechaFin: '', intensidad: [], duracionMin: '', tipoSesion: '' }

/** Texto que identifica el evento: el título si lo hay, o "vs Rival" si no. */
function tituloEfectivo(ev) {
  if (ev.titulo && ev.titulo.trim()) return ev.titulo
  if (ev.rival) return `vs ${ev.rival}`
  return ev.tipo
}

/** Si "fecha" cae dentro del rango [ev.fecha, ev.fecha_fin || ev.fecha]. */
function eventoIncluyeFecha(ev, fecha) {
  const fin = ev.fecha_fin || ev.fecha
  return fecha >= ev.fecha && fecha <= fin
}

export default function CalendarioClub({ equipoActivo = 'todos', equipos = [], onIrAPlanificar }) {
  const esSinAsignar = equipoActivo === 'sin_asignar'
  const esEquipoConcreto = equipoActivo !== 'todos' && !esSinAsignar

  const [jugadoresSinAsignar, setJugadoresSinAsignar] = useState([])
  const [jugadorSeleccionado, setJugadorSeleccionado] = useState('')

  const modoDestino = esEquipoConcreto ? 'equipo' : (esSinAsignar && jugadorSeleccionado ? 'jugador' : null)
  const nombreDestino = esEquipoConcreto
    ? equipos.find((e) => e.id === equipoActivo)?.nombre
    : jugadoresSinAsignar.find((j) => j.id === jugadorSeleccionado)?.nombre

  const [mesVisible, setMesVisible] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyISO())
  const [form, setForm] = useState(vacio)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [borrandoId, setBorrandoId] = useState(null)
  const [editandoId, setEditandoId] = useState(null)

  useEffect(() => {
    if (esSinAsignar) cargarJugadoresSinAsignar()
    else setJugadorSeleccionado('')
  }, [esSinAsignar])

  useEffect(() => { if (modoDestino) cargarMes() }, [mesVisible, modoDestino, equipoActivo, jugadorSeleccionado])

  async function cargarJugadoresSinAsignar() {
    const { data } = await supabase
      .from('perfiles').select('id, nombre')
      .eq('rol', 'jugador').is('equipo_id', null).order('nombre')
    setJugadoresSinAsignar(data || [])
  }

  async function cargarMes() {
    setCargando(true)
    const inicio = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1)
    const fin = fechaISOLocal(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0))
    const inicioConsulta = new Date(inicio); inicioConsulta.setDate(inicioConsulta.getDate() - 45)
    let consulta = supabase
      .from('eventos_calendario')
      .select('*')
      .gte('fecha', fechaISOLocal(inicioConsulta))
      .lte('fecha', fin)
      .order('hora', { ascending: true })
    consulta = modoDestino === 'equipo' ? consulta.eq('equipo_id', equipoActivo) : consulta.eq('jugador_id', jugadorSeleccionado)
    const { data } = await consulta
    setEventos(data || [])
    setCargando(false)
  }

  function cambiarMes(delta) {
    const d = new Date(mesVisible)
    d.setMonth(d.getMonth() + delta)
    setMesVisible(d)
  }

  function irAHoy() {
    const d = new Date(); d.setDate(1)
    setMesVisible(d)
    setFechaSeleccionada(hoyISO())
  }

  function seleccionarDia(fecha) {
    setFechaSeleccionada(fecha)
    setForm(vacio)
    setEditandoId(null)
    setMensaje(null)
  }

  function empezarEdicion(ev) {
    setForm({
      tipo: ev.tipo,
      titulo: ev.titulo || '',
      hora: ev.hora || '',
      rival: ev.rival || '',
      lugar: ev.lugar || '',
      notas: ev.notas || '',
      fechaFin: ev.fecha_fin || '',
      intensidad: ev.intensidad || [],
      duracionMin: ev.duracion_min ?? '',
      tipoSesion: ev.tipo_sesion || '',
    })
    setEditandoId(ev.id)
    setMensaje(null)
  }

  function cancelarEdicion() {
    setForm(vacio)
    setEditandoId(null)
    setMensaje(null)
  }

  async function crearSesionesDesdeEvento(datosEvento) {
    if (!datosEvento.duracion_min) return { ok: true }

    let idsJugadores = []
    if (modoDestino === 'equipo') {
      const { data } = await supabase.from('perfiles').select('id, equipo_id').eq('rol', 'jugador')
      idsJugadores = (data || [])
        .filter((j) => {
          if (equipoActivo === 'todos') return true
          if (equipoActivo === 'sin_asignar') return !j.equipo_id
          return j.equipo_id === equipoActivo
        })
        .map((j) => j.id)
    } else if (modoDestino === 'jugador') {
      idsJugadores = [jugadorSeleccionado]
    }
    if (idsJugadores.length === 0) return { ok: true }

    const filas = idsJugadores.map((jugador_id) => ({
      fecha: datosEvento.fecha,
      jugador_id,
      duracion_min: datosEvento.duracion_min,
      tipo_sesion: datosEvento.tipo_sesion,
      contenido: datosEvento.notas,
      mdx: datosEvento.tipo !== 'Entrenamiento' ? 'MD' : null,
    }))
    const { error } = await supabase.from('sesiones').upsert(filas, { onConflict: 'fecha,jugador_id,tipo_sesion' })
    return { ok: !error }
  }

  async function guardarEvento(e) {
    e.preventDefault()
    const esEntrenamiento = form.tipo === 'Entrenamiento'

    if (esEntrenamiento && !form.titulo.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ponle un título al entrenamiento.' })
      return
    }
    if (!esEntrenamiento && !form.rival.trim()) {
      setMensaje({ tipo: 'error', texto: 'Indica el rival (el título es opcional para partidos/competiciones).' })
      return
    }
    if (form.fechaFin && form.fechaFin < fechaSeleccionada) {
      setMensaje({ tipo: 'error', texto: 'La fecha de fin no puede ser anterior a la fecha de inicio.' })
      return
    }

    setGuardando(true)
    setMensaje(null)
    const datos = {
      equipo_id: modoDestino === 'equipo' ? equipoActivo : null,
      jugador_id: modoDestino === 'jugador' ? jugadorSeleccionado : null,
      fecha: fechaSeleccionada,
      fecha_fin: form.fechaFin || null,
      tipo: form.tipo,
      titulo: form.titulo.trim() || null,
      hora: form.hora || null,
      rival: form.rival || null,
      lugar: form.lugar || null,
      notas: form.notas || null,
      intensidad: form.intensidad.length > 0 ? form.intensidad : null,
      duracion_min: form.duracionMin === '' ? null : Number(form.duracionMin),
      tipo_sesion: esEntrenamiento ? (form.tipoSesion || null) : null,
    }
    const { error } = editandoId
      ? await supabase.from('eventos_calendario').update(datos).eq('id', editandoId)
      : await supabase.from('eventos_calendario').insert(datos)

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar el evento.' })
    } else {
      const resultadoSesiones = await crearSesionesDesdeEvento(datos)
      setForm(vacio)
      setEditandoId(null)
      setMensaje(
        !resultadoSesiones.ok
          ? { tipo: 'error', texto: 'El evento se guardó, pero hubo un problema al aplicar la duración a los jugadores.' }
          : { tipo: 'ok', texto: editandoId ? 'Evento actualizado.' : 'Evento añadido.' }
      )
      cargarMes()
    }
    setGuardando(false)
  }

  async function eliminarEvento(id) {
    setBorrandoId(id)
    const { error } = await supabase.from('eventos_calendario').delete().eq('id', id)
    if (!error) setEventos((prev) => prev.filter((ev) => ev.id !== id))
    setBorrandoId(null)
  }

  if (equipoActivo === 'todos') {
    return (
      <div className="calendario-club-layout">
        <section className="calendario-club-sin-equipo">
          <h2>Selecciona un club o un jugador</h2>
          <p className="texto-dim">
            El calendario es siempre de un destino concreto. Usa el selector <strong>◎</strong> de la
            cabecera y elige un equipo, o "Sin asignar" si quieres llevar el calendario de un
            deportista individual sin club.
          </p>
        </section>
      </div>
    )
  }

  if (esSinAsignar && !jugadorSeleccionado) {
    return (
      <div className="calendario-club-layout">
        <section className="calendario-club-sin-equipo">
          <h2>Elige un deportista</h2>
          <p className="texto-dim">
            Los deportistas sin equipo tienen su calendario individual — elige a quién le quieres
            llevar la agenda.
          </p>
          {jugadoresSinAsignar.length === 0 ? (
            <p className="texto-dim">No hay ningún jugador marcado como "Sin asignar" ahora mismo.</p>
          ) : (
            <select value={jugadorSeleccionado} onChange={(e) => setJugadorSeleccionado(e.target.value)} className="calendario-club-selector-jugador">
              <option value="">Elige un jugador…</option>
              {jugadoresSinAsignar.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          )}
        </section>
      </div>
    )
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

  const esEntrenamientoForm = form.tipo === 'Entrenamiento'
  const eventosDelDiaSeleccionado = eventos.filter((ev) => eventoIncluyeFecha(ev, fechaSeleccionada))
  const hoy = hoyISO()

  return (
    <div className="calendario-club-layout">
      <div className="calendario-club-titulo-imprimir">
        <h2>Calendario — {nombreDestino}</h2>
        <p className="texto-dim">{MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}</p>
      </div>

      <section className="calendario-card calendario-club-card">
        <div className="calendario-cabecera">
          <button className="calendario-nav no-imprimir" onClick={() => cambiarMes(-1)}>←</button>
          <button className="calendario-mes-titulo" onClick={irAHoy}>
            {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
          </button>
          <button className="calendario-nav no-imprimir" onClick={() => cambiarMes(1)}>→</button>
          <button className="btn-exportar no-imprimir" onClick={() => window.print()}>Imprimir / Guardar PDF</button>
        </div>

        {esSinAsignar && (
          <div className="calendario-club-cambiar-jugador no-imprimir">
            <span className="texto-dim">Deportista:</span>
            <select value={jugadorSeleccionado} onChange={(e) => setJugadorSeleccionado(e.target.value)}>
              {jugadoresSinAsignar.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </div>
        )}

        <div className="calendario-dias-semana">
          {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
        </div>

        <div className={`calendario-grid ${cargando ? 'calendario-cargando' : ''}`}>
          {celdas.map((d, i) => {
            if (d === null) return <div key={i} className="calendario-celda calendario-celda-vacia" />
            const fecha = fechaDe(d)
            const eventosDia = eventos.filter((ev) => eventoIncluyeFecha(ev, fecha))
            const esHoy = fecha === hoy
            const esActiva = fecha === fechaSeleccionada
            return (
              <button
                key={i}
                className={`calendario-celda calendario-club-celda ${esHoy ? 'calendario-celda-hoy' : ''} ${esActiva ? 'calendario-celda-activa' : ''}`}
                onClick={() => seleccionarDia(fecha)}
              >
                <span className="calendario-numero">{d}</span>
                <span className="calendario-club-puntos no-imprimir">
                  {eventosDia.slice(0, 4).map((ev) => (
                    <span key={ev.id} className="calendario-club-punto-doble">
                      <span className="calendario-club-punto" style={{ background: colorPorTipo[ev.tipo] }} />
                      {ordenarIntensidad(ev.intensidad).map((valor) => (
                        <span key={valor} className="calendario-club-punto calendario-club-punto-intensidad" style={{ background: colorIntensidad[valor] }} />
                      ))}
                    </span>
                  ))}
                </span>
                <span className="calendario-club-eventos-imprimir">
                  {eventosDia.map((ev) => (
                    <span
                      key={ev.id}
                      className="calendario-club-evento-linea"
                      style={{ borderLeftColor: colorPorTipo[ev.tipo] }}
                    >
                      {ordenarIntensidad(ev.intensidad).map((valor) => (
                        <span key={valor} className="calendario-club-intensidad-punto" style={{ background: colorIntensidad[valor] }} />
                      ))}
                      <strong>{ev.tipo}</strong> {tituloEfectivo(ev)}{ev.hora ? ` · ${ev.hora}` : ''}
                    </span>
                  ))}
                </span>
              </button>
            )
          })}
        </div>

        <div className="calendario-club-leyenda">
          {tiposEvento.map((t) => (
            <span key={t}><span className="calendario-club-leyenda-punto" style={{ background: colorPorTipo[t] }} /> {t}</span>
          ))}
        </div>
        <div className="calendario-club-leyenda calendario-club-leyenda-intensidad">
          <span className="texto-dim">Intensidad:</span>
          {nivelesIntensidad.map((n) => (
            <span key={n.valor}><span className="calendario-club-leyenda-punto" style={{ background: n.color }} /> {n.etiqueta}</span>
          ))}
        </div>
      </section>

      <section className="calendario-club-panel no-imprimir">
        <h2 className="capitalizada">
          {new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        <p className="texto-dim calendario-club-equipo">{nombreDestino}</p>

        {eventosDelDiaSeleccionado.length > 0 && modoDestino === 'equipo' && (
          <button
            type="button" className="pizarra-boton calendario-club-boton-planificar"
            onClick={() => onIrAPlanificar?.(fechaSeleccionada, equipoActivo)}
          >
            → Poner una duración distinta por jugador
          </button>
        )}

        {eventosDelDiaSeleccionado.length > 0 && (
          <ul className="calendario-club-lista">
            {eventosDelDiaSeleccionado.map((ev) => (
              <li key={ev.id}>
                <span className="calendario-club-tipo-badge" style={{ background: colorPorTipo[ev.tipo] + '33', color: colorPorTipo[ev.tipo] }}>
                  {ev.tipo}
                </span>
                <div className="calendario-club-evento-info">
                  <strong>{tituloEfectivo(ev)}</strong>
                  <span className="texto-dim">
                    {[ev.hora, (ev.titulo && ev.titulo.trim() && ev.rival) ? ev.rival : null, ev.lugar].filter(Boolean).join(' · ')}
                  </span>
                  {ev.fecha_fin && ev.fecha_fin !== ev.fecha && (
                    <span className="texto-dim calendario-club-rango">
                      Del {new Date(ev.fecha + 'T00:00:00').toLocaleDateString('es-ES')} al {new Date(ev.fecha_fin + 'T00:00:00').toLocaleDateString('es-ES')}
                    </span>
                  )}
                  {ev.duracion_min && (
                    <span className="texto-dim">
                      ⏱ {ev.duracion_min} min{ev.tipo_sesion ? ` · ${ev.tipo_sesion}` : ''}
                    </span>
                  )}
                  {ev.intensidad && ev.intensidad.length > 0 && (
                    <span className="calendario-club-intensidad-badge">
                      {ordenarIntensidad(ev.intensidad).map((valor) => (
                        <span key={valor} className="calendario-club-intensidad-punto" style={{ background: colorIntensidad[valor] }} />
                      ))}
                      Intensidad {ordenarIntensidad(ev.intensidad).map((v) => etiquetaIntensidad[v].toLowerCase()).join('-')}
                    </span>
                  )}
                  {ev.notas && <p className="calendario-club-evento-notas">{ev.notas}</p>}
                </div>
                <div className="calendario-club-evento-acciones">
                  <button
                    className="equipo-cambiar-link" onClick={() => empezarEdicion(ev)}
                    title="Editar evento"
                  >
                    Editar
                  </button>
                  <button
                    className="btn-eliminar-fila" onClick={() => eliminarEvento(ev.id)}
                    disabled={borrandoId === ev.id} title="Eliminar evento"
                  >
                    {borrandoId === ev.id ? '…' : '✕'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h3 className="calendario-club-subtitulo">
          {editandoId ? 'Editar evento' : '+ Añadir evento este día'}
          {editandoId && (
            <button type="button" className="equipo-cambiar-link calendario-club-cancelar-edicion" onClick={cancelarEdicion}>
              Cancelar
            </button>
          )}
        </h3>
        <form onSubmit={guardarEvento}>
          <label className="campo-sesion">
            <span>Tipo</span>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {tiposEvento.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          {esEntrenamientoForm ? (
            <label className="campo-sesion">
              <span>Título</span>
              <input
                type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                placeholder="Ej. Pista, Gimnasio, Recuperación…" required
              />
            </label>
          ) : (
            <div className="fila-doble">
              <label className="campo-sesion">
                <span>Rival</span>
                <input
                  type="text" value={form.rival} onChange={(e) => setForm({ ...form, rival: e.target.value })}
                  placeholder="Ej. Real Madrid" required
                />
              </label>
              <label className="campo-sesion">
                <span>Título (opcional)</span>
                <input
                  type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
                  placeholder="Se usa vs Rival si se deja en blanco"
                />
              </label>
            </div>
          )}

          <div className="fila-doble">
            <label className="campo-sesion">
              <span>Hora (opcional)</span>
              <input type="text" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} placeholder="18:00" />
            </label>
            <label className="campo-sesion">
              <span>Hasta (opcional, evento de varios días)</span>
              <input type="date" value={form.fechaFin} min={fechaSeleccionada} onChange={(e) => setForm({ ...form, fechaFin: e.target.value })} />
            </label>
          </div>

          {esEntrenamientoForm && (
            <label className="campo-sesion">
              <span>Rival (opcional)</span>
              <input type="text" value={form.rival} onChange={(e) => setForm({ ...form, rival: e.target.value })} placeholder="—" />
            </label>
          )}

          <label className="campo-sesion">
            <span>Lugar (opcional)</span>
            <input type="text" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} placeholder="Casa / Fuera / estadio…" />
          </label>

          <div className="fila-doble">
            <label className="campo-sesion">
              <span>Duración (min) — aplica esta sesión al jugador o a todo el grupo activo</span>
              <input
                type="number" min="0" max="300" value={form.duracionMin}
                onChange={(e) => setForm({ ...form, duracionMin: e.target.value })}
                placeholder="Ej. 60"
              />
            </label>
            {esEntrenamientoForm && (
              <label className="campo-sesion">
                <span>Tipo de sesión</span>
                <select value={form.tipoSesion} onChange={(e) => setForm({ ...form, tipoSesion: e.target.value })}>
                  <option value="">Sin especificar</option>
                  {opcionesTipoSesion.map((op) => <option key={op} value={op}>{op}</option>)}
                </select>
              </label>
            )}
          </div>
          {form.duracionMin !== '' && (
            <p className="texto-faint calendario-club-duracion-nota">
              Al guardar, esta duración se aplicará a {modoDestino === 'equipo' ? 'todos los jugadores del equipo activo' : 'este jugador'}{' '}
              ese día — si quieres una duración distinta para cada jugador, usa Planificación en su lugar.
            </p>
          )}

          <label className="campo-sesion">
            <span>Intensidad esperada (opcional, hasta 2 — ej. rojo-amarillo)</span>
            <div className="calendario-club-intensidad-selector">
              {nivelesIntensidad.map((n) => {
                const activo = form.intensidad.includes(n.valor)
                const bloqueado = !activo && form.intensidad.length >= 2
                return (
                  <button
                    key={n.valor} type="button"
                    className={`calendario-club-intensidad-boton ${activo ? 'calendario-club-intensidad-activo' : ''}`}
                    style={{ '--color-intensidad': n.color }}
                    disabled={bloqueado}
                    onClick={() => setForm({
                      ...form,
                      intensidad: activo
                        ? form.intensidad.filter((v) => v !== n.valor)
                        : [...form.intensidad, n.valor],
                    })}
                  >
                    <span className="calendario-club-intensidad-punto" style={{ background: n.color }} />
                    {n.etiqueta}
                  </button>
                )
              })}
            </div>
          </label>

          <label className="campo-sesion">
            <span>Contenido de la sesión (opcional, solo lo ves tú)</span>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3} />
          </label>

          {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}

          <button type="submit" className="btn-principal" disabled={guardando}>
            {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : '+ Añadir evento'}
          </button>
        </form>
      </section>
    </div>
  )
}
