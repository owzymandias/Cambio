<script setup lang="ts">
import type { Card } from '~/shared/types/game'

interface Props {
  topCard: Card | null
  isClickable?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isClickable: false,
})

const emit = defineEmits<{
  click: []
}>()

function handleClick() {
  if (props.isClickable && props.topCard) {
    emit('click')
  }
}
</script>

<template>
  <div class="discard-pile-container">
    <div
      class="discard-pile"
      :class="{ 'discard-pile-clickable': isClickable && topCard }"
      @click="handleClick"
    >
      <div v-if="topCard" class="discard-card-wrapper">
        <GameCard
          :card="topCard"
          :is-visible="true"
        />
      </div>
      <div v-else class="empty-discard-pile">
        <UIcon name="i-heroicons-rectangle-stack" class="text-gray-400 text-4xl" />
        <div class="empty-label">
          Empty
        </div>
      </div>
    </div>

    <div class="pile-label">
      <UIcon name="i-heroicons-trash" class="mr-1" />
      Discard Pile
    </div>
  </div>
</template>

<style scoped>
.discard-pile-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.discard-pile {
  position: relative;
  width: 100px;
  height: 140px;
  cursor: default;
}

.discard-pile-clickable {
  cursor: pointer;
}

.discard-pile-clickable:hover .discard-card-wrapper {
  transform: translateY(-4px);
  transition: transform 0.2s ease;
}

.discard-card-wrapper {
  transition: transform 0.2s ease;
}

.empty-discard-pile {
  width: 100%;
  height: 100%;
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.5);
  gap: 8px;
}

.empty-label {
  font-size: 12px;
  color: #9ca3af;
  font-weight: 600;
}

.pile-label {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
  display: flex;
  align-items: center;
}

/* Responsive sizing */
@media (max-width: 640px) {
  .discard-pile {
    width: 80px;
    height: 112px;
  }

  .pile-label {
    font-size: 12px;
  }

  .empty-label {
    font-size: 10px;
  }
}
</style>
