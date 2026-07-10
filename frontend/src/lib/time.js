export function formatWIT(isoString) {
  if (!isoString) return '—'
  const hasTimezone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(isoString)
  const date = new Date(hasTimezone ? isoString : `${isoString}Z`)
  return `${date.toLocaleString('id-ID', {
    timeZone: 'Asia/Jayapura',
    dateStyle: 'medium',
    timeStyle: 'short',
  })} WIT`
}
