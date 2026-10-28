const apiOrigin = import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ?? ''

export function apiEndpoint(path: string) {
  return `${apiOrigin}/api/${path.replace(/^\/+/, '')}`
}

export class ApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}

export async function apiRequest<T>(path: string, init: RequestInit = {}) {
  const response = await fetch(apiEndpoint(path), {
    ...init,
    credentials: 'include',
    headers: {
      ...(init.body && !(init.body instanceof FormData) ? { 'content-type': 'application/json' } : {}),
      ...init.headers,
    },
  })

  const payload = await response.json().catch(() => ({})) as { error?: string }
  if (!response.ok) throw new ApiError(payload.error ?? 'No se pudo completar la operación.', response.status)
  return payload as T
}
