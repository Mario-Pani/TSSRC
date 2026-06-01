<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import usFlag from './assets/flags/us.svg'
import mxFlag from './assets/flags/mx.svg'
import hrFlag from './assets/flags/hr.svg'

type LanguageCode = 'US' | 'MX' | 'HVR'
type FieldKey = 'salesOrder' | 'position' | 'id' | 'od' | 'th' | 'quantity'
type ThemeMode = 'light' | 'dark'
type FieldValidation = { errors: string[]; warnings: string[] }
type OrderItem = {
  salesOrder: string
  position: string
  id: string
  od: string
  th: string
  quantity: string
}

const STORAGE_KEY = 'app-language'
const THEME_STORAGE_KEY = 'app-theme'
const language = ref<LanguageCode>((localStorage.getItem(STORAGE_KEY) as LanguageCode) || 'US')
const prefersDark = typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches
const theme = ref<ThemeMode>((localStorage.getItem(THEME_STORAGE_KEY) as ThemeMode) || (prefersDark ? 'dark' : 'light'))

const copy: Record<LanguageCode, {
  brand: string
  nav: string[]
  newItem: string
  saveItem: string
  calculate: string
  calculationTitle: string
  shrinkage: string
  tolerance: string
  noItemsForCalculation: string
  alertsConfirmTitle: string
  orderItemsTitle: string
  emptyOrderItems: string
  actions: string
  edit: string
  delete: string
  labels: {
    ID: string
    OD: string
    TH: string
    quantity: string
    salesOrder: string
    position: string
  }
  themeDark: string
  themeLight: string
  selectorLabel: string
}> = {
  US: {
    brand: 'TSSRC — Trapezoidal Segmented Static Ring Core',
    nav: ['Inicio', 'Tab2', 'Tab3'],
    newItem: 'New item',
    saveItem: 'Save item',
    calculate: 'Calculate',
    calculationTitle: 'Calculation',
    shrinkage: 'Shrinkage (%)',
    tolerance: 'Tolerance (%)',
    noItemsForCalculation: 'Add at least one item before calculating.',
    alertsConfirmTitle: 'Alerts detected. Continue anyway?',
    orderItemsTitle: 'Items in current sales order',
    emptyOrderItems: 'No items added yet.',
    actions: 'Actions',
    edit: 'Edit',
    delete: 'Delete',
    labels: {
      ID: 'ID',
      OD: 'OD',
      TH: 'TH',
      quantity: 'Quantity',
      salesOrder: 'Sales Order',
      position: 'Pos.'
    },
    themeDark: 'Dark',
    themeLight: 'Light',
    selectorLabel: 'Language'
  },
  MX: {
    brand: 'TSSRC — Trapezoidal Segmented Static Ring Core',
    nav: ['Inicio', 'Tab2', 'Tab3'],
    newItem: 'Nuevo item',
    saveItem: 'Guardar item',
    calculate: 'Calcular',
    calculationTitle: 'Calculo',
    shrinkage: 'Encogimiento (%)',
    tolerance: 'Tolerancia (%)',
    noItemsForCalculation: 'Agrega al menos un item antes de calcular.',
    alertsConfirmTitle: 'Se detectaron alertas. Deseas continuar?',
    orderItemsTitle: 'Items de la orden de venta actual',
    emptyOrderItems: 'Aun no hay items cargados.',
    actions: 'Acciones',
    edit: 'Editar',
    delete: 'Eliminar',
    labels: {
      ID: 'ID',
      OD: 'OD',
      TH: 'TH',
      quantity: 'Cantidad',
      salesOrder: 'Orden de Venta',
      position: 'Pos.'
    },
    themeDark: 'Oscuro',
    themeLight: 'Claro',
    selectorLabel: 'Idioma'
  },
  HVR: {
    brand: 'TSSRC — Trapezoidal Segmented Static Ring Core',
    nav: ['Inicio', 'Tab2', 'Tab3'],
    newItem: 'Novi item',
    saveItem: 'Spremi stavku',
    calculate: 'Izracunaj',
    calculationTitle: 'Izracun',
    shrinkage: 'Skupljanje (%)',
    tolerance: 'Tolerancija (%)',
    noItemsForCalculation: 'Dodaj barem jednu stavku prije izracuna.',
    alertsConfirmTitle: 'Otkrivene su upozorbe. Zelis li nastaviti?',
    orderItemsTitle: 'Stavke trenutnog prodajnog naloga',
    emptyOrderItems: 'Jos nema dodanih stavki.',
    actions: 'Radnje',
    edit: 'Uredi',
    delete: 'Obrisi',
    labels: {
      ID: 'ID',
      OD: 'OD',
      TH: 'TH',
      quantity: 'Kolicina',
      salesOrder: 'Prodajni nalog',
      position: 'Poz.',
    },
    themeDark: 'Tamno',
    themeLight: 'Svijetlo',
    selectorLabel: 'Jezik'
  }
}

