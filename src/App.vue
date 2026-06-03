<script setup lang="ts">
import { computed } from 'vue'
import { useAppShell } from './composables/useAppShell'
import { useLayerAdmin } from './composables/useLayerAdmin'
import { useOrderWorkflow } from './composables/useOrderWorkflow'
import CalculationResultsPanel from './components/CalculationResultsPanel.vue'
import LayerCombinationsPanel from './components/LayerCombinationsPanel.vue'
import OrderCapturePanel from './components/OrderCapturePanel.vue'

const {
  language,
  theme,
  t,
  languageOptions,
  activeTab,
  selectTab,
  toggleTheme,
} = useAppShell()

const {
  inputData,
  orderItems,
  editingItemIndex,
  level2Shrinkage,
  level2Tolerance,
  calculationVisible,
  canAddItem,
  salesOrderLocked,
  thLocked,
  fieldStates,
  fieldMessagesMap,
  calculationResult,
  addNewItem,
  editItem,
  cancelOrderEdit,
  deleteItem,
  markTouched,
  runCalculation,
} = useOrderWorkflow({ t })

const {
  layerAdminPinInput,
  layerAdminUserInput,
  layerAdminError,
  isLayerAdmin,
  editingLayerId,
  layerDraft,
  sortedLayerCombinations,
  selectedLayerCombination,
  calculatedLayerItems,
  layerDraftErrors,
  canSaveLayerDraft,
  formatLayerTimestamp,
  resetLayerDraft,
  startLayerEdit,
  unlockLayerAdmin,
  lockLayerAdmin,
  saveLayerDraft,
  deleteLayerCombination,
  toggleLayerStatus,
} = useLayerAdmin({ t, calculationResult })

const calculationResultView = computed(() => calculationResult.value)
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
      <section v-if="activeTab === t.nav[0]" class="hero">
        <OrderCapturePanel
          :copy="{
            newItem: t.newItem,
            saveItem: t.saveItem,
            orderItemsTitle: t.orderItemsTitle,
            emptyOrderItems: t.emptyOrderItems,
            actions: t.actions,
            edit: t.edit,
            delete: t.delete,
            orderEditTitle: t.orderEditTitle,
            orderEditHint: t.orderEditHint,
            layersCancel: t.layersCancel,
            labels: t.labels,
          }"
          :input-data="inputData"
          :field-states="fieldStates"
          :field-messages="fieldMessagesMap"
          :sales-order-locked="salesOrderLocked"
          :th-locked="thLocked"
          :can-add-item="canAddItem"
          :editing-item-index="editingItemIndex"
          :order-items="orderItems"
          @update:input-data="inputData = $event"
          @mark-touched="markTouched"
          @submit-item="addNewItem"
          @cancel-edit="cancelOrderEdit"
          @edit-item="editItem"
          @delete-item="deleteItem"
        />

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

          <CalculationResultsPanel
            v-if="calculationVisible && calculationResultView"
            :copy="{
              calculationTitle: t.calculationTitle,
              trapezoidTitle: t.trapezoidTitle,
              layersTitle: t.layersTitle,
              layersCombination: t.layersCombination,
              layersLayerCount: t.layersLayerCount,
              layersFinalThickness: t.layersFinalThickness,
              layerItemLabel: t.layerItemLabel,
              layerNoMatch: t.layerNoMatch,
              shrinkage: t.shrinkage,
              tolerance: t.tolerance,
            }"
            :result="calculationResultView"
            :selected-layer-combination="selectedLayerCombination"
            :calculated-layer-items="calculatedLayerItems"
          />
        </section>
      </section>

      <section v-else-if="activeTab === t.nav[1]" class="hero">
        <LayerCombinationsPanel
          :copy="{
            layersTitle: t.layersTitle,
            layersReadOnlyHint: t.layersReadOnlyHint,
            layersAdminHint: t.layersAdminHint,
            layersUser: t.layersUser,
            layersPin: t.layersPin,
            layersUnlock: t.layersUnlock,
            layersLock: t.layersLock,
            layersAdd: t.layersAdd,
            layersSave: t.layersSave,
            layersCancel: t.layersCancel,
            layersEdit: t.layersEdit,
            layersThickness: t.layersThickness,
            layersCombination: t.layersCombination,
            layersLayerCount: t.layersLayerCount,
            layersFinalThickness: t.layersFinalThickness,
            layersStatus: t.layersStatus,
            layersUpdatedBy: t.layersUpdatedBy,
            layersUpdatedAt: t.layersUpdatedAt,
            layersNoData: t.layersNoData,
            layersActive: t.layersActive,
            layersInactive: t.layersInactive,
            actions: t.actions,
            edit: t.edit,
            delete: t.delete,
          }"
          :is-layer-admin="isLayerAdmin"
          :layer-admin-user-input="layerAdminUserInput"
          :layer-admin-pin-input="layerAdminPinInput"
          :layer-admin-error="layerAdminError"
          :sorted-layer-combinations="sortedLayerCombinations"
          :editing-layer-id="editingLayerId"
          :layer-draft="layerDraft"
          :layer-draft-errors="layerDraftErrors"
          :can-save-layer-draft="canSaveLayerDraft"
          :format-layer-timestamp="formatLayerTimestamp"
          @update:layer-admin-user-input="layerAdminUserInput = $event"
          @update:layer-admin-pin-input="layerAdminPinInput = $event"
          @update:layer-draft="layerDraft = $event"
          @unlock-admin="unlockLayerAdmin"
          @lock-admin="lockLayerAdmin"
          @edit-row="startLayerEdit"
          @toggle-row-status="toggleLayerStatus"
          @delete-row="deleteLayerCombination"
          @save-draft="saveLayerDraft"
          @reset-draft="resetLayerDraft"
        />
      </section>

      <section v-else class="hero">
        <section class="calc-panel" aria-label="Tab3">
          <div class="calc-results">
            <h3>{{ activeTab }}</h3>
          </div>
        </section>
      </section>
    </main>
  </div>
</template>
