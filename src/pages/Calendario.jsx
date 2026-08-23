import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { colorParaValor } from '../lib/colorEscalas'
import { calcularBienestar, clasificarBienestar } from '../lib/bienestar'
import './Calendario.css'

const DIAS_SEMANA = ['L', 'M', 'X', 'J', 'V', 'S', 'D']
const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
]

import { fechaISOLocal, hoyISOLocal as hoyISO } from '../lib/fechas'

function colorBienestarDia(registro) {
  if (!registro || registro.sueno === null || registro.sueno === undefined) return null
  const nivel = clasificarBienestar(calcularBienestar(registro))
  return { optimo: 'var(--risk-low)', bueno: 'var(--risk-mid)', malo: 'var(--risk-high)' }[nivel] || null
}

function colorRpeDia(registro) {
  if (!registro || registro.rpe === null || registro.rpe === undefined) return null
  return colorParaValor(registro.rpe, 10)
}

export default function Calendario({ jugadorId, onSeleccionarDia }) {
  const [mesVisible, setMesVisible] = useState(() => {
    const d = new Date()
    d.setDate(1)
    return d
  })
  const [registros, setRegistros] = useState([])
  const [sesiones, setSesiones] = useState([])
  const [cargando, setCargando] = useState(true)

  useEffect(() => { cargarMes() }, [mesVisible, jugadorId])

  async function cargarMes() {
    setCargando(true)
    const inicio = fechaISOLocal(new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1))
    const fin = fechaISOLocal(new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0))
    const [{ data: regs }, { data: sess }] = await Promise.all([
      supabase.from('registros_diarios').select('*')
        .eq('jugador_id', jugadorId).gte('fecha', inicio).lte('fecha', fin),
      supabase.from('sesiones').select('fecha')
        .eq('jugador_id', jugadorId).gte('fecha', inicio).lte('fecha', fin),
    ])
    setRegistros(regs || [])
    setSesiones(sess || [])
    setCargando(false)
  }

  const primerDiaSemana = (new Date(mesVisible.getFullYear(), mesVisible.getMonth(), 1).getDay() + 6) % 7
  const diasEnMes = new Date(mesVisible.getFullYear(), mesVisible.getMonth() + 1, 0).getDate()

  const celdas = []
  for (let i = 0; i < primerDiaSemana; i++) celdas.push(null)
  for (let d = 1; d <= diasEnMes; d++) celdas.push(d)

  function fechaDe(d) {
    const mm = String(mesVisible.getMonth() + 1).padStart(2, '0')
    const dd = String(d).padStart(2, '0')
    return `${mesVisible.getFullYear()}-${mm}-${dd}`
  }

  function cambiarMes(delta) {
    const d = new Date(mesVisible)
    d.setMonth(d.getMonth() + delta)
    setMesVisible(d)
  }

  function irAHoy() {
    const d = new Date()
    d.setDate(1)
    setMesVisible(d)
  }

  const hoy = hoyISO()

  return (
    <section className="calendario-card">
      <div className="calendario-cabecera">
        <button className="calendario-nav" onClick={() => cambiarMes(-1)}>←</button>
        <button className="calendario-mes-titulo" onClick={irAHoy}>
          {MESES[mesVisible.getMonth()]} {mesVisible.getFullYear()}
        </button>
        <button className="calendario-nav" onClick={() => cambiarMes(1)}>→</button>
      </div>

      <div className="calendario-dias-semana">
        {DIAS_SEMANA.map((d) => <span key={d}>{d}</span>)}
      </div>

      <div className={`calendario-grid ${cargando ? 'calendario-cargando' : ''}`}>
        {celdas.map((d, i) => {
          if (d === null) return <div key={i} className="calendario-celda calendario-celda-vacia" />
          const fecha = fechaDe(d)
          const registro = registros.find((r) => r.fecha === fecha)
          const esHoy = fecha === hoy
          const esFuturo = fecha > hoy
          const cBienestar = colorBienestarDia(registro)
          const cRpe = colorRpeDia(registro)
          const haySesion = sesiones.some((s) => s.fecha === fecha)
          return (
            <button
              key={i}
              className={`calendario-celda ${esHoy ? 'calendario-celda-hoy' : ''} ${esFuturo ? 'calendario-celda-futura' : ''}`}
              onClick={() => !esFuturo && onSeleccionarDia(fecha)}
              disabled={esFuturo}
            >
              {haySesion && <span className="calendario-sesion-punto" title="Sesión programada" />}
              <span className="calendario-numero">{d}</span>
              <span className="calendario-barras">
                <span className="calendario-barra" style={{ background: cBienestar || 'var(--line)' }} />
                <span className="calendario-barra" style={{ background: cRpe || 'var(--line)' }} />
              </span>
            </button>
          )
        })}
      </div>

      <div className="calendario-leyenda">
        <span><span className="calendario-leyenda-barra" style={{ background: 'var(--risk-low)' }} /> Bienestar (barra sup.)</span>
        <span><span className="calendario-leyenda-barra" style={{ background: 'var(--accent)' }} /> RPE (barra inf.)</span>
        <span><span className="calendario-sesion-punto calendario-sesion-punto-leyenda" /> Sesión programada</span>
        <span className="texto-dim">Gris = sin registrar</span>
      </div>
    </section>
  )
}
