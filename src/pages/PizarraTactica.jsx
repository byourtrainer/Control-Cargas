import { useRef, useState } from 'react'
import './PizarraTactica.css'

const ANCHO = 800
const ALTO = 520

const fondos = [
  { valor: 'campo_completo', etiqueta: 'Pista completa (hockey patines)' },
  { valor: 'medio_campo', etiqueta: 'Media pista (hockey patines)' },
  { valor: 'espacio_reducido', etiqueta: 'Espacio reducido' },
  { valor: 'gimnasio', etiqueta: 'Gimnasio' },
]

const paletaElementos = ['#c8ff4d', '#4dc8ff', '#ea5c4a', '#f2c14e', '#ff7a1a', '#f5f5f5', '#8a5cf6']

const tiposBalon = [
  { valor: 'hockey', etiqueta: 'Hockey patines' },
  { valor: 'futbol', etiqueta: 'Fútbol' },
  { valor: 'baloncesto', etiqueta: 'Baloncesto' },
  { valor: 'voleibol', etiqueta: 'Voleibol' },
]

const trazos = [
  { valor: 'solida', etiqueta: 'Sólida' },
  { valor: 'discontinua', etiqueta: 'Discontinua' },
  { valor: 'punteada', etiqueta: 'Punteada' },
]

const dasharrayPorTrazo = { solida: undefined, discontinua: '10 6', punteada: '2 7' }
const tiposObstaculo = ['cono', 'valla', 'porteria']

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }
function idNuevo() { return Math.random().toString(36).slice(2, 10) }
function slugColor(c) { return c.replace('#', '') }

// Área de portero: rectángulo separado de la pared, con un semicírculo en
// su borde más cercano a la pared (mitad discontinua hacia la pared,
// mitad sólida hacia el campo) — según el modelo de pista de hockey patines.
function AreaPorteria({ xPared, direccionCampo }) {
  const gap = 75
  const anchoRect = 100
  const altoRect = 230
  const xBordePared = xPared + direccionCampo * gap
  const xBordeCampo = xBordePared + direccionCampo * anchoRect
  const x1 = Math.min(xBordePared, xBordeCampo)
  const x2 = Math.max(xBordePared, xBordeCampo)
  const r = 35
  const sentidoHaciaCampo = direccionCampo === 1 ? 1 : 0
  const sentidoHaciaPared = direccionCampo === 1 ? 0 : 1
  return (
    <g>
      <rect x={x1} y={260 - altoRect / 2} width={x2 - x1} height={altoRect} />
      <path d={`M ${xBordePared},${260 - r} A ${r} ${r} 0 0 ${sentidoHaciaCampo} ${xBordePared},${260 + r}`} />
      <path d={`M ${xBordePared},${260 - r} A ${r} ${r} 0 0 ${sentidoHaciaPared} ${xBordePared},${260 + r}`} strokeDasharray="5 4" />
      <circle cx={xBordeCampo + direccionCampo * 65} cy="260" r="2.5" fill="rgba(255,255,255,0.6)" />
    </g>
  )
}

