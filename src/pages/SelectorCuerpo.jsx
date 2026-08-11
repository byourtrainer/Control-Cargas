import './SelectorCuerpo.css'

// Silueta corporal (frontal + posterior) con dos modos:
// - modo="seleccion": el jugador toca una zona (y, si aplica, un lado) para indicar dónde tiene la molestia.
// - modo="mapa": el entrenador ve cada zona coloreada según cuántas veces se ha reportado.
// No es anatómicamente exacta (es esquemática), pero cubre las 19 zonas del club.
// Las zonas duplicadas (hombro, brazo, codo, antebrazo, muñeca, cuádriceps,
// rodilla, tibiales, tobillo, pie, isquiotibiales, gemelos) distinguen lado
// izquierdo/derecho tal y como se ven en el propio dibujo (sin espejo).
// Las zonas centrales (cuello, cadera, psoas, aductores, dorsal, lumbar,
// glúteos) no tienen lado.

function colorMapa(count, max) {
  if (!count) return 'var(--bg-elevated)'
  const ratio = max > 0 ? count / max : 0
  const alpha = 0.28 + ratio * 0.62
  return `rgba(234, 92, 74, ${alpha.toFixed(2)})`
}

function claveZona(zona, lado) {
  return lado ? `${zona} (${lado})` : zona
}

const SILUETA = 'M40,20 C40,9 49,0 60,0 C71,0 80,9 80,20 C80,28 76,34 70,37 L70,44 C90,46 108,54 116,68 L128,140 C129,146 124,151 118,150 C113,149 110,145 109,140 L100,90 L96,150 L100,290 C101,298 95,304 87,304 L84,304 C77,304 71,299 70,292 L64,180 L60,180 L56,292 C55,299 49,304 42,304 L39,304 C31,304 25,298 26,290 L30,150 L26,90 L17,140 C16,145 13,149 8,150 C2,151 -3,146 -2,140 L10,68 C18,54 36,46 56,44 L56,37 C50,34 46,28 40,20 Z'

