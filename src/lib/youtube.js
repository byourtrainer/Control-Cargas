// Extrae el id de vídeo de YouTube de cualquiera de sus formatos de enlace
// habituales. Se usa tanto en la App (al añadir un ejercicio a mano) como en
// la sincronización desde Google Sheets.
export function extraerYoutubeId(url) {
  if (!url) return null
  const patronesUrl = [
    /youtu\.be\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/watch\?v=([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/,
    /youtube\.com\/embed\/([a-zA-Z0-9_-]{11})/,
    /studio\.youtube\.com\/video\/([a-zA-Z0-9_-]{11})/,
  ]
  for (const p of patronesUrl) {
    const m = url.match(p)
    if (m) return m[1]
  }
  return null
}
