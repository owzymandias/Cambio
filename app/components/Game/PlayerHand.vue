<script setup lang="ts">
import type { Card as CardType, CardPosition } from '~/shared/types/game'

// Inline the constant to avoid import issues
const INITIAL_VIEW_ROW = 1

interface Props {
  cards: CardType[]
  isCurrentPlayer?: boolean
  showInitialCards?: boolean
  canSelectCards?: boolean
  selectedCardId?: string
}

const props = withDefaults(defineProps<Props>(), {
  isCurrentPlayer: false,
  showInitialCards: false,
  canSelectCards: false,
  selectedCardId: undefined,
})

const emit = defineEmits<{
  selectCard: [card: CardType]
}>()

// Organize cards in 2x2 grid
const cardGrid = computed(() => {
  const grid: (CardType | null)[][] = [
    [null, null], // Top row
    [null, null], // Bottom row
  ]

  for (const card of props.cards) {
    if (card.position) {
      grid[card.position.row][card.position.col] = card
    }
  }

  return grid
})

// Determine if a card should be visible
function isCardVisible(card: CardType | null): boolean {
  if (!card)
    return false

  // If it's the current player and in initial view phase, show bottom row
  if (props.isCurrentPlayer && props.showInitialCards) {
    return card.position.row === INITIAL_VIEW_ROW
  }

  // Otherwise, respect the card's visibility setting
  return card.visibility === 'visible' || card.visibility === 'peeking'
}

function handleCardClick(card: CardType | null) {
  if (card && props.canSelectCards) {
    emit('selectCard', card)
  }
}

function isCardSelected(card: CardType | null): boolean {
  return card?.id === props.selectedCardId
}
</script>

<template>
  <div class="player-hand">
    <div
      v-for="(row, rowIndex) in cardGrid"
      :key="`row-${rowIndex}`"
      class="card-row"
    >
      <div
        v-for="(card, colIndex) in row"
        :key="`card-${rowIndex}-${colIndex}`"
        class="card-slot"
      >
        <GameCard
          v-if="card"
          :card="card"
          :is-visible="isCardVisible(card)"
          :is-clickable="canSelectCards"
          :is-selected="isCardSelected(card)"
          @click="handleCardClick(card)"
        />
        <div v-else class="empty-card-slot">
          <UIcon name="i-heroicons-question-mark-circle" class="text-gray-400 text-4xl" />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.player-hand {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.card-row {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.card-slot {
  position: relative;
}

.empty-card-slot {
  width: 100px;
  height: 140px;
  border: 2px dashed #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
}

/* Responsive sizing */
@media (max-width: 640px) {
  .player-hand {
    padding: 12px;
    gap: 8px;
  }

  .card-row {
    gap: 8px;
  }

  .empty-card-slot {
    width: 80px;
    height: 112px;
  }
}
</style>
