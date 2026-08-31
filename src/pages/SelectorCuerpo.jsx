import cuerpoFrontal from './cuerpo-frontal.jpg'
import cuerpoPosterior from './cuerpo-posterior.jpg'
import './SelectorCuerpo.css'

// Silueta corporal (frontal + posterior) con dos modos:
// - modo="seleccion": el jugador toca todas las zonas (y lados) donde tiene molestia — selección múltiple.
// - modo="mapa": el entrenador ve cada zona coloreada según cuántas veces se ha reportado.
//
// El fondo es una fotografía anatómica real (dominio público / con crédito,
// ver Referencias), atenuada a tono neutro — las zonas de arriba son
// resaltados translúcidos sobre esa base, no dibujos por sí solos, así
// que el detalle muscular real lo aporta la propia foto.
//
// Las zonas con lado (hombro, brazo, codo, antebrazo, muñeca, mano,
// pectoral, cuádriceps, aductor, rodilla, tibiales, tobillo, pie,
// escapular, isquiotibiales, gemelos) distinguen lado izquierdo/derecho
// tal y como se ven en el propio dibujo (sin espejo). Las zonas centrales
// (cuello, cadera, psoas, dorsal, lumbar, glúteos) no tienen lado.

function colorMapa(count, max) {
  if (!count) return 'transparent'
  const ratio = max > 0 ? count / max : 0
  const alpha = 0.35 + ratio * 0.55
  return `rgba(220, 50, 40, ${alpha.toFixed(2)})`
}

export function claveZona(zona, lado) {
  return lado ? `${zona} (${lado})` : zona
}

