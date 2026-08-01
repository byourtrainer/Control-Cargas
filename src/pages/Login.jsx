import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import './Login.css'

export default function Login() {
  const [modo, setModo] = useState('entrar') // 'entrar' | 'registrar'
  const [nombre, setNombre] = useState('')
  const [fechaNacimiento, setFechaNacimiento] = useState('')
  const [alturaM, setAlturaM] = useState('')
  const [pesoKg, setPesoKg] = useState('')
  const [sexo, setSexo] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [enviando, setEnviando] = useState(false)

  async function manejarEnvio(e) {
    e.preventDefault()
    setError(null)
    setAviso(null)
    setEnviando(true)

    if (modo === 'entrar') {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(traducirError(error.message))
    } else {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            nombre,
            fecha_nacimiento: fechaNacimiento,
            altura_m: alturaM,
            peso_corporal_kg: pesoKg,
            sexo,
          },
        },
      })
      if (error) {
        setError(traducirError(error.message))
      } else if (data.session) {
        // No hacía falta confirmar el correo: ya hay sesión activa, se entra directo.
        // No hace falta ningún aviso — el cambio de sesión lleva a la app automáticamente.
      } else {
        // Hace falta confirmar el correo antes de poder iniciar sesión.
        setAviso(`Te hemos enviado un correo a ${email} para confirmar tu cuenta. Ábrelo, pulsa el enlace, y vuelve aquí para iniciar sesión.`)
        setModo('entrar')
      }
    }
    setEnviando(false)
  }

  return (
    <div className="login-pantalla">
      <div className="login-tarjeta">
        <div className="login-marca">
          <span className="marca-punto" />
          <span className="mono">CONTROL DE CARGAS</span>
        </div>

        <h2>{modo === 'entrar' ? 'Iniciar sesión' : 'Crear cuenta'}</h2>
        <p className="login-sub">
          {modo === 'entrar'
            ? 'Accede con tu correo y contraseña.'
            : 'Regístrate para empezar a registrar tus sesiones.'}
        </p>

        <form onSubmit={manejarEnvio} className="login-form">
          {modo === 'registrar' && (
            <>
              <label className="campo">
                <span>Nombre completo</span>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  required
                  placeholder="Nombre y apellidos"
                />
              </label>

              <label className="campo">
                <span>Fecha de nacimiento</span>
                <input
                  type="date"
                  value={fechaNacimiento}
                  onChange={(e) => setFechaNacimiento(e.target.value)}
                  required
                />
              </label>

              <div className="campo-fila-doble">
                <label className="campo">
                  <span>Altura (m)</span>
                  <input
                    type="number" step="0.01" min="0"
                    value={alturaM}
                    onChange={(e) => setAlturaM(e.target.value)}
                    required
                    placeholder="1.78"
                  />
                </label>
                <label className="campo">
                  <span>Peso (kg)</span>
                  <input
                    type="number" step="0.1" min="0"
                    value={pesoKg}
                    onChange={(e) => setPesoKg(e.target.value)}
                    required
                    placeholder="75"
                  />
                </label>
              </div>

              <label className="campo">
                <span>Sexo</span>
                <select value={sexo} onChange={(e) => setSexo(e.target.value)} required>
                  <option value="" disabled>Selecciona una opción</option>
                  <option value="masculino">Masculino</option>
                  <option value="femenino">Femenino</option>
                  <option value="neutro">Neutro</option>
                </select>
              </label>
            </>
          )}

          <label className="campo">
            <span>Correo electrónico</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="tucorreo@ejemplo.com"
            />
          </label>

          <label className="campo">
            <span>Contraseña</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              placeholder="Mínimo 6 caracteres"
            />
          </label>

          {error && <div className="login-error">{error}</div>}
          {aviso && <div className="login-aviso">{aviso}</div>}

          <button type="submit" className="btn-principal" disabled={enviando}>
            {enviando ? 'Un momento…' : modo === 'entrar' ? 'Entrar' : 'Crear cuenta'}
          </button>
        </form>

        <button
          className="login-cambiar-modo"
          onClick={() => { setModo(modo === 'entrar' ? 'registrar' : 'entrar'); setError(null); setAviso(null) }}
        >
          {modo === 'entrar' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </button>
      </div>
    </div>
  )
}

function traducirError(msg) {
  if (msg.includes('Invalid login credentials')) return 'Correo o contraseña incorrectos.'
  if (msg.includes('already registered')) return 'Ese correo ya está registrado.'
  if (msg.includes('Password should be')) return 'La contraseña debe tener al menos 6 caracteres.'
  return msg
}
