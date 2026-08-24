import type { ReactNode } from 'react'

export function formatCriticalDetail(detail: string | null | undefined): ReactNode {
  if (!detail) return null
  const temperaturePattern = /(\d+(?:[–-]\d+)?\s*°?\s*[FC])/g
  const parts: ReactNode[] = []
  let lastIndex = 0
  let match: RegExpExecArray | null
  while ((match = temperaturePattern.exec(detail))) {
    if (match.index > lastIndex) parts.push(detail.slice(lastIndex, match.index))
    parts.push(<strong className="critical-temperature" key={`${match.index}-${match[0]}`}>{match[0]}</strong>)
    lastIndex = match.index + match[0].length
  }
  if (!parts.length) return detail
  if (lastIndex < detail.length) parts.push(detail.slice(lastIndex))
  return parts
}
