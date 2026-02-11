import { describe, it, expect } from 'vitest'
import { pickNByOD, computeDims, polygonVertices } from './geometry'

describe('geometry.ts', () => {
  describe('pickNByOD()', () => {
    it('debe retornar 8 para OD < 1600', () => {
      expect(pickNByOD(1200)).toBe(8)
      expect(pickNByOD(1500)).toBe(8)
      expect(pickNByOD(1599)).toBe(8)
    })

    it('debe retornar 16 para OD >= 1600', () => {
      expect(pickNByOD(1600)).toBe(16)
      expect(pickNByOD(2000)).toBe(16)
      expect(pickNByOD(3000)).toBe(16)
    })
  })

  describe('computeDims()', () => {
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

    it('debe calcular dimensiones válidas para inputs correctos', () => {
      const dims = computeDims(1200, 1500, 1.0)
      
      expect(dims.N).toBe(8)
      expect(dims.deltaDeg).toBe(45)
      expect(dims.alphaDeg).toBe(22.5)
      expect(dims.nominal.ID).toBe(1200)
      expect(dims.nominal.OD).toBe(1500)
      expect(dims.corrected.IDc).toBe(1200)
      expect(dims.corrected.ODc).toBe(1500)
    })

    it('debe aplicar corrección cuando coeff !== 1', () => {
      const dims = computeDims(1200, 1500, 1.1)
      
      // coeff = 1.1, p = 0.1
      // ODc = 1500 * (1 + 0.1) = 1650
      // IDc = 1200 * (1 - 0.1) = 1080
      expect(dims.corrected.ODc).toBeCloseTo(1650, 5)
      expect(dims.corrected.IDc).toBeCloseTo(1080, 5)
    })

    it('throws on invalid inputs', () => {
      expect(() => computeDims(0, 100, 1)).toThrow()
      expect(() => computeDims(100, 99, 1)).toThrow()
      expect(() => computeDims(100, 200, 0)).toThrow()
    })

    it('debe calcular altura correctamente', () => {
      const dims = computeDims(1200, 1500, 1.0)
      // h = Ro - Ri * Math.cos(Math.PI / N)
      // h = 750 - 600 * cos(π/8)
      const expected = 750 - 600 * Math.cos(Math.PI / 8)
      expect(dims.h).toBeCloseTo(expected, 5)
    })
  })

  describe('polygonVertices()', () => {
    it('debe retornar N vértices para un polígono de N lados', () => {
      expect(polygonVertices(600, 8).length).toBe(8)
      expect(polygonVertices(750, 16).length).toBe(16)
    })

    it('debe retornar vértices a la distancia correcta del centro', () => {
      const radius = 600
      const vertices = polygonVertices(radius, 8)
      
      vertices.forEach(v => {
        const distance = Math.sqrt(v.x * v.x + v.y * v.y)
        expect(distance).toBeCloseTo(radius, 5)
      })
    })
  })
})
