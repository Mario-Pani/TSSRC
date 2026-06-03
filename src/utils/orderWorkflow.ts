import type { CalculationResult, FieldKey, FieldValidation, OrderFormData, OrderItem } from '../types'

export function isPositiveNumber(raw: string): boolean {
  const value = Number(raw)
  return Number.isFinite(value) && value > 0
}

export function isPositiveInteger(raw: string): boolean {
  const value = Number(raw)
  return Number.isInteger(value) && value > 0
}

export function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(',', '.').trim()
  if (!cleaned) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

export function parseIntStrict(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isInteger(value) ? value : null
}

export function createOrderValidation(
  inputData: OrderFormData,
  orderItems: OrderItem[],
  editingItemIndex: number | null,
): Record<FieldKey, FieldValidation> {
  const result: Record<FieldKey, FieldValidation> = {
    salesOrder: { errors: [], warnings: [] },
    position: { errors: [], warnings: [] },
    id: { errors: [], warnings: [] },
    od: { errors: [], warnings: [] },
    th: { errors: [], warnings: [] },
    quantity: { errors: [], warnings: [] }
  }

  const salesOrder = inputData.salesOrder.trim()
  const position = inputData.position.trim()
  const idRaw = inputData.id.trim()
  const odRaw = inputData.od.trim()
  const thRaw = inputData.th.trim()
  const quantityRaw = inputData.quantity.trim()

  if (!salesOrder) {
    result.salesOrder.errors.push('Orden de venta es requerida.')
  } else if (!/^\d+$/.test(salesOrder)) {
    result.salesOrder.errors.push('Orden de venta debe ser numerica entera.')
  }

  if (!position) {
    result.position.errors.push('POS es requerida.')
  } else if (!/^\d+$/.test(position)) {
    result.position.errors.push('POS debe ser numerica entera.')
  } else {
    const duplicatePos = orderItems.some((item, index) => index !== editingItemIndex && item.position === position)
    if (duplicatePos) result.position.errors.push('POS debe ser unica dentro de la orden.')
  }

  const idValue = parseNumber(idRaw)
  const odValue = parseNumber(odRaw)
  const thValue = parseNumber(thRaw)
  const quantityValue = parseIntStrict(quantityRaw)

  if (!idRaw) result.id.errors.push('ID es requerido.')
  else if (idValue === null) result.id.errors.push('ID debe ser numerico decimal.')

  if (!odRaw) result.od.errors.push('OD es requerido.')
  else if (odValue === null) result.od.errors.push('OD debe ser numerico decimal.')

  if (idValue !== null && odValue !== null && idValue >= odValue) {
    result.id.errors.push('ID debe ser menor que OD.')
    result.od.errors.push('OD debe ser mayor que ID.')
  }

  if (idValue !== null && idValue < 400) result.id.warnings.push('ID menor a 400: alerta de calidad (no bloqueante).')
  if (odValue !== null && odValue > 3000) result.od.warnings.push('OD mayor a 3000: alerta de calidad (no bloqueante).')

  if (!thRaw) result.th.errors.push('TH es requerido.')
  else if (thValue === null) result.th.errors.push('TH debe ser numerico decimal.')
  else if (thValue < 6 || thValue > 80) {
    result.th.warnings.push('TH fuera de 6-80 mm: posible compromiso de durabilidad/fabricacion.')
  }

  if (!quantityRaw) result.quantity.errors.push('Cantidad es requerida.')
  else if (quantityValue === null) result.quantity.errors.push('Cantidad debe ser numerica entera.')
  else if (quantityValue < 1) result.quantity.errors.push('Cantidad debe ser minimo 1.')

  if (idValue !== null && odValue !== null) {
    const hasOverlap = orderItems.some((item, index) => {
      if (index === editingItemIndex) return false
      const itemId = parseNumber(item.id)
      const itemOd = parseNumber(item.od)
      if (itemId === null || itemOd === null) return false
      return idValue <= itemOd && odValue >= itemId
    })

    if (hasOverlap) {
      result.id.errors.push('El anillo se empalma o superpone con otro item de la orden.')
      result.od.errors.push('El anillo se empalma o superpone con otro item de la orden.')
    }
  }

  return result
}

export function getFieldState(
  key: FieldKey,
  inputData: OrderFormData,
  validation: Record<FieldKey, FieldValidation>,
): 'empty' | 'ok' | 'warn' {
  const value = inputData[key].trim()
  if (!value) return 'empty'
  if (validation[key].errors.length > 0 || validation[key].warnings.length > 0) return 'warn'
  if (key === 'id' || key === 'od' || key === 'th') return isPositiveNumber(value) ? 'ok' : 'warn'
  if (key === 'quantity') return isPositiveInteger(value) ? 'ok' : 'warn'
  return 'ok'
}

