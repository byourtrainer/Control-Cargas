import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { hoyISOLocal as hoyISO } from '../lib/fechas'
import SelectorCuerpo from './SelectorCuerpo'
import './Fisio.css'

const partesDelCuerpo = [
  'Cabeza/cara', 'Cuello/columna cervical', 'Esternón/costillas/escapular', 'Abdomen',
  'Lumbar/sacro/pelvis', 'Hombro/clavícula', 'Brazo', 'Codo', 'Antebrazo',
  'Muñeca', 'Mano/dedos/pulgar', 'Cadera/ingle', 'Muslo', 'Rodilla',
  'Pierna/tendón de Aquiles', 'Tobillo', 'Pie/dedos del pie',
]

const tiposDeLesion = [
  'Conmoción cerebral (con o sin pérdida de conciencia)',
  'Sobrecarga/distensión/rotura muscular',
  'Lesión tendinosa/rotura de tendón/bursitis',
  'Fractura',
  'Otras lesiones óseas',
  'Luxación/subluxación',
  'Esguince/lesión ligamentosa',
  'Lesión meniscal o condral',
  'Hematoma/contusión',
  'Abrasión',
  'Laceración',
  'Lesión nerviosa',
  'Lesión de piezas dentales',
]

const opcionesGravedad = [
  { valor: 'leve', etiqueta: 'Leve (1-3 días)' },
  { valor: 'menor', etiqueta: 'Menor (4-7 días)' },
  { valor: 'moderada', etiqueta: 'Moderada (8-28 días)' },
  { valor: 'grave', etiqueta: 'Grave (más de 28 días)' },
  { valor: 'otros', etiqueta: 'Otros (pendiente de evolución)' },
]

const vacio = {
  jugador_id: '', motivo_consulta: '', fecha_lesion: hoyISO(), fecha_retorno_estimada: '',
  partes_cuerpo: [], lateralidad: 'no_aplicable', tipos_lesion: [], otro_tipo_lesion: '',
  lesion_previa_misma_zona: false, fecha_retorno_lesion_previa: '',
  causa_tipo: '', momento: 'Entrenamiento', tipo_contacto: 'no', gravedad: '', notas: '',
}

