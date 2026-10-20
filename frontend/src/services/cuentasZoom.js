import API_URL from './api';

export const obtenerCuentasZoom = async () => {
  const response = await fetch(
    `${API_URL}/cuentas-zoom`,
    {
      credentials: 'include'
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'No se pudieron obtener las cuentas Zoom'
    );
  }

  return data;
};


export const crearCuentaZoom = async ({
  nombre,
  correo,
  password,
  fecha_pago,
  fecha_caducidad,
  importe_usd
}) => {
  const response = await fetch(
    `${API_URL}/cuentas-zoom`,
    {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json'
      },

      credentials: 'include',

      body: JSON.stringify({
  nombre,
  correo,
  password,
  fecha_pago,
  fecha_caducidad,
  importe_usd
})
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'No se pudo crear la cuenta Zoom'
    );
  }

  return data;
};


export const actualizarCuentaZoom = async (
  id,
  {
    nombre,
    correo,
    password
  }
) => {
  const response = await fetch(
    `${API_URL}/cuentas-zoom/${id}`,
    {
      method: 'PUT',

      headers: {
        'Content-Type': 'application/json'
      },

      credentials: 'include',

      body: JSON.stringify({
        nombre,
        correo,
        password
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'No se pudo actualizar la cuenta Zoom'
    );
  }

  return data;
};


export const actualizarEstadoZoom = async (
  id,
  activa
) => {
  const response = await fetch(
    `${API_URL}/cuentas-zoom/${id}/estado`,
    {
      method: 'PUT',

      headers: {
        'Content-Type': 'application/json'
      },

      credentials: 'include',

      body: JSON.stringify({
        activa
      })
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'No se pudo actualizar el estado'
    );
  }

  return data;
};


export const eliminarCuentaZoom = async (id) => {
  const response = await fetch(
    `${API_URL}/cuentas-zoom/${id}`,
    {
      method: 'DELETE',
      credentials: 'include'
    }
  );

  const data = await response.json();

  if (!response.ok) {
    throw new Error(
      data.message ||
      'No se pudo eliminar la cuenta Zoom'
    );
  }

  return data;
};