import { API_URL } from './config';

export type Usuario = {
  sub: number;
  nombre: string;
  email: string;
  rol: 'ADMIN' | 'TUTOR';
  tutorId: number | null;
};

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

export async function apiFetch(
  path: string,
  token: string | null,
  options: RequestInit = {},
) {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const isJson = response.headers
    .get('content-type')
    ?.includes('application/json');
  const data = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new ApiError(data?.message ?? 'Error de red', response.status);
  }

  return data;
}

export async function login(email: string, password: string) {
  const data = await apiFetch('/auth/login', null, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

  return data as { accessToken: string; usuario: Usuario };
}
