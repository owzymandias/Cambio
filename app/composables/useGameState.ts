/**
 * Game state management composable
 * Manages local game state and synchronization with server
 */

import type {
  Card,
  CardPosition,
  DrawSource,
  GameEvent,
  GameSession,
  GameState,
  Player,
  SpecialPowerType,
  UsePowerRequest,
} from '~/shared/types/game'

export function useGameState(gameId: string) {
  const gameSession = ref<GameSession | null>(null)
  const currentPlayer = ref<Player | null>(null)
  const isMyTurn = computed(() => {
    if (!gameSession.value || !currentPlayer.value)
      return false
    return gameSession.value.currentTurnPlayerId === currentPlayer.value.id
  })

  const isLoading = ref(false)
  const error = ref<string | null>(null)
  const showInitialCards = ref(false)
  const hasViewedInitialCards = ref(false)

  // WebSocket connection (will be initialized by gameSocket)
  const socket = ref<any>(null)

  /**
   * Load game session from server
   */
  async function loadGameSession() {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<GameSession>(`/api/game/${gameId}`)
      gameSession.value = response
    }
    catch (err: any) {
      error.value = err.data?.message || 'Failed to load game session'
      console.error('Error loading game session:', err)
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Join the game as a player
   */
  async function joinGame(displayName: string) {
    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{ session: GameSession, player: Player }>(`/api/game/${gameId}/join`, {
        method: 'POST',
        body: { displayName },
      })

      gameSession.value = response.session
      currentPlayer.value = response.player
    }
    catch (err: any) {
      error.value = err.data?.message || 'Failed to join game'
      console.error('Error joining game:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Draw a card from deck or discard pile
   */
  async function drawCard(source: DrawSource) {
    if (!isMyTurn.value) {
      error.value = 'It is not your turn'
      return
    }

    if (!currentPlayer.value) {
      error.value = 'Player not found'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<{ session: GameSession, drawnCard: Card }>(`/api/game/${gameId}/draw`, {
        method: 'POST',
        body: {
          source,
          playerId: currentPlayer.value.id,
        },
      })

      gameSession.value = response.session
      return response.drawnCard
    }
    catch (err: any) {
      error.value = err.data?.message || 'Failed to draw card'
      console.error('Error drawing card:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Swap a drawn card with a card in hand
   */
  async function swapCard(drawnCardId: string, targetPosition: CardPosition) {
    if (!isMyTurn.value) {
      error.value = 'It is not your turn'
      return
    }

    if (!currentPlayer.value) {
      error.value = 'Player not found'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<GameSession>(`/api/game/${gameId}/swap`, {
        method: 'POST',
        body: {
          drawnCardId,
          targetCardPosition: targetPosition,
          playerId: currentPlayer.value.id,
        },
      })

      gameSession.value = response
    }
    catch (err: any) {
      error.value = err.data?.message || 'Failed to swap card'
      console.error('Error swapping card:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Discard a drawn card without swapping
   */
  async function discardCard(cardId: string) {
    if (!isMyTurn.value) {
      error.value = 'It is not your turn'
      return
    }

    if (!currentPlayer.value) {
      error.value = 'Player not found'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<GameSession>(`/api/game/${gameId}/discard`, {
        method: 'POST',
        body: {
          cardId,
          playerId: currentPlayer.value.id,
        },
      })

      gameSession.value = response
    }
    catch (err: any) {
      error.value = err.data?.message || 'Failed to discard card'
      console.error('Error discarding card:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Use a special power
   */
  async function useSpecialPower(request: UsePowerRequest) {
    if (!isMyTurn.value) {
      error.value = 'It is not your turn'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<GameSession>(`/api/game/${gameId}/power`, {
        method: 'POST',
        body: request,
      })

      gameSession.value = response
    }
    catch (err: any) {
      error.value = err.data?.message || 'Failed to use special power'
      console.error('Error using special power:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Call Cambio to end the round
   */
  async function callCambio() {
    if (!isMyTurn.value) {
      error.value = 'It is not your turn'
      return
    }

    isLoading.value = true
    error.value = null

    try {
      const response = await $fetch<GameSession>(`/api/game/${gameId}/cambio`, {
        method: 'POST',
      })

      gameSession.value = response
    }
    catch (err: any) {
      error.value = err.data?.message || 'Failed to call Cambio'
      console.error('Error calling Cambio:', err)
      throw err
    }
    finally {
      isLoading.value = false
    }
  }

  /**
   * Get my player's cards
   */
  const myCards = computed(() => {
    if (!currentPlayer.value || !gameSession.value)
      return []

    const player = gameSession.value.players.find(p => p.id === currentPlayer.value?.id)
    return player?.cards || []
  })

  /**
   * Get other players (opponents)
   */
  const opponents = computed(() => {
    if (!currentPlayer.value || !gameSession.value)
      return []

    return gameSession.value.players.filter(p => p.id !== currentPlayer.value?.id)
  })

  /**
   * Get the current turn player
   */
  const currentTurnPlayer = computed(() => {
    if (!gameSession.value)
      return null

    return gameSession.value.players.find(
      p => p.id === gameSession.value?.currentTurnPlayerId,
    ) || null
  })

  /**
   * Get the top card of the discard pile
   */
  const topDiscardCard = computed(() => {
    if (!gameSession.value || gameSession.value.discardPile.length === 0)
      return null

    return gameSession.value.discardPile[gameSession.value.discardPile.length - 1]
  })

  /**
   * Check if game is in progress
   */
  const isGameInProgress = computed(() => {
    return gameSession.value?.phase === 'playing' || gameSession.value?.phase === 'final_round'
  })

  /**
   * Check if game is completed
   */
  const isGameCompleted = computed(() => {
    return gameSession.value?.phase === 'completed'
  })

  /**
   * Check if game is in initial view phase
   */
  const isInInitialViewPhase = computed(() => {
    return gameSession.value?.phase === 'initial_view'
  })

  /**
   * View initial cards (bottom row)
   */
  function viewInitialCards() {
    if (hasViewedInitialCards.value) {
      error.value = 'You have already viewed your initial cards'
      return
    }

    if (!isInInitialViewPhase.value) {
      error.value = 'Can only view initial cards during setup phase'
      return
    }

    showInitialCards.value = true
  }

  /**
   * Hide initial cards after viewing
   */
  function hideInitialCards() {
    showInitialCards.value = false
    hasViewedInitialCards.value = true

    // Update the player's hasViewedInitialCards status on the server
    if (currentPlayer.value) {
      $fetch(`/api/game/${gameId}/view-initial`, {
        method: 'POST',
        body: {
          playerId: currentPlayer.value.id,
        },
      }).catch((err) => {
        console.error('Error updating viewed initial cards status:', err)
      })
    }
  }

  /**
   * Handle WebSocket events for real-time updates
   */
  function handleGameEvent(event: GameEvent) {
    switch (event.type) {
      case 'game_created':
      case 'player_joined':
      case 'turn_started':
      case 'card_drawn':
      case 'card_swapped':
      case 'card_discarded':
      case 'power_activated':
      case 'cambio_called':
      case 'game_completed':
        // Reload game state from server
        loadGameSession()
        break
      default:
        console.warn('Unknown game event type:', event.type)
    }
  }

  /**
   * Initialize WebSocket connection
   */
  function initializeSocket(socketInstance: any) {
    socket.value = socketInstance

    // Set up event listeners
    socket.value.on('game:event', handleGameEvent)
    socket.value.on('game:state:update', (session: GameSession) => {
      gameSession.value = session
    })
    socket.value.on('game:error', (errorMessage: string) => {
      error.value = errorMessage
    })
  }

  /**
   * Clean up when component is unmounted
   */
  function cleanup() {
    if (socket.value) {
      socket.value.off('game:event')
      socket.value.off('game:state:update')
      socket.value.off('game:error')
      socket.value = null
    }
  }

  // Load game session on initialization
  onMounted(() => {
    loadGameSession()
  })

  onUnmounted(() => {
    cleanup()
  })

  return {
    // State
    gameSession: readonly(gameSession),
    currentPlayer: readonly(currentPlayer),
    isMyTurn,
    isLoading: readonly(isLoading),
    error: readonly(error),
    showInitialCards: readonly(showInitialCards),
    hasViewedInitialCards: readonly(hasViewedInitialCards),

    // Computed
    myCards,
    opponents,
    currentTurnPlayer,
    topDiscardCard,
    isGameInProgress,
    isGameCompleted,
    isInInitialViewPhase,

    // Actions
    loadGameSession,
    joinGame,
    drawCard,
    swapCard,
    discardCard,
    useSpecialPower,
    callCambio,
    viewInitialCards,
    hideInitialCards,

    // WebSocket
    initializeSocket,
    cleanup,
  }
}
