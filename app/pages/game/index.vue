<script setup lang="ts">
import type { CreateGameRequest } from '~/shared/types/game'

const router = useRouter()

// Form state
const playerCount = ref(2)
const displayName = ref('')
const botCount = ref(0)
const isCreating = ref(false)
const error = ref<string | null>(null)

// Validation - simplified for client-side
const validationErrors = computed(() => {
  const errors: string[] = []

  if (displayName.value && displayName.value.length < 3) {
    errors.push('Display name must be at least 3 characters')
  }

  if (displayName.value && displayName.value.length > 20) {
    errors.push('Display name must not exceed 20 characters')
  }

  if (displayName.value && !/^[a-zA-Z0-9\s]+$/.test(displayName.value)) {
    errors.push('Display name can only contain letters, numbers, and spaces')
  }

  if (botCount.value >= playerCount.value) {
    errors.push('Must have at least one human player')
  }

  return errors
})

const isFormValid = computed(() => {
  return displayName.value.length >= 3 && validationErrors.value.length === 0
})

// Create game
async function handleCreateGame() {
  if (!isFormValid.value) {
    return
  }

  isCreating.value = true
  error.value = null

  try {
    const request: CreateGameRequest = {
      playerCount: playerCount.value,
      creatorDisplayName: displayName.value,
      botCount: botCount.value,
    }

    const response = await $fetch('/api/game/create', {
      method: 'POST',
      body: request,
    })

    // Navigate to the game page
    router.push(`/game/${response.gameId}`)
  }
  catch (err: any) {
    error.value = err.data?.message || 'Failed to create game'
    console.error('Failed to create game:', err)
  }
  finally {
    isCreating.value = false
  }
}

// Page metadata
useHead({
  title: 'Cambio - Game Lobby',
})
</script>

<template>
  <div class="game-lobby">
    <div class="lobby-container">
      <UCard class="lobby-card">
        <template #header>
          <div class="lobby-header">
            <h1 class="lobby-title">
              🎮 Cambio Card Game
            </h1>
            <p class="lobby-subtitle">
              Create a new game and invite your friends!
            </p>
          </div>
        </template>

        <div class="lobby-form">
          <!-- Display Name -->
          <UFormGroup label="Your Name" required>
            <UInput
              v-model="displayName"
              placeholder="Enter your display name"
              :disabled="isCreating"
              size="lg"
            />
          </UFormGroup>

          <!-- Player Count -->
          <UFormGroup label="Total Players" required>
            <div class="player-count-selector">
              <UButton
                v-for="count in [2, 3, 4]"
                :key="count"
                :color="playerCount === count ? 'primary' : 'gray'"
                :variant="playerCount === count ? 'solid' : 'soft'"
                size="lg"
                @click="playerCount = count"
              >
                {{ count }} Players
              </UButton>
            </div>
          </UFormGroup>

          <!-- Bot Count -->
          <UFormGroup label="AI Bots (Optional)">
            <div class="bot-count-selector">
              <UButton
                v-for="count in Array.from({ length: playerCount }, (_, i) => i)"
                :key="count"
                :color="botCount === count ? 'primary' : 'gray'"
                :variant="botCount === count ? 'solid' : 'soft'"
                size="lg"
                @click="botCount = count"
              >
                {{ count }} {{ count === 1 ? 'Bot' : 'Bots' }}
              </UButton>
            </div>
            <p class="bot-help-text">
              Fill remaining slots with AI opponents
            </p>
          </UFormGroup>

          <!-- Validation Errors -->
          <div v-if="validationErrors.length > 0" class="validation-errors">
            <UAlert
              v-for="(validationError, index) in validationErrors"
              :key="index"
              color="orange"
              variant="soft"
              :title="validationError"
            />
          </div>

          <!-- Error Message -->
          <div v-if="error" class="error-message">
            <UAlert
              color="red"
              variant="soft"
              :title="error"
            />
          </div>

          <!-- Game Rules Info -->
          <div class="game-info">
            <UCard :ui="{ body: { padding: 'p-4' } }">
              <div class="info-content">
                <h3 class="info-title">
                  <UIcon name="i-heroicons-information-circle" />
                  Quick Rules
                </h3>
                <ul class="info-list">
                  <li>Each player gets 4 cards in a 2x2 grid</li>
                  <li>View your 2 closest cards once at the start</li>
                  <li>Take turns drawing and swapping cards</li>
                  <li>Call "Cambio" when you think you have the lowest score</li>
                  <li>Lowest score wins!</li>
                </ul>
              </div>
            </UCard>
          </div>
        </div>

        <template #footer>
          <div class="lobby-actions">
            <UButton
              color="gray"
              variant="ghost"
              size="lg"
              @click="router.push('/')"
            >
              Cancel
            </UButton>
            <UButton
              color="primary"
              size="lg"
              :loading="isCreating"
              :disabled="!isFormValid"
              @click="handleCreateGame"
            >
              <UIcon name="i-heroicons-play" class="mr-2" />
              Create Game
            </UButton>
          </div>
        </template>
      </UCard>
    </div>
  </div>
</template>

<style scoped>
.game-lobby {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.lobby-container {
  width: 100%;
  max-width: 600px;
}

.lobby-card {
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
}

.lobby-header {
  text-align: center;
}

.lobby-title {
  font-size: 32px;
  font-weight: bold;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.lobby-subtitle {
  font-size: 16px;
  color: #6b7280;
  margin: 0;
}

.lobby-form {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.player-count-selector,
.bot-count-selector {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 12px;
}

.bot-help-text {
  font-size: 14px;
  color: #6b7280;
  margin-top: 8px;
}

.validation-errors {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.error-message {
  margin-top: -8px;
}

.game-info {
  margin-top: 8px;
}

.info-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.info-title {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
}

.info-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-list li {
  font-size: 14px;
  color: #4b5563;
  padding-left: 20px;
  position: relative;
}

.info-list li::before {
  content: '•';
  position: absolute;
  left: 8px;
  color: #3b82f6;
  font-weight: bold;
}

.lobby-actions {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

/* Responsive layout */
@media (max-width: 640px) {
  .lobby-title {
    font-size: 24px;
  }

  .lobby-subtitle {
    font-size: 14px;
  }

  .player-count-selector,
  .bot-count-selector {
    grid-template-columns: 1fr;
  }

  .lobby-actions {
    flex-direction: column-reverse;
  }
}
</style>
