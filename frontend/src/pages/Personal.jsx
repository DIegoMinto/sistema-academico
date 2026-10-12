import { useEffect, useState } from 'react';

import {
  obtenerPersonal,
  actualizarMonitoreo
} from '../services/personal';

function Personal() {
  const [personal, setPersonal] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    cargarPersonal();
  }, []);

  const cargarPersonal = async () => {
    try {
      setCargando(true);
      setError('');

      const data = await obtenerPersonal();

      setPersonal(data);

    } catch (error) {
      console.error(error);
      setError(error.message);

    } finally {
      setCargando(false);
    }
  };

  const cambiarMonitoreo = async (
    idPersona,
    monitorea
  ) => {
    try {
      await actualizarMonitoreo(
        idPersona,
        monitorea
      );

      setPersonal(personalActual =>
        personalActual.map(persona =>
          persona.id_persona === idPersona
            ? {
                ...persona,
                monitorea
              }
            : persona
        )
      );

    } catch (error) {
      console.error(error);
      setError(error.message);
    }
  };

  const personalFiltrado = personal.filter(persona => {

    const nombreCompleto = [
      persona.nombre,
      persona.apellido_p,
      persona.apellido_m
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return nombreCompleto.includes(
      busqueda.toLowerCase()
    );
  });

  if (cargando) {
    return <p>Cargando personal...</p>;
  }

  return (
    <section className="personal-page">

      <div className="page-header">
        <div>
          <h2>Personal</h2>

          <p>
            Gestiona el personal disponible para
            las actividades académicas.
          </p>
        </div>
      </div>

      <div className="personal-toolbar">

        <input
          type="search"
          placeholder="Buscar personal..."
          value={busqueda}
          onChange={event =>
            setBusqueda(event.target.value)
          }
        />

      </div>

      {error && (
        <div className="page-error">
          {error}
        </div>
      )}

      <div className="personal-table-container">

        <table className="personal-table">

          <thead>
            <tr>
                <th>N.º</th>
              <th>Personal</th>
              <th>Monitor</th>
            </tr>
          </thead>

          <tbody>
  {personalFiltrado.map((persona, index) => (
    <tr key={persona.id_persona}>
      <td className="personal-number">
        {index + 1}
      </td>

      <td>
        <div className="personal-name">
          {persona.apellido_p}{' '}
          {persona.apellido_m}{' '}
          {persona.nombre}
        </div>
      </td>

      <td>
        <label className="switch">
          <input
            type="checkbox"
            checked={persona.monitorea}
            onChange={event =>
              cambiarMonitoreo(
                persona.id_persona,
                event.target.checked
              )
            }
          />
          <span className="slider"></span>
        </label>
      </td>
    </tr>
  ))}
</tbody>

        </table>

      </div>

    </section>
  );
}

export default Personal;