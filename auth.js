import jwtDecode from 'jwt-decode'

const KEY = 'token'

export function setToken(token) {
  localStorage.setItem(KEY, token)
}

export function getToken() {
  return localStorage.getItem(KEY)
}

export function logout() {
  localStorage.removeItem(KEY)
}

export function getUser() {
  const token = getToken()
  if (!token) return null
  try {
    const payload = jwtDecode(token)
    return { id: payload.id, role: payload.role, name: payload.name }
  } catch { return null }
}
