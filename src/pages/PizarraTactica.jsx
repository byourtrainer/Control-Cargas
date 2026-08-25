import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { hoyISOLocal } from '../lib/fechas'
import './PizarraTactica.css'

const ANCHO = 800
const ALTO = 520

const fondos = [
  { valor: 'campo_completo', etiqueta: 'Pista completa (hockey patines)' },
  { valor: 'medio_campo', etiqueta: 'Media pista (hockey patines)' },
  { valor: 'espacio_reducido', etiqueta: 'Espacio reducido' },
  { valor: 'gimnasio', etiqueta: 'Gimnasio' },
]

const paletaElementos = ['#c8ff4d', '#4dc8ff', '#ea5c4a', '#f2c14e', '#ff7a1a', '#f5f5f5', '#8a5cf6', '#0d1210']

function esColorClaro(hex) {
  const c = hex.replace('#', '')
  const r = parseInt(c.substr(0, 2), 16)
  const g = parseInt(c.substr(2, 2), 16)
  const b = parseInt(c.substr(4, 2), 16)
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6
}

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
const tiposObstaculo = ['cono', 'valla', 'bidon', 'porteria']
const etiquetaObstaculo = { cono: 'Cono', valla: 'Valla', bidon: 'Bidón', porteria: 'Portería' }
const tiposForma = ['circulo', 'cuadrado', 'rectangulo', 'triangulo', 'pentagono']
const etiquetaForma = { circulo: 'Círculo', cuadrado: 'Cuadrado', rectangulo: 'Rectángulo', triangulo: 'Triángulo', pentagono: 'Pentágono' }
// Distancia del centro a la esquina de cada figura cuando tamano=1 — se usa
// para traducir "arrastrar el tirador" en un nuevo valor de tamaño.
const radioBaseForma = { circulo: 22, cuadrado: 28.3, rectangulo: 36.7, triangulo: 24, pentagono: 24 }

function puntosPoligono(cx, cy, radio, lados) {
  const puntos = []
  for (let i = 0; i < lados; i++) {
    const angulo = (-90 + i * (360 / lados)) * (Math.PI / 180)
    puntos.push(`${cx + radio * Math.cos(angulo)},${cy + radio * Math.sin(angulo)}`)
  }
  return puntos.join(' ')
}

function clamp(v, min, max) { return Math.min(max, Math.max(min, v)) }
function idNuevo() { return Math.random().toString(36).slice(2, 10) }
function slugColor(c) { return c.replace('#', '') }

// Área de portero: rectángulo separado de la pared, con un semicírculo en
// su borde más cercano a la pared (mitad discontinua hacia la pared,
// mitad sólida hacia el campo) — según el modelo de pista de hockey patines.
function AreaPorteria({ xPared, direccionCampo, color }) {
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
      <circle cx={xBordeCampo + direccionCampo * 65} cy="260" r="2.5" fill={color} />
    </g>
  )
}

function FondoCampo({ fondo, colorCampo }) {
  const claro = esColorClaro(colorCampo)
  const colorMarcas = claro ? 'rgba(13,18,16,0.65)' : 'rgba(255,255,255,0.6)'
  const colorMarcasSuave = claro ? 'rgba(13,18,16,0.4)' : 'rgba(255,255,255,0.35)'
  const colorMarcasGimnasio = claro ? 'rgba(13,18,16,0.35)' : 'rgba(255,255,255,0.3)'

  if (fondo === 'campo_completo') {
    return (
      <g stroke={colorMarcas} strokeWidth="2.5" fill="none">
        <rect x="20" y="20" width="760" height="480" rx="40" ry="40" />
        <line x1="400" y1="20" x2="400" y2="500" />
        <AreaPorteria xPared={20} direccionCampo={1} color={colorMarcas} />
        <circle cx="400" cy="260" r="60" />
        <circle cx="400" cy="260" r="2.5" fill={colorMarcas} />
        <AreaPorteria xPared={780} direccionCampo={-1} color={colorMarcas} />
      </g>
    )
  }
  if (fondo === 'medio_campo') {
    return (
      <g stroke={colorMarcas} strokeWidth="2.5" fill="none">
        {/* Contorno: esquinas redondeadas solo en el lado de la portería (derecha);
            el lado de la línea de medio campo (izquierda) queda recto, sin redondear. */}
        <path d="M 400,20 L 740,20 A 40,40 0 0 1 780,60 L 780,460 A 40,40 0 0 1 740,500 L 400,500 Z" />
        {/* Círculo central cortado por la línea de medio campo: solo se ve su mitad derecha */}
        <path d="M 400,200 A 60,60 0 0 1 400,320" />
        <circle cx="400" cy="260" r="2.5" fill={colorMarcas} />
        <AreaPorteria xPared={780} direccionCampo={-1} color={colorMarcas} />
      </g>
    )
  }
  if (fondo === 'espacio_reducido') {
    return (
      <g stroke={colorMarcasSuave} strokeWidth="1.5" fill="none">
        <rect x="20" y="20" width="760" height="480" strokeWidth="2" />
        {[1, 2, 3].map((i) => <line key={`v${i}`} x1={20 + i * 190} y1="20" x2={20 + i * 190} y2="500" />)}
        {[1, 2].map((i) => <line key={`h${i}`} x1="20" y1={20 + i * 160} x2="780" y2={20 + i * 160} />)}
      </g>
    )
  }
  return (
    <g stroke={colorMarcasGimnasio} strokeWidth="1.5" fill="none">
      <rect x="20" y="20" width="760" height="480" strokeWidth="2" />
      {[1, 2, 3, 4, 5, 6].map((i) => <line key={i} x1={20 + i * 108.5} y1="20" x2={20 + i * 108.5} y2="500" />)}
    </g>
  )
}

function anchoMitad(el) {
  if (el.figura === 'libre') return (el.anchoLibre || 100) / 2
  const t = el.tamano || 1
  if (el.figura === 'cuadrado') return 20 * t
  if (el.figura === 'rectangulo') return 32 * t
  return radioBaseForma[el.figura] * t
}
function altoMitad(el) {
  if (el.figura === 'libre') return (el.altoLibre || 100) / 2
  const t = el.tamano || 1
  if (el.figura === 'cuadrado') return 20 * t
  if (el.figura === 'rectangulo') return 18 * t
  return radioBaseForma[el.figura] * t
}

