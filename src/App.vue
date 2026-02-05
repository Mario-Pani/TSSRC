<!-- src/App.vue -->
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import PreviewCanvas from './components/PreviewCanvas.vue'
import { computeDims, pickNByOD } from './utils/geometry'

const isDark = ref(true)

const ID = ref<number>(1200)
const OD = ref<number>(1500)

// Thickness (espesor total en mm)
const TH = ref<number>(12)

// Capas (sincronizado con PreviewCanvas)
const layers = ref<number>(3)

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
interface Material {
  thickness: number
  length: number
  width: number
}

const availableMaterials: Material[] = [
  { thickness: 1, length: 3200, width: 2000 },
  { thickness: 2, length: 3200, width: 2000 },
  { thickness: 3, length: 3200, width: 2000 },
  { thickness: 4, length: 3200, width: 2000 },
  { thickness: 5, length: 3200, width: 2000 },
  { thickness: 6, length: 3200, width: 2000 },
  { thickness: 7, length: 3200, width: 2000 }
]

// Encontrar la mejor combinación de capas
interface LayerCombination {
  layers: Material[]
  totalThickness: number
  layerCount: number
}

function findBestLayerCombination(targetTH: number, layerCount: number): LayerCombination | null {
  let bestCombination: LayerCombination | null = null

  const numLayers = Math.max(3, layerCount)
  const pairCount = Math.floor(numLayers / 2)
  const hasCenter = numLayers % 2 === 1

  const materials = availableMaterials

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
                  :showGuides="showGuides"
                  @update:scale="v => scale = v"
                  @update:pan-x="v => panX = v"
                  @update:pan-y="v => panY = v"
                  @update:layers="v => layers = Math.max(3, v)"
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