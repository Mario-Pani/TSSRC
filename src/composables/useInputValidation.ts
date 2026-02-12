import { ref, Ref } from 'vue'

/**
 * Composable para la validación de inputs del formulario
 * 
 * Proporciona validación reactiva con auto-corrección automática para todos los campos
 * del formulario: ID, OD, TH, ringCount, layers.
 * 
 * **Características:**
 * - Estados reactivos de error para cada campo
 * - Funciones de validación con auto-corrección
 * - Validación del gap radial (advierte si < 25mm)
 * - Mensajes de error descriptivos
 * 
 * @returns {Object} Objeto con estados de error y funciones de validación
 * 
 * @example
 * const { idError, idErrorMsg, validateID } = useInputValidation()
 * watch(ID, () => validateID(ID, OD))
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
   * Valida el diámetro interno (ID) del trapecio
   * 
   * **Reglas de validación:**
   * - ID debe ser > 0 (se auto-corrige a 100 si incumple)
   * - ID debe ser menor que OD
   * 
   * También dispara validación del gap radial (OD - ID)
   * 
   * @param {Ref<number>} ID - Referencia reactiva al ID en mm
   * @param {Ref<number>} OD - Referencia reactiva al OD en mm
   * 
   * @throws Establece idError=true y idErrorMsg con descripción si es inválido
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
   * Valida el diámetro externo (OD) del trapecio
   * 
   * **Reglas de validación:**
   * - OD debe ser > 0 (se auto-corrige a 2000 si incumple)
   * - OD debe ser mayor que ID
   * 
   * También dispara validación del gap radial (OD - ID)
   * 
   * @param {Ref<number>} ID - Referencia reactiva al ID en mm
   * @param {Ref<number>} OD - Referencia reactiva al OD en mm
   * 
   * @throws Establece odError=true y odErrorMsg con descripción si es inválido
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
   * Valida el gap radial (diferencia entre OD e ID)
   * 
   * Advierte al usuario si la construcción radial es muy estrecha (<25mm),
   * lo cual puede causar problemas de corte y debilitamiento del material.
   * 
   * **Umbral:** Gap mínimo recomendado = 25mm
   * 
   * @param {Ref<number>} ID - Referencia reactiva al ID en mm
   * @param {Ref<number>} OD - Referencia reactiva al OD en mm
   * 
   * @throws Establece radialError=true si gap < 25mm (advertencia no-bloqueante)
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
   * Valida el espesor (TH) del material
   * 
   * **Reglas de validación:**
   * - TH debe ser >= 5mm (espesor mínimo soportado)
   * - Se auto-corrige a 5mm si es menor
   * 
   * @param {Ref<number>} TH - Referencia reactiva al espesor en mm
   * 
   * @throws Establece thError=true y thErrorMsg si TH < 5mm
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
   * Valida la cantidad de anillos (ringCount)
   * 
   * **Reglas de validación:**
   * - Debe estar entre 1 y 24 anillos
   * - Se auto-corrige al límite más cercano si incumple
   * 
   * Un anillo representa una vuelta completa del trapecio.
   * 
   * @param {Ref<number>} ringCount - Referencia reactiva a cantidad de anillos
   * 
   * @throws Establece ringCountError=true si está fuera de rango [1, 24]
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
   * Valida el número de capas (layers) del material
   * 
   * **Reglas de validación:**
   * - Debe estar entre 3 y 8 capas
   * - Se auto-corrige al límite más cercano si incumple
   * 
   * Más capas = mayor flexibilidad pero más trabajo de corte.
   * Menos capas = estructura más rígida pero menos flexible.
   * 
   * @param {Ref<number>} layers - Referencia reactiva a cantidad de capas
   * 
   * @throws Establece layersError=true si está fuera de rango [3, 8]
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
