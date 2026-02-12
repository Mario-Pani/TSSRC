import { computed, Ref } from 'vue'
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

  function computeHorizontalPacking(materialLength: number, materialWidth: number) {
    const d = dims.value
    if (!d) return { trapsPerRow: 0, rows: 0, usedWidth: 0, pairs: 0, extra: 0, pairWidth: 0 }

    const box = trapezoidBoundingBox.value
    const heightWithKerf = box.height + kerf.value
    const rows = Math.floor(materialWidth / heightWithKerf)

    const pairWidth = box.effectiveWidth + kerf.value
    const pairs = Math.floor(materialLength / pairWidth)

    let trapsPerRow = pairs * 2
    const remainingWidth = materialLength - (pairs * pairWidth)
    const singleWidth = box.width + kerf.value
    const extra = remainingWidth >= singleWidth ? 1 : 0
    trapsPerRow += extra

    const usedWidth = (pairs * pairWidth) + (extra ? singleWidth : 0)

    return { trapsPerRow, rows, usedWidth, pairs, extra, pairWidth }
  }

  function computeVerticalPacking(materialLength: number, materialWidth: number, usedWidth: number) {
    const d = dims.value
    if (!d) return { columns: 0, rows: 0, traps: 0, stripWidth: 0, pairs: 0, extra: 0 }

    const stripWidth = materialLength - usedWidth
    if (stripWidth <= 0) return { columns: 0, rows: 0, traps: 0, stripWidth, pairs: 0, extra: 0 }

    const columnWidth = d.h + kerf.value
    const columns = Math.floor(stripWidth / columnWidth)
    if (columns <= 0) return { columns: 0, rows: 0, traps: 0, stripWidth, pairs: 0, extra: 0 }

    const reduction = (d.s_out - d.s_in) / 2
    const effectiveHeight = 2 * d.s_out - reduction
    const pairHeight = effectiveHeight + kerf.value
    const pairs = Math.floor(materialWidth / pairHeight)

    let rows = pairs * 2
    const remainingHeight = materialWidth - (pairs * pairHeight)
    const singleHeight = d.s_out + kerf.value
    const extra = remainingHeight >= singleHeight ? 1 : 0
    rows += extra

    const traps = columns * rows

    return { columns, rows, traps, stripWidth, pairs, extra }
  }

  // Calcula trapecios por hoja para cualquier material
  function calculateTrapezoidsPerSheet(materialLength: number, materialWidth: number): number {
    const d = dims.value
    if (!d) return 0

    const horizontal = computeHorizontalPacking(materialLength, materialWidth)
    const vertical = computeVerticalPacking(
      materialLength,
      materialWidth,
      horizontal.usedWidth
    )

    return (horizontal.trapsPerRow * horizontal.rows) + vertical.traps
  }

  // Trapecios por la hoja actual
  const trapezoidsPerSheet = computed(() => {
    return calculateTrapezoidsPerSheet(sheetLength.value, sheetWidth.value)
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
    const horizontal = computeHorizontalPacking(materialLength, materialWidth)
    const rows = horizontal.rows
    const pairs = horizontal.pairs

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
      if (horizontal.extra) {
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

    const vertical = computeVerticalPacking(
      materialLength,
      materialWidth,
      horizontal.usedWidth
    )
    if (vertical.traps > 0) {
      const offsetLeft = (s_out - s_in) / 2
      const columnWidth = h + kerf.value
      const rowStep = s_out - reduction + kerf.value

      for (let col = 0; col < vertical.columns; col++) {
        const baseX = horizontal.usedWidth + col * columnWidth
        let rowIndex = 0

        for (let pair = 0; pair < vertical.pairs; pair++) {
          for (let inPair = 0; inPair < 2; inPair++) {
            const baseY = rowIndex * rowStep
            const inverted = (col + rowIndex) % 2 === 1

            const v1 = inverted
              ? { x: baseX + 0, y: baseY + offsetLeft }
              : { x: baseX + h, y: baseY + offsetLeft }
            const v2 = inverted
              ? { x: baseX + 0, y: baseY + offsetLeft + s_in }
              : { x: baseX + h, y: baseY + offsetLeft + s_in }
            const v3 = inverted
              ? { x: baseX + h, y: baseY + s_out }
              : { x: baseX + 0, y: baseY + s_out }
            const v4 = inverted
              ? { x: baseX + h, y: baseY + 0 }
              : { x: baseX + 0, y: baseY + 0 }

            traps.push({
              points: `${offsetX + v1.x * scale},${offsetY + v1.y * scale} ${offsetX + v2.x * scale},${offsetY + v2.y * scale} ${offsetX + v3.x * scale},${offsetY + v3.y * scale} ${offsetX + v4.x * scale},${offsetY + v4.y * scale}`,
              centerX: offsetX + (baseX + h / 2) * scale,
              centerY: offsetY + (baseY + s_out / 2) * scale
            })

            if (typeof maxTraps === 'number' && traps.length >= maxTraps) return traps

            rowIndex += 1
          }
        }

        if (vertical.extra) {
          const baseY = rowIndex * rowStep
          const inverted = (col + rowIndex) % 2 === 1

          const v1 = inverted
            ? { x: baseX + 0, y: baseY + offsetLeft }
            : { x: baseX + h, y: baseY + offsetLeft }
          const v2 = inverted
            ? { x: baseX + 0, y: baseY + offsetLeft + s_in }
            : { x: baseX + h, y: baseY + offsetLeft + s_in }
          const v3 = inverted
            ? { x: baseX + h, y: baseY + s_out }
            : { x: baseX + 0, y: baseY + s_out }
          const v4 = inverted
            ? { x: baseX + h, y: baseY + 0 }
            : { x: baseX + 0, y: baseY + 0 }

          traps.push({
            points: `${offsetX + v1.x * scale},${offsetY + v1.y * scale} ${offsetX + v2.x * scale},${offsetY + v2.y * scale} ${offsetX + v3.x * scale},${offsetY + v3.y * scale} ${offsetX + v4.x * scale},${offsetY + v4.y * scale}`,
            centerX: offsetX + (baseX + h / 2) * scale,
            centerY: offsetY + (baseY + s_out / 2) * scale
          })

          if (typeof maxTraps === 'number' && traps.length >= maxTraps) return traps
        }
      }
    }

    return traps
  }

  return {
    trapezoidBoundingBox,
    trapezoidsPerSheet,
    calculateTrapezoidsPerSheet,
    computeCuttingScaleFor,
    buildNestingLayout
  }
}
