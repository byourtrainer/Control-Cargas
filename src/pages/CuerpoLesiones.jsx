import './CuerpoLesiones.css'

// Silueta corporal simplificada (frontal + posterior) que colorea cada
// zona en una escala de rojos según cuántas veces se ha reportado
// molestia/dolor en ella. No es anatómicamente exacta, es esquemática.

function colorZona(count, max) {
  if (!count) return 'var(--bg-elevated)'
  const ratio = max > 0 ? count / max : 0
  const alpha = 0.28 + ratio * 0.62
  return `rgba(234, 92, 74, ${alpha.toFixed(2)})`
}

const ESTILO_NEUTRO = { fill: 'var(--bg-elevated)', stroke: 'var(--line)', strokeWidth: 1, opacity: 0.5 }

export default function CuerpoLesiones({ frecuencias = {} }) {
  const max = Math.max(0, ...Object.values(frecuencias))
  const f = (zona) => colorZona(frecuencias[zona] || 0, max)
  const c = (zona) => frecuencias[zona] || 0
  const trazo = { stroke: 'var(--line-strong)', strokeWidth: 1 }

  return (
    <div className="cuerpo-lesiones-grid">
      <div className="cuerpo-columna">
        <h4>Vista frontal</h4>
        <svg viewBox="0 0 160 300" className="cuerpo-svg">
          <circle cx="80" cy="22" r="16" {...ESTILO_NEUTRO} />
          <rect x="72" y="36" width="16" height="12" rx="3" fill={f('Cuello/cervicales')} {...trazo}>
            <title>Cuello/cervicales: {c('Cuello/cervicales')} veces</title>
          </rect>
          <rect x="55" y="50" width="50" height="66" rx="10" {...ESTILO_NEUTRO} />
          <ellipse cx="48" cy="56" rx="14" ry="10" fill={f('Hombro')} {...trazo}>
            <title>Hombro: {c('Hombro')} veces</title>
          </ellipse>
          <ellipse cx="112" cy="56" rx="14" ry="10" fill={f('Hombro')} {...trazo}>
            <title>Hombro: {c('Hombro')} veces</title>
          </ellipse>
          <rect x="30" y="60" width="16" height="45" rx="8" fill={f('Brazo')} {...trazo}>
            <title>Brazo: {c('Brazo')} veces</title>
          </rect>
          <rect x="114" y="60" width="16" height="45" rx="8" fill={f('Brazo')} {...trazo}>
            <title>Brazo: {c('Brazo')} veces</title>
          </rect>
          <circle cx="38" cy="110" r="8" fill={f('Codo')} {...trazo}>
            <title>Codo: {c('Codo')} veces</title>
          </circle>
          <circle cx="122" cy="110" r="8" fill={f('Codo')} {...trazo}>
            <title>Codo: {c('Codo')} veces</title>
          </circle>
          <rect x="28" y="114" width="16" height="38" rx="8" fill={f('Antebrazo')} {...trazo}>
            <title>Antebrazo: {c('Antebrazo')} veces</title>
          </rect>
          <rect x="116" y="114" width="16" height="38" rx="8" fill={f('Antebrazo')} {...trazo}>
            <title>Antebrazo: {c('Antebrazo')} veces</title>
          </rect>
          <circle cx="36" cy="156" r="7" fill={f('Muñeca')} {...trazo}>
            <title>Muñeca: {c('Muñeca')} veces</title>
          </circle>
          <circle cx="124" cy="156" r="7" fill={f('Muñeca')} {...trazo}>
            <title>Muñeca: {c('Muñeca')} veces</title>
          </circle>
          <rect x="58" y="116" width="44" height="26" rx="8" fill={f('Cadera')} {...trazo}>
            <title>Cadera: {c('Cadera')} veces</title>
          </rect>
          <rect x="68" y="140" width="24" height="14" rx="4" fill={f('Psoas (flexores cadera)')} {...trazo}>
            <title>Psoas (flexores cadera): {c('Psoas (flexores cadera)')} veces</title>
          </rect>
          <rect x="58" y="152" width="18" height="55" rx="8" fill={f('Cuádriceps')} {...trazo}>
            <title>Cuádriceps: {c('Cuádriceps')} veces</title>
          </rect>
          <rect x="84" y="152" width="18" height="55" rx="8" fill={f('Cuádriceps')} {...trazo}>
            <title>Cuádriceps: {c('Cuádriceps')} veces</title>
          </rect>
          <rect x="76" y="156" width="8" height="46" rx="4" fill={f('Aductores')} {...trazo}>
            <title>Aductores: {c('Aductores')} veces</title>
          </rect>
          <circle cx="67" cy="214" r="9" fill={f('Rodilla')} {...trazo}>
            <title>Rodilla: {c('Rodilla')} veces</title>
          </circle>
          <circle cx="93" cy="214" r="9" fill={f('Rodilla')} {...trazo}>
            <title>Rodilla: {c('Rodilla')} veces</title>
          </circle>
          <rect x="60" y="222" width="14" height="44" rx="6" fill={f('Tibiales')} {...trazo}>
            <title>Tibiales: {c('Tibiales')} veces</title>
          </rect>
          <rect x="86" y="222" width="14" height="44" rx="6" fill={f('Tibiales')} {...trazo}>
            <title>Tibiales: {c('Tibiales')} veces</title>
          </rect>
          <circle cx="67" cy="270" r="7" fill={f('Tobillo')} {...trazo}>
            <title>Tobillo: {c('Tobillo')} veces</title>
          </circle>
          <circle cx="93" cy="270" r="7" fill={f('Tobillo')} {...trazo}>
            <title>Tobillo: {c('Tobillo')} veces</title>
          </circle>
          <ellipse cx="67" cy="283" rx="10" ry="6" fill={f('Pie')} {...trazo}>
            <title>Pie: {c('Pie')} veces</title>
          </ellipse>
          <ellipse cx="93" cy="283" rx="10" ry="6" fill={f('Pie')} {...trazo}>
            <title>Pie: {c('Pie')} veces</title>
          </ellipse>
        </svg>
      </div>

      <div className="cuerpo-columna">
        <h4>Vista posterior</h4>
        <svg viewBox="0 0 160 300" className="cuerpo-svg">
          <circle cx="80" cy="22" r="16" {...ESTILO_NEUTRO} />
          <rect x="72" y="36" width="16" height="12" rx="3" {...ESTILO_NEUTRO} />
          <ellipse cx="48" cy="56" rx="14" ry="10" {...ESTILO_NEUTRO} />
          <ellipse cx="112" cy="56" rx="14" ry="10" {...ESTILO_NEUTRO} />
          <rect x="30" y="60" width="16" height="45" rx="8" {...ESTILO_NEUTRO} />
          <rect x="114" y="60" width="16" height="45" rx="8" {...ESTILO_NEUTRO} />
          <circle cx="38" cy="110" r="8" {...ESTILO_NEUTRO} />
          <circle cx="122" cy="110" r="8" {...ESTILO_NEUTRO} />
          <rect x="28" y="114" width="16" height="38" rx="8" {...ESTILO_NEUTRO} />
          <rect x="116" y="114" width="16" height="38" rx="8" {...ESTILO_NEUTRO} />

          <rect x="58" y="50" width="44" height="34" rx="8" fill={f('Zona dorsal (espalda alta)')} {...trazo}>
            <title>Zona dorsal (espalda alta): {c('Zona dorsal (espalda alta)')} veces</title>
          </rect>
          <rect x="60" y="84" width="40" height="26" rx="8" fill={f('Zona lumbar')} {...trazo}>
            <title>Zona lumbar: {c('Zona lumbar')} veces</title>
          </rect>
          <ellipse cx="80" cy="128" rx="24" ry="16" fill={f('Glúteos')} {...trazo}>
            <title>Glúteos: {c('Glúteos')} veces</title>
          </ellipse>
          <rect x="58" y="152" width="18" height="55" rx="8" fill={f('Isquiotibiales')} {...trazo}>
            <title>Isquiotibiales: {c('Isquiotibiales')} veces</title>
          </rect>
          <rect x="84" y="152" width="18" height="55" rx="8" fill={f('Isquiotibiales')} {...trazo}>
            <title>Isquiotibiales: {c('Isquiotibiales')} veces</title>
          </rect>
          <rect x="60" y="222" width="14" height="44" rx="6" fill={f('Gemelos')} {...trazo}>
            <title>Gemelos: {c('Gemelos')} veces</title>
          </rect>
          <rect x="86" y="222" width="14" height="44" rx="6" fill={f('Gemelos')} {...trazo}>
            <title>Gemelos: {c('Gemelos')} veces</title>
          </rect>
          <ellipse cx="67" cy="283" rx="10" ry="6" {...ESTILO_NEUTRO} />
          <ellipse cx="93" cy="283" rx="10" ry="6" {...ESTILO_NEUTRO} />
        </svg>
      </div>
    </div>
  )
}
