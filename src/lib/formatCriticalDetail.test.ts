import { isValidElement, type ReactElement, type ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { formatCriticalDetail } from './formatCriticalDetail'

function asParts(result: ReactNode): ReactNode[] {
  return result as ReactNode[]
}

describe('formatCriticalDetail', () => {
  it('returns null for falsy input', () => {
    expect(formatCriticalDetail(null)).toBeNull()
    expect(formatCriticalDetail(undefined)).toBeNull()
    expect(formatCriticalDetail('')).toBeNull()
  })

  it('returns the original string unchanged when there is no temperature', () => {
    expect(formatCriticalDetail('until smooth')).toBe('until smooth')
  })

  it('wraps a single temperature in a highlighted element', () => {
    const parts = asParts(formatCriticalDetail('roast at 375°F until golden'))
    expect(parts).toHaveLength(3)
    expect(parts[0]).toBe('roast at ')
    const highlighted = parts[1] as ReactElement<{ className: string; children: string }>
    expect(isValidElement(highlighted)).toBe(true)
    expect(highlighted.type).toBe('strong')
    expect(highlighted.props.className).toBe('critical-temperature')
    expect(highlighted.props.children).toBe('375°F')
    expect(parts[2]).toBe(' until golden')
  })

  it('wraps a temperature range', () => {
    const parts = asParts(formatCriticalDetail('bake at 350-375°F'))
    const highlighted = parts.find((part) => isValidElement(part)) as ReactElement<{ children: string }>
    expect(highlighted.props.children).toBe('350-375°F')
  })

  it('highlights every temperature match when there are multiple', () => {
    const parts = asParts(formatCriticalDetail('sear at 450°F, then finish at 325°F'))
    const highlighted = parts.filter((part): part is ReactElement<{ children: string }> => isValidElement(part))
    expect(highlighted.map((part) => part.props.children)).toEqual(['450°F', '325°F'])
  })

  it('does not include a leading empty string when the match starts at index 0', () => {
    const parts = asParts(formatCriticalDetail('400°F oven'))
    expect(parts[0]).not.toBe('')
    expect(isValidElement(parts[0])).toBe(true)
    expect(parts[1]).toBe(' oven')
  })
})
