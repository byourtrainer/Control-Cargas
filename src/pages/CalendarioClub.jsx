import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './CalendarioClub.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

const tiposEvento = ['Entrenamiento', 'Amistoso', 'Liga', 'Europa', 'Copa del Rey', 'Play-Off']

const colorPorTipo = {
  'Entrenamiento': '#8a968c',
  'Amistoso': '#4dc8ff',
  'Liga': '#c8ff4d',
  'Europa': '#a24dff',
  'Copa del Rey': '#f2c14e',
  'Play-Off': '#ea5c4a',
}

const vacio = { tipo: 'Liga', titulo: '', hora: '', rival: '', lugar: '', notas: '' }

export default function CalendarioClub({ equipoActivo = 'todos', equipos = [] }) {
  const equipoValido = equipoActivo !== 'todos' && equipoActivo !== 'sin_asignar'
  const nombreEquipoActivo = equipos.find((e) => e.id === equipoActivo)?.nombre

  const [mesVisible, setMesVisible] = useState(() => { const d = new Date(); d.setDate(1); return d })
  const [eventos, setEventos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyISO())
  const [form, setForm] = useState(vacio)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [borrandoId, setBorrandoId] = useState(null)

  useEffect(() => { if (equipoValido) cargarMes() }, [mesVisible, equipoActivo])

  async function cargarMes() {
    setCargando(true)
    const inicio = new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1).toISOString().slice(0, 10)
    const fin = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).toISOString().slice(0, 10)
    const { data } = await supabase
      .from('eventos_calendario')
      .select('*')
      .eq('equipo_id', equipoActivo)
      .gte('fecha', inicio)
      .lte('fecha', fin)
      .order('hora', { ascending: true })
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
    setMensaje(null)
  }

  async function guardarEvento(e) {
    e.preventDefault()
    if (!form.titulo.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ponle un título al evento.' })
      return
    }
    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase.from('eventos_calendario').insert({
      equipo_id: equipoActivo,
      fecha: fechaSeleccionada,
      tipo: form.tipo,
      titulo: form.titulo.trim(),
      hora: form.hora || null,
      rival: form.rival || null,
      lugar: form.lugar || null,
      notas: form.notas || null,
    })
    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar el evento.' })
    } else {
      setForm(vacio)
      setMensaje({ tipo: 'ok', texto: 'Evento añadido.' })
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

  if (!equipoValido) {
    return (
      <div className="calendario-club-layout">
        <section className="calendario-club-sin-equipo">
          <h2>Selecciona un club</h2>
          <p className="texto-dim">
            El calendario es por club/equipo. Usa el selector <strong>◎</strong> de la cabecera
            y elige un equipo concreto (no "Todos los equipos" ni "Sin asignar") para ver o
            gestionar su calendario.
          </p>
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

  const eventosDelDiaSeleccionado = eventos.filter((ev) => ev.fecha === fechaSeleccionada)
  const hoy = hoyISO()

  return (
    <div className="calendario-club-layout">
      <div className="calendario-club-titulo-imprimir">
        <h2>Calendario — {nombreEquipoActivo}</h2>
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

        <div className="calendario-dias-semana">
          {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
        </div>

        <div className={`calendario-grid ${cargando ? 'calendario-cargando' : ''}`}>
          {celdas.map((d, i) => {
            if (d === null) return <div key={i} className="calendario-celda calendario-celda-vacia" />
            const fecha = fechaDe(d)
            const eventosDia = eventos.filter((ev) => ev.fecha === fecha)
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
                    <span key={ev.id} className="calendario-club-punto" style={{ background: colorPorTipo[ev.tipo] }} />
                  ))}
                </span>
                <span className="calendario-club-eventos-imprimir">
                  {eventosDia.map((ev) => (
                    <span
                      key={ev.id}
                      className="calendario-club-evento-linea"
                      style={{ borderLeftColor: colorPorTipo[ev.tipo] }}
                    >
                      <strong>{ev.tipo}</strong> {ev.titulo}{ev.hora ? ` · ${ev.hora}` : ''}
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
      </section>

      <section className="calendario-club-panel no-imprimir">
        <h2 className="capitalizada">
          {new Date(fechaSeleccionada + 'T00:00:00').toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
        </h2>
        <p className="texto-dim calendario-club-equipo">{nombreEquipoActivo}</p>

        {eventosDelDiaSeleccionado.length > 0 && (
          <ul className="calendario-club-lista">
            {eventosDelDiaSeleccionado.map((ev) => (
              <li key={ev.id}>
                <span className="calendario-club-tipo-badge" style={{ background: colorPorTipo[ev.tipo] + '33', color: colorPorTipo[ev.tipo] }}>
                  {ev.tipo}
                </span>
                <div className="calendario-club-evento-info">
                  <strong>{ev.titulo}</strong>
                  <span className="texto-dim">
                    {[ev.hora, ev.rival, ev.lugar].filter(Boolean).join(' · ')}
                  </span>
                  {ev.notas && <p className="calendario-club-evento-notas">{ev.notas}</p>}
                </div>
                <button
                  className="btn-eliminar-fila" onClick={() => eliminarEvento(ev.id)}
                  disabled={borrandoId === ev.id} title="Eliminar evento"
                >
                  {borrandoId === ev.id ? '…' : '✕'}
                </button>
              </li>
            ))}
          </ul>
        )}

        <h3 className="calendario-club-subtitulo">+ Añadir evento este día</h3>
        <form onSubmit={guardarEvento}>
          <label className="campo-sesion">
            <span>Tipo</span>
            <select value={form.tipo} onChange={(e) => setForm({ ...form, tipo: e.target.value })}>
              {tiposEvento.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </label>

          <label className="campo-sesion">
            <span>Título</span>
            <input
              type="text" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              placeholder="Ej. vs Real Madrid, Entreno pretemporada…" required
            />
          </label>

          <div className="fila-doble">
            <label className="campo-sesion">
              <span>Hora (opcional)</span>
              <input type="text" value={form.hora} onChange={(e) => setForm({ ...form, hora: e.target.value })} placeholder="18:00" />
            </label>
            <label className="campo-sesion">
              <span>Rival (opcional)</span>
              <input type="text" value={form.rival} onChange={(e) => setForm({ ...form, rival: e.target.value })} placeholder="—" />
            </label>
          </div>

          <label className="campo-sesion">
            <span>Lugar (opcional)</span>
            <input type="text" value={form.lugar} onChange={(e) => setForm({ ...form, lugar: e.target.value })} placeholder="Casa / Fuera / estadio…" />
          </label>

          <label className="campo-sesion">
            <span>Notas (opcional)</span>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />
          </label>

          {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}

          <button type="submit" className="btn-principal" disabled={guardando}>
            {guardando ? 'Guardando…' : '+ Añadir evento'}
          </button>
        </form>
      </section>
    </div>
  )
}
