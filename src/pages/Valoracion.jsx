import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { clubIdDePerfil } from '../lib/alcance'
import { hoyISOLocal } from '../lib/fechas'
import { traducirTipoTest, ultimosTestsPorTipo } from '../lib/testsFisicos'
import {
  BLOQUES_NEUROMUSCULAR, GRUPOS_ISOMETRIA, UMBRALES, calcularIsometria,
  nivelAsimetria, nivelRatioHQ, nivelRatioAddAbd, fusionarAnamnesis, num,
} from '../lib/valoracion'
import { calcularDatosCuadrante1, calcularDatosCuadrante2, GraficoCuadrante1, GraficoCuadrante2 } from './Tests'
import './Valoracion.css'

const SECCIONES = [
  { clave: 'anamnesis', etiqueta: '1 · Anamnesis' },
  { clave: 'neuro', etiqueta: '2 · Neuromuscular' },
  { clave: 'iso', etiqueta: '3 · Isometría' },
  { clave: 'tests', etiqueta: '4 · Tests y cuadrantes' },
]

const fmt = (v, d = 2) => (v === null || v === undefined ? '—' : Number(v).toFixed(d))

export default function Valoracion({ perfil, equipoActivo = 'todos' }) {
  const clubId = clubIdDePerfil(perfil)
  const esAdmin = perfil?.rol === 'administrador'
  const [jugadores, setJugadores] = useState([])
  const [clientes, setClientes] = useState([])
  const [seleccion, setSeleccion] = useState('') // 'j:<id>' | 'c:<id>'
  const [seccion, setSeccion] = useState('anamnesis')
  const [cargandoLista, setCargandoLista] = useState(true)

  useEffect(() => {
    let activo = true
    ;(async () => {
      setCargandoLista(true)
      let q = supabase.from('perfiles').select('*, equipos(id, nombre, color)').eq('rol', 'jugador').order('nombre')
      if (clubId) q = supabase.from('perfiles').select('*, equipos!inner(id, nombre, color, club_id)')
        .eq('rol', 'jugador').eq('equipos.club_id', clubId).order('nombre')
      const [{ data: js }, { data: cs }] = await Promise.all([
        q,
        // Los clientes personales (sin club) los gestiona el administrador.
        esAdmin ? supabase.from('clientes').select('id, nombre, telefono, programa, activo').order('nombre') : Promise.resolve({ data: [] }),
      ])
      if (!activo) return
      setJugadores(js || [])
      setClientes(cs || [])
      setCargandoLista(false)
    })()
    return () => { activo = false }
  }, [clubId, esAdmin])

  const visibles = useMemo(() => jugadores.filter((j) => {
    if (equipoActivo === 'todos') return true
    if (equipoActivo === 'sin_asignar') return !j.equipo_id
    return j.equipo_id === equipoActivo
  }), [jugadores, equipoActivo])

  const todasLasClaves = useMemo(
    () => [...clientes.map((c) => 'c:' + c.id), ...visibles.map((j) => 'j:' + j.id)],
    [clientes, visibles]
  )

  useEffect(() => {
    if (!todasLasClaves.includes(seleccion)) setSeleccion(todasLasClaves[0] || '')
  }, [todasLasClaves])

  // "sujeto" unifica jugador de club y cliente personal para el resto de la ficha.
  const sujeto = useMemo(() => {
    if (seleccion.startsWith('c:')) {
      const c = clientes.find((x) => 'c:' + x.id === seleccion)
      return c ? { tipo: 'cliente', id: c.id, nombre: c.nombre, cliente: c } : null
    }
    const j = jugadores.find((x) => 'j:' + x.id === seleccion)
    return j ? { tipo: 'jugador', id: j.id, nombre: j.nombre, jugador: j } : null
  }, [seleccion, clientes, jugadores])

  return (
    <div className="valoracion-card">
      <div className="valoracion-cabecera">
        <h2>Ficha de valoración</h2>
        <select value={seleccion} onChange={(e) => setSeleccion(e.target.value)} disabled={cargandoLista}>
          {clientes.length > 0 && (
            <optgroup label="Clientes personales">
              {clientes.map((c) => <option key={c.id} value={'c:' + c.id}>{c.nombre}</option>)}
            </optgroup>
          )}
          {visibles.length > 0 && (
            <optgroup label="Jugadores de club">
              {visibles.map((j) => <option key={j.id} value={'j:' + j.id}>{j.nombre}</option>)}
            </optgroup>
          )}
        </select>
      </div>
      {!sujeto ? <p className="texto-dim">{cargandoLista ? 'Cargando…' : 'No hay clientes en esta selección.'}</p> : (
        <>
          <div className="valoracion-seccion-tabs">
            {SECCIONES.map((s) => (
              <button key={s.clave} type="button" className={seccion === s.clave ? 'activa' : ''} onClick={() => setSeccion(s.clave)}>
                {s.etiqueta}
              </button>
            ))}
          </div>
          {seccion === 'anamnesis' && <Anamnesis key={seleccion} sujeto={sujeto} />}
          {seccion === 'neuro' && <HistorialValoracion key={seleccion + 'n'} sujeto={sujeto} tipo="neuromuscular" />}
          {seccion === 'iso' && <HistorialValoracion key={seleccion + 'i'} sujeto={sujeto} tipo="isometrica" />}
          {seccion === 'tests' && (sujeto.tipo === 'jugador'
            ? <TestsCuadrantes key={seleccion + 't'} jugador={sujeto.jugador} />
            : <p className="texto-dim">Los tests de cuadrantes (CMJ, sentadilla, Wingate) están ahora disponibles solo para jugadores. Para clientes personales hay que extender la pestaña Tests.</p>)}
        </>
      )}
    </div>
  )
}

