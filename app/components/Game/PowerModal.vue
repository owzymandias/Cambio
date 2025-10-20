<script setup lang="ts">
import { ref, computed } from 'vue'

interface Card {
  id: string
  rank: string
  suit: string
  pointValue: number
  position?: number
}

interface Player {
  id: string
  displayName: string
  position: number
}

interface PowerTarget {
  powerType: 'peek_own' | 'peek_opponent' | 'blind_swap' | 'look_own'
  cardIndex?: number
  myCardIndex?: number
  targetPlayerId?: string
  targetCardIndex?: number
}

const props = defineProps<{
  powerType: 'peek_own' | 'peek_opponent' | 'blind_swap' | 'look_own'
  players: Player[]
  myCards: Card[]
}>()

const emit = defineEmits<{
  activate: [target: PowerTarget]
  skip: []
}>()

const isOpen = ref(true)
const selectedCardIndex = ref<number>()
const selectedMyCardIndex = ref<number>()
const selectedOpponentId = ref<string>()
const selectedOpponentCardIndex = ref<number>()

const otherPlayers = computed(() => {
  return props.players.filter(p => p.id !== 'me') // Filter out current player
})

const canSubmit = computed(() => {
  if (props.powerType === 'peek_own') {
    return selectedCardIndex.value !== undefined
  }
  if (props.powerType === 'peek_opponent') {
    return selectedCardIndex.value !== undefined && selectedOpponentId.value !== undefined
  }
  if (props.powerType === 'blind_swap') {
    return (
      selectedMyCardIndex.value !== undefined &&
      selectedOpponentId.value !== undefined &&
      selectedOpponentCardIndex.value !== undefined
    )
  }
  if (props.powerType === 'look_own') {
    return true // Auto-peek, no selection required
  }
  return false
})

const modalTitle = computed(() => {
  switch (props.powerType) {
    case 'peek_own':
      return 'Peek at Your Card'
    case 'peek_opponent':
      return 'Peek at Opponent\'s Card'
    case 'blind_swap':
      return 'Blind Swap Cards'
    case 'look_own':
      return 'Auto-Peek (King)'
    default:
      return 'Use Special Power'
  }
})

const timeRemaining = ref(5000)
let intervalId: ReturnType<typeof setInterval> | null = null

function startCountdown() {
  intervalId = setInterval(() => {
    timeRemaining.value -= 100
    if (timeRemaining.value <= 0) {
      if (intervalId) clearInterval(intervalId)
    }
  }, 100)
}

function handleActivate() {
  const target: PowerTarget = {
    powerType: props.powerType,
  }

  if (props.powerType === 'peek_own' || props.powerType === 'peek_opponent') {
    target.cardIndex = selectedCardIndex.value
  }

  if (props.powerType === 'peek_opponent' || props.powerType === 'blind_swap') {
    target.targetPlayerId = selectedOpponentId.value
  }

  if (props.powerType === 'blind_swap') {
    target.myCardIndex = selectedMyCardIndex.value
    target.targetCardIndex = selectedOpponentCardIndex.value
  }

  emit('activate', target)
  isOpen.value = false
}

function handleSkip() {
  emit('skip')
  isOpen.value = false
}

onUnmounted(() => {
  if (intervalId) clearInterval(intervalId)
})
</script>

<template>
  <UModal v-model="isOpen" prevent-close :ui="{ width: 'max-w-md' }">
    <UCard>
      <template #header>
        <h3 class="text-lg font-semibold">
          {{ modalTitle }}
        </h3>
      </template>

      <div class="space-y-4">
        <!-- Auto-peek display (for look_own - King) -->
        <div v-if="powerType === 'look_own'" class="text-center p-4 bg-blue-50 rounded-lg">
          <p class="text-sm text-gray-700">
            A random card will be auto-selected and revealed to you.
          </p>
        </div>

        <!-- Card selection grid (2x2) for peek_own -->
        <div v-if="powerType === 'peek_own'" class="space-y-2">
          <label class="text-sm font-medium text-gray-700">Select a card to peek:</label>
          <div class="grid grid-cols-2 gap-4">
            <button
              v-for="index in 4"
              :key="index"
              class="btn-card-select"
              :class="{ selected: selectedCardIndex === index - 1 }"
              @click="selectedCardIndex = index - 1"
            >
              Position {{ index }}
            </button>
          </div>
        </div>

        <!-- Opponent and card selection for peek_opponent -->
        <div v-if="powerType === 'peek_opponent'" class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700">Select opponent:</label>
            <select
              v-model="selectedOpponentId"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Choose a player...</option>
              <option v-for="p in otherPlayers" :key="p.id" :value="p.id">
                {{ p.displayName }}
              </option>
            </select>
          </div>

          <div v-if="selectedOpponentId">
            <label class="text-sm font-medium text-gray-700">Select their card:</label>
            <div class="grid grid-cols-2 gap-4 mt-2">
              <button
                v-for="index in 4"
                :key="index"
                class="btn-card-select"
                :class="{ selected: selectedCardIndex === index - 1 }"
                @click="selectedCardIndex = index - 1"
              >
                Position {{ index }}
              </button>
            </div>
          </div>
        </div>

        <!-- Blind swap selection -->
        <div v-if="powerType === 'blind_swap'" class="space-y-4">
          <div>
            <label class="text-sm font-medium text-gray-700">Select your card:</label>
            <div class="grid grid-cols-2 gap-4 mt-2">
              <button
                v-for="index in 4"
                :key="index"
                class="btn-card-select"
                :class="{ selected: selectedMyCardIndex === index - 1 }"
                @click="selectedMyCardIndex = index - 1"
              >
                Position {{ index }}
              </button>
            </div>
          </div>

          <div>
            <label class="text-sm font-medium text-gray-700">Select opponent:</label>
            <select
              v-model="selectedOpponentId"
              class="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
            >
              <option value="">Choose a player...</option>
              <option v-for="p in otherPlayers" :key="p.id" :value="p.id">
                {{ p.displayName }}
              </option>
            </select>
          </div>

          <div v-if="selectedOpponentId">
            <label class="text-sm font-medium text-gray-700">Select their card:</label>
            <div class="grid grid-cols-2 gap-4 mt-2">
              <button
                v-for="index in 4"
                :key="index"
                class="btn-card-select"
                :class="{ selected: selectedOpponentCardIndex === index - 1 }"
                @click="selectedOpponentCardIndex = index - 1"
              >
                Position {{ index }}
              </button>
            </div>
          </div>
        </div>

        <!-- Countdown timer for peek powers -->
        <div
          v-if="(powerType === 'peek_own' || powerType === 'peek_opponent' || powerType === 'look_own') && timeRemaining > 0"
          class="text-center text-sm text-gray-600"
        >
          Card will be hidden in {{ Math.ceil(timeRemaining / 1000) }}s
        </div>
      </div>

      <template #footer>
        <div class="flex justify-between gap-3">
          <UButton color="gray" @click="handleSkip">
            Skip
          </UButton>
          <UButton :disabled="!canSubmit" @click="handleActivate">
            Activate
          </UButton>
        </div>
      </template>
    </UCard>
  </UModal>
</template>

<style scoped>
.btn-card-select {
  @apply min-h-[44px] min-w-[44px] border-2 border-gray-300 rounded-lg transition-colors;
  @apply hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2;
}

.btn-card-select.selected {
  @apply bg-blue-500 text-white border-blue-600;
}
</style>
