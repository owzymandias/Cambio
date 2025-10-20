<script setup lang="ts">
import type { Card } from '~/shared/types/game'

interface Props {
  card: Card
  isVisible?: boolean
  isClickable?: boolean
  isSelected?: boolean
  showCardBack?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  isVisible: false,
  isClickable: false,
  isSelected: false,
  showCardBack: false,
})

const emit = defineEmits<{
  click: [card: Card]
}>()

const cardSuitColors: Record<string, string> = {
  hearts: 'text-red-600',
  diamonds: 'text-red-600',
  clubs: 'text-gray-900',
  spades: 'text-gray-900',
}

const cardSuitSymbols: Record<string, string> = {
  hearts: '♥',
  diamonds: '♦',
  clubs: '♣',
  spades: '♠',
}

const cardColor = computed(() => cardSuitColors[props.card.suit] || 'text-gray-900')
const cardSymbol = computed(() => cardSuitSymbols[props.card.suit] || '?')

const shouldShowFace = computed(() => {
  if (props.showCardBack)
    return false
  return props.isVisible || props.card.visibility === 'visible'
})

function handleClick() {
  if (props.isClickable) {
    emit('click', props.card)
  }
}
</script>

<template>
  <div
    class="playing-card"
    :class="{
      'card-face-up': shouldShowFace,
      'card-face-down': !shouldShowFace,
      'card-clickable': isClickable,
      'card-selected': isSelected,
      'card-peeking': card.visibility === 'peeking',
    }"
    @click="handleClick"
  >
    <!-- Card Face (Visible) -->
    <div v-if="shouldShowFace" class="card-content card-face">
      <div class="card-corner card-corner-top">
        <div class="card-rank">
          {{ card.rank }}
        </div>
        <div class="card-suit" :class="cardColor">
          {{ cardSymbol }}
        </div>
      </div>

      <div class="card-center" :class="cardColor">
        <div class="card-suit-large">
          {{ cardSymbol }}
        </div>
        <div class="card-rank-large">
          {{ card.rank }}
        </div>
      </div>

      <div class="card-corner card-corner-bottom">
        <div class="card-rank">
          {{ card.rank }}
        </div>
        <div class="card-suit" :class="cardColor">
          {{ cardSymbol }}
        </div>
      </div>
    </div>

    <!-- Card Back (Hidden) -->
    <div v-else class="card-content card-back">
      <div class="card-back-pattern">
        <div class="card-back-logo">
          Cambio
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.playing-card {
  width: 100px;
  height: 140px;
  border-radius: 8px;
  position: relative;
  cursor: default;
  transition: all 0.3s ease;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.card-content {
  width: 100%;
  height: 100%;
  border-radius: 8px;
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 8px;
}

.card-face {
  background: white;
  border: 2px solid #e5e7eb;
}

.card-back {
  background: linear-gradient(135deg, #3b82f6 0%, #1e40af 100%);
  border: 2px solid #1e40af;
}

.card-corner {
  display: flex;
  flex-direction: column;
  align-items: center;
  font-weight: bold;
  line-height: 1;
}

.card-corner-top {
  align-self: flex-start;
}

.card-corner-bottom {
  align-self: flex-end;
  transform: rotate(180deg);
}

.card-rank {
  font-size: 16px;
  font-weight: bold;
}

.card-suit {
  font-size: 14px;
}

.card-center {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.card-suit-large {
  font-size: 48px;
  line-height: 1;
}

.card-rank-large {
  font-size: 24px;
  font-weight: bold;
}

.card-back-pattern {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-image: repeating-linear-gradient(
    45deg,
    rgba(255, 255, 255, 0.1),
    rgba(255, 255, 255, 0.1) 10px,
    transparent 10px,
    transparent 20px
  );
}

.card-back-logo {
  color: white;
  font-size: 18px;
  font-weight: bold;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.card-clickable {
  cursor: pointer;
}

.card-clickable:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.card-selected {
  transform: translateY(-8px);
  box-shadow: 0 6px 12px rgba(59, 130, 246, 0.4);
  border-color: #3b82f6;
}

.card-peeking {
  animation: peek-pulse 1s ease-in-out;
}

@keyframes peek-pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Responsive sizing for smaller screens */
@media (max-width: 640px) {
  .playing-card {
    width: 80px;
    height: 112px;
  }

  .card-content {
    padding: 6px;
  }

  .card-rank {
    font-size: 14px;
  }

  .card-suit {
    font-size: 12px;
  }

  .card-suit-large {
    font-size: 36px;
  }

  .card-rank-large {
    font-size: 20px;
  }

  .card-back-logo {
    font-size: 14px;
  }
}
</style>
