// Nginx serves /uploads/ on the same host as the API (see backend deploy notes), so the
// uploads base is derived from VITE_API_URL's origin rather than a separate env var.
export function buktiDukungFileUrl(filename) {
  if (!filename) return null
  return new URL(`/uploads/${filename}`, import.meta.env.VITE_API_URL).toString()
}

export function isImageFile(filename) {
  return /\.(jpe?g|png|webp)$/i.test(filename ?? '')
}
