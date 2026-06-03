<script setup lang="ts">
import type { LayerCombination, LayerDraft } from '../types'

type LayersCopy = {
  layersTitle: string
  layersReadOnlyHint: string
  layersAdminHint: string
  layersUser: string
  layersPin: string
  layersUnlock: string
  layersLock: string
  layersAdd: string
  layersSave: string
  layersCancel: string
  layersEdit: string
  layersThickness: string
  layersCombination: string
  layersLayerCount: string
  layersFinalThickness: string
  layersStatus: string
  layersUpdatedBy: string
  layersUpdatedAt: string
  layersNoData: string
  layersActive: string
  layersInactive: string
  actions: string
  edit: string
  delete: string
}

const props = defineProps<{
  copy: LayersCopy
  isLayerAdmin: boolean
  layerAdminUserInput: string
  layerAdminPinInput: string
  layerAdminError: string
  sortedLayerCombinations: LayerCombination[]
  editingLayerId: string | null
  layerDraft: LayerDraft
  layerDraftErrors: string[]
  canSaveLayerDraft: boolean
  formatLayerTimestamp: (value: string) => string
}>()

const emit = defineEmits<{
  'update:layerAdminUserInput': [value: string]
  'update:layerAdminPinInput': [value: string]
  'update:layerDraft': [value: LayerDraft]
  'unlock-admin': []
  'lock-admin': []
  'edit-row': [row: LayerCombination]
  'toggle-row-status': [id: string]
  'delete-row': [id: string]
  'save-draft': []
  'reset-draft': []
}>()

function updateDraftField(field: keyof LayerDraft, value: string) {
  emit('update:layerDraft', {
    ...props.layerDraft,
    [field]: value,
  })
}

function getInputValue(event: Event): string {
  return (event.target as HTMLInputElement).value
}
</script>

<template>
  <section class="calc-panel" aria-label="Combinaciones">
    <div class="calc-results">
      <h3>{{ copy.layersTitle }}</h3>

      <div class="layers-admin">
        <p class="layers-hint">{{ isLayerAdmin ? copy.layersAdminHint : copy.layersReadOnlyHint }}</p>

        <div v-if="!isLayerAdmin" class="layers-admin-controls">
          <label class="field field-inline">
            <span>{{ copy.layersUser }}</span>
            <input
              :value="layerAdminUserInput"
              type="text"
              maxlength="20"
              @input="emit('update:layerAdminUserInput', getInputValue($event))"
            />
          </label>
          <label class="field field-inline">
            <span>{{ copy.layersPin }}</span>
            <input
              :value="layerAdminPinInput"
              type="password"
              maxlength="12"
              @input="emit('update:layerAdminPinInput', getInputValue($event))"
              @keydown.enter.prevent="emit('unlock-admin')"
            />
          </label>
          <button type="button" class="calc-btn" @click="emit('unlock-admin')">{{ copy.layersUnlock }}</button>
        </div>

        <div v-else class="layers-admin-active">
          <button type="button" class="row-btn row-btn-danger" @click="emit('lock-admin')">{{ copy.layersLock }}</button>
        </div>

        <small v-if="layerAdminError" class="field-msg">{{ layerAdminError }}</small>
      </div>

      <div v-if="sortedLayerCombinations.length > 0" class="order-items-table-wrap layers-table-wrap">
        <table class="order-items-table layers-table">
          <thead>
            <tr>
              <th>{{ copy.layersThickness }}</th>
              <th>{{ copy.layersCombination }}</th>
              <th>{{ copy.layersLayerCount }}</th>
              <th>{{ copy.layersFinalThickness }}</th>
              <th>{{ copy.layersStatus }}</th>
              <th>{{ copy.layersUpdatedBy }}</th>
              <th>{{ copy.layersUpdatedAt }}</th>
              <th v-if="isLayerAdmin">{{ copy.actions }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in sortedLayerCombinations" :key="row.id">
              <td>{{ row.thickness }}</td>
              <td>{{ row.combination }}</td>
              <td>{{ row.layerCount }}</td>
              <td>{{ row.finalThickness }}</td>
              <td>
                <span :class="row.active ? 'layer-status-active' : 'layer-status-inactive'">
                  {{ row.active ? copy.layersActive : copy.layersInactive }}
                </span>
              </td>
              <td>{{ row.updatedBy }}</td>
              <td>{{ formatLayerTimestamp(row.updatedAt) }}</td>
              <td v-if="isLayerAdmin">
                <div class="row-actions">
                  <button type="button" class="row-btn" @click="emit('edit-row', row)">{{ copy.edit }}</button>
                  <button type="button" class="row-btn" @click="emit('toggle-row-status', row.id)">
                    {{ row.active ? copy.layersInactive : copy.layersActive }}
                  </button>
                  <button type="button" class="row-btn row-btn-danger" @click="emit('delete-row', row.id)">{{ copy.delete }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <p v-else class="order-items-empty">{{ copy.layersNoData }}</p>

      <div v-if="isLayerAdmin" class="layers-editor">
        <h5>{{ editingLayerId ? copy.layersEdit : copy.layersAdd }}</h5>
        <div class="layers-grid">
          <label class="field field-inline">
            <span>{{ copy.layersThickness }}</span>
            <input
              :value="layerDraft.thickness"
              class="input-num"
              type="number"
              min="1"
              step="1"
              @input="updateDraftField('thickness', getInputValue($event))"
            />
          </label>
          <label class="field field-inline">
            <span>{{ copy.layersCombination }}</span>
            <input
              :value="layerDraft.combination"
              type="text"
              placeholder="3+4+5+4+3"
              @input="updateDraftField('combination', getInputValue($event))"
            />
          </label>
          <label class="field field-inline">
            <span>{{ copy.layersLayerCount }}</span>
            <input
              :value="layerDraft.layerCount"
              class="input-num"
              type="number"
              min="1"
              step="1"
              @input="updateDraftField('layerCount', getInputValue($event))"
            />
          </label>
          <label class="field field-inline">
            <span>{{ copy.layersFinalThickness }}</span>
            <input
              :value="layerDraft.finalThickness"
              class="input-num"
              type="number"
              min="1"
              step="0.1"
              @input="updateDraftField('finalThickness', getInputValue($event))"
            />
          </label>
        </div>

        <small v-for="msg in layerDraftErrors" :key="msg" class="field-msg">{{ msg }}</small>

        <div class="row-actions layers-editor-actions">
          <button type="button" class="row-btn" :disabled="!canSaveLayerDraft" @click="emit('save-draft')">{{ copy.layersSave }}</button>
          <button type="button" class="row-btn row-btn-danger" @click="emit('reset-draft')">{{ copy.layersCancel }}</button>
        </div>
      </div>
    </div>
  </section>
</template>
