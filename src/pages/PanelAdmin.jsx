import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { hoyISOLocal as hoyISO } from '../lib/fechas'
import './PanelAdmin.css'

const diasSemana = ['L', 'M', 'X', 'J', 'V', 'S', 'D']

function primerDiaDelMes(fecha) {
  const d = new Date(fecha + 'T00:00:00')
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`
}
function ultimoDiaDelMes(fecha) {
  const d = new Date(fecha + 'T00:00:00')
  const fin = new Date(d.getFullYear(), d.getMonth() + 1, 0)
  return `${fin.getFullYear()}-${String(fin.getMonth() + 1).padStart(2, '0')}-${String(fin.getDate()).padStart(2, '0')}`
}
function diasDelMes(fecha) {
  const d = new Date(fecha + 'T00:00:00')
  const total = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate()
  return Array.from({ length: total }, (_, i) => {
    const dia = new Date(d.getFullYear(), d.getMonth(), i + 1)
    return {
      fecha: `${dia.getFullYear()}-${String(dia.getMonth() + 1).padStart(2, '0')}-${String(dia.getDate()).padStart(2, '0')}`,
      etiqueta: diasSemana[(dia.getDay() + 6) % 7],
    }
  })
}
function nombreMes(fecha) {
  return new Date(fecha + 'T00:00:00').toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

export default function PanelAdmin({ perfil }) {
  const [seccion, setSeccion] = useState('clubes') // 'clubes' | 'clientes'

  return (
    <div className="panel-admin">
      <div className="panel-admin-subnav no-imprimir">
        <button className={`periodo-btn ${seccion === 'clubes' ? 'periodo-activo' : ''}`} onClick={() => setSeccion('clubes')}>
          🏢 Clubes
        </button>
        <button className={`periodo-btn ${seccion === 'clientes' ? 'periodo-activo' : ''}`} onClick={() => setSeccion('clientes')}>
          💶 Clientes y facturación
        </button>
      </div>

      {seccion === 'clubes' ? <SeccionClubes /> : <SeccionClientes perfil={perfil} />}
    </div>
  )
}

// =========================================================================
// SECCIÓN CLUBES
// =========================================================================
function SeccionClubes() {
  const [clubes, setClubes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [nombreClub, setNombreClub] = useState('')
  const [guardandoClub, setGuardandoClub] = useState(false)
  const [mensaje, setMensaje] = useState(null)
  const [clubExpandido, setClubExpandido] = useState(null)
  const [cuentasPorClub, setCuentasPorClub] = useState({})
  const [equiposPorClub, setEquiposPorClub] = useState({})

  useEffect(() => { cargarClubes() }, [])

  async function cargarClubes() {
    setCargando(true)
    const { data } = await supabase.from('clubes').select('*').order('creado_en')
    setClubes(data || [])
    setCargando(false)
  }

  async function cargarDetalleClub(clubId) {
    const [{ data: cuentas }, { data: equipos }] = await Promise.all([
      supabase.from('perfiles').select('id, nombre, rol').eq('club_id', clubId).in('rol', ['entrenador', 'fisio']),
      supabase.from('equipos').select('id, nombre').eq('club_id', clubId),
    ])
    setCuentasPorClub((prev) => ({ ...prev, [clubId]: cuentas || [] }))
    setEquiposPorClub((prev) => ({ ...prev, [clubId]: equipos || [] }))
  }

  function alternarClub(clubId) {
    if (clubExpandido === clubId) { setClubExpandido(null); return }
    setClubExpandido(clubId)
    if (!cuentasPorClub[clubId]) cargarDetalleClub(clubId)
  }

  async function crearClub(e) {
    e.preventDefault()
    if (!nombreClub.trim()) return
    setGuardandoClub(true)
    const { error } = await supabase.from('clubes').insert({ nombre: nombreClub.trim() })
    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo crear el club.' })
    } else {
      setNombreClub('')
      setMensaje({ tipo: 'ok', texto: 'Club creado.' })
      cargarClubes()
    }
    setGuardandoClub(false)
  }

  return (
    <div className="panel-admin-seccion">
      <section className="panel-admin-card">
        <h2>Nuevo club</h2>
        <form onSubmit={crearClub} className="panel-admin-form-linea">
          <input
            type="text" value={nombreClub} onChange={(e) => setNombreClub(e.target.value)}
            placeholder="Nombre del club" required
          />
          <button type="submit" className="btn-principal" disabled={guardandoClub}>
            {guardandoClub ? 'Creando…' : '+ Crear club'}
          </button>
        </form>
        {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}
      </section>

      <section className="panel-admin-card">
        <h2>Clubes existentes</h2>
        {cargando ? (
          <p className="mono texto-dim">Cargando…</p>
        ) : clubes.length === 0 ? (
          <p className="texto-dim">Todavía no hay ningún club.</p>
        ) : (
          <div className="panel-admin-lista-clubes">
            {clubes.map((club) => (
              <div className="panel-admin-club" key={club.id}>
                <button className="panel-admin-club-cabecera" onClick={() => alternarClub(club.id)}>
                  <strong>{club.nombre}</strong>
                  <span className="diario-sesiones-plegar">{clubExpandido === club.id ? '▲ Ocultar' : '▼ Ver cuentas y equipos'}</span>
                </button>
                {clubExpandido === club.id && (
                  <DetalleClub
                    club={club}
                    cuentas={cuentasPorClub[club.id] || []}
                    equipos={equiposPorClub[club.id] || []}
                    onCambio={() => cargarDetalleClub(club.id)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}

function DetalleClub({ club, cuentas, equipos, onCambio }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')
  const [rol, setRol] = useState('entrenador')
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  async function crearCuenta(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)
    const { data: sesion } = await supabase.auth.getSession()
    try {
      const resp = await fetch('/api/crear-usuario-club', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${sesion.session.access_token}` },
        body: JSON.stringify({ email, password, nombre, rol, clubId: club.id }),
      })
      const resultado = await resp.json()
      if (!resp.ok) {
        setMensaje({ tipo: 'error', texto: resultado.error || 'No se pudo crear la cuenta.' })
      } else {
        setMensaje({ tipo: 'ok', texto: `Cuenta creada: ${email}` })
        setEmail(''); setPassword(''); setNombre('')
        onCambio()
      }
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo conectar con el servidor.' })
    }
    setGuardando(false)
  }

  return (
    <div className="panel-admin-club-detalle">
      <div className="panel-admin-club-listas">
        <div>
          <h4>Entrenador / Fisio</h4>
          {cuentas.length === 0 ? (
            <p className="texto-dim mono">Ninguna cuenta todavía.</p>
          ) : (
            <ul className="panel-admin-ul">
              {cuentas.map((c) => <li key={c.id}>{c.nombre} <span className={`rol-badge rol-${c.rol}`}>{c.rol}</span></li>)}
            </ul>
          )}
        </div>
        <div>
          <h4>Equipos</h4>
          {equipos.length === 0 ? (
            <p className="texto-dim mono">Ningún equipo todavía (se crean desde la pestaña Equipos).</p>
          ) : (
            <ul className="panel-admin-ul">{equipos.map((e) => <li key={e.id}>{e.nombre}</li>)}</ul>
          )}
        </div>
      </div>

      <h4>Crear cuenta de entrenador o fisio para este club</h4>
      <form onSubmit={crearCuenta} className="panel-admin-form-cuenta">
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} placeholder="Nombre" required />
        <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Correo" required />
        <input type="text" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Contraseña inicial" required />
        <select value={rol} onChange={(e) => setRol(e.target.value)}>
          <option value="entrenador">Entrenador</option>
          <option value="fisio">Fisio</option>
        </select>
        <button type="submit" className="pizarra-boton" disabled={guardando}>{guardando ? 'Creando…' : '+ Crear cuenta'}</button>
      </form>
      {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}
    </div>
  )
}

