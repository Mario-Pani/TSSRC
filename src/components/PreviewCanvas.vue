<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { polygonVertices, computeDimsMemo } from '../utils/geometry'

const props = defineProps<{
  ID: number; OD: number; coeff: number;
  scale: number; showGuides?: boolean;
  panX: number; panY: number;
  wheelStep?: number;
  layers?: number; // número de capas superpuestas
  layersEnabled?: boolean[]; // array con flags (true/false) para cada capa
  layersColors?: Array<{ fill: string; stroke: string }>; // colores por capa
  layersThicknesses?: number[]; // espesores por capa (mm)
  layerAngleStepDeg?: number; // opcional: forzar paso angular por capa (grados)
}>()
const emit = defineEmits<{
  (e: 'update:scale', v: number): void
  (e:'update:pan-x', v:number): void
  (e:'update:pan-y', v:number): void
  (e:'update:show-guides', v:boolean): void
  (e: 'update:layers', v: number): void
  (e: 'update:layers-enabled', v: boolean[]): void
  (e: 'update:layers-colors', v: Array<{ fill: string; stroke: string }>): void
  (e: 'update:layers-thicknesses', v: number[]): void
  (e: 'update:layer-angle-step-deg', v: number): void
}>()


const lastDims = ref(computeDimsMemo(props.ID, props.OD, props.coeff))
const dims  = computed(() => {
  try {
    const next = computeDimsMemo(props.ID, props.OD, props.coeff)
    lastDims.value = next
    return next
  } catch {
    return lastDims.value
  }
})
const N     = computed(() => dims.value.N)

// Guías nominales
const Ri_nom = computed(() => dims.value.nominal.Ri)
const Ro_nom = computed(() => dims.value.nominal.Ro)

// Radios corregidos (corte)
const Ri  = computed(() => dims.value.corrected.Ri)
const Roc = computed(() => dims.value.corrected.Roc)

// Vértices corregidos
const inner = computed(() => polygonVertices(Ri.value,  N.value))
const outer = computed(() => polygonVertices(Roc.value, N.value))

// Paleta para alternar colores (par / impar)
const colors = [
  { fill: '#8ac29a50', stroke: '#8aa89a' }, // azul claro / verde
  { fill: '#b5f8e450', stroke: '#c1bcd4' }  // amarillo claro / naranja
]

// LOCAL: estado de control de capas (editable desde UI) y sincronización con props
const localLayers = ref(props.layers ?? 3)
const localLayersEnabled = ref<boolean[]>(
  (props.layersEnabled ?? Array.from({ length: localLayers.value }, () => true)).slice(0, localLayers.value)
)

watch(() => props.layers, (v) => {
  if (typeof v === 'number') {
    const clamped = Math.max(3, v)
    localLayers.value = clamped
    // ajustar enabled
    while (localLayersEnabled.value.length < clamped) localLayersEnabled.value.push(true)
    if (localLayersEnabled.value.length > clamped) localLayersEnabled.value.length = clamped
  }
})

watch(() => localLayers.value, (v) => {
  const clamped = Math.max(3, v)
  if (clamped !== v) {
    localLayers.value = clamped
    return
  }

  // Ajustar enabled al cambiar el número de capas
  while (localLayersEnabled.value.length < clamped) localLayersEnabled.value.push(true)
  if (localLayersEnabled.value.length > clamped) localLayersEnabled.value.length = clamped

  if (props.layers !== clamped) {
    emit('update:layers', clamped)
  }
})

watch(() => props.layersEnabled, (v) => {
  if (Array.isArray(v)) {
    // copia y normaliza longitud
    localLayersEnabled.value = v.slice(0, localLayers.value)
    while (localLayersEnabled.value.length < localLayers.value) localLayersEnabled.value.push(true)
  }
})

watch(() => props.layersColors, (v) => {
  if (Array.isArray(v)) {
    localLayerColors.value = v.slice(0, localLayers.value).map((c) => ({
      fill: extractHex(c.fill),
      stroke: extractHex(c.stroke)
    }))
    while (localLayerColors.value.length < localLayers.value) {
      const idx = localLayerColors.value.length
      localLayerColors.value.push({
        fill: extractHex(colors[idx % 2].fill),
        stroke: extractHex(colors[idx % 2].stroke)
      })
    }
  }
})

// Helper para extraer hex sin alpha (color picker solo acepta #RRGGBB)
function extractHex(color: string): string {
  return color.length > 7 ? color.slice(0, 7) : color
}

// Colores personalizados por capa
const localLayerColors = ref<Array<{ fill: string; stroke: string }>>(
  (props.layersColors ?? Array.from({ length: localLayers.value }, (_, i) => ({
    fill: extractHex(colors[i % 2].fill),
    stroke: extractHex(colors[i % 2].stroke)
  })))
    .slice(0, localLayers.value)
    .map((c) => ({ fill: extractHex(c.fill), stroke: extractHex(c.stroke) }))
)

