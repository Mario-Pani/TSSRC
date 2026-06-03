import type { CalculationResult, LayerCombination, LayerDraft, LayerStackItem } from '../types'

export const LAYER_COMBINATIONS_KEY = 'layer-combinations'
export const LAYER_ADMIN_PIN = '2406'

export function defaultLayerCombinations(): LayerCombination[] {
  const now = new Date().toISOString()
  const rows: Array<[number, string, number, number]> = [
    [6, '2+3+2', 3, 7],
    [7, '3+2+3', 3, 8],
    [8, '3+3+3', 3, 9],
    [9, '3+4+3', 3, 10],
    [10, '3+5+3', 3, 11],
    [11, '4+4+4', 3, 12],
    [12, '4+5+4', 3, 13],
    [13, '5+4+5', 3, 14],
    [14, '5+5+5', 3, 15],
    [15, '2+4+4+4+2', 5, 16],
    [16, '3+4+3+4+3', 5, 17],
    [17, '3+4+4+4+3', 5, 18],
    [18, '3+4+5+4+3', 5, 19],
    [19, '3+5+4+5+3', 5, 20],
    [20, '3+5+5+5+3', 5, 21],
    [21, '4+5+4+5+4', 5, 22],
    [22, '4+5+5+5+4', 5, 23],
    [23, '5+14+5', 3, 24],
    [24, '3+4+11+4+3', 5, 25],
    [25, '3+5+10+5+3', 5, 26],
    [26, '3+5+11+5+3', 5, 27],
    [27, '3+4+14+4+3', 5, 28],
    [28, '4+5+11+5+4', 5, 29],
    [29, '3+5+14+5+3', 5, 30],
    [30, '4+5+13+5+4', 5, 31],
    [31, '4+5+14+5+4', 5, 32],
    [32, '11+11+11', 3, 33],
    [33, '3+5+18+5+3', 5, 34],
    [34, '10+14+10', 3, 34],
    [35, '11+13+11', 3, 35],
    [36, '2+10+11+11+2', 5, 36],
    [37, '2+11+11+11+2', 5, 37],
    [38, '3+10+11+11+3', 5, 38],
    [39, '3+11+11+11+3', 5, 39],
    [40, '4+10+11+11+4', 5, 40],
    [41, '13+14+14', 3, 41],
    [42, '5+10+11+11+5', 5, 42],
    [43, '4+11+13+11+4', 5, 43],
    [44, '4+11+14+11+4', 5, 44],
    [45, '5+11+13+11+5', 5, 45],
    [46, '2+14+14+14+2', 5, 46],
    [47, '3+13+14+14+3', 5, 47],
    [48, '3+14+14+14+3', 5, 48],
    [49, '4+13+14+14+4', 5, 49],
    [50, '4+14+14+14+4', 5, 50],
    [51, '5+13+14+14+5', 5, 51],
    [52, '3+14+18+14+3', 5, 52],
    [53, '3+14+19+14+3', 5, 53],
    [54, '4+14+18+14+4', 5, 54],
    [55, '11+33+11', 3, 55],
    [56, '5+14+18+14+5', 5, 56],
    [57, '5+14+19+14+5', 5, 57],
    [58, '2+10+34+10+2', 5, 58],
    [59, '2+11+33+11+2', 5, 59],
    [60, '14+32+14', 3, 60],
    [61, '13+34+14', 3, 61],
    [62, '10+14+14+14+10', 5, 62],
    [63, '10+14+14+14+11', 5, 63],
    [64, '4+11+34+11+4', 5, 64],
    [65, '5+11+33+11+5', 5, 65],
    [66, '2+14+34+14+2', 5, 66],
    [67, '3+14+33+14+3', 5, 67],
    [68, '10+14+19+14+11', 5, 68],
    [69, '4+14+33+14+4', 5, 69],
    [70, '4+14+34+14+4', 5, 70],
    [71, '5+14+33+14+5', 5, 71],
    [72, '5+14+34+14+5', 5, 72],
    [73, '2+19+33+19', 4, 73],
    [74, '2+19+34+19', 4, 74],
    [75, '2+19+33+19+2', 5, 75],
    [76, '2+19+34+19+2', 5, 76],
    [77, '3+19+33+19+3', 5, 77],
    [78, '10+19+19+19+11', 5, 78],
    [79, '4+19+33+19+4', 5, 79],
    [80, '4+19+34+19+4', 5, 80]
  ]

  return rows.map(([thickness, combination, layerCount, finalThickness]) => ({
    id: `L-${thickness}`,
    thickness,
    combination,
    layerCount,
    finalThickness,
    active: true,
    updatedAt: now,
    updatedBy: 'system'
  }))
}

