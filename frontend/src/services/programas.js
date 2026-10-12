import API_URL from './api';

export const obtenerProgramas = async () => {
  const response = await fetch(
    `${API_URL}/programas`,
    {
      credentials: 'include'
    }
  );

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));

    throw new Error(
      data.message || 'No se pudieron cargar los programas'
    );
  }

  return response.json();
};