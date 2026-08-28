import './SelectorCuerpo.css'

// Silueta corporal (frontal + posterior) con dos modos:
// - modo="seleccion": el jugador toca todas las zonas (y lados) donde tiene molestia — selección múltiple.
// - modo="mapa": el entrenador ve cada zona coloreada según cuántas veces se ha reportado.
// No es anatómicamente exacta (es esquemática, con contornos abultados que
// recuerdan a la forma de un músculo real), pero cubre las zonas del club.
// Las zonas con lado (hombro, brazo, codo, antebrazo, muñeca, pectoral,
// cuádriceps, aductor, rodilla, tibiales, tobillo, pie, escapular,
// isquiotibiales, gemelos) distinguen lado izquierdo/derecho tal y como
// se ven en el propio dibujo (sin espejo). Las zonas centrales (cuello,
// cadera, psoas, dorsal, lumbar, glúteos) no tienen lado.

function colorMapa(count, max) {
  if (!count) return 'var(--bg-elevated)'
  const ratio = max > 0 ? count / max : 0
  const alpha = 0.28 + ratio * 0.62
  return `rgba(234, 92, 74, ${alpha.toFixed(2)})`
}

export function claveZona(zona, lado) {
  return lado ? `${zona} (${lado})` : zona
}

const SILUETA = 'M40,20 C40,9 49,0 60,0 C71,0 80,9 80,20 C80,28 76,34 70,37 L70,44 C90,46 108,54 116,68 L128,140 C129,146 124,151 118,150 C113,149 110,145 109,140 L100,90 L96,150 L100,290 C101,298 95,304 87,304 L84,304 C77,304 71,299 70,292 L64,180 L60,180 L56,292 C55,299 49,304 42,304 L39,304 C31,304 25,298 26,290 L30,150 L26,90 L17,140 C16,145 13,149 8,150 C2,151 -3,146 -2,140 L10,68 C18,54 36,46 56,44 L56,37 C50,34 46,28 40,20 Z'