export function buildFieldMessages(
  key: FieldKey,
  touched: Record<FieldKey, boolean>,
  validation: Record<FieldKey, FieldValidation>,
) {
  if (!touched[key]) return []
  return [...validation[key].errors, ...validation[key].warnings]
}

export function computeLevel2Warnings(orderItems: OrderItem[], shrinkage: number, tolerance: number) {
  const warnings: string[] = []
  const ids = orderItems.map((item) => parseNumber(item.id)).filter((v): v is number => v !== null)
  const ods = orderItems.map((item) => parseNumber(item.od)).filter((v): v is number => v !== null)
  const ths = orderItems.map((item) => parseNumber(item.th)).filter((v): v is number => v !== null)

  if (ids.some((value) => value < 400)) warnings.push('Hay items con ID menor a 400.')
  if (ods.some((value) => value > 3000)) warnings.push('Hay items con OD mayor a 3000.')
  if (ths.some((value) => value < 6 || value > 80)) warnings.push('Hay items con TH fuera del rango 6-80 mm.')
  if (!Number.isFinite(shrinkage) || shrinkage < 0 || shrinkage > 16) warnings.push('Encogimiento debe estar entre 0 y 16%.')
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 10) warnings.push('Tolerancia debe estar entre 0 y 10%.')

  return warnings
}

export function computeCalculationResult(
  orderItems: OrderItem[],
  shrinkage: number,
  tolerance: number,
): CalculationResult | null {
  if (orderItems.length === 0) return null

  const ids = orderItems.map((item) => parseNumber(item.id)).filter((v): v is number => v !== null)
  const ods = orderItems.map((item) => parseNumber(item.od)).filter((v): v is number => v !== null)
  const ths = orderItems.map((item) => parseNumber(item.th)).filter((v): v is number => v !== null)
  const quantities = orderItems.map((item) => parseIntStrict(item.quantity)).filter((v): v is number => v !== null)
  if (ids.length === 0 || ods.length === 0 || ths.length === 0 || quantities.length === 0) return null

  const idMin = Math.min(...ids)
  const odMax = Math.max(...ods)
  const thNom = ths[0]
  const segments = odMax <= 1600 ? 8 : 16
  const angleCutDeg = 180 / segments
  const ri = idMin / 2
  const ro = odMax / 2
  const ss = 2 * ri * Math.sin(Math.PI / segments)
  const sl = 2 * ro * Math.sin(Math.PI / segments)
  const h = ro - ri * Math.cos(Math.PI / segments)
  const rb = (odMax - idMin) / 2
  const nTotal = segments * quantities.reduce((acc, value) => acc + value, 0)

  const shrinkPct = Number.isFinite(shrinkage) ? shrinkage : 0
  const tolerancePct = Number.isFinite(tolerance) ? tolerance : 5
  const shrinkFactor = 1 + shrinkPct / 100
  const tolFactor = 1 + tolerancePct / 100
  const geomFactor = shrinkFactor * tolFactor

  return {
    idMin,
    odMax,
    thNom,
    segments,
    angleCutDeg,
    idN: idMin * shrinkFactor,
    odN: odMax * shrinkFactor,
    thN: thNom * shrinkFactor,
    rbNom: rb,
    rbAdj: rb * shrinkFactor,
    ssAdj: ss * geomFactor,
    slAdj: sl * geomFactor,
    hAdj: h * geomFactor,
    qtyTotal: quantities.reduce((acc, value) => acc + value, 0),
    nTotal,
    shrinkPct,
    tolerancePct,
  }
}

export function buildNextOrderItem(
  inputData: OrderFormData,
  orderItems: OrderItem[],
  editingItemIndex: number | null,
): OrderItem {
  const isEditing = editingItemIndex !== null
  const baseOrder = isEditing
    ? inputData.salesOrder.trim()
    : (orderItems[0]?.salesOrder ?? inputData.salesOrder.trim())
  const baseTH = isEditing
    ? inputData.th.trim()
    : (orderItems[0]?.th ?? inputData.th.trim())

  return {
    salesOrder: baseOrder,
    position: inputData.position.trim(),
    id: inputData.id.trim(),
    od: inputData.od.trim(),
    th: baseTH,
    quantity: inputData.quantity.trim()
  }
}