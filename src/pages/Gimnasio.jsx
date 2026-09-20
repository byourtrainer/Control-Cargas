import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Gimnasio.css'

const itemVacio = {
  ejercicio_id: null, ejercicio: null,
  series: '', repeticiones: '', repeticiones_por_lado: false, intensidad: '',
  tiempo_trabajo: '', descanso_repeticiones: '', descanso_series: '', notas: '',
}

let contadorBloqueTemp = 0
function bloqueVacio(nombre = '') {
  contadorBloqueTemp += 1
  return { id: `nuevo-${contadorBloqueTemp}`, nombre, items: [] }
}

const diasSemana = [
  { n: 1, l: 'Lun' }, { n: 2, l: 'Mar' }, { n: 3, l: 'Mié' }, { n: 4, l: 'Jue' },
  { n: 5, l: 'Vie' }, { n: 6, l: 'Sáb' }, { n: 7, l: 'Dom' },
]

export default function Gimnasio({ perfil }) {
  const [seccion, setSeccion] = useState('sesiones') // 'sesiones' | 'programas' | 'asignar'

  return (
    <div className="gimnasio-layout">
      <div className="gimnasio-cabecera">
        <div>
          <h2>Gimnasio</h2>
          <p className="texto-dim">
            Sesiones y programas de entrenamiento de gimnasio, para asignar a clientes de entrenamiento
            personal o a jugadores de equipo — distinto del trabajo de pista.
          </p>
        </div>
      </div>

      <div className="gimnasio-subnav">
        <button className={`periodo-btn ${seccion === 'sesiones' ? 'periodo-activo' : ''}`} onClick={() => setSeccion('sesiones')}>
          📋 Sesiones
        </button>
        <button className={`periodo-btn ${seccion === 'programas' ? 'periodo-activo' : ''}`} onClick={() => setSeccion('programas')}>
          🗓 Programas
        </button>
        <button className={`periodo-btn ${seccion === 'asignar' ? 'periodo-activo' : ''}`} onClick={() => setSeccion('asignar')}>
          ➜ Asignar
        </button>
      </div>

      {seccion === 'sesiones' ? <SeccionSesiones perfil={perfil} />
        : seccion === 'programas' ? <SeccionProgramas perfil={perfil} />
        : <SeccionAsignar perfil={perfil} />}
    </div>
  )
}

// ============================================================
// SESIONES (plantillas de sesión de gimnasio)
// ============================================================

