import { describe, it, expect, beforeEach } from 'vitest'
import { ref, Ref } from 'vue'
import { useInputValidation } from './useInputValidation'

describe('useInputValidation', () => {
  let validation: ReturnType<typeof useInputValidation>
  let ID: Ref<number>
  let OD: Ref<number>
  let TH: Ref<number>
  let ringCount: Ref<number>
  let layers: Ref<number>

  beforeEach(() => {
    validation = useInputValidation()
    ID = ref(1200)
    OD = ref(1500)
    TH = ref(12)
    ringCount = ref(6)
    layers = ref(3)
  })

  describe('validateID()', () => {
    it('no debe mostrar error si ID es válido', () => {
      validation.validateID(ID, OD)
      expect(validation.idError.value).toBe(false)
      expect(validation.idErrorMsg.value).toBe('')
    })

    it('debe marcar error y auto-corregir si ID <= 0', () => {
      ID.value = 0
      validation.validateID(ID, OD)
      expect(validation.idError.value).toBe(true)
      expect(validation.idErrorMsg.value).toContain('ID debe ser > 0')
      expect(ID.value).toBe(100) // Auto-corregido
    })

    it('debe marcar error si ID >= OD', () => {
      ID.value = 1600
      OD.value = 1500
      validation.validateID(ID, OD)
      expect(validation.idError.value).toBe(true)
      expect(validation.idErrorMsg.value).toContain('ID debe ser menor que OD')
    })
  })

  describe('validateOD()', () => {
    it('no debe mostrar error si OD es válido', () => {
      validation.validateOD(ID, OD)
      expect(validation.odError.value).toBe(false)
      expect(validation.odErrorMsg.value).toBe('')
    })

    it('debe marcar error y auto-corregir si OD <= 0', () => {
      OD.value = -500
      validation.validateOD(ID, OD)
      expect(validation.odError.value).toBe(true)
      expect(validation.odErrorMsg.value).toContain('OD debe ser > 0')
      expect(OD.value).toBe(2000) // Auto-corregido
    })

    it('debe marcar error si OD <= ID', () => {
      OD.value = 1000
      ID.value = 1200
      validation.validateOD(ID, OD)
      expect(validation.odError.value).toBe(true)
      expect(validation.odErrorMsg.value).toContain('OD debe ser mayor que ID')
    })
  })

  describe('validateRadialGap()', () => {
    it('no debe mostrar advertencia si gap >= 25', () => {
      ID.value = 1200
      OD.value = 1500 // gap = 300
      validation.validateRadialGap(ID, OD)
      expect(validation.radialError.value).toBe(false)
    })

    it('debe mostrar advertencia si gap < 25', () => {
      ID.value = 1200
      OD.value = 1220 // gap = 20
      validation.validateRadialGap(ID, OD)
      expect(validation.radialError.value).toBe(true)
      expect(validation.radialErrorMsg.value).toContain('Construcción Radial demasiado pequeña')
      expect(validation.radialErrorMsg.value).toContain('20.0mm')
    })

    it('debe mostrar advertencia con valor exacto del gap', () => {
      ID.value = 1000
      OD.value = 1010 // gap = 10
      validation.validateRadialGap(ID, OD)
      expect(validation.radialErrorMsg.value).toContain('10.0mm')
    })
  })

  describe('validateTH()', () => {
    it('no debe mostrar error si TH >= 5', () => {
      TH.value = 5
      validation.validateTH(TH)
      expect(validation.thError.value).toBe(false)

      TH.value = 12
      validation.validateTH(TH)
      expect(validation.thError.value).toBe(false)
    })

    it('debe marcar error y auto-corregir si TH < 5', () => {
      TH.value = 3
      validation.validateTH(TH)
      expect(validation.thError.value).toBe(true)
      expect(validation.thErrorMsg.value).toContain('TH debe ser >= 5mm')
      expect(TH.value).toBe(5) // Auto-corregido
    })

    it('debe auto-corregir a 5 si TH es negativo', () => {
      TH.value = -10
      validation.validateTH(TH)
      expect(TH.value).toBe(5)
    })
  })

  describe('validateRingCount()', () => {
    it('no debe mostrar error si ringCount está en rango [1, 24]', () => {
      for (let i = 1; i <= 24; i++) {
        ringCount.value = i
        validation.validateRingCount(ringCount)
        expect(validation.ringCountError.value).toBe(false)
      }
    })

    it('debe marcar error y auto-corregir si ringCount < 1', () => {
      ringCount.value = 0
      validation.validateRingCount(ringCount)
      expect(validation.ringCountError.value).toBe(true)
      expect(validation.ringCountErrorMsg.value).toContain('Cantidad debe ser >= 1')
      expect(ringCount.value).toBe(1)
    })

    it('debe marcar error y auto-corregir si ringCount > 24', () => {
      ringCount.value = 30
      validation.validateRingCount(ringCount)
      expect(validation.ringCountError.value).toBe(true)
      expect(validation.ringCountErrorMsg.value).toContain('Cantidad debe ser <= 24')
      expect(ringCount.value).toBe(24)
    })
  })

  describe('validateLayers()', () => {
    it('no debe mostrar error si layers está en rango [3, 8]', () => {
      for (let i = 3; i <= 8; i++) {
        layers.value = i
        validation.validateLayers(layers)
        expect(validation.layersError.value).toBe(false)
      }
    })

    it('debe marcar error y auto-corregir si layers < 3', () => {
      layers.value = 2
      validation.validateLayers(layers)
      expect(validation.layersError.value).toBe(true)
      expect(validation.layersErrorMsg.value).toContain('Capas debe ser >= 3')
      expect(layers.value).toBe(3)
    })

    it('debe marcar error y auto-corregir si layers > 8', () => {
      layers.value = 10
      validation.validateLayers(layers)
      expect(validation.layersError.value).toBe(true)
      expect(validation.layersErrorMsg.value).toContain('Capas debe ser <= 8')
      expect(layers.value).toBe(8)
    })

    it('debe auto-corregir a 3 si layers es muy pequeño', () => {
      layers.value = -5
      validation.validateLayers(layers)
      expect(layers.value).toBe(3)
    })

    it('debe auto-corregir a 8 si layers es muy grande', () => {
      layers.value = 100
      validation.validateLayers(layers)
      expect(layers.value).toBe(8)
    })
  })
})
