// Alcance de datos por club para entrenador/fisio.
//
// El administrador (perfil.rol === 'administrador') no tiene restricción:
// ve los jugadores y equipos de todos los clubes.
// Entrenador y fisio solo deben ver los jugadores y equipos de SU club
// (perfil.club_id), asignado por el administrador al crear su cuenta o
// elegido por ellos mismos la primera vez que entran (SeleccionarClub.jsx).
//
// clubIdDePerfil(perfil) devuelve:
//   - null  → sin restricción (administrador, o perfil aún no cargado)
//   - uuid  → el club_id al que debe limitarse la consulta (entrenador/fisio)
export function clubIdDePerfil(perfil) {
  if (!perfil) return null
  if (perfil.rol === 'administrador') return null
  return perfil.club_id ?? null
}

// Id "imposible" para usar en `.in(columna, ids)` cuando la lista de ids
// permitidos está vacía (p. ej. un club recién creado sin jugadores todavía).
// Supabase interpreta `.in(col, [])` como "sin condición" (trae todo), así
// que en vez de dejar la lista vacía se usa este id que nunca existirá.
export const ID_IMPOSIBLE = '00000000-0000-0000-0000-000000000000'

export function idsOimposible(ids) {
  return ids.length ? ids : [ID_IMPOSIBLE]
}
