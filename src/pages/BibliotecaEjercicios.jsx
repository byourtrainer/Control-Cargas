import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './BibliotecaEjercicios.css'

const categorias = ['Fuerza', 'Metabólico', 'Velocidad', 'Pliometría', 'Agilidad']
const miembros = ['Central', 'Inferior', 'Superior']
const lateralidades = ['Mixto', 'Unilateral', 'Bilateral']
const patrones = [
  'Aducción', 'Abducción', 'Empuje Vertical', 'Tracción Vertical', 'Empuje Horizontal',
  'Tracción Horizontal', 'Bisagra', 'Sentadilla', 'Flexión', 'Extensión',
  'Inclinación Lateral', 'Rotación', 'Split',
]
const contraccionesPorFamilia = {
  'Dinámico': ['Balístico', 'Oscilatorio', 'Excéntrico', 'CEA'],
  'Isométrico': ['Iso-Hold', 'Iso-Catch', 'Iso-Push', 'Iso-Switch'],
}
const materiales = [
  'Goma', 'FitBall', 'ZeroRM', 'Mancuerna', 'Barra', 'Disco', 'Pelota Tenis', 'Banco',
  'Pica Madera', 'Cono', 'Comba', 'BattleRope', 'Rack', 'Balón Medicinal', 'KettleBell',
  'Saco Arena', 'Aquabag', 'Aquaball', 'Chaleco Lastrado', 'Barra Hexagonal', 'Safety Bar',
  'SlamBall', 'Anillas', 'TRX',
]

const vacio = {
  nombre: '', url_youtube: '', categoria: 'Fuerza', miembro: '', lateralidad: '',
  patron: '', contraccion: '', material: [], notas: '',
}

function extraerYoutubeId(url) {
  const patronesUrl = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patronesUrl) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}

