<!-- src/App.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PreviewCanvas from './components/PreviewCanvas.vue'
import { computeDims, pickNByOD } from './utils/geometry'
import { availableMaterials, type Material } from './utils/materials'
import { useNestingCalculations } from './composables/useNestingCalculations'
import { useCuttingBreakdown, type LayerCombination } from './composables/useCuttingBreakdown'

const isDark = ref(true)
const activeTab = ref(0)

// Refs para control de hoja/inputs - DEFINIR PRIMERO
const ID = ref<number>(1200)
const OD = ref<number>(1500)
const ringCount = ref<number>(6)
const TH = ref<number>(12)
const layers = ref<number>(3)

// Estado para errores de validación
const idError = ref<boolean>(false)
const idErrorMsg = ref<string>('')
const odError = ref<boolean>(false)
const odErrorMsg = ref<string>('')
const radialError = ref<boolean>(false)
const radialErrorMsg = ref<string>('')
const thError = ref<boolean>(false)
const thErrorMsg = ref<string>('')
const ringCountError = ref<boolean>(false)
const ringCountErrorMsg = ref<string>('')
const layersError = ref<boolean>(false)
const layersErrorMsg = ref<string>('')

// Funciones de validación
function validateID() {
  idError.value = false
  idErrorMsg.value = ''
  
  if (ID.value <= 0) {
    idError.value = true
    idErrorMsg.value = 'ID debe ser > 0'
    ID.value = 100 // Corregir automáticamente
  }
  if (ID.value >= OD.value) {
    idError.value = true
    idErrorMsg.value = 'ID debe ser menor que OD'
  }
  
  validateRadialGap()
}

function validateOD() {
  odError.value = false
  odErrorMsg.value = ''
  
  if (OD.value <= 0) {
    odError.value = true
    odErrorMsg.value = 'OD debe ser > 0'
    OD.value = 2000 // Corregir automáticamente
  }
  if (OD.value <= ID.value) {
    odError.value = true
    odErrorMsg.value = 'OD debe ser mayor que ID'
  }
  
  validateRadialGap()
}

function validateRadialGap() {
  radialError.value = false
  radialErrorMsg.value = ''
  
  const gap = OD.value - ID.value
  if (gap < 25) {
    radialError.value = true
    radialErrorMsg.value = `⚠ Construcción Radial demasiado pequeña ${gap.toFixed(1)}mm < 25mm`
  }
}

function validateTH() {
  thError.value = false
  thErrorMsg.value = ''
  
  if (TH.value < 5) {
    thError.value = true
    thErrorMsg.value = 'TH debe ser >= 5mm'
    TH.value = 5 // Corregir automáticamente
  }
}

function validateRingCount() {
  ringCountError.value = false
  ringCountErrorMsg.value = ''
  
  if (ringCount.value < 1) {
    ringCountError.value = true
    ringCountErrorMsg.value = 'Cantidad debe ser >= 1'
    ringCount.value = 1 // Corregir automáticamente
  }
  if (ringCount.value > 24) {
    ringCountError.value = true
    ringCountErrorMsg.value = 'Cantidad debe ser <= 24'
    ringCount.value = 24 // Corregir automáticamente
  }
}

function validateLayers() {
  layersError.value = false
  layersErrorMsg.value = ''
  
  if (layers.value < 3) {
    layersError.value = true
    layersErrorMsg.value = 'Capas debe ser >= 3'
    layers.value = 3 // Corregir automáticamente
  }
  if (layers.value > 8) {
    layersError.value = true
    layersErrorMsg.value = 'Capas debe ser <= 8'
    layers.value = 8 // Corregir automáticamente
  }
}

// Watchers para validar en tiempo real
watch(ID, () => validateID())
watch(OD, () => validateOD())
watch(TH, () => validateTH())
watch(ringCount, () => validateRingCount())
watch(layers, () => validateLayers())

// Materials management
const initializeMaterials = (): Material[] => {
  const stored = localStorage.getItem('materials')
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch {
      return availableMaterials.map(m => ({ ...m, inStock: true }))
    }
  }
  return availableMaterials.map(m => ({ ...m, inStock: true }))
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
      const imported = JSON.parse(e.target?.result as string)
      if (Array.isArray(imported) && imported.every(m => 
        typeof m.thickness === 'number' && 
        typeof m.length === 'number' && 
        typeof m.width === 'number'
      )) {
        materials.value = imported.map(m => ({ ...m, inStock: m.inStock ?? true }))
        alert('Materiales importados correctamente')
      } else {
        alert('Formato de archivo inválido')
      }
    } catch {
      alert('Error al leer el archivo')
    }
  }
  reader.readAsText(file)
  const importInputEl = document.getElementById('importInput') as HTMLInputElement
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
const coeffPct = ref<number>(0.35)
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
  
  const uniqueMats = uniqueMaterialsByThickness(inStockMaterials)
  const candidateCount = 6
  const targetPerLayer = targetTH / numLayers
  const candidateMats = pickClosestMaterials(uniqueMats, targetPerLayer, candidateCount)

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