export function normalizeLayerCombinations(raw: unknown): LayerCombination[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((entry) => {
      if (typeof entry !== 'object' || entry === null) return null
      const row = entry as Partial<LayerCombination>
      if (
        typeof row.id !== 'string' ||
        typeof row.thickness !== 'number' ||
        typeof row.combination !== 'string' ||
        typeof row.layerCount !== 'number' ||
        typeof row.finalThickness !== 'number' ||
        typeof row.active !== 'boolean' ||
        typeof row.updatedAt !== 'string' ||
        typeof row.updatedBy !== 'string'
      ) {
        return null
      }
      return row as LayerCombination
    })
    .filter((row): row is LayerCombination => row !== null)
}

export function loadLayerCombinations(): LayerCombination[] {
  const defaults = defaultLayerCombinations()
  try {
    const raw = localStorage.getItem(LAYER_COMBINATIONS_KEY)
    if (!raw) return defaults
    const parsed = JSON.parse(raw)
    const normalized = normalizeLayerCombinations(parsed)
    if (normalized.length === 0) return defaults

    const existingThicknesses = new Set(normalized.map((row) => row.thickness))
    const missingDefaults = defaults.filter((row) => !existingThicknesses.has(row.thickness))

    if (missingDefaults.length === 0) return normalized

    const merged = [...normalized, ...missingDefaults]
    localStorage.setItem(LAYER_COMBINATIONS_KEY, JSON.stringify(merged))
    return merged
  } catch {
    return defaults
  }
}

export function saveLayerCombinations(layerCombinations: LayerCombination[]) {
  localStorage.setItem(LAYER_COMBINATIONS_KEY, JSON.stringify(layerCombinations))
}

export function parseLayerCombination(raw: string): number[] | null {
  const compact = raw.replace(/\s+/g, '')
  if (!compact) return null
  if (!/^\d+(\+\d+)*$/.test(compact)) return null
  const numbers = compact.split('+').map((part) => Number(part))
  if (numbers.some((value) => !Number.isInteger(value) || value <= 0)) return null
  return numbers
}

export function sortLayerCombinations(layerCombinations: LayerCombination[]) {
  return [...layerCombinations].sort((a, b) => a.thickness - b.thickness)
}

export function selectLayerCombination(
  calculationResult: CalculationResult | null,
  sortedLayerCombinations: LayerCombination[],
) {
  if (!calculationResult) return null

  const targetThickness = calculationResult.thN
  const covering = sortedLayerCombinations.find((row) => row.active && row.finalThickness >= targetThickness)
  if (covering) return covering

  return [...sortedLayerCombinations].reverse().find((row) => row.active) ?? null
}

export function createLayerStackItems(selectedLayerCombination: LayerCombination | null): LayerStackItem[] {
  if (!selectedLayerCombination) return []
  const parts = parseLayerCombination(selectedLayerCombination.combination)
  if (!parts) return []
  return parts.map((value, index) => ({ index: index + 1, thickness: value }))
}

export function validateLayerDraft(
  layerDraft: LayerDraft,
  layerCombinations: LayerCombination[],
  editingLayerId: string | null,
) {
  const errors: string[] = []
  const thickness = Number(layerDraft.thickness)
  const layerCount = Number(layerDraft.layerCount)
  const finalThickness = Number(layerDraft.finalThickness)
  const segments = parseLayerCombination(layerDraft.combination)

  if (!Number.isFinite(thickness) || thickness <= 0) errors.push('Espesor objetivo debe ser mayor a 0.')
  if (!segments) errors.push('Combinacion invalida. Usa formato 3+4+5+4+3.')
  if (!Number.isInteger(layerCount) || layerCount <= 0) errors.push('Numero de capas debe ser entero mayor a 0.')
  if (segments && Number.isInteger(layerCount) && segments.length !== layerCount) {
    errors.push('Numero de capas no coincide con la combinacion.')
  }
  if (!Number.isFinite(finalThickness) || finalThickness <= 0) errors.push('Espesor final debe ser mayor a 0.')

  const duplicated = layerCombinations.some((row) => {
    if (editingLayerId && row.id === editingLayerId) return false
    return row.thickness === thickness
  })
  if (Number.isFinite(thickness) && duplicated) errors.push('Ya existe una combinacion para ese espesor objetivo.')

  return errors
}

export function buildLayerCombinationDraft(row: LayerCombination): LayerDraft {
  return {
    thickness: String(row.thickness),
    combination: row.combination,
    layerCount: String(row.layerCount),
    finalThickness: String(row.finalThickness)
  }
}

export function buildSavedLayerCombination(
  layerDraft: LayerDraft,
  editingLayerId: string | null,
  username: string,
): LayerCombination {
  return {
    id: editingLayerId ?? `L-${Date.now()}`,
    thickness: Number(layerDraft.thickness),
    combination: layerDraft.combination.replace(/\s+/g, ''),
    layerCount: Number(layerDraft.layerCount),
    finalThickness: Number(layerDraft.finalThickness),
    active: true,
    updatedAt: new Date().toISOString(),
    updatedBy: username
  }
}

export function formatLayerTimestamp(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return date.toLocaleString()
}