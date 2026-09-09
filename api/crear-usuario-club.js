// Función de servidor (Vercel) para que el ADMINISTRADOR cree cuentas de
// entrenador o fisio para un club. Se ejecuta en el servidor, nunca en el
// navegador — es el único sitio seguro para usar la clave "service_role".
//
// Requiere la misma variable de entorno SUPABASE_SERVICE_ROLE_KEY que ya
// tienes configurada para la función de eliminar jugadores.

import { createClient } from '@supabase/supabase-js'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método no permitido' })
  }

  const { email, password, nombre, rol, clubId } = req.body || {}
  if (!email || !password || !nombre || !rol || !clubId) {
    return res.status(400).json({ error: 'Faltan datos: email, contraseña, nombre, rol y club son obligatorios.' })
  }
  if (rol !== 'entrenador' && rol !== 'fisio') {
    return res.status(400).json({ error: 'El rol debe ser "entrenador" o "fisio".' })
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

  const supabaseAdmin = createClient(urlSupabase, claveServicio)

  // 2. Comprobar que quien llama es de verdad un administrador
  const { data: perfilLlamante } = await supabaseAdmin
    .from('perfiles').select('rol').eq('id', user.id).single()
  if (!perfilLlamante || perfilLlamante.rol !== 'administrador') {
    return res.status(403).json({ error: 'Solo un administrador puede crear cuentas de entrenador o fisio.' })
  }

  // 3. Comprobar que el club existe de verdad
  const { data: club } = await supabaseAdmin.from('clubes').select('id').eq('id', clubId).single()
  if (!club) {
    return res.status(404).json({ error: 'No se encontró ese club.' })
  }

  // 4. Crear la cuenta y su perfil, ya con el rol y el club correctos
  const { data: nuevoUsuario, error: errorCreacion } = await supabaseAdmin.auth.admin.createUser({
    email, password, email_confirm: true,
  })
  if (errorCreacion) {
    return res.status(500).json({ error: errorCreacion.message })
  }

  const { error: errorPerfil } = await supabaseAdmin.from('perfiles').upsert({
    id: nuevoUsuario.user.id,
    nombre,
    rol,
    club_id: clubId,
  })
  if (errorPerfil) {
    // Si falla el perfil, deshace la cuenta creada para no dejarla a medias
    await supabaseAdmin.auth.admin.deleteUser(nuevoUsuario.user.id)
    return res.status(500).json({ error: errorPerfil.message })
  }

  return res.status(200).json({ ok: true, id: nuevoUsuario.user.id })
}
