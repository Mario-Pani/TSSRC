<script setup lang="ts">
import type { FieldKey, OrderFormData, OrderItem } from '../types'

type OrderCaptureCopy = {
  newItem: string
  saveItem: string
  orderItemsTitle: string
  emptyOrderItems: string
  actions: string
  edit: string
  delete: string
  orderEditTitle: string
  orderEditHint: string
  layersCancel: string
  labels: {
    ID: string
    OD: string
    TH: string
    quantity: string
    salesOrder: string
    position: string
  }
}

const props = defineProps<{
  copy: OrderCaptureCopy
  inputData: OrderFormData
  fieldStates: Record<FieldKey, 'empty' | 'ok' | 'warn'>
  fieldMessages: Record<FieldKey, string[]>
  salesOrderLocked: boolean
  thLocked: boolean
  canAddItem: boolean
  editingItemIndex: number | null
  orderItems: OrderItem[]
}>()

const emit = defineEmits<{
  'update:inputData': [value: OrderFormData]
  'mark-touched': [key: FieldKey]
  'submit-item': []
  'cancel-edit': []
  'edit-item': [index: number]
  'delete-item': [index: number]
}>()

function updateField(key: FieldKey, value: string) {
  emit('update:inputData', {
    ...props.inputData,
    [key]: value,
  })
}
</script>

<template>
  <div>
    <div v-if="editingItemIndex !== null" class="edit-banner">
      <div>
        <strong>{{ copy.orderEditTitle }}</strong>
        <p>{{ copy.orderEditHint }}</p>
      </div>
      <button type="button" class="row-btn row-btn-danger" @click="emit('cancel-edit')">{{ copy.layersCancel }}</button>
    </div>

    <div class="input-grid" aria-label="Informacion de entrada">
      <label class="field" :class="`field-${fieldStates.salesOrder}`">
        <span>{{ copy.labels.salesOrder }}</span>
        <input
          :value="inputData.salesOrder"
          :disabled="salesOrderLocked"
          :class="{ 'input-locked': salesOrderLocked }"
          type="text"
          @input="updateField('salesOrder', ($event.target as HTMLInputElement).value)"
          @blur="emit('mark-touched', 'salesOrder')"
          @keydown.enter.prevent="emit('mark-touched', 'salesOrder')"
        />
        <small v-for="msg in fieldMessages.salesOrder" :key="msg" class="field-msg">{{ msg }}</small>
      </label>

      <label class="field" :class="`field-${fieldStates.position}`">
        <span>{{ copy.labels.position }}</span>
        <input
          :value="inputData.position"
          type="text"
          @input="updateField('position', ($event.target as HTMLInputElement).value)"
          @blur="emit('mark-touched', 'position')"
          @keydown.enter.prevent="emit('mark-touched', 'position')"
        />
        <small v-for="msg in fieldMessages.position" :key="msg" class="field-msg">{{ msg }}</small>
      </label>

      <label class="field" :class="`field-${fieldStates.id}`">
        <span>{{ copy.labels.ID }}</span>
        <input
          :value="inputData.id"
          class="input-num"
          type="text"
          inputmode="decimal"
          @input="updateField('id', ($event.target as HTMLInputElement).value)"
          @blur="emit('mark-touched', 'id')"
          @keydown.enter.prevent="emit('mark-touched', 'id')"
        />
        <small v-for="msg in fieldMessages.id" :key="msg" class="field-msg">{{ msg }}</small>
      </label>

      <label class="field" :class="`field-${fieldStates.od}`">
        <span>{{ copy.labels.OD }}</span>
        <input
          :value="inputData.od"
          class="input-num"
          type="text"
          inputmode="decimal"
          @input="updateField('od', ($event.target as HTMLInputElement).value)"
          @blur="emit('mark-touched', 'od')"
          @keydown.enter.prevent="emit('mark-touched', 'od')"
        />
        <small v-for="msg in fieldMessages.od" :key="msg" class="field-msg">{{ msg }}</small>
      </label>

      <label class="field" :class="`field-${fieldStates.th}`">
        <span>{{ copy.labels.TH }}</span>
        <input
          :value="inputData.th"
          class="input-num"
          :disabled="thLocked"
          :class="{ 'input-locked': thLocked }"
          type="text"
          inputmode="decimal"
          @input="updateField('th', ($event.target as HTMLInputElement).value)"
          @blur="emit('mark-touched', 'th')"
          @keydown.enter.prevent="emit('mark-touched', 'th')"
        />
        <small v-for="msg in fieldMessages.th" :key="msg" class="field-msg">{{ msg }}</small>
      </label>

      <label class="field" :class="`field-${fieldStates.quantity}`">
        <span>{{ copy.labels.quantity }}</span>
        <input
          :value="inputData.quantity"
          class="input-num"
          type="text"
          inputmode="numeric"
          @input="updateField('quantity', ($event.target as HTMLInputElement).value)"
          @blur="emit('mark-touched', 'quantity')"
          @keydown.enter.prevent="emit('mark-touched', 'quantity')"
        />
        <small v-for="msg in fieldMessages.quantity" :key="msg" class="field-msg">{{ msg }}</small>
      </label>
    </div>

    <div class="input-actions">
      <div class="input-actions-group">
        <button
          type="button"
          class="new-item-btn"
          :disabled="!canAddItem"
          :title="editingItemIndex !== null ? copy.saveItem : copy.newItem"
          :aria-label="editingItemIndex !== null ? copy.saveItem : copy.newItem"
          @click="emit('submit-item')"
        >
          <span aria-hidden="true">{{ editingItemIndex !== null ? '✓' : '+' }}</span>
        </button>
        <button
          v-if="editingItemIndex !== null"
          type="button"
          class="row-btn"
          @click="emit('cancel-edit')"
        >
          {{ copy.layersCancel }}
        </button>
      </div>
    </div>

    <section class="order-items" aria-label="Items de orden">
      <h3>{{ copy.orderItemsTitle }} ({{ orderItems.length }})</h3>

      <p v-if="orderItems.length === 0" class="order-items-empty">{{ copy.emptyOrderItems }}</p>

      <div v-else class="order-items-table-wrap">
        <table class="order-items-table">
          <thead>
            <tr>
              <th>{{ copy.labels.salesOrder }}</th>
              <th>{{ copy.labels.position }}</th>
              <th>{{ copy.labels.ID }}</th>
              <th>{{ copy.labels.OD }}</th>
              <th>{{ copy.labels.TH }}</th>
              <th>{{ copy.labels.quantity }}</th>
              <th>{{ copy.actions }}</th>
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
                  <button type="button" class="row-btn" @click="emit('edit-item', index)">{{ copy.edit }}</button>
                  <button type="button" class="row-btn row-btn-danger" @click="emit('delete-item', index)">{{ copy.delete }}</button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
