
import { useEffect, useMemo, useState } from 'react';

import {
  obtenerAsignaciones,
  previsualizarAsignacion,
  guardarAsignacion,
  eliminarAsignacion
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
    setMensaje('');
    setError('');
  }

  function editarModulo(modulo) {
    cambiarModulo(String(modulo.id_modulo));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function mostrarMensaje(texto, tipo = 'exito') {
    setMensaje(texto);
    setTipoMensaje(tipo);
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
      } else {
        mostrarMensaje(
          'No se encontraron cruces de horario para esta cuenta.'
        );
      }
    } catch (err) {
      setConflictos(err.conflictos || []);
      setError(err.message || 'No se pudo validar la asignación.');
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
        return;
      }

      const resultado = await guardarAsignacion(
        idModulo,
        idCuentaZoom
      );

      await recargarAsignaciones();

      mostrarMensaje(
        resultado.message || 'Cuenta Zoom asignada correctamente.'
      );
    } catch (err) {
      setConflictos(err.conflictos || []);
      setError(err.message || 'No se pudo guardar la asignación.');
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
                <label htmlFor="az-modulo">Diplomado y módulo</label>

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
                    setMensaje('');
                    setError('');
                  }}
                  disabled={procesando}
                >
                  <option value="">Selecciona una cuenta</option>

                  {cuentasDisponibles.map(cuenta => (
                    <option key={cuenta.id} value={cuenta.id}>
                      {cuenta.nombre} — {cuenta.correo}
                      {cuenta.activa ? '' : ' (Inactiva)'}
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
                  Cada programa contiene sus módulos, sesiones y
                  asignaciones de Zoom.
                </p>
              </div>
            </div>

            {diplomadosAgrupados.map(diplomado => {
              const totalSesiones = diplomado.modulos.reduce(
                (total, modulo) => total + obtenerSesiones(modulo).length,
                0
              );

              return (
                <section
                  className="az-programa-card"
                  key={diplomado.id}
                >
                  <header className="az-programa-header">
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
                  </header>

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

                    {Object.entries(conflicto).map(([clave, valor]) => (
                      <div className="az-conflicto-dato" key={clave}>
                        <span>
                          {clave
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, letra => letra.toUpperCase())}
                        </span>

                        <strong>
                          {valor == null || valor === ''
                            ? '—'
                            : String(valor)}
                        </strong>
                      </div>
                    ))}
                  </article>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  );
}

export default AsignacionZoom;
