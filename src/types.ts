export type LanguageCode = 'US' | 'MX' | 'HVR'
export type FieldKey = 'salesOrder' | 'position' | 'id' | 'od' | 'th' | 'quantity'
export type ThemeMode = 'light' | 'dark'

export type FieldValidation = {
  errors: string[]
  warnings: string[]
}

export type OrderItem = {
  salesOrder: string
  position: string
  id: string
  od: string
  th: string
  quantity: string
}

export type OrderFormData = {
  id: string
  od: string
  th: string
  quantity: string
  salesOrder: string
  position: string
}

export type LayerCombination = {
  id: string
  thickness: number
  combination: string
  layerCount: number
  finalThickness: number
  active: boolean
  updatedAt: string
  updatedBy: string
}

export type LayerDraft = {
  thickness: string
  combination: string
  layerCount: string
  finalThickness: string
}

export type CalculationResult = {
  idMin: number
  odMax: number
  thNom: number
  segments: number
  angleCutDeg: number
  idN: number
  odN: number
  thN: number
  rbNom: number
  rbAdj: number
  ssAdj: number
  slAdj: number
  hAdj: number
  qtyTotal: number
  nTotal: number
  shrinkPct: number
  tolerancePct: number
}

export type LayerStackItem = {
  index: number
  thickness: number
}

export type AppCopy = {
  brand: string
  nav: string[]
  newItem: string
  saveItem: string
  calculate: string
  calculationTitle: string
  trapezoidTitle: string
  layersTitle: string
  layersReadOnlyHint: string
  layersAdminHint: string
  layersUser: string
  layersPin: string
  layersUnlock: string
  layersLock: string
  layersAdd: string
  layersSave: string
  layersCancel: string
  orderEditTitle: string
  orderEditHint: string
  layersEdit: string
  layersThickness: string
  layersCombination: string
  layersLayerCount: string
  layersFinalThickness: string
  layerItemLabel: string
  layerNoMatch: string
  layersStatus: string
  layersUpdatedBy: string
  layersUpdatedAt: string
  layersNoData: string
  layersAdminInvalidPin: string
  layersActive: string
  layersInactive: string
  shrinkage: string
  tolerance: string
  noItemsForCalculation: string
  alertsConfirmTitle: string
  orderItemsTitle: string
  emptyOrderItems: string
  actions: string
  edit: string
  delete: string
  labels: {
    ID: string
    OD: string
    TH: string
    quantity: string
    salesOrder: string
    position: string
  }
  themeDark: string
  themeLight: string
  selectorLabel: string
}

export type LanguageOption = {
  code: LanguageCode
  label: string
  flagSrc: string
}