function ElementoSVG({ el, seleccionado }) {
  const t = el.tamano || 1
  const rot = el.rotacion || 0
  const anillo = seleccionado && (
    <circle cx={el.x} cy={el.y} r={22 * t} fill="none" stroke="var(--accent)" strokeWidth="2" strokeDasharray="4 3" />
  )
  const transformRotacion = rot ? `rotate(${rot} ${el.x} ${el.y})` : undefined

  if (el.tipo === 'texto') {
    const lineasTexto = (el.contenido || '').split('\n')
    const tamanoFuente = el.tamanoFuente || 18
    const anchoAprox = Math.max(1, ...lineasTexto.map((l) => l.length)) * tamanoFuente * 0.55
    return (
      <g transform={transformRotacion}>
        {seleccionado && (
          <rect
            x={el.x - 4} y={el.y - tamanoFuente} width={anchoAprox + 8} height={lineasTexto.length * tamanoFuente * 1.2 + 8}
            fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3"
          />
        )}
        <text x={el.x} y={el.y} fontSize={tamanoFuente} fill={el.color} fontWeight="600">
          {lineasTexto.map((linea, i) => (
            <tspan key={i} x={el.x} dy={i === 0 ? 0 : tamanoFuente * 1.2}>{linea || ' '}</tspan>
          ))}
        </text>
      </g>
    )
  }

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
      <g transform={transformRotacion}>
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
      <g transform={transformRotacion}>
        {anillo}
        <rect x={el.x - 16 * t} y={el.y - 4 * t} width={32 * t} height={8 * t} fill={el.color} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
        <rect x={el.x - 16 * t} y={el.y - 12 * t} width={4 * t} height={20 * t} fill="#7a7a7a" />
        <rect x={el.x + 12 * t} y={el.y - 12 * t} width={4 * t} height={20 * t} fill="#7a7a7a" />
      </g>
    )
  }
  if (el.tipo === 'bidon') {
    return (
      <g transform={transformRotacion}>
        {anillo}
        <rect x={el.x - 9 * t} y={el.y - 14 * t} width={18 * t} height={28 * t} rx={4 * t} fill={el.color} stroke="rgba(0,0,0,0.4)" strokeWidth="1" />
        <ellipse cx={el.x} cy={el.y - 14 * t} rx={9 * t} ry={3 * t} fill="rgba(0,0,0,0.2)" />
      </g>
    )
  }
  if (el.tipo === 'forma') {
    const op = el.opacidad ?? 0.5
    const comun = { fill: el.color, fillOpacity: op, stroke: el.color, strokeWidth: 1.5, strokeOpacity: Math.min(1, op + 0.2) }
    return (
      <g transform={transformRotacion}>
        {el.figura === 'circulo' && <circle cx={el.x} cy={el.y} r={22 * t} {...comun} />}
        {el.figura === 'cuadrado' && <rect x={el.x - 20 * t} y={el.y - 20 * t} width={40 * t} height={40 * t} {...comun} />}
        {el.figura === 'rectangulo' && <rect x={el.x - 32 * t} y={el.y - 18 * t} width={64 * t} height={36 * t} {...comun} />}
        {el.figura === 'triangulo' && <polygon points={puntosPoligono(el.x, el.y, 24 * t, 3)} {...comun} />}
        {el.figura === 'pentagono' && <polygon points={puntosPoligono(el.x, el.y, 24 * t, 5)} {...comun} />}
        {el.figura === 'libre' && (
          <rect
            x={el.x - (el.anchoLibre || 100) / 2} y={el.y - (el.altoLibre || 100) / 2}
            width={el.anchoLibre || 100} height={el.altoLibre || 100} {...comun}
          />
        )}
        {seleccionado && (
          <rect
            x={el.x - anchoMitad(el) - 6} y={el.y - altoMitad(el) - 6}
            width={(anchoMitad(el) + 6) * 2} height={(altoMitad(el) + 6) * 2}
            fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeDasharray="4 3"
          />
        )}
      </g>
    )
  }
  if (el.tipo === 'porteria') {
    return (
      <g transform={transformRotacion}>
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
  const [colorCampo, setColorCampo] = useState('#1f6b3a')
  const [elementos, setElementos] = useState([])
  const [lineas, setLineas] = useState([])
  const [seleccionId, setSeleccionId] = useState(null)
  const [herramienta, setHerramienta] = useState('mover')
  const [arrastrandoId, setArrastrandoId] = useState(null)
  const [arrastrandoControlId, setArrastrandoControlId] = useState(null)
  const [redimensionandoId, setRedimensionandoId] = useState(null)
  const [arrastrandoLinea, setArrastrandoLinea] = useState(null) // { id, dx0, dy0, original }
  const [dibujando, setDibujando] = useState(false)
  const [lineaTemp, setLineaTemp] = useState(null)
  const [colorNuevoElemento, setColorNuevoElemento] = useState(paletaElementos[0])
  const [tamanoNuevoElemento, setTamanoNuevoElemento] = useState(1)
  const [tipoObstaculoNuevo, setTipoObstaculoNuevo] = useState('cono')
  const [tipoBalonNuevo, setTipoBalonNuevo] = useState('hockey')
  const [figuraNueva, setFiguraNueva] = useState('circulo')
  const [opacidadNuevaForma, setOpacidadNuevaForma] = useState(0.5)
  const [estiloLineaActual, setEstiloLineaActual] = useState({ color: '#f5f5f5', grosor: 3, trazo: 'solida' })

  // --- Captura de fotogramas y grabación del movimiento entre ellos ---
  const [fotogramas, setFotogramas] = useState([]) // [{ elementos, lineas }]
  const [fotogramaActivo, setFotogramaActivo] = useState(null) // índice que se está viendo/corrigiendo, o null
  const [reproduciendoAnimacion, setReproduciendoAnimacion] = useState(false) // vista previa en curso
  const [exportandoAnimacion, setExportandoAnimacion] = useState(false) // grabando el vídeo final
  const detenerReproduccionRef = useRef(false)
  const [videoGenerado, setVideoGenerado] = useState(null) // { blob, url, extension }
  const [panelAnimacionAbierto, setPanelAnimacionAbierto] = useState(false)
  const [mensajeAnimacion, setMensajeAnimacion] = useState(null)
  const estadoAntesDeAnimarRef = useRef(null)

  useEffect(() => {
    setEstiloLineaActual((s) => ({ ...s, color: esColorClaro(colorCampo) ? '#0d1210' : '#f5f5f5' }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [colorCampo])

  // --- Biblioteca de ejercicios de pizarra ---
  const [nombreEjercicio, setNombreEjercicio] = useState('')
  const [descripcionEjercicio, setDescripcionEjercicio] = useState('')
  const [variantesEjercicio, setVariantesEjercicio] = useState('')
  const [etiquetasSeleccionadas, setEtiquetasSeleccionadas] = useState([])
  const [etiquetaInput, setEtiquetaInput] = useState('')
  const [etiquetasDisponibles, setEtiquetasDisponibles] = useState([])
  const [guardandoEjercicio, setGuardandoEjercicio] = useState(false)
  const [mensajeEjercicio, setMensajeEjercicio] = useState(null)
  const [ejerciciosGuardados, setEjerciciosGuardados] = useState([])
  const [borrandoEjercicioId, setBorrandoEjercicioId] = useState(null)
  const [reproduciendoId, setReproduciendoId] = useState(null)

  // --- Editar un ejercicio ya guardado en la biblioteca ---
  const [editandoEjercicio, setEditandoEjercicio] = useState(null) // el objeto completo, o null
  const [edNombre, setEdNombre] = useState('')
  const [edEtiquetas, setEdEtiquetas] = useState([])
  const [edEtiquetaInput, setEdEtiquetaInput] = useState('')
  const [edDescripcion, setEdDescripcion] = useState('')
  const [edVariantes, setEdVariantes] = useState('')
  const [edUrlYoutube, setEdUrlYoutube] = useState('')
  const [edArchivoNuevo, setEdArchivoNuevo] = useState(null) // File, para reemplazar imagen/vídeo
  const [edPreviewArchivo, setEdPreviewArchivo] = useState(null)
  const [guardandoEdicion, setGuardandoEdicion] = useState(false)
  const [mensajeEdicion, setMensajeEdicion] = useState(null)

  // --- Subir ejercicio externo (imagen o YouTube) ---
  const [origenExterno, setOrigenExterno] = useState('imagen') // 'imagen' | 'youtube'
  const [nombreExterno, setNombreExterno] = useState('')
  const [urlYoutubeExterno, setUrlYoutubeExterno] = useState('')
  const [imagenExternaBase64, setImagenExternaBase64] = useState(null)
  const [etiquetasExterno, setEtiquetasExterno] = useState([])
  const [etiquetaExternoInput, setEtiquetaExternoInput] = useState('')
  const [descripcionExterno, setDescripcionExterno] = useState('')
  const [variantesExterno, setVariantesExterno] = useState('')
  const [guardandoExterno, setGuardandoExterno] = useState(false)
  const [mensajeExterno, setMensajeExterno] = useState(null)
  const [buscandoTituloExterno, setBuscandoTituloExterno] = useState(false)

  const youtubeIdExternoPreview = origenExterno === 'youtube' ? extraerYoutubeIdExterno(urlYoutubeExterno) : null

  useEffect(() => {
    if (!youtubeIdExternoPreview) return
    if (nombreExterno.trim()) return // no pisar un nombre ya escrito

    let cancelado = false
    setBuscandoTituloExterno(true)
    fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${youtubeIdExternoPreview}&format=json`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!cancelado && data?.title) setNombreExterno((n) => (n.trim() ? n : data.title))
      })
      .catch(() => {})
      .finally(() => { if (!cancelado) setBuscandoTituloExterno(false) })

    return () => { cancelado = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [youtubeIdExternoPreview])

  useEffect(() => { cargarEjerciciosPizarra() }, [])

  async function cargarEjerciciosPizarra() {
    const { data } = await supabase.from('ejercicios_pizarra').select('*').order('creado_en', { ascending: false })
    setEjerciciosGuardados(data || [])
    const todasEtiquetas = new Set()
    ;(data || []).forEach((ej) => (ej.etiquetas || []).forEach((et) => todasEtiquetas.add(et)))
    setEtiquetasDisponibles([...todasEtiquetas].sort())
  }

  function anadirEtiqueta() {
    const valor = etiquetaInput.trim()
    if (!valor || etiquetasSeleccionadas.includes(valor)) { setEtiquetaInput(''); return }
    setEtiquetasSeleccionadas((prev) => [...prev, valor])
    setEtiquetaInput('')
  }

  function quitarEtiqueta(et) {
    setEtiquetasSeleccionadas((prev) => prev.filter((e) => e !== et))
  }

  function generarImagenBase64() {
    return new Promise((resolve, reject) => {
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
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = reject
      img.src = url
    })
  }

  async function guardarEjercicioPizarra(e) {
    e.preventDefault()
    if (!nombreEjercicio.trim()) {
      setMensajeEjercicio({ tipo: 'error', texto: 'Ponle un nombre al ejercicio.' })
      return
    }
    setGuardandoEjercicio(true)
    setMensajeEjercicio(null)

    const datosComunes = {
      nombre: nombreEjercicio.trim(),
      etiquetas: etiquetasSeleccionadas.length > 0 ? etiquetasSeleccionadas : null,
      descripcion: descripcionEjercicio || null,
      variantes: variantesEjercicio || null,
      fondo,
    }

    try {
      let error
      if (videoGenerado) {
        // Hay un vídeo del movimiento ya exportado: se guarda ESE vídeo, no una imagen estática.
        const nombreArchivo = `${Date.now()}-${idNuevo()}.${videoGenerado.extension}`
        const { error: errorSubida } = await supabase.storage
          .from('videos-pizarra')
          .upload(nombreArchivo, videoGenerado.blob, { contentType: videoGenerado.blob.type })
        if (errorSubida) {
          setMensajeEjercicio({ tipo: 'error', texto: 'No se pudo subir el vídeo. Inténtalo de nuevo.' })
          setGuardandoEjercicio(false)
          return
        }
        const { data: urlPublica } = supabase.storage.from('videos-pizarra').getPublicUrl(nombreArchivo)
        ;({ error } = await supabase.from('ejercicios_pizarra').insert({
          ...datosComunes,
          tipo_origen: 'video_grabado',
          video_url: urlPublica.publicUrl,
        }))
      } else {
        const imagen = await generarImagenBase64()
        ;({ error } = await supabase.from('ejercicios_pizarra').insert({
          ...datosComunes,
          tipo_origen: 'pizarra',
          imagen_base64: imagen,
        }))
      }

      if (error) {
        setMensajeEjercicio({ tipo: 'error', texto: 'No se pudo guardar el ejercicio.' })
      } else {
        setMensajeEjercicio({ tipo: 'ok', texto: videoGenerado ? 'Vídeo guardado en la biblioteca.' : 'Ejercicio guardado en la biblioteca.' })
        setNombreEjercicio('')
        setDescripcionEjercicio('')
        setVariantesEjercicio('')
        setEtiquetasSeleccionadas([])
        setVideoGenerado(null)
        cargarEjerciciosPizarra()
      }
    } catch {
      setMensajeEjercicio({ tipo: 'error', texto: 'No se pudo generar el archivo del ejercicio.' })
    }
    setGuardandoEjercicio(false)
  }

  async function eliminarEjercicioPizarra(id) {
    if (!window.confirm('¿Eliminar este ejercicio de la biblioteca?')) return
    setBorrandoEjercicioId(id)
    const ejercicio = ejerciciosGuardados.find((ej) => ej.id === id)
    if (ejercicio?.tipo_origen === 'video_grabado' && ejercicio.video_url) {
      const nombreArchivo = ejercicio.video_url.split('/videos-pizarra/')[1]
      if (nombreArchivo) await supabase.storage.from('videos-pizarra').remove([nombreArchivo])
    }
    const { error } = await supabase.from('ejercicios_pizarra').delete().eq('id', id)
    if (!error) setEjerciciosGuardados((prev) => prev.filter((ej) => ej.id !== id))
    setBorrandoEjercicioId(null)
  }

  function empezarEdicionEjercicio(ej) {
    setEditandoEjercicio(ej)
    setEdNombre(ej.nombre)
    setEdEtiquetas(ej.etiquetas || [])
    setEdEtiquetaInput('')
    setEdDescripcion(ej.descripcion || '')
    setEdVariantes(ej.variantes || '')
    setEdUrlYoutube(ej.url_youtube || '')
    setEdArchivoNuevo(null)
    setEdPreviewArchivo(null)
    setMensajeEdicion(null)
  }

  function cerrarEdicionEjercicio() {
    setEditandoEjercicio(null)
    setEdArchivoNuevo(null)
    setEdPreviewArchivo(null)
  }

  function anadirEtiquetaEdicion() {
    const valor = edEtiquetaInput.trim()
    if (!valor || edEtiquetas.includes(valor)) { setEdEtiquetaInput(''); return }
    setEdEtiquetas((prev) => [...prev, valor])
    setEdEtiquetaInput('')
  }

  function quitarEtiquetaEdicion(et) {
    setEdEtiquetas((prev) => prev.filter((e) => e !== et))
  }

  function elegirArchivoReemplazo(archivo) {
    if (!archivo) return
    setMensajeEdicion(null)
    const esVideo = editandoEjercicio?.tipo_origen === 'video_grabado'
    if (esVideo && !archivo.type.startsWith('video/')) {
      setMensajeEdicion({ tipo: 'error', texto: 'El archivo debe ser un vídeo.' })
      return
    }
    if (!esVideo && !archivo.type.startsWith('image/')) {
      setMensajeEdicion({ tipo: 'error', texto: 'El archivo debe ser una imagen.' })
      return
    }
    setEdArchivoNuevo(archivo)
    setEdPreviewArchivo(URL.createObjectURL(archivo))
  }

  async function guardarEdicionEjercicio(e) {
    e.preventDefault()
    if (!edNombre.trim()) {
      setMensajeEdicion({ tipo: 'error', texto: 'Ponle un nombre al ejercicio.' })
      return
    }
    setGuardandoEdicion(true)
    setMensajeEdicion(null)

    const cambios = {
      nombre: edNombre.trim(),
      etiquetas: edEtiquetas.length > 0 ? edEtiquetas : null,
      descripcion: edDescripcion || null,
      variantes: edVariantes || null,
    }

    if (editandoEjercicio.tipo_origen === 'youtube') {
      const nuevoId = extraerYoutubeIdExterno(edUrlYoutube)
      if (edUrlYoutube.trim() && !nuevoId) {
        setMensajeEdicion({ tipo: 'error', texto: 'No reconozco ese enlace de YouTube.' })
        setGuardandoEdicion(false)
        return
      }
      if (nuevoId) {
        cambios.youtube_id = nuevoId
        cambios.url_youtube = edUrlYoutube.trim()
      }
    } else if (editandoEjercicio.tipo_origen === 'video_grabado' && edArchivoNuevo) {
      const nombreArchivo = `${Date.now()}-${idNuevo()}.${edArchivoNuevo.name.split('.').pop() || 'webm'}`
      const { error: errorSubida } = await supabase.storage
        .from('videos-pizarra')
        .upload(nombreArchivo, edArchivoNuevo, { contentType: edArchivoNuevo.type })
      if (errorSubida) {
        setMensajeEdicion({ tipo: 'error', texto: 'No se pudo subir el nuevo vídeo.' })
        setGuardandoEdicion(false)
        return
      }
      if (editandoEjercicio.video_url) {
        const antiguo = editandoEjercicio.video_url.split('/videos-pizarra/')[1]
        if (antiguo) await supabase.storage.from('videos-pizarra').remove([antiguo])
      }
      const { data: urlPublica } = supabase.storage.from('videos-pizarra').getPublicUrl(nombreArchivo)
      cambios.video_url = urlPublica.publicUrl
    } else if (edArchivoNuevo) {
      // pizarra o imagen: se reemplaza el base64 directamente
      const base64 = await new Promise((resolve, reject) => {
        const lector = new FileReader()
        lector.onload = () => resolve(lector.result)
        lector.onerror = reject
        lector.readAsDataURL(edArchivoNuevo)
      })
      cambios.imagen_base64 = base64
      cambios.tipo_origen = 'imagen'
    }

    const { error } = await supabase.from('ejercicios_pizarra').update(cambios).eq('id', editandoEjercicio.id)
    if (error) {
      setMensajeEdicion({ tipo: 'error', texto: 'No se pudo guardar los cambios.' })
    } else {
      cerrarEdicionEjercicio()
      cargarEjerciciosPizarra()
    }
    setGuardandoEdicion(false)
  }

  function extraerYoutubeIdExterno(url) {
    const patronesUrl = [
      /youtu\.be\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
      /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    ]
    for (const p of patronesUrl) {
      const m = url.match(p)
      if (m) return m[1]
    }
    return null
  }

  function subirImagenExterna(archivo) {
    if (!archivo) return
    setMensajeExterno(null)
    if (!archivo.type.startsWith('image/')) {
      setMensajeExterno({ tipo: 'error', texto: 'El archivo debe ser una imagen.' })
      return
    }
    if (archivo.size > 2 * 1024 * 1024) {
      setMensajeExterno({ tipo: 'error', texto: 'La imagen es demasiado grande (máximo 2 MB).' })
      return
    }
    const lector = new FileReader()
    lector.onload = () => setImagenExternaBase64(lector.result)
    lector.onerror = () => setMensajeExterno({ tipo: 'error', texto: 'No se pudo leer la imagen.' })
    lector.readAsDataURL(archivo)
  }

  function anadirEtiquetaExterno() {
    const valor = etiquetaExternoInput.trim()
    if (!valor || etiquetasExterno.includes(valor)) { setEtiquetaExternoInput(''); return }
    setEtiquetasExterno((prev) => [...prev, valor])
    setEtiquetaExternoInput('')
  }

  function quitarEtiquetaExterno(et) {
    setEtiquetasExterno((prev) => prev.filter((e) => e !== et))
  }

  async function guardarEjercicioExterno(e) {
    e.preventDefault()
    if (!nombreExterno.trim()) {
      setMensajeExterno({ tipo: 'error', texto: 'Ponle un nombre al ejercicio.' })
      return
    }
    let youtubeId = null
    if (origenExterno === 'youtube') {
      youtubeId = extraerYoutubeIdExterno(urlYoutubeExterno)
      if (!youtubeId) {
        setMensajeExterno({ tipo: 'error', texto: 'No reconozco ese enlace de YouTube.' })
        return
      }
    } else if (!imagenExternaBase64) {
      setMensajeExterno({ tipo: 'error', texto: 'Sube una imagen primero.' })
      return
    }

    setGuardandoExterno(true)
    setMensajeExterno(null)
    const { error } = await supabase.from('ejercicios_pizarra').insert({
      nombre: nombreExterno.trim(),
      etiquetas: etiquetasExterno.length > 0 ? etiquetasExterno : null,
      descripcion: descripcionExterno || null,
      variantes: variantesExterno || null,
      imagen_base64: origenExterno === 'imagen' ? imagenExternaBase64 : null,
      tipo_origen: origenExterno,
      youtube_id: origenExterno === 'youtube' ? youtubeId : null,
      url_youtube: origenExterno === 'youtube' ? urlYoutubeExterno.trim() : null,
    })

    if (error) {
      setMensajeExterno({ tipo: 'error', texto: 'No se pudo guardar el ejercicio.' })
    } else {
      setMensajeExterno({ tipo: 'ok', texto: 'Ejercicio añadido a la biblioteca.' })
      setNombreExterno('')
      setUrlYoutubeExterno('')
      setImagenExternaBase64(null)
      setEtiquetasExterno([])
      setDescripcionExterno('')
      setVariantesExterno('')
      cargarEjerciciosPizarra()
    }
    setGuardandoExterno(false)
  }

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
    } else if (tipo === 'cono' || tipo === 'valla' || tipo === 'bidon') {
      base.color = colorNuevoElemento
      base.tamano = tamanoNuevoElemento
    } else if (tipo === 'porteria') {
      base.tamano = tamanoNuevoElemento
    } else if (tipo === 'balon') {
      base.variante = tipoBalonNuevo
    } else if (tipo === 'forma') {
      base.figura = figuraNueva
      base.color = colorNuevoElemento
      base.tamano = tamanoNuevoElemento
      base.opacidad = opacidadNuevaForma
    } else if (tipo === 'texto') {
      base.contenido = 'Texto'
      base.color = colorNuevoElemento
      base.tamanoFuente = 18
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

  function iniciarRedimension(id, e) {
    e.stopPropagation()
    setSeleccionId(id)
    setRedimensionandoId(id)
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
    if (redimensionandoId) {
      const { x, y } = coordsSVG(e)
      setElementos((prev) => prev.map((el) => {
        if (el.id !== redimensionandoId) return el
        if (el.figura === 'libre') {
          const nuevoAncho = Math.max(20, Math.abs(x - el.x) * 2)
          const nuevoAlto = Math.max(20, Math.abs(y - el.y) * 2)
          return { ...el, anchoLibre: nuevoAncho, altoLibre: nuevoAlto }
        }
        const distancia = Math.hypot(x - el.x, y - el.y)
        const nuevoTamano = Math.max(0.2, distancia / (radioBaseForma[el.figura] * Math.SQRT2))
        return { ...el, tamano: nuevoTamano }
      }))
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
    if (redimensionandoId) setRedimensionandoId(null)
    if (arrastrandoLinea) setArrastrandoLinea(null)

    if (dibujando && lineaTemp) {
      if (herramienta === 'lapiz') {
        if (lineaTemp.puntos.length > 1) {
          setLineas((prev) => [...prev, { ...lineaTemp, id: idNuevo() }])
        }
      } else if (herramienta === 'rectangulo_libre') {
        const ancho = Math.abs(lineaTemp.x2 - lineaTemp.x1)
        const alto = Math.abs(lineaTemp.y2 - lineaTemp.y1)
        if (ancho > 8 && alto > 8) {
          const nuevaForma = {
            id: idNuevo(), tipo: 'forma', figura: 'libre',
            x: (lineaTemp.x1 + lineaTemp.x2) / 2, y: (lineaTemp.y1 + lineaTemp.y2) / 2,
            anchoLibre: ancho, altoLibre: alto,
            color: colorNuevoElemento, opacidad: opacidadNuevaForma,
          }
          setElementos((prev) => [...prev, nuevaForma])
          setSeleccionId(nuevaForma.id)
          setHerramienta('mover')
        }
        setLineaTemp(null)
        setDibujando(false)
        return
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
    } else if (herramienta === 'rectangulo_libre') {
      setLineaTemp({ x1: x, y1: y, x2: x, y2: y })
    } else if (herramienta === 'flecha_curva') {
      setLineaTemp({ tipo: 'curva', x1: x, y1: y, x2: x, y2: y, cx: x, cy: y, color: estiloLineaActual.color, grosor: estiloLineaActual.grosor, trazo: estiloLineaActual.trazo })
    } else if (herramienta === 'linea_recta') {
      setLineaTemp({ tipo: 'recta', conFlecha: false, x1: x, y1: y, x2: x, y2: y, color: estiloLineaActual.color, grosor: estiloLineaActual.grosor, trazo: estiloLineaActual.trazo })
    } else {
      setLineaTemp({ tipo: 'recta', conFlecha: true, x1: x, y1: y, x2: x, y2: y, color: estiloLineaActual.color, grosor: estiloLineaActual.grosor, trazo: estiloLineaActual.trazo })
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
        enlace.download = `pizarra-tactica-${hoyISOLocal()}.png`
        enlace.href = URL.createObjectURL(blob)
        enlace.click()
      })
    }
    img.src = url
  }

  // "Capturar" SIEMPRE añade un fotograma nuevo al final — nunca sobrescribe.
  function capturarFotograma() {
    const nuevo = { elementos: JSON.parse(JSON.stringify(elementos)), lineas: JSON.parse(JSON.stringify(lineas)) }
    setFotogramas((prev) => [...prev, nuevo])
    setFotogramaActivo(null)
    setMensajeAnimacion(null)
  }

  function irAFotograma(indice) {
    if (indice < 0 || indice >= fotogramas.length) return
    setFotogramaActivo(indice)
    setElementos(JSON.parse(JSON.stringify(fotogramas[indice].elementos)))
    setLineas(JSON.parse(JSON.stringify(fotogramas[indice].lineas)))
    setSeleccionId(null)
  }

  // Acción aparte y explícita: guarda los cambios hechos SOBRE el fotograma
  // que se está viendo ahora mismo (para corregir un error de posición).
  function guardarCambiosFotogramaActivo() {
    if (fotogramaActivo === null) return
    const actualizado = { elementos: JSON.parse(JSON.stringify(elementos)), lineas: JSON.parse(JSON.stringify(lineas)) }
    setFotogramas((prev) => prev.map((f, i) => (i === fotogramaActivo ? actualizado : f)))
    setMensajeAnimacion(null)
  }

  function eliminarFotograma(indice) {
    setFotogramas((prev) => prev.filter((_, i) => i !== indice))
    if (fotogramaActivo === indice) setFotogramaActivo(null)
    else if (fotogramaActivo !== null && indice < fotogramaActivo) setFotogramaActivo((f) => f - 1)
  }

  function vaciarFotogramas() {
    if (!window.confirm('¿Borrar todos los fotogramas capturados?')) return
    setFotogramas([])
    setFotogramaActivo(null)
  }

  // Mezcla la posición (y tamaño/rotación) de los elementos que existen en
  // ambos fotogramas, a mitad de camino según "t" (0 = fotograma A, 1 = fotograma B).
  function interpolarElementos(elementosA, elementosB, t) {
    const mapaB = Object.fromEntries(elementosB.map((el) => [el.id, el]))
    return elementosA
      .filter((elA) => mapaB[elA.id])
      .map((elA) => {
        const elB = mapaB[elA.id]
        return {
          ...elA,
          x: elA.x + (elB.x - elA.x) * t,
          y: elA.y + (elB.y - elA.y) * t,
          rotacion: (elA.rotacion || 0) + ((elB.rotacion || 0) - (elA.rotacion || 0)) * t,
          tamano: (elA.tamano || 1) + ((elB.tamano || 1) - (elA.tamano || 1)) * t,
        }
      })
  }

  function esperarPintado() {
    return new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)))
  }

  function esperar(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  async function dibujarSvgActualEnCanvas(ctx) {
    const svg = svgRef.current
    const serializer = new XMLSerializer()
    const svgString = serializer.serializeToString(svg)
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)
    await new Promise((resolve, reject) => {
      const img = new Image()
      img.onload = () => {
        ctx.drawImage(img, 0, 0, ANCHO, ALTO)
        URL.revokeObjectURL(url)
        resolve()
      }
      img.onerror = reject
      img.src = url
    })
  }

  function elegirMimeTypeVideo() {
    if (typeof MediaRecorder === 'undefined') return null
    if (MediaRecorder.isTypeSupported('video/mp4')) return 'video/mp4'
    if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) return 'video/webm;codecs=vp9'
    if (MediaRecorder.isTypeSupported('video/webm')) return 'video/webm'
    return null
  }

  // Recorre todos los fotogramas interpolando el movimiento entre cada par
  // consecutivo — actualiza el propio estado de la pizarra en vivo. Si se le
  // pasa un contexto de lienzo de grabación, también dibuja cada paso ahí
  // (usado tanto para la vista previa como para exportar, sin duplicar lógica).
  async function recorrerFotogramas({ ctxGrabacion = null } = {}) {
    const fps = 30
    const duracionTramoMs = 1200
    const pasosPorTramo = Math.round(duracionTramoMs / (1000 / fps))

    for (let indiceTramo = 0; indiceTramo < fotogramas.length - 1; indiceTramo++) {
      if (detenerReproduccionRef.current) break
      const frameA = fotogramas[indiceTramo]
      const frameB = fotogramas[indiceTramo + 1]
      setLineas(frameA.lineas)
      for (let paso = 0; paso <= pasosPorTramo; paso++) {
        if (detenerReproduccionRef.current) break
        const t = paso / pasosPorTramo
        setElementos(t >= 1 ? frameB.elementos : interpolarElementos(frameA.elementos, frameB.elementos, t))
        await esperarPintado()
        if (ctxGrabacion) await dibujarSvgActualEnCanvas(ctxGrabacion)
        await esperar(1000 / fps)
      }
    }
    if (!detenerReproduccionRef.current) {
      const ultimo = fotogramas[fotogramas.length - 1]
      setElementos(ultimo.elementos)
      setLineas(ultimo.lineas)
    }
  }

  // Vista previa: reproduce la secuencia en la propia pizarra, sin grabar nada.
  async function alternarReproduccion() {
    if (reproduciendoAnimacion) {
      detenerReproduccionRef.current = true
      return
    }
    if (fotogramas.length < 2) {
      setMensajeAnimacion('Captura al menos 2 fotogramas para poder reproducir la secuencia.')
      return
    }
    setMensajeAnimacion(null)
    estadoAntesDeAnimarRef.current = { elementos, lineas }
    setFotogramaActivo(null)
    detenerReproduccionRef.current = false
    setReproduciendoAnimacion(true)
    await recorrerFotogramas()
    setReproduciendoAnimacion(false)
  }

  async function generarVideoAnimacion() {
    if (fotogramas.length < 2) {
      setMensajeAnimacion('Captura al menos 2 fotogramas para poder exportar la secuencia.')
      return
    }
    const mimeType = elegirMimeTypeVideo()
    if (!mimeType) {
      setMensajeAnimacion('Tu navegador no permite grabar vídeo.')
      return
    }
    setMensajeAnimacion(null)
    setVideoGenerado(null)

    const canvasGrabacion = document.createElement('canvas')
    canvasGrabacion.width = ANCHO
    canvasGrabacion.height = ALTO
    const ctx = canvasGrabacion.getContext('2d')
    const streamCanvas = canvasGrabacion.captureStream(30)
    const grabador = new MediaRecorder(streamCanvas, { mimeType })
    const trozos = []
    grabador.ondataavailable = (e) => { if (e.data.size > 0) trozos.push(e.data) }

    const promesaFinal = new Promise((resolveGrabacion) => {
      grabador.onstop = () => {
        const blob = new Blob(trozos, { type: mimeType })
        resolveGrabacion(blob)
      }
    })

    estadoAntesDeAnimarRef.current = { elementos, lineas }
    setFotogramaActivo(null)
    detenerReproduccionRef.current = false
    setExportandoAnimacion(true)
    grabador.start()

    await recorrerFotogramas({ ctxGrabacion: ctx })

    grabador.stop()
    const blobFinal = await promesaFinal
    setExportandoAnimacion(false)

    if (estadoAntesDeAnimarRef.current) {
      setElementos(estadoAntesDeAnimarRef.current.elementos)
      setLineas(estadoAntesDeAnimarRef.current.lineas)
    }

    const extension = mimeType.startsWith('video/mp4') ? 'mp4' : 'webm'
    setVideoGenerado({ blob: blobFinal, url: URL.createObjectURL(blobFinal), extension })
  }

  function descargarVideoGenerado() {
    if (!videoGenerado) return
    const enlace = document.createElement('a')
    enlace.href = videoGenerado.url
    enlace.download = `pizarra-movimiento-${hoyISOLocal()}.${videoGenerado.extension}`
    enlace.click()
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
        <input
          type="color" value={colorCampo} onChange={(e) => setColorCampo(e.target.value)}
          className="pizarra-color-select" title="Color del campo"
        />

        <div className="pizarra-separador" />

        <button className="pizarra-boton" onClick={() => anadirElemento('jugador')}>+ Jugador</button>
        <select value={tipoObstaculoNuevo} onChange={(e) => setTipoObstaculoNuevo(e.target.value)}>
          {['cono', 'valla', 'bidon'].map((t) => <option key={t} value={t}>{etiquetaObstaculo[t]}</option>)}
        </select>
        <button className="pizarra-boton" onClick={() => anadirElemento(tipoObstaculoNuevo)}>+ Añadir</button>
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

        <select value={figuraNueva} onChange={(e) => setFiguraNueva(e.target.value)}>
          {tiposForma.map((f) => <option key={f} value={f}>{etiquetaForma[f]}</option>)}
        </select>
        <label className="pizarra-linea-campo">
          <span>Opacidad</span>
          <input type="range" min="0.1" max="1" step="0.1" value={opacidadNuevaForma} onChange={(e) => setOpacidadNuevaForma(Number(e.target.value))} />
        </label>
        <button className="pizarra-boton" onClick={() => anadirElemento('forma')}>+ Forma</button>
        <button className="pizarra-boton" onClick={() => anadirElemento('texto')}>+ Texto</button>
        <button
          className={`pizarra-boton ${herramienta === 'rectangulo_libre' ? 'pizarra-boton-activo' : ''}`}
          onClick={() => setHerramienta('rectangulo_libre')}
        >
          ▭ Rectángulo libre
        </button>

        <div className="pizarra-separador" />

        <button className={`pizarra-boton ${herramienta === 'mover' ? 'pizarra-boton-activo' : ''}`} onClick={() => setHerramienta('mover')}>✥ Mover</button>
        <button className={`pizarra-boton ${herramienta === 'flecha_recta' ? 'pizarra-boton-activo' : ''}`} onClick={() => setHerramienta('flecha_recta')}>↗ Flecha recta</button>
        <button className={`pizarra-boton ${herramienta === 'linea_recta' ? 'pizarra-boton-activo' : ''}`} onClick={() => setHerramienta('linea_recta')}>— Línea recta</button>
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

      <section className="pizarra-animacion-card">
        <button
          type="button" className="pizarra-animacion-cabecera pizarra-animacion-cabecera-boton"
          onClick={() => setPanelAnimacionAbierto((a) => !a)}
          title="Captura fotogramas de las posiciones y genera un vídeo animado del movimiento"
        >
          <h3>
            🎬 Movimiento de jugadores
            {fotogramas.length > 0 && <span className="pizarra-animacion-contador-mini">{fotogramas.length} fotograma(s)</span>}
          </h3>
          <span className="pizarra-animacion-plegar">{panelAnimacionAbierto ? '▲ Ocultar' : '▼ Mostrar'}</span>
        </button>

        {panelAnimacionAbierto && (
          <div className="pizarra-animacion-toolbar">
            <button className="pizarra-boton" onClick={capturarFotograma} disabled={reproduciendoAnimacion || exportandoAnimacion}>
              📷 Capturar
            </button>

            <div className="pizarra-separador" />

            <button
              type="button" className="pizarra-boton"
              disabled={fotogramas.length === 0 || (fotogramaActivo ?? 0) <= 0 || reproduciendoAnimacion || exportandoAnimacion}
              onClick={() => irAFotograma((fotogramaActivo ?? 0) - 1)}
            >
              ◀
            </button>
            <span className="pizarra-fotograma-contador">
              {fotogramaActivo !== null ? `${fotogramaActivo + 1} / ${fotogramas.length}` : `${fotogramas.length} fotograma(s)`}
            </span>
            <button
              type="button" className="pizarra-boton"
              disabled={fotogramas.length === 0 || (fotogramaActivo ?? -1) >= fotogramas.length - 1 || reproduciendoAnimacion || exportandoAnimacion}
              onClick={() => irAFotograma((fotogramaActivo ?? -1) + 1)}
            >
              ▶
            </button>
            {fotogramaActivo !== null && (
              <>
                <button className="pizarra-boton" onClick={guardarCambiosFotogramaActivo} disabled={reproduciendoAnimacion || exportandoAnimacion} title="Guardar los cambios en este fotograma">
                  💾
                </button>
                <button
                  className="pizarra-boton" onClick={() => eliminarFotograma(fotogramaActivo)} disabled={reproduciendoAnimacion || exportandoAnimacion}
                  title="Eliminar este fotograma"
                >
                  🗑
                </button>
              </>
            )}

            <div className="pizarra-separador" />

            <button
              className="pizarra-boton" onClick={alternarReproduccion}
              disabled={fotogramas.length < 2 || exportandoAnimacion}
            >
              {reproduciendoAnimacion ? '⏸ Pausa' : '▶ Reproducir'}
            </button>
            <button
              className="btn-principal" onClick={generarVideoAnimacion}
              disabled={fotogramas.length < 2 || reproduciendoAnimacion || exportandoAnimacion}
            >
              {exportandoAnimacion ? '⏺ Exportando…' : '⬇ Exportar'}
            </button>

            {fotogramas.length > 0 && (
              <button className="pizarra-boton" onClick={vaciarFotogramas} disabled={reproduciendoAnimacion || exportandoAnimacion}>
                Vaciar
              </button>
            )}
          </div>
        )}

        {mensajeAnimacion && <div className="aviso-error">{mensajeAnimacion}</div>}

        {videoGenerado && (
          <div className="pizarra-video-generado">
            <video src={videoGenerado.url} controls loop className="pizarra-video-preview" />
            <div className="pizarra-video-botones">
              <button className="pizarra-boton" onClick={descargarVideoGenerado}>⬇ Descargar</button>
              <button className="pizarra-boton" onClick={() => setVideoGenerado(null)}>Descartar</button>
            </div>
            <p className="texto-faint pizarra-video-nota">
              Rellena el formulario "Guardar este ejercicio en la biblioteca" de más abajo y pulsa
              guardar — como hay un vídeo generado, se guardará este vídeo en vez de una imagen.
            </p>
          </div>
        )}
      </section>

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
          <rect x="0" y="0" width={ANCHO} height={ALTO} fill={colorCampo} />
          <FondoCampo fondo={fondo} colorCampo={colorCampo} />

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
                    markerEnd={l.conFlecha === false ? undefined : `url(#flecha-${slugColor(l.color)})`}
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

          {lineaTemp && herramienta === 'rectangulo_libre' && (
            <rect
              x={Math.min(lineaTemp.x1, lineaTemp.x2)} y={Math.min(lineaTemp.y1, lineaTemp.y2)}
              width={Math.abs(lineaTemp.x2 - lineaTemp.x1)} height={Math.abs(lineaTemp.y2 - lineaTemp.y1)}
              fill={colorNuevoElemento} fillOpacity={opacidadNuevaForma} stroke={colorNuevoElemento} strokeDasharray="6 4"
            />
          )}
          {lineaTemp && herramienta !== 'mover' && herramienta !== 'rectangulo_libre' && (
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

          {seleccionId && herramienta === 'mover' && (() => {
            const el = elementos.find((e) => e.id === seleccionId)
            if (!el || el.tipo !== 'forma') return null
            const hx = el.x + anchoMitad(el)
            const hy = el.y + altoMitad(el)
            return (
              <rect
                x={hx - 6} y={hy - 6} width="12" height="12" fill="var(--accent)" stroke="#0d1210" strokeWidth="1.5"
                style={{ cursor: 'nwse-resize' }}
                onPointerDown={(e) => iniciarRedimension(el.id, e)}
              />
            )
          })()}
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
              <h4>{etiquetaObstaculo[seleccionado.tipo]}</h4>
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
              <label className="campo-sesion">
                <span>Rotación ({seleccionado.rotacion || 0}°)</span>
                <input
                  type="range" min="0" max="350" step="10" value={seleccionado.rotacion || 0}
                  onChange={(e) => actualizarSeleccionado({ rotacion: Number(e.target.value) })}
                />
              </label>
              <button className="btn-eliminar-sesion" onClick={eliminarSeleccionado}>Eliminar</button>
            </>
          ) : seleccionado.tipo === 'forma' ? (
            <>
              <h4>Forma</h4>
              {seleccionado.figura !== 'libre' && (
                <label className="campo-sesion">
                  <span>Figura</span>
                  <select value={seleccionado.figura} onChange={(e) => actualizarSeleccionado({ figura: e.target.value })}>
                    {tiposForma.map((f) => <option key={f} value={f}>{etiquetaForma[f]}</option>)}
                  </select>
                </label>
              )}
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
              {seleccionado.figura === 'libre' ? (
                <div className="fila-doble">
                  <label className="campo-sesion">
                    <span>Ancho</span>
                    <input
                      type="number" min="20" value={Math.round(seleccionado.anchoLibre || 100)}
                      onChange={(e) => actualizarSeleccionado({ anchoLibre: Number(e.target.value) })}
                    />
                  </label>
                  <label className="campo-sesion">
                    <span>Alto</span>
                    <input
                      type="number" min="20" value={Math.round(seleccionado.altoLibre || 100)}
                      onChange={(e) => actualizarSeleccionado({ altoLibre: Number(e.target.value) })}
                    />
                  </label>
                </div>
              ) : (
                <label className="campo-sesion">
                  <span>Tamaño</span>
                  <input
                    type="range" min="0.3" max="10" step="0.1" value={seleccionado.tamano || 1}
                    onChange={(e) => actualizarSeleccionado({ tamano: Number(e.target.value) })}
                  />
                </label>
              )}
              <p className="texto-faint">También puedes arrastrar el tirador verde de la esquina para redimensionar sin límite.</p>
              <label className="campo-sesion">
                <span>Opacidad ({Math.round((seleccionado.opacidad ?? 0.5) * 100)}%)</span>
                <input
                  type="range" min="0.1" max="1" step="0.05" value={seleccionado.opacidad ?? 0.5}
                  onChange={(e) => actualizarSeleccionado({ opacidad: Number(e.target.value) })}
                />
              </label>
              <label className="campo-sesion">
                <span>Rotación ({seleccionado.rotacion || 0}°)</span>
                <input
                  type="range" min="0" max="350" step="10" value={seleccionado.rotacion || 0}
                  onChange={(e) => actualizarSeleccionado({ rotacion: Number(e.target.value) })}
                />
              </label>
              <button className="btn-eliminar-sesion" onClick={eliminarSeleccionado}>Eliminar</button>
            </>
          ) : seleccionado.tipo === 'texto' ? (
            <>
              <h4>Texto</h4>
              <label className="campo-sesion">
                <span>Contenido</span>
                <textarea
                  value={seleccionado.contenido} rows={3}
                  onChange={(e) => actualizarSeleccionado({ contenido: e.target.value })}
                  placeholder="Escribe aquí…"
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
              <label className="campo-sesion">
                <span>Tamaño de letra ({seleccionado.tamanoFuente || 18}px)</span>
                <input
                  type="range" min="10" max="48" step="1" value={seleccionado.tamanoFuente || 18}
                  onChange={(e) => actualizarSeleccionado({ tamanoFuente: Number(e.target.value) })}
                />
              </label>
              <label className="campo-sesion">
                <span>Rotación ({seleccionado.rotacion || 0}°)</span>
                <input
                  type="range" min="0" max="350" step="10" value={seleccionado.rotacion || 0}
                  onChange={(e) => actualizarSeleccionado({ rotacion: Number(e.target.value) })}
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

      <section className="pizarra-ejercicio-card">
        <h3>{videoGenerado ? 'Guardar este vídeo en la biblioteca' : 'Guardar este ejercicio en la biblioteca'}</h3>
        {videoGenerado && (
          <p className="texto-dim pizarra-ejercicio-nota">
            Hay un vídeo del movimiento generado — se guardará ese vídeo en vez de una imagen de la pizarra.
          </p>
        )}
        <form onSubmit={guardarEjercicioPizarra}>
          <label className="campo-sesion">
            <span>Nombre del ejercicio</span>
            <input
              type="text" value={nombreEjercicio} onChange={(e) => setNombreEjercicio(e.target.value)}
              placeholder="Ej. Superioridad 3x2 en espacio reducido" required
            />
          </label>

          <label className="campo-sesion">
            <span>Etiquetas</span>
            <div className="pizarra-etiquetas-entrada">
              <input
                type="text" list="pizarra-etiquetas-disponibles" value={etiquetaInput}
                onChange={(e) => setEtiquetaInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); anadirEtiqueta() } }}
                placeholder="Escribe una etiqueta y pulsa Enter…"
              />
              <datalist id="pizarra-etiquetas-disponibles">
                {etiquetasDisponibles.map((et) => <option key={et} value={et} />)}
              </datalist>
              <button type="button" className="pizarra-boton" onClick={anadirEtiqueta}>+ Añadir</button>
            </div>
            {etiquetasDisponibles.filter((et) => !etiquetasSeleccionadas.includes(et)).length > 0 && (
              <div className="pizarra-etiquetas-sugeridas">
                {etiquetasDisponibles.filter((et) => !etiquetasSeleccionadas.includes(et)).map((et) => (
                  <button
                    key={et} type="button" className="pizarra-etiqueta-sugerida"
                    onClick={() => setEtiquetasSeleccionadas((prev) => [...prev, et])}
                  >
                    {et}
                  </button>
                ))}
              </div>
            )}
            {etiquetasSeleccionadas.length > 0 && (
              <div className="pizarra-etiquetas-chips">
                {etiquetasSeleccionadas.map((et) => (
                  <span key={et} className="pizarra-etiqueta-chip">
                    {et}
                    <button type="button" onClick={() => quitarEtiqueta(et)}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </label>

          <label className="campo-sesion">
            <span>Descripción del ejercicio</span>
            <textarea
              value={descripcionEjercicio} onChange={(e) => setDescripcionEjercicio(e.target.value)}
              rows={3} placeholder="Explica en qué consiste, objetivo, consignas…"
            />
          </label>

          <label className="campo-sesion">
            <span>Posibles variantes</span>
            <textarea
              value={variantesEjercicio} onChange={(e) => setVariantesEjercicio(e.target.value)}
              rows={2} placeholder="Ej. Reducir espacio, añadir un comodín, limitar toques…"
            />
          </label>

          {mensajeEjercicio && (
            <div className={mensajeEjercicio.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensajeEjercicio.texto}</div>
          )}

          <button type="submit" className="btn-principal" disabled={guardandoEjercicio}>
            {guardandoEjercicio ? 'Guardando…' : videoGenerado ? '+ Guardar vídeo en la biblioteca' : '+ Guardar ejercicio en la biblioteca'}
          </button>
        </form>
      </section>

      <section className="pizarra-ejercicio-card">
        <h3>Subir un ejercicio externo</h3>
        <p className="texto-dim pizarra-ejercicio-nota">
          Para material que no viene de la pizarra — una imagen de otra fuente, o un vídeo de YouTube.
        </p>
        <div className="pizarra-toolbar pizarra-toolbar-origen">
          <button
            type="button" className={`pizarra-boton ${origenExterno === 'imagen' ? 'pizarra-boton-activo' : ''}`}
            onClick={() => setOrigenExterno('imagen')}
          >
            🖼 Imagen
          </button>
          <button
            type="button" className={`pizarra-boton ${origenExterno === 'youtube' ? 'pizarra-boton-activo' : ''}`}
            onClick={() => setOrigenExterno('youtube')}
          >
            ▶ YouTube
          </button>
        </div>

        <form onSubmit={guardarEjercicioExterno}>
          <label className="campo-sesion">
            <span>Nombre del ejercicio {buscandoTituloExterno && <span className="texto-dim">(buscando título del vídeo…)</span>}</span>
            <input type="text" value={nombreExterno} onChange={(e) => setNombreExterno(e.target.value)} placeholder="Ej. Rondo 4v2" required />
          </label>

          {origenExterno === 'imagen' ? (
            <label className="campo-sesion">
              <span>Imagen (máx. 2 MB)</span>
              <input type="file" accept="image/*" onChange={(e) => subirImagenExterna(e.target.files?.[0])} />
              {imagenExternaBase64 && (
                <img src={imagenExternaBase64} alt="Vista previa" className="pizarra-preview-externa" />
              )}
            </label>
          ) : (
            <label className="campo-sesion">
              <span>Enlace de YouTube</span>
              <input type="text" value={urlYoutubeExterno} onChange={(e) => setUrlYoutubeExterno(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
              {youtubeIdExternoPreview && (
                <img src={`https://img.youtube.com/vi/${youtubeIdExternoPreview}/mqdefault.jpg`} alt="Vista previa" className="pizarra-preview-externa" />
              )}
            </label>
          )}

          <label className="campo-sesion">
            <span>Etiquetas</span>
            <div className="pizarra-etiquetas-entrada">
              <input
                type="text" list="pizarra-etiquetas-disponibles" value={etiquetaExternoInput}
                onChange={(e) => setEtiquetaExternoInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); anadirEtiquetaExterno() } }}
                placeholder="Escribe una etiqueta y pulsa Enter…"
              />
              <button type="button" className="pizarra-boton" onClick={anadirEtiquetaExterno}>+ Añadir</button>
            </div>
            {etiquetasDisponibles.filter((et) => !etiquetasExterno.includes(et)).length > 0 && (
              <div className="pizarra-etiquetas-sugeridas">
                {etiquetasDisponibles.filter((et) => !etiquetasExterno.includes(et)).map((et) => (
                  <button
                    key={et} type="button" className="pizarra-etiqueta-sugerida"
                    onClick={() => setEtiquetasExterno((prev) => [...prev, et])}
                  >
                    {et}
                  </button>
                ))}
              </div>
            )}
            {etiquetasExterno.length > 0 && (
              <div className="pizarra-etiquetas-chips">
                {etiquetasExterno.map((et) => (
                  <span key={et} className="pizarra-etiqueta-chip">
                    {et}
                    <button type="button" onClick={() => quitarEtiquetaExterno(et)}>✕</button>
                  </span>
                ))}
              </div>
            )}
          </label>

          <label className="campo-sesion">
            <span>Descripción del ejercicio</span>
            <textarea value={descripcionExterno} onChange={(e) => setDescripcionExterno(e.target.value)} rows={3} placeholder="Explica en qué consiste, objetivo, consignas…" />
          </label>

          <label className="campo-sesion">
            <span>Posibles variantes</span>
            <textarea value={variantesExterno} onChange={(e) => setVariantesExterno(e.target.value)} rows={2} />
          </label>

          {mensajeExterno && <div className={mensajeExterno.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensajeExterno.texto}</div>}

          <button type="submit" className="btn-principal" disabled={guardandoExterno}>
            {guardandoExterno ? 'Guardando…' : '+ Añadir a la biblioteca'}
          </button>
        </form>
      </section>

      {ejerciciosGuardados.length > 0 && (
        <section className="pizarra-ejercicio-card">
          <h3>Ejercicios guardados ({ejerciciosGuardados.length})</h3>
          <div className="pizarra-galeria">
            {ejerciciosGuardados.map((ej) => (
              <div className="pizarra-galeria-item" key={ej.id}>
                {ej.tipo_origen === 'youtube' ? (
                  reproduciendoId === ej.id ? (
                    <div className="pizarra-galeria-youtube">
                      <iframe
                        src={`https://www.youtube.com/embed/${ej.youtube_id}?autoplay=1`}
                        title={ej.nombre}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                      <button className="pizarra-galeria-cerrar" onClick={() => setReproduciendoId(null)} title="Cerrar vídeo">✕</button>
                    </div>
                  ) : (
                    <button className="pizarra-galeria-youtube" onClick={() => setReproduciendoId(ej.id)}>
                      <img src={`https://img.youtube.com/vi/${ej.youtube_id}/mqdefault.jpg`} alt={ej.nombre} />
                      <span className="pizarra-galeria-play">▶</span>
                    </button>
                  )
                ) : ej.tipo_origen === 'video_grabado' ? (
                  <video src={ej.video_url} controls className="pizarra-galeria-video" />
                ) : (
                  <img src={ej.imagen_base64} alt={ej.nombre} />
                )}
                <div className="pizarra-galeria-info">
                  <strong>{ej.nombre}</strong>
                  {ej.etiquetas && ej.etiquetas.length > 0 && (
                    <div className="pizarra-etiquetas-chips">
                      {ej.etiquetas.map((et) => <span key={et} className="pizarra-etiqueta-chip pizarra-etiqueta-chip-lectura">{et}</span>)}
                    </div>
                  )}
                  <div className="pizarra-galeria-acciones">
                    <button
                      className="equipo-cambiar-link" onClick={() => empezarEdicionEjercicio(ej)}
                      title="Editar ejercicio"
                    >
                      ✎ Editar
                    </button>
                    <button
                      className="btn-eliminar-fila" onClick={() => eliminarEjercicioPizarra(ej.id)}
                      disabled={borrandoEjercicioId === ej.id} title="Eliminar ejercicio"
                    >
                      {borrandoEjercicioId === ej.id ? '…' : '✕ Eliminar'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {editandoEjercicio && (
        <div className="pizarra-modal-fondo" onClick={cerrarEdicionEjercicio}>
          <div className="pizarra-modal-editar" onClick={(e) => e.stopPropagation()}>
            <div className="pizarra-modal-cabecera">
              <h3>Editar ejercicio</h3>
              <button type="button" className="pizarra-boton" onClick={cerrarEdicionEjercicio}>✕ Cerrar</button>
            </div>

            <form onSubmit={guardarEdicionEjercicio}>
              {editandoEjercicio.tipo_origen === 'video_grabado' ? (
                <video src={edPreviewArchivo || editandoEjercicio.video_url} controls className="pizarra-preview-externa pizarra-preview-edicion" />
              ) : editandoEjercicio.tipo_origen === 'youtube' ? (
                editandoEjercicio.youtube_id && !edPreviewArchivo && (
                  <img src={`https://img.youtube.com/vi/${extraerYoutubeIdExterno(edUrlYoutube) || editandoEjercicio.youtube_id}/mqdefault.jpg`} alt="Vista previa" className="pizarra-preview-externa pizarra-preview-edicion" />
                )
              ) : (
                <img src={edPreviewArchivo || editandoEjercicio.imagen_base64} alt="Vista previa" className="pizarra-preview-externa pizarra-preview-edicion" />
              )}

              {editandoEjercicio.tipo_origen === 'youtube' ? (
                <label className="campo-sesion">
                  <span>Enlace de YouTube</span>
                  <input type="text" value={edUrlYoutube} onChange={(e) => setEdUrlYoutube(e.target.value)} placeholder="https://youtube.com/watch?v=…" />
                </label>
              ) : (
                <label className="campo-sesion">
                  <span>{editandoEjercicio.tipo_origen === 'video_grabado' ? 'Reemplazar vídeo (opcional)' : 'Reemplazar imagen (opcional)'}</span>
                  <input
                    type="file"
                    accept={editandoEjercicio.tipo_origen === 'video_grabado' ? 'video/*' : 'image/*'}
                    onChange={(e) => elegirArchivoReemplazo(e.target.files?.[0])}
                  />
                </label>
              )}

              <label className="campo-sesion">
                <span>Nombre del ejercicio</span>
                <input type="text" value={edNombre} onChange={(e) => setEdNombre(e.target.value)} required />
              </label>

              <label className="campo-sesion">
                <span>Etiquetas</span>
                <div className="pizarra-etiquetas-entrada">
                  <input
                    type="text" list="pizarra-etiquetas-disponibles" value={edEtiquetaInput}
                    onChange={(e) => setEdEtiquetaInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); anadirEtiquetaEdicion() } }}
                    placeholder="Escribe una etiqueta y pulsa Enter…"
                  />
                  <button type="button" className="pizarra-boton" onClick={anadirEtiquetaEdicion}>+ Añadir</button>
                </div>
                {etiquetasDisponibles.filter((et) => !edEtiquetas.includes(et)).length > 0 && (
                  <div className="pizarra-etiquetas-sugeridas">
                    {etiquetasDisponibles.filter((et) => !edEtiquetas.includes(et)).map((et) => (
                      <button key={et} type="button" className="pizarra-etiqueta-sugerida" onClick={() => setEdEtiquetas((prev) => [...prev, et])}>{et}</button>
                    ))}
                  </div>
                )}
                {edEtiquetas.length > 0 && (
                  <div className="pizarra-etiquetas-chips">
                    {edEtiquetas.map((et) => (
                      <span key={et} className="pizarra-etiqueta-chip">{et}<button type="button" onClick={() => quitarEtiquetaEdicion(et)}>✕</button></span>
                    ))}
                  </div>
                )}
              </label>

              <label className="campo-sesion">
                <span>Descripción</span>
                <textarea value={edDescripcion} onChange={(e) => setEdDescripcion(e.target.value)} rows={3} />
              </label>

              <label className="campo-sesion">
                <span>Posibles variantes</span>
                <textarea value={edVariantes} onChange={(e) => setEdVariantes(e.target.value)} rows={2} />
              </label>

              {mensajeEdicion && <div className={mensajeEdicion.tipo === 'ok' ? 'aviso-ok' : 'aviso-error'}>{mensajeEdicion.texto}</div>}

              <button type="submit" className="btn-principal" disabled={guardandoEdicion}>
                {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
