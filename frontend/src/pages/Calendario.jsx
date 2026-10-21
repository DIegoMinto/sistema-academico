
import { useEffect, useMemo, useState } from 'react';
import { obtenerProgramas } from '../services/programas';
import {
  obtenerModulos,
  reprogramarSesion
} from '../services/modulos';
import './Calendario.css';
import { createPortal } from 'react-dom';

const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

const COLORES = [
  '#176b5b',
  '#3867a6',
  '#8b5c9e',
  '#b16b32',
  '#287d91',
  '#a34f65',
  '#637b36'
];

function fechaLocal(fecha) {
  if (!fecha) return null;

  const valor = String(fecha).slice(0, 10);
  const partes = valor.split('-').map(Number);

  if (partes.length !== 3 || partes.some(Number.isNaN)) return null;

  const resultado = new Date(partes[0], partes[1] - 1, partes[2]);

  return Number.isNaN(resultado.getTime()) ? null : resultado;
}

function claveFecha(fecha) {
  const anio = fecha.getFullYear();
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const dia = String(fecha.getDate()).padStart(2, '0');

  return `${anio}-${mes}-${dia}`;
}

function desplazarFecha(fecha, dias) {
  const nueva = new Date(fecha);
  nueva.setDate(nueva.getDate() + dias);
  return nueva;
}

function obtenerInicioSemana(fecha) {
  const inicio = new Date(fecha);
  const dia = (inicio.getDay() + 6) % 7;
  inicio.setDate(inicio.getDate() - dia);
  return inicio;
}

function formatearHora(hora) {
  if (!hora) return '';

  const coincidencia = String(hora).match(/^(\d{1,2}):(\d{2})/);

  if (!coincidencia) return String(hora);

  return `${coincidencia[1].padStart(2, '0')}:${coincidencia[2]}`;
}

function formatearFecha(fecha, opciones = {}) {
  return fecha.toLocaleDateString('es-BO', opciones);
}

function Calendario() {
  const [sesiones, setSesiones] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [fechaActual, setFechaActual] = useState(() => new Date());
  const [fechaSeleccionada, setFechaSeleccionada] = useState(() => new Date());
  const [vista, setVista] = useState('mes');
  const [filtroPrograma, setFiltroPrograma] = useState('todos');
  const [busqueda, setBusqueda] = useState('');
  const [sesionSeleccionada, setSesionSeleccionada] = useState(null);
  const [sesionArrastrada, setSesionArrastrada] = useState(null);
  const [guardandoSesion, setGuardandoSesion] = useState(false);
  const [mensajeDrag, setMensajeDrag] = useState('');
  const [reprogramacionPendiente, setReprogramacionPendiente] = useState(null);

  useEffect(() => {
    let activo = true;

    async function cargarCalendario() {
      setCargando(true);
      setError('');

      try {
        const respuesta = await obtenerProgramas();
        const programas = Array.isArray(respuesta)
          ? respuesta
          : respuesta?.programas ?? [];

        const resultados = await Promise.all(
          programas.map(async (programa, indice) => {
            const respuestaModulos = await obtenerModulos(programa.id_curso);
            const modulos = Array.isArray(respuestaModulos)
              ? respuestaModulos
              : respuestaModulos?.modulos ?? [];

            return modulos.flatMap((modulo, indiceModulo) => {
              const sesionesModulo = Array.isArray(modulo.sesiones)
                ? modulo.sesiones
                : [];

              return sesionesModulo.map((sesion, indiceSesion) => {
                const fecha = fechaLocal(sesion.fecha);

                if (!fecha) return null;

                return {
  id: [
    programa.id_curso,
    modulo.id_modulo ?? modulo.orden ?? indiceModulo,
    sesion.id_sesion ?? sesion.id ?? indiceSesion
  ].join('-'),

  idSesion: sesion.id_sesion,

  fecha: claveFecha(fecha),
                  fechaObjeto: fecha,
                  horaInicio: formatearHora(sesion.hora_inicio),
                  horaFin: formatearHora(sesion.hora_fin),
                  titulo: sesion.titulo || `Sesión ${indiceSesion + 1}`,
                  nombrePrograma: programa.nombre || 'Programa sin nombre',
                  idPrograma: String(programa.id_curso),
                  nombreModulo:
                    modulo.nombre || `Módulo ${modulo.orden ?? indiceModulo + 1}`,
                  numeroModulo: modulo.orden ?? indiceModulo + 1,
                  idMonitora: modulo.id_persona_asesora ?? null,
nombreMonitora: modulo.nombre_monitora || '',
                  numeroSesion: indiceSesion + 1,
                  zoom:
                    sesion.nombre_cuenta_zoom ||
                    sesion.cuenta_zoom ||
                    sesion.zoom_nombre ||
                    modulo.asignacion?.nombre ||
                    '',
                  color: COLORES[indice % COLORES.length]
                };
              }).filter(Boolean);
            });
          })
        );

        if (activo) {
          setSesiones(resultados.flat());
        }
      } catch (err) {
        console.error('Error al cargar el calendario:', err);

        if (activo) {
          setError(
            err.message ||
            'No se pudieron cargar las sesiones del calendario.'
          );
        }
      } finally {
        if (activo) setCargando(false);
      }
    }

    cargarCalendario();

    return () => {
      activo = false;
    };
  }, []);

  
function iniciarArrastre(event, sesion) {
  if (!sesion.idSesion) {
    event.preventDefault();
    setMensajeDrag(
      'Esta sesión no tiene un ID válido para reprogramarse.'
    );
    return;
  }

  setSesionArrastrada(sesion);
  setMensajeDrag('');

  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData(
    'text/plain',
    String(sesion.idSesion)
  );
}

function permitirSoltar(event) {
  event.preventDefault();

  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move';
  }
}


