const apiUrl = (import.meta.env.VITE_API_URL || 'http://localhost:4000/api/v1').replace(/\/$/, '')
const GUEST_KEY = 'lembro-guest-id'

// The access token lives in memory only. It is never written to localStorage, so a script
// injected into the page cannot steal a long-lived credential. The refresh token is an
// httpOnly cookie the browser handles itself.
let accessToken = null
let refreshing = null
let onSessionLost = () => {}

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'UNKNOWN', fields } = {}) {
    super(message)
    this.status = status
    this.code = code
    this.fields = fields
  }
}

export function setAccessToken(token) {
  accessToken = token
}

export function setSessionLostHandler(handler) {
  onSessionLost = handler
}

export function getGuestId() {
  try {
    let id = localStorage.getItem(GUEST_KEY)
    if (!id) {
      id = crypto.randomUUID()
      localStorage.setItem(GUEST_KEY, id)
    }
    return id
  } catch {
    return crypto.randomUUID()
  }
}

async function send(path, { method = 'GET', body, headers, signal } = {}) {
  let response
  try {
    response = await fetch(`${apiUrl}${path}`, {
      method,
      credentials: 'include',
      signal,
      headers: {
        ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        'X-Guest-Id': getGuestId(),
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        ...headers,
      },
      body: body !== undefined ? JSON.stringify(body) : undefined,
    })
  } catch (error) {
    if (error.name === 'AbortError') throw error
    throw new ApiError('Unable to reach the server. Check your connection and try again.', { code: 'NETWORK_ERROR' })
  }
  if (response.status === 204) return null
  const payload = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new ApiError(payload.error?.message || 'The request could not be completed.', {
      status: response.status, code: payload.error?.code, fields: payload.error?.fields,
    })
  }
  return payload
}

// Single-flight: concurrent callers (React StrictMode, several tabs' worth of requests) share one refresh.
export function refreshSession() {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        let payload
        try {
          payload = await send('/auth/refresh', { method: 'POST' })
        } catch (error) {
          if (error.code !== 'REFRESH_IN_PROGRESS') throw error
          await new Promise((resolve) => setTimeout(resolve, 400))
          payload = await send('/auth/refresh', { method: 'POST' })
        }
        accessToken = payload.accessToken
        return payload
      } finally {
        refreshing = null
      }
    })()
  }
  return refreshing
}

export async function apiRequest(path, options = {}) {
  try {
    return await send(path, options)
  } catch (error) {
    const isAuthRoute = path.startsWith('/auth/')
    if (error.status === 401 && !isAuthRoute && accessToken !== null) {
      try {
        await refreshSession()
      } catch {
        accessToken = null
        onSessionLost()
        throw error
      }
      return send(path, options)
    }
    throw error
  }
}

export { apiUrl }
