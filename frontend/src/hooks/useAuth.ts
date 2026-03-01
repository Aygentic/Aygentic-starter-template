export const TOKEN_KEY = "access_token"
export const DASHBOARD_URL =
  import.meta.env.VITE_DASHBOARD_URL || "http://localhost:3000"

export const isAuthenticated = () => {
  return localStorage.getItem(TOKEN_KEY) !== null
}

export const getToken = () => {
  return localStorage.getItem(TOKEN_KEY)
}

export const setToken = (token: string) => {
  localStorage.setItem(TOKEN_KEY, token)
}

export const clearToken = () => {
  localStorage.removeItem(TOKEN_KEY)
}

export const initAuth = () => {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search)
    const urlToken = params.get("token")
    if (urlToken) {
      setToken(urlToken)
      params.delete("token")
      const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`
      window.history.replaceState({}, "", newUrl)
    }
  }

  if (import.meta.env.DEV) {
    const devToken = import.meta.env.VITE_DEV_TOKEN
    if (devToken && !getToken()) {
      setToken(devToken)
    }
  }
}