// Columna de la BD según el tipo de sujeto.
const columnaSujeto = (sujeto) => (sujeto.tipo === 'cliente' ? 'cliente_id' : 'jugador_id')

// ---------- Utilidades de campos ----------
function Campo({ etiqueta, children, ancho }) {
  return <label className={`val-campo ${ancho ? 'val-campo-' + ancho : ''}`}><span>{etiqueta}</span>{children}</label>
}

// ---------- 1 · Anamnesis ----------
function Anamnesis({ sujeto }) {
  const jugador = sujeto.jugador || null
  const col = columnaSujeto(sujeto)
  const [ficha, setFicha] = useState(null)
  const [lesionesApp, setLesionesApp] = useState([])
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => {
    let activo = true
    ;(async () => {
      const [f, l] = await Promise.all([
        supabase.from('fichas_valoracion').select('datos').eq(col, sujeto.id).maybeSingle(),
        jugador
          ? supabase.from('lesiones').select('fecha_lesion, parte_cuerpo, lado, tipologia, severidad, dias_baja').eq('jugador_id', jugador.id).order('fecha_lesion', { ascending: false })
          : Promise.resolve({ data: [] }),
      ])
      if (!activo) return
      if (f.error) setMensaje({ tipo: 'error', texto: 'No se pudo cargar la ficha. ¿Has ejecutado migracion_valoracion.sql? ' + f.error.message })
      setFicha(fusionarAnamnesis(f.data?.datos))
      setLesionesApp(l.data || [])
    })()
    return () => { activo = false }
  }, [sujeto.id])

  if (!ficha) return <p className="texto-dim">Cargando…</p>

  const set = (bloque, clave, valor) => setFicha((f) => ({ ...f, [bloque]: { ...f[bloque], [clave]: valor } }))
  const campo = (bloque, clave) => ({ value: ficha[bloque][clave] ?? '', onChange: (e) => set(bloque, clave, e.target.value) })
  const setLista = (lista, i, clave, valor) => setFicha((f) => ({ ...f, [lista]: f[lista].map((x, k) => (k === i ? { ...x, [clave]: valor } : x)) }))
  const quitar = (lista, i) => setFicha((f) => ({ ...f, [lista]: f[lista].filter((_, k) => k !== i) }))

  async function guardar() {
    setGuardando(true); setMensaje(null)
    const fila = { datos: ficha, actualizado_en: new Date().toISOString() }
    const { data: existente } = await supabase.from('fichas_valoracion').select('id').eq(col, sujeto.id).maybeSingle()
    const { error } = existente
      ? await supabase.from('fichas_valoracion').update(fila).eq('id', existente.id)
      : await supabase.from('fichas_valoracion').insert({ ...fila, [col]: sujeto.id })
    setGuardando(false)
    setMensaje(error ? { tipo: 'error', texto: error.message } : { tipo: 'ok', texto: 'Ficha guardada.' })
  }

  // Jugadores: edad/peso/altura vienen del perfil. Clientes personales: se anotan en la propia ficha.
  const nacimiento = jugador ? jugador.fecha_nacimiento : ficha.datos.fecha_nacimiento
  const edad = nacimiento ? Math.floor((Date.now() - new Date(nacimiento).getTime()) / 31557600000) : null

  return (
    <div className="val-form">
      <section>
        <h3>Datos personales</h3>
        {jugador ? (
          <>
            <div className="val-resumen-datos">
              <span><strong>{jugador.nombre}</strong></span>
              <span>Edad: {edad ?? '—'}</span>
              <span>Sexo: {jugador.sexo || '—'}</span>
              <span>Peso: {jugador.peso_corporal_kg ?? '—'} kg</span>
              <span>Altura: {jugador.altura_m ?? '—'} m</span>
              <span>Equipo: {jugador.equipos?.nombre || 'Sin asignar'}</span>
            </div>
            <p className="texto-dim val-nota">Edad, peso y altura se editan en la pestaña Jugadores.</p>
          </>
        ) : (
          <>
            <div className="val-resumen-datos">
              <span><strong>{sujeto.nombre}</strong> (cliente personal)</span>
              <span>Teléfono: {sujeto.cliente.telefono || '—'}</span>
              <span>Programa: {sujeto.cliente.programa || '—'}</span>
              <span>Edad: {edad ?? '—'}</span>
            </div>
            <div className="val-grid">
              <Campo etiqueta="Fecha de nacimiento"><input type="date" {...campo('datos', 'fecha_nacimiento')} /></Campo>
              <Campo etiqueta="Sexo"><select {...campo('datos', 'sexo')}><option value="">—</option><option>Masculino</option><option>Femenino</option></select></Campo>
              <Campo etiqueta="Peso (kg)"><input type="number" step="0.1" {...campo('datos', 'peso_kg')} /></Campo>
              <Campo etiqueta="Altura (m)"><input type="number" step="0.01" {...campo('datos', 'altura_m')} /></Campo>
            </div>
          </>
        )}
        <div className="val-grid">
          <Campo etiqueta="Pierna dominante"><select {...campo('datos', 'dominancia_pierna')}><option value="">—</option><option>Derecha</option><option>Izquierda</option></select></Campo>
          <Campo etiqueta="Mano dominante"><select {...campo('datos', 'dominancia_mano')}><option value="">—</option><option>Derecha</option><option>Izquierda</option><option>Ambidiestro</option></select></Campo>
          <Campo etiqueta="Profesión"><input {...campo('datos', 'profesion')} /></Campo>
          <Campo etiqueta="Actividad laboral"><select {...campo('datos', 'actividad_laboral')}><option value="">—</option><option>Sedentaria</option><option>Ligera (de pie)</option><option>Moderada</option><option>Física intensa</option></select></Campo>
          <Campo etiqueta="Contacto de emergencia"><input {...campo('datos', 'telefono_emergencia')} /></Campo>
        </div>
      </section>

      <section>
        <h3>Contexto deportivo y hábitos</h3>
        <div className="val-grid">
          <Campo etiqueta="Deporte"><input {...campo('contexto', 'deporte')} /></Campo>
          <Campo etiqueta="Nivel / categoría"><input {...campo('contexto', 'nivel')} /></Campo>
          <Campo etiqueta="Posición / rol"><input {...campo('contexto', 'posicion')} /></Campo>
          <Campo etiqueta="Años de práctica"><input type="number" {...campo('contexto', 'anos_practica')} /></Campo>
          <Campo etiqueta="Sesiones / semana"><input type="number" {...campo('contexto', 'sesiones_semana')} /></Campo>
          <Campo etiqueta="Horas / semana"><input type="number" {...campo('contexto', 'horas_semana')} /></Campo>
          <Campo etiqueta="Horas de sueño (media)"><input type="number" step="0.5" {...campo('contexto', 'sueno_horas')} /></Campo>
          <Campo etiqueta="Calendario de competición" ancho="2"><input {...campo('contexto', 'calendario_competicion')} /></Campo>
          <Campo etiqueta="Otras actividades físicas" ancho="2"><input {...campo('contexto', 'otras_actividades')} /></Campo>
          <Campo etiqueta="Nutrición / suplementos" ancho="2"><textarea rows={2} {...campo('contexto', 'nutricion')} /></Campo>
          <Campo etiqueta="Estrés (laboral / personal)" ancho="2"><textarea rows={2} {...campo('contexto', 'estres')} /></Campo>
          <Campo etiqueta="Hábitos (tabaco, alcohol, otros)" ancho="2"><input {...campo('contexto', 'habitos')} /></Campo>
        </div>
      </section>

      <section>
        <h3>Antecedentes de salud</h3>
        <div className="val-grid">
          <Campo etiqueta="Patologías / enfermedades" ancho="2"><textarea rows={2} {...campo('salud', 'patologias')} /></Campo>
          <Campo etiqueta="Cirugías" ancho="2"><textarea rows={2} {...campo('salud', 'cirugias')} /></Campo>
          <Campo etiqueta="Medicación actual"><input {...campo('salud', 'medicacion')} /></Campo>
          <Campo etiqueta="Alergias"><input {...campo('salud', 'alergias')} /></Campo>
          <Campo etiqueta="Dolor / molestias actuales" ancho="2"><textarea rows={2} {...campo('salud', 'dolor_actual')} /></Campo>
          <Campo etiqueta="Observaciones" ancho="2"><textarea rows={2} {...campo('salud', 'observaciones')} /></Campo>
        </div>
      </section>

      <section>
        <h3>Historial de lesiones</h3>
        <p className="texto-dim val-nota">Lesiones anteriores a trabajar contigo. Las registradas en la app aparecen debajo, solo lectura.</p>
        {ficha.lesiones_previas.map((l, i) => (
          <div className="val-fila" key={i}>
            <input placeholder="Zona (ej. isquio)" value={l.zona || ''} onChange={(e) => setLista('lesiones_previas', i, 'zona', e.target.value)} />
            <select value={l.lado || ''} onChange={(e) => setLista('lesiones_previas', i, 'lado', e.target.value)}>
              <option value="">Lado</option><option>Derecho</option><option>Izquierdo</option><option>Bilateral</option><option>N/A</option>
            </select>
            <input placeholder="Tipo (muscular, ligamentosa…)" value={l.tipo || ''} onChange={(e) => setLista('lesiones_previas', i, 'tipo', e.target.value)} />
            <input type="number" placeholder="Año" value={l.anio || ''} onChange={(e) => setLista('lesiones_previas', i, 'anio', e.target.value)} />
            <input placeholder="Tratamiento / readaptación" value={l.tratamiento || ''} onChange={(e) => setLista('lesiones_previas', i, 'tratamiento', e.target.value)} />
            <input placeholder="Secuelas / recidivas" value={l.secuelas || ''} onChange={(e) => setLista('lesiones_previas', i, 'secuelas', e.target.value)} />
            <button type="button" className="val-quitar" onClick={() => quitar('lesiones_previas', i)}>✕</button>
          </div>
        ))}
        <button type="button" className="val-anadir" onClick={() => setFicha((f) => ({ ...f, lesiones_previas: [...f.lesiones_previas, {}] }))}>+ Añadir lesión previa</button>
        {lesionesApp.length > 0 && (
          <table className="val-tabla">
            <thead><tr><th>Fecha</th><th>Zona</th><th>Lado</th><th>Tipo</th><th>Severidad</th><th>Días baja</th></tr></thead>
            <tbody>{lesionesApp.map((l, i) => (
              <tr key={i}><td>{l.fecha_lesion}</td><td>{l.parte_cuerpo}</td><td>{l.lado}</td><td>{l.tipologia}</td><td>{l.severidad}</td><td>{l.dias_baja ?? '—'}</td></tr>
            ))}</tbody>
          </table>
        )}
      </section>

      <section>
        <h3>Objetivos</h3>
        <div className="val-grid">
          <Campo etiqueta="Objetivo principal" ancho="2"><textarea rows={2} {...campo('objetivos', 'principal')} /></Campo>
          <Campo etiqueta="Objetivos secundarios" ancho="2"><textarea rows={2} {...campo('objetivos', 'secundarios')} /></Campo>
          <Campo etiqueta="Plazo"><input {...campo('objetivos', 'plazo')} /></Campo>
          <Campo etiqueta="Disponibilidad (días / horario)"><input {...campo('objetivos', 'disponibilidad')} /></Campo>
          <Campo etiqueta="Motivación / expectativas" ancho="2"><textarea rows={2} {...campo('objetivos', 'motivacion')} /></Campo>
        </div>
      </section>

      <section>
        <h3>KPI</h3>
        {ficha.kpis.map((k, i) => (
          <div className="val-fila" key={i}>
            <input placeholder="Indicador (ej. CMJ, % grasa)" value={k.indicador || ''} onChange={(e) => setLista('kpis', i, 'indicador', e.target.value)} />
            <input placeholder="Unidad" value={k.unidad || ''} onChange={(e) => setLista('kpis', i, 'unidad', e.target.value)} />
            <input placeholder="Valor inicial" value={k.inicial || ''} onChange={(e) => setLista('kpis', i, 'inicial', e.target.value)} />
            <input placeholder="Valor objetivo" value={k.objetivo || ''} onChange={(e) => setLista('kpis', i, 'objetivo', e.target.value)} />
            <input placeholder="Valor actual" value={k.actual || ''} onChange={(e) => setLista('kpis', i, 'actual', e.target.value)} />
            <input placeholder="Plazo" value={k.plazo || ''} onChange={(e) => setLista('kpis', i, 'plazo', e.target.value)} />
            <button type="button" className="val-quitar" onClick={() => quitar('kpis', i)}>✕</button>
          </div>
        ))}
        <button type="button" className="val-anadir" onClick={() => setFicha((f) => ({ ...f, kpis: [...f.kpis, {}] }))}>+ Añadir KPI</button>
      </section>

      <label className="val-consentimiento">
        <input type="checkbox" checked={!!ficha.consentimiento} onChange={(e) => setFicha((f) => ({ ...f, consentimiento: e.target.checked }))} />
        El cliente ha dado su consentimiento para tratar estos datos de salud
      </label>

      <div className="val-acciones">
        <button type="button" className="val-guardar" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar ficha'}</button>
        {mensaje && <span className={mensaje.tipo === 'error' ? 'val-error' : 'val-ok'}>{mensaje.texto}</span>}
      </div>
    </div>
  )
}

