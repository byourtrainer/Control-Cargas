import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { hoyISOLocal } from '../lib/fechas'
import { agruparPorFecha, num } from '../lib/cargas'
import HistorialEjercicio, { SelectorDestinatario, useDestinatarios } from './HistorialEjercicio'
import './Valoracion.css'
import './HistorialEjercicio.css'

const serieVacia = () => ({ kg: '', reps: '', velocidad: '', rir: '' })

export default function Cargas({ perfil }) {
  const destinatarios = useDestinatarios(perfil)
  const [clave, setClave] = useState('')
  const [fecha, setFecha] = useState(hoyISOLocal())
  const [ejercicios, setEjercicios] = useState([])
  const [busqueda, setBusqueda] = useState('')
  const [ejercicio, setEjercicio] = useState(null)
  const [series, setSeries] = useState([serieVacia()])
  const [notas, setNotas] = useState('')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [refrescar, setRefrescar] = useState(0)

  const destinatario = destinatarios.find((d) => d.clave === clave) || null

  useEffect(() => {
    supabase.from('ejercicios').select('id, nombre, categoria').order('nombre').then(({ data }) => setEjercicios(data || []))
  }, [])

  const coincidencias = useMemo(() => {
    const q = busqueda.trim().toLowerCase()
    if (!q) return []
    return ejercicios.filter((e) => e.nombre.toLowerCase().includes(q)).slice(0, 8)
  }, [ejercicios, busqueda])

  const setSerie = (i, k, v) => setSeries((ss) => ss.map((s, n) => (n === i ? { ...s, [k]: v } : s)))
  const anadirSerie = () => setSeries((ss) => [...ss, ss.length ? { ...ss[ss.length - 1], velocidad: '' } : serieVacia()])
  const quitarSerie = (i) => setSeries((ss) => (ss.length > 1 ? ss.filter((_, n) => n !== i) : ss))

  async function copiarUltima() {
    const { data } = await supabase.from('cargas_ejercicio').select('*')
      .eq('destinatario_tipo', destinatario.tipo).eq('destinatario_id', destinatario.id)
      .eq('ejercicio_id', String(ejercicio.id)).order('fecha', { ascending: false }).order('serie').limit(40)
    const ultima = agruparPorFecha(data || [])[0]
    if (!ultima) { setMensaje({ tipo: 'error', texto: 'No hay sesión anterior de este ejercicio.' }); return }
    setSeries(ultima.series.map((s) => ({ kg: s.kg ?? '', reps: s.reps ?? '', velocidad: '', rir: '' })))
    setMensaje({ tipo: 'ok', texto: `Series copiadas de ${ultima.fecha} (velocidad y RIR vacíos).` })
  }

  async function guardar() {
    const validas = series.map((s, i) => ({ ...s, serie: i + 1 })).filter((s) => num(s.kg) !== null || num(s.reps) !== null)
    if (!validas.length) { setMensaje({ tipo: 'error', texto: 'Anota al menos una serie con kg o repeticiones.' }); return }
    setGuardando(true); setMensaje(null)
    const filas = validas.map((s) => ({
      destinatario_tipo: destinatario.tipo, destinatario_id: destinatario.id,
      ejercicio_id: String(ejercicio.id), ejercicio_nombre: ejercicio.nombre,
      fecha, serie: s.serie, kg: num(s.kg), reps: num(s.reps), velocidad: num(s.velocidad), rir: num(s.rir),
      notas: notas || null,
    }))
    const { error } = await supabase.from('cargas_ejercicio').insert(filas)
    setGuardando(false)
    if (error) { setMensaje({ tipo: 'error', texto: error.message }); return }
    setMensaje({ tipo: 'ok', texto: `${filas.length} serie(s) guardadas.` })
    setSeries([serieVacia()]); setNotas('')
    setRefrescar((n) => n + 1)
  }

  return (
    <div className="valoracion-card">
      <div className="valoracion-cabecera">
        <h2>Historial de cargas</h2>
        <SelectorDestinatario lista={destinatarios} valor={clave} onChange={setClave} />
      </div>

      {!destinatario ? <p className="texto-dim">Elige un cliente o jugador para registrar y consultar sus cargas.</p> : (
        <div className="val-form">
          <section>
            <h3>Registrar serie(s)</h3>
            <div className="val-grid">
              <label className="val-campo"><span>Fecha</span><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></label>
              <label className="val-campo val-campo-2">
                <span>Ejercicio</span>
                {ejercicio ? (
                  <div><strong>{ejercicio.nombre}</strong>{' '}
                    <button type="button" className="val-quitar" onClick={() => { setEjercicio(null); setBusqueda('') }}>Cambiar</button></div>
                ) : (
                  <input placeholder="Buscar en la biblioteca…" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                )}
              </label>
            </div>
            {!ejercicio && coincidencias.length > 0 && (
              <div className="val-grid">{coincidencias.map((e) => (
                <button type="button" key={e.id} className="val-anadir" onClick={() => { setEjercicio(e); setSeries([serieVacia()]) }}>{e.nombre}</button>
              ))}</div>
            )}

            {ejercicio && (
              <>
                <table className="val-tabla val-tabla-entrada">
                  <thead><tr><th>Serie</th><th>Kg</th><th>Reps</th><th>Vel. media (m/s)</th><th>RIR</th><th></th></tr></thead>
                  <tbody>{series.map((s, i) => (
                    <tr key={i}>
                      <td>{i + 1}</td>
                      <td><input type="number" step="any" value={s.kg} onChange={(e) => setSerie(i, 'kg', e.target.value)} /></td>
                      <td><input type="number" value={s.reps} onChange={(e) => setSerie(i, 'reps', e.target.value)} /></td>
                      <td><input type="number" step="0.01" value={s.velocidad} onChange={(e) => setSerie(i, 'velocidad', e.target.value)} /></td>
                      <td><input type="number" step="0.5" value={s.rir} onChange={(e) => setSerie(i, 'rir', e.target.value)} /></td>
                      <td><button type="button" className="val-quitar" onClick={() => quitarSerie(i)}>✕</button></td>
                    </tr>
                  ))}</tbody>
                </table>
                <div className="val-acciones">
                  <button type="button" className="val-anadir" onClick={anadirSerie}>+ Serie (copia la anterior)</button>
                  <button type="button" className="val-anadir" onClick={copiarUltima}>↺ Copiar última sesión</button>
                </div>
                <label className="val-campo val-campo-2"><span>Notas</span><input value={notas} onChange={(e) => setNotas(e.target.value)} /></label>
                <div className="val-acciones">
                  <button type="button" className="val-guardar" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar series'}</button>
                  {mensaje && <span className={mensaje.tipo === 'error' ? 'val-error' : 'val-ok'}>{mensaje.texto}</span>}
                </div>
              </>
            )}
          </section>

          {ejercicio && (
            <section>
              <h3>Historial · {ejercicio.nombre}</h3>
              <HistorialEjercicio destinatario={destinatario} ejercicio={ejercicio} refrescar={refrescar} />
            </section>
          )}
        </div>
      )}
    </div>
  )
}
