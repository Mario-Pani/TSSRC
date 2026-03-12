import { computed, Ref } from 'vue'
import type { Material } from '../utils/materials'
import type { TrapezoidDims } from '../utils/geometry'
import type { TrapezoidPosition, OffcutPolygon } from './useNestingCalculations'

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

export interface SheetStats {
  utilizedPct: number
  offcutPct: number
  scrapPct: number
  offcutPolygon: OffcutPolygon | null
}

export interface RecommendedLayout {
  material: Material
  layerCount: number
  trapezoidsNeeded: number
  trapezoidsPerSheet: number
  sheetsRequired: number
  scale: number
  trapsToRender: number
  sheetScaledWidth: number
  sheetScaledHeight: number
  layout: TrapezoidPosition[]
  
  // Novedades para pesos y áreas:
  totalRingWeight: number
  totalMaterialWeight: number
  overallYieldPct: number
  fullSheetStats: SheetStats | null
  partialSheetStats: SheetStats | null
}

export function useCuttingBreakdown(
  dims: Ref<TrapezoidDims | null>,
  layerCombination: Ref<LayerCombination | null>,
  N: Ref<number>,
  ringCount: Ref<number>,
  calculateTrapezoidsPerSheet: (length: number, width: number) => number,
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
  ) => TrapezoidPosition[],
  recommendedCanvasWidth: number,
  recommendedCanvasHeight: number,
  density: Ref<number>,
  calculateOffcuts: (
    layout: TrapezoidPosition[],
    sheetLength: number,
    sheetWidth: number,
    scale: number,
    offsetX?: number,
    offsetY?: number
  ) => OffcutPolygon | null
) {
  // Desglose de materiales necesarios para el corte
  const cuttingBreakdown = computed<MaterialCuttingBreakdown[]>(() => {
    const combo = layerCombination.value
    if (!combo) return []

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

  // Layouts recomendados con visualización por material, pesos y offcuts
  const recommendedCuttingLayouts = computed<RecommendedLayout[]>(() => {
    return cuttingBreakdown.value.map((item) => {
      const scale = computeCuttingScaleFor(
        item.material.length,
        item.material.width,
        recommendedCanvasWidth,
        recommendedCanvasHeight
      )
      const trapsToRender = Math.min(item.trapezoidsPerSheet, item.trapezoidsNeeded)
      const layout = buildNestingLayout(item.material.length, item.material.width, scale, trapsToRender)

      const d = dims.value
      // Cálculos CIENTÍFICOS de Peso y Eficiencia
      let totalRingWeight = 0
      let totalMaterialWeight = 0
      let overallYieldPct = 0
      let trapAreaSqMm = 0
      
      if (d) {
        // Área del trapecio (mm^2)
        trapAreaSqMm = ((d.s_in + d.s_out) / 2) * d.h
        // Volumen trapecio = (Area * espesor) / 1000 en cc
        const trapVolCm3 = (trapAreaSqMm * item.material.thickness) / 1000
        // Peso en kg (Densidad en g/cm3)
        const trapWeightKg = (trapVolCm3 * Math.max(0.001, density.value)) / 1000
        totalRingWeight = trapWeightKg * item.trapezoidsNeeded

        // Peso del material total en hojas enteras + hoja parcial usada
        const sheetAreaSqMm = item.material.length * item.material.width
        const sheetVolCm3 = (sheetAreaSqMm * item.material.thickness) / 1000
        const sheetWeightKg = (sheetVolCm3 * Math.max(0.001, density.value)) / 1000
        totalMaterialWeight = sheetWeightKg * item.sheetsRequired

        overallYieldPct = totalMaterialWeight > 0 ? (totalRingWeight / totalMaterialWeight) * 100 : 0
      }

      function getSheetStats(trapsPlaced: number, layoutCoords: TrapezoidPosition[]): SheetStats | null {
        if (!d || trapsPlaced === 0) return null
        const sheetAreaSqMm = item.material.length * item.material.width
        const utilizedArea = trapsPlaced * trapAreaSqMm
        const utilizedPct = sheetAreaSqMm > 0 ? (utilizedArea / sheetAreaSqMm) * 100 : 0

        // El cálculo devuelve coordenadas SVG completando el scale final
        const offcutPolygon = calculateOffcuts(layoutCoords, item.material.length, item.material.width, scale, 20, 20)
        
        // Área en escala real mm²
        let offcutArea = 0
        if (offcutPolygon) {
          // El area del svg esta escalada por scale^2. Usar area real.
          offcutArea = calculateOffcuts(buildNestingLayout(item.material.length, item.material.width, 1, trapsPlaced), item.material.length, item.material.width, 1, 0, 0)?.area ?? 0
        }
        
        const offcutPct = sheetAreaSqMm > 0 ? (offcutArea / sheetAreaSqMm) * 100 : 0

        let scrapArea = sheetAreaSqMm - utilizedArea - offcutArea
        if (scrapArea < 0) scrapArea = 0
        const scrapPct = sheetAreaSqMm > 0 ? (scrapArea / sheetAreaSqMm) * 100 : 0

        return { utilizedPct, offcutPct, scrapPct, offcutPolygon }
      }

      // Detectar Layout Parcial vs Entero
      const partialCount = item.trapezoidsNeeded % item.trapezoidsPerSheet
      const hasFullSheets = item.sheetsRequired > (partialCount > 0 ? 1 : 0)

      const fullSheetStats = hasFullSheets
        ? getSheetStats(item.trapezoidsPerSheet, buildNestingLayout(item.material.length, item.material.width, scale, item.trapezoidsPerSheet))
        : null

      const partialSheetStats = partialCount > 0
        ? getSheetStats(partialCount, buildNestingLayout(item.material.length, item.material.width, scale, partialCount))
        : null

      return {
        ...item,
        scale,
        trapsToRender,
        sheetScaledWidth: item.material.length * scale,
        sheetScaledHeight: item.material.width * scale,
        layout,
        totalRingWeight,
        totalMaterialWeight,
        overallYieldPct,
        fullSheetStats,
        partialSheetStats
      }
    })
  })

  const globalCuttingStats = computed(() => {
    const d = dims.value
    if (!d || !layerCombination.value || recommendedCuttingLayouts.value.length === 0) {
      return { totalRingWeight: 0, totalMaterialWeight: 0, overallYieldPct: 0, totalAdhesiveWeight: 0 }
    }

    const trapAreaSqMm = ((d.s_in + d.s_out) / 2) * d.h
    const totalRingVolCm3 = (trapAreaSqMm * layerCombination.value.totalThickness * N.value * ringCount.value) / 1000
    const globalRingWeight = (totalRingVolCm3 * Math.max(0.001, density.value)) / 1000

    let globalMaterialWeight = 0
    for (const item of cuttingBreakdown.value) {
      const sheetAreaSqMm = item.material.length * item.material.width
      const sheetVolCm3 = (sheetAreaSqMm * item.material.thickness * item.sheetsRequired) / 1000
      globalMaterialWeight += (sheetVolCm3 * Math.max(0.001, density.value)) / 1000
    }

    // Cálculo real de Adhesivo (300g / m^2)
    // Interfaces de pegado = número de capas - 1
    const bondedInterfaces = Math.max(0, layerCombination.value.layerCount - 1)
    const trapAreaM2 = trapAreaSqMm / 1000000
    const areaPerRingM2 = trapAreaM2 * N.value
    // Peso de adhesivo en kg = (Area de un anillo * Interfaces * 300g) / 1000 * cantidadAnillos
    const totalAdhesiveWeight = (areaPerRingM2 * bondedInterfaces * 300 / 1000) * ringCount.value

    const totalRawWeight = globalMaterialWeight + totalAdhesiveWeight
    const overallYieldPct = totalRawWeight > 0 ? (globalRingWeight / totalRawWeight) * 100 : 0

    return { 
      totalRingWeight: globalRingWeight, 
      totalMaterialWeight: globalMaterialWeight, 
      overallYieldPct,
      totalAdhesiveWeight
    }
  })

  // ---- NUEVO: Función "headless" para simular la eficiencia sin usar refs ----
  function simulateGlobalYield(
    hypotheticalDims: TrapezoidDims | null,
    hypotheticalComboLayers: Material[],
    hypotheticalN: number,
    hypotheticalRingCount: number,
    hypotheticalDensity: number
  ): { yieldPct: number, adhesiveWeightKg: number, ringWeightKg: number, materialWeightKg: number } {
    if (!hypotheticalDims || hypotheticalComboLayers.length === 0) return { yieldPct: 0, adhesiveWeightKg: 0, ringWeightKg: 0, materialWeightKg: 0 }

    // 1. Agrupar las capas para saber cuántos anillos por material se necesitan
    const groups: { material: Material; count: number }[] = []
    for (const mat of hypotheticalComboLayers) {
      if (mat.thickness <= 0) continue
      const existing = groups.find(
        (g) =>
          g.material.thickness === mat.thickness &&
          g.material.length === mat.length &&
          g.material.width === mat.width
      )
      if (existing) {
        existing.count++
      } else {
        groups.push({ material: mat, count: 1 })
      }
    }

    // 2. Calcular el breakdown virtual
    let globalMaterialWeight = 0
    for (const group of groups) {
      const trapsPerSheet = calculateTrapezoidsPerSheet(group.material.length, group.material.width)
      const trapezoidsNeeded = group.count * hypotheticalN * hypotheticalRingCount
      const sheetsRequired = trapsPerSheet > 0 ? Math.ceil(trapezoidsNeeded / trapsPerSheet) : 0

      const sheetAreaSqMm = group.material.length * group.material.width
      const sheetVolCm3 = (sheetAreaSqMm * group.material.thickness * sheetsRequired) / 1000
      globalMaterialWeight += (sheetVolCm3 * Math.max(0.001, hypotheticalDensity)) / 1000
    }

    // 3. Peso de anillos target y pegamento
    const trapAreaSqMm = ((hypotheticalDims.s_in + hypotheticalDims.s_out) / 2) * hypotheticalDims.h
    const totalComboThickness = hypotheticalComboLayers.reduce((sum, m) => sum + m.thickness, 0)
    const totalRingVolCm3 = (trapAreaSqMm * totalComboThickness * hypotheticalN * hypotheticalRingCount) / 1000
    const globalRingWeight = (totalRingVolCm3 * Math.max(0.001, hypotheticalDensity)) / 1000

    const bondedInterfaces = Math.max(0, hypotheticalComboLayers.length - 1)
    const trapAreaM2 = trapAreaSqMm / 1000000
    const areaPerRingM2 = trapAreaM2 * hypotheticalN
    const adhesiveWeightKg = (areaPerRingM2 * bondedInterfaces * 300 / 1000) * hypotheticalRingCount

    const totalRawWeight = globalMaterialWeight + adhesiveWeightKg
    const yieldPct = totalRawWeight > 0 ? (globalRingWeight / totalRawWeight) * 100 : 0
    
    return { 
      yieldPct, 
      adhesiveWeightKg, 
      ringWeightKg: globalRingWeight, 
      materialWeightKg: globalMaterialWeight 
    }
  }

  return {
    cuttingBreakdown,
    recommendedCuttingLayouts,
    globalCuttingStats,
    simulateGlobalYield
  }
}