// Definir layerCombination DESPUÉS de definir findBestLayerCombination
const layerCombination = computed(() => findBestLayerCombination(TH.value, layers.value))

// Sincronizar material de corte con material recomendado
watch(layerCombination, (combo) => {
  if (combo && combo.layers.length > 0) {
    const firstLayer = combo.layers[0]
    sheetLength.value = firstLayer.length
    sheetWidth.value = firstLayer.width
    
    // Encontrar el índice en materials
    const idx = materials.value.findIndex(m => 
      m.thickness === firstLayer.thickness && 
      m.length === firstLayer.length && 
      m.width === firstLayer.width
    )
    if (idx !== -1) {
      selectedMaterialForCutting.value = idx
    }
  }
})

// Materiales en stock para selector
const inStockMaterials = computed(() => {
  return materials.value
    .map((m, index) => ({
      index,
      label: `${m.thickness}mm × ${m.length}mm × ${m.width}mm`,
      ...m
    }))
    .filter(m => m.inStock !== false)
})

// Actualizar dimensiones de hoja cuando se selecciona un material
watch(selectedMaterialForCutting, (idx) => {
  if (idx !== null && materials.value[idx]) {
    const mat = materials.value[idx]
    sheetLength.value = mat.length
    sheetWidth.value = mat.width
  }
})

// Refs para control de la hoja de corte
const layerThicknesses = ref<number[]>(Array.from({ length: layers.value }, () => TH.value / layers.value))
const skipThicknessSync = ref(false)
const syncingRecommendation = ref(false)
const suppressRecommendation = ref(false)

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
    const d = computeDims(+ID.value, +OD.value, +coeff.value)
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
const W1 = computed(() => dims.value?.h ?? 0)
const A1 = computed(() => dims.value?.alphaDeg ?? 0)
const N = computed(() => pickNByOD(+OD.value))
const showGuides = ref(true)

// Usar composables de cálculos
const {
  trapezoidBoundingBox,
  trapezoidsPerSheet,
  wastePercentage,
  calculateTrapezoidsPerSheet,
  computeWastePercentageFor,
  computeCuttingScaleFor,
  buildNestingLayout
} = useNestingCalculations(dims, sheetLength, sheetWidth, kerf)

// Usar composable para breakdown de materiales (después de useNestingCalculations)
const { cuttingBreakdown, recommendedCuttingLayouts } = useCuttingBreakdown(
  dims,
  layerCombination,
  N,
  ringCount,
  calculateTrapezoidsPerSheet,
  computeWastePercentageFor,
  computeCuttingScaleFor,
  buildNestingLayout,
  recommendedCanvasWidth,
  recommendedCanvasHeight
)

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

