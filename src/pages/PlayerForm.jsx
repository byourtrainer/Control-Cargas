import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colorParaValor } from '../lib/colorEscalas'
import './PlayerForm.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

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
  const [rpe, setRpe] = useState(5)
  const [valores, setValores] = useState({ sueno: 3, fatiga: 3, dolor_muscular: 3, estres: 3, animo: 3 })
  const [tieneMolestia, setTieneMolestia] = useState(false)
  const [zonaMolestia, setZonaMolestia] = useState('')
  const [notas, setNotas] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [historial, setHistorial] = useState([])
  const [cargandoHistorial, setCargandoHistorial] = useState(true)
  const [duracionHoy, setDuracionHoy] = useState(null)
  const [cargandoDuracion, setCargandoDuracion] = useState(true)
  const [equipos, setEquipos] = useState([])
  const [equipoId, setEquipoId] = useState(perfil.equipo_id || '')
  const [editandoEquipo, setEditandoEquipo] = useState(!perfil.equipo_id)
  const [guardandoEquipo, setGuardandoEquipo] = useState(false)

  useEffect(() => { cargarHistorial(); cargarDuracionHoy(); cargarEquipos() }, [])

  async function cargarEquipos() {
    const { data } = await supabase.from('equipos').select('*').order('nombre')
    setEquipos(data || [])
  }

  async function manejarCambioEquipo(e) {
    const nuevoId = e.target.value
    setEquipoId(nuevoId)
    setGuardandoEquipo(true)
    await supabase.rpc('actualizar_mi_equipo', { nuevo_equipo_id: nuevoId || null })
    setGuardandoEquipo(false)
    if (nuevoId) setEditandoEquipo(false)
  }

  async function cargarDuracionHoy() {
    setCargandoDuracion(true)
    const { data } = await supabase
      .from('sesiones')
      .select('duracion_min')
      .eq('fecha', hoyISO())
      .maybeSingle()
    setDuracionHoy(data ? data.duracion_min : null)
    setCargandoDuracion(false)
  }

  async function cargarHistorial() {
    setCargandoHistorial(true)
    const { data, error } = await supabase
      .from('registros_diarios')
      .select('*')
      .eq('jugador_id', perfil.id)
      .order('fecha', { ascending: false })
      .limit(7)
    if (!error) setHistorial(data)
    setCargandoHistorial(false)
  }

  async function manejarEnvio(e) {
    e.preventDefault()
    if (tieneMolestia && !zonaMolestia) {
      setMensaje({ tipo: 'error', texto: 'Indica en qué parte del cuerpo tienes la molestia.' })
      return
    }
    setEnviando(true)
    setMensaje(null)

    const { error } = await supabase.from('registros_diarios').upsert({
      jugador_id: perfil.id,
      fecha: hoyISO(),
      rpe,
      ...valores,
      tiene_molestia: tieneMolestia,
      zona_molestia: tieneMolestia ? zonaMolestia : null,
      notas: notas || null,
    }, { onConflict: 'jugador_id,fecha' })

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar. Inténtalo de nuevo.' })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Registro de hoy guardado correctamente.' })
      cargarHistorial()
    }
    setEnviando(false)
  }

  const nombreEquipoActual = equipos.find((eq) => eq.id === equipoId)?.nombre

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

      <div className="player-layout">
        <section className="player-form-card">
          <div className="player-form-header">
            <h2>Registro de hoy</h2>
            <span className="mono fecha-hoy">{hoyISO()}</span>
          </div>

          <form onSubmit={manejarEnvio}>
            <h3 className="bienestar-titulo bienestar-titulo-primero">
              Bienestar <span className="momento-dia">— al despertar</span>
            </h3>
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
                    className="slider"
                    style={{ accentColor: color }}
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

            <h3 className="bienestar-titulo">
              RPE de la sesión <span className="momento-dia">— después de entrenar</span>
            </h3>
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
                className="slider slider-rpe"
                style={{ accentColor: colorParaValor(rpe, 10) }}
              />
              <div className="rpe-escala">
                <span>Ningún esfuerzo</span><span>Máximo</span>
              </div>
            </div>

            {cargandoDuracion ? null : duracionHoy !== null ? (
              <div className="carga-preview mono">
                Duración de hoy (fijada por el entrenador): <strong>{duracionHoy} min</strong>
                {' '}→ Carga estimada: <strong>{rpe * duracionHoy}</strong> u.a.
              </div>
            ) : (
              <div className="aviso-pendiente mono">
                El entrenador aún no ha indicado la duración de la sesión de hoy.
                Puedes guardar tu RPE igualmente — la carga se calculará en cuanto la añada.
              </div>
            )}

            <label className="campo-notas">
              <span>Notas (opcional)</span>
              <textarea
                value={notas} onChange={(e) => setNotas(e.target.value)}
                placeholder="Molestias, sensaciones, contexto…"
                rows={2}
              />
            </label>

            {mensaje && (
              <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>
            )}

            <button type="submit" className="btn-principal" disabled={enviando}>
              {enviando ? 'Guardando…' : 'Guardar registro de hoy'}
            </button>
          </form>
        </section>

        <section className="historial-card">
          <h3>Últimos 7 registros</h3>
          {cargandoHistorial ? (
            <p className="mono texto-dim">Cargando…</p>
          ) : historial.length === 0 ? (
            <p className="texto-dim">Aún no has registrado ninguna sesión.</p>
          ) : (
            <table className="historial-tabla">
              <thead>
                <tr><th>Fecha</th><th>RPE</th><th>Min</th><th>Carga</th></tr>
              </thead>
              <tbody>
                {historial.map((r) => (
                  <tr key={r.id}>
                    <td className="mono">{r.fecha}</td>
                    <td>{r.rpe}</td>
                    <td>{r.duracion_min}</td>
                    <td className="mono">{r.carga}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </div>
    </div>
  )
}