export default function SelectorCuerpo({
  modo = 'mapa', frecuencias = {}, zonaSeleccionada = null, ladoSeleccionada = null, onSeleccionarZona,
}) {
  const max = Math.max(0, ...Object.values(frecuencias))

  function estiloZona(zona, lado) {
    if (modo === 'seleccion') {
      const activo = zonaSeleccionada === zona && (ladoSeleccionada || null) === (lado || null)
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

          <rect x="52" y="28" width="16" height="12" rx="4" {...propsZona('Cuello/cervicales')}>
            {modo === 'mapa' && <title>{tituloZona('Cuello/cervicales')}</title>}
          </rect>

          <path d="M30,44 C30,36 40,32 48,34 L48,58 C40,60 30,56 28,50 Z" {...propsZona('Hombro', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Hombro', 'Izquierdo')}</title>}
          </path>
          <path d="M90,44 C90,36 80,32 72,34 L72,58 C80,60 90,56 92,50 Z" {...propsZona('Hombro', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Hombro', 'Derecho')}</title>}
          </path>

          <rect x="42" y="40" width="36" height="60" rx="12" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />

          <path d="M14,50 C10,60 8,80 10,98 L22,100 C24,82 26,64 30,52 Z" {...propsZona('Brazo', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Brazo', 'Izquierdo')}</title>}
          </path>
          <path d="M106,50 C110,60 112,80 110,98 L98,100 C96,82 94,64 90,52 Z" {...propsZona('Brazo', 'Derecho')}>
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

          <path d="M40,96 C40,90 80,90 80,96 L82,116 C70,122 50,122 38,116 Z" {...propsZona('Cadera')}>
            {modo === 'mapa' && <title>{tituloZona('Cadera')}</title>}
          </path>
          <rect x="50" y="112" width="20" height="14" rx="5" {...propsZona('Psoas (flexores cadera)')}>
            {modo === 'mapa' && <title>{tituloZona('Psoas (flexores cadera)')}</title>}
          </rect>

          <path d="M38,120 C36,140 36,158 40,176 L58,176 C58,156 56,138 56,122 Z" {...propsZona('Cuádriceps', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Cuádriceps', 'Izquierdo')}</title>}
          </path>
          <path d="M82,120 C84,140 84,158 80,176 L62,176 C62,156 64,138 64,122 Z" {...propsZona('Cuádriceps', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Cuádriceps', 'Derecho')}</title>}
          </path>
          <rect x="55" y="126" width="10" height="46" rx="4" {...propsZona('Aductores')}>
            {modo === 'mapa' && <title>{tituloZona('Aductores')}</title>}
          </rect>

          <circle cx="46" cy="184" r="9" {...propsZona('Rodilla', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Rodilla', 'Izquierdo')}</title>}
          </circle>
          <circle cx="74" cy="184" r="9" {...propsZona('Rodilla', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Rodilla', 'Derecho')}</title>}
          </circle>

          <path d="M39,194 C38,208 38,222 41,234 L53,234 C54,220 54,206 53,194 Z" {...propsZona('Tibiales', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Tibiales', 'Izquierdo')}</title>}
          </path>
          <path d="M81,194 C82,208 82,222 79,234 L67,234 C66,220 66,206 67,194 Z" {...propsZona('Tibiales', 'Derecho')}>
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
          <path d="M30,44 C30,36 40,32 48,34 L48,58 C40,60 30,56 28,50 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <path d="M90,44 C90,36 80,32 72,34 L72,58 C80,60 90,56 92,50 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <path d="M14,50 C10,60 8,80 10,98 L22,100 C24,82 26,64 30,52 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <path d="M106,50 C110,60 112,80 110,98 L98,100 C96,82 94,64 90,52 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <circle cx="14" cy="103" r="8" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <circle cx="106" cy="103" r="8" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <path d="M8,110 C6,120 6,132 9,142 L20,140 C19,128 20,118 21,110 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <path d="M112,110 C114,120 114,132 111,142 L100,140 C101,128 100,118 99,110 Z" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <circle cx="12" cy="148" r="7" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <circle cx="108" cy="148" r="7" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />

          <path d="M42,40 C42,36 78,36 78,40 L80,72 C66,78 54,78 40,72 Z" {...propsZona('Zona dorsal (espalda alta)')}>
            {modo === 'mapa' && <title>{tituloZona('Zona dorsal (espalda alta)')}</title>}
          </path>
          <path d="M41,74 C41,70 79,70 79,74 L80,98 C66,102 54,102 40,98 Z" {...propsZona('Zona lumbar')}>
            {modo === 'mapa' && <title>{tituloZona('Zona lumbar')}</title>}
          </path>
          <path d="M38,100 C38,94 82,94 82,100 L82,118 C68,124 52,124 38,118 Z" {...propsZona('Glúteos')}>
            {modo === 'mapa' && <title>{tituloZona('Glúteos')}</title>}
          </path>

          <path d="M38,120 C36,140 36,158 40,176 L58,176 C58,156 56,138 56,122 Z" {...propsZona('Isquiotibiales', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Isquiotibiales', 'Izquierdo')}</title>}
          </path>
          <path d="M82,120 C84,140 84,158 80,176 L62,176 C62,156 64,138 64,122 Z" {...propsZona('Isquiotibiales', 'Derecho')}>
            {modo === 'mapa' && <title>{tituloZona('Isquiotibiales', 'Derecho')}</title>}
          </path>

          <circle cx="46" cy="184" r="9" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />
          <circle cx="74" cy="184" r="9" fill="var(--bg-elevated)" fillOpacity="0.5" stroke="var(--line)" strokeWidth="1" />

          <path d="M39,194 C38,208 38,222 41,234 L53,234 C54,220 54,206 53,194 Z" {...propsZona('Gemelos', 'Izquierdo')}>
            {modo === 'mapa' && <title>{tituloZona('Gemelos', 'Izquierdo')}</title>}
          </path>
          <path d="M81,194 C82,208 82,222 79,234 L67,234 C66,220 66,206 67,194 Z" {...propsZona('Gemelos', 'Derecho')}>
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
