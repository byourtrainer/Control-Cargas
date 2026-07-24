import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { calcularMetricas } from '../lib/cargaMetrics'
import './Lesiones.css'

const hoyISO = () => new Date().toISOString().slice(0, 10)

const tipologias = ['Muscular', 'Osteo-articular', 'Ligamentosa', 'Tendinosa', 'Otro']
const momentos = ['Entrenamiento', 'Partido']
const lados = ['Izquierdo', 'Derecho', 'Bilateral', 'No aplica']
const severidades = ['Leve', 'Moderada', 'Grave']

const vacio = {
  jugador_id: '', fecha_lesion: hoyISO(), momento: 'Entrenamiento', tipologia: 'Muscular',
  causa: '', lado: 'No aplica', parte_cuerpo: '', contacto: false, fecha_regreso: '',
  severidad: 'Leve', dias_baja: '', notas: '',
}

export default function Lesiones() {
  const [jugadores, setJugadores] = useState([])
  const [lesiones, setLesiones] = useState([])
  const [form, setForm] = useState(vacio)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [previsualizacion, setPrevisualizacion] = useState(null)

  useEffect(() => { cargarTodo() }, [])

  useEffect(() => { calcularPrevisualizacion() }, [form.jugador_id, form.fecha_lesion])

  async function cargarTodo() {
    setCargando(true)
    const [{ data: perfiles }, { data: lesionesData }] = await Promise.all([
      supabase.from('perfiles').select('*').eq('rol', 'jugador').order('nombre'),
      supabase.from('lesiones').select('*, perfiles(nombre)').order('fecha_lesion', { ascending: false }),
    ])
    setJugadores(perfiles || [])
    setLesiones(lesionesData || [])
    setCargando(false)
  }

  async function calcularPrevisualizacion() {
    if (!form.jugador_id || !form.fecha_lesion) { setPrevisualizacion(null); return }
    const { data } = await supabase
      .from('registros_diarios')
      .select('fecha, carga')
      .eq('jugador_id', form.jugador_id)
      .lte('fecha', form.fecha_lesion)
    const metricas = calcularMetricas(data || [], 'clasico', new Date(form.fecha_lesion))
    setPrevisualizacion(metricas)
  }

  async function manejarEnvio(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)

    const { error } = await supabase.from('lesiones').insert({
      jugador_id: form.jugador_id,
      fecha_lesion: form.fecha_lesion,
      momento: form.momento,
      tipologia: form.tipologia,
      causa: form.causa || null,
      lado: form.lado,
      parte_cuerpo: form.parte_cuerpo || null,
      contacto: form.contacto,
      fecha_regreso: form.fecha_regreso || null,
      severidad: form.severidad,
      dias_baja: form.dias_baja === '' ? null : Number(form.dias_baja),
      acwr_en_lesion: previsualizacion?.acwrPost ?? null,
      cambio_semanal_en_lesion: previsualizacion?.cambioSemanal ?? null,
      notas: form.notas || null,
    })

    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar la lesión.' })
    } else {
      setMensaje({ tipo: 'ok', texto: 'Lesión registrada correctamente.' })
      setForm(vacio)
      cargarTodo()
    }
    setGuardando(false)
  }

  return (
    <div className="lesiones-layout">
      <section className="lesion-form-card">
        <h2>Registrar lesión</h2>
        <form onSubmit={manejarEnvio}>
          <label className="campo-lesion">
            <span>Jugador</span>
            <select
              value={form.jugador_id}
              onChange={(e) => setForm({ ...form, jugador_id: e.target.value })}
              required
            >
              <option value="" disabled>Selecciona un jugador</option>
              {jugadores.map((j) => <option key={j.id} value={j.id}>{j.nombre}</option>)}
            </select>
          </label>

          <div className="fila-doble">
            <label className="campo-lesion">
              <span>Fecha de lesión</span>
              <input
                type="date" value={form.fecha_lesion}
                onChange={(e) => setForm({ ...form, fecha_lesion: e.target.value })}
                required
              />
            </label>
            <label className="campo-lesion">
              <span>Momento</span>
              <select value={form.momento} onChange={(e) => setForm({ ...form, momento: e.target.value })}>
                {momentos.map((m) => <option key={m} value={m}>{m}</option>)}
              </select>
            </label>
          </div>

          {form.jugador_id && (
            <div className="preview-carga mono">
              {previsualizacion === null ? (
                'Calculando carga en el momento de la lesión…'
              ) : (
                <>
                  ACWR en esa fecha: <strong>{previsualizacion.acwrPost !== null ? previsualizacion.acwrPost.toFixed(2) : '—'}</strong>
                  {' '}· Cambio semanal: <strong>
                    {previsualizacion.cambioSemanal !== null ? `${previsualizacion.cambioSemanal > 0 ? '+' : ''}${Math.round(previsualizacion.cambioSemanal * 100)}%` : '—'}
                  </strong>
                  <div className="preview-nota">Se guardará automáticamente junto con la lesión.</div>
                </>
              )}
            </div>
          )}

          <div className="fila-doble">
            <label className="campo-lesion">
              <span>Tipología</span>
              <select value={form.tipologia} onChange={(e) => setForm({ ...form, tipologia: e.target.value })}>
                {tipologias.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label className="campo-lesion">
              <span>Lado</span>
              <select value={form.lado} onChange={(e) => setForm({ ...form, lado: e.target.value })}>
                {lados.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
          </div>

          <label className="campo-lesion">
            <span>Parte del cuerpo</span>
            <input
              type="text" value={form.parte_cuerpo}
              onChange={(e) => setForm({ ...form, parte_cuerpo: e.target.value })}
              placeholder="Ej. Isquiotibial, tobillo, rodilla…"
            />
          </label>

          <label className="campo-lesion">
            <span>Causa / motivo</span>
            <input
              type="text" value={form.causa}
              onChange={(e) => setForm({ ...form, causa: e.target.value })}
              placeholder="Ej. Sobrecarga, gesto explosivo, contacto…"
            />
          </label>

          <label className="campo-checkbox">
            <input
              type="checkbox" checked={form.contacto}
              onChange={(e) => setForm({ ...form, contacto: e.target.checked })}
            />
            <span>Hubo contacto con otro jugador</span>
          </label>

          <div className="fila-doble">
            <label className="campo-lesion">
              <span>Severidad</span>
              <select value={form.severidad} onChange={(e) => setForm({ ...form, severidad: e.target.value })}>
                {severidades.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            <label className="campo-lesion">
              <span>Días de baja (estimados)</span>
              <input
                type="number" min="0" value={form.dias_baja}
                onChange={(e) => setForm({ ...form, dias_baja: e.target.value })}
              />
            </label>
          </div>

          <label className="campo-lesion">
            <span>Fecha estimada de regreso (opcional)</span>
            <input
              type="date" value={form.fecha_regreso}
              onChange={(e) => setForm({ ...form, fecha_regreso: e.target.value })}
            />
          </label>

          <label className="campo-lesion">
            <span>Notas</span>
            <textarea
              value={form.notas} onChange={(e) => setForm({ ...form, notas: e.target.value })}
              rows={2} placeholder="Contexto adicional, parte médico…"
            />
          </label>

          {mensaje && (
            <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>
          )}

          <button type="submit" className="btn-principal" disabled={guardando}>
            {guardando ? 'Guardando…' : 'Registrar lesión'}
          </button>
        </form>
      </section>

      <section className="lesiones-historial-card">
        <h3>Historial de lesiones</h3>
        {cargando ? (
          <p className="mono texto-dim">Cargando…</p>
        ) : lesiones.length === 0 ? (
          <p className="texto-dim">Todavía no hay lesiones registradas.</p>
        ) : (
          <div className="tabla-scroll">
            <table className="lesiones-tabla">
              <thead>
                <tr>
                  <th>Fecha</th><th>Jugador</th><th>Tipología</th><th>Zona</th>
                  <th>Severidad</th><th>Días baja</th><th>ACWR</th><th>Cambio semanal</th>
                </tr>
              </thead>
              <tbody>
                {lesiones.map((l) => (
                  <tr key={l.id}>
                    <td className="mono">{l.fecha_lesion}</td>
                    <td>{l.perfiles?.nombre || '—'}</td>
                    <td>{l.tipologia}</td>
                    <td>{l.parte_cuerpo || '—'}</td>
                    <td><span className={`severidad-badge severidad-${l.severidad?.toLowerCase()}`}>{l.severidad}</span></td>
                    <td className="mono">{l.dias_baja ?? '—'}</td>
                    <td className="mono">{l.acwr_en_lesion !== null ? Number(l.acwr_en_lesion).toFixed(2) : '—'}</td>
                    <td className="mono">
                      {l.cambio_semanal_en_lesion !== null
                        ? `${l.cambio_semanal_en_lesion > 0 ? '+' : ''}${Math.round(l.cambio_semanal_en_lesion * 100)}%`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