function soltarSesion(event, fechaDestino) {
  event.preventDefault();

  const idArrastrado = event.dataTransfer.getData('text/plain');
  const sesion = sesionArrastrada;

  if (
    !sesion ||
    !sesion.idSesion ||
    String(sesion.idSesion) !== idArrastrado ||
    sesion.fecha === fechaDestino ||
    guardandoSesion
  ) {
    setSesionArrastrada(null);
    return;
  }

  setReprogramacionPendiente({
    sesion,
    fechaAnterior: sesion.fecha,
    fechaDestino,
  });

  setSesionArrastrada(null);
  setMensajeDrag('');
}

async function confirmarReprogramacion() {
  if (!reprogramacionPendiente || guardandoSesion) return;

  const { sesion, fechaDestino } = reprogramacionPendiente;

  setGuardandoSesion(true);
  setMensajeDrag('');

  try {
    await reprogramarSesion(sesion.idSesion, fechaDestino);

    const fechaObjeto = fechaLocal(fechaDestino);

    setSesiones(actuales =>
      actuales.map(item =>
        item.idSesion === sesion.idSesion
          ? { ...item, fecha: fechaDestino, fechaObjeto }
          : item
      )
    );

    setSesionSeleccionada(actual =>
      actual?.idSesion === sesion.idSesion
        ? { ...actual, fecha: fechaDestino, fechaObjeto }
        : actual
    );

    setFechaSeleccionada(fechaObjeto);
    setFechaActual(fechaObjeto);
    setMensajeDrag('Sesión reprogramada correctamente.');
    setReprogramacionPendiente(null);
  } catch (error) {
    setMensajeDrag(
      error.message || 'No se pudo reprogramar la sesión.'
    );
  } finally {
    setGuardandoSesion(false);
  }
}

  const programasDisponibles = useMemo(() => {
    const programas = new Map();

    sesiones.forEach(sesion => {
      programas.set(sesion.idPrograma, sesion.nombrePrograma);
    });

    return Array.from(programas, ([id, nombre]) => ({ id, nombre }))
      .sort((a, b) => a.nombre.localeCompare(b.nombre));
  }, [sesiones]);

  const sesionesFiltradas = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();

    return sesiones.filter(sesion => {
      const coincidePrograma =
        filtroPrograma === 'todos' ||
        sesion.idPrograma === filtroPrograma;

      const coincideTexto =
        !texto ||
        sesion.nombrePrograma.toLowerCase().includes(texto) ||
        sesion.nombreModulo.toLowerCase().includes(texto) ||
        sesion.titulo.toLowerCase().includes(texto);

      return coincidePrograma && coincideTexto;
    });
  }, [sesiones, filtroPrograma, busqueda]);

  const sesionesPorFecha = useMemo(() => {
    const agrupadas = {};

    sesionesFiltradas.forEach(sesion => {
      if (!agrupadas[sesion.fecha]) agrupadas[sesion.fecha] = [];
      agrupadas[sesion.fecha].push(sesion);
    });

    Object.values(agrupadas).forEach(lista => {
      lista.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio));
    });

    return agrupadas;
  }, [sesionesFiltradas]);

  const fechaInicio = useMemo(() => {
    if (vista === 'dia') return new Date(fechaSeleccionada);

    if (vista === 'semana') {
      return obtenerInicioSemana(fechaActual);
    }

    const primero = new Date(
      fechaActual.getFullYear(),
      fechaActual.getMonth(),
      1
    );

    return obtenerInicioSemana(primero);
  }, [vista, fechaActual, fechaSeleccionada]);

  const diasVisibles = useMemo(() => {
    if (vista === 'dia') return [new Date(fechaSeleccionada)];

    if (vista === 'semana') {
      return Array.from({ length: 7 }, (_, i) =>
        desplazarFecha(fechaInicio, i)
      );
    }

    const ultimoDia = new Date(
      fechaActual.getFullYear(),
      fechaActual.getMonth() + 1,
      0
    );

    const fin = desplazarFecha(
      obtenerInicioSemana(ultimoDia),
      6
    );

    const cantidad =
      Math.round((fin - fechaInicio) / 86400000) + 1;

    return Array.from({ length: cantidad }, (_, i) =>
      desplazarFecha(fechaInicio, i)
    );
  }, [vista, fechaSeleccionada, fechaActual, fechaInicio]);

  const sesionesDelDia = sesionesPorFecha[claveFecha(fechaSeleccionada)] || [];

  const totalMes = sesionesFiltradas.filter(sesion =>
    sesion.fecha.startsWith(
      `${fechaActual.getFullYear()}-${String(
        fechaActual.getMonth() + 1
      ).padStart(2, '0')}`
    )
  ).length;

  function navegar(direccion) {
    if (vista === 'dia') {
      setFechaSeleccionada(actual => desplazarFecha(actual, direccion));
      setFechaActual(actual => desplazarFecha(actual, direccion));
      return;
    }

    if (vista === 'semana') {
      setFechaActual(actual => desplazarFecha(actual, direccion * 7));
      setFechaSeleccionada(actual => desplazarFecha(actual, direccion * 7));
      return;
    }

    const nueva = new Date(fechaActual);
    nueva.setDate(1);
    nueva.setMonth(nueva.getMonth() + direccion);

    setFechaActual(nueva);
    setFechaSeleccionada(nueva);
  }

  function irAHoy() {
    const hoy = new Date();
    setFechaActual(hoy);
    setFechaSeleccionada(hoy);
  }

  function cambiarVista(nuevaVista) {
    setVista(nuevaVista);
    setFechaActual(new Date(fechaSeleccionada));
  }

  const tituloCalendario = vista === 'mes'
    ? fechaActual.toLocaleDateString('es-BO', {
        month: 'long',
        year: 'numeric'
      })
    : vista === 'semana'
      ? `${formatearFecha(diasVisibles[0], {
          day: 'numeric',
          month: 'short'
        })} – ${formatearFecha(diasVisibles[6], {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        })}`
      : formatearFecha(fechaSeleccionada, {
          weekday: 'long',
          day: 'numeric',
          month: 'long',
          year: 'numeric'
        });

  if (cargando) {
    return (
      <section className="calendario-page">
        <div className="calendario-cargando">
          <span className="calendario-spinner" />
          <h3>Preparando tu calendario</h3>
          <p>Estamos organizando las sesiones académicas...</p>
        </div>
      </section>
    );
  }

  return (
    <section className="calendario-page">
      <header className="calendario-hero">
        <div className="calendario-hero-contenido">
          <span className="calendario-eyebrow">GESTIÓN ACADÉMICA</span>
          <h1>Calendario académico</h1>
          <p>
            Todas tus sesiones, diplomados y módulos en un solo lugar.
          </p>
        </div>

        <div className="calendario-hero-icono" aria-hidden="true">
          <span>▦</span>
        </div>
      </header>

      {error && (
        <div className="calendario-error">
          <strong>No pudimos cargar el calendario</strong>
          <p>{error}</p>
          <button type="button" onClick={() => window.location.reload()}>
            Intentar nuevamente
          </button>
        </div>
      )}

      {!error && (
        <>
          <div className="calendario-resumen">
            <article className="calendario-stat">
              <span className="calendario-stat-icono">▦</span>
              <div>
                <strong>{totalMes}</strong>
                <span>Sesiones este mes</span>
              </div>
            </article>

            <article className="calendario-stat">
              <span className="calendario-stat-icono dorado">◷</span>
              <div>
                <strong>{sesionesDelDia.length}</strong>
                <span>Sesiones seleccionadas</span>
              </div>
            </article>

            <article className="calendario-stat">
              <span className="calendario-stat-icono azul">▤</span>
              <div>
                <strong>{programasDisponibles.length}</strong>
                <span>Programas con sesiones</span>
              </div>
            </article>
          </div>

          <div className="calendario-herramientas">
            <div className="calendario-filtros">
              <label className="calendario-busqueda">
                <span aria-hidden="true">⌕</span>
                <input
                  type="search"
                  placeholder="Buscar diplomado o módulo..."
                  value={busqueda}
                  onChange={event => setBusqueda(event.target.value)}
                />
              </label>

              <select
                aria-label="Filtrar por programa"
                value={filtroPrograma}
                onChange={event => setFiltroPrograma(event.target.value)}
              >
                <option value="todos">Todos los programas</option>
                {programasDisponibles.map(programa => (
                  <option key={programa.id} value={programa.id}>
                    {programa.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div className="calendario-vistas">
              {[
                ['mes', 'Mes'],
                ['semana', 'Semana'],
                ['dia', 'Día']
              ].map(([valor, etiqueta]) => (
                <button
                  key={valor}
                  type="button"
                  className={vista === valor ? 'activa' : ''}
                  onClick={() => cambiarVista(valor)}
                >
                  {etiqueta}
                </button>
              ))}
            </div>
          </div>

          {mensajeDrag && (
            <div
              className={
                mensajeDrag.includes('correctamente')
                  ? 'calendario-mensaje-exito'
                  : 'calendario-error'
              }
              role="status"
            >
              {mensajeDrag}
            </div>
          )}

          <div className="calendario-layout">
            <div className="calendario-principal">
              <div className="calendario-navegacion">
                <div>
                  <h2>{tituloCalendario}</h2>
                  <span>Consulta y organiza tus clases</span>
                </div>

                <div className="calendario-controles">
                  <button
                    type="button"
                    className="calendario-hoy"
                    onClick={irAHoy}
                  >
                    Hoy
                  </button>
                  <button
                    type="button"
                    className="calendario-flecha"
                    aria-label="Periodo anterior"
                    onClick={() => navegar(-1)}
                  >
                    ‹
                  </button>
                  <button
                    type="button"
                    className="calendario-flecha"
                    aria-label="Periodo siguiente"
                    onClick={() => navegar(1)}
                  >
                    ›
                  </button>
                </div>
              </div>

              {vista !== 'dia' && (
                <div className="calendario-dias-semana">
                  {DIAS.map(dia => <span key={dia}>{dia}</span>)}
                </div>
              )}

              <div className={`calendario-cuadricula vista-${vista}`}>
                {diasVisibles.map(dia => {
                  const clave = claveFecha(dia);
                  const eventos = sesionesPorFecha[clave] || [];
                  const esHoy = clave === claveFecha(new Date());
                  const esSeleccionado =
                    clave === claveFecha(fechaSeleccionada);
                  const esMesActual =
                    dia.getMonth() === fechaActual.getMonth();

                  return (
                    <button
                      type="button"
                      key={clave}
                      className={[
                        'calendario-celda',
                        esHoy ? 'es-hoy' : '',
                        esSeleccionado ? 'es-seleccionado' : '',
                        vista === 'mes' && !esMesActual ? 'fuera-mes' : ''
                      ].filter(Boolean).join(' ')}
                      onClick={() => setFechaSeleccionada(new Date(dia))}
                      onDragOver={permitirSoltar}
                      onDrop={event => soltarSesion(event, clave)}
                    >
                      <span className="calendario-numero-dia">
                        {vista !== 'mes' && (
                          <span className="calendario-dia-corto">
                            {DIAS[(dia.getDay() + 6) % 7]}
                          </span>
                        )}
                        {dia.getDate()}
                      </span>

                      <div className="calendario-eventos">
                        {eventos.slice(0, vista === 'mes' ? 3 : 8).map(evento => (
                          <span
                            key={evento.id}
                            className="calendario-evento"
                            draggable={!guardandoSesion && Boolean(evento.idSesion)}
                            onDragStart={event => iniciarArrastre(event, evento)}
                            onDragEnd={() => setSesionArrastrada(null)}
                            style={{
                              '--evento-color': evento.color
                            }}
                            onClick={e => {
                              e.stopPropagation();
                              setFechaSeleccionada(new Date(dia));
                              setSesionSeleccionada(evento);
                            }}
                            title={`${evento.nombrePrograma} · ${evento.nombreModulo}`}
                          >
                            {evento.horaInicio && (
                              <b>{evento.horaInicio} </b>
                            )}
                            {evento.nombreModulo}
                          </span>
                        ))}

                        {eventos.length > (vista === 'mes' ? 3 : 8) && (
                          <span className="calendario-mas-eventos">
                            +{eventos.length - (vista === 'mes' ? 3 : 8)} más
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {sesionesFiltradas.length === 0 && (
                <div className="calendario-vacio">
                  <span>▦</span>
                  <strong>No hay sesiones para mostrar</strong>
                  <p>
                    Prueba otro filtro o revisa la programación de tus programas.
                  </p>
                </div>
              )}

              <div className="calendario-leyenda">
                <span className="calendario-leyenda-punto" />
                <span>Las sesiones se identifican por programa.</span>
                <span className="calendario-leyenda-separador">·</span>
                <span>Selecciona una fecha para ver su agenda.</span>
              </div>
            </div>

            <aside className="calendario-agenda">
              <div className="calendario-agenda-header">
                <span>AGENDA DEL DÍA</span>
                <h3>
                  {formatearFecha(fechaSeleccionada, {
                    day: 'numeric',
                    month: 'long'
                  })}
                </h3>
                <p>
                  {formatearFecha(fechaSeleccionada, {
                    weekday: 'long',
                    year: 'numeric'
                  })}
                </p>
              </div>

              <div className="calendario-agenda-contenido">
                {sesionesDelDia.length === 0 ? (
                  <div className="calendario-agenda-vacia">
                    <span>◷</span>
                    <strong>Día libre</strong>
                    <p>No hay sesiones programadas para esta fecha.</p>
                  </div>
                ) : (
                  <>
                    <span className="calendario-total-dia">
                      {sesionesDelDia.length}{' '}
                      {sesionesDelDia.length === 1 ? 'sesión' : 'sesiones'}
                    </span>

                    {sesionesDelDia.map(sesion => (
                      <button
                        type="button"
                        key={sesion.id}
                        className={[
                          'calendario-agenda-evento',
                          sesionSeleccionada?.id === sesion.id
                            ? 'evento-activo'
                            : ''
                        ].join(' ')}
                        style={{ '--evento-color': sesion.color }}
                        onClick={() => setSesionSeleccionada(sesion)}
                      >
                        <span className="agenda-evento-hora">
                          {sesion.horaInicio || 'Hora pendiente'}
                          {sesion.horaFin ? ` – ${sesion.horaFin}` : ''}
                        </span>
                        <strong>{sesion.nombrePrograma}</strong>
                        <span className="agenda-evento-modulo">
                          {sesion.nombreModulo}
                        </span>
                        <span className="agenda-evento-sesion">
                          {sesion.titulo}
                        </span>
                      </button>
                    ))}
                  </>
                )}
              </div>

              {sesionSeleccionada && (
                <div className="calendario-detalle">
                  <div className="calendario-detalle-titulo">
                    <span>DETALLE DE SESIÓN</span>
                    <button
                      type="button"
                      aria-label="Cerrar detalle"
                      onClick={() => setSesionSeleccionada(null)}
                    >
                      ×
                    </button>
                  </div>

                  <strong>{sesionSeleccionada.nombrePrograma}</strong>
                  <p>{sesionSeleccionada.nombreModulo}</p>

                  <div className="calendario-detalle-linea">
                    <span>Fecha</span>
                    <b>
                      {formatearFecha(sesionSeleccionada.fechaObjeto, {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric'
                      })}
                    </b>
                  </div>

                  <div className="calendario-detalle-linea">
                    <span>Horario</span>
                    <b>
                      {sesionSeleccionada.horaInicio || 'Pendiente'}
                      {sesionSeleccionada.horaFin
                        ? ` – ${sesionSeleccionada.horaFin}`
                        : ''}
                    </b>
                  </div>

                  <div className="calendario-detalle-linea">
                    <span>Zoom</span>
                    <b>{sesionSeleccionada.zoom || 'Sin información'}</b>
                  </div>
                  <div className="calendario-detalle-linea">
  <span>Monitor/a</span>
  <b>
    {sesionSeleccionada.nombreMonitora || 'Por asignar'}
  </b>
</div>
                </div>
              )}
            </aside>
          </div>
        </>
      )}

{reprogramacionPendiente && createPortal(
  <div
    className="calendario-modal-overlay"
    onMouseDown={event => {
      if (
        event.target === event.currentTarget &&
        !guardandoSesion
      ) {
        setReprogramacionPendiente(null);
      }
    }}
  >
    <div
      className="calendario-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="titulo-modal-reprogramacion"
    >
      <div className="calendario-modal-header">
        <div className="calendario-modal-icono">
          <span>↻</span>
        </div>

        <div className="calendario-modal-titulos">
          <h2 id="titulo-modal-reprogramacion">
            Reprogramar sesión
          </h2>
          <p>Confirma el cambio de fecha</p>
        </div>

        <button
          type="button"
          className="calendario-modal-cerrar"
          aria-label="Cerrar modal"
          disabled={guardandoSesion}
          onClick={() => setReprogramacionPendiente(null)}
        >
          ×
        </button>
      </div>

      <div className="calendario-modal-contenido">
        <span className="calendario-modal-etiqueta">
          SESIÓN
        </span>

        <h3>{reprogramacionPendiente.sesion.titulo}</h3>

        <p className="calendario-modal-programa">
          {reprogramacionPendiente.sesion.nombrePrograma}
        </p>

        <div className="calendario-modal-fechas">
          <div>
            <span>Fecha actual</span>
            <strong>
              {new Date(
                `${reprogramacionPendiente.fechaAnterior}T00:00:00`
              ).toLocaleDateString('es-BO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </strong>
          </div>

          <div className="calendario-modal-flecha">→</div>

          <div>
            <span>Nueva fecha</span>
            <strong>
              {new Date(
                `${reprogramacionPendiente.fechaDestino}T00:00:00`
              ).toLocaleDateString('es-BO', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })}
            </strong>
          </div>
        </div>

        <p className="calendario-modal-nota">
          La hora, la monitora y los demás datos de la sesión
          se mantendrán sin cambios.
        </p>
      </div>

      <div className="calendario-modal-acciones">
        <button
          type="button"
          className="calendario-modal-btn-cancelar"
          disabled={guardandoSesion}
          onClick={() => setReprogramacionPendiente(null)}
        >
          Cancelar
        </button>

        <button
          type="button"
          className="calendario-modal-btn-confirmar"
          disabled={guardandoSesion}
          onClick={confirmarReprogramacion}
        >
          {guardandoSesion ? (
            <>
              <span className="calendario-modal-spinner" />
              Guardando...
            </>
          ) : (
            'Confirmar cambio'
          )}
        </button>
      </div>
    </div>
  </div>,
  document.body
)}


    </section>
  );
}

export default Calendario;
