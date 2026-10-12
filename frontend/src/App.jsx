import { useEffect, useState } from 'react';

import AppRoutes from './AppRoutes';
import { checkSession } from './services/auth';

function App() {
  const [usuario, setUsuario] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const verificarSesion = async () => {
      const data = await checkSession();

      if (data) {
        setUsuario(data.usuario);
      }

      setCargando(false);
    };

    verificarSesion();
  }, []);

  if (cargando) {
    return <p>Cargando...</p>;
  }

  return (
    <AppRoutes
      usuario={usuario}
      setUsuario={setUsuario}
    />
  );
}

export default App;