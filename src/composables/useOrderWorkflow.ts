import { computed, ref, type ComputedRef } from 'vue'
import type {
  AppCopy,
  CalculationResult,
  FieldKey,
  FieldValidation,
  OrderFormData,
  OrderItem,
} from '../types'
import {
  buildFieldMessages,
  buildNextOrderItem,
  computeCalculationResult,
  computeLevel2Warnings,
  createOrderValidation,
  getFieldState,
} from '../utils/orderWorkflow'

type UseOrderWorkflowParams = {
  t: ComputedRef<AppCopy>
}

export function useOrderWorkflow({ t }: UseOrderWorkflowParams) {
  const inputData = ref<OrderFormData>({
    id: '',
    od: '',
    th: '',
    quantity: '',
    salesOrder: '',
    position: ''
  })

  const orderItems = ref<OrderItem[]>([])
  const editingItemIndex = ref<number | null>(null)
  const touched = ref<Record<FieldKey, boolean>>({
    salesOrder: false,
    position: false,
    id: false,
    od: false,
    th: false,
    quantity: false
  })
  const level2Shrinkage = ref(0)
  const level2Tolerance = ref(5)
  const calculationVisible = ref(false)

  const validation = computed<Record<FieldKey, FieldValidation>>(() => {
    return createOrderValidation(inputData.value, orderItems.value, editingItemIndex.value)
  })

  const canAddItem = computed(() => {
    return (Object.keys(validation.value) as FieldKey[])
      .every((key) => validation.value[key].errors.length === 0)
  })

  const isEditingSingleItem = computed(() => editingItemIndex.value !== null && orderItems.value.length === 1)
  const salesOrderLocked = computed(() => {
    if (isEditingSingleItem.value) return false
    return orderItems.value.length > 0 || editingItemIndex.value !== null
  })
  const thLocked = computed(() => {
    if (isEditingSingleItem.value) return false
    return orderItems.value.length > 0
  })

  function clearEntryFieldsKeepTH() {
    inputData.value.position = ''
    inputData.value.id = ''
    inputData.value.od = ''
    inputData.value.quantity = ''
  }

  function addNewItem() {
    ;(Object.keys(touched.value) as FieldKey[]).forEach((key) => {
      touched.value[key] = true
    })
    if (!canAddItem.value) return

    const nextItem = buildNextOrderItem(inputData.value, orderItems.value, editingItemIndex.value)

    if (editingItemIndex.value !== null) {
      orderItems.value[editingItemIndex.value] = nextItem
      editingItemIndex.value = null
    } else {
      orderItems.value.push(nextItem)
    }

    inputData.value.salesOrder = nextItem.salesOrder
    inputData.value.th = nextItem.th
    clearEntryFieldsKeepTH()
    touched.value.position = false
    touched.value.id = false
    touched.value.od = false
    touched.value.quantity = false
  }

  function editItem(index: number) {
    const item = orderItems.value[index]
    if (!item) return

    editingItemIndex.value = index
    inputData.value.salesOrder = item.salesOrder
    inputData.value.position = item.position
    inputData.value.id = item.id
    inputData.value.od = item.od
    inputData.value.th = item.th
    inputData.value.quantity = item.quantity
  }

  function cancelOrderEdit() {
    editingItemIndex.value = null
    inputData.value.position = ''
    inputData.value.id = ''
    inputData.value.od = ''
    inputData.value.quantity = ''
    inputData.value.salesOrder = orderItems.value[0]?.salesOrder ?? ''
    inputData.value.th = orderItems.value[0]?.th ?? ''
    touched.value.position = false
    touched.value.id = false
    touched.value.od = false
    touched.value.quantity = false
  }

  function deleteItem(index: number) {
    if (index < 0 || index >= orderItems.value.length) return

    orderItems.value.splice(index, 1)

    if (editingItemIndex.value === index) {
      editingItemIndex.value = null
      clearEntryFieldsKeepTH()
    } else if (editingItemIndex.value !== null && index < editingItemIndex.value) {
      editingItemIndex.value -= 1
    }

    if (orderItems.value.length === 0 && editingItemIndex.value === null) {
      inputData.value.salesOrder = ''
      inputData.value.th = ''
    }
  }

  function markTouched(key: FieldKey) {
    touched.value[key] = true
  }

  function fieldMessages(key: FieldKey): string[] {
    return buildFieldMessages(key, touched.value, validation.value)
  }

  const fieldStates = computed<Record<FieldKey, 'empty' | 'ok' | 'warn'>>(() => ({
    salesOrder: getFieldState('salesOrder', inputData.value, validation.value),
    position: getFieldState('position', inputData.value, validation.value),
    id: getFieldState('id', inputData.value, validation.value),
    od: getFieldState('od', inputData.value, validation.value),
    th: getFieldState('th', inputData.value, validation.value),
    quantity: getFieldState('quantity', inputData.value, validation.value),
  }))

  const fieldMessagesMap = computed<Record<FieldKey, string[]>>(() => ({
    salesOrder: fieldMessages('salesOrder'),
    position: fieldMessages('position'),
    id: fieldMessages('id'),
    od: fieldMessages('od'),
    th: fieldMessages('th'),
    quantity: fieldMessages('quantity'),
  }))

  const level2Warnings = computed(() => {
    return computeLevel2Warnings(orderItems.value, level2Shrinkage.value, level2Tolerance.value)
  })

  const calculationResult = computed<CalculationResult | null>(() => {
    return computeCalculationResult(orderItems.value, level2Shrinkage.value, level2Tolerance.value)
  })

  function runCalculation() {
    if (orderItems.value.length === 0) {
      alert(t.value.noItemsForCalculation)
      return
    }

    if (level2Warnings.value.length > 0) {
      const message = `${t.value.alertsConfirmTitle}\n\n- ${level2Warnings.value.join('\n- ')}`
      const accepted = window.confirm(message)
      if (!accepted) return
    }

    calculationVisible.value = true
  }

  return {
    inputData,
    orderItems,
    editingItemIndex,
    level2Shrinkage,
    level2Tolerance,
    calculationVisible,
    canAddItem,
    salesOrderLocked,
    thLocked,
    fieldStates,
    fieldMessagesMap,
    calculationResult,
    addNewItem,
    editItem,
    cancelOrderEdit,
    deleteItem,
    markTouched,
    runCalculation,
  }
}