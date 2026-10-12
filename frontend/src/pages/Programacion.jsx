
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';

import { obtenerModulos, obtenerMonitoras } from '../services/modulos';

function Programacion() {
  const { id } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const programa = location.state?.programa;

  const [modulos, setModulos] = useState([]);
  const [monitoras, setMonitoras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        setCargando(true);
        setError('');

        const [modulosData, monitorasData] = await Promise.all([
          obtenerModulos(id),
          obtenerMonitoras()
        ]);

        setModulos(modulosData);
        setMonitoras(monitorasData);
      } catch (err) {
        console.error(err);
        setError(err.message || 'No se pudo cargar la programación.');
      } finally {
        setCargando(false);
      }
    };

    cargarDatos();
  }, [id]);

  const obtenerMonitor = (modulo) => {
    const monitora = monitoras.find(
      (persona) =>
        String(persona.id_persona) ===
        String(modulo.id_persona_asesora)
    );

    return monitora?.nombre || 'Sin asignar';
  };


const formatearFecha = (fecha) => {
  if (!fecha) return 'Sin programar';

  const [anio, mes, dia] = fecha.slice(0, 10).split('-');

  return `${dia}/${mes}/${anio}`;
};

const obtenerFecha = (modulo, extremo) => {
  const fechas = (modulo.sesiones || [])
    .map((sesion) => sesion.fecha)
    .filter(Boolean)
    .sort();

  if (fechas.length === 0) {
    if (extremo === 'inicio' && modulo.fecha_inicio) {
      return formatearFecha(modulo.fecha_inicio);
    }

    return 'Sin programar';
  }

  const fecha = extremo === 'inicio'
    ? fechas[0]
    : fechas[fechas.length - 1];

  return formatearFecha(fecha);
};

const obtenerDias = (modulo) => {
  if (!modulo.dias_clase) {
    return 'Sin programar';
  }

  const nombresDias = {
    1: 'Lunes',
    2: 'Martes',
    3: 'Miércoles',
    4: 'Jueves',
    5: 'Viernes',
    6: 'Sábado',
    7: 'Domingo'
  };

  let dias = modulo.dias_clase;

  // Admite tanto arreglos como cadenas: "2, 4, 6"
  if (typeof dias === 'string') {
    dias = dias.split(',').map(dia => dia.trim());
  }

  if (!Array.isArray(dias)) {
    return 'Sin programar';
  }

  return dias
    .map(dia => nombresDias[Number(dia)])
    .filter(Boolean)
    .join(', ') || 'Sin programar';
};


  const abrirDetalle = () => {
    navigate(`/app/programas/${id}`, {
      state: { programa }
    });
  };

  return (
    <section className="personal-page programacion-page">
      <div className="page-header">
        <div>
          <button
            type="button"
            className="programacion-back"
            onClick={() => navigate('/app/programas')}
          >
            ← Volver a programas
          </button>

          <h2>Programación académica</h2>

          <p>
            {programa?.nombre ||
              `Programa #${id}`}
          </p>
        </div>

        <button
          type="button"
          className="btn-programacion-primary"
          onClick={abrirDetalle}
        >
          + Agregar módulos
        </button>
      </div>

      {error && <div className="page-error">{error}</div>}

      {cargando ? (
        <p>Cargando programación...</p>
      ) : (
        <div className="personal-table-container">
          <table className="personal-table">
            <thead>
              <tr>
                <th>Módulo</th>
                <th>Fecha inicio</th>
                <th>Fecha fin</th>
                <th>Días</th>
                <th>Monitor</th>
              </tr>
            </thead>

            <tbody>
              {modulos.length === 0 ? (
                <tr>
                  <td colSpan="5" className="empty-table">
                    Este programa todavía no tiene módulos.
                    Puedes comenzar agregando uno.
                  </td>
                </tr>
              ) : (
                modulos.map((modulo) => (
                  <tr key={modulo.id_modulo}>
                    <td>
                      <strong>{modulo.nombre}</strong>
                    </td>

                    <td>{obtenerFecha(modulo, 'inicio')}</td>

                    <td>{obtenerFecha(modulo, 'fin')}</td>

                    <td>{obtenerDias(modulo)}</td>

                    <td>{obtenerMonitor(modulo)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default Programacion;