function SeccionSesiones({ perfil }) {
  const [plantillas, setPlantillas] = useState([])
  const [ejercicios, setEjercicios] = useState([])
  const [cargando, setCargando] = useState(true)
  const [plantillaActivaId, setPlantillaActivaId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [notas, setNotas] = useState('')
  const [bloques, setBloques] = useState([])
  const [modalAbierto, setModalAbierto] = useState(false)
  const [bloqueDestinoIdx, setBloqueDestinoIdx] = useState(null)
  const [filtroBiblioteca, setFiltroBiblioteca] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => { cargarPlantillas(); cargarEjercicios() }, [])

  async function cargarPlantillas() {
    setCargando(true)
    const { data } = await supabase
      .from('gimnasio_plantillas')
      .select('*, gimnasio_plantilla_bloques(id, gimnasio_plantilla_items(id))')
      .order('nombre')
    setPlantillas(data || [])
    setCargando(false)
  }

  async function cargarEjercicios() {
    const { data } = await supabase.from('ejercicios').select('*').order('nombre')
    setEjercicios(data || [])
  }

  function nuevaPlantilla() {
    setPlantillaActivaId('nueva')
    setNombre('')
    setNotas('')
    setBloques([bloqueVacio()])
    setMensaje(null)
  }

  async function abrirPlantilla(p) {
    setPlantillaActivaId(p.id)
    setNombre(p.nombre)
    setNotas(p.notas || '')
    setMensaje(null)
    const { data: bloquesData } = await supabase
      .from('gimnasio_plantilla_bloques')
      .select('*')
      .eq('plantilla_id', p.id)
      .order('orden')
    const idsBloques = (bloquesData || []).map((b) => b.id)
    let itemsData = []
    if (idsBloques.length > 0) {
      const { data } = await supabase
        .from('gimnasio_plantilla_items')
        .select('*, ejercicio:ejercicios(*)')
        .in('bloque_id', idsBloques)
        .order('orden')
      itemsData = data || []
    }
    const cargados = (bloquesData || []).map((b) => ({
      ...b,
      items: itemsData.filter((it) => it.bloque_id === b.id),
    }))
    setBloques(cargados.length > 0 ? cargados : [bloqueVacio()])
  }

  function volverALista() {
    setPlantillaActivaId(null)
    setBloques([])
  }

  function nuevoBloque() {
    setBloques((prev) => [...prev, bloqueVacio()])
  }

  function renombrarBloque(bi, valor) {
    setBloques((prev) => prev.map((b, idx) => (idx === bi ? { ...b, nombre: valor } : b)))
  }

  function moverBloque(bi, delta) {
    setBloques((prev) => {
      const copia = [...prev]
      const j = bi + delta
      if (j < 0 || j >= copia.length) return prev
      ;[copia[bi], copia[j]] = [copia[j], copia[bi]]
      return copia
    })
  }

  function eliminarBloque(bi) {
    if (!window.confirm('¿Eliminar este bloque y todos sus ejercicios?')) return
    setBloques((prev) => prev.filter((_, idx) => idx !== bi))
  }

  function abrirModalParaBloque(bi) {
    setBloqueDestinoIdx(bi)
    setModalAbierto(true)
  }

  function anadirEjercicio(ej) {
    if (bloqueDestinoIdx === null) return
    setBloques((prev) => prev.map((b, idx) => (
      idx === bloqueDestinoIdx ? { ...b, items: [...b.items, { ...itemVacio, ejercicio_id: ej.id, ejercicio: ej }] } : b
    )))
  }

  function quitarItem(bi, ii) {
    setBloques((prev) => prev.map((b, idx) => (
      idx === bi ? { ...b, items: b.items.filter((_, i2) => i2 !== ii) } : b
    )))
  }

  function moverItem(bi, ii, delta) {
    setBloques((prev) => prev.map((b, idx) => {
      if (idx !== bi) return b
      const copia = [...b.items]
      const j = ii + delta
      if (j < 0 || j >= copia.length) return b
      ;[copia[ii], copia[j]] = [copia[j], copia[ii]]
      return { ...b, items: copia }
    }))
  }

  function actualizarItem(bi, ii, cambios) {
    setBloques((prev) => prev.map((b, idx) => (
      idx === bi ? { ...b, items: b.items.map((it, i2) => (i2 === ii ? { ...it, ...cambios } : it)) } : b
    )))
  }

  async function guardarPlantilla() {
    if (!nombre.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ponle un nombre a la sesión.' })
      return
    }
    const totalItems = bloques.reduce((n, b) => n + b.items.length, 0)
    if (totalItems === 0) {
      setMensaje({ tipo: 'error', texto: 'Añade al menos un ejercicio desde la biblioteca.' })
      return
    }
    setGuardando(true)
    setMensaje(null)

    let idPlantilla = plantillaActivaId
    if (plantillaActivaId === 'nueva') {
      const { data, error } = await supabase.from('gimnasio_plantillas')
        .insert({ nombre: nombre.trim(), notas: notas || null, club_id: perfil?.club_id || null, creado_por: perfil?.id || null })
        .select().single()
      if (error) { setMensaje({ tipo: 'error', texto: 'No se pudo crear la sesión: ' + error.message }); setGuardando(false); return }
      idPlantilla = data.id
    } else {
      const { error } = await supabase.from('gimnasio_plantillas')
        .update({ nombre: nombre.trim(), notas: notas || null })
        .eq('id', idPlantilla)
      if (error) { setMensaje({ tipo: 'error', texto: 'No se pudo actualizar la sesión: ' + error.message }); setGuardando(false); return }
      // Al borrar los bloques se borran en cascada sus ejercicios.
      await supabase.from('gimnasio_plantilla_bloques').delete().eq('plantilla_id', idPlantilla)
    }

    const filasItems = []
    for (let bi = 0; bi < bloques.length; bi++) {
      const b = bloques[bi]
      const { data: bloqueGuardado, error: errorBloque } = await supabase
        .from('gimnasio_plantilla_bloques')
        .insert({ plantilla_id: idPlantilla, nombre: b.nombre.trim() || `Bloque ${bi + 1}`, orden: bi })
        .select().single()
      if (errorBloque) {
        setMensaje({ tipo: 'error', texto: 'No se pudo guardar un bloque: ' + errorBloque.message })
        setGuardando(false)
        return
      }
      b.items.forEach((it, ii) => {
        filasItems.push({
          bloque_id: bloqueGuardado.id, ejercicio_id: it.ejercicio_id, orden: ii,
          series: it.series || null, repeticiones: it.repeticiones || null,
          repeticiones_por_lado: !!it.repeticiones_por_lado, intensidad: it.intensidad || null,
          tiempo_trabajo: it.tiempo_trabajo || null,
          descanso_repeticiones: it.descanso_repeticiones || null,
          descanso_series: it.descanso_series || null,
          notas: it.notas || null,
        })
      })
    }

    if (filasItems.length > 0) {
      const { error: errorItems } = await supabase.from('gimnasio_plantilla_items').insert(filasItems)
      if (errorItems) {
        setMensaje({ tipo: 'error', texto: 'La sesión se guardó, pero hubo un problema con los ejercicios: ' + errorItems.message })
        setGuardando(false)
        return
      }
    }

    setMensaje({ tipo: 'ok', texto: 'Sesión guardada.' })
    setPlantillaActivaId(idPlantilla)
    cargarPlantillas()
    setGuardando(false)
  }

  async function eliminarPlantilla(id) {
    if (!window.confirm('¿Eliminar esta sesión de gimnasio? También se quitará de cualquier programa que la use.')) return
    await supabase.from('gimnasio_plantillas').delete().eq('id', id)
    if (plantillaActivaId === id) volverALista()
    cargarPlantillas()
  }

  const bibliotecaFiltrada = useMemo(() => {
    const q = filtroBiblioteca.trim().toLowerCase()
    if (!q) return ejercicios
    return ejercicios.filter((ej) =>
      ej.nombre.toLowerCase().includes(q) ||
      (ej.categoria || '').toLowerCase().includes(q) ||
      (ej.patron || '').toLowerCase().includes(q) ||
      (ej.material || []).some((m) => m.toLowerCase().includes(q))
    )
  }, [ejercicios, filtroBiblioteca])

  if (cargando) return <p className="mono texto-dim">Cargando…</p>

  if (!plantillaActivaId) {
    return (
      <div className="gimnasio-seccion">
        <div className="gimnasio-seccion-cabecera">
          <h3>Sesiones de gimnasio</h3>
          <button className="btn-principal" onClick={nuevaPlantilla}>+ Nueva sesión</button>
        </div>
        {plantillas.length === 0 ? (
          <p className="texto-dim">Todavía no has creado ninguna sesión de gimnasio.</p>
        ) : (
          <div className="gimnasio-lista">
            {plantillas.map((p) => {
              const totalEjercicios = (p.gimnasio_plantilla_bloques || []).reduce((n, b) => n + (b.gimnasio_plantilla_items?.length || 0), 0)
              return (
                <button key={p.id} className="gimnasio-tarjeta" onClick={() => abrirPlantilla(p)}>
                  <div>
                    <strong>{p.nombre}</strong>
                    <span className="texto-dim">
                      {(p.gimnasio_plantilla_bloques || []).length} bloque(s) · {totalEjercicios} ejercicio(s)
                    </span>
                  </div>
                  <span className="btn-eliminar-fila" onClick={(e) => { e.stopPropagation(); eliminarPlantilla(p.id) }} title="Eliminar sesión">✕</span>
                </button>
              )
            })}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="gimnasio-seccion">
      <div className="gimnasio-seccion-cabecera">
        <button className="pizarra-boton" onClick={volverALista}>← Volver a sesiones</button>
      </div>

      <section className="sesiones-form-card">
        <label className="campo-sesion">
          <span>Nombre de la sesión</span>
          <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Tren superior — fuerza" required />
        </label>
        <label className="campo-sesion">
          <span>Notas (opcional)</span>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
        </label>
      </section>

      <div className="gimnasio-bloques-lista">
        {bloques.map((b, bi) => (
          <section className="gimnasio-bloque-card" key={b.id}>
            <div className="gimnasio-bloque-cabecera">
              <input
                type="text" className="gimnasio-bloque-nombre-input"
                value={b.nombre} onChange={(e) => renombrarBloque(bi, e.target.value)}
                placeholder={`Ej. Calentamiento`}
              />
              <div className="sesiones-item-mover">
                <button type="button" onClick={() => moverBloque(bi, -1)} disabled={bi === 0} title="Subir bloque">↑</button>
                <button type="button" onClick={() => moverBloque(bi, 1)} disabled={bi === bloques.length - 1} title="Bajar bloque">↓</button>
                <button type="button" className="btn-eliminar-fila" onClick={() => eliminarBloque(bi)} title="Eliminar bloque">✕</button>
              </div>
            </div>

            {b.items.length === 0 ? (
              <p className="texto-dim">Todavía no hay ejercicios en este bloque.</p>
            ) : (
              <div className="sesiones-items-lista">
                {b.items.map((it, ii) => (
                  <div className="sesiones-item-card" key={ii}>
                    {it.ejercicio.youtube_id ? (
                      <img src={`https://img.youtube.com/vi/${it.ejercicio.youtube_id}/mqdefault.jpg`} alt={it.ejercicio.nombre} className="sesiones-item-imagen" />
                    ) : (
                      <div className="sesiones-item-imagen gimnasio-item-sin-imagen">Sin vídeo</div>
                    )}
                    <div className="sesiones-item-cuerpo">
                      <div className="sesiones-item-cabecera">
                        <strong>{ii + 1}. {it.ejercicio.nombre}</strong>
                        <div className="sesiones-item-mover">
                          <button type="button" onClick={() => moverItem(bi, ii, -1)} disabled={ii === 0}>↑</button>
                          <button type="button" onClick={() => moverItem(bi, ii, 1)} disabled={ii === b.items.length - 1}>↓</button>
                          <button type="button" className="btn-eliminar-fila" onClick={() => quitarItem(bi, ii)}>✕</button>
                        </div>
                      </div>
                      <div className="sesiones-item-variables gimnasio-item-variables">
                        <input placeholder="Series" value={it.series} onChange={(e) => actualizarItem(bi, ii, { series: e.target.value })} />
                        <input placeholder="Repeticiones" value={it.repeticiones} onChange={(e) => actualizarItem(bi, ii, { repeticiones: e.target.value })} />
                        <label className="gimnasio-checkbox-por-lado">
                          <input
                            type="checkbox" checked={it.repeticiones_por_lado}
                            onChange={(e) => actualizarItem(bi, ii, { repeticiones_por_lado: e.target.checked })}
                          />
                          <span>Por lado</span>
                        </label>
                        <input placeholder="Intensidad" value={it.intensidad} onChange={(e) => actualizarItem(bi, ii, { intensidad: e.target.value })} />
                        <input placeholder="Duración / t. trabajo" value={it.tiempo_trabajo} onChange={(e) => actualizarItem(bi, ii, { tiempo_trabajo: e.target.value })} />
                        <input placeholder="Descanso entre reps." value={it.descanso_repeticiones} onChange={(e) => actualizarItem(bi, ii, { descanso_repeticiones: e.target.value })} />
                        <input placeholder="Descanso entre series" value={it.descanso_series} onChange={(e) => actualizarItem(bi, ii, { descanso_series: e.target.value })} />
                      </div>
                      <input
                        className="sesiones-item-notas-input" placeholder="Notas para este ejercicio (opcional)"
                        value={it.notas} onChange={(e) => actualizarItem(bi, ii, { notas: e.target.value })}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button type="button" className="pizarra-boton gimnasio-bloque-anadir" onClick={() => abrirModalParaBloque(bi)}>
              🔍 Añadir ejercicio a este bloque
            </button>
          </section>
        ))}
      </div>

      <button type="button" className="pizarra-boton" onClick={nuevoBloque}>+ Añadir bloque</button>

      {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}
      <button className="btn-principal" onClick={guardarPlantilla} disabled={guardando}>
        {guardando ? 'Guardando…' : '+ Guardar sesión'}
      </button>

      {modalAbierto && (
        <div className="sesiones-modal-fondo" onClick={() => setModalAbierto(false)}>
          <div className="sesiones-modal-biblioteca" onClick={(e) => e.stopPropagation()}>
            <div className="sesiones-modal-cabecera">
              <h3>Biblioteca de ejercicios{bloqueDestinoIdx !== null && bloques[bloqueDestinoIdx] ? ` — ${bloques[bloqueDestinoIdx].nombre || 'bloque sin nombre'}` : ''}</h3>
              <button className="pizarra-boton" onClick={() => setModalAbierto(false)}>✕ Cerrar</button>
            </div>

            <input
              type="text" className="sesiones-modal-buscador" value={filtroBiblioteca}
              onChange={(e) => setFiltroBiblioteca(e.target.value)} placeholder="Buscar por nombre, categoría, patrón o material…"
              autoFocus
            />

            <p className="texto-dim sesiones-modal-contador">{bibliotecaFiltrada.length} ejercicio(s)</p>

            <div className="pizarra-galeria sesiones-modal-grid">
              {bibliotecaFiltrada.map((ej) => (
                <div
                  key={ej.id} className="pizarra-galeria-item sesiones-modal-item"
                  role="button" tabIndex={0}
                  onClick={() => anadirEjercicio(ej)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); anadirEjercicio(ej) } }}
                >
                  {ej.youtube_id ? (
                    <img src={`https://img.youtube.com/vi/${ej.youtube_id}/mqdefault.jpg`} alt={ej.nombre} />
                  ) : (
                    <div className="gimnasio-item-sin-imagen">Sin vídeo</div>
                  )}
                  <div className="pizarra-galeria-info">
                    <strong>{ej.nombre}</strong>
                    <div className="pizarra-etiquetas-chips">
                      <span className="pizarra-etiqueta-chip pizarra-etiqueta-chip-lectura">{ej.categoria}</span>
                      {ej.miembro && <span className="pizarra-etiqueta-chip pizarra-etiqueta-chip-lectura">{ej.miembro}</span>}
                      {ej.patron && <span className="pizarra-etiqueta-chip pizarra-etiqueta-chip-lectura">{ej.patron}</span>}
                    </div>
                    <span className="sesiones-modal-item-anadir">+ Añadir</span>
                  </div>
                </div>
              ))}
              {bibliotecaFiltrada.length === 0 && <p className="texto-dim">Sin resultados.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// PROGRAMAS (varios días/semanas encadenando sesiones)
// ============================================================

function SeccionProgramas({ perfil }) {
  const [programas, setProgramas] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [cargando, setCargando] = useState(true)
  const [programaActivoId, setProgramaActivoId] = useState(null)
  const [nombre, setNombre] = useState('')
  const [semanas, setSemanas] = useState(4)
  const [notas, setNotas] = useState('')
  const [dias, setDias] = useState({}) // clave `${semana}-${dia_semana}` -> plantilla_id
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => { cargarProgramas(); cargarPlantillas() }, [])

  async function cargarProgramas() {
    setCargando(true)
    const { data } = await supabase
      .from('gimnasio_programas')
      .select('*, gimnasio_programa_dias(id)')
      .order('nombre')
    setProgramas(data || [])
    setCargando(false)
  }

  async function cargarPlantillas() {
    const { data } = await supabase.from('gimnasio_plantillas').select('id, nombre').order('nombre')
    setPlantillas(data || [])
  }

  function nuevoPrograma() {
    setProgramaActivoId('nuevo')
    setNombre('')
    setSemanas(4)
    setNotas('')
    setDias({})
    setMensaje(null)
  }

  async function abrirPrograma(p) {
    setProgramaActivoId(p.id)
    setNombre(p.nombre)
    setSemanas(p.semanas)
    setNotas(p.notas || '')
    setMensaje(null)
    const { data } = await supabase.from('gimnasio_programa_dias').select('*').eq('programa_id', p.id)
    const mapa = {}
    ;(data || []).forEach((d) => { mapa[`${d.semana}-${d.dia_semana}`] = d.plantilla_id })
    setDias(mapa)
  }

  function volverALista() {
    setProgramaActivoId(null)
    setDias({})
  }

  function alCambiarDia(semana, diaSemana, plantillaId) {
    setDias((prev) => {
      const copia = { ...prev }
      const clave = `${semana}-${diaSemana}`
      if (!plantillaId) delete copia[clave]
      else copia[clave] = plantillaId
      return copia
    })
  }

  async function guardarPrograma() {
    if (!nombre.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ponle un nombre al programa.' })
      return
    }
    const numSemanas = Math.max(1, Math.min(52, Number(semanas) || 1))
    setGuardando(true)
    setMensaje(null)

    let idPrograma = programaActivoId
    if (programaActivoId === 'nuevo') {
      const { data, error } = await supabase.from('gimnasio_programas')
        .insert({ nombre: nombre.trim(), semanas: numSemanas, notas: notas || null, club_id: perfil?.club_id || null, creado_por: perfil?.id || null })
        .select().single()
      if (error) { setMensaje({ tipo: 'error', texto: 'No se pudo crear el programa: ' + error.message }); setGuardando(false); return }
      idPrograma = data.id
    } else {
      const { error } = await supabase.from('gimnasio_programas')
        .update({ nombre: nombre.trim(), semanas: numSemanas, notas: notas || null })
        .eq('id', idPrograma)
      if (error) { setMensaje({ tipo: 'error', texto: 'No se pudo actualizar el programa: ' + error.message }); setGuardando(false); return }
      await supabase.from('gimnasio_programa_dias').delete().eq('programa_id', idPrograma)
    }

    const filas = Object.entries(dias).map(([clave, plantillaId]) => {
      const [semana, diaSemana] = clave.split('-').map(Number)
      return { programa_id: idPrograma, semana, dia_semana: diaSemana, plantilla_id: plantillaId }
    })

    if (filas.length > 0) {
      const { error: errorDias } = await supabase.from('gimnasio_programa_dias').insert(filas)
      if (errorDias) {
        setMensaje({ tipo: 'error', texto: 'El programa se guardó, pero hubo un problema con los días: ' + errorDias.message })
        setGuardando(false)
        return
      }
    }

    setMensaje({ tipo: 'ok', texto: 'Programa guardado.' })
    setProgramaActivoId(idPrograma)
    cargarProgramas()
    setGuardando(false)
  }

  async function eliminarPrograma(id) {
    if (!window.confirm('¿Eliminar este programa completo?')) return
    await supabase.from('gimnasio_programas').delete().eq('id', id)
    if (programaActivoId === id) volverALista()
    cargarProgramas()
  }

  if (cargando) return <p className="mono texto-dim">Cargando…</p>

  if (!programaActivoId) {
    return (
      <div className="gimnasio-seccion">
        <div className="gimnasio-seccion-cabecera">
          <h3>Programas de entrenamiento</h3>
          <button className="btn-principal" onClick={nuevoPrograma}>+ Nuevo programa</button>
        </div>
        {plantillas.length === 0 && (
          <p className="texto-dim">Crea primero alguna sesión de gimnasio en la pestaña «Sesiones» para poder usarla aquí.</p>
        )}
        {programas.length === 0 ? (
          <p className="texto-dim">Todavía no has creado ningún programa.</p>
        ) : (
          <div className="gimnasio-lista">
            {programas.map((p) => (
              <button key={p.id} className="gimnasio-tarjeta" onClick={() => abrirPrograma(p)}>
                <div>
                  <strong>{p.nombre}</strong>
                  <span className="texto-dim">{p.semanas} semana(s) · {p.gimnasio_programa_dias?.length || 0} día(s) con sesión</span>
                </div>
                <span className="btn-eliminar-fila" onClick={(e) => { e.stopPropagation(); eliminarPrograma(p.id) }} title="Eliminar programa">✕</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="gimnasio-seccion">
      <div className="gimnasio-seccion-cabecera">
        <button className="pizarra-boton" onClick={volverALista}>← Volver a programas</button>
      </div>

      <section className="sesiones-form-card">
        <div className="fila-doble">
          <label className="campo-sesion">
            <span>Nombre del programa</span>
            <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Ej. Bloque de fuerza — Octubre" required />
          </label>
          <label className="campo-sesion">
            <span>Duración (semanas)</span>
            <input type="number" min="1" max="52" value={semanas} onChange={(e) => setSemanas(e.target.value)} />
          </label>
        </div>
        <label className="campo-sesion">
          <span>Notas (opcional)</span>
          <textarea value={notas} onChange={(e) => setNotas(e.target.value)} rows={2} />
        </label>
      </section>

      {plantillas.length === 0 ? (
        <p className="texto-dim">Crea primero alguna sesión de gimnasio en la pestaña «Sesiones» para poder asignarla a los días.</p>
      ) : (
        <section className="gimnasio-programa-grid-wrap">
          <h3>Calendario del programa</h3>
          <p className="texto-dim">Para cada semana, elige qué sesión de gimnasio toca en cada día (déjalo vacío para descanso).</p>
          <div className="gimnasio-programa-grid">
            <div className="gimnasio-programa-fila gimnasio-programa-cabecera-fila">
              <span></span>
              {diasSemana.map((d) => <span key={d.n}>{d.l}</span>)}
            </div>
            {Array.from({ length: Math.max(1, Math.min(52, Number(semanas) || 1)) }, (_, i) => i + 1).map((semana) => (
              <div className="gimnasio-programa-fila" key={semana}>
                <span className="gimnasio-programa-semana-label">Sem. {semana}</span>
                {diasSemana.map((d) => (
                  <select
                    key={d.n}
                    value={dias[`${semana}-${d.n}`] || ''}
                    onChange={(e) => alCambiarDia(semana, d.n, e.target.value)}
                  >
                    <option value="">—</option>
                    {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                  </select>
                ))}
              </div>
            ))}
          </div>
        </section>
      )}

      {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}
      <button className="btn-principal" onClick={guardarPrograma} disabled={guardando}>
        {guardando ? 'Guardando…' : '+ Guardar programa'}
      </button>
    </div>
  )
}

// ============================================================
// ASIGNAR (sesión única o programa, a un cliente o jugador)
// ============================================================

function SeccionAsignar({ perfil }) {
  const [asignaciones, setAsignaciones] = useState([])
  const [clientes, setClientes] = useState([])
  const [jugadores, setJugadores] = useState([])
  const [plantillas, setPlantillas] = useState([])
  const [programas, setProgramas] = useState([])
  const [cargando, setCargando] = useState(true)

  const [destinatarioTipo, setDestinatarioTipo] = useState('cliente')
  const [destinatarioId, setDestinatarioId] = useState('')
  const [tipo, setTipo] = useState('sesion')
  const [plantillaId, setPlantillaId] = useState('')
  const [programaId, setProgramaId] = useState('')
  const [fechaInicio, setFechaInicio] = useState('')
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    setCargando(true)
    const [r1, r2, r3, r4, r5] = await Promise.all([
      supabase.from('gimnasio_asignaciones').select('*').order('fecha_inicio', { ascending: false }),
      supabase.from('clientes').select('id, nombre').order('nombre'),
      supabase.from('perfiles').select('id, nombre').eq('rol', 'jugador').order('nombre'),
      supabase.from('gimnasio_plantillas').select('id, nombre').order('nombre'),
      supabase.from('gimnasio_programas').select('id, nombre').order('nombre'),
    ])
    setAsignaciones(r1.data || [])
    setClientes(r2.data || [])
    setJugadores(r3.data || [])
    setPlantillas(r4.data || [])
    setProgramas(r5.data || [])
    setCargando(false)
  }

  function nombreDestinatario(a) {
    const lista = a.destinatario_tipo === 'cliente' ? clientes : jugadores
    return lista.find((x) => x.id === a.destinatario_id)?.nombre || '—'
  }

  function nombreAsignado(a) {
    if (a.tipo === 'sesion') return plantillas.find((p) => p.id === a.plantilla_id)?.nombre || '—'
    return programas.find((p) => p.id === a.programa_id)?.nombre || '—'
  }

  async function crearAsignacion(e) {
    e.preventDefault()
    if (!destinatarioId) {
      setMensaje({ tipo: 'error', texto: 'Elige a quién se lo asignas.' })
      return
    }
    if (tipo === 'sesion' && !plantillaId) {
      setMensaje({ tipo: 'error', texto: 'Elige qué sesión asignar.' })
      return
    }
    if (tipo === 'programa' && !programaId) {
      setMensaje({ tipo: 'error', texto: 'Elige qué programa asignar.' })
      return
    }
    if (!fechaInicio) {
      setMensaje({ tipo: 'error', texto: 'Elige la fecha de inicio.' })
      return
    }
    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase.from('gimnasio_asignaciones').insert({
      destinatario_tipo: destinatarioTipo,
      destinatario_id: destinatarioId,
      tipo,
      plantilla_id: tipo === 'sesion' ? plantillaId : null,
      programa_id: tipo === 'programa' ? programaId : null,
      fecha_inicio: fechaInicio,
      notas: notas || null,
      asignado_por: perfil?.id || null,
    })
    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo asignar: ' + error.message })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Asignado correctamente.' })
      setDestinatarioId(''); setPlantillaId(''); setProgramaId(''); setFechaInicio(''); setNotas('')
      cargarTodo()
    }
    setGuardando(false)
  }

  async function eliminarAsignacion(id) {
    if (!window.confirm('¿Quitar esta asignación?')) return
    await supabase.from('gimnasio_asignaciones').delete().eq('id', id)
    cargarTodo()
  }

  const destinatarios = destinatarioTipo === 'cliente' ? clientes : jugadores

  if (cargando) return <p className="mono texto-dim">Cargando…</p>

  return (
    <div className="gimnasio-seccion">
      <h3>Asignar sesión o programa</h3>
      <section className="sesiones-form-card">
        <form onSubmit={crearAsignacion}>
          <div className="fila-doble">
            <label className="campo-sesion">
              <span>Destinatario</span>
              <select value={destinatarioTipo} onChange={(e) => { setDestinatarioTipo(e.target.value); setDestinatarioId('') }}>
                <option value="cliente">Cliente de entrenamiento personal</option>
                <option value="jugador">Jugador de equipo</option>
              </select>
            </label>
            <label className="campo-sesion">
              <span>{destinatarioTipo === 'cliente' ? 'Cliente' : 'Jugador'}</span>
              <select value={destinatarioId} onChange={(e) => setDestinatarioId(e.target.value)} required>
                <option value="">Elige…</option>
                {destinatarios.map((d) => <option key={d.id} value={d.id}>{d.nombre}</option>)}
              </select>
            </label>
          </div>

          <div className="fila-doble">
            <label className="campo-sesion">
              <span>Qué asignar</span>
              <select value={tipo} onChange={(e) => setTipo(e.target.value)}>
                <option value="sesion">Sesión única</option>
                <option value="programa">Programa completo</option>
              </select>
            </label>
            {tipo === 'sesion' ? (
              <label className="campo-sesion">
                <span>Sesión</span>
                <select value={plantillaId} onChange={(e) => setPlantillaId(e.target.value)} required>
                  <option value="">Elige…</option>
                  {plantillas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </label>
            ) : (
              <label className="campo-sesion">
                <span>Programa</span>
                <select value={programaId} onChange={(e) => setProgramaId(e.target.value)} required>
                  <option value="">Elige…</option>
                  {programas.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
                </select>
              </label>
            )}
          </div>

          <div className="fila-doble">
            <label className="campo-sesion">
              <span>Fecha de inicio</span>
              <input type="date" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} required />
            </label>
            <label className="campo-sesion">
              <span>Notas (opcional)</span>
              <input type="text" value={notas} onChange={(e) => setNotas(e.target.value)} />
            </label>
          </div>

          {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}
          <button type="submit" className="btn-principal" disabled={guardando}>
            {guardando ? 'Asignando…' : '+ Asignar'}
          </button>
        </form>
      </section>

      <h3>Asignaciones activas</h3>
      {asignaciones.length === 0 ? (
        <p className="texto-dim">Todavía no has asignado ninguna sesión ni programa.</p>
      ) : (
        <div className="panel-admin-tabla-clientes-wrap">
          <table className="panel-admin-tabla-clientes">
            <thead>
              <tr>
                <th>Destinatario</th>
                <th>Tipo</th>
                <th>Asignado</th>
                <th>Inicio</th>
                <th>Notas</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {asignaciones.map((a) => (
                <tr key={a.id}>
                  <td>{nombreDestinatario(a)} <span className="texto-faint">({a.destinatario_tipo})</span></td>
                  <td>{a.tipo === 'sesion' ? 'Sesión' : 'Programa'}</td>
                  <td>{nombreAsignado(a)}</td>
                  <td className="mono">{new Date(a.fecha_inicio + 'T00:00:00').toLocaleDateString('es-ES')}</td>
                  <td className="texto-dim">{a.notas || '—'}</td>
                  <td><button className="btn-eliminar-fila" onClick={() => eliminarAsignacion(a.id)}>✕</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