// ---------- 2 y 3 · Valoraciones con fecha (neuromuscular / isometría) ----------
function HistorialValoracion({ sujeto, tipo }) {
  const col = columnaSujeto(sujeto)
  const pesoRef = sujeto.jugador?.peso_corporal_kg ?? null
  const [registros, setRegistros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [datos, setDatos] = useState({})
  const [fecha, setFecha] = useState(hoyISOLocal())
  const [notas, setNotas] = useState('')
  const [unidad, setUnidad] = useState('N')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  async function cargar() {
    setCargando(true)
    const { data, error } = await supabase.from('valoraciones_cliente').select('*')
      .eq(col, sujeto.id).eq('tipo', tipo).order('fecha', { ascending: false })
    if (error) setMensaje({ tipo: 'error', texto: error.message })
    setRegistros(data || [])
    setCargando(false)
  }
  useEffect(() => { cargar() }, [sujeto.id, tipo])

  async function guardar() {
    setGuardando(true); setMensaje(null)
    const payload = tipo === 'isometrica' ? { ...datos, unidad } : datos
    const { error } = await supabase.from('valoraciones_cliente').insert({
      [col]: sujeto.id, tipo, fecha, datos: payload, notas: notas || null })
    setGuardando(false)
    if (error) { setMensaje({ tipo: 'error', texto: error.message }); return }
    setMensaje({ tipo: 'ok', texto: 'Valoración guardada.' })
    setDatos({}); setNotas('')
    cargar()
  }

  async function borrar(id) {
    if (!window.confirm('¿Eliminar esta valoración?')) return
    await supabase.from('valoraciones_cliente').delete().eq('id', id)
    cargar()
  }

  const set = (clave, valor) => setDatos((d) => ({ ...d, [clave]: valor }))

  return (
    <div className="val-form">
      <section>
        <h3>{tipo === 'isometrica' ? 'Nueva valoración isométrica' : 'Nueva valoración neuromuscular'}</h3>
        <div className="val-grid">
          <Campo etiqueta="Fecha"><input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} /></Campo>
          {tipo === 'isometrica' && (
            <Campo etiqueta="Unidad de fuerza"><select value={unidad} onChange={(e) => setUnidad(e.target.value)}><option value="N">Newtons (N)</option><option value="kg">Kilos (kg)</option></select></Campo>
          )}
        </div>

        {tipo === 'neuromuscular' ? (
          BLOQUES_NEUROMUSCULAR.map((b) => (
            <div key={b.titulo} className="val-bloque">
              <h4>{b.titulo}</h4>
              <table className="val-tabla val-tabla-entrada">
                <thead><tr><th>Test</th><th>Derecha</th><th>Izquierda</th><th>Asimetría</th></tr></thead>
                <tbody>{b.campos.map((c) => {
                  const a = c.lados ? asimetriaCampo(datos[c.clave + '_d'], datos[c.clave + '_i']) : null
                  return (
                    <tr key={c.clave}>
                      <td>{c.etiqueta}</td>
                      {c.lados ? (<>
                        <td><input type="number" step="any" value={datos[c.clave + '_d'] ?? ''} onChange={(e) => set(c.clave + '_d', e.target.value)} /></td>
                        <td><input type="number" step="any" value={datos[c.clave + '_i'] ?? ''} onChange={(e) => set(c.clave + '_i', e.target.value)} /></td>
                        <td><Semaforo nivel={nivelAsimetria(a)}>{a === null ? '—' : a.toFixed(1) + ' %'}</Semaforo></td>
                      </>) : (<>
                        <td colSpan={2}><input type="number" step="any" value={datos[c.clave] ?? ''} onChange={(e) => set(c.clave, e.target.value)} /></td>
                        <td>—</td>
                      </>)}
                    </tr>
                  )
                })}</tbody>
              </table>
            </div>
          ))
        ) : (
          <IsometriaEntrada datos={datos} set={set} unidad={unidad} peso={pesoRef} />
        )}

        <Campo etiqueta="Notas (posición/ángulo de test, dolor, observaciones)" ancho="2">
          <textarea rows={2} value={notas} onChange={(e) => setNotas(e.target.value)} />
        </Campo>
        <div className="val-acciones">
          <button type="button" className="val-guardar" onClick={guardar} disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar valoración'}</button>
          {mensaje && <span className={mensaje.tipo === 'error' ? 'val-error' : 'val-ok'}>{mensaje.texto}</span>}
        </div>
      </section>

      <section>
        <h3>Historial</h3>
        {cargando ? <p className="texto-dim">Cargando…</p> : registros.length === 0 ? <p className="texto-dim">Aún no hay valoraciones.</p> : (
          tipo === 'isometrica'
            ? <HistorialIso registros={registros} onBorrar={borrar} peso={pesoRef} />
            : <HistorialNeuro registros={registros} onBorrar={borrar} />
        )}
      </section>
    </div>
  )
}

