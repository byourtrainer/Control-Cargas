import { useEffect, useMemo, useState } from 'react'
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts'
import { supabase } from '../lib/supabaseClient'
import { clubIdDePerfil } from '../lib/alcance'
import { agruparPorFecha, resumenPorSesion, textoSerie } from '../lib/cargas'
import './HistorialEjercicio.css'

/** Lista de personas a las que se puede registrar cargas: clientes (solo admin) y jugadores. */
export function useDestinatarios(perfil) {
  const [lista, setLista] = useState([])
  const clubId = clubIdDePerfil(perfil)
  const esAdmin = perfil?.rol === 'administrador'
  useEffect(() => {
    let activo = true
    ;(async () => {
      let q = supabase.from('perfiles').select('id, nombre').eq('rol', 'jugador').order('nombre')
      if (clubId) q = supabase.from('perfiles').select('id, nombre, equipos!inner(club_id)')
        .eq('rol', 'jugador').eq('equipos.club_id', clubId).order('nombre')
      const [{ data: js }, { data: cs }] = await Promise.all([
        q,
        esAdmin ? supabase.from('clientes').select('id, nombre').order('nombre') : Promise.resolve({ data: [] }),
      ])
      if (!activo) return
      setLista([
        ...(cs || []).map((c) => ({ clave: 'cliente:' + c.id, tipo: 'cliente', id: c.id, nombre: c.nombre })),
        ...(js || []).map((j) => ({ clave: 'jugador:' + j.id, tipo: 'jugador', id: j.id, nombre: j.nombre })),
      ])
    })()
    return () => { activo = false }
  }, [clubId, esAdmin])
  return lista
}

export function SelectorDestinatario({ lista, valor, onChange }) {
  const clientes = lista.filter((d) => d.tipo === 'cliente')
  const jugadores = lista.filter((d) => d.tipo === 'jugador')
  return (
    <select value={valor} onChange={(e) => onChange(e.target.value)}>
      <option value="">— Elegir cliente / jugador —</option>
      {clientes.length > 0 && <optgroup label="Clientes personales">{clientes.map((d) => <option key={d.clave} value={d.clave}>{d.nombre}</option>)}</optgroup>}
      {jugadores.length > 0 && <optgroup label="Jugadores de club">{jugadores.map((d) => <option key={d.clave} value={d.clave}>{d.nombre}</option>)}</optgroup>}
    </select>
  )
}

/** Historial de un ejercicio para una persona: última sesión, mejores marcas, gráfica y tabla. */
export default function HistorialEjercicio({ destinatario, ejercicio, refrescar = 0 }) {
  const [filas, setFilas] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let activo = true
    setFilas(null); setError('')
    supabase.from('cargas_ejercicio').select('*')
      .eq('destinatario_tipo', destinatario.tipo).eq('destinatario_id', destinatario.id)
      .eq('ejercicio_id', String(ejercicio.id)).order('fecha', { ascending: false }).order('serie')
      .then(({ data, error: e }) => {
        if (!activo) return
        if (e) setError('No se pudo cargar el historial. ¿Has ejecutado migracion_cargas.sql? ' + e.message)
        setFilas(data || [])
      })
    return () => { activo = false }
  }, [destinatario.tipo, destinatario.id, ejercicio.id, refrescar])

  const sesiones = useMemo(() => agruparPorFecha(filas || []), [filas])
  const resumen = useMemo(() => resumenPorSesion(filas || []), [filas])
  const mejor = useMemo(() => {
    const kgs = resumen.map((r) => r.maxKg).filter(Boolean)
    const e = resumen.map((r) => r.e1rm).filter(Boolean)
    return { kg: kgs.length ? Math.max(...kgs) : null, e1rm: e.length ? Math.max(...e) : null }
  }, [resumen])

  if (error) return <p className="val-error">{error}</p>
  if (!filas) return <p className="texto-dim">Cargando historial…</p>
  if (filas.length === 0) return <p className="texto-dim">{destinatario.nombre} aún no tiene cargas registradas de «{ejercicio.nombre}».</p>

  const ultima = sesiones[0]
  const hayVelocidad = resumen.some((r) => r.velocidad !== null)

  return (
    <div className="hist-ej">
      <div className="hist-ej-resumen">
        <div><span>Última sesión</span><strong>{ultima.fecha}</strong><small>{ultima.series.map(textoSerie).join('  |  ')}</small></div>
        <div><span>Mejor carga</span><strong>{mejor.kg ?? '—'} kg</strong></div>
        <div><span>1RM estimado (máx.)</span><strong>{mejor.e1rm ?? '—'} kg</strong></div>
        <div><span>Sesiones</span><strong>{sesiones.length}</strong></div>
      </div>

      {resumen.length > 1 && (
        <ResponsiveContainer width="100%" height={220}>
          <LineChart data={resumen} margin={{ top: 10, right: 16, bottom: 0, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" />
            <XAxis dataKey="fecha" stroke="var(--text-faint)" fontSize={11} />
            <YAxis yAxisId="kg" stroke="var(--text-faint)" fontSize={11} />
            {hayVelocidad && <YAxis yAxisId="v" orientation="right" stroke="var(--text-faint)" fontSize={11} domain={['auto', 'auto']} />}
            <Tooltip />
            <Legend />
            <Line yAxisId="kg" type="monotone" dataKey="maxKg" name="Kg máx." stroke="#c8ff4d" strokeWidth={2} connectNulls />
            <Line yAxisId="kg" type="monotone" dataKey="e1rm" name="1RM est." stroke="#5ad1ff" strokeWidth={2} strokeDasharray="4 3" connectNulls />
            {hayVelocidad && <Line yAxisId="v" type="monotone" dataKey="velocidad" name="Vel. serie más pesada (m/s)" stroke="#ffbe3c" strokeWidth={2} connectNulls />}
          </LineChart>
        </ResponsiveContainer>
      )}

      <table className="hist-ej-tabla">
        <thead><tr><th>Fecha</th><th>Series (kg × reps · velocidad · RIR)</th></tr></thead>
        <tbody>{sesiones.slice(0, 12).map((s) => (
          <tr key={s.fecha}><td>{s.fecha}</td><td>{s.series.map((x) => textoSerie(x)).join('  |  ')}</td></tr>
        ))}</tbody>
      </table>
      {sesiones.length > 12 && <p className="texto-dim">Mostrando las 12 sesiones más recientes.</p>}
    </div>
  )
}
