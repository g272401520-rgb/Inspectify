export function navigateTo(path: string, params?: Record<string, string>) {
  if (params && Object.keys(params).length > 0) {
    const hashParams = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&")
    window.location.href = `${path}#${hashParams}`
  } else {
    window.location.href = path
  }
}

export function getHashParams(): Record<string, string> {
  const hash = window.location.hash.slice(1) // Remove #
  if (!hash) return {}

  const params: Record<string, string> = {}
  hash.split("&").forEach((param) => {
    const [key, value] = param.split("=")
    if (key && value) {
      params[key] = decodeURIComponent(value)
    }
  })
  return params
}

export function createLink(path: string, params?: Record<string, string>): string {
  if (params && Object.keys(params).length > 0) {
    const hashParams = Object.entries(params)
      .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
      .join("&")
    return `${path}#${hashParams}`
  }
  return path
}

export function getHashParam(key: string): string | null {
  const params = getHashParams()
  return params[key] || null
}
