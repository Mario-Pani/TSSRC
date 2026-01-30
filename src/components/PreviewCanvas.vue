<script setup lang="ts">
import { computed,ref } from 'vue'
import { polygonVertices, computeDims } from '../utils/geometry'

const props = defineProps<{
  ID: number; OD: number; coeff: number;
  scale: number; showGuides?: boolean;
  panX: number; panY: number
}>()
const emit = defineEmits<{
  (e: 'update:scale', v: number): void
  (e:'update:pan-x', v:number): void
  (e:'update:pan-y', v:number): void

}>()


const dims  = computed(() => computeDims(props.ID, props.OD, props.coeff))
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

// ----- Zoom con rueda (igual que antes) -----
function onWheel(e: WheelEvent) {
  e.preventDefault()
  const delta = e.deltaY < 0 ? 0.02 : -0.02
  emit('update:scale', clamp(props.scale + delta, 0.05, 0.8))
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
  svgEl.value.setPointerCapture(e.pointerId)
  // cambiar cursor
  svgEl.value.style.cursor = 'grabbing'
}

function onPointerMove(e: PointerEvent) {
  if (!dragging.value) return
  const dx = e.clientX - startClientX
  const dy = e.clientY - startClientY

  // Si QUIERES SOLO desplazar “hacia los lados” (eje X):
  // emit('update:pan-x', startPanX + dx)
  // emit('update:pan-y', startPanY)           // no mover Y

  // Si quieres mover en X e Y:
  emit('update:pan-x', startPanX + dx)
  emit('update:pan-y', startPanY + dy)
}

function endDrag(e: PointerEvent) {
  if (!svgEl.value) return
  dragging.value = false
  try { svgEl.value.releasePointerCapture(e.pointerId) } catch {}
  svgEl.value.style.cursor = 'grab'
}
</script>

<template>
  
<svg
    ref="svgEl"
    :width="860" :height="500"
    @wheel.passive.prevent="onWheel"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="endDrag"
    @pointercancel="endDrag"
    @pointerleave="endDrag"
    style="background:#fff;border:1px solid #e5e7eb;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);cursor:grab"
  >

    <!-- centro -->
    <circle :cx="cx" :cy="cy" r="3" fill="#111827" />

    <!-- Guías: círculos punteados (nominal) -->
    <circle v-if="showGuides" :cx="cx" :cy="cy" :r="(Ri_nom*scale)"
            fill="none" stroke="#d1d5db" stroke-width="1.6" stroke-dasharray="8 6"/>
    <circle v-if="showGuides" :cx="cx" :cy="cy" :r="(Ro_nom*scale)"
            fill="none" stroke="#9ca3af" stroke-width="1.6" stroke-dasharray="8 6"/>

    <!-- TODOS los trapecios (corregidos) -->
    <template v-for="k in N" :key="k">
      <polygon
        :points="[
          toPx(inner[(k-1+N)%N]),
          toPx(inner[k%N]),
          toPx(outer[k%N]),
          toPx(outer[(k-1+N)%N])
        ].map(q=>`${q.x},${q.y}`).join(' ')"
        fill="#93c5fd33" stroke="#2563eb" stroke-width="2"
        stroke-linecap="round" stroke-linejoin="round"
      />
    </template>
  </svg>
</template>