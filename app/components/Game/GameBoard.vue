<script setup lang="ts">
import type { GameSession, Player } from '~/shared/types/game'

interface Props {
  gameSession: GameSession
  currentPlayer: Player | null
  showInitialCards?: boolean
  onDrawFromDeck?: () => void
  onDrawFromDiscard?: () => void
}

const props = withDefaults(defineProps<Props>(), {
  showInitialCards: false,
  onDrawFromDeck: undefined,
  onDrawFromDiscard: undefined,
})

// Separate current player from opponents
const myPlayer = computed(() => {
  if (!props.currentPlayer)
    return null
  return props.gameSession.players.find(p => p.id === props.currentPlayer?.id) || null
})

const opponentPlayers = computed(() => {
  if (!props.currentPlayer)
    return props.gameSession.players

  return props.gameSession.players.filter(p => p.id !== props.currentPlayer?.id)
})

const isMyTurn = computed(() => {
  return props.gameSession.currentTurnPlayerId === props.currentPlayer?.id
})

const canDrawCards = computed(() => {
  return isMyTurn.value && props.gameSession.phase === 'playing'
})

function handleDrawFromDeck() {
  if (props.onDrawFromDeck) {
    props.onDrawFromDeck()
  }
}

function handleDrawFromDiscard() {
  if (props.onDrawFromDiscard) {
    props.onDrawFromDiscard()
  }
}
</script>

<template>
  <div class="game-board">
    <!-- Game Header -->
    <div class="game-header">
      <div class="game-info">
        <h2 class="game-title">
          Cambio Game
        </h2>
        <div class="game-phase">
          <UBadge
            :color="gameSession.phase === 'playing' ? 'green' : 'blue'"
            variant="soft"
          >
            {{ gameSession.phase }}
          </UBadge>
        </div>
      </div>

      <div class="turn-indicator">
        <div v-if="isMyTurn" class="your-turn">
          <UIcon name="i-heroicons-bell" class="mr-2" />
          <span class="font-semibold">Your Turn!</span>
        </div>
        <div v-else class="waiting">
          <UIcon name="i-heroicons-clock" class="mr-2" />
          <span>Waiting for {{ gameSession.players.find(p => p.id === gameSession.currentTurnPlayerId)?.displayName }}</span>
        </div>
      </div>
    </div>

    <!-- Opponents Section -->
    <div v-if="opponentPlayers.length > 0" class="opponents-section">
      <div class="section-title">
        Opponents
      </div>
      <div class="opponents-grid">
        <div
          v-for="opponent in opponentPlayers"
          :key="opponent.id"
          class="opponent-card"
        >
          <div class="player-info">
            <div class="player-avatar">
              <UIcon name="i-heroicons-user-circle" class="text-3xl" />
            </div>
            <div class="player-details">
              <div class="player-name">
                {{ opponent.displayName }}
              </div>
              <div class="player-status">
                <UBadge
                  :color="opponent.isConnected ? 'green' : 'gray'"
                  variant="soft"
                  size="xs"
                >
                  {{ opponent.isConnected ? 'Online' : 'Offline' }}
                </UBadge>
              </div>
            </div>
          </div>
          <GamePlayerHand
            :cards="opponent.cards"
            :is-current-player="false"
          />
        </div>
      </div>
    </div>

    <!-- Center Play Area -->
    <div class="play-area">
      <div class="piles-container">
        <GameDrawPile
          :card-count="gameSession.drawPile.length"
          :is-clickable="canDrawCards"
          @click="handleDrawFromDeck"
        />

        <GameDiscardPile
          :top-card="gameSession.discardPile[gameSession.discardPile.length - 1] || null"
          :is-clickable="canDrawCards"
          @click="handleDrawFromDiscard"
        />
      </div>
    </div>

    <!-- Current Player Section -->
    <div v-if="myPlayer" class="current-player-section">
      <div class="section-title">
        Your Hand
      </div>
      <GamePlayerHand
        :cards="myPlayer.cards"
        :is-current-player="true"
        :show-initial-cards="showInitialCards"
      />
    </div>
  </div>
</template>

<style scoped>
.game-board {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
}

.game-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.game-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.game-title {
  font-size: 24px;
  font-weight: bold;
  color: #1f2937;
  margin: 0;
}

.game-phase {
  text-transform: capitalize;
}

.turn-indicator {
  display: flex;
  align-items: center;
}

.your-turn {
  display: flex;
  align-items: center;
  color: #059669;
  font-size: 16px;
  animation: pulse 2s ease-in-out infinite;
}

.waiting {
  display: flex;
  align-items: center;
  color: #6b7280;
  font-size: 14px;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.opponents-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.opponents-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 16px;
}

.opponent-card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 12px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.player-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.player-avatar {
  color: #6b7280;
}

.player-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.player-name {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.play-area {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 32px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
}

.piles-container {
  display: flex;
  gap: 48px;
  align-items: center;
}

.current-player-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  align-items: center;
}

/* Responsive layout */
@media (max-width: 768px) {
  .game-board {
    padding: 16px;
    gap: 16px;
  }

  .game-header {
    flex-direction: column;
    gap: 12px;
    padding: 12px;
  }

  .game-title {
    font-size: 20px;
  }

  .opponents-grid {
    grid-template-columns: 1fr;
  }

  .piles-container {
    gap: 24px;
  }

  .section-title {
    font-size: 16px;
  }
}
</style>
