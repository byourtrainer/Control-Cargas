import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { clubIdDePerfil } from '../lib/alcance'
import { fechaISOLocal, hoyISOLocal } from '../lib/fechas'
import './Multas.css'

function lunesDe(fecha) {
  const d = new Date(fecha)
  d.setHours(12, 0, 0, 0)
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7))
  return d
}

export default function Multas({ perfil }) {
  const clubPerfil = clubIdDePerfil(perfil)
  const [clubes, setClubes] = useState([])
  const [clubId, setClubId] = useState(clubPerfil)
  const [lunes, setLunes] = useState(lunesDe(new Date()))
  const [jugadores, setJugadores] = useState([])
  const [registros, setRegistros] = useState([])
  const [sesiones, setSesiones] = useState([])
  const [cargando, setCargando] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    supabase.from('clubes').select('id, nombre, multas_activas').order('nombre').then(({ data, error: e }) => {
      if (e) { setError('No se pudo cargar el club. ¿Has ejecutado migracion_multas.sql?'); return }
      setClubes(data || [])
      if (!clubPerfil && data?.length) setClubId((c) => c || data[0].id)
    })
  }, [clubPerfil])

  const club = clubes.find((c) => c.id === clubId)

  const dias = useMemo(() => {
    const hoy = hoyISOLocal()
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(lunes); d.setDate(d.getDate() + i)
      return fechaISOLocal(d)
    }).filter((f) => f <= hoy)
  }, [lunes])

  const desde = fechaISOLocal(lunes)
  const finSemana = new Date(lunes); finSemana.setDate(finSemana.getDate() + 6)
  const hasta = fechaISOLocal(finSemana)

  useEffect(() => {
    if (!clubId || !club?.multas_activas) { setJugadores([]); return }
    let activo = true
    ;(async () => {
      setCargando(true)
      const { data: js } = await supabase.from('perfiles')
        .select('id, nombre, equipos!inner(nombre, club_id)')
        .eq('rol', 'jugador').eq('equipos.club_id', clubId).order('nombre')
      const ids = (js || []).map((j) => j.id)
      let regs = [], ses = []
      if (ids.length) {
        const r1 = await supabase.from('registros_diarios').select('jugador_id, fecha, sueno')
          .in('jugador_id', ids).gte('fecha', desde).lte('fecha', hasta)
        const r2 = await supabase.from('sesiones').select('jugador_id, fecha, rpe')
          .in('jugador_id', ids).gte('fecha', desde).lte('fecha', hasta)
        regs = r1.data || []; ses = r2.data || []
      }
      if (!activo) return
      setJugadores(js || []); setRegistros(regs); setSesiones(ses); setCargando(false)
    })()
    return () => { activo = false }
  }, [clubId, club?.multas_activas, desde, hasta])

  async function cambiarInterruptor(valor) {
    const { error: e } = await supabase.from('clubes').update({ multas_activas: valor }).eq('id', clubId)
    if (e) { alert('No se pudo cambiar: ' + e.message); return }
    setClubes((cs) => cs.map((c) => (c.id === clubId ? { ...c, multas_activas: valor } : c)))
  }

  const filas = useMemo(() => {
    const hoy = hoyISOLocal()
    return jugadores.map((j) => {
      const conBienestar = new Set(registros.filter((r) => r.jugador_id === j.id && r.sueno != null).map((r) => r.fecha))
      const bienestar = dias.filter((f) => !conBienestar.has(f)).length
      // RPE pendiente: sesión de un día ya pasado (o de hoy) sin RPE.
      const rpe = sesiones.filter((s) => s.jugador_id === j.id && s.rpe == null && s.fecha <= hoy).length
      return { ...j, bienestar, rpe, total: bienestar + rpe }
    }).sort((a, b) => b.total - a.total)
  }, [jugadores, registros, sesiones, dias])

  const mover = (n) => setLunes((l) => { const d = new Date(l); d.setDate(d.getDate() + 7 * n); return d })
  const esActual = desde === fechaISOLocal(lunesDe(new Date()))

  return (
    <div className="multas-card">
      <div className="multas-cabecera">
        <h2>Multas por cuestionarios</h2>
        {!clubPerfil && (
          <select value={clubId || ''} onChange={(e) => setClubId(e.target.value)}>
            {clubes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        )}
        {club && (
          <label className="multas-switch">
            <input type="checkbox" checked={!!club.multas_activas} onChange={(e) => cambiarInterruptor(e.target.checked)} />
            Multas activadas {club.nombre ? `(${club.nombre})` : ''}
          </label>
        )}
      </div>
      {error && <p>{error}</p>}
      {club && !club.multas_activas && <p>Las multas están desactivadas para este club. Actívalas para ver el recuento semanal.</p>}
      {club?.multas_activas && (
        <>
          <div className="multas-semana">
            <button onClick={() => mover(-1)}>← Anterior</button>
            <strong>{desde} → {hasta}</strong>
            <button onClick={() => mover(1)} disabled={esActual}>Siguiente →</button>
          </div>
          <p className="multas-nota">
            Bienestar: días de la semana (hasta hoy) sin cuestionario respondido. RPE: sesiones de la semana sin RPE. Solo recuento, sin importes.
          </p>
          {cargando ? <p>Cargando…</p> : (
            <div className="tabla-scroll">
              <table className="multas-tabla">
                <thead>
                  <tr><th>Jugador</th><th>Equipo</th><th className="num">Bienestar sin contestar</th><th className="num">RPE sin contestar</th><th className="num">Total</th></tr>
                </thead>
                <tbody>
                  {filas.map((f) => (
                    <tr key={f.id}>
                      <td>{f.nombre}</td>
                      <td>{f.equipos?.nombre}</td>
                      <td className="num">{f.bienestar}</td>
                      <td className="num">{f.rpe}</td>
                      <td className={`num ${f.total ? 'multas-alerta' : ''}`}>{f.total}</td>
                    </tr>
                  ))}
                  {!filas.length && <tr><td colSpan="5">Sin jugadores.</td></tr>}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