export default function SelectorCuerpo({
  modo = 'mapa', frecuencias = {}, zonasSeleccionadas = [], onSeleccionarZona,
}) {
  const max = Math.max(0, ...Object.values(frecuencias))

  function estiloZona(zona, lado) {
    if (modo === 'seleccion') {
      const activo = zonasSeleccionadas.includes(claveZona(zona, lado))
      return activo
        ? { fill: 'var(--accent)', fillOpacity: 0.55, stroke: 'var(--accent)', strokeWidth: 2 }
        : { fill: 'var(--bg-elevated)', fillOpacity: 0.9, stroke: 'var(--line-strong)', strokeWidth: 1 }
    }
    return { fill: colorMapa(frecuencias[claveZona(zona, lado)] || 0, max), stroke: 'var(--line-strong)', strokeWidth: 1 }
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
        <svg viewBox="-20 -10 170 320" className="cuerpo-svg">
          <g transform="translate(20,4)" opacity="0.5">
            <path d={SILUETA} fill="var(--bg-elevated)" stroke="var(--line)" strokeWidth="1" />
          </g>
          <circle cx="60" cy="14" r="15" fill="var(--bg-elevated)" stroke="var(--line)" strokeWidth="1" />

          <circle cx="60" cy="14" r="15" {...propsZona('Cabeza/cara')}>
            {modo === 'mapa' && <title>{tituloZona('Cabeza/cara')}</title>}
          </circle>

          <rect x="52" y="28" width="16" height="12" rx="4" {...propsZona('Cuello/cervicales')}>
            {modo === 'mapa' && <title>{tituloZona('Cuello/cervicales')}</title>}
          </rect>

          <path d="M28,48 C27,40 34,32 45,32 C50,32 50,38 49,44 L49,58 C42,60 32,57 28,48 Z" {...propsZona('Hombro', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Hombro', 'Izquierdo')}</title>}
          </path>
          <path d="M92,48 C93,40 86,32 75,32 C70,32 70,38 71,44 L71,58 C78,60 88,57 92,48 Z" {...propsZona('Hombro', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Hombro', 'Derecho')}</title>}
          </path>

          <rect x="42" y="40" width="36" height="60" rx="12" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />

          <path d="M58,43 C51,40 45,42 43,48 C42,54 46,59 53,60 C57,60 59,58 59,54 Z" {...propsZona('Pectoral', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Pectoral', 'Izquierdo')}</title>}
          </path>
          <path d="M62,43 C69,40 75,42 77,48 C78,54 74,59 67,60 C63,60 61,58 61,54 Z" {...propsZona('Pectoral', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Pectoral', 'Derecho')}</title>}
          </path>
          <rect x="45" y="61" width="30" height="13" rx="4" {...propsZona('Esternón/costillas')}>
            {modo === 'mapa' && <title>{tituloZona('Esternón/costillas')}</title>}
          </rect>
          <path d="M46,76 L74,76 C75,80 75,86 74,92 C68,95 52,95 46,92 C45,86 45,80 46,76 Z" {...propsZona('Abdomen')}>
            {modo === 'mapa' && <title>{tituloZona('Abdomen')}</title>}
          </path>
          <line x1="60" y1="78" x2="60" y2="93" stroke="var(--line)" strokeWidth="0.75" opacity="0.4" pointerEvents="none" />
          <line x1="51" y1="80" x2="51" y2="91" stroke="var(--line)" strokeWidth="0.5" opacity="0.3" pointerEvents="none" />
          <line x1="69" y1="80" x2="69" y2="91" stroke="var(--line)" strokeWidth="0.5" opacity="0.3" pointerEvents="none" />

          <path d="M18,50 C11,57 8,70 9,85 C10,93 13,99 19,99 C23,91 25,77 26,64 C27,57 24,52 18,50 Z" {...propsZona('Brazo', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Brazo', 'Izquierdo')}</title>}
          </path>
          <path d="M102,50 C109,57 112,70 111,85 C110,93 107,99 101,99 C97,91 95,77 94,64 C93,57 96,52 102,50 Z" {...propsZona('Brazo', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Brazo', 'Derecho')}</title>}
          </path>

          <circle cx="14" cy="103" r="8" {...propsZona('Codo', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Codo', 'Izquierdo')}</title>}
          </circle>
          <circle cx="106" cy="103" r="8" {...propsZona('Codo', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Codo', 'Derecho')}</title>}
          </circle>

          <path d="M8,110 C6,120 6,132 9,142 L20,140 C19,128 20,118 21,110 Z" {...propsZona('Antebrazo', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Antebrazo', 'Izquierdo')}</title>}
          </path>
          <path d="M112,110 C114,120 114,132 111,142 L100,140 C101,128 100,118 99,110 Z" {...propsZona('Antebrazo', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Antebrazo', 'Derecho')}</title>}
          </path>

          <circle cx="12" cy="148" r="7" {...propsZona('Muñeca', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Muñeca', 'Izquierdo')}</title>}
          </circle>
          <circle cx="108" cy="148" r="7" {...propsZona('Muñeca', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Muñeca', 'Derecho')}</title>}
          </circle>

          <ellipse cx="11" cy="161" rx="8" ry="10" {...propsZona('Mano', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Mano', 'Izquierdo')}</title>}
          </ellipse>
          <ellipse cx="109" cy="161" rx="8" ry="10" {...propsZona('Mano', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Mano', 'Derecho')}</title>}
          </ellipse>

          <path d="M40,96 C40,90 80,90 80,96 L82,116 C70,122 50,122 38,116 Z" {...propsZona('Cadera')}>
            {modo === 'mapa' && <title>{tituloZona('Cadera')}</title>}
          </path>
          <rect x="50" y="112" width="20" height="14" rx="5" {...propsZona('Psoas (flexores cadera)')}>
            {modo === 'mapa' && <title>{tituloZona('Psoas (flexores cadera)')}</title>}
          </rect>

          <path d="M39,120 C35,132 34,150 36,166 C37,174 41,178 48,178 C53,178 56,174 57,168 C58,150 58,134 55,120 C50,116 43,116 39,120 Z" {...propsZona('Cuádriceps', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Cuádriceps', 'Izquierdo')}</title>}
          </path>
          <path d="M81,120 C85,132 86,150 84,166 C83,174 79,178 72,178 C67,178 64,174 63,168 C62,150 62,134 65,120 C70,116 77,116 81,120 Z" {...propsZona('Cuádriceps', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Cuádriceps', 'Derecho')}</title>}
          </path>
          <rect x="51" y="126" width="8" height="46" rx="4" {...propsZona('Aductor', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Aductor', 'Izquierdo')}</title>}
          </rect>
          <rect x="61" y="126" width="8" height="46" rx="4" {...propsZona('Aductor', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Aductor', 'Derecho')}</title>}
          </rect>

          <circle cx="46" cy="184" r="9" {...propsZona('Rodilla', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Rodilla', 'Izquierdo')}</title>}
          </circle>
          <circle cx="74" cy="184" r="9" {...propsZona('Rodilla', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Rodilla', 'Derecho')}</title>}
          </circle>

          <path d="M40,194 C37,204 37,216 39,228 C40,234 43,238 47,238 C51,236 53,230 53,222 C54,210 54,200 52,194 C48,191 43,191 40,194 Z" {...propsZona('Tibiales', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Tibiales', 'Izquierdo')}</title>}
          </path>
          <path d="M80,194 C83,204 83,216 81,228 C80,234 77,238 73,238 C69,236 67,230 67,222 C66,210 66,200 68,194 C72,191 77,191 80,194 Z" {...propsZona('Tibiales', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Tibiales', 'Derecho')}</title>}
          </path>

          <circle cx="46" cy="240" r="7" {...propsZona('Tobillo', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Tobillo', 'Izquierdo')}</title>}
          </circle>
          <circle cx="74" cy="240" r="7" {...propsZona('Tobillo', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Tobillo', 'Derecho')}</title>}
          </circle>

          <ellipse cx="44" cy="252" rx="11" ry="7" {...propsZona('Pie', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Pie', 'Izquierdo')}</title>}
          </ellipse>
          <ellipse cx="76" cy="252" rx="11" ry="7" {...propsZona('Pie', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Pie', 'Derecho')}</title>}
          </ellipse>
        </svg>
      </div>

      <div className="cuerpo-columna">
        <h4>Vista posterior</h4>
        <svg viewBox="-20 -10 170 320" className="cuerpo-svg">
          <g transform="translate(20,4)" opacity="0.5">
            <path d={SILUETA} fill="var(--bg-elevated)" stroke="var(--line)" strokeWidth="1" />
          </g>
          <circle cx="60" cy="14" r="15" fill="var(--bg-elevated)" stroke="var(--line)" strokeWidth="1" />
          <rect x="52" y="28" width="16" height="12" rx="4" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <path d="M28,48 C27,40 34,32 45,32 C50,32 50,38 49,44 L49,58 C42,60 32,57 28,48 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <path d="M92,48 C93,40 86,32 75,32 C70,32 70,38 71,44 L71,58 C78,60 88,57 92,48 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <path d="M18,50 C11,57 8,70 9,85 C10,93 13,99 19,99 C23,91 25,77 26,64 C27,57 24,52 18,50 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <path d="M102,50 C109,57 112,70 111,85 C110,93 107,99 101,99 C97,91 95,77 94,64 C93,57 96,52 102,50 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <circle cx="14" cy="103" r="8" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <circle cx="106" cy="103" r="8" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <path d="M8,110 C6,120 6,132 9,142 L20,140 C19,128 20,118 21,110 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <path d="M112,110 C114,120 114,132 111,142 L100,140 C101,128 100,118 99,110 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <circle cx="12" cy="148" r="7" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <circle cx="108" cy="148" r="7" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <ellipse cx="11" cy="161" rx="8" ry="10" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <ellipse cx="109" cy="161" rx="8" ry="10" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />

          <path d="M42,38 C42,34 78,34 78,38 L80,70 C67,77 53,77 40,70 Z" {...propsZona('Zona dorsal (espalda alta)')}>
            {modo === 'mapa' && <title>{tituloZona('Zona dorsal (espalda alta)')}</title>}
          </path>
          <path d="M39,44 C39,41 51,40 55,43 L54,60 C47,63 40,58 38,53 Z" {...propsZona('Escapular', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Escapular', 'Izquierdo')}</title>}
          </path>
          <path d="M81,44 C81,41 69,40 65,43 L66,60 C73,63 80,58 82,53 Z" {...propsZona('Escapular', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Escapular', 'Derecho')}</title>}
          </path>
          <path d="M41,72 C41,68 79,68 79,72 L80,96 C66,101 54,101 40,96 Z" {...propsZona('Zona lumbar')}>
            {modo === 'mapa' && <title>{tituloZona('Zona lumbar')}</title>}
          </path>
          <path d="M37,98 C37,92 45,88 60,88 C75,88 83,92 83,98 C83,110 76,120 60,120 C44,120 37,110 37,98 Z" {...propsZona('Glúteos')}>
            {modo === 'mapa' && <title>{tituloZona('Glúteos')}</title>}
          </path>

          <path d="M39,120 C35,132 34,150 36,166 C37,174 41,178 48,178 C53,178 56,174 57,168 C58,150 58,134 55,120 C50,116 43,116 39,120 Z" {...propsZona('Isquiotibiales', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Isquiotibiales', 'Izquierdo')}</title>}
          </path>
          <path d="M81,120 C85,132 86,150 84,166 C83,174 79,178 72,178 C67,178 64,174 63,168 C62,150 62,134 65,120 C70,116 77,116 81,120 Z" {...propsZona('Isquiotibiales', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Isquiotibiales', 'Derecho')}</title>}
          </path>

          <circle cx="46" cy="184" r="9" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <circle cx="74" cy="184" r="9" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />

          <path d="M40,194 C37,204 37,216 39,228 C40,234 43,238 47,238 C51,236 53,230 53,222 C54,210 54,200 52,194 C48,191 43,191 40,194 Z" {...propsZona('Gemelos', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Gemelos', 'Izquierdo')}</title>}
          </path>
          <path d="M80,194 C83,204 83,216 81,228 C80,234 77,238 73,238 C69,236 67,230 67,222 C66,210 66,200 68,194 C72,191 77,191 80,194 Z" {...propsZona('Gemelos', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Gemelos', 'Derecho')}</title>}
          </path>

          <circle cx="46" cy="240" r="7" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <circle cx="74" cy="240" r="7" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <ellipse cx="44" cy="252" rx="11" ry="7" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <ellipse cx="76" cy="252" rx="11" ry="7" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
        </svg>
      </div>
    </div>
  )
}
