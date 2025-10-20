<script setup lang="ts">
const route = useRoute()
const router = useRouter()

const gameId = computed(() => route.params.id as string)

// Game state management
const {
  gameSession,
  currentPlayer,
  isLoading,
  error,
  showInitialCards,
  hasViewedInitialCards,
  isInInitialViewPhase,
  isMyTurn,
  joinGame,
  viewInitialCards,
  hideInitialCards,
  drawCard,
  loadGameSession,
} = useGameState(gameId.value)

// Real-time event connection
const gameEvents = useGameEvents(gameId.value)

// Set up event handlers
gameEvents.on('game:state:update', (updatedSession) => {
  loadGameSession()
})

gameEvents.on('player_joined', () => {
  loadGameSession()
})

gameEvents.on('turn_started', () => {
  loadGameSession()
})

gameEvents.on('card_drawn', () => {
  loadGameSession()
})

gameEvents.on('card_swapped', () => {
  loadGameSession()
})

gameEvents.on('game:error', (errorData) => {
  console.error('Game error:', errorData)
})

// Join game state
const showJoinDialog = ref(true)
const displayName = ref('')
const isJoining = ref(false)

// Check if already joined
onMounted(() => {
  if (currentPlayer.value) {
    showJoinDialog.value = false
  }
})

// Handle joining the game
async function handleJoinGame() {
  if (!displayName.value || displayName.value.length < 3) {
    return
  }

  isJoining.value = true
  try {
    await joinGame(displayName.value)
    showJoinDialog.value = false
  }
  catch (err) {
    console.error('Failed to join game:', err)
  }
  finally {
    isJoining.value = false
  }
}

// Initial cards viewing
const initialCardsTimer = ref<NodeJS.Timeout | null>(null)
const initialCardsViewDuration = 5000 // 5 seconds

function handleViewInitialCards() {
  viewInitialCards()

  // Auto-hide after 5 seconds
  initialCardsTimer.value = setTimeout(() => {
    hideInitialCards()
  }, initialCardsViewDuration)
}

function handleHideInitialCards() {
  if (initialCardsTimer.value) {
    clearTimeout(initialCardsTimer.value)
    initialCardsTimer.value = null
  }
  hideInitialCards()
}

// Drawing cards
async function handleDrawFromDeck() {
  try {
    await drawCard('deck')
  }
  catch (err) {
    console.error('Failed to draw from deck:', err)
  }
}

async function handleDrawFromDiscard() {
  try {
    await drawCard('discard')
  }
  catch (err) {
    console.error('Failed to draw from discard:', err)
  }
}

// Cleanup
onUnmounted(() => {
  if (initialCardsTimer.value) {
    clearTimeout(initialCardsTimer.value)
  }
})

// Page metadata
useHead({
  title: 'Cambio Game',
})
</script>

<template>
  <div class="game-page">
    <!-- Join Game Dialog -->
    <UModal v-model="showJoinDialog" :prevent-close="true">
      <UCard>
        <template #header>
          <h3 class="text-xl font-bold">
            Join Game
          </h3>
        </template>

        <div class="join-form">
          <UFormGroup label="Display Name" required>
            <UInput
              v-model="displayName"
              placeholder="Enter your name"
              :disabled="isJoining"
              @keyup.enter="handleJoinGame"
            />
          </UFormGroup>

          <div v-if="error" class="error-message">
            <UAlert
              color="red"
              variant="soft"
              :title="error"
            />
          </div>
        </div>

        <template #footer>
          <div class="flex justify-end gap-2">
            <UButton
              color="gray"
              variant="ghost"
              @click="router.push('/')"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              :loading="isJoining"
              :disabled="!displayName || displayName.length < 3"
              @click="handleJoinGame"
            >
              Join Game
            </UButton>
          </div>
        </template>
      </UCard>
    </UModal>

    <!-- Loading State -->
    <div v-if="isLoading && !gameSession" class="loading-container">
      <UIcon name="i-heroicons-arrow-path" class="animate-spin text-4xl text-blue-500" />
      <p class="text-gray-600">
        Loading game...
      </p>
    </div>

    <!-- Error State -->
    <div v-else-if="error && !gameSession" class="error-container">
      <UAlert
        color="red"
        variant="soft"
        :title="error"
      />
      <UButton @click="loadGameSession">
        Retry
      </UButton>
    </div>

    <!-- Game Board -->
    <div v-else-if="gameSession && currentPlayer" class="game-container">
      <!-- Initial Cards View Prompt -->
      <div
        v-if="isInInitialViewPhase && !hasViewedInitialCards && !showInitialCards"
        class="initial-cards-prompt"
      >
        <UCard>
          <template #header>
            <div class="flex items-center gap-2">
              <UIcon name="i-heroicons-eye" class="text-2xl" />
              <h3 class="text-lg font-bold">
                View Your Initial Cards
              </h3>
            </div>
          </template>

          <p class="text-gray-700">
            You can view your two closest cards (bottom row) for {{ initialCardsViewDuration / 1000 }} seconds. This can only be done once at the start of the game.
          </p>

          <template #footer>
            <UButton
              color="primary"
              size="lg"
              block
              @click="handleViewInitialCards"
            >
              View Initial Cards
            </UButton>
          </template>
        </UCard>
      </div>

      <!-- Initial Cards Viewing Modal -->
      <UModal v-model="showInitialCards" :prevent-close="true">
        <UCard>
          <template #header>
            <div class="flex items-center justify-between">
              <h3 class="text-lg font-bold">
                Your Initial Cards
              </h3>
              <UBadge color="blue">
                Bottom Row
              </UBadge>
            </div>
          </template>

          <div class="initial-cards-view">
            <p class="text-sm text-gray-600 mb-4">
              Memorize these cards! They will be hidden after you close this.
            </p>

            <GamePlayerHand
              v-if="currentPlayer"
              :cards="currentPlayer.cards"
              :is-current-player="true"
              :show-initial-cards="true"
            />
          </div>

          <template #footer>
            <UButton
              color="primary"
              block
              @click="handleHideInitialCards"
            >
              I've Memorized My Cards
            </UButton>
          </template>
        </UCard>
      </UModal>

      <!-- Main Game Board -->
      <GameGameBoard
        :game-session="gameSession"
        :current-player="currentPlayer"
        :show-initial-cards="showInitialCards"
        :on-draw-from-deck="handleDrawFromDeck"
        :on-draw-from-discard="handleDrawFromDiscard"
      />
    </div>
  </div>
</template>

<style scoped>
.game-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
}

.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 100vh;
  gap: 16px;
  padding: 24px;
}

.game-container {
  position: relative;
}

.initial-cards-prompt {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 50;
  max-width: 500px;
  width: 90%;
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.initial-cards-view {
  display: flex;
  flex-direction: column;
  align-items: center;
}
</style>