// =========================================================================
// SECCIÓN CLIENTES Y FACTURACIÓN
// =========================================================================
function SeccionClientes({ perfil }) {
  const [clientes, setClientes] = useState([])
  const [cargando, setCargando] = useState(true)
  const [clienteActivoId, setClienteActivoId] = useState(null)
  const [mesActivo, setMesActivo] = useState(primerDiaDelMes(hoyISO()))
  const [sesionesMes, setSesionesMes] = useState({}) // clienteId -> Set(fechas)
  const [facturas, setFacturas] = useState([])
  const [facturaImprimir, setFacturaImprimir] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editando, setEditando] = useState(null)
  const [config, setConfig] = useState(null)
  const [mostrarConfig, setMostrarConfig] = useState(false)
  const [modalFactura, setModalFactura] = useState(null) // { cliente, ...campos editables } | null

  const vacio = { nombre: '', dias_entreno: '', programa: '', tipo_facturacion: 'sesion', precio: '', activo: true, notas: '', es_empresa: false, nif: '', direccion: '', ciudad_cp: '' }
  const [form, setForm] = useState(vacio)
  const [guardando, setGuardando] = useState(false)
  const [mensaje, setMensaje] = useState(null)

  useEffect(() => { cargarClientes(); cargarFacturas(); cargarConfig() }, [])
  useEffect(() => { cargarSesionesMes() }, [mesActivo, clientes])

  async function cargarConfig() {
    const { data } = await supabase.from('configuracion_facturacion').select('*').eq('id', 1).maybeSingle()
    setConfig(data || { id: 1, nombre: '', direccion: '', telefono: '', email: '', iban: '' })
  }

  async function guardarConfig(e) {
    e.preventDefault()
    await supabase.from('configuracion_facturacion').upsert({ ...config, id: 1 })
    setMostrarConfig(false)
  }

  async function cargarClientes() {
    setCargando(true)
    const { data } = await supabase.from('clientes').select('*').order('nombre')
    setClientes(data || [])
    if (data && data.length > 0 && !clienteActivoId) setClienteActivoId(data[0].id)
    setCargando(false)
  }

  async function cargarFacturas() {
    const { data } = await supabase.from('facturas').select('*').order('fecha_emision', { ascending: false }).limit(30)
    setFacturas(data || [])
  }

  async function cargarSesionesMes() {
    if (clientes.length === 0) return
    const { data } = await supabase
      .from('sesiones_cliente').select('cliente_id, fecha')
      .gte('fecha', primerDiaDelMes(mesActivo)).lte('fecha', ultimoDiaDelMes(mesActivo))
    const mapa = {}
    ;(data || []).forEach((s) => {
      if (!mapa[s.cliente_id]) mapa[s.cliente_id] = new Set()
      mapa[s.cliente_id].add(s.fecha)
    })
    setSesionesMes(mapa)
  }

  async function alternarDia(clienteId, fecha) {
    const yaMarcado = sesionesMes[clienteId]?.has(fecha)
    if (yaMarcado) {
      await supabase.from('sesiones_cliente').delete().eq('cliente_id', clienteId).eq('fecha', fecha)
    } else {
      await supabase.from('sesiones_cliente').insert({ cliente_id: clienteId, fecha })
    }
    cargarSesionesMes()
  }

  function empezarEdicion(cliente) {
    setForm({ ...vacio, ...cliente, precio: String(cliente.precio) })
    setEditando(cliente.id)
    setMostrarForm(true)
  }

  async function guardarCliente(e) {
    e.preventDefault()
    setGuardando(true)
    setMensaje(null)
    const datos = {
      ...form, precio: Number(form.precio) || 0,
      nif: form.es_empresa ? form.nif : null,
      direccion: form.es_empresa ? form.direccion : null,
      ciudad_cp: form.es_empresa ? form.ciudad_cp : null,
    }
    const { error } = editando
      ? await supabase.from('clientes').update(datos).eq('id', editando)
      : await supabase.from('clientes').insert(datos)
    if (error) {
      setMensaje({ tipo: 'error', texto: 'No se pudo guardar el cliente.' })
    } else {
      setForm(vacio); setEditando(null); setMostrarForm(false)
      cargarClientes()
    }
    setGuardando(false)
  }

  async function eliminarCliente(id) {
    if (!window.confirm('¿Eliminar este cliente y todo su historial de sesiones y facturas?')) return
    await supabase.from('clientes').delete().eq('id', id)
    cargarClientes(); cargarFacturas()
    if (clienteActivoId === id) setClienteActivoId(null)
  }

  function calcularResumen(cliente) {
    const num = sesionesMes[cliente.id]?.size || 0
    const total = cliente.tipo_facturacion === 'mensual' ? Number(cliente.precio) : num * Number(cliente.precio)
    return { num, total }
  }

  const totalDelMes = clientes.reduce((suma, c) => suma + calcularResumen(c).total, 0)

  async function siguienteNumeroFactura() {
    const { data } = await supabase.from('facturas').select('numero_factura').order('creado_en', { ascending: false }).limit(1)
    const ultimo = data?.[0]?.numero_factura
    const match = ultimo?.match(/^([A-Za-z]*)(\d+)$/)
    if (match) {
      const prefijo = match[1]
      const numero = String(Number(match[2]) + 1).padStart(match[2].length, '0')
      return `${prefijo}${numero}`
    }
    return 'FS100'
  }

  async function abrirModalFactura(cliente) {
    const { num, total } = calcularResumen(cliente)
    if (num === 0 && cliente.tipo_facturacion === 'sesion') {
      alert('Este cliente no tiene ninguna sesión registrada este mes.')
      return
    }
    const numeroSugerido = await siguienteNumeroFactura()
    setModalFactura({
      cliente,
      numero_factura: numeroSugerido,
      concepto: cliente.programa || 'Entrenamiento personal',
      base_imponible: String(total),
      iva_porcentaje: '21',
      aplica_irpf: false,
      irpf_porcentaje: '15',
      num_sesiones: num,
    })
  }

  async function confirmarGenerarFactura(e) {
    e.preventDefault()
    const m = modalFactura
    const base = Number(m.base_imponible) || 0
    const iva = base * (Number(m.iva_porcentaje) / 100)
    const irpf = m.aplica_irpf ? base * (Number(m.irpf_porcentaje) / 100) : 0
    const total = base + iva - irpf

    const nuevaFactura = {
      cliente_id: m.cliente.id,
      numero_factura: m.numero_factura.trim(),
      fecha_emision: hoyISO(),
      periodo_inicio: primerDiaDelMes(mesActivo),
      periodo_fin: ultimoDiaDelMes(mesActivo),
      num_sesiones: m.num_sesiones,
      concepto: m.concepto,
      base_imponible: base,
      iva_porcentaje: Number(m.iva_porcentaje),
      aplica_irpf: m.aplica_irpf,
      irpf_porcentaje: m.aplica_irpf ? Number(m.irpf_porcentaje) : null,
      total,
      tipo: m.cliente.es_empresa ? 'completa' : 'simplificada',
      cliente_nombre: m.cliente.nombre,
      cliente_nif: m.cliente.es_empresa ? m.cliente.nif : null,
      cliente_direccion: m.cliente.es_empresa ? m.cliente.direccion : null,
      cliente_ciudad_cp: m.cliente.es_empresa ? m.cliente.ciudad_cp : null,
    }
    const { data, error } = await supabase.from('facturas').insert(nuevaFactura).select().single()
    if (error) {
      alert('No se pudo generar la factura: ' + error.message)
      return
    }
    setModalFactura(null)
    cargarFacturas()
    setFacturaImprimir(data)
    setTimeout(() => window.print(), 100)
  }

  useEffect(() => {
    function alTerminarImprimir() { setFacturaImprimir(null) }
    window.addEventListener('afterprint', alTerminarImprimir)
    return () => window.removeEventListener('afterprint', alTerminarImprimir)
  }, [])

  function reimprimirFactura(factura) {
    setFacturaImprimir(factura)
    setTimeout(() => window.print(), 100)
  }

  return (
    <div className="panel-admin-seccion">
      <section className="panel-admin-card no-imprimir">
        <div className="panel-admin-cabecera-flex">
          <h2>Datos del negocio (aparecen en tus facturas)</h2>
          <button className="equipo-cambiar-link" onClick={() => setMostrarConfig((v) => !v)}>
            {mostrarConfig ? 'Cerrar' : '✎ Editar'}
          </button>
        </div>
        {mostrarConfig && config && (
          <form onSubmit={guardarConfig} className="panel-admin-form-config">
            <input type="text" value={config.nombre || ''} onChange={(e) => setConfig({ ...config, nombre: e.target.value })} placeholder="Nombre y apellidos" />
            <input type="text" value={config.direccion || ''} onChange={(e) => setConfig({ ...config, direccion: e.target.value })} placeholder="Dirección" />
            <input type="text" value={config.telefono || ''} onChange={(e) => setConfig({ ...config, telefono: e.target.value })} placeholder="Teléfono" />
            <input type="email" value={config.email || ''} onChange={(e) => setConfig({ ...config, email: e.target.value })} placeholder="Correo" />
            <input type="text" value={config.iban || ''} onChange={(e) => setConfig({ ...config, iban: e.target.value })} placeholder="IBAN" />
            <button type="submit" className="btn-principal">Guardar</button>
          </form>
        )}
        {!mostrarConfig && config?.nombre && (
          <p className="texto-dim mono">{config.nombre} · {config.direccion} · {config.telefono} · {config.email}</p>
        )}
      </section>

      <section className="panel-admin-card no-imprimir">
        <div className="panel-admin-cabecera-flex">
          <h2>Clientes</h2>
          <button className="pizarra-boton" onClick={() => { setForm(vacio); setEditando(null); setMostrarForm((v) => !v) }}>
            {mostrarForm ? 'Cancelar' : '+ Nuevo cliente'}
          </button>
        </div>

        {mostrarForm && (
          <form onSubmit={guardarCliente} className="panel-admin-form-cliente">
            <div className="fila-doble">
              <label className="campo-sesion">
                <span>Nombre</span>
                <input type="text" value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} required />
              </label>
              <label className="campo-sesion">
                <span>Días de entreno (opcional)</span>
                <input type="text" value={form.dias_entreno || ''} onChange={(e) => setForm({ ...form, dias_entreno: e.target.value })} placeholder="Ej. M/J" />
              </label>
            </div>
            <div className="fila-doble">
              <label className="campo-sesion">
                <span>Programa</span>
                <input type="text" value={form.programa || ''} onChange={(e) => setForm({ ...form, programa: e.target.value })} placeholder="Ej. Individ. Sesión" />
              </label>
              <label className="campo-sesion">
                <span>Facturación</span>
                <select value={form.tipo_facturacion} onChange={(e) => setForm({ ...form, tipo_facturacion: e.target.value })}>
                  <option value="sesion">Por sesión</option>
                  <option value="mensual">Cuota mensual fija</option>
                </select>
              </label>
            </div>
            <label className="campo-sesion">
              <span>{form.tipo_facturacion === 'mensual' ? 'Precio mensual (€)' : 'Precio por sesión (€)'}</span>
              <input type="number" step="0.01" min="0" value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} required />
            </label>
            <label className="campo-checkbox">
              <input type="checkbox" checked={form.activo} onChange={(e) => setForm({ ...form, activo: e.target.checked })} />
              <span>Cliente activo</span>
            </label>
            <label className="campo-checkbox">
              <input type="checkbox" checked={form.es_empresa} onChange={(e) => setForm({ ...form, es_empresa: e.target.checked })} />
              <span>Es empresa o autónomo (factura completa, con sus datos fiscales)</span>
            </label>
            {form.es_empresa && (
              <div className="panel-admin-datos-empresa">
                <div className="fila-doble">
                  <label className="campo-sesion">
                    <span>NIF / CIF</span>
                    <input type="text" value={form.nif || ''} onChange={(e) => setForm({ ...form, nif: e.target.value })} required={form.es_empresa} />
                  </label>
                  <label className="campo-sesion">
                    <span>Dirección</span>
                    <input type="text" value={form.direccion || ''} onChange={(e) => setForm({ ...form, direccion: e.target.value })} required={form.es_empresa} />
                  </label>
                </div>
                <label className="campo-sesion">
                  <span>Ciudad y código postal</span>
                  <input type="text" value={form.ciudad_cp || ''} onChange={(e) => setForm({ ...form, ciudad_cp: e.target.value })} placeholder="Ej. 25197 Lleida" required={form.es_empresa} />
                </label>
              </div>
            )}
            {mensaje && <div className={mensaje.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensaje.texto}</div>}
            <button type="submit" className="btn-principal" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar cliente'}</button>
          </form>
        )}

        {cargando ? (
          <p className="mono texto-dim">Cargando…</p>
        ) : clientes.length === 0 ? (
          <p className="texto-dim">Todavía no tienes ningún cliente.</p>
        ) : (
          <div className="panel-admin-tabla-clientes-wrap">
            <table className="panel-admin-tabla-clientes">
              <thead>
                <tr><th>Cliente</th><th>Días</th><th>Programa</th><th>Precio</th><th>Tipo</th><th></th></tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className={clienteActivoId === c.id ? 'panel-admin-fila-activa' : ''} onClick={() => setClienteActivoId(c.id)}>
                    <td>{c.nombre}{!c.activo && <span className="texto-faint"> (inactivo)</span>}</td>
                    <td className="mono">{c.dias_entreno || '—'}</td>
                    <td>{c.programa || '—'}</td>
                    <td className="mono">{c.precio}€ {c.tipo_facturacion === 'mensual' ? '/mes' : '/sesión'}</td>
                    <td className="texto-faint">{c.es_empresa ? 'Empresa' : 'Particular'}</td>
                    <td className="panel-admin-tabla-acciones">
                      <button type="button" className="equipo-cambiar-link" onClick={(e) => { e.stopPropagation(); empezarEdicion(c) }}>✎</button>
                      <button type="button" className="btn-eliminar-fila" onClick={(e) => { e.stopPropagation(); eliminarCliente(c.id) }}>✕</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {clienteActivoId && clientes.find((c) => c.id === clienteActivoId) && (
        <section className="panel-admin-card no-imprimir">
          <div className="panel-admin-cabecera-flex">
            <h2 className="capitalizada">{nombreMes(mesActivo)}</h2>
            <div className="panel-admin-selector-mes">
              <button type="button" className="pizarra-boton" onClick={() => setMesActivo((m) => { const d = new Date(m + 'T00:00:00'); d.setMonth(d.getMonth() - 1); return primerDiaDelMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`) })}>◀</button>
              <button type="button" className="pizarra-boton" onClick={() => setMesActivo((m) => { const d = new Date(m + 'T00:00:00'); d.setMonth(d.getMonth() + 1); return primerDiaDelMes(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`) })}>▶</button>
            </div>
          </div>

          {(() => {
            const cliente = clientes.find((c) => c.id === clienteActivoId)
            const { num, total } = calcularResumen(cliente)
            return (
              <>
                <h3>{cliente.nombre}</h3>
                <div className="panel-admin-calendario-cliente">
                  {diasDelMes(mesActivo).map((d) => {
                    const marcado = sesionesMes[cliente.id]?.has(d.fecha)
                    return (
                      <button
                        key={d.fecha} type="button"
                        className={`panel-admin-dia ${marcado ? 'panel-admin-dia-marcado' : ''}`}
                        onClick={() => alternarDia(cliente.id, d.fecha)}
                        title={d.fecha}
                      >
                        <span className="panel-admin-dia-letra">{d.etiqueta}</span>
                        <span>{Number(d.fecha.slice(-2))}</span>
                      </button>
                    )
                  })}
                </div>
                <div className="panel-admin-resumen-cliente">
                  <span>Sesiones: <strong>{num}</strong></span>
                  <span>Base: <strong>{total.toFixed(2)}€</strong></span>
                  <button className="btn-principal" onClick={() => abrirModalFactura(cliente)}>🖶 Generar factura</button>
                </div>
              </>
            )
          })()}
        </section>
      )}

      <section className="panel-admin-card no-imprimir">
        <h2>Resumen del mes — todos los clientes</h2>
        <table className="panel-admin-tabla-clientes">
          <thead><tr><th>Cliente</th><th>Sesiones</th><th>Base</th></tr></thead>
          <tbody>
            {clientes.map((c) => {
              const { num, total } = calcularResumen(c)
              return <tr key={c.id}><td>{c.nombre}</td><td className="mono">{num}</td><td className="mono">{total.toFixed(2)}€</td></tr>
            })}
          </tbody>
          <tfoot>
            <tr><td><strong>Total (sin impuestos)</strong></td><td></td><td className="mono"><strong>{totalDelMes.toFixed(2)}€</strong></td></tr>
          </tfoot>
        </table>
      </section>

      <section className="panel-admin-card no-imprimir">
        <h2>Facturas emitidas</h2>
        {facturas.length === 0 ? (
          <p className="texto-dim">Todavía no se ha generado ninguna factura.</p>
        ) : (
          <table className="panel-admin-tabla-clientes">
            <thead><tr><th>Nº</th><th>Cliente</th><th>Fecha</th><th>Tipo</th><th>Total</th><th></th></tr></thead>
            <tbody>
              {facturas.map((f) => (
                <tr key={f.id}>
                  <td className="mono">{f.numero_factura}</td>
                  <td>{f.cliente_nombre}</td>
                  <td className="mono">{f.fecha_emision}</td>
                  <td className="texto-faint">{f.tipo === 'completa' ? 'Completa' : 'Simplificada'}</td>
                  <td className="mono">{Number(f.total).toFixed(2)}€</td>
                  <td><button type="button" className="equipo-cambiar-link" onClick={() => reimprimirFactura(f)}>🖶 Reimprimir</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {modalFactura && (
        <div className="pizarra-modal-fondo no-imprimir" onClick={() => setModalFactura(null)}>
          <div className="pizarra-modal-editar" onClick={(e) => e.stopPropagation()}>
            <div className="pizarra-modal-cabecera">
              <h3>Generar factura — {modalFactura.cliente.nombre}</h3>
              <button type="button" className="pizarra-boton" onClick={() => setModalFactura(null)}>✕ Cerrar</button>
            </div>
            <form onSubmit={confirmarGenerarFactura}>
              <div className="fila-doble">
                <label className="campo-sesion">
                  <span>Número de factura</span>
                  <input type="text" value={modalFactura.numero_factura} onChange={(e) => setModalFactura({ ...modalFactura, numero_factura: e.target.value })} required />
                </label>
                <label className="campo-sesion">
                  <span>Tipo</span>
                  <input type="text" value={modalFactura.cliente.es_empresa ? 'Completa (empresa/autónomo)' : 'Simplificada (particular)'} disabled />
                </label>
              </div>
              <label className="campo-sesion">
                <span>Concepto</span>
                <input type="text" value={modalFactura.concepto} onChange={(e) => setModalFactura({ ...modalFactura, concepto: e.target.value })} required />
              </label>
              <label className="campo-sesion">
                <span>Base imponible (€)</span>
                <input type="number" step="0.01" value={modalFactura.base_imponible} onChange={(e) => setModalFactura({ ...modalFactura, base_imponible: e.target.value })} required />
              </label>
              <div className="fila-doble">
                <label className="campo-sesion">
                  <span>IVA (%)</span>
                  <input type="number" step="0.01" value={modalFactura.iva_porcentaje} onChange={(e) => setModalFactura({ ...modalFactura, iva_porcentaje: e.target.value })} required />
                </label>
                <label className="campo-checkbox panel-admin-checkbox-irpf">
                  <input type="checkbox" checked={modalFactura.aplica_irpf} onChange={(e) => setModalFactura({ ...modalFactura, aplica_irpf: e.target.checked })} />
                  <span>Aplicar retención IRPF</span>
                </label>
              </div>
              {modalFactura.aplica_irpf && (
                <label className="campo-sesion">
                  <span>IRPF (%)</span>
                  <input type="number" step="0.01" value={modalFactura.irpf_porcentaje} onChange={(e) => setModalFactura({ ...modalFactura, irpf_porcentaje: e.target.value })} required />
                </label>
              )}
              {(() => {
                const base = Number(modalFactura.base_imponible) || 0
                const iva = base * (Number(modalFactura.iva_porcentaje) / 100)
                const irpf = modalFactura.aplica_irpf ? base * (Number(modalFactura.irpf_porcentaje) / 100) : 0
                const total = base + iva - irpf
                return (
                  <p className="panel-admin-total-preview mono">
                    Base {base.toFixed(2)}€ + IVA {iva.toFixed(2)}€ {modalFactura.aplica_irpf ? `− IRPF ${irpf.toFixed(2)}€` : ''} = <strong>{total.toFixed(2)}€</strong>
                  </p>
                )
              })()}
              <button type="submit" className="btn-principal">🖶 Generar e imprimir</button>
            </form>
          </div>
        </div>
      )}

      {facturaImprimir && config && (() => {
        const f = facturaImprimir
        const iva = f.base_imponible * (f.iva_porcentaje / 100)
        const irpf = f.aplica_irpf ? f.base_imponible * (f.irpf_porcentaje / 100) : 0
        return (
          <div className="factura-imprimir">
            <h1 className="factura-titulo-imprimir">{f.tipo === 'completa' ? 'FACTURA' : 'FACTURA SIMPLIFICADA'}</h1>

            <div className="factura-fila-superior-imprimir">
              <div>
                <p className="factura-etiqueta-imprimir">DATOS</p>
                <p className="factura-negocio-imprimir">{config.nombre}</p>
                <p>{config.direccion}</p>
                <p>{config.telefono}</p>
                <p>{config.email}</p>
                <p className="factura-iban-imprimir">IBAN: {config.iban}</p>
              </div>
              <div className="factura-fecha-num-imprimir">
                <p><strong>Fecha:</strong> {f.fecha_emision?.split('-').reverse().join('/')}</p>
                <p><strong>Factura:</strong> {f.numero_factura}</p>
              </div>
            </div>

            {f.tipo === 'completa' && (
              <div className="factura-cliente-imprimir">
                <p className="factura-etiqueta-imprimir">CLIENTE</p>
                <p className="factura-negocio-imprimir">{f.cliente_nombre}</p>
                <p>{f.cliente_nif}</p>
                <p>{f.cliente_direccion}</p>
                <p>{f.cliente_ciudad_cp}</p>
              </div>
            )}

            <table className="factura-tabla-imprimir2">
              <thead><tr><th>CONCEPTO</th><th>BASE IMPONBLE</th></tr></thead>
              <tbody>
                <tr><td>{f.concepto}</td><td className="mono">{Number(f.base_imponible).toFixed(2)}€</td></tr>
              </tbody>
            </table>
            <div className="factura-impuestos-imprimir">
              <div className="factura-linea-impuesto"><span>IVA ({f.iva_porcentaje}%)</span><span className="mono">{iva.toFixed(2)}€</span></div>
              {f.aplica_irpf && (
                <div className="factura-linea-impuesto"><span>IRPF (-{f.irpf_porcentaje}%)</span><span className="mono">-{irpf.toFixed(2)}€</span></div>
              )}
              <div className="factura-total-imprimir"><span>TOTAL</span><span className="mono">{Number(f.total).toFixed(2)}€</span></div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
