import API_URL_BASE from './api';

const API_URL = `${API_URL_BASE}/asignacion-zoom`;

async function procesarRespuesta(response) {
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(
      data.message || 'Error en la asignación Zoom'
    );

    error.conflictos = data.conflictos || [];

    throw error;
  }

  return data;
}

export async function obtenerAsignaciones() {
  const response = await fetch(API_URL, {
    credentials: 'include'
  });

  return procesarRespuesta(response);
}

export async function previsualizarAsignacion(
  idModulo,
  idCuentaZoom
) {
  const response = await fetch(`${API_URL}/validar`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      idModulo,
      idCuentaZoom
    })
  });

  return procesarRespuesta(response);
}

export async function guardarAsignacion(
  idModulo,
  idCuentaZoom
) {
  const response = await fetch(
    `${API_URL}/modulo/${idModulo}`,
    {
      method: 'PUT',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ idCuentaZoom })
    }
  );

  return procesarRespuesta(response);
}

export async function eliminarAsignacion(idModulo) {
  const response = await fetch(
    `${API_URL}/modulo/${idModulo}`,
    {
      method: 'DELETE',
      credentials: 'include'
    }
  );

  return procesarRespuesta(response);
}