const localShowGuides = ref<boolean>(props.showGuides ?? true)
const localGuideInner = ref<string>('#dd7ed6')
const localGuideOuter = ref<string>('#bd35d5')

watch(() => props.showGuides, (v) => {
  if (typeof v === 'boolean') localShowGuides.value = v
})

watch(() => localLayers.value, (newCount) => {
  // Ajustar el arreglo de colores al cambiar cantidad de capas
  while (localLayerColors.value.length < newCount) {
    const idx = localLayerColors.value.length
    localLayerColors.value.push({ fill: extractHex(colors[idx % 2].fill), stroke: extractHex(colors[idx % 2].stroke) })
  }
  if (localLayerColors.value.length > newCount) localLayerColors.value.length = newCount
  emit('update:layers-colors', localLayerColors.value.slice())
})

// Espesores por capa (mm)
const localLayerThicknesses = ref<number[]>(
  (props.layersThicknesses ?? Array.from({ length: localLayers.value }, () => 1)).slice(0, localLayers.value)
)

watch(() => props.layersThicknesses, (v) => {
  if (Array.isArray(v)) {
    localLayerThicknesses.value = v.slice(0, localLayers.value)
    while (localLayerThicknesses.value.length < localLayers.value) {
      localLayerThicknesses.value.push(1)
    }
  }
})

watch(() => localLayers.value, (newCount) => {
  while (localLayerThicknesses.value.length < newCount) localLayerThicknesses.value.push(1)
  if (localLayerThicknesses.value.length > newCount) localLayerThicknesses.value.length = newCount
})

function updateLayerThickness(i:number, raw:string){
  const idx = i - 1
  const value = Number(raw)
  if (!Number.isFinite(value)) return
  if (idx < 0 || idx >= localLayerThicknesses.value.length) return
  localLayerThicknesses.value[idx] = value
  emit('update:layers-thicknesses', localLayerThicknesses.value.slice())
}

// Auto / custom angle
const autoAngle = ref(true)
const localAngleStep = ref<number>(22.5)

watch(() => N.value, (nv) => {
  // si autoAngle, actualizar el paso por defecto según N
  if (autoAngle.value) {
    if (nv === 8) localAngleStep.value = 22.5
    else if (nv === 16) localAngleStep.value = 11.25
    else localAngleStep.value = 22.5
  }
})

// Cálculo del paso angular efectivo: prop > custom (auto applies local defaults)
const effectiveLayerAngleStepDeg = computed(() => {
  if (typeof props.layerAngleStepDeg === 'number') return props.layerAngleStepDeg
  return localAngleStep.value
})
const layerAngleStepRad = computed(() => effectiveLayerAngleStepDeg.value * Math.PI / 180)

// Helpers
function rotatePoint(p:{x:number;y:number}, angle:number){
  const c = Math.cos(angle), s = Math.sin(angle)
  return { x: p.x * c - p.y * s, y: p.x * s + p.y * c }
}

function colorWithAlpha(baseHex:string, alphaHex:string){
  // baseHex puede ser #RRGGBB o #RRGGBBAA
  if (baseHex.length === 7) return baseHex + alphaHex
  return baseHex.slice(0,7) + alphaHex
}

function layerFill(baseFill:string, idx:number){
  // Reduce la alpha por capa para enfatizar superposición
  const baseAlphaHex = baseFill.length === 9 ? baseFill.slice(7) : 'ff'
  const baseA = parseInt(baseAlphaHex, 16)
  const newA = Math.max(8, Math.round(baseA / (1 + idx)))
  const newAHex = newA.toString(16).padStart(2,'0')
  return colorWithAlpha(baseFill, newAHex)
}

function layerStroke(baseStroke:string, idx:number){
  return baseStroke
}

// Métodos de control
function updateLayerColor(i:number, value:string){
  const idx = i - 1
  if (!localLayerColors.value[idx]) return
  localLayerColors.value[idx].fill = extractHex(value)
  emit('update:layers-colors', localLayerColors.value.slice())
}
function toggleLayer(i:number){
  const idx = i - 1
  localLayersEnabled.value[idx] = !localLayersEnabled.value[idx]
}


// Centro base del viewport (sin pan)
const cx0 = 420, cy0 = 240
// Centro efectivo = base + pan
const cx  = computed(() => cx0 + props.panX)
const cy  = computed(() => cy0 + props.panY)

const clamp = (x:number,a:number,b:number)=> Math.max(a,Math.min(b,x))

