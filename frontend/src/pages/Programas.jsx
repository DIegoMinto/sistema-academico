
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { obtenerProgramas } from '../services/programas';

function Programas() {
  const navigate = useNavigate();

  const abrirProgramacion = (programa) => {
  navigate(`/app/programas/${programa.id_curso}/programacion`, {
    state: { programa }
  });
};

const gestionarPrograma = (programa) => {
  navigate(`/app/programas/${programa.id_curso}`, {
    state: { programa }
  });
};

  const [programas, setProgramas] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [tipo, setTipo] = useState('');
  const [estado, setEstado] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargar = async () => {
      try {
        setCargando(true);
        setError('');

        const data = await obtenerProgramas();
        setProgramas(data);
      } catch (error) {
        console.error(error);
        setError(error.message);
      } finally {
        setCargando(false);
      }
    };

    cargar();
  }, []);

  const programasFiltrados = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return programas.filter(programa => {
      const nombre = (programa.nombre ?? '').toLowerCase();
      const codigo = (programa.codigo_curso ?? '').toLowerCase();

      const coincideBusqueda =
        !texto ||
        nombre.includes(texto) ||
        codigo.includes(texto);

      const coincideTipo =
        !tipo ||
        (programa.tipo ?? '').trim().toUpperCase() === tipo;

      const coincideEstado =
        !estado ||
        (programa.estado ?? '').trim().toLowerCase() ===
          estado.toLowerCase();

      return coincideBusqueda && coincideTipo && coincideEstado;
    });
  }, [programas, busqueda, tipo, estado]);

  const obtenerClaseEstado = estadoActual => {
    const valor = (estadoActual ?? '').trim().toLowerCase();

    if (valor === 'activo') {
      return 'status-badge status-active';
    }

    if (valor === 'en proceso') {
      return 'status-badge status-process';
    }

    return 'status-badge status-inactive';
  };

  if (cargando) {
    return <p>Cargando programas...</p>;
  }

  return (
    <section className="personal-page">
      <div className="page-header">
        <div>
          <h2>Programas</h2>
          <p>
            Consulta tus cursos y administra sus módulos y
            programación académica.
          </p>
        </div>
      </div>

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      <div className="personal-toolbar">
        <input
          type="search"
          placeholder="Buscar por nombre o código..."
          value={busqueda}
          onChange={event => setBusqueda(event.target.value)}
        />

        <select
          value={tipo}
          onChange={event => setTipo(event.target.value)}
        >
          <option value="">Todos los tipos</option>
          <option value="DIPLOMADO">Diplomados</option>
          <option value="PROGRAMA">Programas</option>
        </select>

        <select
          value={estado}
          onChange={event => setEstado(event.target.value)}
        >
          <option value="">Todos los estados</option>
          <option value="Activo">Activos</option>
          <option value="En proceso">En proceso</option>
          <option value="Finalizado">Finalizados</option>
        </select>
      </div>

      <div className="personal-table-container">
        <table className="personal-table">
          <thead>
            <tr>
              <th>N.º</th>
              <th>Código</th>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>

          <tbody>
            {programasFiltrados.length === 0 ? (
              <tr>
                <td colSpan="6" className="empty-table">
                  No se encontraron programas.
                </td>
              </tr>
            ) : (
              programasFiltrados.map((programa, index) => (
                <tr key={programa.id_curso}>
                  <td className="personal-number">
                    {index + 1}
                  </td>

                  <td>
                    <strong>{programa.codigo_curso}</strong>
                  </td>

                  <td>
                    <div className="personal-name">
                      {programa.nombre}
                    </div>
                  </td>

                  <td>{programa.tipo}</td>

                  <td>
                    <span className={obtenerClaseEstado(programa.estado)}>
                      {programa.estado}
                    </span>
                  </td>

<td>
  <div className="programas-actions">
    <button
      type="button"
      className="btn-programacion"
      onClick={() => abrirProgramacion(programa)}
    >
      <span>▦</span> Programación
    </button>

    <button
      type="button"
      className="btn-gestionar"
      onClick={() => gestionarPrograma(programa)}
    >
      Gestionar →
    </button>
  </div>
</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export default Programas;