import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colorParaValor } from '../lib/colorEscalas'
import Calendario from './Calendario'
import './PlayerForm.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

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

function formatearFechaLarga(fechaISO) {
  const d = new Date(fechaISO + 'T00:00:00')
  return d.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
}

// Escala RPE 0-10 tal y como se usa en el club (escala de Foster / CR-10 modificada)
const descripcionesRPE = [
  'Ningún esfuerzo', 'Muy muy suave', 'Muy suave', 'Suave', 'Moderado',
  'Duro', 'Algo duro', 'Muy duro', 'Muy muy duro', 'Casi máximo', 'Máximo',
]

// invertido = true → un valor alto es BUENO (sueño, ánimo). En el resto,
// un valor alto es MALO (fatiga, dolor, estrés) y se pinta en rojo.
const escalas = [
  { clave: 'sueno', etiqueta: 'Calidad del sueño', bajo: 'Muy mala', alto: 'Excelente', invertido: true },
  { clave: 'fatiga', etiqueta: 'Fatiga', bajo: 'Nada', alto: 'Extrema', invertido: false },
  { clave: 'dolor_muscular', etiqueta: 'Dolor muscular', bajo: 'Nada', alto: 'Extremo', invertido: false },
  { clave: 'estres', etiqueta: 'Estrés', bajo: 'Nada', alto: 'Extremo', invertido: false },
  { clave: 'animo', etiqueta: 'Estado de ánimo', bajo: 'Muy bajo', alto: 'Muy alto', invertido: true },
]

const zonasCuerpo = [
  'Cuello/cervicales', 'Zona dorsal (espalda alta)', 'Hombro', 'Brazo', 'Codo',
  'Antebrazo', 'Muñeca', 'Zona lumbar', 'Cadera', 'Glúteos',
  'Psoas (flexores cadera)', 'Rodilla', 'Isquiotibiales', 'Cuádriceps', 'Aductores',
  'Gemelos', 'Tibiales', 'Tobillo', 'Pie',
]

