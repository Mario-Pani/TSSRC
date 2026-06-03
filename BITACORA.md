# Bitácora del Proyecto TSSRC

## 2026-06-02

### Cambios realizados en esta actualización
- Refactor de arquitectura para separar responsabilidades de la vista principal.
- Extracción de lógica a composables:
  - useOrderWorkflow para captura, validaciones y cálculo.
  - useLayerAdmin para catálogo de combinaciones y modo administrador.
  - useAppShell para idioma, tema y navegación.
- Simplificación de App.vue para dejarla como orquestador de componentes.
- Consolidación de estructura modular ya existente en componentes y utilidades.

### Calidad y validación técnica
- Se configuró Vitest con entorno jsdom y setup global de pruebas.
- Se agregaron pruebas unitarias iniciales para:
  - useAppShell
  - useOrderWorkflow
  - useLayerAdmin
- Resultados actuales:
  - npm test en verde.
  - npm run build en verde.

### Decisiones funcionales relevantes
- La aplicación no tendrá integración técnica directa con SAP.
- El enfoque será integración operativa:
  - preparar datos consistentes para captura posterior en SAP.
  - generar salida clara para producción desde la misma fuente de datos.

### Ideas para la siguiente actualización
- Definir mapeo fijo de campos App a captura SAP (sin conexión directa).
- Agregar exportación de orden en formato CSV/Excel orientado a captura SAP.
- Incorporar estado de flujo por orden:
  - borrador
  - listo para SAP
  - capturado en SAP
  - liberado a producción
- Crear formato de hoja de producción imprimible desde la orden calculada.
- Extender pruebas a flujos integrados de componentes (captura + cálculo + combinaciones).
- Parametrizar catálogo de materiales y reglas en lugar de codificarlas rígidamente.

### Notas abiertas
- Aún hay dudas de negocio sobre materiales y flujo real de trabajo.
- Antes de endurecer reglas, validar proceso con casos reales de operación.
