import { useRef, useState } from 'react'
import './PizarraTactica.css'

const ANCHO = 800
const ALTO = 520

const fondos = [
  { valor: 'campo_completo', etiqueta: 'Campo completo' },
  { valor: 'medio_campo', etiqueta: 'Medio campo' },
  { valor: 'espacio_reducido', etiqueta: 'Espacio reducido' },
  { valor: 'gimnasio', etiqueta: 'Gimnasio' },
]

const coloresJugador = ['#c8ff4d', '#4dc8ff', '#ea5c4a', '#f2c14e', '#f5f5f5']

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }
function idNuevo() { return Math.random().toString(36).slice(2, 10) }

function FondoCampo({ fondo }) {
  if (fondo === 'campo_completo') {
    return (
      <g stroke="rgba(255,255,255,0.55)" strokeWidth="2" fill="none">
        <rect x="20" y="20" width="760" height="480" />
        <line x1="400" y1="20" x2="400" y2="500" />
        <circle cx="400" cy="260" r="60" />
        <circle cx="400" cy="260" r="3" fill="rgba(255,255,255,0.55)" />
        <rect x="20" y="160" width="100" height="200" />
        <rect x="20" y="210" width="40" height="100" />
        <rect x="680" y="160" width="100" height="200" />
        <rect x="740" y="210" width="40" height="100" />
        <rect x="8" y="235" width="12" height="50" />
        <rect x="780" y="235" width="12" height="50" />
      </g>
    )
  }
  if (fondo === 'medio_campo') {
    return (
      <g stroke="rgba(255,255,255,0.55)" strokeWidth="2" fill="none">
        <rect x="20" y="20" width="760" height="480" />
        <path d="M 700 200 A 60 60 0 0 1 700 320" />
        <rect x="680" y="160" width="100" height="200" />
        <rect x="740" y="210" width="40" height="100" />
        <rect x="780" y="235" width="12" height="50" />
      </g>
    )
  }
  if (fondo === 'espacio_reducido') {
    return (
      <g stroke="rgba(255,255,255,0.35)" strokeWidth="1.5" fill="none">
        <rect x="20" y="20" width="760" height="480" strokeWidth="2" />
        {[1, 2, 3].map((i) => <line key={`v${i}`} x1={20 + i * 190} y1="20" x2={20 + i * 190} y2="500" />)}
        {[1, 2].map((i) => <line key={`h${i}`} x1="20" y1={20 + i * 160} x2="780" y2={20 + i * 160} />)}
      </g>
    )
  }
  // gimnasio
  return (
    <g stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none">
      <rect x="20" y="20" width="760" height="480" strokeWidth="2" />
      {[1, 2, 3, 4, 5, 6].map((i) => <line key={i} x1={20 + i * 108.5} y1="20" x2={20 + i * 108.5} y2="500" />)}
    </g>
  )
}

