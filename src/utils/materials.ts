export interface Material {
  thickness: number
  length: number
  width: number
  inStock?: boolean
}

export const availableMaterials: Material[] = [
  { thickness: 1, length: 6300, width: 3200 },
{ thickness: 1, length: 3200, width: 2108 },
{ thickness: 1, length: 6300, width: 2440 },
{ thickness: 1, length: 3150, width: 3200 },
{ thickness: 1, length: 3556, width: 1600 },
{ thickness: 1, length: 4191, width: 1270 },
{ thickness: 1, length: 4191, width: 1930 },
{ thickness: 1.4, length: 3200, width: 2108 },
{ thickness: 1.5, length: 2100, width: 1065 },
{ thickness: 1.5, length: 3200, width: 2108 },
{ thickness: 1.5, length: 4191, width: 2108 },
{ thickness: 1.6, length: 2100, width: 1065 },
{ thickness: 1.6, length: 3200, width: 3150 },
{ thickness: 1.6, length: 3000, width: 2450 },
{ thickness: 1.6, length: 3200, width: 2108 },
{ thickness: 1.6, length: 6300, width: 2440 },
{ thickness: 1.6, length: 4400, width: 2550 },
{ thickness: 1.6, length: 4191, width: 2438 },
{ thickness: 2, length: 3200, width: 3150 },
{ thickness: 2, length: 3200, width: 2108 },
{ thickness: 2, length: 6300, width: 2440 },
{ thickness: 2, length: 4191, width: 2438 },
{ thickness: 2.4, length: 3000, width: 2450 },
{ thickness: 2.4, length: 3200, width: 2108 },
{ thickness: 2.4, length: 6300, width: 2440 },
{ thickness: 2.4, length: 2550, width: 1900 },
{ thickness: 2.4, length: 4400, width: 2550 },
{ thickness: 2.4, length: 4191, width: 2438 },
{ thickness: 2.5, length: 3200, width: 2108 },
{ thickness: 2.8, length: 3200, width: 2108 },
{ thickness: 3, length: 3200, width: 3150 },
{ thickness: 3, length: 3200, width: 2108 },
{ thickness: 3, length: 6300, width: 2440 },
{ thickness: 3, length: 4191, width: 2108 },
{ thickness: 3.2, length: 2100, width: 1065 },
{ thickness: 3.2, length: 3200, width: 3150 },
{ thickness: 3.2, length: 3000, width: 2450 },
{ thickness: 3.2, length: 3200, width: 2108 },
{ thickness: 3.2, length: 6300, width: 2440 },
{ thickness: 3.2, length: 4191, width: 3200 },
{ thickness: 3.2, length: 4400, width: 2550 },
{ thickness: 3.2, length: 4191, width: 2438 },
{ thickness: 4, length: 3200, width: 2108 },
{ thickness: 4, length: 6300, width: 2440 },
{ thickness: 4.8, length: 2100, width: 1065 },
{ thickness: 4.8, length: 2100, width: 1600 },
{ thickness: 4.8, length: 3150, width: 1600 },
{ thickness: 4.8, length: 3200, width: 3150 },
{ thickness: 4.8, length: 6300, width: 3200 },
{ thickness: 4.8, length: 3000, width: 2450 },
{ thickness: 4.8, length: 3200, width: 2108 },
{ thickness: 4.8, length: 6300, width: 2440 },
{ thickness: 4.8, length: 4191, width: 3200 },
{ thickness: 5, length: 3200, width: 2108 },
{ thickness: 5, length: 6300, width: 2440 },
{ thickness: 5, length: 4191, width: 2184 },
{ thickness: 5.5, length: 3200, width: 2108 },
{ thickness: 5.5, length: 6300, width: 2440 },
{ thickness: 6, length: 3200, width: 2108 },
{ thickness: 6, length: 3150, width: 762 },
{ thickness: 6, length: 5080, width: 2795 },
{ thickness: 6, length: 6300, width: 2440 },
{ thickness: 6, length: 4191, width: 2108 },
{ thickness: 6.4, length: 2100, width: 1065 },
{ thickness: 6.4, length: 3200, width: 3150 },
{ thickness: 6.4, length: 3200, width: 2108 },
{ thickness: 6.4, length: 3150, width: 762 },
{ thickness: 6.4, length: 6300, width: 2440 },
{ thickness: 6.4, length: 4191, width: 3200 },
{ thickness: 7, length: 6300, width: 3200 },
{ thickness: 7, length: 3200, width: 2108 },
{ thickness: 7, length: 6300, width: 2440 },
{ thickness: 8, length: 3200, width: 2108 },
]

let defaultMaterialsCache: Material[] | null = null

export function getDefaultMaterials(): Material[] {
  if (!defaultMaterialsCache) {
    defaultMaterialsCache = availableMaterials.map((m) => ({ ...m, inStock: true }))
  }

  return defaultMaterialsCache.map((m) => ({ ...m }))
}