const t = computed(() => copy[language.value])
const languageOptions: Array<{ code: LanguageCode; label: string; flagSrc: string }> = [
  { code: 'US', label: 'United States', flagSrc: usFlag },
  { code: 'MX', label: 'Mexico', flagSrc: mxFlag },
  { code: 'HVR', label: 'Hrvatski', flagSrc: hrFlag }
]

const inputData = ref({
  id: '',
  od: '',
  th: '',
  quantity: '',
  salesOrder: '',
  position: ''
})
const orderItems = ref<OrderItem[]>([])
const editingItemIndex = ref<number | null>(null)
const touched = ref<Record<FieldKey, boolean>>({
  salesOrder: false,
  position: false,
  id: false,
  od: false,
  th: false,
  quantity: false
})
const level2Shrinkage = ref(0)
const level2Tolerance = ref(5)
const calculationVisible = ref(false)

const activeTab = ref('Inicio')

function isPositiveNumber(raw: string): boolean {
  const value = Number(raw)
  return Number.isFinite(value) && value > 0
}

function isPositiveInteger(raw: string): boolean {
  const value = Number(raw)
  return Number.isInteger(value) && value > 0
}

function fieldState(key: FieldKey): 'empty' | 'ok' | 'warn' {
  const value = inputData.value[key].trim()
  if (!value) return 'empty'

  if (validation.value[key].errors.length > 0) return 'warn'

  if (validation.value[key].warnings.length > 0) return 'warn'

  if (key === 'id' || key === 'od' || key === 'th') {
    return isPositiveNumber(value) ? 'ok' : 'warn'
  }

  if (key === 'quantity') {
    return isPositiveInteger(value) ? 'ok' : 'warn'
  }

  return 'ok'
}

