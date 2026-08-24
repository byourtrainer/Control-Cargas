import { useEffect, useMemo, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { hoyISOLocal } from '../lib/fechas'
import './SesionesPizarra.css'

const itemVacio = {
  ejercicio_id: null, ejercicio: null,
  series: '', repeticiones: '', intensidad: '', tiempo_trabajo: '', tiempo_descanso: '', notas: '',
}

function miniaturaDe(ej) {
  if (ej.tipo_origen === 'youtube') return `https://img.youtube.com/vi/${ej.youtube_id}/mqdefault.jpg`
  if (ej.tipo_origen === 'video_grabado') return ej.video_url
  return ej.imagen_base64
}

function esVideo(ej) {
  return ej.tipo_origen === 'video_grabado'
}

export default function SesionesPizarra() {
  const [sesiones, setSesiones] = useState([])
  const [biblioteca, setBiblioteca] = useState([])
  const [equipos, setEquipos] = useState([])
  const [logoEntrenador, setLogoEntrenador] = useState(null)
  const [nombreEntrenador, setNombreEntrenador] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [sesionActivaId, setSesionActivaId] = useState(null)
  const [titulo, setTitulo] = useState('')
  const [fecha, setFecha] = useState('')
  const [notasSesion, setNotasSesion] = useState('')
  const [equipoId, setEquipoId] = useState('')
  const [items, setItems] = useState([])
  const [filtroBiblioteca, setFiltroBiblioteca] = useState('')
  const [etiquetasFiltroBiblioteca, setEtiquetasFiltroBiblioteca] = useState([])
  const [modalBibliotecaAbierto, setModalBibliotecaAbierto] = useState(false)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [diapositivaIdx, setDiapositivaIdx] = useState(null)
  const [grabando, setGrabando] = useState(false)
  const [enPantallaCompleta, setEnPantallaCompleta] = useState(false)
  const diapositivasRef = useRef(null)
  const grabadorRef = useRef(null)
  const trozosRef = useRef([])

  // --- Rotulador para dibujar encima de la diapositiva mientras se explica ---
  const canvasDibujoRef = useRef(null)
  const [dibujoActivo, setDibujoActivo] = useState(false)
  const [colorRotulador, setColorRotulador] = useState('#ff3b30')
  const [grosorRotulador, setGrosorRotulador] = useState(5)
  const dibujandoRef = useRef(false)

  useEffect(() => {
    const alCambiar = () => setEnPantallaCompleta(!!document.fullscreenElement)
    document.addEventListener('fullscreenchange', alCambiar)
    return () => document.removeEventListener('fullscreenchange', alCambiar)
  }, [])

  function alternarPantallaCompleta() {
    if (document.fullscreenElement) {
      document.exitFullscreen()
    } else {
      diapositivasRef.current?.requestFullscreen?.().catch(() => {
        setMensaje({ tipo: 'error', texto: 'Tu navegador no permite pantalla completa aquí.' })
      })
    }
  }

  async function iniciarGrabacion() {
    if (!navigator.mediaDevices?.getDisplayMedia) {
      setMensaje({ tipo: 'error', texto: 'Tu navegador no permite grabar la pantalla.' })
      return
    }
    try {
      const streamPantalla = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
      let streamMic = null
      try { streamMic = await navigator.mediaDevices.getUserMedia({ audio: true }) } catch { /* sin micrófono, se graba solo la pantalla */ }

      const pistas = [...streamPantalla.getVideoTracks()]
      if (streamMic) {
        const contexto = new AudioContext()
        const destino = contexto.createMediaStreamDestination()
        if (streamPantalla.getAudioTracks().length > 0) contexto.createMediaStreamSource(streamPantalla).connect(destino)
        contexto.createMediaStreamSource(streamMic).connect(destino)
        pistas.push(...destino.stream.getAudioTracks())
      } else {
        pistas.push(...streamPantalla.getAudioTracks())
      }

      const streamFinal = new MediaStream(pistas)
      const grabador = new MediaRecorder(streamFinal, { mimeType: 'video/webm' })
      trozosRef.current = []
      grabador.ondataavailable = (e) => { if (e.data.size > 0) trozosRef.current.push(e.data) }
      grabador.onstop = () => {
        const blob = new Blob(trozosRef.current, { type: 'video/webm' })
        const enlace = document.createElement('a')
        enlace.href = URL.createObjectURL(blob)
        enlace.download = `sesion-${titulo || 'grabacion'}-${hoyISOLocal()}.webm`
        enlace.click()
        streamMic?.getTracks().forEach((t) => t.stop())
        setGrabando(false)
      }
      streamPantalla.getVideoTracks()[0].onended = () => grabador.state !== 'inactive' && grabador.stop()

      grabadorRef.current = grabador
      grabador.start()
      setGrabando(true)
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo iniciar la grabación (¿cancelaste el permiso?).' })
    }
  }

  function detenerGrabacion() {
    grabadorRef.current?.stop()
  }

  function coordsCanvasDibujo(e) {
    const canvas = canvasDibujoRef.current
    const rect = canvas.getBoundingClientRect()
    const escalaX = canvas.width / rect.width
    const escalaY = canvas.height / rect.height
    return { x: (e.clientX - rect.left) * escalaX, y: (e.clientY - rect.top) * escalaY }
  }

  function iniciarTrazo(e) {
    if (!dibujoActivo) return
    const ctx = canvasDibujoRef.current.getContext('2d')
    const { x, y } = coordsCanvasDibujo(e)
    ctx.strokeStyle = colorRotulador
    ctx.lineWidth = grosorRotulador
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    ctx.moveTo(x, y)
    dibujandoRef.current = true
  }

  function continuarTrazo(e) {
    if (!dibujoActivo || !dibujandoRef.current) return
    const ctx = canvasDibujoRef.current.getContext('2d')
    const { x, y } = coordsCanvasDibujo(e)
    ctx.lineTo(x, y)
    ctx.stroke()
  }

  function terminarTrazo() {
    dibujandoRef.current = false
  }

  function borrarDibujo() {
    const canvas = canvasDibujoRef.current
    if (!canvas) return
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height)
  }

  // Se borra solo al cambiar de diapositiva — las anotaciones son de ese
  // ejercicio concreto, no tiene sentido que se arrastren a la siguiente.
  useEffect(() => { borrarDibujo() }, [diapositivaIdx])

  // El lienzo tiene que tener el mismo tamaño en píxeles que su hueco visible,
  // o los trazos quedarían desplazados respecto a donde toca el dedo/ratón.
  useEffect(() => {
    function ajustarTamanoLienzo() {
      const canvas = canvasDibujoRef.current
      const contenedor = canvas?.parentElement
      if (!canvas || !contenedor) return
      canvas.width = contenedor.clientWidth
      canvas.height = contenedor.clientHeight
    }
    ajustarTamanoLienzo()
    window.addEventListener('resize', ajustarTamanoLienzo)
    return () => window.removeEventListener('resize', ajustarTamanoLienzo)
  }, [diapositivaIdx, enPantallaCompleta])

  useEffect(() => { cargarSesiones(); cargarBiblioteca(); cargarEquipos(); cargarLogoEntrenador() }, [])

  async function cargarSesiones() {
    setCargando(true)
    const { data } = await supabase.from('sesiones_pizarra').select('*, sesiones_pizarra_ejercicios(id)').order('creado_en', { ascending: false })
    setSesiones(data || [])
    setCargando(false)
  }

  async function cargarBiblioteca() {
    const { data } = await supabase.from('ejercicios_pizarra').select('*').order('nombre')
    setBiblioteca(data || [])
  }

  async function cargarEquipos() {
    const { data } = await supabase.from('equipos').select('id, nombre, logo_base64').order('nombre')
    setEquipos(data || [])
  }

  async function cargarLogoEntrenador() {
    const { data } = await supabase.from('perfiles').select('nombre, logo_base64').eq('rol', 'entrenador').limit(1).maybeSingle()
    setLogoEntrenador(data?.logo_base64 || null)
    setNombreEntrenador(data?.nombre || null)
  }

  function nuevaSesion() {
    setSesionActivaId('nueva')
    setTitulo('')
    setFecha('')
    setNotasSesion('')
    setEquipoId('')
    setItems([])
    setMensaje(null)
  }

  async function abrirSesion(sesion) {
    setSesionActivaId(sesion.id)
    setTitulo(sesion.titulo)
    setFecha(sesion.fecha || '')
    setNotasSesion(sesion.notas || '')
    setEquipoId(sesion.equipo_id || '')
    setMensaje(null)
    const { data } = await supabase
      .from('sesiones_pizarra_ejercicios')
      .select('*, ejercicio:ejercicios_pizarra(*)')
      .eq('sesion_id', sesion.id)
      .order('orden')
    setItems((data || []).map((it) => ({ ...it })))
  }

  function volverALista() {
    setSesionActivaId(null)
    setItems([])
  }

  function anadirEjercicio(ej) {
    setItems((prev) => [...prev, { ...itemVacio, ejercicio_id: ej.id, ejercicio: ej }])
  }

  function quitarItem(i) {
    setItems((prev) => prev.filter((_, idx) => idx !== i))
  }

  function moverItem(i, delta) {
    setItems((prev) => {
      const copia = [...prev]
      const j = i + delta
      if (j < 0 || j >= copia.length) return prev
      ;[copia[i], copia[j]] = [copia[j], copia[i]]
      return copia
    })
  }

  function actualizarItem(i, cambios) {
    setItems((prev) => prev.map((it, idx) => (idx === i ? { ...it, ...cambios } : it)))
  }

  async function guardarSesion(e) {
    e.preventDefault()
    if (!titulo.trim()) {
      setMensaje({ tipo: 'error', texto: 'Ponle un título a la sesión.' })
      return
    }
    if (items.length === 0) {
      setMensaje({ tipo: 'error', texto: 'Añade al menos un ejercicio desde la biblioteca.' })
      return
    }
    setGuardando(true)
    setMensaje(null)

    let idSesion = sesionActivaId
    if (sesionActivaId === 'nueva') {
      const { data, error } = await supabase.from('sesiones_pizarra')
        .insert({ titulo: titulo.trim(), fecha: fecha || null, notas: notasSesion || null, equipo_id: equipoId || null })
        .select().single()
      if (error) { setMensaje({ tipo: 'error', texto: 'No se pudo crear la sesión.' }); setGuardando(false); return }
      idSesion = data.id
    } else {
      const { error } = await supabase.from('sesiones_pizarra')
        .update({ titulo: titulo.trim(), fecha: fecha || null, notas: notasSesion || null, equipo_id: equipoId || null })
        .eq('id', idSesion)
      if (error) { setMensaje({ tipo: 'error', texto: 'No se pudo actualizar la sesión.' }); setGuardando(false); return }
      await supabase.from('sesiones_pizarra_ejercicios').delete().eq('sesion_id', idSesion)
    }

    const filas = items.map((it, i) => ({
      sesion_id: idSesion, ejercicio_id: it.ejercicio_id, orden: i,
      series: it.series || null, repeticiones: it.repeticiones || null, intensidad: it.intensidad || null,
      tiempo_trabajo: it.tiempo_trabajo || null, tiempo_descanso: it.tiempo_descanso || null, notas: it.notas || null,
    }))
    const { error: errorItems } = await supabase.from('sesiones_pizarra_ejercicios').insert(filas)

    if (errorItems) {
      setMensaje({ tipo: 'error', texto: 'La sesión se guardó, pero hubo un problema con los ejercicios.' })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Sesión guardada.' })
      setSesionActivaId(idSesion)
      cargarSesiones()
    }
    setGuardando(false)
  }

  async function eliminarSesion(id) {
    if (!window.confirm('¿Eliminar esta sesión completa?')) return
    await supabase.from('sesiones_pizarra').delete().eq('id', id)
    if (sesionActivaId === id) volverALista()
    cargarSesiones()
  }

  const todasLasEtiquetasBiblioteca = useMemo(() => {
    const set = new Set()
    biblioteca.forEach((ej) => (ej.etiquetas || []).forEach((et) => set.add(et)))
    return [...set].sort()
  }, [biblioteca])

  const bibliotecaFiltrada = useMemo(() => {
    const q = filtroBiblioteca.trim().toLowerCase()
    return biblioteca.filter((ej) => {
      const coincideTexto = !q || ej.nombre.toLowerCase().includes(q) || (ej.etiquetas || []).some((et) => et.toLowerCase().includes(q))
      const coincideEtiquetas = etiquetasFiltroBiblioteca.every((et) => (ej.etiquetas || []).includes(et))
      return coincideTexto && coincideEtiquetas
    })
  }, [biblioteca, filtroBiblioteca, etiquetasFiltroBiblioteca])

  function alternarEtiquetaFiltro(et) {
    setEtiquetasFiltroBiblioteca((prev) => (prev.includes(et) ? prev.filter((e) => e !== et) : [...prev, et]))
  }

  if (cargando) return <p className="mono texto-dim">Cargando…</p>

  if (!sesionActivaId) {
    return (
      <div className="sesiones-layout">
        <div className="sesiones-cabecera">
          <div>
            <h2>Sesiones de pizarra</h2>
            <p className="texto-dim">Junta varios ejercicios de tu biblioteca en una hoja de sesión exportable.</p>
          </div>
          <button className="btn-principal" onClick={nuevaSesion}>+ Nueva sesión</button>
        </div>

        {sesiones.length === 0 ? (
          <p className="texto-dim">Todavía no has creado ninguna sesión.</p>
        ) : (
          <div className="sesiones-lista">
            {sesiones.map((s) => (
              <button key={s.id} className="sesiones-tarjeta" onClick={() => abrirSesion(s)}>
                <div>
                  <strong>{s.titulo}</strong>
                  <span className="texto-dim">
                    {s.fecha ? new Date(s.fecha + 'T00:00:00').toLocaleDateString('es-ES') : 'Sin fecha'}
                    {' · '}{s.sesiones_pizarra_ejercicios?.length || 0} ejercicio(s)
                  </span>
                </div>
                <span className="btn-eliminar-fila" onClick={(e) => { e.stopPropagation(); eliminarSesion(s.id) }} title="Eliminar sesión">✕</span>
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  if (diapositivaIdx !== null) {
    const it = items[diapositivaIdx]
    const ej = it.ejercicio
    return (
      <div className="sesiones-diapositivas" ref={diapositivasRef}>
        <div className="sesiones-diapo-cabecera no-imprimir">
          <span>{titulo} — {diapositivaIdx + 1} / {items.length}</span>
          <div className="sesiones-diapo-botones">
            {grabando ? (
              <button className="pizarra-boton pizarra-boton-grabando" onClick={detenerGrabacion}>⏺ Detener grabación</button>
            ) : (
              <button className="pizarra-boton" onClick={iniciarGrabacion}>⏺ Grabar pantalla</button>
            )}
            <button className="pizarra-boton" onClick={alternarPantallaCompleta}>
              {enPantallaCompleta ? '⤢ Salir de pantalla completa' : '⛶ Pantalla completa'}
            </button>
            <button className="pizarra-boton" onClick={() => setDiapositivaIdx(null)}>✕ Cerrar</button>
          </div>
        </div>
        {mensaje && <div className={`no-imprimir ${mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}`}>{mensaje.texto}</div>}

        <div className="sesiones-rotulador-barra no-imprimir">
          <button
            className={`pizarra-boton ${dibujoActivo ? 'pizarra-boton-activo' : ''}`}
            onClick={() => setDibujoActivo((a) => !a)}
          >
            {dibujoActivo ? '✎ Dibujando' : '✎ Rotulador'}
          </button>
          {dibujoActivo && (
            <>
              <div className="pizarra-color-chips">
                {['#ff3b30', '#ffd60a', '#34c759', '#0a84ff', '#ffffff', '#0d1210'].map((c) => (
                  <button
                    key={c} type="button"
                    className={`pizarra-color-chip ${colorRotulador === c ? 'pizarra-color-chip-activo' : ''}`}
                    style={{ background: c }}
                    onClick={() => setColorRotulador(c)}
                  />
                ))}
              </div>
              <label className="pizarra-linea-campo">
                <span>Grosor</span>
                <input type="range" min="2" max="16" value={grosorRotulador} onChange={(e) => setGrosorRotulador(Number(e.target.value))} />
              </label>
              <button className="pizarra-boton" onClick={borrarDibujo}>🧹 Borrar</button>
            </>
          )}
        </div>

        <div className="sesiones-diapo-cuerpo">
          <div className="sesiones-diapo-media">
            {ej.tipo_origen === 'youtube' ? (
              <iframe src={`https://www.youtube.com/embed/${ej.youtube_id}`} title={ej.nombre} allowFullScreen />
            ) : (
              <img src={ej.imagen_base64} alt={ej.nombre} />
            )}
            <canvas
              ref={canvasDibujoRef}
              className={`sesiones-rotulador-lienzo ${dibujoActivo ? 'sesiones-rotulador-lienzo-activo' : ''}`}
              onPointerDown={iniciarTrazo}
              onPointerMove={continuarTrazo}
              onPointerUp={terminarTrazo}
              onPointerLeave={terminarTrazo}
            />
          </div>
          <div className="sesiones-diapo-info">
            <h2>{ej.nombre}</h2>
            <div className="sesiones-diapo-variables">
              {it.series && <span><strong>Series</strong>{it.series}</span>}
              {it.repeticiones && <span><strong>Reps</strong>{it.repeticiones}</span>}
              {it.intensidad && <span><strong>Intensidad</strong>{it.intensidad}</span>}
              {it.tiempo_trabajo && <span><strong>T. trabajo</strong>{it.tiempo_trabajo}</span>}
              {it.tiempo_descanso && <span><strong>T. descanso</strong>{it.tiempo_descanso}</span>}
            </div>
            {ej.descripcion && <p>{ej.descripcion}</p>}
            {it.notas && <p className="texto-dim">Nota de esta sesión: {it.notas}</p>}
            {ej.variantes && <p className="texto-faint">Variantes: {ej.variantes}</p>}
          </div>
        </div>
        <div className="sesiones-diapo-nav no-imprimir">
          <button className="pizarra-boton" disabled={diapositivaIdx === 0} onClick={() => setDiapositivaIdx((i) => i - 1)}>← Anterior</button>
          <button className="pizarra-boton" disabled={diapositivaIdx === items.length - 1} onClick={() => setDiapositivaIdx((i) => i + 1)}>Siguiente →</button>
        </div>
      </div>
    )
  }

  const equipoSeleccionado = equipos.find((eq) => eq.id === equipoId)

  return (
    <div className="sesiones-layout">
      <div className="sesiones-cabecera-fija-imprimir">
        <div className="sesiones-barra-color-imprimir" style={{ background: equipoSeleccionado?.color || 'var(--accent)' }} />
        {logoEntrenador && <img src={logoEntrenador} alt="Logo del entrenador" className="sesiones-logo-fijo sesiones-logo-fijo-izq" />}
        {equipoSeleccionado?.logo_base64 && <img src={equipoSeleccionado.logo_base64} alt={`Escudo de ${equipoSeleccionado.nombre}`} className="sesiones-logo-fijo sesiones-logo-fijo-der" />}
      </div>

      <div className="sesiones-pie-fijo-imprimir">
        {nombreEntrenador && <span>{nombreEntrenador}</span>}
        <span>{titulo}</span>
        <span>Generado el {new Date().toLocaleDateString('es-ES')}</span>
      </div>

      <div className="sesiones-titulo-imprimir">
        <h2>{titulo || 'Sesión'}</h2>
        {equipoSeleccionado && <p className="texto-dim">{equipoSeleccionado.nombre}</p>}
        {fecha && <p className="texto-dim">{new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES')}</p>}
        {notasSesion && <p className="texto-dim">{notasSesion}</p>}
      </div>

      <div className="sesiones-cabecera no-imprimir">
        <button className="pizarra-boton" onClick={volverALista}>← Volver a sesiones</button>
        <div className="sesiones-cabecera-botones">
          <button className="pizarra-boton" onClick={() => setDiapositivaIdx(0)} disabled={items.length === 0}>▶ Ver diapositivas</button>
          <button className="pizarra-boton" onClick={() => window.print()} disabled={items.length === 0}>⬇ Exportar PDF</button>
        </div>
      </div>

      <section className="sesiones-form-card no-imprimir">
        <div className="fila-doble">
          <label className="campo-sesion">
            <span>Título de la sesión</span>
            <input type="text" value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ej. Sesión técnico-táctica semana 3" required />
          </label>
          <label className="campo-sesion">
            <span>Fecha (opcional)</span>
            <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} />
          </label>
        </div>
        <label className="campo-sesion">
          <span>Equipo destinatario (opcional, para mostrar su escudo en el documento)</span>
          <select value={equipoId} onChange={(e) => setEquipoId(e.target.value)}>
            <option value="">Sin especificar</option>
            {equipos.map((eq) => <option key={eq.id} value={eq.id}>{eq.nombre}</option>)}
          </select>
        </label>
        <label className="campo-sesion">
          <span>Notas generales (opcional)</span>
          <textarea value={notasSesion} onChange={(e) => setNotasSesion(e.target.value)} rows={2} />
        </label>
      </section>

      <div className="sesiones-cuerpo-simple">
        <button type="button" className="btn-principal no-imprimir" onClick={() => setModalBibliotecaAbierto(true)}>
          🔍 Explorar biblioteca y añadir ejercicios
        </button>

        <section className="sesiones-items-panel">
          <h3 className="no-imprimir">Ejercicios de la sesión ({items.length})</h3>
          {items.length === 0 ? (
            <p className="texto-dim no-imprimir">Añade ejercicios con el botón de arriba.</p>
          ) : (
            <div className="sesiones-items-lista">
              {items.map((it, i) => (
                <div className="sesiones-item-card" key={i}>
                  {esVideo(it.ejercicio) ? (
                    <video src={it.ejercicio.video_url} controls className="sesiones-item-imagen" />
                  ) : (
                    <img src={miniaturaDe(it.ejercicio)} alt={it.ejercicio.nombre} className="sesiones-item-imagen" />
                  )}
                  <div className="sesiones-item-cuerpo">
                    <div className="sesiones-item-cabecera">
                      <strong>{i + 1}. {it.ejercicio.nombre}</strong>
                      <div className="no-imprimir sesiones-item-mover">
                        <button type="button" onClick={() => moverItem(i, -1)} disabled={i === 0}>↑</button>
                        <button type="button" onClick={() => moverItem(i, 1)} disabled={i === items.length - 1}>↓</button>
                        <button type="button" className="btn-eliminar-fila" onClick={() => quitarItem(i)}>✕</button>
                      </div>
                    </div>
                    {it.ejercicio.descripcion && <p className="texto-dim sesiones-item-descripcion">{it.ejercicio.descripcion}</p>}

                    <div className="sesiones-item-variables no-imprimir">
                      <input placeholder="Series" value={it.series} onChange={(e) => actualizarItem(i, { series: e.target.value })} />
                      <input placeholder="Repeticiones" value={it.repeticiones} onChange={(e) => actualizarItem(i, { repeticiones: e.target.value })} />
                      <input placeholder="Intensidad" value={it.intensidad} onChange={(e) => actualizarItem(i, { intensidad: e.target.value })} />
                      <input placeholder="T. trabajo" value={it.tiempo_trabajo} onChange={(e) => actualizarItem(i, { tiempo_trabajo: e.target.value })} />
                      <input placeholder="T. descanso" value={it.tiempo_descanso} onChange={(e) => actualizarItem(i, { tiempo_descanso: e.target.value })} />
                    </div>
                    <input
                      className="no-imprimir sesiones-item-notas-input" placeholder="Notas para esta sesión (opcional)"
                      value={it.notas} onChange={(e) => actualizarItem(i, { notas: e.target.value })}
                    />

                    <div className="sesiones-item-variables-imprimir">
                      {[
                        it.series && `Series: ${it.series}`,
                        it.repeticiones && `Reps: ${it.repeticiones}`,
                        it.intensidad && `Intensidad: ${it.intensidad}`,
                        it.tiempo_trabajo && `T. trabajo: ${it.tiempo_trabajo}`,
                        it.tiempo_descanso && `T. descanso: ${it.tiempo_descanso}`,
                      ].filter(Boolean).join(' · ')}
                      {it.notas && <div>Nota: {it.notas}</div>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {mensaje && <div className={`no-imprimir ${mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}`}>{mensaje.texto}</div>}
      <button className="btn-principal no-imprimir" onClick={guardarSesion} disabled={guardando}>
        {guardando ? 'Guardando…' : '+ Guardar sesión'}
      </button>

      {modalBibliotecaAbierto && (
        <div className="sesiones-modal-fondo no-imprimir" onClick={() => setModalBibliotecaAbierto(false)}>
          <div className="sesiones-modal-biblioteca" onClick={(e) => e.stopPropagation()}>
            <div className="sesiones-modal-cabecera">
              <h3>Biblioteca de ejercicios</h3>
              <button className="pizarra-boton" onClick={() => setModalBibliotecaAbierto(false)}>✕ Cerrar</button>
            </div>

            <input
              type="text" className="sesiones-modal-buscador" value={filtroBiblioteca}
              onChange={(e) => setFiltroBiblioteca(e.target.value)} placeholder="Buscar por nombre o etiqueta…"
              autoFocus
            />

            {todasLasEtiquetasBiblioteca.length > 0 && (
              <div className="pizarra-etiquetas-sugeridas sesiones-modal-etiquetas">
                {todasLasEtiquetasBiblioteca.map((et) => (
                  <button
                    key={et} type="button"
                    className={`pizarra-etiqueta-sugerida ${etiquetasFiltroBiblioteca.includes(et) ? 'sesiones-etiqueta-filtro-activa' : ''}`}
                    onClick={() => alternarEtiquetaFiltro(et)}
                  >
                    {et}
                  </button>
                ))}
                {etiquetasFiltroBiblioteca.length > 0 && (
                  <button type="button" className="equipo-cambiar-link" onClick={() => setEtiquetasFiltroBiblioteca([])}>
                    Quitar filtro de etiquetas
                  </button>
                )}
              </div>
            )}

            <p className="texto-dim sesiones-modal-contador">{bibliotecaFiltrada.length} ejercicio(s)</p>

            <div className="sesiones-modal-grid">
              {bibliotecaFiltrada.map((ej) => (
                <button key={ej.id} className="sesiones-modal-item" onClick={() => anadirEjercicio(ej)}>
                  {esVideo(ej) ? (
                    <video src={ej.video_url} muted />
                  ) : (
                    <img src={miniaturaDe(ej)} alt={ej.nombre} />
                  )}
                  <div className="sesiones-modal-item-info">
                    <strong>{ej.nombre}</strong>
                    {ej.etiquetas && ej.etiquetas.length > 0 && (
                      <span className="texto-faint">{ej.etiquetas.join(', ')}</span>
                    )}
                  </div>
                  <span className="sesiones-modal-item-anadir">+ Añadir</span>
                </button>
              ))}
              {bibliotecaFiltrada.length === 0 && <p className="texto-dim">Sin resultados.</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
