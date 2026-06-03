<script setup lang="ts">
import { computed } from 'vue'
import type { CalculationResult, LayerCombination, LayerStackItem } from '../types'

type CalcCopy = {
  calculationTitle: string
  trapezoidTitle: string
  layersTitle: string
  layersCombination: string
  layersLayerCount: string
  layersFinalThickness: string
  layerItemLabel: string
  layerNoMatch: string
  shrinkage: string
  tolerance: string
}

const props = defineProps<{
  copy: CalcCopy
  result: CalculationResult
  selectedLayerCombination: LayerCombination | null
  calculatedLayerItems: LayerStackItem[]
}>()

const cards = computed(() => [
  { label: 'IDnom', value: props.result.idMin.toFixed(2), tone: 'neutral' },
  { label: 'ODnom', value: props.result.odMax.toFixed(2), tone: 'neutral' },
  { label: 'THnom', value: props.result.thNom.toFixed(2), tone: 'neutral' },
  { label: 'RBnom', value: props.result.rbNom.toFixed(2), tone: 'neutral' },
  { label: 'IDs', value: props.result.idN.toFixed(2), tone: 'accent' },
  { label: 'ODs', value: props.result.odN.toFixed(2), tone: 'accent' },
  { label: 'THs', value: props.result.thN.toFixed(2), tone: 'accent' },
  { label: 'RBs', value: props.result.rbAdj.toFixed(2), tone: 'accent' },
  { label: 'Segmentos', value: String(props.result.segments), tone: 'neutral' },
  { label: 'Nt', value: String(props.result.nTotal), tone: 'neutral' },
  { label: props.copy.shrinkage, value: `${props.result.shrinkPct.toFixed(2)}%`, tone: 'accent' },
  { label: props.copy.tolerance, value: `${props.result.tolerancePct.toFixed(2)}%`, tone: 'neutral' },
  { label: 'SL', value: props.result.slAdj.toFixed(2), tone: 'neutral' },
  { label: 'SS', value: props.result.ssAdj.toFixed(2), tone: 'neutral' },
  { label: 'H', value: props.result.hAdj.toFixed(2), tone: 'neutral' },
  { label: 'G', value: props.result.angleCutDeg.toFixed(2), tone: 'neutral' }
])
</script>

<template>
  <div class="calc-results">
    <h3>{{ copy.calculationTitle }}</h3>
    <h4 class="calc-subtitle">{{ copy.trapezoidTitle }}</h4>

    <div class="calc-cards">
      <article
        v-for="card in cards"
        :key="card.label"
        class="calc-card"
        :class="`calc-card-${card.tone}`"
      >
        <span class="calc-card-label">{{ card.label }}</span>
        <strong class="calc-card-value">{{ card.value }}</strong>
      </article>
    </div>

    <h4 class="calc-subtitle">{{ copy.layersTitle }}</h4>

    <div v-if="selectedLayerCombination" class="layer-summary">
      <div class="layer-summary-row">
        <span>{{ copy.layersCombination }}</span>
        <strong>{{ selectedLayerCombination.combination }}</strong>
      </div>
      <div class="layer-summary-row">
        <span>{{ copy.layersLayerCount }}</span>
        <strong>{{ selectedLayerCombination.layerCount }}</strong>
      </div>
      <div class="layer-summary-row">
        <span>{{ copy.layersFinalThickness }}</span>
        <strong>{{ selectedLayerCombination.finalThickness }} mm</strong>
      </div>
    </div>

    <div v-if="calculatedLayerItems.length > 0" class="layer-stack">
      <div v-for="item in calculatedLayerItems" :key="item.index" class="layer-stack-item">
        <span>{{ copy.layerItemLabel }} {{ item.index }}</span>
        <strong>{{ item.thickness }} mm</strong>
      </div>
    </div>
    <p v-else class="order-items-empty">{{ copy.layerNoMatch }}</p>
  </div>
</template>

<style scoped>
.calc-cards {
  margin-top: 0.55rem;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.55rem;
}

.calc-card {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  min-height: 4rem;
  padding: 0.7rem 0.8rem;
  border: 1px solid color-mix(in srgb, var(--line) 78%, transparent 22%);
  border-radius: 12px;
  background: color-mix(in srgb, var(--surface) 88%, white 12%);
}

.calc-card-accent {
  border-color: color-mix(in srgb, var(--accent) 34%, var(--line) 66%);
  background: color-mix(in srgb, var(--surface) 78%, white 22%);
}

.calc-card-label {
  font: 700 0.68rem/1.1 var(--sans);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.calc-card-value {
  font: 700 1rem/1.15 var(--sans);
  color: var(--text);
}

.layer-summary {
  margin-top: 0.55rem;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
}

.layer-summary-row {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.6rem 0.75rem;
  border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--line) 80%);
  border-radius: 10px;
  background: color-mix(in srgb, var(--surface) 82%, white 18%);
}

.layer-summary-row span {
  font: 700 0.66rem/1.1 var(--sans);
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--muted);
}

.layer-summary-row strong {
  font: 700 0.92rem/1.2 var(--sans);
}

@media (max-width: 860px) {
  .calc-cards,
  .layer-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .calc-cards,
  .layer-summary {
    grid-template-columns: 1fr;
  }
}
</style>