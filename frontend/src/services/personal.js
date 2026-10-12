import API_URL from './api';

export const obtenerPersonal = async () => {
  const response = await fetch(`${API_URL}/personal`, {
    credentials: 'include'
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || 'No se pudo obtener el personal'
    );
  }

  return data;
};

export const actualizarMonitoreo = async (
  idPersona,
  monitorea
) => {
  const response = await fetch(
    `${API_URL}/personal/${idPersona}/monitorea`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      credentials: 'include',
      body: JSON.stringify({
        monitorea
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message || 'No se pudo actualizar el monitoreo'
    );
  }

  return data;
};