function toPx(p:{x:number;y:number}) {
  // Aplicamos pan moviendo el centro efectivo
  return { x: cx.value + p.x*props.scale, y: cy.value - p.y*props.scale }
}

function maxPanLimits(scale:number){
  const margin = 12
  const RocPx = Roc.value * scale
  // Usamos cx0/cy0 como centro base
  const minX = (margin + RocPx) - cx0
  const maxX = (860 - (margin + RocPx)) - cx0
  const minY = (margin + RocPx) - cy0
  const maxY = (500 - (margin + RocPx)) - cy0
  return { minX, maxX, minY, maxY }
}

// ----- Zoom con rueda (ahora clamp + ajuste de pan) -----
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const step = props.wheelStep ?? 0.02
  const delta = e.deltaY < 0 ? step : -step
  const newScale = clamp(props.scale + delta, 0.05, 0.8)
  const limits = maxPanLimits(newScale)
  const clampedX = clamp(props.panX, limits.minX, limits.maxX)
  const clampedY = clamp(props.panY, limits.minY, limits.maxY)
  emit('update:scale', newScale)
  emit('update:pan-x', clampedX)
  emit('update:pan-y', clampedY)
}

// ----- Pan con arrastre (Pointer Events) -----
const svgEl = ref<SVGSVGElement | null>(null)
const dragging = ref(false)
let startClientX = 0, startClientY = 0
let startPanX = 0, startPanY = 0

function onPointerDown(e: PointerEvent) {
  if (!svgEl.value) return
  dragging.value = true
  startClientX = e.clientX
  startClientY = e.clientY
  startPanX = props.panX
  startPanY = props.panY
  try { svgEl.value.setPointerCapture(e.pointerId) } catch {}
  // cambiar cursor
  svgEl.value.style.cursor = 'grabbing'
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - startClientX
  const dy = e.clientY - startClientY

  const limits = maxPanLimits(props.scale)
  const newX = clamp(startPanX + dx, limits.minX, limits.maxX)
  const newY = clamp(startPanY + dy, limits.minY, limits.maxY)

  emit('update:pan-x', newX)
  emit('update:pan-y', newY)
}

function endDrag(e: PointerEvent) {
  if (!svgEl.value) return
  dragging.value = false
  try { svgEl.value.releasePointerCapture(e.pointerId) } catch {}
  svgEl.value.style.cursor = 'grab'
}

function onZoomInput(e: Event) {
  const raw = (e.target as HTMLInputElement).value
  const next = Number(raw)
  if (!Number.isFinite(next)) return
  const clamped = clamp(next, 0.05, 0.8)
  emit('update:scale', clamped)
}
</script>

<template>
  
