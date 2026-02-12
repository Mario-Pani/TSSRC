import { computed, Ref } from 'vue'
import type { Material } from '../utils/materials'
import type { TrapezoidDims } from '../utils/geometry'

export interface LayerCombination {
  layers: Material[]
  totalThickness: number
  layerCount: number
}

export interface MaterialCuttingBreakdown {
  material: Material
  layerCount: number
  trapezoidsNeeded: number
  trapezoidsPerSheet: number
  sheetsRequired: number
}

export interface RecommendedLayout {
  material: Material
  layerCount: number
  trapezoidsNeeded: number
  trapezoidsPerSheet: number
  sheetsRequired: number
  scale: number
  trapsToRender: number
  wastePercentage: number
  sheetScaledWidth: number
  sheetScaledHeight: number
  layout: Array<{ points: string; centerX: number; centerY: number }>
}

export function useCuttingBreakdown(
  dims: Ref<TrapezoidDims | null>,
  layerCombination: Ref<LayerCombination | null>,
  N: Ref<number>,
  ringCount: Ref<number>,
  calculateTrapezoidsPerSheet: (length: number, width: number) => number,
  computeWastePercentageFor: (length: number, width: number, trapsUsed?: number) => number,
  computeCuttingScaleFor: (
    length: number,
    width: number,
    maxCanvasW: number,
    maxCanvasH: number
  ) => number,
  buildNestingLayout: (
    length: number,
    width: number,
    scale: number,
    maxTraps?: number
  ) => Array<{ points: string; centerX: number; centerY: number }>,
  recommendedCanvasWidth: number,
  recommendedCanvasHeight: number
) {
  // Desglose de materiales necesarios para el corte
  const cuttingBreakdown = computed<MaterialCuttingBreakdown[]>(() => {
    const combo = layerCombination.value
    if (!combo) return []

    // Agrupar capas por material único (thickness, length, width)
    const groups = new Map<string, { material: Material; count: number }>()

    for (const layer of combo.layers) {
      const key = `${layer.thickness}-${layer.length}-${layer.width}`
      const existing = groups.get(key)
      if (existing) {
        existing.count++
      } else {
        groups.set(key, { material: layer, count: 1 })
      }
    }

    // Calcular desglose para cada grupo
    const breakdown: MaterialCuttingBreakdown[] = []
    for (const group of groups.values()) {
      const trapsPerSheet = calculateTrapezoidsPerSheet(
        group.material.length,
        group.material.width
      )
      const trapezoidsNeeded = group.count * N.value * ringCount.value
      const sheetsNeeded = trapsPerSheet > 0 ? Math.ceil(trapezoidsNeeded / trapsPerSheet) : 0

      breakdown.push({
        material: group.material,
        layerCount: group.count,
        trapezoidsNeeded,
        trapezoidsPerSheet: trapsPerSheet,
        sheetsRequired: sheetsNeeded
      })
    }

    return breakdown
  })

  // Layouts recomendados con visualización por material
  const recommendedCuttingLayouts = computed<RecommendedLayout[]>(() => {
    return cuttingBreakdown.value.map((item) => {
      const scale = computeCuttingScaleFor(
        item.material.length,
        item.material.width,
        recommendedCanvasWidth,
        recommendedCanvasHeight
      )
      const trapsToRender = Math.min(item.trapezoidsPerSheet, item.trapezoidsNeeded)

      return {
        ...item,
        scale,
        trapsToRender,
        wastePercentage: computeWastePercentageFor(
          item.material.length,
          item.material.width,
          trapsToRender
        ),
        sheetScaledWidth: item.material.length * scale,
        sheetScaledHeight: item.material.width * scale,
        layout: buildNestingLayout(
          item.material.length,
          item.material.width,
          scale,
          trapsToRender
        )
      }
    })
  })

  return {
    cuttingBreakdown,
    recommendedCuttingLayouts
  }
}