// Layout de nesting - generar posiciones de trapecios alternados horizontalmente
const nestingLayout = computed(() => {
  return buildNestingLayout(sheetLength.value, sheetWidth.value, cuttingScale.value)
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

  suppressRecommendation.value = true
}

function sameNumberArray(a: number[], b: number[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false
  }
  return true
}

watch(layerCombination, (combo) => {
  if (!combo) return
  if (suppressRecommendation.value) {
    suppressRecommendation.value = false
    return
  }
  const recommended = combo.layers.map(m => m.thickness)

  if (!sameNumberArray(recommended, layerThicknesses.value)) {
    syncingRecommendation.value = true
    layerThicknesses.value = recommended
  }

  if (syncingRecommendation.value) syncingRecommendation.value = false
})
</script>

<template>
  <v-app :theme="isDark ? 'dark' : 'light'">
    <v-app-bar color="primary" elevation="2">
      <v-app-bar-title class="text-subtitle-1 font-weight-medium">Anillo Estático en Segmentos Trapezoidales</v-app-bar-title>
      <v-spacer />
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
        <v-tab value="0">Diseño</v-tab>
        <v-tab value="1">Corte</v-tab>
        <v-tab value="2">TIV - Disponibles</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <!-- TAB 0: DISEÑO -->
        <v-window-item value="0">
          <v-container class="py-6">
        <v-row dense>
          <!-- ENTRADAS -->  
            <v-col cols="12" md="12">
            <v-card elevation="3">
              <v-card-title class="text-h6">Entradas</v-card-title>
              <v-card-text>
                <v-row class="ga-4">
                  <v-col cols="12" sm="6" md="4" lg="2">
                    <v-text-field
                      v-model.number="ID"
                      type="number" min="1" step="1"
                      label="ID (mm)" variant="outlined" density="comfortable"
                      :error="idError"
                      :error-messages="idErrorMsg"
                      @blur="validateID"
                    />
                  </v-col>
                  <v-col cols="12" sm="6" md="4" lg="2">
                    <v-text-field
                      v-model.number="OD"
                      type="number" min="1" step="1"
                      label="OD (mm)" variant="outlined" density="comfortable"
                      :error="odError"
                      :error-messages="odErrorMsg"
                      @blur="validateOD"
                    />
                  </v-col>
                  <v-col cols="12" sm="6" md="4" lg="2">
                    <v-text-field
                      v-model.number="coeffPct"
                      type="number" step="0.01"
                      label="Coeficiente ±(%)" suffix="%"
                      variant="outlined" density="comfortable"
                    />
                  </v-col>
                  <v-col cols="12" sm="6" md="4" lg="2">
                    <v-text-field
                      v-model.number.lazy="TH"
                      type="number" step="0.1" min="5"
                      label="TH (mm)" suffix="mm"
                      variant="outlined" density="comfortable"
                      :error="thError"
                      :error-messages="thErrorMsg"
                      @blur="validateTH"
                    />
                  </v-col>
                  <v-col cols="12" sm="6" md="4" lg="2">
                    <v-text-field
                      v-model.number="ringCount"
                      type="number" min="1" step="1"
                      label="Cantidad Anillos"
                      variant="outlined" density="comfortable"
                      :error="ringCountError"
                      :error-messages="ringCountErrorMsg"
                      @blur="validateRingCount"
                    />
                  </v-col>
                </v-row>
                <v-divider class="my-4"></v-divider>

                <div class="py-2">
                  <div class="d-flex flex-wrap ga-4">
                    <v-chip color="primary" variant="tonal" class="ma-1">
                      SL1 (corta) = {{ SL1.toFixed(2) }} mm
                    </v-chip>
                    <v-chip color="primary" variant="tonal" class="ma-1">
                      SL2 (larga) = {{ SL2.toFixed(2) }} mm
                    </v-chip>
                    <v-chip color="secondary" variant="tonal" class="ma-1">
                      H1 (altura) = {{ W1.toFixed(2) }} mm
                    </v-chip>
                    <v-chip color="info" variant="tonal" class="ma-1">
                      corte ∠° = {{ A1.toFixed(3) }}°
                    </v-chip>
                  </div>

                  <!-- SVG Diagrama del Trapecio Isósceles -->
                  <div style="margin-top: 24px; display: flex; justify-content: left;">
                    <svg viewBox="0 0 400 220" width="500" height="220" style="border: 1px solid #ddd; border-radius: 8px; background: #ffffff26;">
                      <!-- Trapecio Isósceles: base corta (SL1) arriba, base larga (SL2) abajo -->
                      <polygon 
                        :points="`110,60 290,60 330,150 70,150`" 
                        fill="#d9e18e" 
                        stroke="#ffffff" 
                        stroke-width="2.5" 
                        stroke-linejoin="round"
                      />
                      
                      <!-- Dimensión SL1 (base corta - arriba) -->
                      <line x1="110" y1="40" x2="290" y2="40" stroke="#0288d1" stroke-width="2.5"/>
                      <line x1="110" y1="35" x2="110" y2="45" stroke="#0288d1" stroke-width="2"/>
                      <line x1="290" y1="35" x2="290" y2="45" stroke="#0288d1" stroke-width="2"/>
                      <text x="200" y="28" font-size="13" font-weight="bold" fill="#0288d1" style="text-anchor: middle;">SL1: {{ SL1.toFixed(1) }}mm</text>

                      <!-- Dimensión SL2 (base larga - abajo) -->
                      <line x1="70" y1="170" x2="330" y2="170" stroke="#c96562" stroke-width="2.5"/>
                      <line x1="70" y1="165" x2="70" y2="175" stroke="#c96562" stroke-width="2"/>
                      <line x1="330" y1="165" x2="330" y2="175" stroke="#c96562" stroke-width="2"/>
                      <text x="200" y="195" font-size="13" font-weight="bold" fill="#c96562" style="text-anchor: middle;">SL2: {{ SL2.toFixed(1) }}mm</text>

                      <!-- Dimensión H1 (altura - lado izquierdo) -->
                      <line x1="50" y1="60" x2="50" y2="150" stroke="#38c48c" stroke-width="2.5"/>
                      <line x1="45" y1="60" x2="55" y2="60" stroke="#38c48c" stroke-width="2"/>
                      <line x1="45" y1="150" x2="55" y2="150" stroke="#38c48c" stroke-width="2"/>
                      <text x="35" y="108" font-size="13" font-weight="bold" fill="#388e3c" style="text-anchor: end; dominant-baseline: middle;">H1: {{ W1.toFixed(1) }}mm</text>

                      <!-- Dimensión A1 (ángulo de corte - esquina inferior derecha) -->
                      <g>
                        <!-- Línea de referencia vertical (lado derecho) -->
                        <line x1="330" y1="150" x2="310" y2="107" stroke="#ff6f00" stroke-width="2" stroke-dasharray="4,2"/>
                        <!-- Línea del lado oblicuo del trapecio -->
                        <line x1="330" y1="150" x2="290" y2="150" stroke="#ff6f00" stroke-width="2" stroke-dasharray="4,2"/>
                        <!-- Arco para el ángulo -->
                        <path d="M 320,130 A 25,25 0 0,0 310,150" fill="none" stroke="#ff6f00" stroke-width="1.5"/>
                        <!-- Texto del ángulo -->
                        <text x="290" y="140" font-size="12" font-weight="bold" fill="#ff6f00" style="text-anchor: middle;">∠° {{ A1.toFixed(1) }}°</text>
                      </g>
                    </svg>
                  </div>
                </div>
                <v-divider class="my-5"></v-divider>
                <!-- SVG del Trapecio -->
                <PreviewCanvas
                  :ID="ID" :OD="OD" :coeff="coeff"
                  :scale="scale" :wheel-step="wheelStep"
                  :pan-x="panX" :pan-y="panY"
                  :layers="layers"
                  :layers-thicknesses="layerThicknesses"
                  :showGuides="showGuides"
                  @update:scale="v => scale = v"
                  @update:pan-x="v => panX = v"
                  @update:pan-y="v => panY = v"
                  @update:show-guides="v => showGuides = v"
                  @update:layers="v => { layers = v; validateLayers() }"
                  @update:layers-thicknesses="onUpdateLayerThicknesses"
                />
                
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

                    <!-- Combinación de capas recomendada -->
                    <v-divider class="my-2"></v-divider>
                    <div v-if="layerCombination" class="mt-4">
                      <v-card-subtitle>Capas Recomendadas</v-card-subtitle>
                      <v-chip color="warning" variant="tonal" class="ma-4">
                        {{ layerCombination.layerCount }} capas × {{ layerCombination.layers[0].thickness }} mm = {{ layerCombination.totalThickness }} mm
                      </v-chip>
                      <v-list dense class="mt-2">
                        <v-list-item v-for="(layer, idx) in layerCombination.layers" :key="idx" class="text-caption">
                          Capa {{ idx + 1 }}: {{ layer.thickness }}mm × {{ layer.length }}mm × {{ layer.width }}mm
                        </v-list-item>
                      </v-list>
                    </div>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- PREVIEW + SALIDA -->
          
        </v-row>
        </v-container>
        </v-window-item>

        <!-- TAB 1: CORTE -->
        <v-window-item value="1">
          <v-container class="py-6">
            <v-card elevation="3">
              <v-card-title class="text-h6">Optimización de Corte</v-card-title>
              <v-card-text>
                <!-- Desglose de materiales por capas -->
                <v-row v-if="cuttingBreakdown.length > 0" dense class="mb-4">
                  <v-col cols="12">
                    <v-alert type="success" variant="tonal" density="compact" class="mb-2">
                      <strong>Desglose de corte por material</strong> - Basado en la combinación de capas recomendada
                    </v-alert>
                    <v-table density="compact">
                      <thead>
                        <tr>
                          <th>Material (mm)</th>
                          <th class="text-center">Capas</th>
                          <th class="text-center">Trapecios/Hoja</th>
                          <th class="text-center">Hojas Requeridas</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="(item, idx) in cuttingBreakdown" :key="idx">
                          <td>
                            <strong>{{ item.material.thickness }}</strong> × {{ item.material.length }} × {{ item.material.width }}
                          </td>
                          <td class="text-center">
                            <v-chip size="small" color="primary">{{ item.layerCount }}</v-chip>
                          </td>
                          <td class="text-center">{{ item.trapezoidsPerSheet }}</td>
                          <td class="text-center">
                            <v-chip size="small" color="success">{{ item.sheetsRequired }}</v-chip>
                          </td>
                        </tr>
                      </tbody>
                      <tfoot>
                        <tr class="font-weight-bold">
                          <td colspan="3" class="text-right">Total de hojas:</td>
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
                    <v-col
                      v-for="(item, idx) in recommendedCuttingLayouts"
                      :key="`rec-${idx}`"
                      cols="12"
                      md="6"
                      lg="4"
                    >
                      <v-card variant="outlined" class="pa-2">
                        <v-card-subtitle class="text-caption">
                          {{ item.material.thickness }}mm × {{ item.material.length }}mm × {{ item.material.width }}mm
                        </v-card-subtitle>
                        <div class="text-caption mb-2">
                          {{ item.trapsToRender }} de {{ item.trapezoidsPerSheet }} trapecios/hoja • {{ item.sheetsRequired }} hojas • {{ item.wastePercentage.toFixed(1) }}% desperdicio
                        </div>
                        <svg
                          :width="recommendedCanvasWidth"
                          :height="recommendedCanvasHeight"
                          style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px"
                        >
                          <rect
                            :x="20"
                            :y="20"
                            :width="item.sheetScaledWidth"
                            :height="item.sheetScaledHeight"
                            fill="#ffffff"
                            stroke="#64748b"
                            stroke-width="2"
                          />
                          <g v-for="(trap, tIdx) in item.layout" :key="tIdx">
                            <polygon
                              :points="trap.points"
                              :fill="tIdx % 2 === 0 ? '#8ac29a70' : '#fbbf2470'"
                              :stroke="tIdx % 2 === 0 ? '#2d6a4f' : '#d97706'"
                              stroke-width="1.25"
                              stroke-dasharray="4 2"
                            />
                          </g>
                        </svg>
                      </v-card>
                    </v-col>
                  </v-row>
                </div>
                
                <div class="text-subtitle-2 mb-3">Visualización Detallada (Opcional)</div>
                
                <v-row dense>
                  <v-col cols="12" md="4">
                    <v-select
                      v-model="selectedMaterialForCutting"
                      :items="inStockMaterials"
                      item-title="label"
                      item-value="index"
                      label="Material para visualizar"
                      hint="Selecciona para ver el patrón de corte en detalle"
                      persistent-hint
                      variant="outlined"
                      density="comfortable"
                    />
                    <v-text-field
                      v-model.number="sheetLength"
                      type="number"
                      label="Largo de hoja (mm)"
                      variant="outlined"
                      density="comfortable"
                    />
                    <v-text-field
                      v-model.number="sheetWidth"
                      type="number"
                      label="Ancho de hoja (mm)"
                      variant="outlined"
                      density="comfortable"
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
                      <v-chip size="small" class="mr-1 mb-1">H: {{ W1.toFixed(1) }}mm</v-chip>
                    </div>
                    
                    <v-card variant="tonal" color="success" class="mb-3">
                      <v-card-text>
                        <div class="text-h4 font-weight-bold">{{ trapezoidsPerSheet }}</div>
                        <div class="text-caption">Trapecios por hoja</div>
                      </v-card-text>
                    </v-card>
                    
                    <v-card variant="tonal" color="warning">
                      <v-card-text>
                        <div class="text-h5 font-weight-bold">{{ wastePercentage.toFixed(1) }}%</div>
                        <div class="text-caption">Desperdicio</div>
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
                      <v-btn size="small" color="success" icon="mdi-plus" @click="openAddMaterialDialog" v-bind="props" />
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Descargar materiales como JSON">
                    <template #activator="{ props }">
                      <v-btn size="small" color="info" icon="mdi-download" @click="exportMaterials" v-bind="props" />
                    </template>
                  </v-tooltip>
                  <v-tooltip text="Cargar materiales desde JSON">
                    <template #activator="{ props }">
                      <v-btn size="small" color="warning" icon="mdi-upload" @click="triggerImportFile" v-bind="props" />
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
                                <v-btn size="x-small" icon="mdi-pencil" color="primary" @click="openEditMaterialDialog(materials.indexOf(mat))" v-bind="props" />
                              </template>
                            </v-tooltip>
                            <v-tooltip text="Eliminar">
                              <template #activator="{ props }">
                                <v-btn size="x-small" icon="mdi-delete" color="error" @click="deleteMaterial(materials.indexOf(mat))" v-bind="props" />
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
</style>