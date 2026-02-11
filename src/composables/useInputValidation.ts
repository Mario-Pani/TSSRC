import { ref, Ref } from 'vue'

/**
 * Composable para manejar la validación de inputs
 * Proporciona funciones de validación reutilizables con auto-corrección
 */
export function useInputValidation() {
  // Estado de validación para ID
  const idError = ref<boolean>(false)
  const idErrorMsg = ref<string>('')

  // Estado de validación para OD
  const odError = ref<boolean>(false)
  const odErrorMsg = ref<string>('')

  // Estado de validación para radial gap
  const radialError = ref<boolean>(false)
  const radialErrorMsg = ref<string>('')

  // Estado de validación para TH
  const thError = ref<boolean>(false)
  const thErrorMsg = ref<string>('')

  // Estado de validación para ringCount
  const ringCountError = ref<boolean>(false)
  const ringCountErrorMsg = ref<string>('')

  // Estado de validación para layers
  const layersError = ref<boolean>(false)
  const layersErrorMsg = ref<string>('')

  /**
   * Valida el ID
   * - Debe ser > 0
   * - Debe ser < OD
   */
  function validateID(ID: Ref<number>, OD: Ref<number>) {
    idError.value = false
    idErrorMsg.value = ''

    if (ID.value <= 0) {
      idError.value = true
      idErrorMsg.value = 'ID debe ser > 0'
      ID.value = 100
    }
    if (ID.value >= OD.value) {
      idError.value = true
      idErrorMsg.value = 'ID debe ser menor que OD'
    }

    validateRadialGap(ID, OD)
  }

  /**
   * Valida el OD
   * - Debe ser > 0
   * - Debe ser > ID
   */
  function validateOD(ID: Ref<number>, OD: Ref<number>) {
    odError.value = false
    odErrorMsg.value = ''

    if (OD.value <= 0) {
      odError.value = true
      odErrorMsg.value = 'OD debe ser > 0'
      OD.value = 2000
    }
    if (OD.value <= ID.value) {
      odError.value = true
      odErrorMsg.value = 'OD debe ser mayor que ID'
    }

    validateRadialGap(ID, OD)
  }

  /**
   * Valida el gap radial (OD - ID)
   * - Advertencia si < 25mm
   */
  function validateRadialGap(ID: Ref<number>, OD: Ref<number>) {
    radialError.value = false
    radialErrorMsg.value = ''

    const gap = OD.value - ID.value
    if (gap < 25) {
      radialError.value = true
      radialErrorMsg.value = `⚠ Construcción Radial demasiado pequeña ${gap.toFixed(1)}mm < 25mm`
    }
  }

  /**
   * Valida el TH (espesor)
   * - Debe ser >= 5mm
   * - Auto-corrección si es inválido
   */
  function validateTH(TH: Ref<number>) {
    thError.value = false
    thErrorMsg.value = ''

    if (TH.value < 5) {
      thError.value = true
      thErrorMsg.value = 'TH debe ser >= 5mm'
      TH.value = 5
    }
  }

  /**
   * Valida el ringCount (cantidad de anillos)
   * - Debe estar entre 1 y 24
   * - Auto-corrección si está fuera de rango
   */
  function validateRingCount(ringCount: Ref<number>) {
    ringCountError.value = false
    ringCountErrorMsg.value = ''

    if (ringCount.value < 1) {
      ringCountError.value = true
      ringCountErrorMsg.value = 'Cantidad debe ser >= 1'
      ringCount.value = 1
    }
    if (ringCount.value > 24) {
      ringCountError.value = true
      ringCountErrorMsg.value = 'Cantidad debe ser <= 24'
      ringCount.value = 24
    }
  }

  /**
   * Valida el número de capas
   * - Debe estar entre 3 y 8
   * - Auto-corrección si está fuera de rango
   */
  function validateLayers(layers: Ref<number>) {
    layersError.value = false
    layersErrorMsg.value = ''

    if (layers.value < 3) {
      layersError.value = true
      layersErrorMsg.value = 'Capas debe ser >= 3'
      layers.value = 3
    }
    if (layers.value > 8) {
      layersError.value = true
      layersErrorMsg.value = 'Capas debe ser <= 8'
      layers.value = 8
    }
  }

  return {
    // Error states
    idError,
    idErrorMsg,
    odError,
    odErrorMsg,
    radialError,
    radialErrorMsg,
    thError,
    thErrorMsg,
    ringCountError,
    ringCountErrorMsg,
    layersError,
    layersErrorMsg,
    // Validation functions
    validateID,
    validateOD,
    validateRadialGap,
    validateTH,
    validateRingCount,
    validateLayers,
  }
}