function asimetriaCampo(d, i) {
  const a = num(d), b = num(i)
  if (a === null || b === null) return null
  const mayor = Math.max(a, b)
  return mayor ? ((mayor - Math.min(a, b)) / mayor) * 100 : null
}

function Semaforo({ nivel, children }) {
  return <span className={`val-semaforo val-semaforo-${nivel || 'nada'}`}>{children}</span>
}

function IsometriaEntrada({ datos, set, unidad, peso }) {
  const calc = calcularIsometria(datos)
  return (
    <div className="val-bloque">
      <table className="val-tabla val-tabla-entrada">
        <thead><tr><th>Grupo muscular</th><th>Derecha ({unidad})</th><th>Izquierda ({unidad})</th><th>Asimetría</th></tr></thead>
        <tbody>{GRUPOS_ISOMETRIA.map((g) => (
          <tr key={g.clave}>
            <td>{g.etiqueta}</td>
            <td><input type="number" step="any" value={datos[g.clave + '_d'] ?? ''} onChange={(e) => set(g.clave + '_d', e.target.value)} /></td>
            <td><input type="number" step="any" value={datos[g.clave + '_i'] ?? ''} onChange={(e) => set(g.clave + '_i', e.target.value)} /></td>
            <td><Semaforo nivel={nivelAsimetria(calc.asimetrias[g.clave])}>{calc.asimetrias[g.clave] === null ? '—' : calc.asimetrias[g.clave].toFixed(1) + ' %'}</Semaforo></td>
          </tr>
        ))}</tbody>
      </table>
      <ResumenRatios calc={calc} />
      <p className="texto-dim val-nota">
        Orientativo: asimetría ≥ {UMBRALES.asimetriaAviso} % (aviso) y ≥ {UMBRALES.asimetriaAlerta} % (alerta) · Isquios/Cuádriceps &lt; {UMBRALES.ratioHQMin} · Aductores/Abductores &lt; {UMBRALES.ratioAddAbdMin}.
        {peso ? ' La fuerza relativa se calcula con el peso del perfil.' : ''}
      </p>
    </div>
  )
}

