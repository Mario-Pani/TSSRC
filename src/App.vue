<!-- src/App.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PreviewCanvas from './components/PreviewCanvas.vue'
import { computeDims, pickNByOD } from './utils/geometry'
import { availableMaterials, type Material } from './utils/materials'

const isDark = ref(true)

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

  const uniqueMaterials = uniqueMaterialsByThickness(availableMaterials)
  const candidateCount = 6
  const targetPerLayer = targetTH / numLayers
  const materials = pickClosestMaterials(uniqueMaterials, targetPerLayer, candidateCount)

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
        for (const center of materials) {
          evalCombination(buildLayers(current, center))
        }
      } else {
        evalCombination(buildLayers(current))
      }
      return
    }

    for (const mat of materials) {
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
      <v-switch v-model="isDark" density="compact" inset hide-details :label="isDark ? 'Oscuro' : 'Claro'"/>
    </v-app-bar>

    <v-main>
      <v-container class="py-6">
        <v-row dense>
          <!-- ENTRADAS -->  
            <v-col cols="12" md="5">
            <v-card elevation="3">
              <v-card-title class="text-h6">Entradas</v-card-title>
              <v-switch v-model="showGuides"  color="red"
              label="Mostrar líneas ID/OD"/>
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
    </v-main>
  </v-app>
</template>

<style scoped>
.d-grid { display:grid; grid-template-columns: 1fr; }
@media (min-width: 768px) { .d-grid { grid-template-columns: 1fr 1fr; } }
.ga-4 { gap: 1rem; }
</style>