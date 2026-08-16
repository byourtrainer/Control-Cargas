// Función de servidor (Vercel) para eliminar la cuenta de un jugador.
// Se ejecuta en el servidor de Vercel, nunca en el navegador — es el único
// sitio donde es seguro usar la clave "service_role" de Supabase, que
// tiene acceso total a la base de datos sin restricciones de RLS.
//
// Requiere la variable de entorno SUPABASE_SERVICE_ROLE_KEY configurada
// en Vercel (Project Settings → Environment Variables) — NUNCA en el
// código, NUNCA en un archivo que se suba al repositorio.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { jugadorId } = req.body || {}
  if (!jugadorId) {
    return res.status(400).json({ error: 'Falta el identificador del jugador.' })
  }

  const urlSupabase = process.env.VITE_SUPABASE_URL
  const claveAnonima = process.env.VITE_SUPABASE_ANON_KEY
  const claveServicio = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!urlSupabase || !claveAnonima || !claveServicio) {
    return res.status(500).json({ error: 'Faltan variables de entorno en el servidor. Revisa la configuración en Vercel.' })
  }

  // 1. Comprobar que quien hace la petición está autenticado de verdad
  const token = (req.headers.authorization || '').replace('Bearer ', '')
  if (!token) {
    return res.status(401).json({ error: 'No autenticado.' })
  }

  const supabaseComoUsuario = createClient(urlSupabase, claveAnonima)
  const { data: { user }, error: errorUsuario } = await supabaseComoUsuario.auth.getUser(token)
  if (errorUsuario || !user) {
    return res.status(401).json({ error: 'Sesión no válida.' })
  }

  // A partir de aquí, usamos la clave de administrador — con todas las
  // comprobaciones de permisos hechas a mano, ya que esta clave se salta
  // las reglas normales de seguridad de la base de datos.
  const supabaseAdmin = createClient(urlSupabase, claveServicio)

  // 2. Comprobar que quien llama es de verdad un entrenador
  const { data: perfilLlamante } = await supabaseAdmin
    .from('perfiles').select('rol').eq('id', user.id).single()
  if (!perfilLlamante || perfilLlamante.rol !== 'entrenador') {
    return res.status(403).json({ error: 'Solo un entrenador puede eliminar jugadores.' })
  }

  // 3. Comprobar que el objetivo es un jugador (nunca se puede borrar a un entrenador por aquí)
  const { data: perfilObjetivo } = await supabaseAdmin
    .from('perfiles').select('rol, nombre').eq('id', jugadorId).single()
  if (!perfilObjetivo) {
    return res.status(404).json({ error: 'No se encontró ese jugador.' })
  }
  if (perfilObjetivo.rol !== 'jugador') {
    return res.status(403).json({ error: 'Solo se pueden eliminar cuentas de jugador.' })
  }

  // 4. Eliminar la cuenta — el borrado en cascada de la base de datos se
  // encarga de eliminar también su perfil y todos sus datos asociados.
  const { error: errorBorrado } = await supabaseAdmin.auth.admin.deleteUser(jugadorId)
  if (errorBorrado) {
    return res.status(500).json({ error: errorBorrado.message })
  }

  return res.status(200).json({ ok: true, nombre: perfilObjetivo.nombre })
}
