<template>
  <div class="svg-trapezoid-container">
    <!-- Controles de Zoom -->
    <div class="zoom-controls">
      <v-btn-group>
        <v-btn 
          icon 
          size="small" 
          @click="zoomOut"
          :disabled="svgScale <= 0.5"
          title="Zoom out"
        >
          <v-icon>mdi-minus</v-icon>
        </v-btn>
        <v-btn 
          icon 
          size="small" 
          @click="resetZoom"
          :disabled="svgScale === 1"
          title="Reset zoom"
        >
          <v-icon>mdi-refresh</v-icon>
        </v-btn>
        <v-btn 
          icon 
          size="small" 
          @click="zoomIn"
          :disabled="svgScale >= 2"
          title="Zoom in"
        >
          <v-icon>mdi-plus</v-icon>
        </v-btn>
      </v-btn-group>
      <span class="zoom-label">{{ (svgScale * 100).toFixed(0) }}%</span>
    </div>

    <!-- SVG Container con scroll si es necesario -->
    <div 
      class="svg-wrapper"
      :style="{ 
        transform: `scale(${svgScale})`,
        transformOrigin: 'top left',
        overflowX: svgScale > 1 ? 'auto' : 'visible',
        overflowY: svgScale > 1 ? 'auto' : 'visible'
      }"
    >
      <!-- SVG Diagrama del Trapecio Isósceles -->
      <svg 
        class="trapezoid-svg"
        viewBox="0 0 400 220" 
        preserveAspectRatio="xMidYMid meet"
      >
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
</template>

<script setup lang="ts">
import { ref } from 'vue'

interface Props {
  SL1: number
  SL2: number
  W1: number
  A1: number
}

withDefaults(defineProps<Props>(), {
  SL1: 0,
  SL2: 0,
  W1: 0,
  A1: 0
})

// Estado de zoom
const svgScale = ref(1)

function zoomIn() {
  if (svgScale.value < 2) {
    svgScale.value = Math.min(svgScale.value + 0.1, 2)
  }
}

function zoomOut() {
  if (svgScale.value > 0.5) {
    svgScale.value = Math.max(svgScale.value - 0.1, 0.5)
  }
}

function resetZoom() {
  svgScale.value = 1
}
</script>

<style scoped>
.svg-trapezoid-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.zoom-controls {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.zoom-label {
  font-size: 0.875rem;
  font-weight: 500;
  min-width: 40px;
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
}

.svg-wrapper {
  width: 100%;
  max-width: 800px;
  overflow-x: auto;
  overflow-y: auto;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  padding: 12px;
  transition: transform 0.2s ease;
  
  /* Para pantallas pequeñas */
  @media (max-width: 768px) {
    max-width: 100%;
    padding: 8px;
  }
}

.trapezoid-svg {
  width: 100%;
  height: auto;
  display: block;
  
  /* Asegurar que no sea más pequeño que el viewBox */
  min-width: 300px;
  min-height: auto;
}

/* Estilos responsivos */
@media (max-width: 600px) {
  .zoom-controls {
    flex-wrap: wrap;
    gap: 8px;
  }

  .zoom-label {
    width: 100%;
    text-align: center;
  }
}
</style>