function parseNumber(raw: string): number | null {
  const cleaned = raw.replace(',', '.').trim()
  if (!cleaned) return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

function parseIntStrict(raw: string): number | null {
  const trimmed = raw.trim()
  if (!/^\d+$/.test(trimmed)) return null
  const value = Number(trimmed)
  return Number.isInteger(value) ? value : null
}

const validation = computed<Record<FieldKey, FieldValidation>>(() => {
  const result: Record<FieldKey, FieldValidation> = {
    salesOrder: { errors: [], warnings: [] },
    position: { errors: [], warnings: [] },
    id: { errors: [], warnings: [] },
    od: { errors: [], warnings: [] },
    th: { errors: [], warnings: [] },
    quantity: { errors: [], warnings: [] }
  }

  const salesOrder = inputData.value.salesOrder.trim()
  const position = inputData.value.position.trim()
  const idRaw = inputData.value.id.trim()
  const odRaw = inputData.value.od.trim()
  const thRaw = inputData.value.th.trim()
  const quantityRaw = inputData.value.quantity.trim()

  if (!salesOrder) {
    result.salesOrder.errors.push('Orden de venta es requerida.')
  } else if (!/^\d+$/.test(salesOrder)) {
    result.salesOrder.errors.push('Orden de venta debe ser numerica entera.')
  }

  if (!position) {
    result.position.errors.push('POS es requerida.')
  } else if (!/^\d+$/.test(position)) {
    result.position.errors.push('POS debe ser numerica entera.')
  } else {
    const duplicatePos = orderItems.value.some((item, index) =>
      index !== editingItemIndex.value && item.position === position
    )
    if (duplicatePos) {
      result.position.errors.push('POS debe ser unica dentro de la orden.')
    }
  }

  const idValue = parseNumber(idRaw)
  const odValue = parseNumber(odRaw)
  const thValue = parseNumber(thRaw)
  const quantityValue = parseIntStrict(quantityRaw)

  if (!idRaw) {
    result.id.errors.push('ID es requerido.')
  } else if (idValue === null) {
    result.id.errors.push('ID debe ser numerico decimal.')
  }

  if (!odRaw) {
    result.od.errors.push('OD es requerido.')
  } else if (odValue === null) {
    result.od.errors.push('OD debe ser numerico decimal.')
  }

  if (idValue !== null && odValue !== null && idValue >= odValue) {
    result.id.errors.push('ID debe ser menor que OD.')
    result.od.errors.push('OD debe ser mayor que ID.')
  }

  if (idValue !== null && idValue < 400) {
    result.id.warnings.push('ID menor a 400: alerta de calidad (no bloqueante).')
  }

  if (odValue !== null && odValue > 3000) {
    result.od.warnings.push('OD mayor a 3000: alerta de calidad (no bloqueante).')
  }

  if (!thRaw) {
    result.th.errors.push('TH es requerido.')
  } else if (thValue === null) {
    result.th.errors.push('TH debe ser numerico decimal.')
  } else if (thValue < 6 || thValue > 80) {
    result.th.warnings.push('TH fuera de 6-80 mm: posible compromiso de durabilidad/fabricacion.')
  }

  if (!quantityRaw) {
    result.quantity.errors.push('Cantidad es requerida.')
  } else if (quantityValue === null) {
    result.quantity.errors.push('Cantidad debe ser numerica entera.')
  } else if (quantityValue < 1) {
    result.quantity.errors.push('Cantidad debe ser minimo 1.')
  }

  if (idValue !== null && odValue !== null) {
    const hasOverlap = orderItems.value.some((item, index) => {
      if (index === editingItemIndex.value) return false
      const itemId = parseNumber(item.id)
      const itemOd = parseNumber(item.od)
      if (itemId === null || itemOd === null) return false
      const intersectsOrTouches = idValue <= itemOd && odValue >= itemId
      return intersectsOrTouches
    })

    if (hasOverlap) {
      result.id.errors.push('El anillo se empalma o superpone con otro item de la orden.')
      result.od.errors.push('El anillo se empalma o superpone con otro item de la orden.')
    }
  }

  return result
})

const canAddItem = computed(() => {
  return (Object.keys(validation.value) as FieldKey[])
    .every((key) => validation.value[key].errors.length === 0)
})

const salesOrderLocked = computed(() => orderItems.value.length > 0 || editingItemIndex.value !== null)
const thLocked = computed(() => orderItems.value.length > 0)

function clearEntryFieldsKeepTH() {
  inputData.value.position = ''
  inputData.value.id = ''
  inputData.value.od = ''
  inputData.value.quantity = ''
}

function addNewItem() {
  ;(Object.keys(touched.value) as FieldKey[]).forEach((key) => {
    touched.value[key] = true
  })
  if (!canAddItem.value) return

  const baseOrder = orderItems.value[0]?.salesOrder ?? inputData.value.salesOrder.trim()
  const baseTH = orderItems.value[0]?.th ?? inputData.value.th.trim()
  const nextItem: OrderItem = {
    salesOrder: baseOrder,
    position: inputData.value.position.trim(),
    id: inputData.value.id.trim(),
    od: inputData.value.od.trim(),
    th: baseTH,
    quantity: inputData.value.quantity.trim()
  }

  if (editingItemIndex.value !== null) {
    orderItems.value[editingItemIndex.value] = nextItem
    editingItemIndex.value = null
  } else {
    orderItems.value.push(nextItem)
  }

  inputData.value.salesOrder = baseOrder
  inputData.value.th = baseTH
  clearEntryFieldsKeepTH()
  touched.value.position = false
  touched.value.id = false
  touched.value.od = false
  touched.value.quantity = false
}

function editItem(index: number) {
  const item = orderItems.value[index]
  if (!item) return

  editingItemIndex.value = index
  inputData.value.salesOrder = item.salesOrder
  inputData.value.position = item.position
  inputData.value.id = item.id
  inputData.value.od = item.od
  inputData.value.th = item.th
  inputData.value.quantity = item.quantity
}

function deleteItem(index: number) {
  if (index < 0 || index >= orderItems.value.length) return

  orderItems.value.splice(index, 1)

  if (editingItemIndex.value === index) {
    editingItemIndex.value = null
    clearEntryFieldsKeepTH()
  } else if (editingItemIndex.value !== null && index < editingItemIndex.value) {
    editingItemIndex.value -= 1
  }

  if (orderItems.value.length === 0 && editingItemIndex.value === null) {
    inputData.value.salesOrder = ''
    inputData.value.th = ''
  }
}

function markTouched(key: FieldKey) {
  touched.value[key] = true
}

function fieldMessages(key: FieldKey): string[] {
  if (!touched.value[key]) return []
  return [...validation.value[key].errors, ...validation.value[key].warnings]
}

const level2Warnings = computed(() => {
  const warnings: string[] = []
  const ids = orderItems.value.map((item) => parseNumber(item.id)).filter((v): v is number => v !== null)
  const ods = orderItems.value.map((item) => parseNumber(item.od)).filter((v): v is number => v !== null)
  const ths = orderItems.value.map((item) => parseNumber(item.th)).filter((v): v is number => v !== null)

  if (ids.some((value) => value < 400)) warnings.push('Hay items con ID menor a 400.')
  if (ods.some((value) => value > 3000)) warnings.push('Hay items con OD mayor a 3000.')
  if (ths.some((value) => value < 6 || value > 80)) warnings.push('Hay items con TH fuera del rango 6-80 mm.')

  if (!Number.isFinite(level2Shrinkage.value) || level2Shrinkage.value < 0 || level2Shrinkage.value > 16) {
    warnings.push('Encogimiento debe estar entre 0 y 16%.')
  }
  if (!Number.isFinite(level2Tolerance.value) || level2Tolerance.value < 0 || level2Tolerance.value > 10) {
    warnings.push('Tolerancia debe estar entre 0 y 10%.')
  }

  return warnings
})

const calculationResult = computed(() => {
  if (orderItems.value.length === 0) return null

  const ids = orderItems.value.map((item) => parseNumber(item.id)).filter((v): v is number => v !== null)
  const ods = orderItems.value.map((item) => parseNumber(item.od)).filter((v): v is number => v !== null)
  const quantities = orderItems.value.map((item) => parseIntStrict(item.quantity)).filter((v): v is number => v !== null)
  if (ids.length === 0 || ods.length === 0 || quantities.length === 0) return null

  const idMin = Math.min(...ids)
  const odMax = Math.max(...ods)
  const segments = odMax <= 1600 ? 8 : 16
  const angleCutDeg = 180 / segments
  const ri = idMin / 2
  const ro = odMax / 2
  const ss = 2 * ri * Math.sin(Math.PI / segments)
  const sl = 2 * ro * Math.sin(Math.PI / segments)
  const h = ro - ri * Math.cos(Math.PI / segments)
  const rb = (odMax - idMin) / 2
  const qtyTotal = quantities.reduce((acc, value) => acc + value, 0)
  const nTotal = segments * qtyTotal

  const shrinkPct = Number.isFinite(level2Shrinkage.value) ? level2Shrinkage.value : 0
  const tolerancePct = Number.isFinite(level2Tolerance.value) ? level2Tolerance.value : 5
  const factor = 1 + shrinkPct / 100
  const toleranceFactor = tolerancePct / 100

  const ssAdj = ss * factor
  const slAdj = sl * factor
  const hAdj = h * factor

  return {
    idMin,
    odMax,
    segments,
    angleCutDeg,
    rb,
    ss,
    sl,
    h,
    qtyTotal,
    nTotal,
    shrinkPct,
    tolerancePct,
    ssAdj,
    slAdj,
    hAdj,
    ssMin: ssAdj * (1 - toleranceFactor),
    ssMax: ssAdj * (1 + toleranceFactor),
    slMin: slAdj * (1 - toleranceFactor),
    slMax: slAdj * (1 + toleranceFactor),
    hMin: hAdj * (1 - toleranceFactor),
    hMax: hAdj * (1 + toleranceFactor)
  }
})

function runCalculation() {
  if (orderItems.value.length === 0) {
    alert(t.value.noItemsForCalculation)
    return
  }

  if (level2Warnings.value.length > 0) {
    const message = `${t.value.alertsConfirmTitle}\n\n- ${level2Warnings.value.join('\n- ')}`
    const accepted = window.confirm(message)
    if (!accepted) return
  }

  calculationVisible.value = true
}

function selectTab(tab: string) {
  activeTab.value = tab
}

function applyTheme(mode: ThemeMode) {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', mode)
}

function toggleTheme() {
  theme.value = theme.value === 'dark' ? 'light' : 'dark'
}

applyTheme(theme.value)

watch(language, (value) => {
  localStorage.setItem(STORAGE_KEY, value)
  if (!copy[value].nav.includes(activeTab.value)) {
    activeTab.value = copy[value].nav[0]
  }
})

watch(theme, (value) => {
  localStorage.setItem(THEME_STORAGE_KEY, value)
  applyTheme(value)
})
</script>

<template>
  <div class="page">
    <header class="topbar">
      <a href="#" class="brand">{{ t.brand }}</a>

      <div class="topbar-right">
        <nav class="menu" aria-label="Principal">
          <button
            v-for="item in t.nav"
            :key="item"
            type="button"
            class="menu-link"
            :class="{ 'menu-link-active': activeTab === item }"
            @click="selectTab(item)"
          >
            {{ item }}
          </button>
        </nav>

        <button
          type="button"
          class="theme-btn"
          :title="theme === 'dark' ? t.themeDark : t.themeLight"
          :aria-label="theme === 'dark' ? t.themeDark : t.themeLight"
          @click="toggleTheme"
        >
          <span class="theme-icon" aria-hidden="true">{{ theme === 'dark' ? '☀' : '☾' }}</span>
        </button>

        <div class="lang" role="radiogroup" :aria-label="t.selectorLabel">
          <button
            v-for="option in languageOptions"
            :key="option.code"
            type="button"
            class="lang-btn"
            :class="{ 'lang-btn-active': language === option.code }"
            :aria-label="option.label"
            :title="option.label"
            :aria-checked="language === option.code"
            role="radio"
            @click="language = option.code"
          >
            <img :src="option.flagSrc" :alt="option.label" class="flag-icon" />
          </button>
        </div>
      </div>
    </header>

    <main class="content">
      <section class="hero">
        <div class="input-grid" aria-label="Informacion de entrada">
          <label class="field" :class="`field-${fieldState('salesOrder')}`">
            <span>{{ t.labels.salesOrder }}</span>
            <input
              v-model="inputData.salesOrder"
              :disabled="salesOrderLocked"
              :class="{ 'input-locked': salesOrderLocked }"
              type="text"
              @blur="markTouched('salesOrder')"
              @keydown.enter.prevent="markTouched('salesOrder')"
            />
            <small v-for="msg in fieldMessages('salesOrder')" :key="msg" class="field-msg">{{ msg }}</small>
          </label>

          <label class="field" :class="`field-${fieldState('position')}`">
            <span>{{ t.labels.position }}</span>
            <input
              v-model="inputData.position"
              type="text"
              @blur="markTouched('position')"
              @keydown.enter.prevent="markTouched('position')"
            />
            <small v-for="msg in fieldMessages('position')" :key="msg" class="field-msg">{{ msg }}</small>
          </label>

          <label class="field" :class="`field-${fieldState('id')}`">
            <span>{{ t.labels.ID }}</span>
            <input
              v-model="inputData.id"
              class="input-num"
              type="text"
              inputmode="decimal"
              @blur="markTouched('id')"
              @keydown.enter.prevent="markTouched('id')"
            />
            <small v-for="msg in fieldMessages('id')" :key="msg" class="field-msg">{{ msg }}</small>
          </label>

          <label class="field" :class="`field-${fieldState('od')}`">
            <span>{{ t.labels.OD }}</span>
            <input
              v-model="inputData.od"
              class="input-num"
              type="text"
              inputmode="decimal"
              @blur="markTouched('od')"
              @keydown.enter.prevent="markTouched('od')"
            />
            <small v-for="msg in fieldMessages('od')" :key="msg" class="field-msg">{{ msg }}</small>
          </label>

          <label class="field" :class="`field-${fieldState('th')}`">
            <span>{{ t.labels.TH }}</span>
            <input
              v-model="inputData.th"
              class="input-num"
              :disabled="thLocked"
              :class="{ 'input-locked': thLocked }"
              type="text"
              inputmode="decimal"
              @blur="markTouched('th')"
              @keydown.enter.prevent="markTouched('th')"
            />
            <small v-for="msg in fieldMessages('th')" :key="msg" class="field-msg">{{ msg }}</small>
          </label>

          <label class="field" :class="`field-${fieldState('quantity')}`">
            <span>{{ t.labels.quantity }}</span>
            <input
              v-model="inputData.quantity"
              class="input-num"
              type="text"
              inputmode="numeric"
              @blur="markTouched('quantity')"
              @keydown.enter.prevent="markTouched('quantity')"
            />
            <small v-for="msg in fieldMessages('quantity')" :key="msg" class="field-msg">{{ msg }}</small>
          </label>
        </div>

        <div class="input-actions">
          <button
            type="button"
            class="new-item-btn"
            :disabled="!canAddItem"
            title="Agregar"
            aria-label="Agregar"
            @click="addNewItem"
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>

        <section class="order-items" aria-label="Items de orden">
          <h3>{{ t.orderItemsTitle }} ({{ orderItems.length }})</h3>

          <p v-if="orderItems.length === 0" class="order-items-empty">{{ t.emptyOrderItems }}</p>

          <div v-else class="order-items-table-wrap">
            <table class="order-items-table">
              <thead>
                <tr>
                  <th>{{ t.labels.salesOrder }}</th>
                  <th>{{ t.labels.position }}</th>
                  <th>{{ t.labels.ID }}</th>
                  <th>{{ t.labels.OD }}</th>
                  <th>{{ t.labels.TH }}</th>
                  <th>{{ t.labels.quantity }}</th>
                  <th>{{ t.actions }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="(item, index) in orderItems"
                  :key="`${item.salesOrder}-${item.position}-${index}`"
                  :class="{ 'row-editing': editingItemIndex === index }"
                >
                  <td>{{ item.salesOrder }}</td>
                  <td>{{ item.position }}</td>
                  <td>{{ item.id }}</td>
                  <td>{{ item.od }}</td>
                  <td>{{ item.th }}</td>
                  <td>{{ item.quantity }}</td>
                  <td>
                    <div class="row-actions">
                      <button type="button" class="row-btn" @click="editItem(index)">{{ t.edit }}</button>
                      <button type="button" class="row-btn row-btn-danger" @click="deleteItem(index)">{{ t.delete }}</button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="calc-panel" aria-label="Calculo">
          <div class="calc-controls">
            <label class="field field-inline">
              <span>{{ t.shrinkage }}</span>
              <input
                v-model.number="level2Shrinkage"
                class="input-num"
                type="number"
                step="0.1"
                min="0"
                max="16"
              />
            </label>
            <label class="field field-inline">
              <span>{{ t.tolerance }}</span>
              <input
                v-model.number="level2Tolerance"
                class="input-num"
                type="number"
                step="0.1"
                min="0"
                max="10"
              />
            </label>
            <button type="button" class="calc-btn" @click="runCalculation">
              <span class="calc-icon" aria-hidden="true" />
              {{ t.calculate }}
            </button>
          </div>

          <div v-if="calculationVisible && calculationResult" class="calc-results">
            <h3>{{ t.calculationTitle }}</h3>
            <div class="calc-grid">
              <div><strong>IDmin:</strong> {{ calculationResult.idMin.toFixed(2) }}</div>
              <div><strong>ODmax:</strong> {{ calculationResult.odMax.toFixed(2) }}</div>
              <div><strong>Segmentos:</strong> {{ calculationResult.segments }}</div>
              <div><strong>G (grados):</strong> {{ calculationResult.angleCutDeg.toFixed(2) }}</div>
              <div><strong>RB:</strong> {{ calculationResult.rb.toFixed(2) }}</div>
              <div><strong>SS:</strong> {{ calculationResult.ss.toFixed(2) }}</div>
              <div><strong>SL:</strong> {{ calculationResult.sl.toFixed(2) }}</div>
              <div><strong>H:</strong> {{ calculationResult.h.toFixed(2) }}</div>
              <div><strong>N total:</strong> {{ calculationResult.nTotal }}</div>
              <div><strong>Encogimiento:</strong> {{ calculationResult.shrinkPct.toFixed(2) }}%</div>
              <div><strong>Tolerancia:</strong> {{ calculationResult.tolerancePct.toFixed(2) }}%</div>
              <div><strong>SS rango:</strong> {{ calculationResult.ssMin.toFixed(2) }} - {{ calculationResult.ssMax.toFixed(2) }}</div>
              <div><strong>SL rango:</strong> {{ calculationResult.slMin.toFixed(2) }} - {{ calculationResult.slMax.toFixed(2) }}</div>
              <div><strong>H rango:</strong> {{ calculationResult.hMin.toFixed(2) }} - {{ calculationResult.hMax.toFixed(2) }}</div>
            </div>
          </div>
        </section>
      </section>
    </main>
  </div>
</template>