export default function SelectorCuerpo({
  modo = 'mapa', frecuencias = {}, zonasSeleccionadas = [], onSeleccionarZona,
}) {
  const max = Math.max(0, ...Object.values(frecuencias))

  function estiloZona(zona, lado) {
    if (modo === 'seleccion') {
      const activo = zonasSeleccionadas.includes(claveZona(zona, lado))
      return activo
        ? { fill: 'var(--accent)', fillOpacity: 0.5, stroke: 'var(--accent)', strokeWidth: 2 }
        : { fill: 'rgba(120,120,120,0.12)', stroke: 'rgba(120,120,120,0.4)', strokeWidth: 1, strokeDasharray: '3 2' }
    }
    return { fill: colorMapa(frecuencias[claveZona(zona, lado)] || 0, max), stroke: 'rgba(120,120,120,0.35)', strokeWidth: 1 }
  }

  function propsZona(zona, lado = null) {
    const base = { ...estiloZona(zona, lado), className: modo === 'seleccion' ? 'zona-cuerpo zona-cuerpo-clicable' : 'zona-cuerpo' }
    if (modo === 'seleccion') base.onClick = () => onSeleccionarZona?.(zona, lado)
    return base
  }

  const contador = (zona, lado) => frecuencias[claveZona(zona, lado)] || 0
  const tituloZona = (zona, lado) => `${zona}${lado ? ` (${lado})` : ''}: ${contador(zona, lado)} veces`

  return (
    <div className="selector-cuerpo-grid">
      <div className="cuerpo-columna">
        <h4>Vista frontal</h4>
        <div className="cuerpo-tarjeta-clara">
          <svg viewBox="0 0 500 817" className="cuerpo-svg">
            <image href={cuerpoFrontal} x="0" y="0" width="500" height="817" preserveAspectRatio="xMidYMid meet" />

            <circle cx="250" cy="50" r="48" {...propsZona('Cabeza/cara')}>
              {modo === 'mapa' && <title>{tituloZona('Cabeza/cara')}</title>}
            </circle>
            <rect x="222" y="86" width="56" height="36" rx="14" {...propsZona('Cuello/cervicales')}>
              {modo === 'mapa' && <title>{tituloZona('Cuello/cervicales')}</title>}
            </rect>

            <ellipse cx="178" cy="142" rx="42" ry="35" {...propsZona('Hombro', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Hombro', 'Izquierdo')}</title>}
            </ellipse>
            <ellipse cx="322" cy="142" rx="42" ry="35" {...propsZona('Hombro', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Hombro', 'Derecho')}</title>}
            </ellipse>

            <path d="M172,160 C172,158 250,155 250,170 L250,225 C230,232 190,228 175,215 Z" {...propsZona('Pectoral', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Pectoral', 'Izquierdo')}</title>}
            </path>
            <path d="M328,160 C328,158 250,155 250,170 L250,225 C270,232 310,228 325,215 Z" {...propsZona('Pectoral', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Pectoral', 'Derecho')}</title>}
            </path>
            <rect x="222" y="195" width="56" height="45" rx="8" {...propsZona('Esternón/costillas')}>
              {modo === 'mapa' && <title>{tituloZona('Esternón/costillas')}</title>}
            </rect>
            <rect x="192" y="250" width="116" height="78" rx="14" {...propsZona('Abdomen')}>
              {modo === 'mapa' && <title>{tituloZona('Abdomen')}</title>}
            </rect>

            <path d="M155,140 C110,155 75,215 68,278 L92,290 C102,235 128,180 172,165 Z" {...propsZona('Brazo', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Brazo', 'Izquierdo')}</title>}
            </path>
            <path d="M345,140 C390,155 425,215 432,278 L408,290 C398,235 372,180 328,165 Z" {...propsZona('Brazo', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Brazo', 'Derecho')}</title>}
            </path>

            <circle cx="68" cy="293" r="22" {...propsZona('Codo', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Codo', 'Izquierdo')}</title>}
            </circle>
            <circle cx="432" cy="293" r="22" {...propsZona('Codo', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Codo', 'Derecho')}</title>}
            </circle>

            <path d="M55,308 C35,335 25,365 22,388 L45,393 C48,368 56,342 82,313 Z" {...propsZona('Antebrazo', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Antebrazo', 'Izquierdo')}</title>}
            </path>
            <path d="M445,308 C465,335 475,365 478,388 L455,393 C452,368 444,342 418,313 Z" {...propsZona('Antebrazo', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Antebrazo', 'Derecho')}</title>}
            </path>

            <circle cx="22" cy="393" r="15" {...propsZona('Muñeca', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Muñeca', 'Izquierdo')}</title>}
            </circle>
            <circle cx="478" cy="393" r="15" {...propsZona('Muñeca', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Muñeca', 'Derecho')}</title>}
            </circle>

            <ellipse cx="18" cy="425" rx="20" ry="30" {...propsZona('Mano', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Mano', 'Izquierdo')}</title>}
            </ellipse>
            <ellipse cx="482" cy="425" rx="20" ry="30" {...propsZona('Mano', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Mano', 'Derecho')}</title>}
            </ellipse>

            <path d="M180,330 C180,325 320,325 320,330 L328,375 C290,395 210,395 172,375 Z" {...propsZona('Cadera')}>
              {modo === 'mapa' && <title>{tituloZona('Cadera')}</title>}
            </path>
            <rect x="212" y="350" width="76" height="42" rx="12" {...propsZona('Psoas (flexores cadera)')}>
              {modo === 'mapa' && <title>{tituloZona('Psoas (flexores cadera)')}</title>}
            </rect>

            <path d="M177,398 C170,440 168,505 178,558 C182,568 232,568 240,555 C246,505 246,445 240,400 C220,392 195,392 177,398 Z" {...propsZona('Cuádriceps', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Cuádriceps', 'Izquierdo')}</title>}
            </path>
            <path d="M323,398 C330,440 332,505 322,558 C318,568 268,568 260,555 C254,505 254,445 260,400 C280,392 305,392 323,398 Z" {...propsZona('Cuádriceps', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Cuádriceps', 'Derecho')}</title>}
            </path>
            <rect x="222" y="400" width="24" height="145" rx="10" {...propsZona('Aductor', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Aductor', 'Izquierdo')}</title>}
            </rect>
            <rect x="254" y="400" width="24" height="145" rx="10" {...propsZona('Aductor', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Aductor', 'Derecho')}</title>}
            </rect>

            <circle cx="213" cy="563" r="24" {...propsZona('Rodilla', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Rodilla', 'Izquierdo')}</title>}
            </circle>
            <circle cx="287" cy="563" r="24" {...propsZona('Rodilla', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Rodilla', 'Derecho')}</title>}
            </circle>

            <path d="M192,588 C188,620 190,660 197,684 L238,684 C242,660 240,620 234,590 C220,585 205,585 192,588 Z" {...propsZona('Tibiales', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Tibiales', 'Izquierdo')}</title>}
            </path>
            <path d="M308,588 C312,620 310,660 303,684 L262,684 C258,660 260,620 266,590 C280,585 295,585 308,588 Z" {...propsZona('Tibiales', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Tibiales', 'Derecho')}</title>}
            </path>

            <circle cx="218" cy="693" r="14" {...propsZona('Tobillo', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Tobillo', 'Izquierdo')}</title>}
            </circle>
            <circle cx="282" cy="693" r="14" {...propsZona('Tobillo', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Tobillo', 'Derecho')}</title>}
            </circle>

            <ellipse cx="205" cy="735" rx="40" ry="32" {...propsZona('Pie', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Pie', 'Izquierdo')}</title>}
            </ellipse>
            <ellipse cx="295" cy="735" rx="40" ry="32" {...propsZona('Pie', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Pie', 'Derecho')}</title>}
            </ellipse>
          </svg>
        </div>
      </div>

      <div className="cuerpo-columna">
        <h4>Vista posterior</h4>
        <div className="cuerpo-tarjeta-clara">
          <svg viewBox="0 0 500 766" className="cuerpo-svg">
            <image href={cuerpoPosterior} x="0" y="0" width="500" height="766" preserveAspectRatio="xMidYMid meet" />

            <circle cx="250" cy="48" r="45" className="zona-decorativa" />
            <rect x="222" y="84" width="56" height="34" rx="14" className="zona-decorativa" />
            <ellipse cx="177" cy="140" rx="40" ry="33" className="zona-decorativa" />
            <ellipse cx="323" cy="140" rx="40" ry="33" className="zona-decorativa" />

            <path d="M178,132 C178,128 322,128 322,132 L328,195 C290,215 210,215 172,195 Z" {...propsZona('Zona dorsal (espalda alta)')}>
              {modo === 'mapa' && <title>{tituloZona('Zona dorsal (espalda alta)')}</title>}
            </path>
            <path d="M178,138 C178,135 245,133 245,140 L242,205 C215,210 190,203 175,190 Z" {...propsZona('Escapular', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Escapular', 'Izquierdo')}</title>}
            </path>
            <path d="M322,138 C322,135 255,133 255,140 L258,205 C285,210 310,203 325,190 Z" {...propsZona('Escapular', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Escapular', 'Derecho')}</title>}
            </path>

            <path d="M150,135 C110,150 78,205 73,262 L95,268 C102,215 125,168 168,150 Z" className="zona-decorativa" />
            <path d="M350,135 C390,150 422,205 427,262 L405,268 C398,215 375,168 332,150 Z" className="zona-decorativa" />
            <circle cx="75" cy="266" r="20" className="zona-decorativa" />
            <circle cx="425" cy="266" r="20" className="zona-decorativa" />
            <path d="M62,280 C42,305 33,330 30,350 L52,354 C56,332 63,310 88,285 Z" className="zona-decorativa" />
            <path d="M438,280 C458,305 467,330 470,350 L448,354 C444,332 437,310 412,285 Z" className="zona-decorativa" />
            <circle cx="33" cy="352" r="14" className="zona-decorativa" />
            <circle cx="467" cy="352" r="14" className="zona-decorativa" />
            <ellipse cx="28" cy="382" rx="19" ry="27" className="zona-decorativa" />
            <ellipse cx="472" cy="382" rx="19" ry="27" className="zona-decorativa" />

            <path d="M195,270 C195,266 305,266 305,270 L312,318 C280,332 220,332 188,318 Z" {...propsZona('Zona lumbar')}>
              {modo === 'mapa' && <title>{tituloZona('Zona lumbar')}</title>}
            </path>
            <path d="M185,322 C185,312 200,300 250,300 C300,300 315,312 315,322 C315,352 292,388 250,388 C208,388 185,352 185,322 Z" {...propsZona('Glúteos')}>
              {modo === 'mapa' && <title>{tituloZona('Glúteos')}</title>}
            </path>

            <path d="M188,392 C182,428 182,468 190,502 C194,510 236,510 242,500 C248,468 248,432 242,394 C224,388 204,388 188,392 Z" {...propsZona('Isquiotibiales', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Isquiotibiales', 'Izquierdo')}</title>}
            </path>
            <path d="M312,392 C318,428 318,468 310,502 C306,510 264,510 258,500 C252,468 252,432 258,394 C276,388 296,388 312,392 Z" {...propsZona('Isquiotibiales', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Isquiotibiales', 'Derecho')}</title>}
            </path>

            <circle cx="218" cy="508" r="22" className="zona-decorativa" />
            <circle cx="282" cy="508" r="22" className="zona-decorativa" />

            <path d="M198,530 C194,558 196,590 202,610 L238,610 C242,590 240,558 234,532 C222,527 208,527 198,530 Z" {...propsZona('Gemelos', 'Izquierdo')}>
              {modo === 'mapa' && <title>{tituloZona('Gemelos', 'Izquierdo')}</title>}
            </path>
            <path d="M302,530 C306,558 304,590 298,610 L262,610 C258,590 260,558 266,532 C278,527 292,527 302,530 Z" {...propsZona('Gemelos', 'Derecho')}>
              {modo === 'mapa' && <title>{tituloZona('Gemelos', 'Derecho')}</title>}
            </path>

            <circle cx="222" cy="614" r="13" className="zona-decorativa" />
            <circle cx="278" cy="614" r="13" className="zona-decorativa" />
            <ellipse cx="210" cy="648" rx="36" ry="26" className="zona-decorativa" />
            <ellipse cx="290" cy="648" rx="36" ry="26" className="zona-decorativa" />
          </svg>
        </div>
      </div>

      <p className="cuerpo-credito">
        Base anatómica: fotografías 3D con licencia de Magnific (magnific.com) — Designed by Magnific.
      </p>
    </div>
  )
}
