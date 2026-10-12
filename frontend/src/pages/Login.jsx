import { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { login } from '../services/auth';

function Login({ onLogin }) {
  const navigate = useNavigate();

  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const handleSubmit = async (event) => {
    event.preventDefault();

    setError('');
    setCargando(true);

    try {
      const data = await login(
        usuario,
        password
      );

      onLogin(data.usuario);

      navigate('/app');

    } catch (error) {
      console.error(error);

      setError(error.message);

    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="login-page">

      <div className="login-card">

        <h1>Posicionate Académico</h1>

        <p>
          Inicia sesión para continuar
        </p>

        <form onSubmit={handleSubmit}>

          <label>
            Usuario
          </label>

          <input
            type="text"
            value={usuario}
            onChange={event =>
              setUsuario(event.target.value)
            }
            placeholder="Ingresa tu usuario"
            autoComplete="username"
          />

          <label>
            Contraseña
          </label>

          <input
            type="password"
            value={password}
            onChange={event =>
              setPassword(event.target.value)
            }
            placeholder="Ingresa tu contraseña"
            autoComplete="current-password"
          />

          {error && (
            <div className="login-error">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={cargando}
          >
            {cargando
              ? 'Ingresando...'
              : 'Iniciar sesión'}
          </button>

        </form>

      </div>

    </div>
  );
}

export default Login;