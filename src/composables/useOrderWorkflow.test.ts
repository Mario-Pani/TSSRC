import { computed } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import { APP_COPY } from '../appCopy'
import { useOrderWorkflow } from './useOrderWorkflow'

function createWorkflow() {
  return useOrderWorkflow({ t: computed(() => APP_COPY.MX) })
}

describe('useOrderWorkflow', () => {
  it('agrega un item valido y limpia campos de captura parciales', () => {
    const workflow = createWorkflow()

    workflow.inputData.value.salesOrder = '12345'
    workflow.inputData.value.position = '10'
    workflow.inputData.value.id = '500'
    workflow.inputData.value.od = '900'
    workflow.inputData.value.th = '20'
    workflow.inputData.value.quantity = '2'

    workflow.addNewItem()

    expect(workflow.orderItems.value.length).toBe(1)
    expect(workflow.orderItems.value[0].salesOrder).toBe('12345')
    expect(workflow.inputData.value.position).toBe('')
    expect(workflow.inputData.value.id).toBe('')
    expect(workflow.inputData.value.od).toBe('')
    expect(workflow.inputData.value.quantity).toBe('')
    expect(workflow.inputData.value.th).toBe('20')
  })

  it('permite editar item existente y confirmar cambios', () => {
    const workflow = createWorkflow()

    workflow.inputData.value.salesOrder = '12345'
    workflow.inputData.value.position = '10'
    workflow.inputData.value.id = '500'
    workflow.inputData.value.od = '900'
    workflow.inputData.value.th = '20'
    workflow.inputData.value.quantity = '2'
    workflow.addNewItem()

    workflow.editItem(0)
    workflow.inputData.value.position = '11'
    workflow.inputData.value.quantity = '3'
    workflow.addNewItem()

    expect(workflow.orderItems.value.length).toBe(1)
    expect(workflow.orderItems.value[0].position).toBe('11')
    expect(workflow.orderItems.value[0].quantity).toBe('3')
    expect(workflow.editingItemIndex.value).toBeNull()
  })

  it('runCalculation sin items muestra alerta y no habilita resultado', () => {
    const workflow = createWorkflow()
    const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => undefined)

    workflow.runCalculation()

    expect(alertSpy).toHaveBeenCalledOnce()
    expect(workflow.calculationVisible.value).toBe(false)
  })

  it('runCalculation con items validos activa el panel de resultados', () => {
    const workflow = createWorkflow()

    workflow.inputData.value.salesOrder = '12345'
    workflow.inputData.value.position = '10'
    workflow.inputData.value.id = '500'
    workflow.inputData.value.od = '900'
    workflow.inputData.value.th = '20'
    workflow.inputData.value.quantity = '2'
    workflow.addNewItem()

    workflow.runCalculation()

    expect(workflow.calculationVisible.value).toBe(true)
    expect(workflow.calculationResult.value).not.toBeNull()
  })
})