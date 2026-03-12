import { computed, Ref } from 'vue'
import type { TrapezoidDims } from '../utils/geometry'

export interface TrapezoidPosition {
  points: string
  centerX: number
  centerY: number
}

export interface OffcutPolygon {
  points: string;
  originalPoints: {x: number; y: number}[];
  area: number;
}

// Interfaz interna para resultados de empacado
export interface PackingStrategyResult {
  name: string
  trapsPerSheet: number
  layoutBuilder: (
    materialLength: number,
    materialWidth: number,
    scale: number,
    offsetX: number,
    offsetY: number,
    maxTraps?: number
  ) => TrapezoidPosition[]
}

export function useNestingCalculations(
  dims: Ref<TrapezoidDims | null>,
  sheetLength: Ref<number>,
  sheetWidth: Ref<number>,
  kerf: Ref<number>
) {
  // Cálculo de caja delimitadora
  const trapezoidBoundingBox = computed(() => {
    const d = dims.value
    if (!d) return { width: 0, height: 0, effectiveWidth: 0 }
    const width = d.s_out
    const height = d.h
    const reduction = (d.s_out - d.s_in) / 2
    const effectiveWidth = 2 * width - reduction
    return { width, height, effectiveWidth }
  })

  // ---------------------------------------------------------
  // ESTRATEGIA 1: Empacado Alternado Estandar (Horizontal)
  // Calcula agrupaciones pares a lo largo del "Longitud" de la hoja
  // ---------------------------------------------------------
  function strategyAlternatingHorizontal(length: number, width: number): PackingStrategyResult {
    const d = dims.value
    if (!d) return { name: 'AlternatingH', trapsPerSheet: 0, layoutBuilder: () => [] }

    const box = trapezoidBoundingBox.value
    const hKerf = box.height + kerf.value
    const rows = Math.floor(width / hKerf)
    if (rows <= 0) return { name: 'AlternatingH', trapsPerSheet: 0, layoutBuilder: () => [] }

    const pairWidth = box.effectiveWidth + kerf.value
    const pairs = Math.floor(length / pairWidth)
    let trapsPerRow = pairs * 2
    
    const remainingWidth = length - (pairs * pairWidth)
    const singleWidth = box.width + kerf.value
    const extra = remainingWidth >= singleWidth ? 1 : 0
    trapsPerRow += extra
    const usedWidth = (pairs * pairWidth) + (extra ? singleWidth : 0)

    // Aprovechar sobrante vertical
    const stripWidth = length - usedWidth
    let vColumns = 0, vRows = 0, vPairs = 0, vExtra = 0
    
    if (stripWidth > 0 && Math.floor(stripWidth / hKerf) > 0) {
      vColumns = Math.floor(stripWidth / hKerf)
      const reduction = (d.s_out - d.s_in) / 2
      const effectiveHeight = 2 * d.s_out - reduction
      const pairHeight = effectiveHeight + kerf.value
      
      vPairs = Math.floor(width / pairHeight)
      vRows = vPairs * 2
      
      const remainingHeight = width - (vPairs * pairHeight)
      vExtra = remainingHeight >= (d.s_out + kerf.value) ? 1 : 0
      vRows += vExtra
    }
    const verticalTraps = vColumns * vRows

    const totalTraps = (trapsPerRow * rows) + verticalTraps

    return {
      name: 'AlternatingH',
      trapsPerSheet: totalTraps,
      layoutBuilder: (matL, matW, scale, offX, offY, maxTraps) => {
        const traps: TrapezoidPosition[] = []
        const s_in = d.s_in, s_out = d.s_out, h = d.h
        const reduction = (s_out - s_in) / 2

        // Filas Horizontales
        for (let row = 0; row < rows; row++) {
          const baseY = row * hKerf
          let currentX = 0
          for (let pair = 0; pair < pairs; pair++) {
            // Normal
            const offsetLeft = (s_out - s_in) / 2
            let p1 = { x: currentX + offsetLeft, y: baseY }
            let p2 = { x: currentX + offsetLeft + s_in, y: baseY }
            let p3 = { x: currentX + s_out, y: baseY + h }
            let p4 = { x: currentX, y: baseY + h }
            traps.push({
              points: `${offX + p1.x * scale},${offY + p1.y * scale} ${offX + p2.x * scale},${offY + p2.y * scale} ${offX + p3.x * scale},${offY + p3.y * scale} ${offX + p4.x * scale},${offY + p4.y * scale}`,
              centerX: offX + (currentX + s_out / 2) * scale,
              centerY: offY + (baseY + h / 2) * scale
            })
            if (typeof maxTraps === 'number' && traps.length >= maxTraps) return traps
            currentX += s_out - reduction + kerf.value

            // Invertida
            p1 = { x: currentX, y: baseY }
            p2 = { x: currentX + s_out, y: baseY }
            p3 = { x: currentX + offsetLeft + s_in, y: baseY + h }
            p4 = { x: currentX + offsetLeft, y: baseY + h }
            traps.push({
              points: `${offX + p1.x * scale},${offY + p1.y * scale} ${offX + p2.x * scale},${offY + p2.y * scale} ${offX + p3.x * scale},${offY + p3.y * scale} ${offX + p4.x * scale},${offY + p4.y * scale}`,
              centerX: offX + (currentX + s_out / 2) * scale,
              centerY: offY + (baseY + h / 2) * scale
            })
            if (typeof maxTraps === 'number' && traps.length >= maxTraps) return traps
            currentX += s_out - reduction + kerf.value
          }
          if (extra) {
            const offsetLeft = (s_out - s_in) / 2
            let p1 = { x: currentX + offsetLeft, y: baseY }
            let p2 = { x: currentX + offsetLeft + s_in, y: baseY }
            let p3 = { x: currentX + s_out, y: baseY + h }
            let p4 = { x: currentX, y: baseY + h }
            traps.push({
              points: `${offX + p1.x * scale},${offY + p1.y * scale} ${offX + p2.x * scale},${offY + p2.y * scale} ${offX + p3.x * scale},${offY + p3.y * scale} ${offX + p4.x * scale},${offY + p4.y * scale}`,
              centerX: offX + (currentX + s_out / 2) * scale,
              centerY: offY + (baseY + h / 2) * scale
            })
            if (typeof maxTraps === 'number' && traps.length >= maxTraps) return traps
          }
        }

        // Columnas Verticales (Sobrante)
        if (vColumns > 0 && vRows > 0) {
          const offsetLeft = (s_out - s_in) / 2
          const rowStep = s_out - reduction + kerf.value
          for (let col = 0; col < vColumns; col++) {
            const baseX = usedWidth + col * hKerf
            let rowIndex = 0
            for (let pair = 0; pair < vPairs; pair++) {
              for (let inPair = 0; inPair < 2; inPair++) {
                const baseY = rowIndex * rowStep
                const inverted = (col + rowIndex) % 2 === 1
                const v1 = inverted ? { x: baseX, y: baseY + offsetLeft } : { x: baseX + h, y: baseY + offsetLeft }
                const v2 = inverted ? { x: baseX, y: baseY + offsetLeft + s_in } : { x: baseX + h, y: baseY + offsetLeft + s_in }
                const v3 = inverted ? { x: baseX + h, y: baseY + s_out } : { x: baseX, y: baseY + s_out }
                const v4 = inverted ? { x: baseX + h, y: baseY } : { x: baseX, y: baseY }
                traps.push({
                  points: `${offX + v1.x * scale},${offY + v1.y * scale} ${offX + v2.x * scale},${offY + v2.y * scale} ${offX + v3.x * scale},${offY + v3.y * scale} ${offX + v4.x * scale},${offY + v4.y * scale}`,
                  centerX: offX + (baseX + h / 2) * scale,
                  centerY: offY + (baseY + s_out / 2) * scale
                })
                if (typeof maxTraps === 'number' && traps.length >= maxTraps) return traps
                rowIndex++
              }
            }
            if (vExtra) {
              const baseY = rowIndex * rowStep
              const inverted = (col + rowIndex) % 2 === 1
              const v1 = inverted ? { x: baseX, y: baseY + offsetLeft } : { x: baseX + h, y: baseY + offsetLeft }
              const v2 = inverted ? { x: baseX, y: baseY + offsetLeft + s_in } : { x: baseX + h, y: baseY + offsetLeft + s_in }
              const v3 = inverted ? { x: baseX + h, y: baseY + s_out } : { x: baseX, y: baseY + s_out }
              const v4 = inverted ? { x: baseX + h, y: baseY } : { x: baseX, y: baseY }
              traps.push({
                points: `${offX + v1.x * scale},${offY + v1.y * scale} ${offX + v2.x * scale},${offY + v2.y * scale} ${offX + v3.x * scale},${offY + v3.y * scale} ${offX + v4.x * scale},${offY + v4.y * scale}`,
                centerX: offX + (baseX + h / 2) * scale,
                centerY: offY + (baseY + s_out / 2) * scale
              })
              if (typeof maxTraps === 'number' && traps.length >= maxTraps) return traps
            }
          }
        }
        return traps
      }
    }
  }

  // ---------------------------------------------------------
  // EVALUADOR PRINCIPAL: Elige la estrategia de mayor capacidad
  // Evalúa el material Normal y Material "Rotado" (swap L y W)
  // ---------------------------------------------------------
  function getOptimalStrategy(length: number, width: number): PackingStrategyResult {
    let best: PackingStrategyResult = { name: 'None', trapsPerSheet: 0, layoutBuilder: () => [] }
    if (!dims.value) return best

    // Ejecutar Estrategia Horizontal Normal
    const sH_Norm = strategyAlternatingHorizontal(length, width)
    if (sH_Norm.trapsPerSheet > best.trapsPerSheet) best = sH_Norm

    // Ejecutar Estrategia Horizontal "Rotada" (Intercambio de ejes lógicos de hoja)
    // El "Ancho" material pasa a ser la altura disponible, y viceversa
    const sH_Rot = strategyAlternatingHorizontal(width, length)
    if (sH_Rot.trapsPerSheet > best.trapsPerSheet) {
      best = {
        name: 'AlternatingH_Rotated90',
        trapsPerSheet: sH_Rot.trapsPerSheet,
        layoutBuilder: (matL, matW, scale, offX, offY, maxTraps) => {
          // Genera el layout usando matW como longitud y matL como ancho
          // Luego rota las coordenadas 90 grados alrededor del origen para que cuadre en el render
          const rawTraps = sH_Rot.layoutBuilder(matW, matL, scale, 0, 0, maxTraps)
          return rawTraps.map(trap => {
            // El layoutbuilder rotado asume una hoja de (matW x matL) local
            // Para dibujar en nuestro matL x matW global:
            // Un punto (x,y) rota a (y, matW - x) [o similar dependiendo del origen SVG]
            // Ya que SVG Y crece hacia abajo, para rotar +90: X_new = Y_old, Y_new = matW*scale - X_old
            const pointsStr = trap.points.split(' ').map(pt => {
              const [px, py] = pt.split(',').map(Number)
              const newX = offX + py
              const newY = offY + (matW * scale) - px
              return `${newX},${newY}`
            }).join(' ')
            
            // Centros
            const oldCX = trap.centerX
            const oldCY = trap.centerY
            const newCX = offX + oldCY
            const newCY = offY + (matW * scale) - oldCX
            
            return { points: pointsStr, centerX: newCX, centerY: newCY }
          })
        }
      }
    }

    return best
  }

  // ---------------------------------------------------------
  // INTERFAZ EXTERNA
  // ---------------------------------------------------------
  function calculateTrapezoidsPerSheet(materialLength: number, materialWidth: number): number {
    return getOptimalStrategy(materialLength, materialWidth).trapsPerSheet
  }

  const trapezoidsPerSheet = computed(() => {
    return getOptimalStrategy(sheetLength.value, sheetWidth.value).trapsPerSheet
  })

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

  function buildNestingLayout(
    materialLength: number,
    materialWidth: number,
    scale: number,
    maxTraps?: number
  ): TrapezoidPosition[] {
    const strategy = getOptimalStrategy(materialLength, materialWidth)
    // Offsets base:
    const offsetX = 20
    const offsetY = 20

    if (strategy.trapsPerSheet === 0) return []
    
    // Evaluará la función lambda ganadora
    return strategy.layoutBuilder(materialLength, materialWidth, scale, offsetX, offsetY, maxTraps)
  }

  function calculateOffcuts(
    layout: TrapezoidPosition[],
    sheetLength: number,
    sheetWidth: number,
    scale: number,
    offsetX = 20,
    offsetY = 20
  ): OffcutPolygon | null {
    if (layout.length === 0) {
      if (sheetLength >= 150 && sheetWidth >= 150) {
        const pts = [
          { x: 0, y: 0 },
          { x: sheetLength, y: 0 },
          { x: sheetLength, y: sheetWidth },
          { x: 0, y: sheetWidth }
        ]
        const pointsStr = pts.map(p => `${offsetX + p.x * scale},${offsetY + p.y * scale}`).join(' ')
        return {
          points: pointsStr,
          originalPoints: pts,
          area: sheetLength * sheetWidth
        }
      }
      return null
    }

    let globalMaxX = 0
    let globalMaxY = 0

    // Encontrar la caja delimitadora de todas las piezas colocadas
    for (const trap of layout) {
      const points = trap.points.split(' ')
      for (const pt of points) {
        const [px, py] = pt.split(',').map(Number)
        const unscaledX = (px - offsetX) / scale
        const unscaledY = (py - offsetY) / scale
        if (unscaledX > globalMaxX) globalMaxX = unscaledX
        if (unscaledY > globalMaxY) globalMaxY = unscaledY
      }
    }

    const rightWidth = sheetLength - globalMaxX
    const bottomHeight = sheetWidth - globalMaxY

    const rightValid = rightWidth >= 150
    const bottomValid = bottomHeight >= 150

    if (!rightValid && !bottomValid) {
      return null
    }

    let pts: {x: number, y: number}[] = []
    let area = 0

    if (rightValid && bottomValid) {
      // L-Shape
      pts = [
        { x: globalMaxX, y: 0 },
        { x: sheetLength, y: 0 },
        { x: sheetLength, y: sheetWidth },
        { x: 0, y: sheetWidth },
        { x: 0, y: globalMaxY },
        { x: globalMaxX, y: globalMaxY }
      ]
      area = (rightWidth * globalMaxY) + (sheetLength * bottomHeight)
    } else if (rightValid && !bottomValid) {
      // Solo el rectangulo derecho
      pts = [
        { x: globalMaxX, y: 0 },
        { x: sheetLength, y: 0 },
        { x: sheetLength, y: sheetWidth },
        { x: globalMaxX, y: sheetWidth }
      ]
      area = rightWidth * sheetWidth
    } else if (!rightValid && bottomValid) {
      // Solo el rectangulo inferior
      pts = [
        { x: 0, y: globalMaxY },
        { x: sheetLength, y: globalMaxY },
        { x: sheetLength, y: sheetWidth },
        { x: 0, y: sheetWidth }
      ]
      area = sheetLength * bottomHeight
    }
    
    const pointsStr = pts.map(p => `${offsetX + p.x * scale},${offsetY + p.y * scale}`).join(' ')

    return {
      points: pointsStr,
      originalPoints: pts,
      area
    }
  }

  return {
    trapezoidBoundingBox,
    trapezoidsPerSheet,
    calculateTrapezoidsPerSheet,
    computeCuttingScaleFor,
    buildNestingLayout,
    calculateOffcuts
  }
}