<div style="position:relative; display:inline-block">
    <svg
      ref="svgEl"
      :width="860" :height="500"
      @wheel.passive.prevent="onWheel"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="endDrag"
      @pointercancel="endDrag"
      @pointerleave="endDrag"
      style="background:#d3d6df50;border:1px solid #ffffff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);cursor:grab"
    >

      <!-- centro -->
      <circle :cx="cx" :cy="cy" r="3" fill="#11182770" />

      <!-- TODOS los trapecios (corregidos) con capas superpuestas activables -->
      <template v-for="i in localLayers" :key="`capa-${i}`">
        <template v-for="k in N" :key="`trap-${k}`">
          <polygon
            v-if="localLayersEnabled[i-1]"
            :points="[
              rotatePoint(inner[(k-1+N)%N], (i-1) * layerAngleStepRad),
              rotatePoint(inner[k%N], (i-1) * layerAngleStepRad),
              rotatePoint(outer[k%N], (i-1) * layerAngleStepRad),
              rotatePoint(outer[(k-1+N)%N], (i-1) * layerAngleStepRad)
            ].map(q => toPx(q)).map(q => `${q.x},${q.y}`).join(' ')"
            :fill="layerFill(localLayerColors[i-1].fill, i-1)"
            :stroke="localLayerColors[i-1].stroke"
            stroke-width="1"
            stroke-linecap="round" stroke-linejoin="round"
          />
        </template>
      </template>

      <!-- Guías: círculos punteados (nominal) -->
            <circle v-if="localShowGuides" :cx="cx" :cy="cy" :r="(Ri_nom*scale)"
              fill="none" :stroke="localGuideInner" stroke-width="1.5" stroke-dasharray="3 2"/>
            <circle v-if="localShowGuides" :cx="cx" :cy="cy" :r="(Ro_nom*scale)"
              fill="none" :stroke="localGuideOuter" stroke-width="1.5" stroke-dasharray="3 2"/>

    </svg>

    <!-- Panel de controles mejorado -->
    <div class="controls-panel">
      <div class="controls-header">
        <div class="controls-title">Capas</div>
        <input class="num-input" type="number" v-model.number="localLayers" min="3" max="8" />
      </div>

      <div class="controls-row guides-row">
        <label class="switch"><input type="checkbox" v-model="localShowGuides" @change="emit('update:show-guides', localShowGuides)" /><span>ID / OD</span></label>
        <div class="guides-colors">
          <input class="color-input" type="color" v-model="localGuideInner" title="Color ID" />
          <input class="color-input" type="color" v-model="localGuideOuter" title="Color OD" />
        </div>
      </div>

      <div class="controls-row">
        <label class="switch"><input type="checkbox" v-model="autoAngle" /><span>Ángulo automático</span></label>
      </div>

      <div v-if="!autoAngle" class="controls-row">
        <label>Ángulo (°)</label>
        <input class="small-input" type="number" v-model.number="localAngleStep" step="0.1" />
      </div>

      <div class="layers-list">
        <div v-for="i in localLayers" :key="i" class="layer-row">
          <div class="layer-left">
            <input
              class="th-input"
              type="number"
              min="1"
              step="0.1"
              :value="localLayerThicknesses[i-1]"
              :placeholder="`Capa ${i}`"
              :title="`Espesor Capa ${i}`"
              @change="updateLayerThickness(i, ($event.target as HTMLInputElement).value)"
            />
            <button
              class="layer-toggle"
              :class="{ active: localLayersEnabled[i-1] }"
              type="button"
              :title="`Capa ${i}`"
              :aria-pressed="localLayersEnabled[i-1]"
              @click="toggleLayer(i)"
            >
              <svg class="layer-icon" viewBox="0 0 24 24" aria-hidden="true">
                <path d="M12 4 3 8l9 4 9-4-9-4z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 12l9 4 9-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M3 16l9 4 9-4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <input
              class="color-input"
              type="color"
              :value="localLayerColors[i-1]?.fill"
              :title="`Color capa ${i}`"
              @input="updateLayerColor(i, ($event.target as HTMLInputElement).value)"
            />
          </div>
        </div>
      </div>

      <div class="zoom-section">
        <div class="zoom-header">
          <span>Zoom</span>
          <span class="zoom-value">{{ scale.toFixed(3) }}</span>
        </div>
        <input
          class="zoom-slider"
          type="range"
          min="0.05"
          max="0.8"
          step="0.001"
          :value="scale"
          @input="onZoomInput"
        />
      </div>

    </div>
  </div>
</template>

<style scoped>
.controls-panel{
  position:absolute; top:10px; right:10px; width: 170px; background:#ffffff74; border-radius:10px; padding:10px; box-shadow:0 8px 20px rgba(31, 109, 143, 0.251); font-size:13px; color:#111827; border:1px solid #eef2f7;
}
.controls-header{ display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:8px }
.controls-title{ font-weight:700 }
.num-input{ width:58px; padding:4px 6px; border-radius:6px; border:1px solid #e6e9ee }
.small-input{ width:72px; padding:4px 6px; border-radius:6px; border:1px solid #e6e9ee }
.controls-row{ display:flex; align-items:center; justify-content:space-between; margin-bottom:8px }
.switch input{ margin-right:8px }
.layers-list{ max-height:140px; overflow:auto; border-top:1px solid #f1f5f9; padding-top:8px }
.layer-row{ display:flex; align-items:center; justify-content:space-between; padding:6px 0 }
.layer-left{ display:flex; align-items:center; gap:8px }
.swatch{ width:12px; height:12px; border-radius:999px; display:inline-block; box-shadow:0 1px 0 rgba(0,0,0,0.06) }
.layer-icon{ width:16px; height:16px; color:#374151 }
.color-input{ width:28px; height:28px; border:1px solid #e6e9ee; border-radius:6px; cursor:pointer; padding:2px }
.th-input{ width:58px; padding:4px 6px; border-radius:6px; border:1px solid #e6e9ee }
.layer-toggle{ display:inline-flex; align-items:center; justify-content:center; width:28px; height:28px; border:1px solid #e6e9ee; border-radius:6px; background:#ffffff; cursor:pointer }
.layer-toggle:hover{ background:#f3f4f6 }
.layer-toggle.active{ background:#6493f96b; border-color:#ffffffbc }
.layer-toggle.active .layer-icon{ color:#ffffff }
.guides-row{ align-items:center }
.guides-colors{ display:flex; gap:6px; align-items:center }
.zoom-section{
  margin-top:10px; padding-top:10px; border-top:1px solid #f1f5f9;
  font-size:12px; color:#111827;
}
.zoom-header{ display:flex; align-items:center; justify-content:space-between; margin-bottom:6px }
.zoom-value{ font-variant-numeric: tabular-nums; color:#374151 }
.zoom-slider{ width:100%; accent-color:#3b82f6 }
</style>