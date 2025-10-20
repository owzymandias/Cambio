<script setup lang="ts">
import { ref } from 'vue'

interface WinnerInfo {
  playerId: string
  displayName: string
  finalScore: number
}

const props = defineProps<{
  winners: WinnerInfo[]
  gameId: string
}>()

const emit = defineEmits<{
  viewScores: []
  close: []
}>()

const isOpen = ref(true)

const winnerText = computed(() => {
  if (props.winners.length === 0) {
    return 'Game Over!'
  } else if (props.winners.length === 1) {
    return `${props.winners[0].displayName} Wins!`
  } else {
    const names = props.winners.map(w => w.displayName).join(' and ')
    return `${names} Tie!`
  }
})

const scoreText = computed(() => {
  if (props.winners.length === 0) {
    return ''
  } else if (props.winners.length === 1) {
    return `Final Score: ${props.winners[0].finalScore}`
  } else {
    return `Final Score: ${props.winners[0].finalScore}`
  }
})

function handleViewScores() {
  emit('viewScores')
  isOpen.value = false
}

function handleClose() {
  emit('close')
  isOpen.value = false
}
</script>

<template>
  <UModal v-model="isOpen" :ui="{ width: 'max-w-lg' }">
    <UCard>
      <template #header>
        <div class="text-center py-4">
          <div class="text-4xl mb-2">
            🎉
          </div>
          <h2 class="text-3xl font-bold text-gray-900">
            {{ winnerText }}
          </h2>
        </div>
      </template>

      <div class="text-center space-y-4 py-4">
        <p class="text-xl font-semibold text-gray-700">
          {{ scoreText }}
        </p>

        <div v-if="winners.length > 1" class="text-sm text-gray-600">
          <p>Multiple players tied with the same score!</p>
        </div>

        <!-- Optional: Add confetti or celebration animation here -->
        <div class="flex justify-center">
          <div class="animate-bounce text-6xl">
            🏆
          </div>
        </div>
      </div>

      <template #footer>
        <div class="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <UButton size="lg" @click="handleViewScores">
            View Full Scores
          </UButton>
          <UButton color="gray" size="lg" @click="handleClose">
            Close
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<style scoped>
/* Optional: Add custom animations for celebration */
@keyframes confetti {
  0% {
    transform: translateY(0) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(100vh) rotate(360deg);
    opacity: 0;
  }
}
</style>
