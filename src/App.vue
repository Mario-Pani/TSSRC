<!-- src/App.vue
================================================================================
APLICACIÓN PRINCIPAL: TSSRC (Trapezoid Segment Ring Cutting Calculator)

Componente raíz que gestiona:
1. Inputs del usuario (ID, OD, TH, ringCount, layers)
2. Validación de inputs con auto-corrección
3. Cálculos geométricos del trapecio
4. Visualización (SVG + Canvas 2D)
5. Desglose de materiales y cálculos de nesting
6. Gestión de materiales en localStorage

Flujo de datos:
  User Inputs → [Validación] → [Cálculos] → [Visualización]

================================================================================
-->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PreviewCanvas from './components/PreviewCanvas.vue'
import SVGTrapezoid from './components/SVGTrapezoid.vue'
import { computeDimsMemo, pickNByOD } from './utils/geometry'
import { getDefaultMaterials, type Material } from './utils/materials'
import { useNestingCalculations } from './composables/useNestingCalculations'
import { useCuttingBreakdown, type LayerCombination } from './composables/useCuttingBreakdown'
import { useInputValidation } from './composables/useInputValidation'

// Refs para flags de recomendaciones
const syncingRecommendation = ref(false)
const suppressRecommendation = ref(false)

// ============================================
// THEME Y ESTADO GENERAL
// ============================================
const isDark = ref(true)
const activeTab = ref(0)

// ============================================
// INPUTS DEL USUARIO (DEFINIR PRIMERO)
// ============================================
// Estos refs se definen antes que los computed que los usan
// ORDEN IMPORTA: evita "ReferenceError: X is not defined"
const ID = ref<number>(900)
const OD = ref<number>(1000)
const ringCount = ref<number>(6)
const TH = ref<number>(12.8)
const density = ref<number>(1.2)
const layers = ref<number>(4)
const defaultLayerColors = [
  { fill: '#8ac29a', stroke: '#8aa89a' },
  { fill: '#b5f8e4', stroke: '#c1bcd4' }
]
const layerColors = ref<Array<{ fill: string; stroke: string }>>(
  Array.from({ length: layers.value }, (_, i) => ({
    fill: defaultLayerColors[i % 2].fill,
    stroke: defaultLayerColors[i % 2].stroke
  }))
)
const orderNumber = ref<string>('')
const projectLocked = ref(false)
const orderNumberError = computed(() => {
  const value = orderNumber.value.trim()
  return value.length > 0 && !isNumericOrderNumber(value)
})
const orderNumberErrorMsg = computed(() =>
  orderNumberError.value ? 'El numero de orden debe ser numerico' : ''
)


// ============================================
// VALIDACIÓN DE INPUTS Y OPTIMIZACIÓN AUTOMÁTICA
// ============================================
const {
  idError, idErrorMsg,
  odError, odErrorMsg,
  radialError, radialErrorMsg,
  thError, thErrorMsg,
  ringCountError, ringCountErrorMsg,
  layersError, layersErrorMsg,
  validateID: validate_ID,
  validateOD: validate_OD,
  validateTH: validate_TH,
  validateRingCount: validate_RingCount,
  validateLayers: validate_Layers
} = useInputValidation()

function validateID() { validate_ID(ID, OD) }
function validateOD() { validate_OD(ID, OD) }
function validateRadialGap() {}
function validateTH() { validate_TH(TH) }
function validateRingCount() { validate_RingCount(ringCount) }
function validateLayers() { validate_Layers(layers) }

// --- OPTIMIZACIÓN AUTOMÁTICA DE CAPAS Y MATERIAL ---
// import { nextTick } from 'vue' (ya importado más abajo)
let autoOptimizing = false
async function autoOptimizeLayersAndMaterial() {
  if (projectLocked.value || !dims.value) return
  autoOptimizing = true
  await nextTick()
  // Siempre mantener 4 capas y optimizar solo materiales
  layers.value = 4
  const best = findBestLayerCombination(TH.value, 4)
  if (best) {
    layerThicknesses.value = best.layers.map(m => m.thickness)
  }
  autoOptimizing = false
}

watch([ID, OD, TH], async () => {
  await autoOptimizeLayersAndMaterial()
})

function layerBoxFill(idx: number): string {
  const color = layerColors.value[idx]?.fill ?? defaultLayerColors[idx % 2].fill
  return color.length === 7 ? `${color}50` : color
}

function layerBoxBorder(idx: number): string {
  return layerColors.value[idx]?.stroke ?? defaultLayerColors[idx % 2].stroke
}

function createDebouncedValidator(fn: () => void, delay = 250) {
  let timer: number | undefined
  return () => {
    if (timer !== undefined) window.clearTimeout(timer)
    timer = window.setTimeout(() => {
      fn()
    }, delay)
  }
}

const debouncedValidateID = createDebouncedValidator(validateID)
const debouncedValidateOD = createDebouncedValidator(validateOD)
const debouncedValidateTH = createDebouncedValidator(validateTH)
const debouncedValidateRingCount = createDebouncedValidator(validateRingCount)
const debouncedValidateLayers = createDebouncedValidator(validateLayers)

// Watchers para validar en tiempo real (con debounce)
watch(ID, () => debouncedValidateID())
watch(OD, () => debouncedValidateOD())
watch(TH, () => debouncedValidateTH())
watch(ringCount, () => debouncedValidateRingCount())
watch(layers, () => debouncedValidateLayers())

// Materials management
const initializeMaterials = (): Material[] => {
  const stored = localStorage.getItem('materials')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return getDefaultMaterials()
    }
  }
  return getDefaultMaterials()
}

const materials = ref<Material[]>(initializeMaterials())

// Modal state
const showMaterialModal = ref(false)
const editingIndex = ref<number | null>(null)
const editingMaterial = ref<Material>({
  thickness: 1,
  length: 1065,
  width: 762,
  inStock: true
})

// Watch materials to save to localStorage
watch(() => materials.value, (newMaterials) => {
  localStorage.setItem('materials', JSON.stringify(newMaterials))
}, { deep: true })

function openAddMaterialDialog() {
  editingIndex.value = null
  editingMaterial.value = {
    thickness: 1,
    length: 1065,
    width: 762,
    inStock: true
  }
  showMaterialModal.value = true
}

function openEditMaterialDialog(idx: number) {
  editingIndex.value = idx
  editingMaterial.value = { ...materials.value[idx] }
  showMaterialModal.value = true
}

function saveMaterial() {
  if (editingIndex.value === null) {
    materials.value.push({ ...editingMaterial.value })
  } else {
    materials.value[editingIndex.value] = { ...editingMaterial.value }
  }
  showMaterialModal.value = false
}

function deleteMaterial(idx: number) {
  if (confirm('¿Eliminar este material?')) {
    materials.value.splice(idx, 1)
  }
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value)
}

function sanitizeOrderNumber(value: string): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9-_]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

function isNumericOrderNumber(value: string): boolean {
  return /^\d+$/.test(value.trim())
}

function filterOrderNumberInput() {
  orderNumber.value = orderNumber.value.replace(/\D+/g, '')
}

function handleOrderKeydown(event: KeyboardEvent) {
  const allowedKeys = [
    'Backspace',
    'Delete',
    'ArrowLeft',
    'ArrowRight',
    'Tab',
    'Home',
    'End'
  ]

  if (allowedKeys.includes(event.key)) return
  if (/^\d$/.test(event.key)) return

  event.preventDefault()
}

function normalizeMaterials(raw: unknown): Material[] | null {
  if (!Array.isArray(raw)) return null

  const parsed: Material[] = []
  for (const item of raw) {
    if (!item || typeof item !== 'object') return null

    const material = item as Material
    if (!isFiniteNumber(material.thickness) || !isFiniteNumber(material.length) || !isFiniteNumber(material.width)) {
      return null
    }

    parsed.push({
      thickness: material.thickness,
      length: material.length,
      width: material.width,
      inStock: typeof material.inStock === 'boolean' ? material.inStock : true
    })
  }

  return parsed
}

