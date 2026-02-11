# TSSRC - Trapezoid Segment Ring Cutting Calculator

Una aplicación profesional para calcular y visualizar trapezoides segmentados anulares usado en industria de corte y manufactura.

## 📋 Tabla de Contenidos

- [Características](#características)
- [Requisitos](#requisitos)
- [Instalación](#instalación)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Flujo de Datos](#flujo-de-datos)
- [Cálculos Principales](#cálculos-principales)
- [Testing](#testing)
- [Desarrollo](#desarrollo)

---

## ✨ Características

### 1. **Validación de Inputs**
- Validación en tiempo real con auto-corrección
- Mensajes de error descriptivos
- Advertencias para configuraciones problemáticas (gap radial < 25mm)
- Rangos dinámicos: ID (>0, <OD), OD (>0, >ID), TH (≥5mm), Anillos (1-24), Capas (3-8)

### 2. **Cálculos Geométricos**
- Determinación automática de número de lados (N) según OD
- Cálculo de dimensiones del trapecio (SL1, SL2, H1, ángulo de corte)
- Compensación de kerf de corte mediante coeficiente ajustable
- Origen: diámetro interno (ID) y externo (OD)

### 3. **Visualización**
- **SVG Responsivo**: Diagrama del trapecio escalable, colores codificados
- **Canvas 2D**: Vista previa de nesting y distribución de piezas
- **Chips informativos**: Muestra valores clave con códigos de color

### 4. **Análisis de Materiales**
- Cálculo de combinaciones de capas óptimas
- Desglose de material por espesor
- Estimación de desperdicio (waste %)
- Recomendaciones de layouts de corte

### 5. **Gestión de Materiales**
- Almacenamiento en localStorage
- Importar/exportar configuraciones
- Material library con espesores comunes

### 6. **Testing Completo**
- 58 tests unitarios (100% pasando)
- Cobertura de funciones críticas
- Tests de geometría y validación

---

## 🛠️ Requisitos

- **Node.js** 18+
- **npm** o **yarn**
- **Navegador moderno** (Chrome, Firefox, Safari, Edge)

---

## 📦 Instalación

```bash
# Clonar o descargar el proyecto
cd TSSRC

# Instalar dependencias
npm install

# Iniciar dev server (http://localhost:5174)
npm run dev

# Ejecutar tests
npm test                    # Modo watch
npm test -- --run          # Una sola ejecución

# Build para producción
npm run build
```

---

## 📁 Estructura del Proyecto

```
src/
├── App.vue                          # Componente principal
├── main.ts                          # Punto de entrada
├── style.css                        # Estilos globales
│
├── components/
│   ├── SVGTrapezoid.vue            # Diagrama responsivo del trapecio
│   ├── PreviewCanvas.vue           # Vista 2D con canvas
│   └── InputPanel.vue              # Panel de inputs
│
├── composables/
│   ├── useInputValidation.ts       # Lógica de validación
│   ├── useInputValidation.test.ts  # Tests (20 tests)
│   ├── useNestingCalculations.ts   # Cálculos de nesting
│   └── useCuttingBreakdown.ts      # Desglose de material
│
├── utils/
│   ├── geometry.ts                 # Funciones geométricas
│   ├── geometry.test.ts            # Tests (9 tests)
│   └── materials.ts                # Catálogo de materiales
│
└── plugins/
    └── vuetify.ts                  # Configuración UI
```

---

## 🔄 Flujo de Datos

```
┌─────────────────────────────────────────────────────────────┐
│                    USER INPUTS (Form)                       │
│  ID (mm) | OD (mm) | TH (mm) | Anillos | Capas | Coef %   │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│              VALIDACIÓN (useInputValidation)               │
│  • ID > 0 y < OD                                           │
│  • OD > 0 y > ID                                           │
│  • Gap Radial (OD-ID) ≥ 25mm                               │
│  • TH ≥ 5mm                                                │
│  • Anillos: 1-24, Capas: 3-8                               │
│  • Auto-corrección de valores inválidos                    │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────────────┐
│           CÁLCULOS GEOMÉTRICOS (geometry.ts)               │
│  • pickNByOD() → determina N lados                         │
│  • computeDims() → calcula SL1, SL2, H1, ángulo           │
│  • Compensación de kerf                                    │
└────────────────┬─────────────────────────────────────────────┘
                 │
                 ├──────────────────────┬──────────────────────┐
                 ▼                      ▼                      ▼
        ┌─────────────────┐    ┌──────────────────┐   ┌──────────────┐
        │  Visualización  │    │  Análisis Capas  │   │ Nesting Calc │
        │                 │    │                  │   │              │
        │ • SVGTrapezoid  │    │ • Combinaciones  │   │ • Piezas/hoja│
        │ • PreviewCanvas │    │   óptimas        │   │ • Desperdicio│
        │ • Chips valores │    │ • Desglose       │   │ • Recomend.  │
        └─────────────────┘    │   por espesor    │   └──────────────┘
                               └──────────────────┘
```

---

## 📐 Cálculos Principales

### **1. Determinación de Lados (N)**

```typescript
pickNByOD(OD: number): number
  OD < 1600mm  → N = 8  lados (octágono)
  OD ≥ 1600mm  → N = 16 lados (hexadecágono)
```

---

## 🧪 Testing

### **Cobertura de Tests**

| Módulo | Tests | Status |
|--------|-------|--------|
| **geometry.ts** | 9 tests | ✅ |
| **useInputValidation.ts** | 20 tests | ✅ |
| **TOTAL** | **58 tests** | ✅ 100% |

### **Ejecutar Tests**

```bash
npm test                   # Modo watch
npm test -- --run         # Una sola ejecución
```

---

## 👨‍💻 Desarrollo

### **Stack Tecnológico**

- **Vue 3** - Reactivity framework
- **TypeScript** - Type safety
- **Vuetify 3** - UI Components
- **Vite** - Build tool
- **Vitest** - Testing framework

### **Convenciones de Código**

#### **Nombres de Variables (Inglés)**
```typescript
// Inputs
ID: number        // Internal Diameter
OD: number        // External Diameter
TH: number        // Thickness
ringCount: number // Number of rings
layers: number    // Number of layers

// Outputs
N: number         // Number of sides
SL1: number       // Side Length 1 (short)
SL2: number       // Side Length 2 (long)
H1: number        // Height
A1: number        // Angle of cut
```

#### **Colores en SVG**
```typescript
#0288d1  → Azul   (SL1)
#c96562  → Rojo   (SL2)
#38c48c  → Verde  (H1)
#ff6f00  → Naranja (A1)
```

---

## 🚀 Mejoras Completadas

1. ✅ **Validación de Inputs** - Auto-corrección automática
2. ✅ **Tests Unitarios** - 58 tests, 100% pasando
3. ✅ **SVG Responsivo** - Adaptable a cualquier pantalla
4. ✅ **Documentación Completa** - JSDoc, README, comentarios inline
5. ⏳ **Performance Optimization** - Próximas mejoras
6. ⏳ **Persistencia de Estado** - Próximas mejoras

---

## 📄 Licencia

Privado - Uso interno
