import { computed, ref, Ref } from 'vue'
import type { TrapezoidDims } from '../utils/geometry'

export interface TrapezoidPosition {
  points: string
  centerX: number
  centerY: number
}

export function useNestingCalculations(
  dims: Ref<TrapezoidDims | null>,
  sheetLength: Ref<number>,
  sheetWidth: Ref<number>,
  kerf: Ref<number>
) {
  // Cálculo del bounding box del trapecio
  const trapezoidBoundingBox = computed(() => {
    const d = dims.value
    if (!d) return { width: 0, height: 0, effectiveWidth: 0 }
    
    const width = d.s_out
    const height = d.h
    
    // Cuando dos trapecios se alternan horizontalmente (normal + invertido al lado),
    // el ancho efectivo del par se reduce porque encajan las caras inclinadas
    const reduction = (d.s_out - d.s_in) / 2
    const effectiveWidth = 2 * width - reduction
    
    return { width, height, effectiveWidth }
  })

  // Calcula trapecios por hoja para cualquier material
  function calculateTrapezoidsPerSheet(materialLength: number, materialWidth: number): number {
    const d = dims.value
    if (!d) return 0
    
    const box = trapezoidBoundingBox.value
    const heightWithKerf = box.height + kerf.value
    const pairWidth = box.effectiveWidth + kerf.value
    const pairs = Math.floor(materialLength / pairWidth)
    
    let trapsPerRow = pairs * 2
    const remainingWidth = materialLength - (pairs * pairWidth)
    const singleWidth = box.width + kerf.value
    if (remainingWidth >= singleWidth) {
      trapsPerRow += 1
    }
    
    const rows = Math.floor(materialWidth / heightWithKerf)
    return trapsPerRow * rows
  }

  // Trapecios por la hoja actual
  const trapezoidsPerSheet = computed(() => {
    return calculateTrapezoidsPerSheet(sheetLength.value, sheetWidth.value)
  })

  // Calcula desperdicios para un material específico
  function computeWastePercentageFor(
    materialLength: number,
    materialWidth: number,
    trapsUsed?: number
  ): number {
    const d = dims.value
    if (!d) return 0

    const totalSheetArea = materialLength * materialWidth
    const trapArea = ((d.s_in + d.s_out) / 2) * d.h
    const trapsPerSheet = calculateTrapezoidsPerSheet(materialLength, materialWidth)
    const effectiveTraps =
      typeof trapsUsed === 'number'
        ? Math.max(0, Math.min(trapsUsed, trapsPerSheet))
        : trapsPerSheet
    const usedArea = effectiveTraps * trapArea

    return totalSheetArea > 0
      ? ((totalSheetArea - usedArea) / totalSheetArea) * 100
      : 0
  }

  // Desperdicios para la hoja actual
  const wastePercentage = computed(() => {
    const d = dims.value
    if (!d) return 0
    
    const totalSheetArea = sheetLength.value * sheetWidth.value
    const trapArea = ((d.s_in + d.s_out) / 2) * d.h
    const usedArea = trapezoidsPerSheet.value * trapArea
    
    return ((totalSheetArea - usedArea) / totalSheetArea) * 100
  })

  // Calcula escala de corte para canvas con dimensiones máximas
  function computeCuttingScaleFor(
    length: number,
    width: number,
    maxCanvasW: number,
    maxCanvasH: number
  ): number {
    const maxW = maxCanvasW - 40
    const maxH = maxCanvasH - 40
    const scaleW = maxW / length
    const scaleH = maxH / width
    return Math.min(scaleW, scaleH)
  }

  // Construye layout de nesting con alternancia horizontal
  function buildNestingLayout(
    materialLength: number,
    materialWidth: number,
    scale: number,
    maxTraps?: number
  ): TrapezoidPosition[] {
    const d = dims.value
    if (!d) return []

    const traps: TrapezoidPosition[] = []
    const offsetX = 20
    const offsetY = 20

    const s_in = d.s_in
    const s_out = d.s_out
    const h = d.h

    const heightWithKerf = h + kerf.value
    const rows = Math.floor(materialWidth / heightWithKerf)

    const box = trapezoidBoundingBox.value
    const pairWidth = box.effectiveWidth + kerf.value
    const pairs = Math.floor(materialLength / pairWidth)

    const reduction = (s_out - s_in) / 2

    for (let row = 0; row < rows; row++) {
      const baseY = row * heightWithKerf
      let currentX = 0

      // Pares alternados en la misma fila
      for (let pair = 0; pair < pairs; pair++) {
        // Trapecio NORMAL (base ancha abajo)
        const offsetLeft = (s_out - s_in) / 2

        const n1 = { x: currentX + offsetLeft, y: baseY }
        const n2 = { x: currentX + offsetLeft + s_in, y: baseY }
        const n3 = { x: currentX + s_out, y: baseY + h }
        const n4 = { x: currentX, y: baseY + h }

        traps.push({
          points: `${offsetX + n1.x * scale},${offsetY + n1.y * scale} ${offsetX + n2.x * scale},${offsetY + n2.y * scale} ${offsetX + n3.x * scale},${offsetY + n3.y * scale} ${offsetX + n4.x * scale},${offsetY + n4.y * scale}`,
          centerX: offsetX + (currentX + s_out / 2) * scale,
          centerY: offsetY + (baseY + h / 2) * scale
        })

        if (typeof maxTraps === 'number' && traps.length >= maxTraps) return traps

        currentX += s_out - reduction + kerf.value

        // Trapecio INVERTIDO (base ancha arriba) al lado
        const inv1 = { x: currentX, y: baseY }
        const inv2 = { x: currentX + s_out, y: baseY }
        const inv3 = { x: currentX + offsetLeft + s_in, y: baseY + h }
        const inv4 = { x: currentX + offsetLeft, y: baseY + h }

        traps.push({
          points: `${offsetX + inv1.x * scale},${offsetY + inv1.y * scale} ${offsetX + inv2.x * scale},${offsetY + inv2.y * scale} ${offsetX + inv3.x * scale},${offsetY + inv3.y * scale} ${offsetX + inv4.x * scale},${offsetY + inv4.y * scale}`,
          centerX: offsetX + (currentX + s_out / 2) * scale,
          centerY: offsetY + (baseY + h / 2) * scale
        })

        if (typeof maxTraps === 'number' && traps.length >= maxTraps) return traps

        currentX += s_out - reduction + kerf.value
      }

      // Trapecio adicional si cabe
      const remainingWidth = materialLength - currentX
      if (remainingWidth >= s_out + kerf.value) {
        const offsetLeft = (s_out - s_in) / 2

        const e1 = { x: currentX + offsetLeft, y: baseY }
        const e2 = { x: currentX + offsetLeft + s_in, y: baseY }
        const e3 = { x: currentX + s_out, y: baseY + h }
        const e4 = { x: currentX, y: baseY + h }

        traps.push({
          points: `${offsetX + e1.x * scale},${offsetY + e1.y * scale} ${offsetX + e2.x * scale},${offsetY + e2.y * scale} ${offsetX + e3.x * scale},${offsetY + e3.y * scale} ${offsetX + e4.x * scale},${offsetY + e4.y * scale}`,
          centerX: offsetX + (currentX + s_out / 2) * scale,
          centerY: offsetY + (baseY + h / 2) * scale
        })

        if (typeof maxTraps === 'number' && traps.length >= maxTraps) return traps
      }
    }

    return traps
  }

  return {
    trapezoidBoundingBox,
    trapezoidsPerSheet,
    wastePercentage,
    calculateTrapezoidsPerSheet,
    computeWastePercentageFor,
    computeCuttingScaleFor,
    buildNestingLayout
  }
}
