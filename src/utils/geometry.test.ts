import { describe, it, expect } from 'vitest'
import { computeDims } from './geometry'

describe('computeDims', () => {
  it('computes basic values and relationships for typical input', () => {
    const d = computeDims(1200, 1500, 1.0035)
    expect(d.N).toBe(8)
    expect(d.nominal.Ri).toBeCloseTo(600)
    expect(d.nominal.Ro).toBeCloseTo(750)
    expect(d.corrected.Ri).toBeLessThan(d.nominal.Ri)
    expect(d.corrected.Ro).toBeGreaterThan(d.nominal.Ro)
    expect(d.s_out).toBeGreaterThan(d.s_in)
    expect(d.h).toBeGreaterThan(0)
  })

  it('throws on invalid inputs', () => {
    expect(() => computeDims(0, 100, 1)).toThrow()
    expect(() => computeDims(100, 99, 1)).toThrow()
    expect(() => computeDims(100, 200, 0)).toThrow()
  })
})