function ResumenRatios({ calc }) {
  return (
    <div className="val-ratios">
      <div><span>Isquios / Cuádriceps (D)</span><Semaforo nivel={nivelRatioHQ(calc.hqD)}>{fmt(calc.hqD)}</Semaforo></div>
      <div><span>Isquios / Cuádriceps (I)</span><Semaforo nivel={nivelRatioHQ(calc.hqI)}>{fmt(calc.hqI)}</Semaforo></div>
      <div><span>Aductores / Abductores (D)</span><Semaforo nivel={nivelRatioAddAbd(calc.addAbdD)}>{fmt(calc.addAbdD)}</Semaforo></div>
      <div><span>Aductores / Abductores (I)</span><Semaforo nivel={nivelRatioAddAbd(calc.addAbdI)}>{fmt(calc.addAbdI)}</Semaforo></div>
    </div>
  )
}

function HistorialIso({ registros, onBorrar, peso }) {
  return (
    <div className="tabla-scroll">
      <table className="val-tabla">
        <thead><tr>
          <th>Fecha</th><th>H:Q D</th><th>H:Q I</th><th>ADD:ABD D</th><th>ADD:ABD I</th>
          <th>Asim. Cuád.</th><th>Asim. Isq.</th><th>Asim. Add.</th><th>Asim. Abd.</th><th>Unidad</th><th></th>
        </tr></thead>
        <tbody>{registros.map((r) => {
          const c = calcularIsometria(r.datos)
          return (
            <tr key={r.id} title={r.notas || ''}>
              <td>{r.fecha}</td>
              <td><Semaforo nivel={nivelRatioHQ(c.hqD)}>{fmt(c.hqD)}</Semaforo></td>
              <td><Semaforo nivel={nivelRatioHQ(c.hqI)}>{fmt(c.hqI)}</Semaforo></td>
              <td><Semaforo nivel={nivelRatioAddAbd(c.addAbdD)}>{fmt(c.addAbdD)}</Semaforo></td>
              <td><Semaforo nivel={nivelRatioAddAbd(c.addAbdI)}>{fmt(c.addAbdI)}</Semaforo></td>
              {GRUPOS_ISOMETRIA.map((g) => (
                <td key={g.clave}><Semaforo nivel={nivelAsimetria(c.asimetrias[g.clave])}>{c.asimetrias[g.clave] === null ? '—' : c.asimetrias[g.clave].toFixed(1) + '%'}</Semaforo></td>
              ))}
              <td>{r.datos.unidad || 'N'}</td>
              <td><button type="button" className="val-quitar" onClick={() => onBorrar(r.id)}>✕</button></td>
            </tr>
          )
        })}</tbody>
      </table>
      {peso ? <p className="texto-dim val-nota">Pasa el ratón sobre una fila para ver sus notas.</p> : null}
    </div>
  )
}