export default function Fisio({ perfil, equipoActivo = 'todos', jugadorActivo = 'equipo', fechaDesde, fechaHasta }) {
  const [jugadores, setJugadores] = useState([])
  const [lesiones, setLesiones] = useState([])
  const [form, setForm] = useState(vacio)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [editandoId, setEditandoId] = useState(null)
  const [filtroActivas, setFiltroActivas] = useState(true)
  const [verLesion, setVerLesion] = useState(null)
  const [notaEvolucion, setNotaEvolucion] = useState('')
  const [guardandoNota, setGuardandoNota] = useState(false)

  useEffect(() => { cargarTodo() }, [])

  async function cargarTodo() {
    setCargando(true)
    const [{ data: perfiles }, { data: lesionesData }] = await Promise.all([
      supabase.from('perfiles').select('id, nombre, equipo_id').eq('rol', 'jugador').order('nombre'),
      supabase.from('lesiones').select('*, perfiles(nombre)').order('fecha_lesion', { ascending: false }),
    ])
    setJugadores(perfiles || [])
    setLesiones(lesionesData || [])
    setCargando(false)
  }

  function alternarParte(parte) {
    setForm((f) => ({
      ...f,
      partes_cuerpo: f.partes_cuerpo.includes(parte)
        ? f.partes_cuerpo.filter((p) => p !== parte)
        : [...f.partes_cuerpo, parte],
    }))
  }

  function alternarTipo(tipo) {
    setForm((f) => ({
      ...f,
      tipos_lesion: f.tipos_lesion.includes(tipo)
        ? f.tipos_lesion.filter((t) => t !== tipo)
        : [...f.tipos_lesion, tipo],
    }))
  }

  function empezarEdicion(l) {
    setForm({
      jugador_id: l.jugador_id,
      motivo_consulta: l.motivo_consulta || '',
      fecha_lesion: l.fecha_lesion,
      fecha_retorno_estimada: l.fecha_retorno_estimada || '',
      partes_cuerpo: l.partes_cuerpo || [],
      lateralidad: l.lateralidad || 'no_aplicable',
      tipos_lesion: l.tipos_lesion || [],
      otro_tipo_lesion: l.otro_tipo_lesion || '',
      lesion_previa_misma_zona: !!l.lesion_previa_misma_zona,
      fecha_retorno_lesion_previa: l.fecha_retorno_lesion_previa || '',
      causa_tipo: l.causa_tipo || '',
      momento: l.momento || 'Entrenamiento',
      tipo_contacto: l.tipo_contacto || 'no',
      gravedad: l.gravedad || '',
      notas: l.notas || '',
    })
    setEditandoId(l.id)
    setVerLesion(null)
    setMensaje(null)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function cancelarEdicion() {
    setForm(vacio)
    setEditandoId(null)
  }

  async function manejarEnvio(e) {
    e.preventDefault()
    if (!form.jugador_id) {
      setMensaje({ tipo: 'error', texto: 'Selecciona un jugador.' })
      return
    }
    setGuardando(true)
    setMensaje(null)

    const datos = {
      jugador_id: form.jugador_id,
      fisio_id: perfil?.id || null,
      motivo_consulta: form.motivo_consulta || null,
      fecha_lesion: form.fecha_lesion,
      fecha_retorno_estimada: form.fecha_retorno_estimada || null,
      partes_cuerpo: form.partes_cuerpo.length > 0 ? form.partes_cuerpo : null,
      lateralidad: form.lateralidad,
      tipos_lesion: form.tipos_lesion.length > 0 ? form.tipos_lesion : null,
      otro_tipo_lesion: form.otro_tipo_lesion || null,
      lesion_previa_misma_zona: form.lesion_previa_misma_zona,
      fecha_retorno_lesion_previa: form.fecha_retorno_lesion_previa || null,
      causa_tipo: form.causa_tipo || null,
      momento: form.momento,
      tipo_contacto: form.tipo_contacto,
      gravedad: form.gravedad || null,
      notas: form.notas || null,
      // Compatibilidad con las columnas antiguas, para que el Resumen del entrenador siga funcionando
      tipologia: form.tipos_lesion[0] || 'Otro',
      parte_cuerpo: form.partes_cuerpo.join(', ') || null,
      lado: form.lateralidad === 'derecha' ? 'Derecho' : form.lateralidad === 'izquierda' ? 'Izquierdo' : 'No aplica',
      severidad: form.gravedad === 'leve' ? 'Leve' : form.gravedad === 'grave' ? 'Grave' : 'Moderada',
      contacto: form.tipo_contacto !== 'no',
    }

    const { error } = editandoId
      ? await supabase.from('lesiones').update(datos).eq('id', editandoId)
      : await supabase.from('lesiones').insert(datos)

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar el informe.' })
    } else {
      setMensaje({ tipo: 'ok', texto: editandoId ? 'Informe actualizado.' : 'Informe registrado correctamente.' })
      setForm(vacio)
      setEditandoId(null)
      cargarTodo()
    }
    setGuardando(false)
  }

  async function eliminarLesion(id) {
    if (!window.confirm('¿Eliminar este informe de lesión? No se puede deshacer.')) return
    const { error } = await supabase.from('lesiones').delete().eq('id', id)
    if (!error) {
      setLesiones((prev) => prev.filter((l) => l.id !== id))
      if (verLesion?.id === id) setVerLesion(null)
    }
  }

  async function guardarNotaEvolucion() {
    if (!notaEvolucion.trim() || !verLesion) return
    setGuardandoNota(true)
    const fecha = new Date().toLocaleDateString('es-ES')
    const notaConFecha = `[${fecha}] ${notaEvolucion.trim()}`
    const acumulado = verLesion.notas_evolucion ? `${verLesion.notas_evolucion}\n\n${notaConFecha}` : notaConFecha
    const { error } = await supabase.from('lesiones').update({ notas_evolucion: acumulado }).eq('id', verLesion.id)
    if (!error) {
      setVerLesion({ ...verLesion, notas_evolucion: acumulado })
      setLesiones((prev) => prev.map((l) => (l.id === verLesion.id ? { ...l, notas_evolucion: acumulado } : l)))
      setNotaEvolucion('')
    }
    setGuardandoNota(false)
  }

  async function marcarAlta(l) {
    if (!window.confirm(`¿Dar de alta a ${l.perfiles?.nombre}? Se marcará esta lesión como resuelta.`)) return
    const fechaAlta = hoyISO()
    const { error } = await supabase.from('lesiones').update({ activa: false, fecha_alta: fechaAlta }).eq('id', l.id)
    if (!error) {
      setLesiones((prev) => prev.map((x) => (x.id === l.id ? { ...x, activa: false, fecha_alta: fechaAlta } : x)))
      if (verLesion?.id === l.id) setVerLesion({ ...verLesion, activa: false, fecha_alta: fechaAlta })
    }
  }

  const lesionesFiltradas = lesiones.filter((l) => (filtroActivas ? l.activa !== false : true))

  const jugadoresEnContexto = jugadores.filter((j) => {
    if (equipoActivo === 'todos') return true
    if (equipoActivo === 'sin_asignar') return !j.equipo_id
    return j.equipo_id === equipoActivo
  })
  const nombreJugadorActivo = jugadorActivo !== 'equipo' ? jugadores.find((j) => j.id === jugadorActivo)?.nombre : null

  // --- Mapa corporal de molestias autoinformadas (distinto de los informes formales de arriba) ---
  const [registrosMapa, setRegistrosMapa] = useState([])
  const [cargandoMapa, setCargandoMapa] = useState(false)

  useEffect(() => { cargarRegistrosMapa() }, [jugadorActivo, equipoActivo, jugadores, fechaDesde, fechaHasta])

  async function cargarRegistrosMapa() {
    const ids = jugadorActivo !== 'equipo' ? [jugadorActivo] : jugadoresEnContexto.map((j) => j.id)
    if (ids.length === 0) { setRegistrosMapa([]); return }
    setCargandoMapa(true)
    const { data } = await supabase
      .from('registros_diarios')
      .select('jugador_id, fecha, tiene_molestia, zonas_molestia')
      .in('jugador_id', ids)
      .eq('tiene_molestia', true)
      .gte('fecha', fechaDesde)
      .lte('fecha', fechaHasta)
    setRegistrosMapa(data || [])
    setCargandoMapa(false)
  }

  const frecuenciasMapa = registrosMapa.reduce((acc, r) => {
    ;(r.zonas_molestia || []).forEach((clave) => { acc[clave] = (acc[clave] || 0) + 1 })
    return acc
  }, {})
  const zonasMolestiaOrdenadas = Object.entries(frecuenciasMapa).sort((a, b) => b[1] - a[1])

  // --- Informes formales más frecuentes (tipos y zonas), respetando el contexto ◎ ---
  const lesionesEnContexto = lesiones.filter((l) => {
    if (jugadorActivo !== 'equipo') return l.jugador_id === jugadorActivo
    const jugador = jugadores.find((j) => j.id === l.jugador_id)
    if (!jugador) return false
    if (equipoActivo === 'sin_asignar') return !jugador.equipo_id
    if (equipoActivo !== 'todos') return jugador.equipo_id === equipoActivo
    return true
  }).filter((l) => (!fechaDesde || l.fecha_lesion >= fechaDesde) && (!fechaHasta || l.fecha_lesion <= fechaHasta))

  const conteoTipos = {}
  lesionesEnContexto.forEach((l) => {
    const tipos = l.tipos_lesion?.length > 0 ? l.tipos_lesion : [l.tipologia].filter(Boolean)
    tipos.forEach((t) => { conteoTipos[t] = (conteoTipos[t] || 0) + 1 })
  })
  const tiposLesionOrdenados = Object.entries(conteoTipos).sort((a, b) => b[1] - a[1])

  const conteoZonasLesion = {}
  lesionesEnContexto.forEach((l) => {
    const zonas = l.partes_cuerpo?.length > 0 ? l.partes_cuerpo : (l.parte_cuerpo ? [l.parte_cuerpo] : [])
    zonas.forEach((z) => { conteoZonasLesion[z] = (conteoZonasLesion[z] || 0) + 1 })
  })
  const zonasLesionOrdenadas = Object.entries(conteoZonasLesion).sort((a, b) => b[1] - a[1])

  return (
    <div className="fisio-layout">
      <section className="fisio-form-card">
        <h2>{editandoId ? 'Editar informe de lesión' : 'Nuevo informe de lesión'}</h2>
        <form onSubmit={manejarEnvio}>
          <div className="fila-doble">
            <label className="campo-lesion">
              <span>Jugador</span>
              <select value={form.jugador_id} onChange={(e) => setForm({ ...form, jugador_id: e.target.value })} required>
                <option value="" disabled>Selecciona un jugador</option>
                {jugadores.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
              </select>
            </label>
            <label className="campo-lesion">
              <span>Fecha de lesión</span>
              <input type="date" value={form.fecha_lesion} onChange={(e) => setForm({ ...form, fecha_lesion: e.target.value })} required />
            </label>
          </div>

          <label className="campo-lesion">
            <span>Motivo de consulta</span>
            <textarea value={form.motivo_consulta} onChange={(e) => setForm({ ...form, motivo_consulta: e.target.value })} rows={2} />
          </label>

          <label className="campo-lesion">
            <span>Fecha posible de retorno a la competición (opcional)</span>
            <input type="date" value={form.fecha_retorno_estimada} onChange={(e) => setForm({ ...form, fecha_retorno_estimada: e.target.value })} />
          </label>

          <div className="campo-lesion">
            <span>Parte del cuerpo afectada</span>
            <div className="fisio-checklist">
              {partesDelCuerpo.map((p) => (
                <label key={p} className="fisio-check-item">
                  <input type="checkbox" checked={form.partes_cuerpo.includes(p)} onChange={() => alternarParte(p)} />
                  <span>{p}</span>
                </label>
              ))}
            </div>
          </div>

          <label className="campo-lesion">
            <span>Lateralidad</span>
            <div className="fisio-radio-fila">
              {[['derecha', 'Derecha'], ['izquierda', 'Izquierda'], ['no_aplicable', 'No aplicable']].map(([val, et]) => (
                <label key={val} className="fisio-radio-item">
                  <input type="radio" name="lateralidad" checked={form.lateralidad === val} onChange={() => setForm({ ...form, lateralidad: val })} />
                  <span>{et}</span>
                </label>
              ))}
            </div>
          </label>

          <div className="campo-lesion">
            <span>Tipo de lesión</span>
            <div className="fisio-checklist">
              {tiposDeLesion.map((t) => (
                <label key={t} className="fisio-check-item">
                  <input type="checkbox" checked={form.tipos_lesion.includes(t)} onChange={() => alternarTipo(t)} />
                  <span>{t}</span>
                </label>
              ))}
            </div>
            <input
              type="text" className="fisio-otro-input" value={form.otro_tipo_lesion}
              onChange={(e) => setForm({ ...form, otro_tipo_lesion: e.target.value })}
              placeholder="Otro tipo de lesión (si no está en la lista)…"
            />
          </div>

          <label className="campo-checkbox">
            <input
              type="checkbox" checked={form.lesion_previa_misma_zona}
              onChange={(e) => setForm({ ...form, lesion_previa_misma_zona: e.target.checked })}
            />
            <span>El jugador ha sufrido esta lesión del mismo tipo y en la misma zona anteriormente</span>
          </label>
          {form.lesion_previa_misma_zona && (
            <label className="campo-lesion">
              <span>Fecha de retorno de la lesión previa</span>
              <input
                type="date" value={form.fecha_retorno_lesion_previa}
                onChange={(e) => setForm({ ...form, fecha_retorno_lesion_previa: e.target.value })}
              />
            </label>
          )}

          <div className="fila-doble">
            <label className="campo-lesion">
              <span>¿Causada por sobreuso o traumatismo?</span>
              <select value={form.causa_tipo} onChange={(e) => setForm({ ...form, causa_tipo: e.target.value })}>
                <option value="">Sin especificar</option>
                <option value="sobreuso">Sobreuso</option>
                <option value="traumatismo">Traumatismo</option>
              </select>
            </label>
            <label className="campo-lesion">
              <span>¿Cuándo ocurrió?</span>
              <select value={form.momento} onChange={(e) => setForm({ ...form, momento: e.target.value })}>
                <option value="Entrenamiento">Durante un entrenamiento</option>
                <option value="Partido">Durante un partido</option>
                <option value="Fuera del ámbito">Fuera del ámbito del hockey</option>
              </select>
            </label>
          </div>

          <label className="campo-lesion">
            <span>¿Se produjo por contacto o colisión?</span>
            <select value={form.tipo_contacto} onChange={(e) => setForm({ ...form, tipo_contacto: e.target.value })}>
              <option value="no">No</option>
              <option value="jugador">Sí, con otro jugador</option>
              <option value="pelota">Sí, con la pelota</option>
              <option value="otro_objeto">Sí, con otro objeto</option>
            </select>
          </label>

          <label className="campo-lesion">
            <span>Gravedad de la lesión</span>
            <select value={form.gravedad} onChange={(e) => setForm({ ...form, gravedad: e.target.value })}>
              <option value="">Sin especificar (pendiente de evolución)</option>
              {opcionesGravedad.map((g) => <option key={g.valor} value={g.valor}>{g.etiqueta}</option>)}
            </select>
          </label>

          <label className="campo-lesion">
            <span>Notas adicionales</span>
            <textarea value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })} rows={3} />
          </label>

          {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}

          <div className="fisio-form-botones">
            <button type="submit" className="btn-principal" disabled={guardando}>
              {guardando ? 'Guardando…' : editandoId ? 'Guardar cambios' : '+ Registrar informe'}
            </button>
            {editandoId && (
              <button type="button" className="pizarra-boton" onClick={cancelarEdicion}>Cancelar edición</button>
            )}
          </div>
        </form>
      </section>

      <section className="fisio-historial-card">
        <div className="fisio-historial-cabecera">
          <h3>Historial de lesiones</h3>
          <label className="fisio-filtro-activas">
            <input type="checkbox" checked={filtroActivas} onChange={(e) => setFiltroActivas(e.target.checked)} />
            <span>Solo lesiones activas</span>
          </label>
        </div>
        {cargando ? (
          <p className="mono texto-dim">Cargando…</p>
        ) : lesionesFiltradas.length === 0 ? (
          <p className="texto-dim">No hay lesiones que mostrar.</p>
        ) : (
          <div className="fisio-lista">
            {lesionesFiltradas.map((l) => (
              <button key={l.id} className={`fisio-tarjeta-lesion ${l.activa === false ? 'fisio-tarjeta-resuelta' : ''}`} onClick={() => setVerLesion(l)}>
                <div>
                  <strong>{l.perfiles?.nombre || '—'}</strong>
                  <span className="texto-dim">
                    {(l.partes_cuerpo || [l.parte_cuerpo]).filter(Boolean).join(', ') || 'Sin zona especificada'}
                  </span>
                </div>
                <div className="fisio-tarjeta-derecha">
                  <span className="mono texto-dim">{l.fecha_lesion}</span>
                  {l.gravedad && <span className={`gravedad-badge gravedad-${l.gravedad}`}>{l.gravedad}</span>}
                  {l.activa === false && <span className="fisio-badge-alta">Alta</span>}
                </div>
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="lesiones-frecuentes-card">
        <h2>Lesiones más frecuentes</h2>
        <p className="cuerpo-mapa-sub">
          Basado en los informes formales de arriba. Usa el selector <strong>◎</strong> de la
          cabecera para ver el conjunto del equipo o de un jugador en concreto.
        </p>
        <p className="cuerpo-mapa-contexto mono texto-dim">
          {nombreJugadorActivo || 'Todo el grupo seleccionado'} · {fechaDesde} → {fechaHasta} · {lesionesEnContexto.length} informe(s)
        </p>
        <div className="lesiones-frecuentes-grid">
          <div>
            <h4>Tipo de lesión</h4>
            {tiposLesionOrdenados.length === 0 ? (
              <p className="texto-dim">Sin informes en este periodo.</p>
            ) : (
              <ul className="cuerpo-mapa-ul">
                {tiposLesionOrdenados.map(([tipo, veces]) => (
                  <li key={tipo}><span>{tipo}</span><span className="mono">{veces}×</span></li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h4>Zona del cuerpo</h4>
            {zonasLesionOrdenadas.length === 0 ? (
              <p className="texto-dim">Sin informes en este periodo.</p>
            ) : (
              <ul className="cuerpo-mapa-ul">
                {zonasLesionOrdenadas.map(([zona, veces]) => (
                  <li key={zona}><span>{zona}</span><span className="mono">{veces}×</span></li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      <section className="cuerpo-mapa-card">
        <h2>Mapa corporal de molestias</h2>
        <p className="cuerpo-mapa-sub">
          Basado en las molestias que los jugadores reportan en su registro diario de bienestar
          (no en los informes formales de arriba). Usa el selector <strong>◎</strong> de la
          cabecera para cambiar el equipo, jugador o rango de fechas.
        </p>
        <p className="cuerpo-mapa-contexto mono texto-dim">
          {nombreJugadorActivo || 'Todo el grupo seleccionado'} · {fechaDesde} → {fechaHasta}
        </p>
        {cargandoMapa ? (
          <p className="mono texto-dim">Cargando…</p>
        ) : (
          <div className="cuerpo-mapa-contenido">
            <SelectorCuerpo modo="mapa" frecuencias={frecuenciasMapa} />
            <div className="cuerpo-mapa-lista">
              <h4>Zonas más reportadas</h4>
              {zonasMolestiaOrdenadas.length === 0 ? (
                <p className="texto-dim">Sin molestias reportadas en este periodo.</p>
              ) : (
                <ul className="cuerpo-mapa-ul">
                  {zonasMolestiaOrdenadas.map(([zona, veces]) => (
                    <li key={zona}><span>{zona}</span><span className="mono">{veces}×</span></li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </section>

      {verLesion && (
        <div className="fisio-modal-fondo" onClick={() => setVerLesion(null)}>
          <div className="fisio-modal" onClick={(e) => e.stopPropagation()}>
            <div className="fisio-modal-cabecera">
              <h3>{verLesion.perfiles?.nombre}</h3>
              <button className="pizarra-boton" onClick={() => setVerLesion(null)}>✕ Cerrar</button>
            </div>

            <div className="fisio-modal-cuerpo">
              <p><strong>Fecha de lesión:</strong> {verLesion.fecha_lesion}</p>
              {verLesion.motivo_consulta && <p><strong>Motivo de consulta:</strong> {verLesion.motivo_consulta}</p>}
              {verLesion.partes_cuerpo?.length > 0 && <p><strong>Zona:</strong> {verLesion.partes_cuerpo.join(', ')}</p>}
              {verLesion.lateralidad && verLesion.lateralidad !== 'no_aplicable' && (
                <p><strong>Lateralidad:</strong> {verLesion.lateralidad === 'derecha' ? 'Derecha' : 'Izquierda'}</p>
              )}
              {verLesion.tipos_lesion?.length > 0 && <p><strong>Tipo:</strong> {verLesion.tipos_lesion.join(', ')}</p>}
              {verLesion.gravedad && (
                <p><strong>Gravedad:</strong> <span className={`gravedad-badge gravedad-${verLesion.gravedad}`}>{opcionesGravedad.find((g) => g.valor === verLesion.gravedad)?.etiqueta}</span></p>
              )}
              {verLesion.fecha_retorno_estimada && <p><strong>Retorno estimado:</strong> {verLesion.fecha_retorno_estimada}</p>}
              {verLesion.notas && <p><strong>Notas:</strong> {verLesion.notas}</p>}

              <div className="fisio-evolucion">
                <h4>Evolución</h4>
                {verLesion.notas_evolucion ? (
                  <p className="fisio-evolucion-texto">{verLesion.notas_evolucion}</p>
                ) : (
                  <p className="texto-dim">Sin anotaciones de seguimiento todavía.</p>
                )}
                <div className="fisio-evolucion-nueva">
                  <textarea
                    value={notaEvolucion} onChange={(e) => setNotaEvolucion(e.target.value)}
                    rows={2} placeholder="Añadir nota de la visita de hoy…"
                  />
                  <button className="pizarra-boton" onClick={guardarNotaEvolucion} disabled={guardandoNota || !notaEvolucion.trim()}>
                    {guardandoNota ? 'Guardando…' : '+ Añadir nota'}
                  </button>
                </div>
              </div>
            </div>

            <div className="fisio-modal-botones">
              <button className="pizarra-boton" onClick={() => empezarEdicion(verLesion)}>✎ Editar informe</button>
              {verLesion.activa !== false && (
                <button className="pizarra-boton" onClick={() => marcarAlta(verLesion)}>✓ Dar de alta</button>
              )}
              <button className="btn-eliminar-sesion" onClick={() => eliminarLesion(verLesion.id)}>Eliminar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
