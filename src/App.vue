<!-- src/App.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PreviewCanvas from './components/PreviewCanvas.vue'
import { computeDims, pickNByOD } from './utils/geometry'
import { availableMaterials, type Material } from './utils/materials'

const isDark = ref(true)
const activeTab = ref(0)

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

const ID = ref<number>(1200)
const OD = ref<number>(1500)

// Thickness (espesor total en mm)
const TH = ref<number>(12)

// Capas (sincronizado con PreviewCanvas)
const layers = ref<number>(3)
const layerThicknesses = ref<number[]>(Array.from({ length: layers.value }, () => TH.value / layers.value))
const skipThicknessSync = ref(false)
const syncingRecommendation = ref(false)
const suppressRecommendation = ref(false)

// Validador para TH
const THRules = [
  (v: number) => v >= 5 || 'El valor debe ser >= 5'
]

// Método para validar y corregir TH
function validateTH() {
  if (TH.value < 5) {
    TH.value = 5
  }
}

// Materiales disponibles (TH en mm, L y W en mm)

// Encontrar la mejor combinación de capas
interface LayerCombination {
  layers: Material[]
  totalThickness: number
  layerCount: number
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

const layerCombination = computed(() => findBestLayerCombination(TH.value, layers.value))

// Coeficiente en % (editable) ⇄ factor
const coeffPct = ref<number>(0.35) // 0.35 %
const coeff = computed(() => 1 + ((+coeffPct.value || 0) / 100))

// Zoom y Panel
const scale = ref(0.22)
const wheelStep = 0.02 // valor fijo
const panX =ref(0)
const panY =ref(0)
function resetview() {
  scale.value = 0.22
  panX.value=0
  panY.value=0
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

// Salidas
const SL1 = computed(() => dims.value?.s_in  ?? 0)
const SL2 = computed(() => dims.value?.s_out ?? 0)
const W1  = computed(() => dims.value?.h     ?? 0)
const A1  = computed(() => dims.value?.alphaDeg ?? 0)
const N   = computed(() => pickNByOD(+OD.value))
const showGuides = ref(true)

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
        <v-tab value="1">Materiales Disponibles</v-tab>
      </v-tabs>

      <v-window v-model="activeTab">
        <!-- TAB 0: DISEÑO -->
        <v-window-item value="0">
          <v-container class="py-6">
        <v-row dense>
          <!-- ENTRADAS -->  
            <v-col cols="12" md="5">
            <v-card elevation="3">
              <v-card-title class="text-h6">Entradas</v-card-title>
              <v-tooltip :text="showGuides ? 'Ocultar líneas ID/OD' : 'Mostrar líneas ID/OD'">
                <template #activator="{ props }">
                  <v-btn
                    v-bind="props"
                    size="small"
                    variant="tonal"
                    :color="showGuides ? 'success' : 'secondary'"
                    @click="showGuides = !showGuides"
                  >
                    <v-icon start>{{ showGuides ? 'mdi-eye' : 'mdi-eye-off' }}</v-icon>
                    Líneas ID/OD
                  </v-btn>
                </template>
              </v-tooltip>
              <v-card-text>
                <div class="d-grid ga-4">
                  <!-- ID -->
                  <v-text-field
                    v-model.number="ID"
                    type="number" min="1" step="1"
                    label="ID (mm)" variant="outlined" density="comfortable"
                  />

                  <!-- OD -->
                  <v-text-field
                    v-model.number="OD"
                    type="number" min="1" step="1"
                    label="OD (mm)" variant="outlined" density="comfortable"
                  />

                  <!-- Coeficiente (%) -->
                  <v-row class="ga-2">
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model.number="coeffPct"
                        type="number" step="0.01"
                        label="Coeficiente ±(%)" suffix="%"
                        variant="outlined" density="comfortable"
                      />
                    </v-col>
                    <v-col cols="12" md="6">
                      <v-text-field
                        v-model.number.lazy="TH"
                        type="number" step="0.1" min="5"
                        label="TH (mm)" suffix="mm"
                        variant="outlined" density="comfortable"
                        :rules="THRules"
                        @blur="validateTH"
                      />
                    </v-col>
                  </v-row>

                  <!-- Zoom -->
                  <v-slider v-model="scale" min="0.05" max="0.8" step="0.001"
                            label="Zoom" color="primary" thumb-label />
                </div>

                <v-alert v-if="!calcError" type="success" variant="tonal" class="mt-2">
                  N (por OD nominal) ⇒ <strong>{{ N }}</strong> •
                  Δ={{ (360/N).toFixed(3) }}° •
                  A1={{ A1.toFixed(3) }}°
                </v-alert>
                <v-alert v-else type="error" variant="tonal" class="mt-2">
                  {{ calcError }}
                </v-alert>
              </v-card-text>
            </v-card>
          </v-col>

          <!-- PREVIEW + SALIDA -->
          <v-col cols="12" md="7">
            <v-card elevation="3">
              <v-card-title class="text-h6">Trapecio</v-card-title>
              <v-card-text class="pa-2">
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
                  @update:layers="v => layers = Math.max(3, v)"
                  @update:layers-thicknesses="onUpdateLayerThicknesses"
                />
              </v-card-text>

              <!-- Salida SL1/SL2/W1/A1 -->
              <v-card-text class="py-4">
                <div class="d-flex flex-wrap ga-4">
                  <v-chip color="primary" variant="tonal" class="ma-1">
                    SL1 (corta) = {{ SL1.toFixed(2) }} mm
                  </v-chip>
                  <v-chip color="primary" variant="tonal" class="ma-1">
                    SL2 (larga) = {{ SL2.toFixed(2) }} mm
                  </v-chip>
                  <v-chip color="secondary" variant="tonal" class="ma-1">
                    W1 (altura) = {{ W1.toFixed(2) }} mm
                  </v-chip>
                  <v-chip color="info" variant="tonal" class="ma-1">
                    A1 (ángulo) = {{ A1.toFixed(3) }}°
                  </v-chip>
                  <v-chip color="success" variant="tonal" class="ma-1">
                    Espesor/capa = {{ thicknessPerLayer.toFixed(3) }} mm
                  </v-chip>
                </div>

                <!-- Combinación de capas recomendada -->
                <v-divider class="my-4"></v-divider>
                <div v-if="layerCombination" class="mt-4">
                  <v-card-subtitle>Combinación de Capas Recomendada</v-card-subtitle>
                  <v-chip color="warning" variant="tonal" class="ma-1">
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
        </v-row>
        </v-container>
        </v-window-item>

        <!-- TAB 1: MATERIALES DISPONIBLES -->
        <v-window-item value="1">
          <v-container class="py-6">
            <v-card elevation="3">
              <v-card-title class="d-flex justify-space-between align-center">
                <span>Estándares de Materiales Disponibles</span>
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
</style>