export default function PlayerForm({ perfil }) {
  const [vista, setVista] = useState('calendario') // 'calendario' | 'dia'
  const [fechaSeleccionada, setFechaSeleccionada] = useState(hoyISO())

  const [registroDia, setRegistroDia] = useState(null)
  const [cargandoRegistro, setCargandoRegistro] = useState(true)

  // Mis datos
  const [misDatos, setMisDatos] = useState({
    peso_corporal_kg: perfil.peso_corporal_kg, altura_m: perfil.altura_m,
    fecha_nacimiento: perfil.fecha_nacimiento, sexo: perfil.sexo,
  })
  const [editandoDatos, setEditandoDatos] = useState(false)
  const [formDatos, setFormDatos] = useState(misDatos)
  const [guardandoDatos, setGuardandoDatos] = useState(false)
  const [mensajeDatos, setMensajeDatos] = useState(null)

  // Bienestar
  const [valores, setValores] = useState({ sueno: 3, fatiga: 3, dolor_muscular: 3, estres: 3, animo: 3 })
  const [tieneMolestia, setTieneMolestia] = useState(false)
  const [zonaMolestia, setZonaMolestia] = useState('')
  const [guardandoBienestar, setGuardandoBienestar] = useState(false)
  const [mensajeBienestar, setMensajeBienestar] = useState(null)

  // RPE
  const [rpe, setRpe] = useState(5)
  const [notas, setNotas] = useState('')
  const [guardandoRpe, setGuardandoRpe] = useState(false)
  const [mensajeRpe, setMensajeRpe] = useState(null)

  const [duracionDia, setDuracionDia] = useState(null)
  const [cargandoDuracion, setCargandoDuracion] = useState(true)
  const [equipos, setEquipos] = useState([])
  const [equipoId, setEquipoId] = useState(perfil.equipo_id || '')
  const [editandoEquipo, setEditandoEquipo] = useState(!perfil.equipo_id)
  const [guardandoEquipo, setGuardandoEquipo] = useState(false)

  useEffect(() => { cargarEquipos() }, [])

  useEffect(() => {
    if (vista !== 'dia') return
    cargarRegistroDia()
    cargarDuracionDia()
  }, [vista, fechaSeleccionada])

  async function cargarRegistroDia() {
    setCargandoRegistro(true)
    const { data } = await supabase
      .from('registros_diarios')
      .select('*')
      .eq('jugador_id', perfil.id)
      .eq('fecha', fechaSeleccionada)
      .maybeSingle()

    setRegistroDia(data || null)
    if (data && data.sueno !== null) {
      setValores({
        sueno: data.sueno, fatiga: data.fatiga, dolor_muscular: data.dolor_muscular,
        estres: data.estres, animo: data.animo,
      })
      setTieneMolestia(!!data.tiene_molestia)
      setZonaMolestia(data.zona_molestia || '')
    } else {
      setValores({ sueno: 3, fatiga: 3, dolor_muscular: 3, estres: 3, animo: 3 })
      setTieneMolestia(false)
      setZonaMolestia('')
    }
    if (data && data.rpe !== null) {
      setRpe(data.rpe)
      setNotas(data.notas || '')
    } else {
      setRpe(5)
      setNotas('')
    }
    setMensajeBienestar(null)
    setMensajeRpe(null)
    setCargandoRegistro(false)
  }

  async function cargarEquipos() {
    const { data } = await supabase.from('equipos').select('*').order('nombre')
    setEquipos(data || [])
  }

  function empezarEdicionDatos() {
    setFormDatos(misDatos)
    setMensajeDatos(null)
    setEditandoDatos(true)
  }

  async function guardarDatos(e) {
    e.preventDefault()
    setGuardandoDatos(true)
    setMensajeDatos(null)

    const { error } = await supabase.rpc('actualizar_mis_datos', {
      nuevo_peso: formDatos.peso_corporal_kg === '' || formDatos.peso_corporal_kg === null ? null : Number(formDatos.peso_corporal_kg),
      nueva_altura: formDatos.altura_m === '' || formDatos.altura_m === null ? null : Number(formDatos.altura_m),
      nueva_fecha_nacimiento: formDatos.fecha_nacimiento || null,
      nuevo_sexo: formDatos.sexo || null,
    })

    if (error) {
      setMensajeDatos({ tipo: 'error', texto: 'No se pudieron guardar los cambios.' })
    } else {
      setMisDatos(formDatos)
      setEditandoDatos(false)
      setMensajeDatos({ tipo: 'ok', texto: 'Datos actualizados.' })
    }
    setGuardandoDatos(false)
  }

  async function manejarCambioEquipo(e) {
    const nuevoId = e.target.value
    setEquipoId(nuevoId)
    setGuardandoEquipo(true)
    await supabase.rpc('actualizar_mi_equipo', { nuevo_equipo_id: nuevoId || null })
    setGuardandoEquipo(false)
    if (nuevoId) setEditandoEquipo(false)
  }

  async function cargarDuracionDia() {
    setCargandoDuracion(true)
    const { data } = await supabase
      .from('sesiones')
      .select('duracion_min')
      .eq('fecha', fechaSeleccionada)
      .maybeSingle()
    setDuracionDia(data ? data.duracion_min : null)
    setCargandoDuracion(false)
  }

  function abrirDia(fecha) {
    setFechaSeleccionada(fecha)
    setVista('dia')
  }

  async function guardarBienestar(e) {
    e.preventDefault()
    if (tieneMolestia && !zonaMolestia) {
      setMensajeBienestar({ tipo: 'error', texto: 'Indica en qué parte del cuerpo tienes la molestia.' })
      return
    }
    setGuardandoBienestar(true)
    setMensajeBienestar(null)

    const { error } = await supabase.from('registros_diarios').upsert({
      jugador_id: perfil.id,
      fecha: fechaSeleccionada,
      ...valores,
      tiene_molestia: tieneMolestia,
      zona_molestia: tieneMolestia ? zonaMolestia : null,
    }, { onConflict: 'jugador_id,fecha' })

    if (error) {
      setMensajeBienestar({ tipo: 'error', texto: 'No se pudo guardar. Inténtalo de nuevo.' })
    } else {
      setMensajeBienestar({ tipo: 'ok', texto: 'Bienestar guardado.' })
      cargarRegistroDia()
    }
    setGuardandoBienestar(false)
  }

  async function guardarRpe(e) {
    e.preventDefault()
    setGuardandoRpe(true)
    setMensajeRpe(null)

    const { error } = await supabase.from('registros_diarios').upsert({
      jugador_id: perfil.id,
      fecha: fechaSeleccionada,
      rpe,
      notas: notas || null,
    }, { onConflict: 'jugador_id,fecha' })

    if (error) {
      setMensajeRpe({ tipo: 'error', texto: 'No se pudo guardar. Inténtalo de nuevo.' })
    } else {
      setMensajeRpe({ tipo: 'ok', texto: 'RPE guardado.' })
      cargarRegistroDia()
    }
    setGuardandoRpe(false)
  }

  const nombreEquipoActual = equipos.find((eq) => eq.id === equipoId)?.nombre
  const bienestarYaGuardado = registroDia?.sueno !== null && registroDia?.sueno !== undefined
  const rpeYaGuardado = registroDia?.rpe !== null && registroDia?.rpe !== undefined
  const esHoy = fechaSeleccionada === hoyISO()

  return (
    <div>
      {editandoEquipo ? (
        <div className="equipo-selector-card">
          <span>{perfil.equipo_id ? 'Cambiar tu equipo' : 'Elige tu equipo (solo tienes que hacerlo una vez)'}</span>
          <div className="equipo-selector-controles">
            <select value={equipoId} onChange={manejarCambioEquipo} disabled={guardandoEquipo}>
              <option value="">Sin asignar</option>
              {equipos.map((eq) => (
                <option key={eq.id} value={eq.id}>{eq.nombre}</option>
              ))}
            </select>
            {perfil.equipo_id && (
              <button type="button" className="equipo-cancelar" onClick={() => setEditandoEquipo(false)}>
                Cancelar
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="equipo-selector-card equipo-selector-compacta">
          <span>Tu equipo: <strong>{nombreEquipoActual}</strong></span>
          <button type="button" className="equipo-cambiar-link" onClick={() => setEditandoEquipo(true)}>
            Cambiar
          </button>
        </div>
      )}

      {vista === 'calendario' ? (
        <div className="player-layout">
          <div className="player-columna-principal">
            <Calendario jugadorId={perfil.id} onSeleccionarDia={abrirDia} />
          </div>

          <div className="player-columna-lateral">
            <section className="historial-card">
              <div className="mis-datos-header">
                <h3>Mis datos</h3>
                {!editandoDatos && (
                  <button type="button" className="equipo-cambiar-link" onClick={empezarEdicionDatos}>Editar</button>
                )}
              </div>

              {editandoDatos ? (
                <form onSubmit={guardarDatos}>
                  <label className="campo-notas">
                    <span>Peso (kg)</span>
                    <input
                      type="number" step="0.1" min="0"
                      value={formDatos.peso_corporal_kg ?? ''}
                      onChange={(e) => setFormDatos({ ...formDatos, peso_corporal_kg: e.target.value })}
                    />
                  </label>
                  <label className="campo-notas">
                    <span>Altura (m)</span>
                    <input
                      type="number" step="0.01" min="0"
                      value={formDatos.altura_m ?? ''}
                      onChange={(e) => setFormDatos({ ...formDatos, altura_m: e.target.value })}
                    />
                  </label>
                  <label className="campo-notas">
                    <span>Fecha de nacimiento</span>
                    <input
                      type="date"
                      value={formDatos.fecha_nacimiento ?? ''}
                      onChange={(e) => setFormDatos({ ...formDatos, fecha_nacimiento: e.target.value })}
                    />
                  </label>
                  <label className="campo-notas">
                    <span>Sexo</span>
                    <select
                      value={formDatos.sexo ?? ''}
                      onChange={(e) => setFormDatos({ ...formDatos, sexo: e.target.value })}
                    >
                      <option value="">Sin especificar</option>
                      <option value="masculino">Masculino</option>
                      <option value="femenino">Femenino</option>
                      <option value="neutro">Neutro</option>
                    </select>
                  </label>

                  {mensajeDatos && (
                    <div className={mensajeDatos.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensajeDatos.texto}</div>
                  )}

                  <div className="mis-datos-botones">
                    <button type="submit" className="btn-principal" disabled={guardandoDatos}>
                      {guardandoDatos ? 'Guardando…' : 'Guardar'}
                    </button>
                    <button type="button" className="equipo-cancelar" onClick={() => setEditandoDatos(false)}>
                      Cancelar
                    </button>
                  </div>
                </form>
              ) : (
                <>
                  <dl className="mis-datos-lista">
                    <div><dt>Equipo</dt><dd>{nombreEquipoActual || 'Sin asignar'}</dd></div>
                    <div><dt>Peso</dt><dd>{misDatos.peso_corporal_kg ? `${misDatos.peso_corporal_kg} kg` : '—'}</dd></div>
                    <div><dt>Altura</dt><dd>{misDatos.altura_m ? `${misDatos.altura_m} m` : '—'}</dd></div>
                    <div><dt>Fecha de nacimiento</dt><dd>
                      {misDatos.fecha_nacimiento
                        ? `${new Date(misDatos.fecha_nacimiento).toLocaleDateString('es-ES')} (${calcularEdad(misDatos.fecha_nacimiento)} años)`
                        : '—'}
                    </dd></div>
                    <div><dt>Sexo</dt><dd>{traducirSexo(misDatos.sexo)}</dd></div>
                  </dl>
                  {mensajeDatos && (
                    <div className={mensajeDatos.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'} style={{ marginTop: 12 }}>
                      {mensajeDatos.texto}
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </div>
      ) : (
        <div className="player-layout">
          <div className="player-columna-principal">
            <button type="button" className="volver-calendario" onClick={() => setVista('calendario')}>
              ← Volver al calendario
            </button>

            <div className="fecha-dia-titulo">
              <h2 className="capitalizada">{formatearFechaLarga(fechaSeleccionada)}</h2>
              {esHoy && <span className="ya-guardado-badge">Hoy</span>}
            </div>

            <section className="player-form-card">
              <div className="player-form-header">
                <h2>Bienestar <span className="momento-dia">— al despertar</span></h2>
                {!cargandoRegistro && bienestarYaGuardado && <span className="ya-guardado-badge">✓ Guardado</span>}
              </div>

              <form onSubmit={guardarBienestar}>
                {escalas.map((esc) => {
                  const color = colorParaValor(valores[esc.clave], 5, esc.invertido)
                  return (
                    <div className="rpe-bloque" key={esc.clave}>
                      <div className="rpe-cabecera">
                        <span>{esc.etiqueta}</span>
                        <span className="rpe-valor mono" style={{ color }}>{valores[esc.clave]}</span>
                      </div>
                      <input
                        type="range" min="1" max="5" value={valores[esc.clave]}
                        onChange={(e) => setValores({ ...valores, [esc.clave]: Number(e.target.value) })}
                        className={`slider ${esc.invertido ? 'slider-gradiente-invertido' : 'slider-gradiente'}`}
                      />
                      <div className="rpe-escala">
                        <span>{esc.bajo}</span><span>{esc.alto}</span>
                      </div>
                    </div>
                  )
                })}

                <label className="campo-checkbox">
                  <input
                    type="checkbox" checked={tieneMolestia}
                    onChange={(e) => { setTieneMolestia(e.target.checked); if (!e.target.checked) setZonaMolestia('') }}
                  />
                  <span>Tengo alguna molestia o dolor localizado</span>
                </label>

                {tieneMolestia && (
                  <label className="campo-notas">
                    <span>¿En qué parte del cuerpo?</span>
                    <select value={zonaMolestia} onChange={(e) => setZonaMolestia(e.target.value)} required>
                      <option value="" disabled>Selecciona una zona</option>
                      {zonasCuerpo.map((z) => <option key={z} value={z}>{z}</option>)}
                    </select>
                  </label>
                )}

                {mensajeBienestar && (
                  <div className={mensajeBienestar.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensajeBienestar.texto}</div>
                )}

                <button type="submit" className="btn-principal" disabled={guardandoBienestar}>
                  {guardandoBienestar ? 'Guardando…' : bienestarYaGuardado ? 'Actualizar bienestar' : 'Guardar bienestar'}
                </button>
              </form>
            </section>

            <section className="player-form-card">
              <div className="player-form-header">
                <h2>RPE de la sesión <span className="momento-dia">— después de entrenar</span></h2>
                {!cargandoRegistro && rpeYaGuardado && <span className="ya-guardado-badge">✓ Guardado</span>}
              </div>

              <form onSubmit={guardarRpe}>
                <div className="rpe-bloque">
                  <div className="rpe-cabecera">
                    <span>Esfuerzo percibido</span>
                    <span className="rpe-valor mono" style={{ color: colorParaValor(rpe, 10) }}>
                      {rpe} · {descripcionesRPE[rpe]}
                    </span>
                  </div>
                  <input
                    type="range" min="0" max="10" value={rpe}
                    onChange={(e) => setRpe(Number(e.target.value))}
                    className="slider slider-rpe slider-gradiente"
                  />
                  <div className="rpe-escala">
                    <span>Ningún esfuerzo</span><span>Máximo</span>
                  </div>
                </div>

                {cargandoDuracion ? null : duracionDia !== null ? (
                  <div className="carga-preview mono">
                    Duración (fijada por el entrenador): <strong>{duracionDia} min</strong>
                    {' '}→ Carga estimada: <strong>{rpe * duracionDia}</strong> u.a.
                  </div>
                ) : (
                  <div className="aviso-pendiente mono">
                    El entrenador aún no ha indicado la duración de la sesión de este día.
                    Puedes guardar tu RPE igualmente — la carga se calculará en cuanto la añada.
                  </div>
                )}

                <label className="campo-notas">
                  <span>Notas (opcional)</span>
                  <textarea
                    value={notas} onChange={(e) => setNotas(e.target.value)}
                    placeholder="Sensaciones, contexto de la sesión…"
                    rows={2}
                  />
                </label>

                {mensajeRpe && (
                  <div className={mensajeRpe.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensajeRpe.texto}</div>
                )}

                <button type="submit" className="btn-principal" disabled={guardandoRpe}>
                  {guardandoRpe ? 'Guardando…' : rpeYaGuardado ? 'Actualizar RPE' : 'Guardar RPE'}
                </button>
              </form>
            </section>
          </div>
        </div>
      )}
    </div>
  )
}
