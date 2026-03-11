const ALLOWED_EXTERNAL_HOSTS = ['github.com', 'gitlab.com'] as const

const isAllowedHost = (hostname: string, allowedHost: string): boolean =>
  hostname === allowedHost || hostname.endsWith(`.${allowedHost}`)

export const isAllowedExternalUrl = (value: string): boolean => {
  try {
    const url = new URL(value)
    if (url.protocol !== 'https:') {
      return false
    }

    const hostname = url.hostname.toLowerCase()
    return ALLOWED_EXTERNAL_HOSTS.some((allowedHost) => isAllowedHost(hostname, allowedHost))
  } catch {
    return false
  }
}
