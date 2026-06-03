import { computed, ref, type ComputedRef } from 'vue'
import type { AppCopy, CalculationResult, LayerCombination, LayerDraft, LayerStackItem } from '../types'
import {
  LAYER_ADMIN_PIN,
  buildLayerCombinationDraft,
  buildSavedLayerCombination,
  createLayerStackItems,
  formatLayerTimestamp,
  loadLayerCombinations,
  saveLayerCombinations,
  selectLayerCombination,
  sortLayerCombinations,
  validateLayerDraft,
} from '../utils/layerCombinations'

type UseLayerAdminParams = {
  t: ComputedRef<AppCopy>
  calculationResult: ComputedRef<CalculationResult | null>
}

export function useLayerAdmin({ t, calculationResult }: UseLayerAdminParams) {
  const layerAdminPinInput = ref('')
  const layerAdminUserInput = ref('planner')
  const layerAdminError = ref('')
  const isLayerAdmin = ref(false)
  const editingLayerId = ref<string | null>(null)
  const layerDraft = ref<LayerDraft>({
    thickness: '',
    combination: '',
    layerCount: '',
    finalThickness: ''
  })
  const layerCombinations = ref<LayerCombination[]>(loadLayerCombinations())

  function resetLayerDraft() {
    layerDraft.value = {
      thickness: '',
      combination: '',
      layerCount: '',
      finalThickness: ''
    }
    editingLayerId.value = null
  }

  function startLayerEdit(row: LayerCombination) {
    editingLayerId.value = row.id
    layerDraft.value = buildLayerCombinationDraft(row)
  }

  function unlockLayerAdmin() {
    if (layerAdminPinInput.value !== LAYER_ADMIN_PIN) {
      layerAdminError.value = t.value.layersAdminInvalidPin
      return
    }
    layerAdminError.value = ''
    isLayerAdmin.value = true
    layerAdminPinInput.value = ''
  }

  function lockLayerAdmin() {
    isLayerAdmin.value = false
    layerAdminError.value = ''
    layerAdminPinInput.value = ''
    resetLayerDraft()
  }

  const sortedLayerCombinations = computed(() => {
    return sortLayerCombinations(layerCombinations.value)
  })

  const selectedLayerCombination = computed(() => {
    return selectLayerCombination(calculationResult.value, sortedLayerCombinations.value)
  })

  const calculatedLayerItems = computed<LayerStackItem[]>(() => {
    return createLayerStackItems(selectedLayerCombination.value)
  })

  const layerDraftErrors = computed(() => {
    return validateLayerDraft(layerDraft.value, layerCombinations.value, editingLayerId.value)
  })

  const canSaveLayerDraft = computed(() => isLayerAdmin.value && layerDraftErrors.value.length === 0)

  function saveLayerDraft() {
    if (!canSaveLayerDraft.value) return

    const username = layerAdminUserInput.value.trim() || 'admin'
    const nextRow = buildSavedLayerCombination(layerDraft.value, editingLayerId.value, username)

    if (editingLayerId.value) {
      layerCombinations.value = layerCombinations.value.map((row) =>
        row.id === editingLayerId.value
          ? { ...nextRow, active: row.active }
          : row
      )
    } else {
      layerCombinations.value.push(nextRow)
    }

    saveLayerCombinations(layerCombinations.value)
    resetLayerDraft()
  }

  function deleteLayerCombination(id: string) {
    layerCombinations.value = layerCombinations.value.filter((row) => row.id !== id)
    saveLayerCombinations(layerCombinations.value)
    if (editingLayerId.value === id) resetLayerDraft()
  }

  function toggleLayerStatus(id: string) {
    const username = layerAdminUserInput.value.trim() || 'admin'
    const now = new Date().toISOString()
    layerCombinations.value = layerCombinations.value.map((row) => {
      if (row.id !== id) return row
      return {
        ...row,
        active: !row.active,
        updatedAt: now,
        updatedBy: username
      }
    })
    saveLayerCombinations(layerCombinations.value)
  }

  return {
    layerAdminPinInput,
    layerAdminUserInput,
    layerAdminError,
    isLayerAdmin,
    editingLayerId,
    layerDraft,
    sortedLayerCombinations,
    selectedLayerCombination,
    calculatedLayerItems,
    layerDraftErrors,
    canSaveLayerDraft,
    formatLayerTimestamp,
    resetLayerDraft,
    startLayerEdit,
    unlockLayerAdmin,
    lockLayerAdmin,
    saveLayerDraft,
    deleteLayerCombination,
    toggleLayerStatus,
  }
}