function FondoCampo({ fondo }) {
  if (fondo === 'campo_completo' || fondo === 'medio_campo') {
    const soloDerecha = fondo === 'medio_campo'
    return (
      <g stroke="rgba(255,255,255,0.6)" strokeWidth="2.5" fill="none">
        <rect x="20" y="20" width="760" height="480" rx="40" ry="40" />
        {!soloDerecha && (
          <>
            <line x1="400" y1="20" x2="400" y2="500" />
            <AreaPorteria xPared={20} direccionCampo={1} />
          </>
        )}
        <circle cx="400" cy="260" r="60" />
        <circle cx="400" cy="260" r="2.5" fill="rgba(255,255,255,0.6)" />
        <AreaPorteria xPared={780} direccionCampo={-1} />
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
  return (
    <g stroke="rgba(255,255,255,0.3)" strokeWidth="1.5" fill="none">
      <rect x="20" y="20" width="760" height="480" strokeWidth="2" />
      {[1, 2, 3, 4, 5, 6].map((i) => <line key={i} x1={20 + i * 108.5} y1="20" x2={20 + i * 108.5} y2="500" />)}
    </g>
  )
}

function ElementoSVG({ el, seleccionado }) {
  const t = el.tamano || 1
  const anillo = seleccionado && (
    <circle cx={el.x} cy={el.y} r={22 * t} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" />
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
        <polygon
          points={`${el.x},${el.y - 12 * t} ${el.x - 10 * t},${el.y + 10 * t} ${el.x + 10 * t},${el.y + 10 * t}`}
          fill={el.color} stroke="rgba(0,0,0,0.4)" strokeWidth="1"
        />
      </g>
    )
  }
  if (el.tipo === 'valla') {
    return (
      <g>
        {anillo}
        <rect x={el.x - 16 * t} y={el.y - 4 * t} width={32 * t} height={8 * t} fill={el.color} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
        <rect x={el.x - 16 * t} y={el.y - 12 * t} width={4 * t} height={20 * t} fill="#7a7a7a" />
        <rect x={el.x + 12 * t} y={el.y - 12 * t} width={4 * t} height={20 * t} fill="#7a7a7a" />
      </g>
    )
  }
  if (el.tipo === 'porteria') {
    return (
      <g>
        {anillo}
        <defs>
          <pattern id={`red-${el.id}`} width="5" height="5" patternUnits="userSpaceOnUse">
            <path d="M0,0 L5,5 M5,0 L0,5" stroke="#fff" strokeWidth="0.6" />
          </pattern>
        </defs>
        <rect x={el.x - 16 * t} y={el.y - 13 * t} width={32 * t} height={26 * t} fill={`url(#red-${el.id})`} opacity="0.8" />
        <path
          d={`M ${el.x - 18 * t} ${el.y + 14 * t} L ${el.x - 18 * t} ${el.y - 14 * t} L ${el.x + 18 * t} ${el.y - 14 * t} L ${el.x + 18 * t} ${el.y + 14 * t}`}
          fill="none" stroke="#ff7a1a" strokeWidth={4 * t}
        />
      </g>
    )
  }
  if (el.variante === 'futbol') {
    return (
      <g>
        {anillo}
        <circle cx={el.x} cy={el.y} r="9" fill="#f5f5f5" stroke="#0d1210" strokeWidth="1.2" />
        <polygon points={`${el.x},${el.y - 4} ${el.x - 3.5},${el.y - 1} ${el.x - 2},${el.y + 3.5} ${el.x + 2},${el.y + 3.5} ${el.x + 3.5},${el.y - 1}`} fill="#0d1210" />
      </g>
    )
  }
  if (el.variante === 'baloncesto') {
    return (
      <g>
        {anillo}
        <circle cx={el.x} cy={el.y} r="9" fill="#ff7a1a" stroke="#5c3200" strokeWidth="1" />
        <path d={`M ${el.x - 9},${el.y} H ${el.x + 9} M ${el.x},${el.y - 9} V ${el.y + 9}`} stroke="#5c3200" strokeWidth="0.8" />
      </g>
    )
  }
  if (el.variante === 'voleibol') {
    return (
      <g>
        {anillo}
        <circle cx={el.x} cy={el.y} r="9" fill="#f5f5f5" stroke="#0d1210" strokeWidth="1" />
        <path d={`M ${el.x - 6},${el.y - 5} Q ${el.x} ${el.y - 9} ${el.x + 6} ${el.y - 5}`} fill="none" stroke="#4dc8ff" strokeWidth="1.4" />
        <path d={`M ${el.x - 7},${el.y + 2} Q ${el.x} ${el.y + 7} ${el.x + 7} ${el.y + 2}`} fill="none" stroke="#ea5c4a" strokeWidth="1.4" />
      </g>
    )
  }
  return (
    <g>
      {anillo}
      <circle cx={el.x} cy={el.y} r="6" fill="#141414" stroke="#000" strokeWidth="1" />
    </g>
  )
}

export default function PizarraTactica() {
  const svgRef = useRef(null)
  const [fondo, setFondo] = useState('campo_completo')
  const [elementos, setElementos] = useState([])
  const [lineas, setLineas] = useState([])
  const [seleccionId, setSeleccionId] = useState(null)
  const [herramienta, setHerramienta] = useState('mover')
  const [arrastrandoId, setArrastrandoId] = useState(null)
  const [arrastrandoControlId, setArrastrandoControlId] = useState(null)
  const [arrastrandoLinea, setArrastrandoLinea] = useState(null) // { id, dx0, dy0, original }
  const [dibujando, setDibujando] = useState(false)
  const [lineaTemp, setLineaTemp] = useState(null)
  const [colorNuevoElemento, setColorNuevoElemento] = useState(paletaElementos[0])
  const [tamanoNuevoElemento, setTamanoNuevoElemento] = useState(1)
  const [tipoBalonNuevo, setTipoBalonNuevo] = useState('hockey')
  const [estiloLineaActual, setEstiloLineaActual] = useState({ color: '#f5f5f5', grosor: 3, trazo: 'solida' })

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
      base.color = colorNuevoElemento
      base.numero = elementos.filter((e) => e.tipo === 'jugador').length + 1
    } else if (tipo === 'cono' || tipo === 'valla') {
      base.color = colorNuevoElemento
      base.tamano = tamanoNuevoElemento
    } else if (tipo === 'porteria') {
      base.tamano = tamanoNuevoElemento
    } else if (tipo === 'balon') {
      base.variante = tipoBalonNuevo
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

  function iniciarArrastreLinea(linea, e) {
    if (herramienta !== 'mover') return
    e.stopPropagation()
    setSeleccionId(linea.id)
    const { x, y } = coordsSVG(e)
    setArrastrandoLinea({ id: linea.id, dx0: x, dy0: y, original: linea })
  }

  function iniciarArrastreControl(lineaId, e) {
    e.stopPropagation()
    setSeleccionId(lineaId)
    setArrastrandoControlId(lineaId)
  }

  function manejarPointerMove(e) {
    if (arrastrandoId) {
      const { x, y } = coordsSVG(e)
      setElementos((prev) => prev.map((el) => (el.id === arrastrandoId ? { ...el, x, y } : el)))
      return
    }
    if (arrastrandoControlId) {
      const { x, y } = coordsSVG(e)
      setLineas((prev) => prev.map((l) => (l.id === arrastrandoControlId ? { ...l, cx: x, cy: y } : l)))
      return
    }
    if (arrastrandoLinea) {
      const { x, y } = coordsSVG(e)
      const dx = x - arrastrandoLinea.dx0
      const dy = y - arrastrandoLinea.dy0
      const orig = arrastrandoLinea.original
      setLineas((prev) => prev.map((l) => {
        if (l.id !== arrastrandoLinea.id) return l
        if (l.tipo === 'libre') {
          return { ...l, puntos: orig.puntos.map((p) => ({ x: p.x + dx, y: p.y + dy })) }
        }
        const actualizado = { ...l, x1: orig.x1 + dx, y1: orig.y1 + dy, x2: orig.x2 + dx, y2: orig.y2 + dy }
        if (l.tipo === 'curva') { actualizado.cx = orig.cx + dx; actualizado.cy = orig.cy + dy }
        return actualizado
      }))
      return
    }
    if (dibujando && herramienta === 'lapiz') {
      const { x, y } = coordsSVG(e)
      setLineaTemp((prev) => {
        if (!prev) return prev
        const ultimo = prev.puntos[prev.puntos.length - 1]
        if (Math.hypot(x - ultimo.x, y - ultimo.y) < 4) return prev
        return { ...prev, puntos: [...prev.puntos, { x, y }] }
      })
    } else if (dibujando) {
      const { x, y } = coordsSVG(e)
      setLineaTemp((prev) => (prev ? { ...prev, x2: x, y2: y } : prev))
    }
  }

  function manejarPointerUp() {
    if (arrastrandoId) setArrastrandoId(null)
    if (arrastrandoControlId) setArrastrandoControlId(null)
    if (arrastrandoLinea) setArrastrandoLinea(null)

    if (dibujando && lineaTemp) {
      if (herramienta === 'lapiz') {
        if (lineaTemp.puntos.length > 1) {
          setLineas((prev) => [...prev, { ...lineaTemp, id: idNuevo() }])
        }
      } else {
        const distancia = Math.hypot(lineaTemp.x2 - lineaTemp.x1, lineaTemp.y2 - lineaTemp.y1)
        if (distancia > 8) {
          const nuevaLinea = { ...lineaTemp, id: idNuevo() }
          setLineas((prev) => [...prev, nuevaLinea])
          if (herramienta === 'flecha_curva') {
            setSeleccionId(nuevaLinea.id)
            setHerramienta('mover')
          }
        }
      }
      setLineaTemp(null)
      setDibujando(false)
    }
  }

  function manejarPointerDownCanvas(e) {
    if (herramienta === 'mover') {
      setSeleccionId(null)
      return
    }
    const { x, y } = coordsSVG(e)
    setDibujando(true)
    if (herramienta === 'lapiz') {
      setLineaTemp({ tipo: 'libre', puntos: [{ x, y }], color: estiloLineaActual.color, grosor: estiloLineaActual.grosor, trazo: estiloLineaActual.trazo })
    } else if (herramienta === 'flecha_curva') {
      setLineaTemp({ tipo: 'curva', x1: x, y1: y, x2: x, y2: y, cx: x, cy: y, color: estiloLineaActual.color, grosor: estiloLineaActual.grosor, trazo: estiloLineaActual.trazo })
    } else {
      setLineaTemp({ tipo: 'recta', x1: x, y1: y, x2: x, y2: y, color: estiloLineaActual.color, grosor: estiloLineaActual.grosor, trazo: estiloLineaActual.trazo })
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

  function actualizarLineaSeleccionada(cambios) {
    setLineas((prev) => prev.map((l) => (l.id === seleccionId ? { ...l, ...cambios } : l)))
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

  function pathDeLinea(l) {
    if (l.tipo === 'recta') return null
    if (l.tipo === 'curva') return `M ${l.x1} ${l.y1} Q ${l.cx} ${l.cy} ${l.x2} ${l.y2}`
    return l.puntos.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')
  }

  const coloresLineasUsados = [...new Set([...lineas.map((l) => l.color), estiloLineaActual.color])]

  return (
    <div className="pizarra-layout">
      <div className="pizarra-cabecera">
        <div>
          <h2>Pizarra Táctica</h2>
          <p className="texto-dim">
            Crea la escena, arrástrala a tu gusto, y expórtala como imagen — para usarla en tus
            documentos de sesión o en la biblioteca de ejercicios.
          </p>
        </div>
      </div>

      <div className="pizarra-toolbar">
        <select value={fondo} onChange={(e) => setFondo(e.target.value)}>
          {fondos.map((f) => <option key={f.valor} value={f.valor}>{f.etiqueta}</option>)}
        </select>

        <div className="pizarra-separador" />

        <button className="pizarra-boton" onClick={() => anadirElemento('jugador')}>+ Jugador</button>
        <button className="pizarra-boton" onClick={() => anadirElemento('cono')}>+ Cono</button>
        <button className="pizarra-boton" onClick={() => anadirElemento('valla')}>+ Valla</button>
        <button className="pizarra-boton" onClick={() => anadirElemento('porteria')}>+ Portería</button>
        <select value={colorNuevoElemento} onChange={(e) => setColorNuevoElemento(e.target.value)} className="pizarra-color-select" style={{ background: colorNuevoElemento }}>
          {paletaElementos.map((c) => <option key={c} value={c}>●</option>)}
        </select>
        <label className="pizarra-linea-campo">
          <span>Tamaño</span>
          <input type="range" min="0.5" max="2" step="0.1" value={tamanoNuevoElemento} onChange={(e) => setTamanoNuevoElemento(Number(e.target.value))} />
        </label>
        <select value={tipoBalonNuevo} onChange={(e) => setTipoBalonNuevo(e.target.value)}>
          {tiposBalon.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
        </select>
        <button className="pizarra-boton" onClick={() => anadirElemento('balon')}>+ Balón</button>

        <div className="pizarra-separador" />

        <button className={`pizarra-boton ${herramienta === 'mover' ? 'pizarra-boton-activo' : ''}`} onClick={() => setHerramienta('mover')}>✥ Mover</button>
        <button className={`pizarra-boton ${herramienta === 'flecha_recta' ? 'pizarra-boton-activo' : ''}`} onClick={() => setHerramienta('flecha_recta')}>↗ Flecha recta</button>
        <button className={`pizarra-boton ${herramienta === 'flecha_curva' ? 'pizarra-boton-activo' : ''}`} onClick={() => setHerramienta('flecha_curva')}>⤴ Flecha curva</button>
        <button className={`pizarra-boton ${herramienta === 'lapiz' ? 'pizarra-boton-activo' : ''}`} onClick={() => setHerramienta('lapiz')}>✎ Lápiz libre</button>

        <div className="pizarra-separador" />

        <button className="pizarra-boton" onClick={eliminarSeleccionado} disabled={!seleccionId}>Eliminar selección</button>
        <button className="pizarra-boton" onClick={vaciarPizarra}>Vaciar pizarra</button>
        <button className="btn-principal pizarra-boton-exportar" onClick={exportarImagen}>⬇ Guardar como imagen</button>
      </div>

      {herramienta !== 'mover' && (
        <div className="pizarra-toolbar pizarra-toolbar-linea">
          <span className="texto-dim">Estilo de la próxima línea:</span>
          <div className="pizarra-color-chips">
            {paletaElementos.map((c) => (
              <button
                key={c} type="button"
                className={`pizarra-color-chip ${estiloLineaActual.color === c ? 'pizarra-color-chip-activo' : ''}`}
                style={{ background: c }}
                onClick={() => setEstiloLineaActual((s) => ({ ...s, color: c }))}
              />
            ))}
          </div>
          <label className="pizarra-linea-campo">
            <span>Grosor</span>
            <input
              type="range" min="1" max="8" value={estiloLineaActual.grosor}
              onChange={(e) => setEstiloLineaActual((s) => ({ ...s, grosor: Number(e.target.value) }))}
            />
          </label>
          <select value={estiloLineaActual.trazo} onChange={(e) => setEstiloLineaActual((s) => ({ ...s, trazo: e.target.value }))}>
            {trazos.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
          </select>
        </div>
      )}

      <div className="pizarra-cuerpo">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${ANCHO} ${ALTO}`}
          className="pizarra-svg"
          onPointerMove={manejarPointerMove}
          onPointerUp={manejarPointerUp}
          onPointerLeave={manejarPointerUp}
          onPointerDown={manejarPointerDownCanvas}
        >
          <rect x="0" y="0" width={ANCHO} height={ALTO} fill={fondo === 'gimnasio' ? '#3a3f3c' : '#1f6b3a'} />
          <FondoCampo fondo={fondo} />

          <defs>
            {coloresLineasUsados.map((c) => (
              <marker key={c} id={`flecha-${slugColor(c)}`} markerWidth="10" markerHeight="10" refX="8" refY="3" orient="auto" markerUnits="strokeWidth">
                <path d="M0,0 L0,6 L9,3 z" fill={c} />
              </marker>
            ))}
          </defs>

          {lineas.map((l) => (
            <g key={l.id}>
              {l.tipo === 'recta' ? (
                <>
                  <line x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth="16" opacity="0.01" style={{ cursor: herramienta === 'mover' ? 'grab' : 'default' }} onPointerDown={(e) => iniciarArrastreLinea(l, e)} />
                  <line
                    x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={l.color} strokeWidth={l.grosor}
                    strokeDasharray={dasharrayPorTrazo[l.trazo]} strokeLinecap="round"
                    markerEnd={`url(#flecha-${slugColor(l.color)})`}
                    style={{ pointerEvents: 'none' }}
                  />
                </>
              ) : (
                <>
                  <path d={pathDeLinea(l)} fill="none" stroke={l.color} strokeWidth="16" opacity="0.01" style={{ cursor: herramienta === 'mover' ? 'grab' : 'default' }} onPointerDown={(e) => iniciarArrastreLinea(l, e)} />
                  <path
                    d={pathDeLinea(l)} fill="none" stroke={l.color} strokeWidth={l.grosor}
                    strokeDasharray={dasharrayPorTrazo[l.trazo]} strokeLinecap="round" strokeLinejoin="round"
                    markerEnd={l.tipo === 'curva' ? `url(#flecha-${slugColor(l.color)})` : undefined}
                    style={{ pointerEvents: 'none' }}
                  />
                </>
              )}
              {l.id === seleccionId && l.tipo === 'curva' && (
                <circle
                  cx={l.cx} cy={l.cy} r="7" fill="var(--accent)" stroke="#0d1210" strokeWidth="1.5"
                  style={{ cursor: 'grab' }}
                  onPointerDown={(e) => iniciarArrastreControl(l.id, e)}
                />
              )}
            </g>
          ))}

          {lineaTemp && herramienta !== 'mover' && (
            lineaTemp.tipo === 'recta' ? (
              <line x1={lineaTemp.x1} y1={lineaTemp.y1} x2={lineaTemp.x2} y2={lineaTemp.y2} stroke={lineaTemp.color} strokeWidth={lineaTemp.grosor} strokeDasharray="6 4" />
            ) : (
              <path d={pathDeLinea(lineaTemp)} fill="none" stroke={lineaTemp.color} strokeWidth={lineaTemp.grosor} strokeDasharray="6 4" />
            )
          )}

          {elementos.map((el) => (
            <g key={el.id} onPointerDown={(e) => iniciarArrastre(el.id, e)} style={{ cursor: herramienta === 'mover' ? 'grab' : 'default' }}>
              <ElementoSVG el={el} seleccionado={el.id === seleccionId} />
            </g>
          ))}
        </svg>

        <div className="pizarra-panel">
          {!seleccionado && !lineaSeleccionada ? (
            <p className="texto-dim">Toca un elemento o una línea de la pizarra para editarlo, o usa los botones de arriba para añadir más.</p>
          ) : lineaSeleccionada ? (
            <>
              <h4>Línea / flecha</h4>
              <p className="texto-faint">Arrástrala desde cualquier punto para moverla entera.</p>
              <label className="campo-sesion">
                <span>Color</span>
                <div className="pizarra-color-chips">
                  {paletaElementos.map((c) => (
                    <button
                      key={c} type="button"
                      className={`pizarra-color-chip ${lineaSeleccionada.color === c ? 'pizarra-color-chip-activo' : ''}`}
                      style={{ background: c }}
                      onClick={() => actualizarLineaSeleccionada({ color: c })}
                    />
                  ))}
                </div>
              </label>
              <label className="campo-sesion">
                <span>Grosor</span>
                <input
                  type="range" min="1" max="8" value={lineaSeleccionada.grosor}
                  onChange={(e) => actualizarLineaSeleccionada({ grosor: Number(e.target.value) })}
                />
              </label>
              <label className="campo-sesion">
                <span>Trazo</span>
                <select value={lineaSeleccionada.trazo} onChange={(e) => actualizarLineaSeleccionada({ trazo: e.target.value })}>
                  {trazos.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                </select>
              </label>
              {lineaSeleccionada.tipo === 'curva' && (
                <p className="texto-faint">Arrastra el punto verde para curvarla.</p>
              )}
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
                  {paletaElementos.map((c) => (
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
          ) : tiposObstaculo.includes(seleccionado.tipo) ? (
            <>
              <h4>{{ cono: 'Cono', valla: 'Valla', porteria: 'Portería' }[seleccionado.tipo]}</h4>
              {seleccionado.tipo !== 'porteria' && (
                <label className="campo-sesion">
                  <span>Color</span>
                  <div className="pizarra-color-chips">
                    {paletaElementos.map((c) => (
                      <button
                        key={c} type="button"
                        className={`pizarra-color-chip ${seleccionado.color === c ? 'pizarra-color-chip-activo' : ''}`}
                        style={{ background: c }}
                        onClick={() => actualizarSeleccionado({ color: c })}
                      />
                    ))}
                  </div>
                </label>
              )}
              <label className="campo-sesion">
                <span>Tamaño</span>
                <input
                  type="range" min="0.5" max="2" step="0.1" value={seleccionado.tamano || 1}
                  onChange={(e) => actualizarSeleccionado({ tamano: Number(e.target.value) })}
                />
              </label>
              <button className="btn-eliminar-sesion" onClick={eliminarSeleccionado}>Eliminar</button>
            </>
          ) : (
            <>
              <h4>Balón</h4>
              <label className="campo-sesion">
                <span>Tipo</span>
                <select value={seleccionado.variante} onChange={(e) => actualizarSeleccionado({ variante: e.target.value })}>
                  {tiposBalon.map((t) => <option key={t.valor} value={t.valor}>{t.etiqueta}</option>)}
                </select>
              </label>
              <button className="btn-eliminar-sesion" onClick={eliminarSeleccionado}>Eliminar</button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