function HistorialNeuro({ registros, onBorrar }) {
  const campos = BLOQUES_NEUROMUSCULAR.flatMap((b) => b.campos)
  return (
    <div className="tabla-scroll">
      <table className="val-tabla">
        <thead><tr><th>Test</th>{registros.map((r) => <th key={r.id}>{r.fecha} <button type="button" className="val-quitar" onClick={() => onBorrar(r.id)}>✕</button></th>)}</tr></thead>
        <tbody>{campos.map((c) => (
          <tr key={c.clave}>
            <td>{c.etiqueta}</td>
            {registros.map((r) => {
              if (!c.lados) return <td key={r.id}>{r.datos[c.clave] ?? '—'}</td>
              const d = r.datos[c.clave + '_d'], i = r.datos[c.clave + '_i']
              const a = asimetriaCampo(d, i)
              return <td key={r.id}>{(d ?? '—') + ' / ' + (i ?? '—')} <Semaforo nivel={nivelAsimetria(a)}>{a === null ? '' : a.toFixed(0) + '%'}</Semaforo></td>
            })}
          </tr>
        ))}</tbody>
      </table>
      <p className="texto-dim val-nota">Formato: derecha / izquierda.</p>
    </div>
  )
}

// ---------- 4 · Tests y cuadrantes ----------
function TestsCuadrantes({ jugador }) {
  const [tests, setTests] = useState(null)

  useEffect(() => {
    supabase.from('tests_fisicos').select('*').eq('jugador_id', jugador.id).order('fecha', { ascending: false })
      .then(({ data }) => setTests(data || []))
  }, [jugador.id])

  const { datos1, datos2, porTipo, usaIso } = useMemo(() => {
    const t = tests || []
    const porTipo = ultimosTestsPorTipo(t)
    // Cuadrante fuerza-velocidad: sentadilla dinámica; si no hay, se usa la isométrica (ISO SQ).
    const usaIso = !porTipo.sentadilla && !!porTipo.iso_sq
    const testsC1 = usaIso ? t.map((x) => (x.tipo_test === 'iso_sq' ? { ...x, tipo_test: 'sentadilla' } : x)) : t
    return {
      datos1: calcularDatosCuadrante1([jugador], testsC1),
      datos2: calcularDatosCuadrante2([jugador], t),
      porTipo, usaIso,
    }
  }, [tests, jugador])

  if (!tests) return <p className="texto-dim">Cargando…</p>

  const maxX1 = Math.max(3, ...datos1.map((d) => d.x), 2.2)
  const maxY1 = Math.max(60, ...datos1.map((d) => d.y), 44)
  const maxX2 = Math.max(35, ...datos2.map((d) => d.x), 22)
  const maxY2 = Math.max(20, ...datos2.map((d) => d.y), 11)

  return (
    <div className="val-form">
      <section>
        <h3>Últimos tests registrados</h3>
        {Object.keys(porTipo).length === 0 ? <p className="texto-dim">Sin tests. Regístralos en la pestaña Tests.</p> : (
          <table className="val-tabla">
            <thead><tr><th>Test</th><th>Fecha</th><th>Valor</th></tr></thead>
            <tbody>{Object.values(porTipo).map((t) => (
              <tr key={t.id}><td>{traducirTipoTest(t.tipo_test)}</td><td>{t.fecha}</td><td>{resumenTest(t)}</td></tr>
            ))}</tbody>
          </table>
        )}
        {usaIso && <p className="texto-dim val-nota">No hay sentadilla dinámica: el cuadrante fuerza-salto usa el test ISO SQ.</p>}
      </section>
      <section>
        <GraficoCuadrante1 datos={datos1} maxX={maxX1} maxY={maxY1} />
      </section>
      <section>
        <GraficoCuadrante2 datos={datos2} maxX={maxX2} maxY={maxY2} />
      </section>
    </div>
  )
}

function resumenTest(t) {
  if (t.tipo_test === 'sentadilla' || t.tipo_test === 'iso_sq') return t.valor_kg !== null ? `${t.valor_kg} kg` : '—'
  if (t.tipo_test === 'cmj' || t.tipo_test === 'sj') return t.valor_cm !== null ? `${t.valor_cm} cm` : '—'
  if (t.tipo_test === 'drop_jump') return t.dri !== null ? `DRI ${t.dri}` : '—'
  if (t.tipo_test === 'wingate') return t.pp1 !== null ? `PP1 ${t.pp1} W` : '—'
  return '—'
}
