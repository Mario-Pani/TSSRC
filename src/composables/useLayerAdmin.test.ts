import { computed } from 'vue'
import { describe, expect, it } from 'vitest'
import { APP_COPY } from '../appCopy'
import type { CalculationResult } from '../types'
import { useLayerAdmin } from './useLayerAdmin'

const baseCalculation: CalculationResult = {
  idMin: 500,
  odMax: 900,
  thNom: 20,
  segments: 8,
  angleCutDeg: 22.5,
  idN: 510,
  odN: 918,
  thN: 20,
  rbNom: 200,
  rbAdj: 204,
  ssAdj: 100,
  slAdj: 120,
  hAdj: 220,
  qtyTotal: 2,
  nTotal: 16,
  shrinkPct: 2,
  tolerancePct: 5,
}

function createLayerAdmin(thN = 20) {
  return useLayerAdmin({
    t: computed(() => APP_COPY.MX),
    calculationResult: computed(() => ({ ...baseCalculation, thN })),
  })
}

describe('useLayerAdmin', () => {
  it('rechaza PIN invalido y mantiene admin bloqueado', () => {
    const layerAdmin = createLayerAdmin()

    layerAdmin.layerAdminPinInput.value = '0000'
    layerAdmin.unlockLayerAdmin()

    expect(layerAdmin.isLayerAdmin.value).toBe(false)
    expect(layerAdmin.layerAdminError.value.length).toBeGreaterThan(0)
  })

  it('acepta PIN valido y habilita modo admin', () => {
    const layerAdmin = createLayerAdmin()

    layerAdmin.layerAdminPinInput.value = '2406'
    layerAdmin.unlockLayerAdmin()

    expect(layerAdmin.isLayerAdmin.value).toBe(true)
    expect(layerAdmin.layerAdminError.value).toBe('')
  })

  it('selecciona combinacion por cobertura de thN', () => {
    const layerAdmin = createLayerAdmin(20.3)

    expect(layerAdmin.selectedLayerCombination.value).not.toBeNull()
    expect(layerAdmin.selectedLayerCombination.value?.finalThickness).toBeGreaterThanOrEqual(20.3)
  })

  it('permite agregar combinacion cuando admin esta habilitado y draft es valido', () => {
    const layerAdmin = createLayerAdmin()
    const initialCount = layerAdmin.sortedLayerCombinations.value.length

    layerAdmin.layerAdminPinInput.value = '2406'
    layerAdmin.unlockLayerAdmin()
    layerAdmin.layerDraft.value = {
      thickness: '100',
      combination: '10+20+10',
      layerCount: '3',
      finalThickness: '40',
    }

    expect(layerAdmin.canSaveLayerDraft.value).toBe(true)
    layerAdmin.saveLayerDraft()

    expect(layerAdmin.sortedLayerCombinations.value.length).toBe(initialCount + 1)
    expect(layerAdmin.sortedLayerCombinations.value.some((row) => row.thickness === 100)).toBe(true)
  })
})