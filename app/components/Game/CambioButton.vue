<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  canCallCambio: boolean
  gamePhase: string
}>()

const emit = defineEmits<{
  callCambio: []
}>()

const showConfirm = ref(false)

function handleClick() {
  if (props.canCallCambio && props.gamePhase === 'playing') {
    showConfirm.value = true
  }
}

function confirmCambio() {
  emit('callCambio')
  showConfirm.value = false
}
</script>

<template>
  <div>
    <UButton
      color="red"
      size="lg"
      :disabled="!canCallCambio || gamePhase !== 'playing'"
      class="min-h-[44px] font-bold shadow-lg"
      @click="handleClick"
    >
      Call Cambio!
    </UButton>

    <UModal v-model="showConfirm" :ui="{ width: 'max-w-md' }">
      <UCard>
        <template #header>
          <h3 class="text-lg font-semibold text-red-600">
            Confirm Cambio Call
          </h3>
        </template>

        <div class="space-y-3">
          <p class="text-gray-700">
            Are you sure you want to call Cambio?
          </p>
          <ul class="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>Your turn will end immediately</li>
            <li>Each other player gets exactly one more turn</li>
            <li>If you don't have the lowest score, your score will be doubled</li>
          </ul>
        </div>

        <template #footer>
          <div class="flex justify-end gap-3">
            <UButton color="gray" @click="showConfirm = false">
              Cancel
            </UButton>
            <UButton color="red" @click="confirmCambio">
              Confirm Cambio Call
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>
  </div>
</template>

<style scoped>
/* Additional styling for prominent button */
</style>
