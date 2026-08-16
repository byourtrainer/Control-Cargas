import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { calcularEstadoCiclo, infoFase, avisoEstimacionCiclo } from '../lib/ciclosMenstruales'
import './CicloMenstrual.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

export default function CicloMenstrual({ jugadorId, editable = true }) {
  const [ciclos, setCiclos] = useState([])
  const [cargando, setCargando] = useState(true)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [mostrarFechaManual, setMostrarFechaManual] = useState(false)
  const [fechaManual, setFechaManual] = useState('')

  useEffect(() => { cargarCiclos() }, [jugadorId])

  async function cargarCiclos() {
    setCargando(true)
    const { data } = await supabase
      .from('ciclos_menstruales')
      .select('*')
      .eq('jugador_id', jugadorId)
      .order('fecha_inicio', { ascending: true })
    setCiclos(data || [])
    setCargando(false)
  }

  async function marcarInicio(fecha) {
    setGuardando(true)
    setMensaje(null)
    const { error } = await supabase.from('ciclos_menstruales').insert({ jugador_id: jugadorId, fecha_inicio: fecha })
    if (error) {
      setMensaje({
        tipo: 'error',
        texto: error.code === '23505' ? 'Ya tienes registrado ese día como inicio.' : 'No se pudo guardar.',
      })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Registrado.' })
      setFechaManual('')
      setMostrarFechaManual(false)
      cargarCiclos()
    }
    setGuardando(false)
  }

  function marcarInicioHoy() {
    marcarInicio(hoyISO())
  }

  function confirmarFechaManual() {
    if (!fechaManual) {
      setMensaje({ tipo: 'error', texto: 'Elige primero una fecha.' })
      return
    }
    if (fechaManual > hoyISO()) {
      setMensaje({ tipo: 'error', texto: 'Esa fecha todavía no ha llegado.' })
      return
    }
    marcarInicio(fechaManual)
  }

  async function eliminarCiclo(id) {
    const { error } = await supabase.from('ciclos_menstruales').delete().eq('id', id)
    if (!error) setCiclos((prev) => prev.filter((c) => c.id !== id))
  }

  if (cargando) return <p className="mono texto-dim">Cargando…</p>

  const estado = calcularEstadoCiclo(ciclos)
  const historialDescendente = [...ciclos].reverse()

  return (
    <section className="ciclo-card">
      <h3>Ciclo menstrual</h3>

      {editable && (
        <>
          <button className="btn-principal ciclo-boton-marcar" onClick={marcarInicioHoy} disabled={guardando}>
            {guardando ? 'Guardando…' : '+ Hoy me ha venido la regla'}
          </button>

          {!mostrarFechaManual ? (
            <button type="button" className="ciclo-boton-fecha-manual" onClick={() => setMostrarFechaManual(true)}>
              ¿No fue hoy? Indica otra fecha
            </button>
          ) : (
            <div className="ciclo-fecha-manual">
              <input
                type="date" value={fechaManual} max={hoyISO()}
                onChange={(e) => setFechaManual(e.target.value)}
              />
              <button type="button" className="ciclo-boton-confirmar" onClick={confirmarFechaManual} disabled={guardando}>
                {guardando ? 'Guardando…' : 'Confirmar'}
              </button>
              <button type="button" className="ciclo-boton-fecha-manual" onClick={() => { setMostrarFechaManual(false); setFechaManual('') }}>
                Cancelar
              </button>
            </div>
          )}

          {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}
        </>
      )}

      {!estado ? (
        <p className="texto-dim ciclo-sin-datos">
          {editable
            ? 'Todavía no hay ningún registro — marca el día que te empiece la regla (o, si tu última regla ya pasó, indica esa fecha) para empezar a ver tu fase estimada.'
            : 'Esta jugadora todavía no ha registrado ningún ciclo.'}
        </p>
      ) : (
        <div className="ciclo-estado">
          <p className="ciclo-dia mono">
            Día {estado.diaCiclo} del ciclo
            {estado.conDatosSuficientes
              ? ` · duración media: ${estado.duracionMedia} días`
              : ' · duración media aún no calculable (hace falta un segundo registro)'}
          </p>

          <div className="ciclo-fase-card">
            <h4>Fase estimada: {infoFase[estado.fase].etiqueta}</h4>
            <p>{infoFase[estado.fase].mensaje}</p>
            <p className="texto-faint ciclo-aviso">{avisoEstimacionCiclo}</p>
          </div>
        </div>
      )}

      {ciclos.length > 0 && (
        <div className="ciclo-historial">
          <h4>Historial</h4>
          <ul>
            {historialDescendente.map((c, i) => {
              const anterior = historialDescendente[i + 1]
              const duracion = anterior
                ? Math.round((new Date(c.fecha_inicio) - new Date(anterior.fecha_inicio)) / 86400000)
                : null
              return (
                <li key={c.id}>
                  <span className="mono">{new Date(c.fecha_inicio + 'T00:00:00').toLocaleDateString('es-ES')}</span>
                  <span className="texto-dim">{duracion !== null ? `${duracion} días desde el anterior` : '—'}</span>
                  {editable && (
                    <button className="btn-eliminar-fila" onClick={() => eliminarCiclo(c.id)} title="Eliminar registro">✕</button>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </section>
  )
}
