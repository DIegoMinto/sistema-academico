import { useEffect, useState } from 'react';

import {
  obtenerCuentasZoom,
  crearCuentaZoom,
  actualizarCuentaZoom,
  actualizarEstadoZoom,
  eliminarCuentaZoom
} from '../services/cuentasZoom';


function CuentasZoom() {

  const [cuentas, setCuentas] = useState([]);

  const [busqueda, setBusqueda] = useState('');

  const [cargando, setCargando] = useState(true);

  const [error, setError] = useState('');

  const [mostrarFormulario, setMostrarFormulario] =
    useState(false);

  const [editando, setEditando] =
    useState(null);

  const [formulario, setFormulario] = useState({
    nombre: '',
    correo: '',
    password: ''
  });


  useEffect(() => {
    cargarCuentas();
  }, []);


  const cargarCuentas = async () => {

    try {

      setCargando(true);
      setError('');

      const data =
        await obtenerCuentasZoom();

      setCuentas(data);

    } catch (error) {

      console.error(error);

      setError(error.message);

    } finally {

      setCargando(false);

    }
  };


  const limpiarFormulario = () => {

    setFormulario({
      nombre: '',
      correo: '',
      password: ''
    });

    setEditando(null);

    setMostrarFormulario(false);

  };


  const abrirCrear = () => {

    setFormulario({
      nombre: '',
      correo: '',
      password: ''
    });

    setEditando(null);

    setError('');

    setMostrarFormulario(true);

  };


  const abrirEditar = (cuenta) => {

    setFormulario({
      nombre: cuenta.nombre,
      correo: cuenta.correo,
      password: ''
    });

    setEditando(cuenta);

    setError('');

    setMostrarFormulario(true);

  };


  const cambiarFormulario = (campo, valor) => {

    setFormulario(actual => ({
      ...actual,
      [campo]: valor
    }));

  };


  const guardar = async (event) => {

    event.preventDefault();

    try {

      setError('');

      if (editando) {

        await actualizarCuentaZoom(
          editando.id,
          formulario
        );

      } else {

        await crearCuentaZoom(
          formulario
        );

      }

      await cargarCuentas();

      limpiarFormulario();

    } catch (error) {

      console.error(error);

      setError(error.message);

    }

  };


  const cambiarEstado = async (cuenta) => {

    try {

      setError('');

      await actualizarEstadoZoom(
        cuenta.id,
        !cuenta.activa
      );

      setCuentas(actual =>
        actual.map(item =>
          item.id === cuenta.id
            ? {
                ...item,
                activa: !item.activa
              }
            : item
        )
      );

    } catch (error) {

      console.error(error);

      setError(error.message);

    }

  };


  const eliminar = async (cuenta) => {

    const confirmar = window.confirm(
      `¿Eliminar la cuenta "${cuenta.nombre}"?`
    );

    if (!confirmar) {
      return;
    }

    try {

      setError('');

      await eliminarCuentaZoom(
        cuenta.id
      );

      setCuentas(actual =>
        actual.filter(
          item => item.id !== cuenta.id
        )
      );

    } catch (error) {

      console.error(error);

      setError(error.message);

    }

  };


  const cuentasFiltradas =
    cuentas.filter(cuenta => {

      const texto = `
        ${cuenta.nombre}
        ${cuenta.correo}
      `.toLowerCase();

      return texto.includes(
        busqueda.toLowerCase()
      );

    });


  if (cargando) {

    return (
      <p>
        Cargando cuentas Zoom...
      </p>
    );

  }


  return (
    <section className="personal-page">

      <div className="page-header">

        <div>

          <h2>
            Cuentas Zoom
          </h2>

          <p>
            Gestiona las cuentas de Zoom
            disponibles para las sesiones
            académicas.
          </p>

        </div>

        <button
          type="button"
          className="button-primary"
          onClick={abrirCrear}
        >
          + Nueva cuenta
        </button>

      </div>


      {error && (
        <div className="page-error">
          {error}
        </div>
      )}


      <div className="personal-toolbar">

        <input
          type="search"
          placeholder="Buscar cuenta..."
          value={busqueda}
          onChange={event =>
            setBusqueda(
              event.target.value
            )
          }
        />

      </div>


      {mostrarFormulario && (

        <div className="form-card">

          <div className="form-card-header">

            <div>

              <h3>
                {editando
                  ? 'Editar cuenta Zoom'
                  : 'Nueva cuenta Zoom'}
              </h3>

              <p>
                {editando
                  ? 'Actualiza los datos de la cuenta.'
                  : 'Registra una nueva cuenta de Zoom.'}
              </p>

            </div>

          </div>


          <form
            className="form-grid"
            onSubmit={guardar}
          >

            <div className="form-field">

              <label>
                Nombre
              </label>

              <input
                type="text"
                value={formulario.nombre}
                onChange={event =>
                  cambiarFormulario(
                    'nombre',
                    event.target.value
                  )
                }
                placeholder="Ej. Zoom 01"
                required
              />

            </div>


            <div className="form-field">

              <label>
                Correo
              </label>

              <input
                type="email"
                value={formulario.correo}
                onChange={event =>
                  cambiarFormulario(
                    'correo',
                    event.target.value
                  )
                }
                placeholder="correo@gmail.com"
                required
              />

            </div>


            <div className="form-field">

              <label>
                Contraseña
              </label>

              <input
                type="password"
                value={formulario.password}
                onChange={event =>
                  cambiarFormulario(
                    'password',
                    event.target.value
                  )
                }
                placeholder={
                  editando
                    ? 'Dejar vacío para conservar la actual'
                    : 'Contraseña de Zoom'
                }
                required={!editando}
              />

            </div>


            <div className="form-actions">

              <button
                type="button"
                className="button-secondary"
                onClick={limpiarFormulario}
              >
                Cancelar
              </button>

              <button
                type="submit"
                className="button-primary"
              >
                {editando
                  ? 'Guardar cambios'
                  : 'Crear cuenta'}
              </button>

            </div>

          </form>

        </div>

      )}


      <div className="personal-table-container">

        <table className="personal-table">

          <thead>

            <tr>

              <th>N.º</th>

              <th>Cuenta</th>

              <th>Correo</th>

              <th>Estado</th>

              <th>Acciones</th>

            </tr>

          </thead>


          <tbody>

            {cuentasFiltradas.length === 0 ? (

              <tr>

                <td
                  colSpan="5"
                  className="empty-table"
                >
                  No hay cuentas Zoom registradas.
                </td>

              </tr>

            ) : (

              cuentasFiltradas.map(
                (cuenta, index) => (

                  <tr key={cuenta.id}>

                    <td className="personal-number">
                      {index + 1}
                    </td>


                    <td>

                      <div className="personal-name">
                        {cuenta.nombre}
                      </div>

                    </td>


                    <td>
                      {cuenta.correo}
                    </td>


                    <td>

                      <span
                        className={
                          cuenta.activa
                            ? 'status-badge status-active'
                            : 'status-badge status-inactive'
                        }
                      >
                        {cuenta.activa
                          ? 'Activa'
                          : 'Inactiva'}
                      </span>

                    </td>


                    <td>

                      <div className="table-actions">

                        <button
                          type="button"
                          className="table-button"
                          onClick={() =>
                            abrirEditar(cuenta)
                          }
                        >
                          Editar
                        </button>


                        <button
                          type="button"
                          className="table-button"
                          onClick={() =>
                            cambiarEstado(cuenta)
                          }
                        >
                          {cuenta.activa
                            ? 'Desactivar'
                            : 'Activar'}
                        </button>


                        <button
                          type="button"
                          className="table-button table-button-danger"
                          onClick={() =>
                            eliminar(cuenta)
                          }
                        >
                          Eliminar
                        </button>

                      </div>

                    </td>

                  </tr>

                )
              )

            )}

          </tbody>

        </table>

      </div>

    </section>
  );
}

export default CuentasZoom;