function exportMaterials() {
  const dataStr = JSON.stringify(materials.value, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  link.href = url
  link.download = `materials-${new Date().toISOString().split('T')[0]}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function triggerImportFile() {
  const importInput = document.getElementById('importInput') as HTMLInputElement
  importInput?.click()
}

function importMaterials(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const imported = normalizeMaterials(JSON.parse(e.target?.result as string))
      if (!imported) {
        alert('Formato de archivo inválido')
        return
      }

      materials.value = imported
      alert('Materiales importados correctamente')
    } catch {
      alert('Error al leer el archivo')
    }
  }
  reader.readAsText(file)
  const importInputEl = document.getElementById('importInput') as HTMLInputElement
  if (importInputEl) importInputEl.value = ''
}

function buildProjectSnapshot() {
  return {
    version: 1,
    savedAt: new Date().toISOString(),
    orderNumber: orderNumber.value.trim(),
    inputs: {
      ID: ID.value,
      OD: OD.value,
      TH: TH.value,
      ringCount: ringCount.value,
      layers: layers.value,
      coeffPct: coeffPct.value,
      layerThicknesses: layerThicknesses.value.slice()
    },
    ui: {
      activeTab: activeTab.value,
      showGuides: showGuides.value,
      scale: scale.value,
      panX: panX.value,
      panY: panY.value
    },
    cutting: {
      kerf: kerf.value,
      sheetLength: sheetLength.value,
      sheetWidth: sheetWidth.value,
      selectedMaterialForCutting: selectedMaterialForCutting.value
    },
    materials: materials.value.map((m) => ({ ...m, inStock: m.inStock ?? true }))
  }
}

function exportProject() {
  if (!orderNumber.value.trim()) {
    const input = window.prompt('Ingrese el numero de orden antes de guardar:')
    if (input === null) return
    orderNumber.value = input.trim()
    if (!orderNumber.value) {
      alert('El numero de orden es obligatorio')
      return
    }
  }
  if (!isNumericOrderNumber(orderNumber.value)) {
    alert('El numero de orden debe ser numerico')
    return
  }
  const snapshot = buildProjectSnapshot()
  const dataStr = JSON.stringify(snapshot, null, 2)
  const dataBlob = new Blob([dataStr], { type: 'application/json' })
  const url = URL.createObjectURL(dataBlob)
  const link = document.createElement('a')
  const safeOrder = sanitizeOrderNumber(orderNumber.value) || 'sin-orden'
  link.href = url
  link.download = `${safeOrder}.json`
  link.click()
  URL.revokeObjectURL(url)
}

function resetProject() {
  if (!confirm('¿Iniciar un nuevo proyecto? Los cambios no guardados se perderán.')) return
  ID.value = 800
  OD.value = 1000
  ringCount.value = 6
  TH.value = 12.9
  layers.value = 3
  orderNumber.value = ''
  projectLocked.value = false
  coeffPct.value = 5
  activeTab.value = 0
  showGuides.value = true
  selectedMaterialForCutting.value = null
  sheetLength.value = 3200
  sheetWidth.value = 2108
  kerf.value = 3
  layerThicknesses.value = Array.from({ length: layers.value }, () => TH.value / layers.value)
  skipThicknessSync.value = false
  syncingRecommendation.value = false
  suppressRecommendation.value = false
  selectedRecommendedIndex.value = 0
  resetview()
}

function triggerProjectImport() {
  const importInput = document.getElementById('projectImportInput') as HTMLInputElement
  importInput?.click()
}

function importProject(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const raw = JSON.parse(e.target?.result as string)
      if (!raw || typeof raw !== 'object') {
        alert('Formato de archivo inválido')
        return
      }

      const snapshot = raw as {
        version?: number
        orderNumber?: string
        inputs?: {
          ID?: number
          OD?: number
          TH?: number
          ringCount?: number
          layers?: number
          coeffPct?: number
          layerThicknesses?: number[]
        }
        ui?: {
          activeTab?: number
          showGuides?: boolean
          scale?: number
          panX?: number
          panY?: number
        }
        cutting?: {
          kerf?: number
          sheetLength?: number
          sheetWidth?: number
          selectedMaterialForCutting?: number | null
        }
        materials?: Material[]
      }

      if (typeof snapshot.orderNumber === 'string') {
        orderNumber.value = snapshot.orderNumber
      }

      if (snapshot.inputs) {
        const inputs = snapshot.inputs
        skipThicknessSync.value = true

        if (isFiniteNumber(inputs.ID)) ID.value = inputs.ID
        if (isFiniteNumber(inputs.OD)) OD.value = inputs.OD
        if (isFiniteNumber(inputs.TH)) TH.value = inputs.TH
        if (isFiniteNumber(inputs.ringCount)) ringCount.value = inputs.ringCount
        if (isFiniteNumber(inputs.layers)) layers.value = inputs.layers
        if (isFiniteNumber(inputs.coeffPct)) coeffPct.value = inputs.coeffPct

        if (Array.isArray(inputs.layerThicknesses) && inputs.layerThicknesses.every(isFiniteNumber)) {
          onUpdateLayerThicknesses(inputs.layerThicknesses)
        }
      }

      if (snapshot.ui) {
        const ui = snapshot.ui
        if (isFiniteNumber(ui.activeTab)) activeTab.value = ui.activeTab
        if (typeof ui.showGuides === 'boolean') showGuides.value = ui.showGuides
        if (isFiniteNumber(ui.scale)) scale.value = ui.scale
        if (isFiniteNumber(ui.panX)) panX.value = ui.panX
        if (isFiniteNumber(ui.panY)) panY.value = ui.panY
      }

      if (snapshot.cutting) {
        const cutting = snapshot.cutting
        if (isFiniteNumber(cutting.kerf)) kerf.value = cutting.kerf
        if (isFiniteNumber(cutting.sheetLength)) sheetLength.value = cutting.sheetLength
        if (isFiniteNumber(cutting.sheetWidth)) sheetWidth.value = cutting.sheetWidth
        if (cutting.selectedMaterialForCutting === null || isFiniteNumber(cutting.selectedMaterialForCutting)) {
          selectedMaterialForCutting.value = cutting.selectedMaterialForCutting
        }
      }

      if (snapshot.materials) {
        const normalized = normalizeMaterials(snapshot.materials)
        if (normalized) materials.value = normalized
      }

      projectLocked.value = true

      alert('Proyecto cargado correctamente')
    } catch {
      alert('Error al leer el archivo')
    }
  }
  reader.readAsText(file)

  const importInputEl = document.getElementById('projectImportInput') as HTMLInputElement
  if (importInputEl) importInputEl.value = ''
}

// Materials tab state
const materialsSearch = ref('')
const sortField = ref<'thickness' | 'length' | 'width'>('thickness')
const sortAsc = ref(true)

// Cutting tab state
const selectedMaterialForCutting = ref<number | null>(null)
const sheetLength = ref(3200)
const sheetWidth = ref(2108)
const kerf = ref(3) // Separación de corte en mm
const canvasWidth = 700
const canvasHeight = 500
const recommendedCanvasWidth = 360
const recommendedCanvasHeight = 260

// Coeficiente en % (editable) ⇄ factor
const coeffPct = ref<number>(5)
const coeff = computed(() => 1 + ((+coeffPct.value || 0) / 100))

function recommendLayerCount(targetTH: number, minLayers = 3, maxLayers = 8) {
  let bestCount = minLayers
  let bestDiff = Number.POSITIVE_INFINITY

  for (let count = minLayers; count <= maxLayers; count++) {
    const combo = findBestLayerCombination(targetTH, count)
    if (!combo) continue
    const diff = Math.abs(combo.totalThickness - targetTH)
    if (diff < bestDiff) {
      bestDiff = diff
      bestCount = count
    }
  }

  return bestCount
}

function uniqueMaterialsByThickness(materials: Material[]) {
  const byThickness = new Map<number, Material>()
  for (const mat of materials) {
    if (!byThickness.has(mat.thickness)) {
      byThickness.set(mat.thickness, mat)
    }
  }
  return Array.from(byThickness.values())
}

function pickClosestMaterials(materials: Material[], target: number, maxCount: number) {
  return [...materials]
    .sort((a, b) => Math.abs(a.thickness - target) - Math.abs(b.thickness - target))
    .slice(0, maxCount)
}

function findBestLayerCombination(targetTH: number, layerCount: number): LayerCombination | null {
  let bestCombination: LayerCombination | null = null

  const numLayers = Math.max(3, layerCount)
  const pairCount = Math.floor(numLayers / 2)
  const hasCenter = numLayers % 2 === 1

  // Filtrar solo materiales en stock
  const inStockMaterials = materials.value.filter(m => m.inStock !== false)
  
  // Usar todos los materiales únicos en stock para combinaciones
  const candidateMats = uniqueMaterialsByThickness(inStockMaterials)

  function buildLayers(pairThicknesses: Material[], center?: Material): Material[] {
    const left = pairThicknesses.map(p => p)
    const right = [...pairThicknesses].reverse().map(p => p)
    return hasCenter ? [...left, center!, ...right] : [...left, ...right]
  }

  function evalCombination(layersList: Material[]) {
    const total = layersList.reduce((sum, m) => sum + m.thickness, 0)
    if (!bestCombination || Math.abs(total - targetTH) < Math.abs(bestCombination.totalThickness - targetTH)) {
      bestCombination = {
        layers: layersList,
        totalThickness: total,
        layerCount: numLayers
      }
    }
  }

  function recursePairs(idx: number, current: Material[]) {
    if (idx === pairCount) {
      if (hasCenter) {
        for (const center of candidateMats) {
          evalCombination(buildLayers(current, center))
        }
      } else {
        evalCombination(buildLayers(current))
      }
      return
    }

    for (const mat of candidateMats) {
      current.push(mat)
      recursePairs(idx + 1, current)
      current.pop()
    }
  }

  recursePairs(0, [])

  return bestCombination
}

// ---- NUEVO: Optimizador Global de Rendimiento (Eficiencia) ----
function findOptimalYieldCombination(targetTH: number, allowedVariance = 1): LayerCombination | null {
  const inStockMaterials = materials.value.filter(m => m.inStock !== false)
  if (inStockMaterials.length === 0 || !dims.value) return null

  let bestCandidate: LayerCombination | null = null
  let maxScore = -Number.MAX_VALUE
  let bestYieldRaw = 0

  // Para cada cantidad de capas, buscar la mejor combinación y comparar eficiencia
  for (let numLayers = 3; numLayers <= 8; numLayers++) {
    const combo = findBestLayerCombination(targetTH, numLayers)
    if (!combo) continue
    const ringN = pickNByOD(+OD.value)
    const { yieldPct } = simulateGlobalYield(
      dims.value,
      combo.layers,
      ringN,
      ringCount.value,
      1.2
    )
    if (yieldPct > maxScore) {
      maxScore = yieldPct
      bestCandidate = combo
      bestYieldRaw = yieldPct
    } else if (Math.abs(yieldPct - maxScore) < 0.1 && bestCandidate && combo.layerCount < bestCandidate.layerCount) {
      // Si hay empate, menos capas es mejor
      bestCandidate = combo
      bestYieldRaw = yieldPct
    }
  }
  if (bestCandidate) {
    (bestCandidate as any).rawYield = bestYieldRaw
  }
  return bestCandidate
}

// Optimiza cantidad de capas y materiales buscando la mejor eficiencia y tolerancia
import { nextTick } from 'vue'
async function autoOptimizeGlobalYield() {
  if (projectLocked.value || !dims.value) return
  const best = findOptimalYieldCombination(TH.value, 1)
  if (best) {
    layers.value = best.layerCount
    await nextTick()
    layerThicknesses.value = best.layers.map(m => m.thickness)
    // @ts-ignore
    alert(`¡Optimización Exitosa!\nEficiencia proyectada: ${((best as any).rawYield ?? globalCuttingStats.value.overallYieldPct).toFixed(1)}%\nSe configuraron ${best.layerCount} capas óptimas.`)
  } else {
    alert("No se encontró una combinación válida para la eficiencia y tolerancia.")
  }
}

// Definir layerCombination como una proyección estructurada de layerThicknesses
const layerCombination = computed<LayerCombination | null>(() => {
  const thicknesses = layerThicknesses.value
  if (!thicknesses || thicknesses.length === 0) return null

  const targetLayers: Material[] = []
  let totalThickness = 0
  const inStockMaterials = materials.value.filter(m => m.inStock !== false)

  for (const t of thicknesses) {
    let stockItem = inStockMaterials.find(m => m.thickness === t)
    if (!stockItem) stockItem = materials.value.find(m => m.thickness === t)
    
    if (stockItem) {
      targetLayers.push(stockItem)
    } else {
      // Fallback fail-safe
      targetLayers.push({
        thickness: t,
        length: 3200,
        width: 2108,
        inStock: true
      })
    }
    totalThickness += t
  }

  return {
    layers: targetLayers,
    totalThickness,
    layerCount: targetLayers.length
  }
})

// Refs para control de la hoja de corte
const layerThicknesses = ref<number[]>(Array.from({ length: layers.value }, () => TH.value / layers.value))
const skipThicknessSync = ref(false)

// Zoom y Panel
const scale = ref(0.22)
const wheelStep = 0.02
const panX = ref(0)
const panY = ref(0)

function resetview() {
  scale.value = 0.22
  panX.value = 0
  panY.value = 0
}

// Cálculo con manejo de errores
const calcError = ref<string | null>(null)
const dims = computed(() => {
  try {
    const d = computeDimsMemo(+ID.value, +OD.value, +coeff.value)
    calcError.value = null
    return d
  } catch (e: any) {
    calcError.value = e?.message || 'Error de cálculo'
    return null
  }
})

// Salidas computadas
const SL1 = computed(() => dims.value?.s_in ?? 0)
const SL2 = computed(() => dims.value?.s_out ?? 0)
const H1 = computed(() => dims.value?.h ?? 0)
const A1 = computed(() => dims.value?.alphaDeg ?? 0)
const N = computed(() => pickNByOD(+OD.value))
const showGuides = ref(true)

const {
  trapezoidBoundingBox,
  trapezoidsPerSheet,
  calculateTrapezoidsPerSheet,
  computeCuttingScaleFor,
  buildNestingLayout,
  calculateOffcuts
} = useNestingCalculations(dims, sheetLength, sheetWidth, kerf)

// Usar composable para breakdown de materiales (después de useNestingCalculations)
const { cuttingBreakdown, recommendedCuttingLayouts, globalCuttingStats, simulateGlobalYield } = useCuttingBreakdown(
  dims,
  layerCombination,
  N,
  ringCount,
  calculateTrapezoidsPerSheet,
  computeCuttingScaleFor,
  buildNestingLayout,
  recommendedCanvasWidth,
  recommendedCanvasHeight,
  density,
  calculateOffcuts
)

const selectedRecommendedIndex = ref(0)
const selectedRecommendedLayout = computed(() => {
  return recommendedCuttingLayouts.value[selectedRecommendedIndex.value] ?? null
})

const selectedRecommendedTrapArea = computed(() => {
  return ((SL1.value + SL2.value) / 2) * H1.value
})

const selectedRecommendedSheetArea = computed(() => {
  const item = selectedRecommendedLayout.value
  if (!item) return 0
  return item.material.length * item.material.width
})

const selectedRecommendedHasPartial = computed(() => {
  const item = selectedRecommendedLayout.value
  if (!item || item.trapezoidsPerSheet <= 0) return false
  return item.trapezoidsNeeded % item.trapezoidsPerSheet !== 0
})

const selectedRecommendedFullSheets = computed(() => {
  const item = selectedRecommendedLayout.value
  if (!item || item.trapezoidsPerSheet <= 0) return 0
  return Math.floor(item.trapezoidsNeeded / item.trapezoidsPerSheet)
})

const selectedRecommendedPartialTraps = computed(() => {
  const item = selectedRecommendedLayout.value
  if (!item || item.trapezoidsPerSheet <= 0) return 0
  return item.trapezoidsNeeded % item.trapezoidsPerSheet
})

const selectedRecommendedFullUtilization = computed(() => {
  const item = selectedRecommendedLayout.value
  const sheetArea = selectedRecommendedSheetArea.value
  if (!item || sheetArea <= 0) return 0
  return (item.trapezoidsPerSheet * selectedRecommendedTrapArea.value) / sheetArea
})

const selectedRecommendedPartialUtilization = computed(() => {
  const sheetArea = selectedRecommendedSheetArea.value
  if (sheetArea <= 0) return 0
  return (selectedRecommendedPartialTraps.value * selectedRecommendedTrapArea.value) / sheetArea
})

const selectedRecommendedOverallUtilization = computed(() => {
  const item = selectedRecommendedLayout.value
  const sheetArea = selectedRecommendedSheetArea.value
  if (!item || sheetArea <= 0 || item.sheetsRequired <= 0) return 0
  return (item.trapezoidsNeeded * selectedRecommendedTrapArea.value)
    / (item.sheetsRequired * sheetArea)
})

const selectedRecommendedFullLayout = computed(() => {
  const item = selectedRecommendedLayout.value
  if (!item) return null
  return buildNestingLayout(
    item.material.length,
    item.material.width,
    item.scale,
    item.trapezoidsPerSheet
  )
})

const selectedRecommendedPartialLayout = computed(() => {
  const item = selectedRecommendedLayout.value
  if (!item || !selectedRecommendedHasPartial.value) return null
  return buildNestingLayout(
    item.material.length,
    item.material.width,
    item.scale,
    selectedRecommendedPartialTraps.value
  )
})

function exportRecommendedLayoutDxf(target: 'full' | 'partial' | 'single') {
  const item = selectedRecommendedLayout.value
  if (!item) return
  if (selectedRecommendedFullSheets.value === 0 && target !== 'partial') return

  const fullLayout = selectedRecommendedFullLayout.value ?? item.layout
  const partialLayout = selectedRecommendedPartialLayout.value ?? []
  const singleLayout = item.layout

  const layoutMap: Record<'full' | 'partial' | 'single', { title: string; traps: Array<{ points: string }> }> = {
    full: { title: 'Hoja completa', traps: fullLayout },
    partial: { title: 'Hoja parcial', traps: partialLayout },
    single: { title: 'Layout recomendado', traps: singleLayout }
  }

  if (target === 'partial' && !selectedRecommendedHasPartial.value) return

  const selected = layoutMap[target]

  const toMm = (xPx: number, yPx: number) => {
    const x = (xPx - 20) / item.scale
    const yFromTop = (yPx - 20) / item.scale
    const y = item.material.width - yFromTop
    return { x, y }
  }

  const dxfLine = (layer: string, p1: { x: number; y: number }, p2: { x: number; y: number }) => {
    return `0\nLINE\n8\n${layer}\n10\n${p1.x.toFixed(4)}\n20\n${p1.y.toFixed(4)}\n11\n${p2.x.toFixed(4)}\n21\n${p2.y.toFixed(4)}\n`
  }

  const dxfPolygonAsLines = (layer: string, points: Array<{ x: number; y: number }>) => {
    if (points.length < 2) return ''
    let out = ''
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i]
      const p2 = points[(i + 1) % points.length]
      out += dxfLine(layer, p1, p2)
    }
    return out
  }

  const parseTrapPoints = (pointsStr: string) => {
    return pointsStr.split(' ').map((pair) => {
      const [xStr, yStr] = pair.split(',')
      return toMm(Number(xStr), Number(yStr))
    })
  }

  const sheetPoints = [
    { x: 0, y: 0 },
    { x: item.material.length, y: 0 },
    { x: item.material.length, y: item.material.width },
    { x: 0, y: item.material.width }
  ]

  const sheetEntity = dxfPolygonAsLines('HOJA', sheetPoints)
  const trapEntities = selected.traps
    .map((trap) => dxfPolygonAsLines('TRAPECIOS', parseTrapPoints(trap.points)))
    .join('')

  const dxf = `0\nSECTION\n2\nHEADER\n9\n$ACADVER\n1\nAC1009\n9\n$INSUNITS\n70\n4\n0\nENDSEC\n0\nSECTION\n2\nENTITIES\n${sheetEntity}${trapEntities}0\nENDSEC\n0\nEOF\n`

  const blob = new Blob([dxf], { type: 'application/dxf;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `layout-corte-${selectedRecommendedIndex.value + 1}-${target}.dxf`
  link.click()
  URL.revokeObjectURL(url)
}
// Escala para dibujar la hoja en el canvas
const cuttingScale = computed(() => {
  return computeCuttingScaleFor(sheetLength.value, sheetWidth.value, canvasWidth, canvasHeight)
})

const sheetScaledWidth = computed(() => {
  return sheetLength.value * cuttingScale.value
})

const sheetScaledHeight = computed(() => {
  return sheetWidth.value * cuttingScale.value
})

const nestingLayout = computed(() => {
  return buildNestingLayout(sheetLength.value, sheetWidth.value, cuttingScale.value)
})

const detailedOffcuts = computed(() => {
  return calculateOffcuts(nestingLayout.value, sheetLength.value, sheetWidth.value, 1, 0, 0)
})

const utilizationPercentage = computed(() => {
  const sheetArea = sheetLength.value * sheetWidth.value
  const trapArea = ((SL1.value + SL2.value) / 2) * H1.value
  if (sheetArea <= 0) return 0
  return (trapezoidsPerSheet.value * trapArea) / sheetArea * 100
})

// Espesor por capa
const thicknessPerLayer = computed(() => {
  return TH.value > 0 ? TH.value / layers.value : 0
})

// Materiales filtrados y ordenados
const filteredAndSortedMaterials = computed(() => {
  let filtered = materials.value
  
  if (materialsSearch.value) {
    const search = materialsSearch.value.toLowerCase()
    filtered = filtered.filter(m => 
      m.thickness.toString().includes(search) ||
      m.length.toString().includes(search) ||
      m.width.toString().includes(search)
    )
  }

  const sorted = filtered.slice().sort((a, b) => {
    let aVal: number, bVal: number
    const field = sortField.value
    
    if (field === 'thickness') {
      aVal = a.thickness
      bVal = b.thickness
    } else if (field === 'length') {
      aVal = a.length
      bVal = b.length
    } else {
      aVal = a.width
      bVal = b.width
    }
    
    return sortAsc.value ? aVal - bVal : bVal - aVal
  })

  return sorted
})

function sortBy(field: 'thickness' | 'length' | 'width') {
  if (sortField.value === field) {
    sortAsc.value = !sortAsc.value
  } else {
    sortField.value = field
    sortAsc.value = true
  }
}

watch(() => layers.value, (newCount) => {
  const count = Math.max(3, newCount)
  layers.value = count
  while (layerThicknesses.value.length < count) {
    layerThicknesses.value.push(TH.value / count)
  }
  if (layerThicknesses.value.length > count) layerThicknesses.value.length = count
})

watch(() => TH.value, () => {
  if (skipThicknessSync.value) {
    skipThicknessSync.value = false
    return
  }
  const recommended = recommendLayerCount(TH.value)
  if (layers.value !== recommended) {
    layers.value = recommended
  }
  const count = Math.max(3, layers.value)
  layerThicknesses.value = Array.from({ length: count }, () => TH.value / count)
})

function normalizeSymmetricThicknesses(input: number[], count: number, total: number, prev: number[]) {
  const result = input.slice(0, count)
  while (result.length < count) result.push(total / count || 1)

  const pairCount = Math.floor(count / 2)
  const hasCenter = count % 2 === 1
  const centerIdx = Math.floor(count / 2)
  const midLeft = count / 2 - 1
  const midRight = count / 2

  const centerEdited = hasCenter && prev[centerIdx] !== undefined && result[centerIdx] !== prev[centerIdx]
  const middlePairEdited = !hasCenter && (
    (prev[midLeft] !== undefined && result[midLeft] !== prev[midLeft]) ||
    (prev[midRight] !== undefined && result[midRight] !== prev[midRight])
  )

  if (hasCenter && centerEdited) {
    const centerVal = result[centerIdx]
    const pairVal = pairCount > 0 ? (total - centerVal) / (2 * pairCount) : 0
    for (let i = 0; i < pairCount; i++) {
      result[i] = pairVal
      result[count - 1 - i] = pairVal
    }
    result[centerIdx] = centerVal
    return result
  }

  if (!hasCenter && middlePairEdited) {
    const pairVal = total / (2 * pairCount)
    for (let i = 0; i < pairCount; i++) {
      result[i] = pairVal
      result[count - 1 - i] = pairVal
    }
    return result
  }

  // Default: mirror pairs from input, then set center or middle pair to keep total
  for (let i = 0; i < pairCount; i++) {
    result[count - 1 - i] = result[i]
  }

  if (hasCenter) {
    const sumPairs = result.reduce((sum, v, idx) => idx === centerIdx ? sum : sum + v, 0)
    result[centerIdx] = total - sumPairs
  } else {
    const sumWithoutMiddle = result.reduce((sum, v, idx) => (idx === midLeft || idx === midRight) ? sum : sum + v, 0)
    const midVal = (total - sumWithoutMiddle) / 2
    result[midLeft] = midVal
    result[midRight] = midVal
  }

  return result
}

function onUpdateLayerThicknesses(v: number[]) {
  const count = Math.max(3, layers.value)
  const normalized = normalizeSymmetricThicknesses(v, count, TH.value, layerThicknesses.value)

  if (!sameNumberArray(normalized, layerThicknesses.value)) {
    layerThicknesses.value = normalized
  }
}

function sameNumberArray(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

// Watchers de TH y capas para auto-sugerir una combinación base cuando el diseño primario cambia
watch([TH, layers], () => {
  if (skipThicknessSync.value) return
  
  const recommended = findBestLayerCombination(TH.value, layers.value)
  if (recommended) {
    const recommendedThicknesses = recommended.layers.map(m => m.thickness)
    if (!sameNumberArray(recommendedThicknesses, layerThicknesses.value)) {
      layerThicknesses.value = recommendedThicknesses
    }
  }
})
</script>

<template>
  <v-app :theme="isDark ? 'dark' : 'light'">
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title class="text-subtitle-1 font-weight-medium">Anillo Estático en Segmentos Trapezoidales</v-app-bar-title>
      <v-spacer />
      <div class="d-flex align-center gap-2">
        <v-text-field
          v-model="orderNumber"
          type="text"
          inputmode="numeric"
          pattern="\d*"
          label="Orden"
          variant="outlined"
          density="compact"
          hide-details
          :disabled="projectLocked"
          :error="orderNumberError"
          :error-messages="orderNumberErrorMsg"
          @keydown="handleOrderKeydown"
          @input="filterOrderNumberInput"
          style="width: clamp(160px, 22vw, 260px)"
        />
        <v-tooltip text="Guardar proyecto">
          <template #activator="{ props }">
            <v-btn
              size="small"
              color="info"
              icon="mdi-content-save"
              @click="exportProject"
              v-bind="props"
            />
          </template>
        </v-tooltip>
        <v-tooltip text="Nuevo proyecto">
          <template #activator="{ props }">
            <v-btn
              size="small"
              color="info"
              icon="mdi-file-plus"
              @click="resetProject"
              v-bind="props"
            />
          </template>
        </v-tooltip>
        <v-tooltip text="Cargar proyecto">
          <template #activator="{ props }">
            <v-btn
              size="small"
              color="info"
              icon="mdi-folder-open"
              @click="triggerProjectImport"
              v-bind="props"
            />
          </template>
        </v-tooltip>
        <input
          id="projectImportInput"
          type="file"
          accept=".json"
          style="display:none"
          @change="importProject"
        />
      </div>
      <v-tooltip :text="isDark ? 'Oscuro' : 'Claro'">
        <template #activator="{ props }">
          <v-btn
            v-bind="props"
            icon
            size="small"
            variant="tonal"
            :color="isDark ? 'info' : 'warning'"
            @click="isDark = !isDark"
          >
            <v-icon>{{ isDark ? 'mdi-weather-night' : 'mdi-white-balance-sunny' }}</v-icon>
          </v-btn>
        </template>
      </v-tooltip>
    </v-app-bar>

    <v-main>
      <v-tabs v-model="activeTab" grow>
        <v-tab value="0">Layout</v-tab>
        <v-tab value="1">Corte</v-tab>
        <v-tab value="2">TIV - Disponibles</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <!-- TAB 0: LAYOUT (DISEÑO + CORTE) -->
        <v-window-item value="0">
          <v-container class="py-6">
            <v-card elevation="3">
              <v-card-title class="text-h6">Inputs</v-card-title>
              <v-card-text>
                <!-- INPUTS PRINCIPALES -->
                <v-row dense>
                  <v-row dense class="w-100 align-center">
                                        <!-- El input de capas se mueve después de separación de corte -->
                    <v-col cols="auto">
                      <v-text-field
                        v-model.number="ID"
                        type="number"
                        label="ID (mm)"
                        variant="outlined"
                        density="comfortable"
                        :disabled="projectLocked"
                        :error="idError"
                        :error-messages="idErrorMsg"
                        @blur="validateID"
                      />
                    </v-col>
                    <v-col cols="auto">
                      <v-text-field
                        v-model.number="OD"
                        type="number"
                        label="OD (mm)"
                        variant="outlined"
                        density="comfortable"
                        :disabled="projectLocked"
                        :error="odError"
                        :error-messages="odErrorMsg"
                        @blur="validateOD"
                      />
                    </v-col>
                    <v-col cols="auto">
                      <v-text-field
                        v-model.number="TH"
                        type="number"
                        label="TH (mm)"
                        variant="outlined"
                        density="comfortable"
                        step="0.1"
                        :disabled="projectLocked"
                        :error="thError"
                        :error-messages="thErrorMsg"
                        @blur="validateTH"
                      />
                    </v-col>
                    <v-col cols="auto">
                      <v-text-field
                        v-model.number="ringCount"
                        type="number"
                        min="1"
                        step="1"
                        label="Anillo(s)"
                        variant="outlined"
                        density="comfortable"
                        :disabled="projectLocked"
                        :error="ringCountError"
                        :error-messages="ringCountErrorMsg"
                        @blur="validateRingCount"
                      />
                    </v-col>
                    <v-col cols="auto">
                      <v-text-field
                        v-model.number="kerf"
                        type="number"
                        label="Kerf (mm)"
                        hint="Ancho de corte de la herramienta"
                        persistent-hint
                        variant="outlined"
                        density="comfortable"
                        step="0.1"
                        min="0"
                        :disabled="projectLocked"
                      />
                    </v-col>
                    <v-col cols="auto">
                      <v-text-field
                        v-model.number="layers"
                        type="number"
                        min="3"
                        max="8"
                        step="1"
                        label="Capas"
                        variant="outlined"
                        density="comfortable"
                        :disabled="projectLocked"
                        :error="layersError"
                        :error-messages="layersErrorMsg"
                        @blur="validateLayers"
                      />
                      
                    </v-col>
                    <v-col cols="auto" >
                      <v-tooltip text="Optimizar combinación de capas">
                        <template #activator="{ props }">
                          <v-btn
                            icon ="mdi-auto-fix"
                            siize="large"
                            class="mb-5"
                            color="warning"
                            variant="tonal"
                            v-bind="props"
                            align-self="top"
                            @click="autoOptimizeGlobalYield"
                            :disabled="projectLocked"
                          >
                          </v-btn>
                        </template>
                      </v-tooltip>
                    </v-col>
                  </v-row>
                  <!-- Eliminar v-col duplicado de Cantidad Anillos -->
                </v-row>
                <v-divider class="my-4"></v-divider>

                <div class="py-2">
                  <div class="d-flex flex-wrap ga-4">
                    <v-chip color="info" variant="tonal" class="ma-1">
                      Lados (N) = {{ N }}
                    </v-chip>
                    <v-chip color="primary" variant="tonal" class="ma-1">
                      SL1 (corta) = {{ SL1.toFixed(2) }} mm
                    </v-chip>
                    <v-chip color="error" variant="tonal" class="ma-1">
                      SL2 (larga) = {{ SL2.toFixed(2) }} mm
                    </v-chip>
                    <v-chip color="success" variant="tonal" class="ma-1">
                      H1 (altura) = {{ H1.toFixed(2) }} mm
                    </v-chip>
                    <v-chip color="warning" variant="tonal" class="ma-1">
                      corte ∠° = {{ A1.toFixed(3) }}°
                    </v-chip>
                  </div>

                  <div class="design-visuals mt-4">
                    <div class="design-visual-item">
                      <SVGTrapezoid :SL1="SL1" :SL2="SL2" :H1="H1" :A1="A1" />
                    </div>
                    <div class="design-visual-item design-preview-wrap">
                      <PreviewCanvas
                        :ID="ID" :OD="OD" :coeff="coeff"
                        :scale="scale" :wheel-step="wheelStep"
                        :pan-x="panX" :pan-y="panY"
                        :layers="layers"
                        :layers-colors="layerColors"
                        :layers-thicknesses="layerThicknesses"
                        :showGuides="showGuides"
                        @update:scale="v => scale = v"
                        @update:pan-x="v => panX = v"
                        @update:pan-y="v => panY = v"
                        @update:show-guides="v => showGuides = v"
                        @update:layers="v => { if (!projectLocked) { layers = v; validateLayers() } }"
                        @update:layers-colors="v => { if (!projectLocked) { layerColors = v } }"
                        @update:layers-thicknesses="v => { if (!projectLocked) onUpdateLayerThicknesses(v) }"
                      />
                    </div>
                  </div>
                </div>
                
                <!-- SEPARADOR: INFO TRAPECIO -->
                <v-divider class="my-4"></v-divider>
                <v-alert v-if="radialError" type="warning" variant="tonal" class="mt-2 mb-3">
                  <strong>⚠ Advertencia:</strong> {{ radialErrorMsg }}
                </v-alert>
                <v-alert v-if="!calcError" type="success" variant="tonal" class="mt-2">
                  <strong>{{ N }}</strong> Lados (por OD nominal) →
                  Δ°= 360/{{ N }} = {{ (360/N).toFixed(3) }}° •
                  corte ∠°= {{ A1.toFixed(3) }}°
                </v-alert>
                <v-alert v-else type="error" variant="tonal" class="mt-2">
                  {{ calcError }}
                </v-alert>

                    <!-- SEPARADOR: Capas Recomendadas -->
                    <v-divider class="my-4"></v-divider>
                    <div v-if="layerCombination" class="mt-4">
                      <v-card-subtitle>Capas Recomendadas</v-card-subtitle>
                      <v-chip color="warning" variant="tonal" class="ma-4">
                        {{ layerCombination.layerCount }} capas × {{ layerCombination.layers[0].thickness }} mm = {{ layerCombination.totalThickness }} mm
                      </v-chip>
                      <v-list dense class="mt-2">
                        <v-list-item v-for="(layer, idx) in layerCombination.layers" :key="idx" class="text-caption">
                          <div
                            class="layer-box"
                            :style="{
                              background: layerBoxFill(idx),
                              borderColor: layerBoxBorder(idx)
                            }"
                          >
                            <span class="layer-label">Capa {{ idx + 1 }}</span>
                            <span class="layer-dims">{{ layer.thickness }}mm × {{ layer.length }}mm × {{ layer.width }}mm</span>
                          </div>
                        </v-list-item>
                      </v-list>
                    </div>
              </v-card-text>
            </v-card>
          </v-container>
        </v-window-item>

        <!-- TAB 1: CORTE -->
        <v-window-item value="1">
                    <v-container class="py-6">
            <v-card elevation="3">
              <v-card-title class="text-h6">Optimización de Corte</v-card-title>
              <v-card-text>
                <!-- Resumen Global -->
                <v-row v-if="cuttingBreakdown.length > 0" dense class="mb-4">
                  <v-col cols="12">
                    <v-alert type="info" variant="tonal" class="mb-4 d-flex align-center">
                      <div class="d-flex w-100 justify-space-between align-center flex-wrap gap-4">
                        <div>
                          <div class="text-subtitle-2 border-b pb-1 mb-1">Impacto Global de Material</div>
                          <div class="text-caption">Cálculos basados en densidad fija (1.2 g/cm³) para <strong>{{ ringCount }} anillos</strong>.</div>
                        </div>
                        <div class="d-flex gap-2">
                          <v-chip color="primary" variant="flat">
                            <v-icon start>mdi-weight-kilogram</v-icon>
                            Anillos: {{ globalCuttingStats.totalRingWeight.toFixed(2) }} kg
                          </v-chip>
                          <v-chip color="blue-grey" variant="flat">
                            <v-icon start>mdi-cube-outline</v-icon>
                            Bruto: {{ globalCuttingStats.totalMaterialWeight.toFixed(2) }} kg
                          </v-chip>
                          <v-chip color="brown" variant="flat">
                            <v-icon start>mdi-glue</v-icon>
                            Adhesivo: {{ globalCuttingStats.totalAdhesiveWeight.toFixed(2) }} kg
                          </v-chip>
                          <v-chip :color="globalCuttingStats.overallYieldPct >= 60 ? 'success' : 'warning'" variant="flat">
                            <v-icon start>mdi-percent</v-icon>
                            Eficiencia: {{ globalCuttingStats.overallYieldPct.toFixed(1) }}%
                          </v-chip>
                        </div>
                      </div>
                    </v-alert>
                  </v-col>
                </v-row>

                <!-- Desglose de materiales por capas -->
                <v-row v-if="cuttingBreakdown.length > 0" dense class="mb-4">
                  <v-col cols="12">
                    <v-alert type="success" variant="tonal" density="compact" class="mb-2">
                      <strong>Desglose de corte por material</strong> - Basado en la combinación de capas recomendada
                    </v-alert>
                    <v-table density="compact">
                      <thead>
                        <tr>
                          <th class="text-center">#</th>
                          <th>Material (mm)</th>
                          <th class="text-center">Capas</th>
                          <th class="text-center">Trapecios/Hoja</th>
                          <th class="text-center">Trapecios Necesarios</th>
                          <th class="text-center">Hojas Requeridas</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(item, idx) in cuttingBreakdown" :key="idx">
                          <td class="text-center">
                            <v-btn
                              size="small"
                              :variant="idx === selectedRecommendedIndex ? 'tonal' : 'outlined'"
                              :color="idx === selectedRecommendedIndex ? 'primary' : undefined"
                              @click="selectedRecommendedIndex = idx"
                            >
                              {{ idx + 1 }}
                            </v-btn>
                          </td>
                          <td>
                            <strong>{{ item.material.thickness }}</strong> × {{ item.material.length }} × {{ item.material.width }}
                          </td>
                          <td class="text-center">
                            <v-chip size="small" color="primary">{{ item.layerCount }}</v-chip>
                          </td>
                          <td class="text-center">{{ item.trapezoidsPerSheet }}</td>
                          <td class="text-center">{{ item.trapezoidsNeeded }}</td>
                          <td class="text-center">
                            <v-chip size="small" color="success">{{ item.sheetsRequired }}</v-chip>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="font-weight-bold">
                          <td colspan="5" class="text-right">Total de hojas:</td>
                          <td class="text-center">
                            <v-chip color="success">
                              {{ cuttingBreakdown.reduce((sum, item) => sum + item.sheetsRequired, 0) }}
                            </v-chip>
                          </td>
                        </tr>
                      </tfoot>
                    </v-table>
                  </v-col>
                </v-row>
                
                <v-divider class="my-4"></v-divider>

                <div v-if="recommendedCuttingLayouts.length > 0" class="mb-6">
                  <div class="text-subtitle-2 mb-3">Patrones por hojas estándar (recomendación)</div>
                  <v-row dense>
                    <v-col cols="12">
                      <v-card v-if="selectedRecommendedLayout" variant="outlined" class="pa-2">
                        <v-card-subtitle class="text-caption">
                          #{{ selectedRecommendedIndex + 1 }} · {{ selectedRecommendedLayout.material.thickness }}mm × {{ selectedRecommendedLayout.material.length }}mm × {{ selectedRecommendedLayout.material.width }}mm
                        </v-card-subtitle>
                        <div class="text-caption mb-2">
                          {{ selectedRecommendedLayout.trapsToRender }} de {{ selectedRecommendedLayout.trapezoidsPerSheet }} trapecios/hoja • {{ selectedRecommendedLayout.sheetsRequired }} hojas
                        </div>
                        <div class="d-flex flex-wrap gap-2 my-2">
                          <v-chip size="small" color="primary" variant="outlined">
                            Capa {{ selectedRecommendedIndex + 1 }}: {{ selectedRecommendedLayout.trapezoidsNeeded }} trapecios de tamaño {{ selectedRecommendedLayout.material.thickness }}mm
                          </v-chip>
                        </div>
                        <div v-if="selectedRecommendedHasPartial" class="text-caption mb-2">
                          {{ selectedRecommendedFullSheets }} hoja(s) completas + 1 hoja parcial ({{ selectedRecommendedPartialTraps }} trapecios)
                        </div>
                        <div v-if="selectedRecommendedHasPartial" class="d-flex flex-wrap" style="gap:12px">
                          <div>
                            <div class="text-caption text-medium-emphasis mb-1">Hoja completa</div>
                            <div class="text-caption mb-1 pb-1 border-b">
                              <span class="text-success font-weight-bold">Utilizado: {{ selectedRecommendedLayout.fullSheetStats?.utilizedPct.toFixed(1) ?? 0 }}%</span> |
                              <span class="text-error">Recorte: {{ selectedRecommendedLayout.fullSheetStats?.offcutPct.toFixed(1) ?? 0 }}%</span> |
                              <span class="text-warning">Scrap: {{ selectedRecommendedLayout.fullSheetStats?.scrapPct.toFixed(1) ?? 0 }}%</span>
                            </div>
                            <svg
                              :width="recommendedCanvasWidth"
                              :height="recommendedCanvasHeight"
                              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px"
                            >
                              <rect
                                :x="20"
                                :y="20"
                                :width="selectedRecommendedLayout.sheetScaledWidth"
                                :height="selectedRecommendedLayout.sheetScaledHeight"
                                fill="#ffffff"
                                stroke="#64748b"
                                stroke-width="2"
                              />
                              <polygon
                                v-if="selectedRecommendedLayout.fullSheetStats?.offcutPolygon"
                                :points="selectedRecommendedLayout.fullSheetStats.offcutPolygon.points"
                                fill="#ef444433"
                                stroke="#ef4444"
                                stroke-width="1.5"
                                stroke-dasharray="3 3"
                              />
                              <g v-for="(trap, tIdx) in selectedRecommendedFullLayout ?? []" :key="`full-${tIdx}`">
                                <polygon
                                  :points="trap.points"
                                  :fill="tIdx % 2 === 0 ? '#8ac29a70' : '#fbbf2470'"
                                  :stroke="tIdx % 2 === 0 ? '#2d6a4f' : '#d97706'"
                                  stroke-width="1.25"
                                  stroke-dasharray="4 2"
                                />
                              </g>
                              <rect
                                :x="20"
                                :y="20"
                                :width="selectedRecommendedLayout.sheetScaledWidth"
                                :height="selectedRecommendedLayout.sheetScaledHeight"
                                fill="#ef444466"
                                v-if="selectedRecommendedFullSheets === 0"
                              />
                            </svg>
                            <div class="mt-2" v-if="selectedRecommendedHasPartial && selectedRecommendedFullSheets > 0">
                              <v-btn
                                color="primary"
                                variant="tonal"
                                size="small"
                                prepend-icon="mdi-download"
                                @click="exportRecommendedLayoutDxf('full')"
                              >
                                Exportar hoja completa (DXF)
                              </v-btn>
                            </div>
                          </div>
                          <div>
                            <div class="text-caption text-medium-emphasis mb-1">Hoja parcial</div>
                            <div class="text-caption mb-1 pb-1 border-b">
                              <span class="text-success font-weight-bold">Utilizado: {{ selectedRecommendedLayout.partialSheetStats?.utilizedPct.toFixed(1) ?? 0 }}%</span> |
                              <span class="text-error">Recorte: {{ selectedRecommendedLayout.partialSheetStats?.offcutPct.toFixed(1) ?? 0 }}%</span> |
                              <span class="text-warning">Scrap: {{ selectedRecommendedLayout.partialSheetStats?.scrapPct.toFixed(1) ?? 0 }}%</span>
                            </div>
                            <svg
                              :width="recommendedCanvasWidth"
                              :height="recommendedCanvasHeight"
                              style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px"
                            >
                              <rect
                                :x="20"
                                :y="20"
                                :width="selectedRecommendedLayout.sheetScaledWidth"
                                :height="selectedRecommendedLayout.sheetScaledHeight"
                                fill="#ffffff"
                                stroke="#64748b"
                                stroke-width="2"
                              />
                              <polygon
                                v-if="selectedRecommendedLayout.partialSheetStats?.offcutPolygon"
                                :points="selectedRecommendedLayout.partialSheetStats.offcutPolygon.points"
                                fill="#ef444433"
                                stroke="#ef4444"
                                stroke-width="1.5"
                                stroke-dasharray="3 3"
                              />
                              <g v-for="(trap, tIdx) in selectedRecommendedPartialLayout ?? []" :key="`partial-${tIdx}`">
                                <polygon
                                  :points="trap.points"
                                  :fill="tIdx % 2 === 0 ? '#8ac29a70' : '#fbbf2470'"
                                  :stroke="tIdx % 2 === 0 ? '#2d6a4f' : '#d97706'"
                                  stroke-width="1.25"
                                  stroke-dasharray="4 2"
                                />
                              </g>
                            </svg>
                            <div class="mt-2" v-if="selectedRecommendedHasPartial">
                              <v-btn
                                color="primary"
                                variant="tonal"
                                size="small"
                                prepend-icon="mdi-download"
                                @click="exportRecommendedLayoutDxf('partial')"
                              >
                                Exportar hoja parcial (DXF)
                              </v-btn>
                            </div>
                          </div>
                        </div>
                        <svg
                          v-else
                          :width="recommendedCanvasWidth"
                          :height="recommendedCanvasHeight"
                          style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px"
                        >
                          <rect
                            :x="20"
                            :y="20"
                            :width="selectedRecommendedLayout.sheetScaledWidth"
                            :height="selectedRecommendedLayout.sheetScaledHeight"
                            fill="#ffffff"
                            stroke="#64748b"
                            stroke-width="2"
                          />
                          <polygon
                            v-if="selectedRecommendedLayout.fullSheetStats?.offcutPolygon"
                            :points="selectedRecommendedLayout.fullSheetStats.offcutPolygon.points"
                            fill="#ef444433"
                            stroke="#ef4444"
                            stroke-width="1.5"
                            stroke-dasharray="3 3"
                          />
                          <g v-for="(trap, tIdx) in selectedRecommendedLayout.layout" :key="tIdx">
                            <polygon
                              :points="trap.points"
                              :fill="tIdx % 2 === 0 ? '#8ac29a70' : '#fbbf2470'"
                              :stroke="tIdx % 2 === 0 ? '#2d6a4f' : '#d97706'"
                              stroke-width="1.25"
                              stroke-dasharray="4 2"
                            />
                          </g>
                        </svg>
                        <div class="mt-3" v-if="!selectedRecommendedHasPartial && selectedRecommendedFullSheets > 0">
                          <v-btn
                            color="primary"
                            variant="tonal"
                            size="small"
                            prepend-icon="mdi-download"
                            @click="exportRecommendedLayoutDxf('full')"
                          >
                            Exportar hoja completa (DXF)
                          </v-btn>
                        </div>
                      </v-card>
                    </v-col>
                  </v-row>
                </div>
                
                <v-divider class="my-6"></v-divider>
                <div class="text-subtitle-2 mb-3">Validación de Recortes Manuales (Inventario Bodega)</div>
                <div class="text-caption mb-3">
                  Introduce las medidas de un recorte que tengas en piso para validar cuántas piezas caben en él antes de empezar una hoja nueva completa.
                </div>
                
                <v-row dense>
                  <v-col cols="12" md="4">
                    <v-text-field
                      v-model.number="sheetLength"
                      type="number"
                      label="Largo de hoja (mm)"
                      variant="outlined"
                      density="comfortable"
                      :disabled="projectLocked"
                    />
                    <v-text-field
                      v-model.number="sheetWidth"
                      type="number"
                      label="Ancho de hoja (mm)"
                      variant="outlined"
                      density="comfortable"
                      :disabled="projectLocked"
                    />
                    <v-text-field
                      v-model.number="kerf"
                      type="number"
                      label="Separación de corte (mm)"
                      hint="Ancho de corte de la herramienta"
                      persistent-hint
                      variant="outlined"
                      density="comfortable"
                      step="0.1"
                      min="0"
                      :disabled="projectLocked"
                    />
                    
                    <v-divider class="my-4"></v-divider>
                    
                    <v-alert type="info" variant="tonal" density="compact" class="mb-3">
                      <div class="text-caption">
                        <strong>Optimización:</strong> Los trapecios se alternan (normal/invertido) para aprovechar mejor el espacio.
                      </div>
                    </v-alert>
                    
                    <div class="mb-3">
                      <div class="text-caption text-medium-emphasis mb-2">Dimensiones del trapecio</div>
                      <v-chip size="small" class="mr-1 mb-1">SL1: {{ SL1.toFixed(1) }}mm</v-chip>
                      <v-chip size="small" class="mr-1 mb-1">SL2: {{ SL2.toFixed(1) }}mm</v-chip>
                      <v-chip size="small" class="mr-1 mb-1">H: {{ H1.toFixed(1) }}mm</v-chip>
                    </div>
                    
                    <v-card variant="tonal" color="success" class="mb-3">
                      <v-card-text>
                        <div class="text-h4 font-weight-bold">{{ trapezoidsPerSheet }}</div>
                        <div class="text-caption">Trapecios por hoja</div>
                      </v-card-text>
                    </v-card>
                    
                    <v-card variant="tonal" color="warning">
                      <v-card-text>
                        <div class="text-h5 font-weight-bold">{{ utilizationPercentage.toFixed(1) }}%</div>
                        <div class="text-caption">Utilización</div>
                      </v-card-text>
                    </v-card>
                    
                    <div class="mt-4">
                      <div class="text-caption text-medium-emphasis mb-2">Leyenda</div>
                      <div class="d-flex align-center mb-1">
                        <div style="width:16px;height:16px;background:#8ac29a;border:1px solid #2d6a4f;border-radius:3px;margin-right:8px"></div>
                        <span class="text-caption">Normal</span>
                      </div>
                      <div class="d-flex align-center">
                        <div style="width:16px;height:16px;background:#fbbf24;border:1px solid #d97706;border-radius:3px;margin-right:8px"></div>
                        <span class="text-caption">Invertido</span>
                      </div>
                    </div>
                  </v-col>
                  
                  <v-col cols="12" md="8">
                    <div class="cutting-canvas-container">
                      <svg
                        :width="canvasWidth"
                        :height="canvasHeight"
                        style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px"
                      >
                        <!-- Hoja principal -->
                        <rect
                          :x="20"
                          :y="20"
                          :width="sheetScaledWidth"
                          :height="sheetScaledHeight"
                          fill="#ffffff"
                          stroke="#64748b"
                          stroke-width="2"
                        />
                        
                        <!-- Recortes resultantes -->
                        <polygon
                          v-if="detailedOffcuts"
                          :points="detailedOffcuts.points"
                          fill="#ef444433"
                          stroke="#ef4444"
                          stroke-width="1.5"
                          stroke-dasharray="3 3"
                        />
                        
                        <!-- Trapecios anidados con alternancia visible -->
                        <g v-for="(trap, idx) in nestingLayout" :key="idx">
                          <polygon
                            :points="trap.points"
                            :fill="idx % 2 === 0 ? '#8ac29a70' : '#fbbf2470'"
                            :stroke="idx % 2 === 0 ? '#2d6a4f' : '#d97706'"
                            stroke-width="1.5"
                            stroke-dasharray="4 2"
                          />
                          <text
                            :x="trap.centerX"
                            :y="trap.centerY"
                            text-anchor="middle"
                            dominant-baseline="middle"
                            font-size="11"
                            font-weight="600"
                            :fill="idx % 2 === 0 ? '#1b4332' : '#92400e'"
                            v-if="nestingLayout.length <= 100"
                          >
                            {{ idx + 1 }}
                          </text>
                        </g>
                      </svg>
                    </div>
                  </v-col>
                </v-row>
              </v-card-text>
            </v-card>
          </v-container>
        </v-window-item>

        <!-- TAB 2: TIV - DISPONIBLES -->
        <v-window-item value="2">
          <v-container class="py-6">
            <v-card elevation="3">
              <v-card-title class="d-flex justify-space-between align-center">
                <span>TIV - Disponibles</span>
                <div class="d-flex gap-2">
                  <v-tooltip text="Agregar nuevo material">
                    <template #activator="{ props }">
                      <v-btn size="small" color="success" icon="mdi-plus" :disabled="projectLocked" @click="openAddMaterialDialog" v-bind="props" />
                    </template>
                    </v-tooltip>
                  <v-tooltip text="Descargar materiales como JSON">
                    <template #activator="{ props }">
                      <v-btn size="small" color="info" icon="mdi-download" @click="exportMaterials" v-bind="props" />
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Cargar materiales desde JSON">
                    <template #activator="{ props }">
                      <v-btn size="small" color="warning" icon="mdi-upload" :disabled="projectLocked" @click="triggerImportFile" v-bind="props" />
                    </template>
                  </v-tooltip>
                  <input id="importInput" type="file" accept=".json" style="display:none" @change="importMaterials" />
                </div>
              </v-card-title>
              <v-card-text>
                <v-text-field
                  v-model="materialsSearch"
                  type="text"
                  label="Buscar por espesor..."
                  prepend-icon="mdi-magnify"
                  variant="outlined"
                  density="comfortable"
                  class="mb-4"
                />
                <div class="table-responsive">
                  <table class="materials-table">
                    <thead>
                      <tr>
                        <th @click="sortBy('thickness')" style="cursor: pointer;">
                          Espesor (mm)
                          <span class="sort-icon">{{ sortField === 'thickness' ? (sortAsc ? '↑' : '↓') : '⇅' }}</span>
                        </th>
                        <th @click="sortBy('length')" style="cursor: pointer;">
                          Largo (mm)
                          <span class="sort-icon">{{ sortField === 'length' ? (sortAsc ? '↑' : '↓') : '⇅' }}</span>
                        </th>
                        <th @click="sortBy('width')" style="cursor: pointer;">
                          Ancho (mm)
                          <span class="sort-icon">{{ sortField === 'width' ? (sortAsc ? '↑' : '↓') : '⇅' }}</span>
                        </th>
                        <th>En Stock</th>
                        <th>Acciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="(mat, idx) in filteredAndSortedMaterials" :key="idx">
                        <td>{{ mat.thickness }}</td>
                        <td>{{ mat.length }}</td>
                        <td>{{ mat.width }}</td>
                        <td>
                          <v-tooltip :text="materials[materials.indexOf(mat)].inStock ? 'En Stock' : 'Fuera de Stock'">
                            <template #activator="{ props }">
                              <v-btn
                                :color="materials[materials.indexOf(mat)].inStock ? 'success' : 'error'"
                                :icon="materials[materials.indexOf(mat)].inStock ? 'mdi-check-circle' : 'mdi-close-circle'"
                                size="small"
                                  :disabled="projectLocked"
                                @click="materials[materials.indexOf(mat)].inStock = !materials[materials.indexOf(mat)].inStock"
                                v-bind="props"
                              />
                            </template>
                          </v-tooltip>
                        </td>
                        <td>
                          <div class="d-flex gap-1">
                            <v-tooltip text="Editar">
                              <template #activator="{ props }">
                                <v-btn size="x-small" icon="mdi-pencil" color="primary" :disabled="projectLocked" @click="openEditMaterialDialog(materials.indexOf(mat))" v-bind="props" />
                              </template>
                            </v-tooltip>
                            <v-tooltip text="Eliminar">
                              <template #activator="{ props }">
                                <v-btn size="x-small" icon="mdi-delete" color="error" :disabled="projectLocked" @click="deleteMaterial(materials.indexOf(mat))" v-bind="props" />
                              </template>
                            </v-tooltip>
                          </div>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <v-divider class="my-4"></v-divider>
                <p class="text-caption text-disabled">Total: {{ filteredAndSortedMaterials.length }} materiales</p>
              </v-card-text>
            </v-card>

            <!-- MODAL AGREGAR/EDITAR MATERIAL -->
            <v-dialog v-model="showMaterialModal" max-width="400px">
              <v-card>
                <v-card-title>{{ editingIndex === null ? 'Agregar Material' : 'Editar Material' }}</v-card-title>
                <v-card-text class="d-grid ga-4">
                  <v-text-field
                    v-model.number="editingMaterial.thickness"
                    type="number"
                    label="Espesor (mm)"
                    step="0.1"
                    min="0.1"
                    variant="outlined"
                    dense
                  />
                  <v-text-field
                    v-model.number="editingMaterial.length"
                    type="number"
                    label="Largo (mm)"
                    min="1"
                    variant="outlined"
                    dense
                  />
                  <v-text-field
                    v-model.number="editingMaterial.width"
                    type="number"
                    label="Ancho (mm)"
                    min="1"
                    variant="outlined"
                    dense
                  />
                  <v-switch
                    v-model="editingMaterial.inStock"
                    label="En Stock"
                    hide-details
                  />
                </v-card-text>
                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="error" @click="showMaterialModal = false">Cancelar</v-btn>
                  <v-btn color="success" @click="saveMaterial">Guardar</v-btn>
                </v-card-actions>
              </v-card>
            </v-dialog>
          </v-container>
        </v-window-item>
      </v-window>
    </v-main>
  </v-app>
</template>

<style scoped>
.d-grid { display:grid; grid-template-columns: 1fr; }
@media (min-width: 768px) { .d-grid { grid-template-columns: 1fr 1fr; } }
.ga-4 { gap: 1rem; }
.gap-2 { gap: 0.5rem; }
.d-flex { display: flex; }
.justify-space-between { justify-content: space-between; }
.align-center { align-items: center; }

.table-responsive {
  overflow-x: auto;
  border-radius: 4px;
  width: 100%;
}

.materials-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
}

.materials-table thead {
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.25) 0%, rgba(var(--v-theme-primary), 0.15) 100%);
  position: sticky;
  top: 0;
  z-index: 10;
  border-top: 2px solid rgba(var(--v-theme-primary), 0.5);
}

.materials-table thead th {
  padding: 14px 12px;
  text-align: left;
  font-weight: 700;
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  border-bottom: 3px solid rgba(var(--v-theme-primary), 0.5);
  white-space: nowrap;
  color: rgba(var(--v-theme-on-surface), 1);
}

.materials-table tbody tr {
  border-bottom: 1px solid rgba(128, 128, 128, 0.12);
  transition: background-color 0.2s;
}

.materials-table tbody tr:hover {
  background-color: rgba(var(--v-theme-primary), 0.05);
}

.materials-table tbody td {
  padding: 10px 8px;
  text-align: left;
}

.materials-table tbody tr:nth-child(even) {
  background-color: rgba(128, 128, 128, 0.02);
}

.sort-icon {
  font-size: 0.85em;
  margin-left: 4px;
  opacity: 0.7;
}

.cutting-canvas-container {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}

.design-visuals {
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  gap: 16px;
}

@media (min-width: 1200px) {
  .design-visuals {
    grid-template-columns: 1fr 1fr;
  }
}

.design-visual-item {
  min-width: 0;
  width: 100%;
}

.design-preview-wrap {
  overflow-x: auto;
  display: flex;
  justify-content: center;
}

.layer-box {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 8px 12px;
  border: 1px solid #eef2f7;
  border-radius: 6px;
  box-shadow: 0 8px 20px rgba(31, 109, 143, 0.251);
}

.layer-label {
  font-weight: 600;
  color: rgba(var(--v-theme-on-surface), 0.85);
}

.layer-dims {
  color: rgba(var(--v-theme-on-surface), 0.7);
}
</style>