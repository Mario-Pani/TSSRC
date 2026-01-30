<!-- src/App.vue -->
<script setup lang="ts">
import { ref, computed } from 'vue'
import PreviewCanvas from './components/PreviewCanvas.vue'
import { computeDims, pickNByOD } from './utils/geometry'

const isDark = ref(false)

const ID = ref<number>(1200)
const OD = ref<number>(1500)

// Coeficiente en % (editable) ⇄ factor
const coeffPct = ref<number>(0.35) // 0.35 %
const coeff = computed(() => 1 + ((+coeffPct.value || 0) / 100))

// Zoom y Panel
const scale = ref(0.22)
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
                   
                  </v-row>

                  <!-- Zoom -->
                  <v-slider v-model="scale" min="0.05" max="0.8" step="0.01"
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
                  :scale="scale" 
                  :pan-x="panX" :pan-y="panY"
                  :showGuides="showGuides"
                  @update:scale="v => scale = v"
                  @update:pan-x="v => panX = v"
                  @update:pan-y="v => panY = v"
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