
import { useEffect, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import {
  obtenerModulos,
  actualizarModulo,
  eliminarModulo,
  obtenerMonitoras,
  crearMultiplesModulos,
  previsualizarAsignacion
} from '../services/modulos';
import './CursoDetalle.css';

const DIAS = [
  { valor: 1, nombre: 'Lun' },
  { valor: 2, nombre: 'Mar' },
  { valor: 3, nombre: 'Mié' },
  { valor: 4, nombre: 'Jue' },
  { valor: 5, nombre: 'Vie' },
  { valor: 6, nombre: 'Sáb' },
  { valor: 0, nombre: 'Dom' }
];

function claveNueva() {
  return globalThis.crypto?.randomUUID?.() ||
    `mod-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function moduloVacio(orden = 1) {
  return {
    clave: claveNueva(),
    nombre: '',
    descripcion: '',
    orden,
    fecha_inicio: '',
    dias_clase: [2, 4],
    cantidad_sesiones: 4,
    hora_inicio: '19:00',
    hora_fin: '21:00',
    id_persona_asesora: '',
    motivoAsignacion: '',
    sesiones: []
  };
}

function generarFechas(fechaInicio, dias, cantidad) {
  const fechas = [];
  const fecha = new Date(`${fechaInicio}T12:00:00Z`);
  let revisados = 0;

  while (fechas.length < cantidad && revisados < 3660) {
    if (dias.includes(fecha.getUTCDay())) {
      fechas.push([
        fecha.getUTCFullYear(),
        String(fecha.getUTCMonth() + 1).padStart(2, '0'),
        String(fecha.getUTCDate()).padStart(2, '0')
      ].join('-'));
    }

    fecha.setUTCDate(fecha.getUTCDate() + 1);
    revisados++;
  }

  return fechas;
}

function crearSesiones(modulo) {
  const cantidad = Number(modulo.cantidad_sesiones);

  if (!modulo.nombre.trim()) {
    throw new Error('Escribe el nombre del módulo.');
  }

  if (!modulo.fecha_inicio) {
    throw new Error('Selecciona la fecha de inicio.');
  }

  if (!modulo.dias_clase.length) {
    throw new Error('Selecciona al menos un día de clase.');
  }

  if (!Number.isInteger(cantidad) || cantidad < 1 || cantidad > 200) {
    throw new Error('La cantidad de sesiones debe estar entre 1 y 200.');
  }

  if (
    !modulo.hora_inicio ||
    !modulo.hora_fin ||
    modulo.hora_fin <= modulo.hora_inicio
  ) {
    throw new Error('La hora final debe ser posterior a la hora de inicio.');
  }

  const fechas = generarFechas(
    modulo.fecha_inicio,
    modulo.dias_clase,
    cantidad
  );

  if (fechas.length !== cantidad) {
    throw new Error('No se pudieron generar todas las fechas.');
  }

  return fechas.map((fecha, i) => ({
    titulo: `${modulo.nombre.trim()} - Sesión ${i + 1}`,
    fecha,
    hora_inicio: modulo.hora_inicio,
    hora_fin: modulo.hora_fin
  }));
}

function CursoDetalle() {
  const { id } = useParams();
  const { state } = useLocation();
  const navigate = useNavigate();
  const programa = state?.programa;

  const [modulos, setModulos] = useState([]);
  const [cargando, setCargando] = useState(true);

  const [monitoras, setMonitoras] = useState([]);
  const [cargandoMonitoras, setCargandoMonitoras] = useState(true);

  const [borrador, setBorrador] = useState(() => moduloVacio());
  const [plan, setPlan] = useState([]);
  const [guardandoPlan, setGuardandoPlan] = useState(false);

  const [errorPlan, setErrorPlan] = useState('');
  const [mensajePlan, setMensajePlan] = useState('');

  const [editando, setEditando] = useState(null);
  const [edicion, setEdicion] = useState({
    nombre: '',
    descripcion: '',
    orden: 1,
    estado: 'activo'
  });

  const [errorEdicion, setErrorEdicion] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  async function cargarModulos() {
    setCargando(true);

    try {
      const datos = await obtenerModulos(id);
      setModulos(Array.isArray(datos) ? datos : []);
    } catch (err) {
      setErrorPlan(err.message || 'No se pudieron cargar los módulos.');
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarModulos();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    let activo = true;

    obtenerMonitoras()
      .then(datos => {
        if (activo) {
          setMonitoras(Array.isArray(datos) ? datos : []);
        }
      })
      .catch(err => {
        if (activo) {
          setErrorPlan(
            err.message || 'No se pudieron cargar las asesoras.'
          );
        }
      })
      .finally(() => {
        if (activo) setCargandoMonitoras(false);
      });

    return () => {
      activo = false;
    };
  }, []);

  function cambiarBorrador(campo, valor) {
    setBorrador(actual => ({
      ...actual,
      [campo]: valor
    }));

    setErrorPlan('');
    setMensajePlan('');
  }

  function cambiarDia(dia, marcado) {
    setBorrador(actual => ({
      ...actual,
      dias_clase: marcado
        ? [...new Set([...actual.dias_clase, dia])]
        : actual.dias_clase.filter(d => d !== dia)
    }));
  }

  // Agrega el módulo y consulta la asesora recomendada.
  async function agregarAlPlan(event) {
    event.preventDefault();

    setErrorPlan('');
    setMensajePlan('');

    if (cargandoMonitoras) {
      setErrorPlan('Espera a que se cargue la lista de asesoras.');
      return;
    }

    try {
      const sesiones = crearSesiones(borrador);

      let asignacion = {
        id_persona_asesora: null,
        motivo: 'Selecciona una asesora manualmente.'
      };

      try {
  const horarios = sesiones.map(s => ({
    fecha: s.fecha,
    hora_inicio: s.hora_inicio,
    hora_fin: s.hora_fin
  }));

  console.log('[Asignación] Horarios enviados:', horarios);

  const respuesta = await previsualizarAsignacion(horarios);

  console.log('[Asignación] Respuesta del backend:', respuesta);
  console.log('[Asignación] Asesoras cargadas:', monitoras);

  if (!respuesta) {
    throw new Error(
      'El backend no devolvió una recomendación de asesora.'
    );
  }

  if (!respuesta.id_persona_asesora) {
    throw new Error(
      respuesta.motivo ||
      'La respuesta no contiene id_persona_asesora.'
    );
  }

  const asesoraEncontrada = monitoras.find(
    m =>
      String(m.id_persona) ===
      String(respuesta.id_persona_asesora)
  );

  if (!asesoraEncontrada) {
    throw new Error(
      `La asesora recomendada con ID ${
        respuesta.id_persona_asesora
      } no aparece en la lista de asesoras cargadas.`
    );
  }

  asignacion = respuesta;
} catch (err) {
  console.error('[Asignación] Error:', err);

  setErrorPlan(
    `No se pudo recomendar una asesora: ${err.message}`
  );

  return;
}

      const idSugerido = asignacion.id_persona_asesora
        ? String(asignacion.id_persona_asesora)
        : '';

      const asesoraSugerida = monitoras.find(
        m => String(m.id_persona) === idSugerido
      );

      const nuevo = {
        ...borrador,
        clave: borrador.clave || claveNueva(),
        orden: Number(borrador.orden),
        cantidad_sesiones: Number(borrador.cantidad_sesiones),
        id_persona_asesora: asesoraSugerida ? idSugerido : '',
        motivoAsignacion: asesoraSugerida
          ? `Recomendada automáticamente: ${asesoraSugerida.nombre}`
          : (
              asignacion.motivo ||
              'No se encontró una asesora disponible. Selecciona una manualmente.'
            ),
        sesiones
      };

      setPlan(actual => [...actual, nuevo]);

      setBorrador(
        moduloVacio(modulos.length + plan.length + 2)
      );

      if (asesoraSugerida) {
        setMensajePlan(
          `Módulo "${nuevo.nombre}": asesora sugerida ${asesoraSugerida.nombre}. Puedes cambiarla antes de guardar.`
        );
      } else {
        setMensajePlan(
          `Módulo "${nuevo.nombre}" agregado. Selecciona una asesora en el desplegable antes de guardar.`
        );
      }
    } catch (err) {
      setErrorPlan(err.message || 'Revisa los datos del módulo.');
    }
  }

  function cambiarModuloPlan(clave, cambios) {
    setPlan(actual =>
      actual.map(m =>
        m.clave === clave
          ? { ...m, ...cambios }
          : m
      )
    );
  }

  function cambiarSesion(clave, indice, campo, valor) {
    setPlan(actual =>
      actual.map(m =>
        m.clave !== clave
          ? m
          : {
              ...m,
              sesiones: m.sesiones.map((s, i) =>
                i === indice
                  ? { ...s, [campo]: valor }
                  : s
              )
            }
      )
    );
  }

  function aplicarHorario(clave) {
    setPlan(actual =>
      actual.map(m =>
        m.clave !== clave
          ? m
          : {
              ...m,
              sesiones: m.sesiones.map(s => ({
                ...s,
                hora_inicio: m.hora_inicio,
                hora_fin: m.hora_fin
              }))
            }
      )
    );
  }

  function regenerarSesiones(clave) {
    const modulo = plan.find(m => m.clave === clave);

    if (!modulo) return;

    try {
      const sesiones = crearSesiones(modulo);

      cambiarModuloPlan(clave, { sesiones });

      setErrorPlan('');
      setMensajePlan(
        'Fechas regeneradas. Los cambios manuales en las sesiones se reemplazaron.'
      );
    } catch (err) {
      setErrorPlan(err.message);
    }
  }

  async function guardarPlan() {
    setErrorPlan('');
    setMensajePlan('');

    if (!plan.length) {
      setErrorPlan('Agrega al menos un módulo al plan.');
      return;
    }

    const ordenes = new Set(modulos.map(m => Number(m.orden)));

    for (const modulo of plan) {
      const orden = Number(modulo.orden);

      if (!modulo.nombre.trim()) {
        setErrorPlan('Todos los módulos deben tener nombre.');
        return;
      }

      if (!Number.isSafeInteger(orden) || orden < 1) {
        setErrorPlan(
          `El orden de "${modulo.nombre}" debe ser positivo.`
        );
        return;
      }

      if (ordenes.has(orden)) {
        setErrorPlan(
          `El orden ${orden} está repetido. Corrige el orden de "${modulo.nombre}".`
        );
        return;
      }

      ordenes.add(orden);

      if (!modulo.id_persona_asesora) {
        setErrorPlan(
          `Selecciona una asesora para el módulo "${modulo.nombre}".`
        );
        return;
      }

      if (
        !monitoras.some(
          m => String(m.id_persona) ===
            String(modulo.id_persona_asesora)
        )
      ) {
        setErrorPlan(
          `La asesora seleccionada para "${modulo.nombre}" ya no está disponible en la lista.`
        );
        return;
      }

      if (!modulo.sesiones.length) {
        setErrorPlan(
          `El módulo "${modulo.nombre}" no tiene sesiones.`
        );
        return;
      }

      for (const s of modulo.sesiones) {
        if (
          !s.titulo.trim() ||
          !s.fecha ||
          !s.hora_inicio ||
          !s.hora_fin ||
          s.hora_fin <= s.hora_inicio
        ) {
          setErrorPlan(
            `Revisa el título, fecha y horario de las sesiones de "${modulo.nombre}".`
          );
          return;
        }
      }

      for (let i = 0; i < modulo.sesiones.length; i++) {
        for (let j = i + 1; j < modulo.sesiones.length; j++) {
          const a = modulo.sesiones[i];
          const b = modulo.sesiones[j];

          if (
            a.fecha === b.fecha &&
            a.hora_inicio < b.hora_fin &&
            a.hora_fin > b.hora_inicio
          ) {
            setErrorPlan(
              `Hay sesiones superpuestas en "${modulo.nombre}". Corrige fechas u horarios.`
            );
            return;
          }
        }
      }
    }

    const payload = plan.map(m => ({
      nombre: m.nombre.trim(),
      descripcion: m.descripcion.trim(),
      orden: Number(m.orden),
      fecha_inicio: m.fecha_inicio,
      dias_clase: m.dias_clase,

      // Respeta la asesora que aparece seleccionada.
      id_persona_asesora: Number(m.id_persona_asesora),

      sesiones: m.sesiones.map(s => ({
        titulo: s.titulo.trim(),
        fecha: s.fecha,
        hora_inicio: s.hora_inicio,
        hora_fin: s.hora_fin
      }))
    }));

    setGuardandoPlan(true);

    try {
      await crearMultiplesModulos(id, payload);

      const cantidad = plan.length;

      setPlan([]);

      setMensajePlan(
        `¡Listo! Se guardaron ${cantidad} módulo(s) con las asesoras seleccionadas.`
      );

      setBorrador(
        moduloVacio(modulos.length + cantidad + 1)
      );

      await cargarModulos();
    } catch (err) {
      setErrorPlan(
        err.message ||
        'No se pudo guardar el plan. Comprueba la disponibilidad de las asesoras.'
      );
    } finally {
      setGuardandoPlan(false);
    }
  }

  function obtenerNombreAsesora(idPersona) {
    if (!idPersona) return 'Por asignar';

    const asesora = monitoras.find(
      persona =>
        String(persona.id_persona) === String(idPersona)
    );

    return asesora?.nombre || `Asesora #${idPersona}`;
  }

  function prepararEdicion(modulo) {
    setEditando(modulo);

    setEdicion({
      nombre: modulo.nombre || '',
      descripcion: modulo.descripcion || '',
      orden: modulo.orden || 1,
      estado: modulo.estado || 'activo'
    });

    setErrorEdicion('');

    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }

  async function guardarEdicion(event) {
    event.preventDefault();
    setErrorEdicion('');

    const nombre = edicion.nombre.trim();
    const orden = Number(edicion.orden);

    if (!nombre) {
      setErrorEdicion('Escribe el nombre del módulo.');
      return;
    }

    if (!Number.isSafeInteger(orden) || orden < 1) {
      setErrorEdicion('El orden debe ser un entero positivo.');
      return;
    }

    setGuardandoEdicion(true);

    try {
      await actualizarModulo(editando.id_modulo, {
        nombre,
        descripcion: edicion.descripcion.trim(),
        orden,
        estado: edicion.estado
      });

      setEditando(null);
      await cargarModulos();
    } catch (err) {
      setErrorEdicion(
        err.message || 'No se pudo actualizar el módulo.'
      );
    } finally {
      setGuardandoEdicion(false);
    }
  }

  async function borrarModulo(modulo) {
    if (
      !window.confirm(
        `¿Eliminar el módulo "${modulo.nombre}"? Sus sesiones asociadas también se eliminarán.`
      )
    ) {
      return;
    }

    try {
      await eliminarModulo(modulo.id_modulo);

      setMensajePlan(
        `Se eliminó el módulo "${modulo.nombre}".`
      );

      await cargarModulos();
    } catch (err) {
      setErrorPlan(
        err.message || 'No se pudo eliminar el módulo.'
      );
    }
  }

  const totalSesiones = plan.reduce(
    (total, modulo) => total + modulo.sesiones.length,
    0
  );

  return (
    <section className="personal-page curso-detalle-page">
      <header className="cd-header">
        <button
          className="cd-back"
          type="button"
          onClick={() => navigate('/app/programas')}
        >
          ← Volver a programas
        </button>

        <span className="cd-eyebrow">GESTIÓN ACADÉMICA</span>

        <h2>{programa?.nombre ?? 'Detalle del curso'}</h2>

        <p>
          Código: {programa?.codigo_curso ?? '—'} ·
          {' '}Tipo: {programa?.tipo ?? '—'}
        </p>
      </header>

      {editando && (
        <section className="cd-panel cd-edit-panel">
          <div className="cd-heading-row">
            <div>
              <span className="cd-eyebrow">EDICIÓN</span>
              <h3>Editar módulo existente</h3>
            </div>

            <button
              type="button"
              className="cd-btn cd-btn-light"
              onClick={() => setEditando(null)}
            >
              Cancelar
            </button>
          </div>

          <form className="cd-grid" onSubmit={guardarEdicion}>
            <label className="cd-field">
              <span>Nombre *</span>
              <input
                value={edicion.nombre}
                onChange={e =>
                  setEdicion(a => ({
                    ...a,
                    nombre: e.target.value
                  }))
                }
                maxLength={150}
                required
              />
            </label>

            <label className="cd-field">
              <span>Orden *</span>
              <input
                type="number"
                min="1"
                value={edicion.orden}
                onChange={e =>
                  setEdicion(a => ({
                    ...a,
                    orden: e.target.value
                  }))
                }
                required
              />
            </label>

            <label className="cd-field cd-wide">
              <span>Descripción</span>
              <textarea
                rows="2"
                value={edicion.descripcion}
                onChange={e =>
                  setEdicion(a => ({
                    ...a,
                    descripcion: e.target.value
                  }))
                }
              />
            </label>

            <label className="cd-field">
              <span>Estado</span>
              <select
                value={edicion.estado}
                onChange={e =>
                  setEdicion(a => ({
                    ...a,
                    estado: e.target.value
                  }))
                }
              >
                <option value="activo">Activo</option>
                <option value="inactivo">Inactivo</option>
                <option value="finalizado">Finalizado</option>
              </select>
            </label>

            <div className="cd-wide">
              {errorEdicion && (
                <p className="cd-alert cd-error">{errorEdicion}</p>
              )}

              <button
                className="cd-btn cd-btn-primary"
                disabled={guardandoEdicion}
              >
                {guardandoEdicion ? 'Guardando…' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </section>
      )}

      <section className="cd-workspace">
        <div className="cd-heading-row cd-section-heading">
          <div>
            <span className="cd-eyebrow">NUEVA PROGRAMACIÓN</span>
            <h3>Arma el plan de módulos</h3>
            <p>
              Agrega módulos, genera sus sesiones y revisa o cambia
              la asesora antes de guardar.
            </p>
          </div>

          <div className="cd-counter">
            <strong>{plan.length}</strong>
            <span>en el plan</span>
          </div>
        </div>

        <form
          className="cd-panel cd-composer"
          onSubmit={agregarAlPlan}
        >
          <div className="cd-heading-row cd-composer-heading">
            <div>
              <h4>Nuevo módulo</h4>
              <p>
                Las sesiones se generan con la fecha, días y horarios
                que indiques.
              </p>
            </div>

            <span className="cd-step">PASO 1</span>
          </div>

          <div className="cd-grid">
            <label className="cd-field cd-wide">
              <span>Nombre del módulo *</span>
              <input
                value={borrador.nombre}
                onChange={e =>
                  cambiarBorrador('nombre', e.target.value)
                }
                maxLength={150}
                placeholder="Ej. Módulo 1: Introducción a Power BI"
                required
              />
            </label>

            <label className="cd-field">
              <span>Orden *</span>
              <input
                type="number"
                min="1"
                step="1"
                value={borrador.orden}
                onChange={e =>
                  cambiarBorrador('orden', e.target.value)
                }
                required
              />
            </label>

            <label className="cd-field">
              <span>Fecha de inicio *</span>
              <input
                type="date"
                value={borrador.fecha_inicio}
                onChange={e =>
                  cambiarBorrador('fecha_inicio', e.target.value)
                }
                required
              />
            </label>

            <label className="cd-field">
              <span>Número de sesiones *</span>
              <input
                type="number"
                min="1"
                max="200"
                value={borrador.cantidad_sesiones}
                onChange={e =>
                  cambiarBorrador('cantidad_sesiones', e.target.value)
                }
                required
              />
            </label>

            <label className="cd-field">
              <span>Hora de inicio *</span>
              <input
                type="time"
                value={borrador.hora_inicio}
                onChange={e =>
                  cambiarBorrador('hora_inicio', e.target.value)
                }
                required
              />
            </label>

            <label className="cd-field">
              <span>Hora de fin *</span>
              <input
                type="time"
                value={borrador.hora_fin}
                onChange={e =>
                  cambiarBorrador('hora_fin', e.target.value)
                }
                required
              />
            </label>

            <label className="cd-field cd-wide">
              <span>
                Descripción <small>(opcional)</small>
              </span>
              <textarea
                rows="2"
                value={borrador.descripcion}
                onChange={e =>
                  cambiarBorrador('descripcion', e.target.value)
                }
                placeholder="Breve descripción del módulo"
              />
            </label>

            <fieldset className="cd-days cd-wide">
              <legend>Días de clase *</legend>

              <div className="cd-day-list">
                {DIAS.map(dia => (
                  <label
                    key={dia.valor}
                    className={`cd-day ${
                      borrador.dias_clase.includes(dia.valor)
                        ? 'selected'
                        : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={borrador.dias_clase.includes(dia.valor)}
                      onChange={e =>
                        cambiarDia(dia.valor, e.target.checked)
                      }
                    />
                    <span>{dia.nombre}</span>
                  </label>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="cd-composer-footer">
            <div className="cd-auto-note">
              <span className="cd-spark">✦</span>

              <span>
                <strong>Recomendación de asesora</strong>
                <small>
                  El sistema propone una asesora según la disponibilidad.
                  Podrás cambiarla en el siguiente paso.
                </small>
              </span>
            </div>

            <button
              className="cd-btn cd-btn-primary"
              type="submit"
              disabled={guardandoPlan || cargandoMonitoras}
            >
              + Agregar módulo al plan
            </button>
          </div>
        </form>

        {errorPlan && (
          <p className="cd-alert cd-error">{errorPlan}</p>
        )}

        {mensajePlan && (
          <p className="cd-alert cd-success">{mensajePlan}</p>
        )}

        {plan.length > 0 && (
          <section className="cd-plan-panel">
            <div className="cd-heading-row cd-plan-heading">
              <div>
                <span className="cd-eyebrow">PASO 2</span>
                <h4>Revisa el plan antes de guardar</h4>
                <p>
                  Comprueba la asesora asignada y despliega cada módulo
                  para editar las sesiones individuales.
                </p>
              </div>

              <div className="cd-plan-stats">
                <span><strong>{plan.length}</strong> módulos</span>
                <span><strong>{totalSesiones}</strong> sesiones</span>
              </div>
            </div>

            <div className="cd-plan-list">
              {plan.map((modulo, indice) => {
                const asesoraSeleccionada = monitoras.find(
                  m =>
                    String(m.id_persona) ===
                    String(modulo.id_persona_asesora)
                );

                return (
                  <details
                    className="cd-module"
                    key={modulo.clave}
                    open={plan.length === 1}
                  >
                    <summary>
                      <span className="cd-module-number">
                        {indice + 1}
                      </span>

                      <span className="cd-module-title">
                        <strong>
                          {modulo.nombre || 'Módulo sin nombre'}
                        </strong>

                        <small>
                          {modulo.sesiones.length} sesiones ·
                          {' '}{modulo.hora_inicio}–{modulo.hora_fin} ·
                          {' '}Orden {modulo.orden}
                        </small>
                      </span>

                      <span className="cd-auto-pill">
                        {asesoraSeleccionada
                          ? asesoraSeleccionada.nombre
                          : 'Asesora pendiente'}
                      </span>

                      <span className="cd-chevron">⌄</span>
                    </summary>

                    <div className="cd-module-body">
                      <div className="cd-inline-grid">
                        <label className="cd-field">
                          <span>Nombre del módulo</span>
                          <input
                            value={modulo.nombre}
                            onChange={e =>
                              cambiarModuloPlan(modulo.clave, {
                                nombre: e.target.value
                              })
                            }
                            maxLength={150}
                          />
                        </label>

                        <label className="cd-field">
                          <span>Orden</span>
                          <input
                            type="number"
                            min="1"
                            value={modulo.orden}
                            onChange={e =>
                              cambiarModuloPlan(modulo.clave, {
                                orden: e.target.value
                              })
                            }
                          />
                        </label>

                        <label className="cd-field">
                          <span>Hora general de inicio</span>
                          <input
                            type="time"
                            value={modulo.hora_inicio}
                            onChange={e =>
                              cambiarModuloPlan(modulo.clave, {
                                hora_inicio: e.target.value
                              })
                            }
                          />
                        </label>

                        <label className="cd-field">
                          <span>Hora general de fin</span>
                          <input
                            type="time"
                            value={modulo.hora_fin}
                            onChange={e =>
                              cambiarModuloPlan(modulo.clave, {
                                hora_fin: e.target.value
                              })
                            }
                          />
                        </label>
                      </div>

                      {/* Selector de asesora */}
                      <div className="cd-monitor-selector">
                        <label className="cd-field">
                          <span>Asesor responsable *</span>

                          <select
  id={`asesora-${modulo.clave}`}
  value={modulo.id_persona_asesora ?? ''}
  onChange={e => {
    const seleccion = e.target.value;

    const asesora = monitoras.find(
      m => String(m.id_persona) === seleccion
    );

    cambiarModuloPlan(modulo.clave, {
      id_persona_asesora: seleccion,
      motivoAsignacion: asesora
        ? `Selección manual: ${asesora.nombre}`
        : ''
    });
  }}
  required
  disabled={cargandoMonitoras}
>
                            <option value="">
                              {cargandoMonitoras
                                ? 'Cargando asesores…'
                                : 'Seleccionar asesor'}
                            </option>

                            {monitoras.map(asesora => (
                              <option
                                key={asesora.id_persona}
                                value={String(asesora.id_persona)}
                              >
                                {asesora.nombre}
                              </option>
                            ))}
                          </select>
                        </label>

                        {modulo.motivoAsignacion && (
                          <small className="cd-monitor-reason">
                            {modulo.motivoAsignacion}
                          </small>
                        )}

                        {!asesoraSeleccionada && (
                          <small className="cd-monitor-reason">
                            Debes seleccionar un asesor para este módulo.
                          </small>
                        )}
                      </div>

                      <div className="cd-module-actions">
                        <button
                          className="cd-btn cd-btn-light"
                          type="button"
                          onClick={() => aplicarHorario(modulo.clave)}
                        >
                          Aplicar horario general a todas
                        </button>

                        <button
                          className="cd-btn cd-btn-light"
                          type="button"
                          onClick={() => regenerarSesiones(modulo.clave)}
                        >
                          Regenerar sesiones
                        </button>

                        <button
                          className="cd-btn cd-btn-danger"
                          type="button"
                          onClick={() =>
                            setPlan(actual =>
                              actual.filter(m => m.clave !== modulo.clave)
                            )
                          }
                        >
                          Quitar del plan
                        </button>
                      </div>

                      <div className="cd-table-wrap">
                        <table className="cd-session-table">
                          <thead>
                            <tr>
                              <th>Título de sesión</th>
                              <th>Fecha</th>
                              <th>Inicio</th>
                              <th>Fin</th>
                            </tr>
                          </thead>

                          <tbody>
                            {modulo.sesiones.map((sesion, i) => (
                              <tr key={`${modulo.clave}-${i}`}>
                                <td>
                                  <input
                                    aria-label={`Título de sesión ${i + 1}`}
                                    value={sesion.titulo}
                                    onChange={e =>
                                      cambiarSesion(
                                        modulo.clave,
                                        i,
                                        'titulo',
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>

                                <td>
                                  <input
                                    aria-label={`Fecha de sesión ${i + 1}`}
                                    type="date"
                                    value={sesion.fecha}
                                    onChange={e =>
                                      cambiarSesion(
                                        modulo.clave,
                                        i,
                                        'fecha',
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>

                                <td>
                                  <input
                                    aria-label={`Inicio de sesión ${i + 1}`}
                                    type="time"
                                    value={sesion.hora_inicio}
                                    onChange={e =>
                                      cambiarSesion(
                                        modulo.clave,
                                        i,
                                        'hora_inicio',
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>

                                <td>
                                  <input
                                    aria-label={`Fin de sesión ${i + 1}`}
                                    type="time"
                                    value={sesion.hora_fin}
                                    onChange={e =>
                                      cambiarSesion(
                                        modulo.clave,
                                        i,
                                        'hora_fin',
                                        e.target.value
                                      )
                                    }
                                  />
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </details>
                );
              })}
            </div>

<div className="cd-save-summary">
  <div className="cd-save-summary-heading">
    <div>
      <span className="cd-eyebrow">RESUMEN DE ASIGNACIONES</span>
      <h4>Asesores por módulo</h4>
    </div>

    <span className="cd-save-summary-count">
      {plan.filter(m => m.id_persona_asesora).length}
      {' / '}
      {plan.length} asignadas
    </span>
  </div>

  <div className="cd-save-advisors">
    {plan.map(modulo => {
      const asesora = monitoras.find(
        persona =>
          String(persona.id_persona) ===
          String(modulo.id_persona_asesora)
      );

      return (
        <div
          className={`cd-save-advisor ${
            asesora ? 'is-assigned' : 'is-pending'
          }`}
          key={modulo.clave}
        >
          <span className="cd-save-advisor-icon">
            {asesora ? '✓' : '!'}
          </span>

          <div className="cd-save-advisor-info">
            <strong>{modulo.nombre || 'Módulo sin nombre'}</strong>

            <span>
              {asesora
                ? asesora.nombre
                : 'Pendiente de asignación'}
            </span>

            <small>
              {modulo.sesiones.length}{' '}
              {modulo.sesiones.length === 1
                ? 'sesión'
                : 'sesiones'}
            </small>
          </div>

          <button
            type="button"
            className="cd-save-advisor-edit"
            onClick={() => {
              document
                .getElementById(`asesora-${modulo.clave}`)
                ?.scrollIntoView({
                  behavior: 'smooth',
                  block: 'center'
                });
            }}
          >
            Revisar
          </button>
        </div>
      );
    })}
  </div>
</div>

            <div className="cd-save-bar">
              <div>
                <strong>¿Todo listo?</strong>
                <small>
                  Se guardará el asesor que aparece seleccionada en cada módulo.
                </small>
              </div>

              <button
                className="cd-btn cd-btn-primary"
                type="button"
                onClick={guardarPlan}
                disabled={
                  guardandoPlan ||
                  cargandoMonitoras ||
                  monitoras.length === 0
                }
              >
                {guardandoPlan
                  ? 'Guardando plan…'
                  : `Guardar ${plan.length} módulo(s)`}
              </button>
            </div>

            {!cargandoMonitoras && monitoras.length === 0 && (
              <p className="cd-alert cd-warning">
                No hay asesores habilitados. Habilita al menos uno
                para poder guardar la programación.
              </p>
            )}
          </section>
        )}
      </section>

      <section className="cd-existing-section">
        <div className="cd-heading-row cd-section-heading">
          <div>
            <span className="cd-eyebrow">REGISTROS DEL CURSO</span>
            <h3>Módulos registrados</h3>
            <p>Edita o elimina los módulos que ya están guardados.</p>
          </div>

          <span className="cd-existing-count">
            {modulos.length} registrados
          </span>
        </div>

        {cargando ? (
          <div className="cd-empty">Cargando módulos…</div>
        ) : modulos.length === 0 ? (
          <div className="cd-empty">
            Todavía no hay módulos registrados.
          </div>
        ) : (
          <div className="cd-existing-list">
            {modulos.map(modulo => (
              <article
                className="cd-existing-item"
                key={modulo.id_modulo}
              >
                <span className="cd-module-number">
                  {modulo.orden}
                </span>

                <div className="cd-existing-main">
  <strong>{modulo.nombre}</strong>

  {modulo.descripcion && (
    <p>{modulo.descripcion}</p>
  )}

  <div className="cd-existing-advisor">
    <span className="cd-existing-advisor-icon">
      ✓
    </span>

    <div>
      <small>Asesor asignado</small>
      <strong>
        {obtenerNombreAsesora(modulo.id_persona_asesora)}
      </strong>
    </div>
  </div>
</div>

                <span
                  className={`cd-status ${
                    modulo.estado === 'activo' ? 'active' : ''
                  }`}
                >
                  {modulo.estado}
                </span>

                <div className="cd-existing-actions">
                  <button
                    className="cd-btn cd-btn-light"
                    type="button"
                    onClick={() => prepararEdicion(modulo)}
                  >
                    Editar
                  </button>

                  <button
                    className="cd-btn cd-btn-danger"
                    type="button"
                    onClick={() => borrarModulo(modulo)}
                  >
                    Eliminar
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}

export default CursoDetalle;