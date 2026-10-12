
import API_URL from './api';

async function procesarRespuesta(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || 'Ocurrió un error');
  }

  return data;
}

export async function obtenerModulos(idCurso) {
  const response = await fetch(
    `${API_URL}/modulos/curso/${idCurso}`,
    { credentials: 'include' }
  );

  return procesarRespuesta(response);
}

export async function crearModulo(idCurso, modulo) {
  const response = await fetch(
    `${API_URL}/modulos/curso/${idCurso}`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modulo)
    }
  );

  return procesarRespuesta(response);
}

export async function actualizarModulo(idModulo, modulo) {
  const response = await fetch(
    `${API_URL}/modulos/${idModulo}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(modulo)
    }
  );

  return procesarRespuesta(response);
}

export async function eliminarModulo(idModulo) {
  const response = await fetch(
    `${API_URL}/modulos/${idModulo}`,
    {
      method: 'DELETE',
      credentials: 'include'
    }
  );

  return procesarRespuesta(response);
}


export async function obtenerMonitoras() {
  const response = await fetch(
    `${API_URL}/modulos/asesoras/monitoras`,
    { credentials: 'include' }
  );

  return procesarRespuesta(response);
}

export async function previsualizarAsignacion(sesiones) {
  const response = await fetch(
    `${API_URL}/modulos/asignacion/preview`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sesiones })
    }
  );

  return procesarRespuesta(response);
}

export async function crearMultiplesModulos(idCurso, modulos) {
  const response = await fetch(
    `${API_URL}/modulos/curso/${idCurso}/multiples`,
    {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modulos })
    }
  );

  return procesarRespuesta(response);
}