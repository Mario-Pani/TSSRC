<!-- src/components/PreviewCanvas.vue -->
<script setup lang="ts">
import { computed, ref } from 'vue'
import { polygonVertices, computeDims } from '../utils/geometry'

const props = defineProps<{
  ID: number
  OD: number
  coeff: number      // factor (1.0035 = +0.35%)
  scale: number      // zoom (mm → px)
  showGuides?: boolean
}>()

const dims = computed(() => computeDims(props.ID, props.OD, props.coeff))

// Nominal para guías (círculos punteados)
const Ri_nom = computed(() => dims.value.nominal.Ri)
const Ro_nom = computed(() => dims.value.nominal.Ro)

// Corregido para dibujo (trapecio real de corte)
const N  = computed(() => dims.value.N)
const Ri = computed(() => dims.value.corrected.Ri)
const Roc= computed(() => dims.value.corrected.Roc)

// Vértices de polígonos corregidos (sólo para definir trapezoide)
const inner = computed(() => polygonVertices(Ri.value,  N.value))
const outer = computed(() => polygonVertices(Roc.value, N.value))

// Centro del canvas
const cx = 400, cy = 260

function toPx(p:{x:number;y:number}) {
  return { x: cx + p.x*props.scale, y: cy - p.y*props.scale }
}

// Zoom con rueda (opcional)
const svgRef = ref<SVGSVGElement | null>(null)
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY < 0 ? 0.02 : -0.02
  // emitimos un evento "wheel-zoom" para que el padre cambie scale
  svgRef.value?.dispatchEvent(new CustomEvent('wheel-zoom', { detail: delta, bubbles: true }))
}
</script>

<template>
  <svg ref="svgRef" :width="800" :height="520"
       @wheel.passive.prevent="onWheel"
       style="background:#fff;border:1px solid #ddd;border-radius:8px">
    <!-- centro -->
    <circle :cx="cx" :cy="cy" r="3" fill="#444" />

    <!-- guías nominales (ID/OD) -->
    <circle v-if="showGuides" :cx="cx" :cy="cy" :r="Ri_nom*scale"
            fill="none" stroke="#bdbdbd" stroke-dasharray="8 6" stroke-width="1.5"/>
    <circle v-if="showGuides" :cx="cx" :cy="cy" :r="Ro_nom*scale"
            fill="none" stroke="#9e9e9e" stroke-dasharray="8 6" stroke-width="1.5"/>

    <!-- Trapezoide k=0 (corregido) -->
    <template v-if="N>0">
      <polygon
        :points="[
          toPx(inner[0]), toPx(inner[1]),
          toPx(outer[1]), toPx(outer[0])
        ].map(q=>`${q.x},${q.y}`).join(' ')"
        fill="#5b9bd522" stroke="#5b9bd5" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      />
    </template>
  </svg>
</template>