export default function BibliotecaEjercicios() {
  const [ejercicios, setEjercicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [form, setForm] = useState(vacio)
  const [editandoId, setEditandoId] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [borrandoId, setBorrandoId] = useState(null)
  const [formularioAbierto, setFormularioAbierto] = useState(false)

  const [filtroTexto, setFiltroTexto] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState('')
  const [filtroMiembro, setFiltroMiembro] = useState('')
  const [filtroPatron, setFiltroPatron] = useState('')
  const [filtroMaterial, setFiltroMaterial] = useState('')

  useEffect(() => { cargarEjercicios() }, [])

  async function cargarEjercicios() {
    setCargando(true)
    const { data } = await supabase.from('ejercicios').select('*').order('nombre')
    setEjercicios(data || [])
    setCargando(false)
  }

  const youtubeIdPreview = extraerYoutubeId(form.url_youtube)

  function alternarMaterial(mat) {
    setForm((f) => ({
      ...f,
      material: f.material.includes(mat) ? f.material.filter((m) => m !== mat) : [...f.material, mat],
    }))
  }

  function empezarEdicion(ej) {
    setForm({
      nombre: ej.nombre, url_youtube: ej.url_youtube, categoria: ej.categoria,
      miembro: ej.miembro || '', lateralidad: ej.lateralidad || '', patron: ej.patron || '',
      contraccion: ej.contraccion || '', material: ej.material || [], notas: ej.notas || '',
    })
    setEditandoId(ej.id)
    setFormularioAbierto(true)
    setMensaje(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicion() {
    setForm(vacio)
    setEditandoId(null)
    setFormularioAbierto(false)
    setMensaje(null)
  }

  async function guardarEjercicio(e) {
    e.preventDefault()
    if (!form.nombre.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ponle un nombre al ejercicio.' })
      return
    }
    const youtubeId = extraerYoutubeId(form.url_youtube)
    if (!youtubeId) {
      setMensaje({ tipo: 'error', texto: 'No reconozco ese enlace de YouTube. Prueba con la URL completa.' })
      return
    }

    setGuardando(true)
    setMensaje(null)
    const payload = {
      nombre: form.nombre.trim(),
      url_youtube: form.url_youtube.trim(),
      youtube_id: youtubeId,
      categoria: form.categoria,
      miembro: form.miembro || null,
      lateralidad: form.lateralidad || null,
      patron: form.patron || null,
      contraccion: form.contraccion || null,
      material: form.material.length > 0 ? form.material : null,
      notas: form.notas || null,
    }

    const { error } = editandoId
      ? await supabase.from('ejercicios').update(payload).eq('id', editandoId)
      : await supabase.from('ejercicios').insert(payload)

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar el ejercicio.' })
    } else {
      setMensaje({ tipo: 'ok', texto: editandoId ? 'Ejercicio actualizado.' : 'Ejercicio añadido a la biblioteca.' })
      setForm(vacio)
      setEditandoId(null)
      cargarEjercicios()
    }
    setGuardando(false)
  }

  async function eliminarEjercicio(id) {
    if (!window.confirm('¿Eliminar este ejercicio de la biblioteca?')) return
    setBorrandoId(id)
    const { error } = await supabase.from('ejercicios').delete().eq('id', id)
    if (!error) setEjercicios((prev) => prev.filter((e) => e.id !== id))
    setBorrandoId(null)
  }

  const ejerciciosFiltrados = useMemo(() => {
    return ejercicios.filter((ej) => {
      if (filtroTexto && !ej.nombre.toLowerCase().includes(filtroTexto.toLowerCase())) return false
      if (filtroCategoria && ej.categoria !== filtroCategoria) return false
      if (filtroMiembro && ej.miembro !== filtroMiembro) return false
      if (filtroPatron && ej.patron !== filtroPatron) return false
      if (filtroMaterial && !(ej.material || []).includes(filtroMaterial)) return false
      return true
    })
  }, [ejercicios, filtroTexto, filtroCategoria, filtroMiembro, filtroPatron, filtroMaterial])

  return (
    <div className="biblioteca-layout">
      <div className="biblioteca-cabecera">
        <div>
          <h2>App Entrenamiento — Biblioteca de ejercicios</h2>
          <p className="texto-dim">
            Sección aparte del control de cargas. Aquí se construye tu catálogo de ejercicios con vídeo y
            etiquetas — la base para los futuros programas y prescripciones.
          </p>
        </div>
        {!formularioAbierto && (
          <button className="btn-principal biblioteca-boton-nuevo" onClick={() => setFormularioAbierto(true)}>
            + Añadir ejercicio
          </button>
        )}
      </div>

      {formularioAbierto && (
        <section className="biblioteca-form-card">
          <h3>{editandoId ? 'Editar ejercicio' : 'Nuevo ejercicio'}</h3>
          <form onSubmit={guardarEjercicio}>
            <div className="fila-doble">
              <label className="campo-sesion">
                <span>Nombre</span>
                <input
                  type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })}
                  placeholder="Ej. Sentadilla búlgara" required
                />
              </label>
              <label className="campo-sesion">
                <span>Enlace de YouTube</span>
                <input
                  type="text" value={form.url_youtube} onChange={(e) => setForm({ ...form, url_youtube: e.target.value })}
                  placeholder="https://youtube.com/watch?v=…" required
                />
              </label>
            </div>

            {youtubeIdPreview && (
              <div className="biblioteca-preview-video">
                <img src={`https://img.youtube.com/vi/${youtubeIdPreview}/mqdefault.jpg`} alt="Miniatura del vídeo" />
                <span className="texto-dim">Vídeo reconocido correctamente ✓</span>
              </div>
            )}

            <div className="fila-doble">
              <label className="campo-sesion">
                <span>Categoría</span>
                <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
                  {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>
              <label className="campo-sesion">
                <span>Miembro</span>
                <select value={form.miembro} onChange={(e) => setForm({ ...form, miembro: e.target.value })}>
                  <option value="">Sin especificar</option>
                  {miembros.map((m) => <option key={m} value={m}>{m}</option>)}
                </select>
              </label>
            </div>

            <div className="fila-doble">
              <label className="campo-sesion">
                <span>Lateralidad</span>
                <select value={form.lateralidad} onChange={(e) => setForm({ ...form, lateralidad: e.target.value })}>
                  <option value="">Sin especificar</option>
                  {lateralidades.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </label>
              <label className="campo-sesion">
                <span>Patrón de movimiento</span>
                <select value={form.patron} onChange={(e) => setForm({ ...form, patron: e.target.value })}>
                  <option value="">Sin especificar</option>
                  {patrones.map((p) => <option key={p} value={p}>{p}</option>)}
                </select>
              </label>
            </div>

            <label className="campo-sesion">
              <span>Contracción</span>
              <select value={form.contraccion} onChange={(e) => setForm({ ...form, contraccion: e.target.value })}>
                <option value="">Sin especificar</option>
                {Object.entries(contraccionesPorFamilia).map(([familia, opciones]) => (
                  <optgroup key={familia} label={familia}>
                    {opciones.map((c) => <option key={c} value={c}>{c}</option>)}
                  </optgroup>
                ))}
              </select>
            </label>

            <label className="campo-sesion">
              <span>Material (puedes marcar varios)</span>
              <div className="biblioteca-material-chips">
                {materiales.map((mat) => (
                  <button
                    key={mat} type="button"
                    className={`biblioteca-chip ${form.material.includes(mat) ? 'biblioteca-chip-activo' : ''}`}
                    onClick={() => alternarMaterial(mat)}
                  >
                    {mat}
                  </button>
                ))}
              </div>
            </label>

            <label className="campo-sesion">
              <span>Notas (opcional)</span>
              <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={2} />
            </label>

            {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}

            <div className="mis-datos-botones">
              <button type="submit" className="btn-principal" disabled={guardando}>
                {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : '+ Añadir a la biblioteca'}
              </button>
              <button type="button" className="equipo-cancelar" onClick={cancelarEdicion}>Cancelar</button>
            </div>
          </form>
        </section>
      )}

      <section className="biblioteca-filtros-card">
        <input
          type="text" className="biblioteca-buscador" placeholder="Buscar por nombre…"
          value={filtroTexto} onChange={(e) => setFiltroTexto(e.target.value)}
        />
        <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={filtroMiembro} onChange={(e) => setFiltroMiembro(e.target.value)}>
          <option value="">Todos los miembros</option>
          {miembros.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <select value={filtroPatron} onChange={(e) => setFiltroPatron(e.target.value)}>
          <option value="">Todos los patrones</option>
          {patrones.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <select value={filtroMaterial} onChange={(e) => setFiltroMaterial(e.target.value)}>
          <option value="">Todo el material</option>
          {materiales.map((m) => <option key={m} value={m}>{m}</option>)}
        </select>
        <span className="texto-dim mono biblioteca-contador">{ejerciciosFiltrados.length} de {ejercicios.length}</span>
      </section>

      {cargando ? (
        <p className="mono texto-dim">Cargando biblioteca…</p>
      ) : ejerciciosFiltrados.length === 0 ? (
        <p className="texto-dim">
          {ejercicios.length === 0 ? 'Todavía no hay ningún ejercicio en la biblioteca.' : 'Ningún ejercicio coincide con los filtros.'}
        </p>
      ) : (
        <div className="biblioteca-grid">
          {ejerciciosFiltrados.map((ej) => (
            <div className="biblioteca-tarjeta" key={ej.id}>
              <div className="biblioteca-tarjeta-video">
                <img src={`https://img.youtube.com/vi/${ej.youtube_id}/mqdefault.jpg`} alt={ej.nombre} />
                <a href={ej.url_youtube} target="_blank" rel="noopener noreferrer" className="biblioteca-tarjeta-play">▶</a>
              </div>
              <div className="biblioteca-tarjeta-cuerpo">
                <h4>{ej.nombre}</h4>
                <div className="biblioteca-tarjeta-etiquetas">
                  <span className="biblioteca-etiqueta biblioteca-etiqueta-categoria">{ej.categoria}</span>
                  {ej.miembro && <span className="biblioteca-etiqueta">{ej.miembro}</span>}
                  {ej.lateralidad && <span className="biblioteca-etiqueta">{ej.lateralidad}</span>}
                  {ej.patron && <span className="biblioteca-etiqueta">{ej.patron}</span>}
                  {ej.contraccion && <span className="biblioteca-etiqueta">{ej.contraccion}</span>}
                  {(ej.material || []).map((m) => <span className="biblioteca-etiqueta biblioteca-etiqueta-material" key={m}>{m}</span>)}
                </div>
                {ej.notas && <p className="biblioteca-tarjeta-notas">{ej.notas}</p>}
                <div className="biblioteca-tarjeta-acciones">
                  <button className="equipo-cambiar-link" onClick={() => empezarEdicion(ej)}>Editar</button>
                  <button
                    className="btn-eliminar-fila" onClick={() => eliminarEjercicio(ej.id)}
                    disabled={borrandoId === ej.id} title="Eliminar ejercicio"
                  >
                    {borrandoId === ej.id ? '…' : '✕'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
