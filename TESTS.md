# Tests Unitarios - Documentación

## Resumen

Este proyecto implementa **58 tests unitarios** para validar las funciones críticas de la aplicación.

### Estadísticas
- **Test Files**: 4
- **Tests Totales**: 58
- **Status**: ✅ Todos pasando
- **Tiempo de ejecución**: ~3.2s

---

## Estructura de Tests

### 1. `src/utils/geometry.test.ts` (9 tests)

Valida funciones geométricas críticas para el cálculo del trapecio.

#### `pickNByOD()`
- ✅ Retorna 8 lados para OD < 1600mm
- ✅ Retorna 16 lados para OD ≥ 1600mm

#### `computeDims()`
- ✅ Calcula dimensiones correctas con inputs válidos
- ✅ Aplica corrección de coeficiente
- ✅ Lanza error si ID <= 0
- ✅ Lanza error si OD <= 0
- ✅ Lanza error si OD <= ID
- ✅ Lanza error si coeficiente inválido
- ✅ Calcula altura correctamente

#### `polygonVertices()`
- ✅ Retorna N vértices para N lados
- ✅ Vértices están a distancia correcta del centro

### 2. `src/composables/useInputValidation.test.ts` (20 tests)

Valida el composable `useInputValidation` que maneja toda la lógica de validación.

#### `validateID()`
- ✅ No muestra error si ID es válido
- ✅ Auto-corrige y marca error si ID <= 0
- ✅ Marca error si ID >= OD

#### `validateOD()`
- ✅ No muestra error si OD es válido
- ✅ Auto-corrige y marca error si OD <= 0
- ✅ Marca error si OD <= ID

#### `validateRadialGap()` (RB "Radial Build")
- ✅ No muestra advertencia si RB >= 25mm
- ✅ Muestra advertencia si RB < 25mm
- ✅ Muestra valor exacto del RB en advertencia

#### `validateTH()`
- ✅ No muestra error si TH >= 5mm
- ✅ Auto-corrige y marca error si TH < 5mm
- ✅ Auto-corrige valor negativo

#### `validateRingCount()`
- ✅ Válido para rango [1, 24]
- ✅ Auto-corrige si < 1
- ✅ Auto-corrige si > 24

#### `validateLayers()`
- ✅ Válido para rango [3, 8]
- ✅ Auto-corrige si < 3
- ✅ Auto-corrige si > 8
- ✅ Auto-corrige valores extremos

---

## Ejecutar Tests

```bash
# Ejecutar tests una sola vez
npm test -- --run

# Ejecutar tests en modo watch (recarga automática)
npm test

# Ejecutar tests con cobertura
npm test -- --run --coverage
```

---

## Integración en la Aplicación

El composable `useInputValidation` se integra en **App.vue**:

```typescript
import { useInputValidation } from './composables/useInputValidation'

const {
  idError, odError, thError, ringCountError, layersError,
  idErrorMsg, odErrorMsg, thErrorMsg, ringCountErrorMsg, layersErrorMsg,
  validateID, validateOD, validateTH, validateRingCount, validateLayers
} = useInputValidation()

// Watchers para validación en tiempo real
watch(ID, () => validateID(ID, OD))
watch(OD, () => validateOD(ID, OD))
watch(TH, () => validateTH(TH))
watch(ringCount, () => validateRingCount(ringCount))
watch(layers, () => validateLayers(layers))
```

---

## Auto-corrección

La validación implementa **auto-corrección** automática:

| Campo | Regla | Corrección |
|-------|-------|-----------|
| ID | > 0 y < OD | Se corrige a 100 si <= 0 |
| OD | > 0 y > ID | Se corrige a 2000 si <= 0 |
| TH | >= 5mm | Se corrige a 5 si < 5 |
| ringCount | 1-24 | Se corrige al límite más cercano |
| layers | 3-8 | Se corrige al límite más cercano |

---

## Beneficios

✅ **Confianza en cambios**: Los tests validan funciones críticas  
✅ **Documentación viva**: Los tests documentan el comportamiento esperado  
✅ **Detección temprana**: Errores descubiertos antes de producción  
✅ **Refactorización segura**: Cambiar código sabiendo que funciona  
✅ **Código reutilizable**: El composable es testeable y fácil de mantener  

---

## Próximos Pasos

Mejoras futuras podrían incluir:
- Tests para componentes Vue (PreviewCanvas, InputPanel)
- Tests de integración para flujos completos integrando los recortes de stock tipo 2 
- Tests de rendimiento para cálculos geométricos
- Cobertura de casos edge adicionales
