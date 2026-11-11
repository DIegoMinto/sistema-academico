
import { useEffect, useMemo, useState } from 'react';

import {
  obtenerAsignaciones,
  previsualizarAsignacion,
  guardarAsignacion,
  eliminarAsignacion,
  obtenerAlternativasZoom
} from '../services/asignacionZoom';

import { obtenerCuentasZoom } from '../services/cuentasZoom';

import './AsignacionZoom.css';

function formatearFecha(fecha) {
  if (!fecha) return 'Fecha pendiente';

  const texto = String(fecha).slice(0, 10);
  const partes = texto.split('-');

  if (partes.length !== 3) return texto;

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function formatearHora(hora) {
  return hora ? String(hora).slice(0, 5) : '--:--';
}

function obtenerSesiones(modulo) {
  if (Array.isArray(modulo?.sesiones)) {
    return modulo.sesiones;
  }

  if (typeof modulo?.sesiones === 'string') {
    try {
      const sesiones = JSON.parse(modulo.sesiones);
      return Array.isArray(sesiones) ? sesiones : [];
    } catch {
      return [];
    }
  }

  return [];
}

function agruparPorDiplomado(modulos) {
  return Object.values(
    modulos.reduce((grupos, modulo) => {
      const clave = modulo.id_curso ?? modulo.nombre_curso;

      if (!grupos[clave]) {
        grupos[clave] = {
          id: clave,
          nombre: modulo.nombre_curso,
          modulos: []
        };
      }

      grupos[clave].modulos.push(modulo);

      return grupos;
    }, {})
  );
}

function AsignacionZoom() {
  const [modulos, setModulos] = useState([]);
  const [cuentas, setCuentas] = useState([]);

  const [idModulo, setIdModulo] = useState('');
  const [idCuentaZoom, setIdCuentaZoom] = useState('');

  const [conflictos, setConflictos] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [tipoMensaje, setTipoMensaje] = useState('exito');

  const [cargando, setCargando] = useState(true);
  const [procesando, setProcesando] = useState(false);
  const [error, setError] = useState('');

  const [alternativas, setAlternativas] = useState([]);
  const [cargandoAlternativas, setCargandoAlternativas] = useState(false);
  const [mostrarAlternativas, setMostrarAlternativas] = useState(false);

  const [diplomadosExpandidos, setDiplomadosExpandidos] = useState([]);

  const moduloActual = useMemo(
    () =>
      modulos.find(
        modulo => String(modulo.id_modulo) === String(idModulo)
      ),
    [modulos, idModulo]
  );

  const sesiones = obtenerSesiones(moduloActual);

  const diplomadosAgrupados = useMemo(
    () => agruparPorDiplomado(modulos),
    [modulos]
  );

  const cuentasDisponibles = cuentas.filter(cuenta => (
    cuenta.activa === true ||
    String(cuenta.id) === String(
      moduloActual?.asignacion?.id_cuenta_zoom ?? ''
    )
  ));

  useEffect(() => {
    cargarDatos();
  }, []);

  async function cargarDatos() {
    try {
      setCargando(true);
      setError('');

      const [asignacionesData, cuentasData] = await Promise.all([
        obtenerAsignaciones(),
        obtenerCuentasZoom()
      ]);

      setModulos(asignacionesData);
      setCuentas(cuentasData);

      if (asignacionesData.length > 0) {
        const moduloSeleccionado = asignacionesData.find(
          modulo => String(modulo.id_modulo) === String(idModulo)
        ) || asignacionesData[0];

        setIdModulo(String(moduloSeleccionado.id_modulo));

        setIdCuentaZoom(
          moduloSeleccionado.asignacion?.id_cuenta_zoom
            ? String(moduloSeleccionado.asignacion.id_cuenta_zoom)
            : ''
        );
      } else {
        setIdModulo('');
        setIdCuentaZoom('');
      }
    } catch (err) {
      setError(err.message || 'No se pudieron cargar los datos.');
    } finally {
      setCargando(false);
    }
  }

  async function consultarAlternativas() {
    if (!idModulo) return;

    try {
      setCargandoAlternativas(true);
      setMostrarAlternativas(true);
      setAlternativas([]);

      const resultado = await obtenerAlternativasZoom(idModulo);

      setAlternativas(resultado.alternativas || []);
    } catch (err) {
      setError(err.message || 'No se pudieron consultar las alternativas.');
    } finally {
      setCargandoAlternativas(false);
    }
  }

  function cambiarModulo(nuevoId) {
    const modulo = modulos.find(
      item => String(item.id_modulo) === String(nuevoId)
    );

    setIdModulo(String(nuevoId));

    setIdCuentaZoom(
      modulo?.asignacion?.id_cuenta_zoom
        ? String(modulo.asignacion.id_cuenta_zoom)
        : ''
    );

    setConflictos([]);
    setAlternativas([]);
    setMostrarAlternativas(false);
    setMensaje('');
    setError('');
  }

  function alternarDiplomado(id) {
    setDiplomadosExpandidos(actuales =>
      actuales.includes(id)
        ? actuales.filter(item => item !== id)
        : [...actuales, id]
    );
  }

  function editarModulo(modulo) {
    cambiarModulo(String(modulo.id_modulo));

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  function mostrarMensaje(texto, tipo = 'exito') {
    setMensaje(texto);
    setTipoMensaje(tipo);
  }

  function seleccionarAlternativa(cuenta) {
    setIdCuentaZoom(String(cuenta.id));
    setConflictos([]);
    setAlternativas([]);
    setMostrarAlternativas(false);

    mostrarMensaje(
      `Seleccionaste ${cuenta.nombre}. Ya puedes guardar la asignación.`
    );
  }

  async function validarAsignacion() {
    if (!idModulo || !idCuentaZoom) {
      setError('Selecciona un módulo y una cuenta Zoom.');
      return;
    }

    try {
      setProcesando(true);
      setError('');
      setMensaje('');

      setAlternativas([]);
      setMostrarAlternativas(false);

      const resultado = await previsualizarAsignacion(
        idModulo,
        idCuentaZoom
      );

      const listaConflictos = resultado.conflictos || [];

      setConflictos(listaConflictos);

      if (listaConflictos.length > 0) {
        mostrarMensaje(
          'Esta cuenta tiene sesiones que se cruzan con las del módulo seleccionado.',
          'advertencia'
        );

        await consultarAlternativas();
      } else {
        mostrarMensaje(
          'No se encontraron cruces de horario para esta cuenta.'
        );
      }
    } catch (err) {
      const listaConflictos = err.conflictos || [];

      setConflictos(listaConflictos);

      if (listaConflictos.length > 0) {
        mostrarMensaje(
          'Se encontraron cruces de horario.',
          'advertencia'
        );

        await consultarAlternativas();
      } else {
        setError(err.message || 'No se pudo validar la asignación.');
      }
    } finally {
      setProcesando(false);
    }
  }

  async function asignarCuenta() {
    if (!idModulo || !idCuentaZoom) {
      setError('Selecciona un módulo y una cuenta Zoom.');
      return;
    }

    try {
      setProcesando(true);
      setError('');
      setMensaje('');

      const validacion = await previsualizarAsignacion(
        idModulo,
        idCuentaZoom
      );

      const listaConflictos = validacion.conflictos || [];

      setConflictos(listaConflictos);

      if (listaConflictos.length > 0) {
        mostrarMensaje(
          'No se guardó la asignación porque existen cruces de horario.',
          'advertencia'
        );

        await consultarAlternativas();
        return;
      }

      const resultado = await guardarAsignacion(
        idModulo,
        idCuentaZoom
      );

      await recargarAsignaciones();

      setConflictos([]);
      setAlternativas([]);
      setMostrarAlternativas(false);

      mostrarMensaje(
        resultado.message || 'Cuenta Zoom asignada correctamente.'
      );
    } catch (err) {
      const listaConflictos = err.conflictos || [];

      setConflictos(listaConflictos);

      if (listaConflictos.length > 0) {
        mostrarMensaje(
          'La cuenta dejó de estar disponible. Revisa las alternativas.',
          'advertencia'
        );

        await consultarAlternativas();
      } else {
        setError(err.message || 'No se pudo guardar la asignación.');
      }
    } finally {
      setProcesando(false);
    }
  }

  async function recargarAsignaciones() {
    const data = await obtenerAsignaciones();

    setModulos(data);

    const modulo = data.find(
      item => String(item.id_modulo) === String(idModulo)
    );

    setIdCuentaZoom(
      modulo?.asignacion?.id_cuenta_zoom
        ? String(modulo.asignacion.id_cuenta_zoom)
        : ''
    );
  }

  async function quitarAsignacion(modulo = moduloActual) {
    if (!modulo?.asignacion) return;

    const confirmar = window.confirm(
      `¿Quitar la cuenta Zoom del módulo "${modulo.nombre_modulo}"?`
    );

    if (!confirmar) return;

    try {
      setProcesando(true);
      setError('');
      setMensaje('');

      const resultado = await eliminarAsignacion(modulo.id_modulo);

      await recargarAsignaciones();

      setConflictos([]);
      setAlternativas([]);
      setMostrarAlternativas(false);

      mostrarMensaje(
        resultado.message || 'Asignación eliminada correctamente.'
      );
    } catch (err) {
      setError(err.message || 'No se pudo quitar la asignación.');
    } finally {
      setProcesando(false);
    }
  }

  if (cargando) {
    return (
      <section className="personal-page">
        <p>Cargando asignaciones Zoom...</p>
      </section>
    );
  }

  return (
    <section className="personal-page asignacion-zoom-page">

      <div className="page-header">
        <div>
          <h2>Asignación Zoom</h2>
          <p>
            Administra las cuentas Zoom de cada módulo y consulta
            sus sesiones programadas.
          </p>
        </div>

        <button
          type="button"
          className="button-secondary"
          onClick={cargarDatos}
          disabled={procesando}
        >
          Actualizar datos
        </button>
      </div>

      {error && <div className="page-error">{error}</div>}

      {mensaje && (
        <div className={`az-mensaje az-mensaje-${tipoMensaje}`}>
          {mensaje}
        </div>
      )}

      {modulos.length === 0 ? (
        <div className="az-panel az-vacio">
          <h3>No hay módulos disponibles</h3>
          <p>
            Primero registra un programa y sus módulos en la sección
            Programas.
          </p>
        </div>
      ) : (
        <>

          {/* FORMULARIO DE ASIGNACIÓN */}

          <div className="az-panel" id="az-formulario">

            <div className="az-panel-titulo">
              <div>
                <h3>Configurar asignación</h3>
                <p>
                  Selecciona el módulo y la cuenta Zoom que utilizará.
                </p>
              </div>
            </div>

            <div className="az-formulario">

              <div className="form-field">
                <label htmlFor="az-modulo">
                  Diplomado y módulo
                </label>

                <select
                  id="az-modulo"
                  value={idModulo}
                  onChange={event => cambiarModulo(event.target.value)}
                  disabled={procesando}
                >
                  {modulos.map(modulo => (
                    <option
                      key={modulo.id_modulo}
                      value={modulo.id_modulo}
                    >
                      {modulo.nombre_curso} — {modulo.nombre_modulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-field">
                <label htmlFor="az-cuenta">Cuenta Zoom</label>

                <select
                  id="az-cuenta"
                  value={idCuentaZoom}
                  onChange={event => {
                    setIdCuentaZoom(event.target.value);
                    setConflictos([]);
                    setAlternativas([]);
                    setMostrarAlternativas(false);
                    setMensaje('');
                    setError('');
                  }}
                  disabled={procesando}
                >
                  <option value="">Selecciona una cuenta</option>

                  {cuentasDisponibles.map(cuenta => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre} — {cuenta.correo}
                      {!cuenta.activa ? ' (Inactiva)' : ''}
                    </option>
                  ))}
                </select>

                {cuentasDisponibles.length === 0 && (
                  <small className="az-ayuda">
                    No hay cuentas activas. Registra o activa una en
                    Gestión de datos → Cuentas Zoom.
                  </small>
                )}
              </div>

            </div>

            {moduloActual && (
              <div className="az-resumen">

                <div>
                  <span className="az-etiqueta">Diplomado</span>
                  <strong>{moduloActual.nombre_curso}</strong>
                </div>

                <div>
                  <span className="az-etiqueta">Módulo</span>
                  <strong>{moduloActual.nombre_modulo}</strong>
                </div>

                <div>
                  <span className="az-etiqueta">Sesiones programadas</span>
                  <strong>{sesiones.length}</strong>
                </div>

                <div>
                  <span className="az-etiqueta">Asignación actual</span>
                  <strong>
                    {moduloActual.asignacion?.nombre || 'Sin asignar'}
                  </strong>
                </div>

              </div>
            )}

            <div className="az-acciones">

              <button
                type="button"
                className="button-secondary"
                onClick={validarAsignacion}
                disabled={procesando || !idModulo || !idCuentaZoom}
              >
                Comprobar disponibilidad
              </button>

              <button
                type="button"
                className="button-primary"
                onClick={asignarCuenta}
                disabled={procesando || !idModulo || !idCuentaZoom}
              >
                {procesando ? 'Procesando...' : 'Guardar asignación'}
              </button>

              {moduloActual?.asignacion && (
                <button
                  type="button"
                  className="az-btn-quitar"
                  onClick={() => quitarAsignacion()}
                  disabled={procesando}
                >
                  Quitar asignación
                </button>
              )}

            </div>
          </div>

          {/* LISTADO AGRUPADO POR DIPLOMADO */}

          <div className="az-listado-programas">

            <div className="az-listado-encabezado">
              <div>
                <h3>Programas y sesiones</h3>
                <p>
                  Pulsa sobre un diplomado para consultar sus módulos
                  y sesiones.
                </p>
              </div>
            </div>

            {diplomadosAgrupados.map(diplomado => {

              const totalSesiones = diplomado.modulos.reduce(
                (total, modulo) =>
                  total + obtenerSesiones(modulo).length,
                0
              );

              const expandido = diplomadosExpandidos.includes(
                diplomado.id
              );

              return (
                <section
                  className="az-programa-card"
                  key={diplomado.id}
                >

                  <button
                    type="button"
                    className="az-programa-header"
                    onClick={() => alternarDiplomado(diplomado.id)}
                    aria-expanded={expandido}
                  >
                    <div className="az-programa-icono">
                      <span aria-hidden="true">▦</span>
                    </div>

                    <div className="az-programa-titulo">
                      <h3>{diplomado.nombre}</h3>
                      <p>
                        {diplomado.modulos.length} módulo(s)
                        {' · '}
                        {totalSesiones} sesión(es)
                      </p>
                    </div>

                    <span className="az-programa-flecha">
                      {expandido ? '−' : '+'}
                    </span>
                  </button>

                  {expandido && (
                    <div className="az-programa-modulos">

                      {diplomado.modulos.map(modulo => {

                        const sesionesModulo = obtenerSesiones(modulo);

                        return (
                          <article
                            className="az-modulo-card"
                            key={modulo.id_modulo}
                          >

                            <header className="az-modulo-header">

                              <div className="az-modulo-titulo">
                                <span className="az-modulo-etiqueta">
                                  MÓDULO
                                </span>

                                <h4>{modulo.nombre_modulo}</h4>

                                <p>
                                  <span className="az-cuenta-punto" />
                                  {modulo.asignacion?.nombre ||
                                    'Sin cuenta Zoom asignada'}
                                </p>
                              </div>

                              <div className="az-acciones-tabla">

                                <button
                                  type="button"
                                  className="button-secondary"
                                  onClick={() => editarModulo(modulo)}
                                  disabled={procesando}
                                >
                                  Editar
                                </button>

                                {modulo.asignacion && (
                                  <button
                                    type="button"
                                    className="az-btn-quitar"
                                    onClick={() => quitarAsignacion(modulo)}
                                    disabled={procesando}
                                  >
                                    Eliminar
                                  </button>
                                )}

                              </div>
                            </header>

                            <div className="az-sesiones-lista">

                              {sesionesModulo.length === 0 ? (
                                <p className="az-sin-sesiones">
                                  Este módulo todavía no tiene sesiones
                                  programadas.
                                </p>
                              ) : (
                                sesionesModulo.map((sesion, indice) => (
                                  <div
                                    className="az-sesion-fila"
                                    key={sesion.id_sesion ?? indice}
                                  >

                                    <div className="az-sesion-numero">
                                      {indice + 1}
                                    </div>

                                    <div className="az-sesion-info">
                                      <strong>
                                        {sesion.titulo ||
                                          `Sesión ${indice + 1}`}
                                      </strong>

                                      <span>
                                        {formatearFecha(sesion.fecha)}
                                        {' · '}
                                        {formatearHora(sesion.hora_inicio)}
                                        {' – '}
                                        {formatearHora(sesion.hora_fin)}
                                      </span>
                                    </div>

                                    <span className="az-sesion-estado">
                                      {sesion.estado || 'Programada'}
                                    </span>

                                  </div>
                                ))
                              )}

                            </div>
                          </article>
                        );
                      })}

                    </div>
                  )}

                </section>
              );
            })}

          </div>

          {/* CONFLICTOS DE HORARIO */}

          {conflictos.length > 0 && (
            <div className="az-panel az-panel-conflictos">

              <div className="az-panel-titulo">
                <div>
                  <h3>Conflictos de horario</h3>
                  <p>
                    Se encontraron {conflictos.length} cruce(s).
                    La asignación no se guardará mientras existan.
                  </p>
                </div>

                <span className="az-conflictos-contador">
                  {conflictos.length}
                </span>
              </div>

              <div className="az-lista-conflictos">

                {conflictos.map((conflicto, index) => (
                  <article
                    className="az-conflicto"
                    key={`${index}-${JSON.stringify(conflicto)}`}
                  >

                    <h4>Conflicto {index + 1}</h4>

                    <div className="az-conflicto-sesion">

                      <span className="az-conflicto-etiqueta">
                        Módulo que intentas asignar
                      </span>

                      <strong>{moduloActual?.nombre_curso}</strong>
                      <strong>{moduloActual?.nombre_modulo}</strong>

                      <p>
                        {conflicto.sesion_nueva || 'Sesión sin título'}
                      </p>

                      <span>
                        {formatearFecha(conflicto.fecha_nueva)}
                        {' · '}
                        {formatearHora(conflicto.hora_inicio_nueva)}
                        {' – '}
                        {formatearHora(conflicto.hora_fin_nueva)}
                      </span>

                    </div>

                    <div className="az-conflicto-separador">
                      Se cruza con
                    </div>

                    <div className="az-conflicto-sesion az-conflicto-ocupada">

                      <span className="az-conflicto-etiqueta">
                        Sesión que ya ocupa la cuenta
                      </span>

                      <strong>{conflicto.curso}</strong>
                      <strong>{conflicto.modulo}</strong>

                      <p>
                        {conflicto.sesion || 'Sesión sin título'}
                      </p>

                      <span>
                        {formatearFecha(conflicto.fecha)}
                        {' · '}
                        {formatearHora(conflicto.hora_inicio)}
                        {' – '}
                        {formatearHora(conflicto.hora_fin)}
                      </span>

                    </div>

                  </article>
                ))}

              </div>
            </div>
          )}

          {/* CUENTAS ZOOM ALTERNATIVAS */}

          {mostrarAlternativas && (
            <div className="az-panel az-panel-alternativas">

              <div className="az-panel-titulo">
                <div>
                  <h3>Otras cuentas Zoom</h3>
                  <p>
                    Consulta qué cuentas están disponibles para
                    programar este módulo.
                  </p>
                </div>
              </div>

              {cargandoAlternativas ? (
                <p>Consultando disponibilidad de las cuentas...</p>
              ) : alternativas.length === 0 ? (
                <p>
                  No hay cuentas Zoom activas registradas para consultar.
                </p>
              ) : (
                <div className="az-lista-alternativas">

                  {alternativas.map(cuenta => (
                    <article
                      className={`az-alternativa ${
                        cuenta.disponible
                          ? 'az-alternativa-libre'
                          : 'az-alternativa-ocupada'
                      }`}
                      key={cuenta.id}
                    >

                      <div className="az-alternativa-info">

                        <strong>{cuenta.nombre}</strong>

                        <span>{cuenta.correo}</span>

                        <span className="az-alternativa-estado">
                          {cuenta.disponible
                            ? 'Disponible'
                            : `${cuenta.conflictos?.length || 0} cruce(s) de horario`}
                        </span>

                      </div>

                      {cuenta.disponible ? (
                        <button
                          type="button"
                          className="button-primary"
                          disabled={procesando}
                          onClick={() => seleccionarAlternativa(cuenta)}
                        >
                          Seleccionar
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="button-secondary"
                          disabled
                        >
                          No disponible
                        </button>
                      )}

                    </article>
                  ))}

                </div>
              )}

            </div>
          )}

        </>
      )}

    </section>
  );
}

export default AsignacionZoom;
