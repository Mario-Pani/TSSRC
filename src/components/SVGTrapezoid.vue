<template>
  <div class="svg-trapezoid-container">
    <!-- SVG Container -->
    <div class="svg-wrapper">
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

        <!-- Dimensión H1 (altura - lado izquierdo, DENTRO del trapecio) -->
        <line x1="60" y1="60" x2="60" y2="150" stroke="#38c48c" stroke-width="2.5"/>
        <line x1="55" y1="60" x2="65" y2="60" stroke="#38c48c" stroke-width="2"/>
        <line x1="55" y1="150" x2="65" y2="150" stroke="#38c48c" stroke-width="2"/>
        <text x="45" y="105" font-size="13" font-weight="bold" fill="#388e3c" style="text-anchor: middle; dominant-baseline: middle;" transform="rotate(-90 45 105)">H1: {{ H1.toFixed(1) }}mm</text>

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
/**
 * Componente SVGTrapezoid
 * 
 * Renderiza un diagrama SVG responsivo del trapecio anular con acotaciones
 * 
 * **Características:**
 * - 100% responsivo: se adapta a desktop, tablet y móvil
 * - Acotaciones con colores codificados:
 *   - Azul (#0288d1): SL1 (lado corto interno)
 *   - Rojo/Naranja (#c96562): SL2 (lado largo externo)
 *   - Verde (#38c48c): H1 (altura vertical)
 *   - Naranja (#ff6f00): Ángulo de corte (A1)
 * - SVG escalado automáticamente según viewport
 * - Mantiene proporciones con preserveAspectRatio
 * 
 * @component
 * @example
 * <SVGTrapezoid :SL1="100" :SL2="150" :H1="50" :A1="22.5" />
 */

interface Props {
  /** Lado interno corto (SL1) en mm */
  SL1: number
  /** Lado externo largo (SL2) en mm */
  SL2: number
  /** Altura vertical del trapecio (H1) en mm */
  H1: number
  /** Ángulo de corte en grados (A1) */
  A1: number
}

withDefaults(defineProps<Props>(), {
  SL1: 0,
  SL2: 0,
  H1: 0,
  A1: 0
})
</script>

<style scoped>
.svg-trapezoid-container {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 24px;
}

.svg-wrapper {
  width: 100%;
  max-width: 800px;
  border: 1px solid #ddd;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.15);
  padding: 12px;
  
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
  .svg-trapezoid-container {
    gap: 8px;
  }
}
</style>