function ElementoSVG({ el, seleccionado }) {
  const anillo = seleccionado && (
    <circle cx={el.x} cy={el.y} r="22" fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" />
  )

  if (el.tipo === 'jugador') {
    return (
      <g>
        {anillo}
        <circle cx={el.x} cy={el.y} r="15" fill={el.color} stroke="rgba(0,0,0,0.4)" strokeWidth="1.5" />
        <text x={el.x} y={el.y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#0d1210">{el.numero}</text>
      </g>
    )
  }
  if (el.tipo === 'cono') {
    return (
      <g>
        {anillo}
        <polygon points={`${el.x},${el.y - 12} ${el.x - 10},${el.y + 10} ${el.x + 10},${el.y + 10}`} fill="#ff7a1a" stroke="#a34c00" strokeWidth="1" />
      </g>
    )
  }
  if (el.tipo === 'valla') {
    return (
      <g>
        {anillo}
        <rect x={el.x - 16} y={el.y - 4} width="32" height="8" fill="#f2c14e" stroke="#0d1210" strokeWidth="1" />
        <rect x={el.x - 16} y={el.y - 12} width="4" height="20" fill="#7a7a7a" />
        <rect x={el.x + 12} y={el.y - 12} width="4" height="20" fill="#7a7a7a" />
      </g>
    )
  }
  if (el.tipo === 'porteria') {
    return (
      <g>
        {anillo}
        <path
          d={`M ${el.x - 18} ${el.y + 14} L ${el.x - 18} ${el.y - 14} L ${el.x + 18} ${el.y - 14} L ${el.x + 18} ${el.y + 14}`}
          fill="none" stroke="#eef2ee" strokeWidth="3"
        />
      </g>
    )
  }
  // balon
  return (
    <g>
      {anillo}
      <circle cx={el.x} cy={el.y} r="9" fill="#f5f5f5" stroke="#0d1210" strokeWidth="1.5" />
      <circle cx={el.x} cy={el.y} r="2.5" fill="#0d1210" />
    </g>
  )
}

export default function PizarraTactica() {
  const svgRef = useRef(null)
  const [fondo, setFondo] = useState('campo_completo')
  const [elementos, setElementos] = useState([])
  const [lineas, setLineas] = useState([])
  const [seleccionId, setSeleccionId] = useState(null)
  const [herramienta, setHerramienta] = useState('mover') // 'mover' | 'flecha'
  const [arrastrandoId, setArrastrandoId] = useState(null)
  const [dibujandoLinea, setDibujandoLinea] = useState(false)
  const [lineaTemp, setLineaTemp] = useState(null)
  const [colorNuevoJugador, setColorNuevoJugador] = useState(coloresJugador[0])

  const seleccionado = elementos.find((e) => e.id === seleccionId)
  const lineaSeleccionada = lineas.find((l) => l.id === seleccionId)

  function coordsSVG(e) {
    const svg = svgRef.current
    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const ctm = svg.getScreenCTM().inverse()
    const p = pt.matrixTransform(ctm)
    return { x: clamp(p.x, 20, ANCHO - 20), y: clamp(p.y, 20, ALTO - 20) }
  }

  function anadirElemento(tipo) {
    const base = { id: idNuevo(), tipo, x: 380 + (elementos.length % 5) * 22, y: 240 + Math.floor(elementos.length / 5) * 26 }
    if (tipo === 'jugador') {
      const numero = elementos.filter((e) => e.tipo === 'jugador').length + 1
      base.color = colorNuevoJugador
      base.numero = numero
    }
    setElementos((prev) => [...prev, base])
    setSeleccionId(base.id)
  }

  function iniciarArrastre(id, e) {
    if (herramienta !== 'mover') return
    e.stopPropagation()
    setSeleccionId(id)
    setArrastrandoId(id)
  }

  function manejarPointerMove(e) {
    if (arrastrandoId) {
      const { x, y } = coordsSVG(e)
      setElementos((prev) => prev.map((el) => (el.id === arrastrandoId ? { ...el, x, y } : el)))
    } else if (dibujandoLinea) {
      const { x, y } = coordsSVG(e)
      setLineaTemp((prev) => (prev ? { ...prev, x2: x, y2: y } : prev))
    }
  }

  function manejarPointerUp() {
    if (arrastrandoId) setArrastrandoId(null)
    if (dibujandoLinea && lineaTemp) {
      const distancia = Math.hypot(lineaTemp.x2 - lineaTemp.x1, lineaTemp.y2 - lineaTemp.y1)
      if (distancia > 8) setLineas((prev) => [...prev, { ...lineaTemp, id: idNuevo() }])
      setLineaTemp(null)
      setDibujandoLinea(false)
    }
  }

  function manejarPointerDownCanvas(e) {
    if (herramienta === 'flecha') {
      const { x, y } = coordsSVG(e)
      setLineaTemp({ x1: x, y1: y, x2: x, y2: y })
      setDibujandoLinea(true)
    } else {
      setSeleccionId(null)
    }
  }

  function eliminarSeleccionado() {
    if (!seleccionId) return
    setElementos((prev) => prev.filter((e) => e.id !== seleccionId))
    setLineas((prev) => prev.filter((l) => l.id !== seleccionId))
    setSeleccionId(null)
  }

  function vaciarPizarra() {
    if (!window.confirm('¿Vaciar toda la pizarra?')) return
    setElementos([])
    setLineas([])
    setSeleccionId(null)
  }

  function actualizarSeleccionado(cambios) {
    setElementos((prev) => prev.map((el) => (el.id === seleccionId ? { ...el, ...cambios } : el)))
  }

  async function exportarImagen() {
    const svg = svgRef.current
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = ANCHO
      canvas.height = ALTO
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, ANCHO, ALTO)
      URL.revokeObjectURL(url)
      canvas.toBlob((blob) => {
        const enlace = document.createElement('a')
        enlace.download = `pizarra-tactica-${new Date().toISOString().slice(0, 10)}.png`
        enlace.href = URL.createObjectURL(blob)
        enlace.click()
      })
    }
    img.src = url
  }

  return (
    <div className="pizarra-layout">
      <div className="pizarra-cabecera">
        <div>
          <h2>Pizarra Táctica</h2>
          <p className="texto-dim">
            Versión inicial: crea la escena, arrástrala a tu gusto, y expórtala como imagen — para
            usarla luego en tus documentos de sesión o en la biblioteca de ejercicios.
          </p>
        </div>
      </div>

      <div className="pizarra-toolbar">
        <select value={fondo} onChange={(e) => setFondo(e.target.value)}>
          {fondos.map((f) => <option key={f.valor} value={f.valor}>{f.etiqueta}</option>)}
        </select>

        <div className="pizarra-separador" />

        <button className="pizarra-boton" onClick={() => anadirElemento('jugador')}>+ Jugador</button>
        <select value={colorNuevoJugador} onChange={(e) => setColorNuevoJugador(e.target.value)} className="pizarra-color-select">
          {coloresJugador.map((c) => (
            <option key={c} value={c} style={{ background: c }}>●</option>
          ))}
        </select>
        <button className="pizarra-boton" onClick={() => anadirElemento('cono')}>+ Cono</button>
        <button className="pizarra-boton" onClick={() => anadirElemento('valla')}>+ Valla</button>
        <button className="pizarra-boton" onClick={() => anadirElemento('porteria')}>+ Portería</button>
        <button className="pizarra-boton" onClick={() => anadirElemento('balon')}>+ Balón</button>

        <div className="pizarra-separador" />

        <button
          className={`pizarra-boton ${herramienta === 'mover' ? 'pizarra-boton-activo' : ''}`}
          onClick={() => setHerramienta('mover')}
        >
          ✥ Mover
        </button>
        <button
          className={`pizarra-boton ${herramienta === 'flecha' ? 'pizarra-boton-activo' : ''}`}
          onClick={() => setHerramienta('flecha')}
        >
          ↗ Flecha
        </button>

        <div className="pizarra-separador" />

        <button className="pizarra-boton" onClick={eliminarSeleccionado} disabled={!seleccionId}>Eliminar selección</button>
        <button className="pizarra-boton" onClick={vaciarPizarra}>Vaciar pizarra</button>
        <button className="btn-principal pizarra-boton-exportar" onClick={exportarImagen}>⬇ Guardar como imagen</button>
      </div>

      <div className="pizarra-cuerpo">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className={`pizarra-svg pizarra-svg-${fondo}`}
          onPointerMove={manejarPointerMove}
          onPointerUp={manejarPointerUp}
          onPointerLeave={manejarPointerUp}
          onPointerDown={manejarPointerDownCanvas}
        >
          <rect x="0" y="0" width={ANCHO} height={ALTO} fill={fondo === 'gimnasio' ? '#3a3f3c' : '#1f6b3a'} />
          <FondoCampo fondo={fondo} />

          {lineas.map((l) => (
            <g key={l.id} onPointerDown={(e) => iniciarArrastre(l.id, e)}>
              <line
                x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={l.id === seleccionId ? 'var(--accent)' : '#fff'} strokeWidth="12" opacity="0.01"
              />
              <line
                x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2}
                stroke={l.id === seleccionId ? 'var(--accent)' : '#fff'} strokeWidth="3"
                markerEnd="url(#flechaPunta)"
              />
            </g>
          ))}
          {lineaTemp && (
            <line x1={lineaTemp.x1} y1={lineaTemp.y1} x2={lineaTemp.x2} y2={lineaTemp.y2} stroke="#fff" strokeWidth="3" strokeDasharray="6 4" />
          )}

          <defs>
            <marker id="flechaPunta" markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
              <path d="M0,0 L0,6 L9,3 z" fill="#fff" />
            </marker>
          </defs>

          {elementos.map((el) => (
            <g key={el.id} onPointerDown={(e) => iniciarArrastre(el.id, e)} style={{ cursor: herramienta === 'mover' ? 'grab' : 'default' }}>
              <ElementoSVG el={el} seleccionado={el.id === seleccionId} />
            </g>
          ))}
        </svg>

        <div className="pizarra-panel">
          {!seleccionado && !lineaSeleccionada ? (
            <p className="texto-dim">Toca un elemento de la pizarra para editarlo, o usa los botones de arriba para añadir más.</p>
          ) : lineaSeleccionada ? (
            <>
              <h4>Flecha</h4>
              <button className="btn-eliminar-sesion" onClick={eliminarSeleccionado}>Eliminar</button>
            </>
          ) : seleccionado.tipo === 'jugador' ? (
            <>
              <h4>Jugador #{seleccionado.numero}</h4>
              <label className="campo-sesion">
                <span>Número</span>
                <input
                  type="number" min="0" max="99" value={seleccionado.numero}
                  onChange={(e) => actualizarSeleccionado({ numero: Number(e.target.value) })}
                />
              </label>
              <label className="campo-sesion">
                <span>Color</span>
                <div className="pizarra-color-chips">
                  {coloresJugador.map((c) => (
                    <button
                      key={c} type="button"
                      className={`pizarra-color-chip ${seleccionado.color === c ? 'pizarra-color-chip-activo' : ''}`}
                      style={{ background: c }}
                      onClick={() => actualizarSeleccionado({ color: c })}
                    />
                  ))}
                </div>
              </label>
              <button className="btn-eliminar-sesion" onClick={eliminarSeleccionado}>Eliminar</button>
            </>
          ) : (
            <>
              <h4>{{ cono: 'Cono', valla: 'Valla', porteria: 'Portería', balon: 'Balón' }[seleccionado.tipo] || 'Elemento'}</h4>
              <button className="btn-eliminar-sesion" onClick={eliminarSeleccionado}>Eliminar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
